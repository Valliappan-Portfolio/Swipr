import React, { useState, useEffect } from 'react';
import { UserCircle2, Users, ArrowLeft, X, Check, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { FriendMatch } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface FriendsPageProps {
  preferenceId: string | null;
  onBack: () => void;
}

const gradients = [
  'from-gray-900 via-purple-900 to-violet-900',
  'from-gray-900 via-blue-900 to-cyan-900',
  'from-slate-900 via-green-900 to-emerald-900',
  'from-zinc-900 via-indigo-900 to-slate-900',
  'from-stone-900 via-rose-900 to-slate-900',
  'from-neutral-900 via-teal-900 to-gray-900',
  'from-gray-900 via-slate-800 to-zinc-900',
  'from-slate-900 via-cyan-900 to-blue-900'
];

export function FriendsPage({ preferenceId, onBack }: FriendsPageProps) {
  const [friends, setFriends] = useState<FriendMatch[]>([]);
  const [potentialFriends, setPotentialFriends] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentGradient, setCurrentGradient] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

  useEffect(() => {
    if (!supabase || !preferenceId) return;

    const friendRequests = supabase
      .channel('friend-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `receiver_id=eq.${preferenceId}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const { data: sender } = await supabase
              .from('anonymous_preferences')
              .select('name')
              .eq('id', payload.new.sender_id)
              .single();

            if (sender) {
              setPendingRequests(prev => [...prev, {
                ...payload.new,
                sender_name: sender.name
              }]);
              setNotificationMessage(`${sender.name} sent you a friend request!`);
              setShowNotification(true);
              setTimeout(() => setShowNotification(false), 3000);
            }
          }
        }
      )
      .subscribe();

    return () => {
      friendRequests.unsubscribe();
    };
  }, [preferenceId]);

  const loadFriends = async () => {
    if (!supabase || !preferenceId) return;

    try {
      // Load pending requests with match scores
      const { data: pending } = await supabase
        .from('friend_requests')
        .select(`
          id,
          sender_id,
          anonymous_preferences!friend_requests_sender_id_fkey (
            name,
            genres,
            languages
          )
        `)
        .eq('receiver_id', preferenceId)
        .eq('status', 'pending');

      if (pending) {
        // Get match scores for pending requests
        const pendingWithScores = await Promise.all(
          pending.map(async (request) => {
            const { data: match } = await supabase
              .from('friend_matches')
              .select('match_score, common_likes')
              .or(
                `and(user1_id.eq.${request.sender_id},user2_id.eq.${preferenceId}),` +
                `and(user1_id.eq.${preferenceId},user2_id.eq.${request.sender_id})`
              )
              .single();

            return {
              id: request.id,
              sender_id: request.sender_id,
              sender_name: request.anonymous_preferences.name,
              matchScore: Math.round(match?.match_score || 0),
              commonLikes: match?.common_likes || 0,
              genres: request.anonymous_preferences.genres,
              languages: request.anonymous_preferences.languages
            };
          })
        );

        setPendingRequests(pendingWithScores);
      }

      // Get all friend request IDs (both sent and received)
      const { data: allRequests } = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${preferenceId},receiver_id.eq.${preferenceId}`);

      if (!allRequests) return;

      // Create a set of IDs to exclude (existing friends and pending requests)
      const excludeIds = new Set<string>();
      excludeIds.add(preferenceId); // Exclude self

      allRequests.forEach(request => {
        excludeIds.add(request.sender_id);
        excludeIds.add(request.receiver_id);
      });

      // Load potential friends (excluding existing connections)
      const { data: potential } = await supabase
        .from('anonymous_preferences')
        .select('*')
        .not('id', 'in', `(${Array.from(excludeIds).join(',')})`)
        .eq('is_discoverable', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (potential) {
        setPotentialFriends(potential);
      }

      // Load existing friends
      const { data: friendRequests } = await supabase
        .from('friend_requests')
        .select('*')
        .or(`sender_id.eq.${preferenceId},receiver_id.eq.${preferenceId}`)
        .eq('status', 'accepted');

      const friendIds = (friendRequests || []).map(request => 
        request.sender_id === preferenceId ? request.receiver_id : request.sender_id
      );

      if (friendIds.length > 0) {
        const { data: matches } = await supabase
          .from('friend_matches')
          .select('*')
          .or(`user1_id.eq.${preferenceId},user2_id.eq.${preferenceId}`);

        const { data: profiles } = await supabase
          .from('anonymous_preferences')
          .select('*')
          .in('id', friendIds);

        if (profiles && matches) {
          const friendMatches: FriendMatch[] = profiles.map(profile => {
            const match = matches.find(m => 
              (m.user1_id === profile.id && m.user2_id === preferenceId) ||
              (m.user1_id === preferenceId && m.user2_id === profile.id)
            );

            return {
              userId: profile.id,
              name: profile.name,
              matchScore: Math.round(match?.match_score || 0),
              commonLikes: match?.common_likes || 0,
              totalMovies: 0
            };
          });

          setFriends(friendMatches.sort((a, b) => b.matchScore - a.matchScore));
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading friends:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFriends();
  }, [preferenceId]);

  const handleFriendRequest = async (requestId: string, action: 'accept' | 'reject') => {
    if (!supabase) return;

    try {
      await supabase
        .from('friend_requests')
        .update({ status: action === 'accept' ? 'accepted' : 'rejected' })
        .eq('id', requestId);
      
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
      
      // Reload friends list if request was accepted
      if (action === 'accept') {
        loadFriends();
      }

      setNotificationMessage(action === 'accept' ? 'Friend request accepted!' : 'Friend request declined');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    } catch (error) {
      console.error('Error handling friend request:', error);
    }
  };

  const sendFriendRequest = async (friendId: string) => {
    if (!supabase || !preferenceId) return;

    try {
      await supabase.from('friend_requests').insert({
        sender_id: preferenceId,
        receiver_id: friendId,
        status: 'pending'
      });

      setPotentialFriends(prev => prev.filter(p => p.id !== friendId));
      setNotificationMessage('Friend request sent!');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${gradients[currentGradient]} flex items-center justify-center p-4`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${gradients[currentGradient]} transition-colors duration-1000`}>
      <div className="max-w-4xl mx-auto space-y-8 pt-20 p-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white hover:text-white/80 transition"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Movies
        </button>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <section className="bg-white/10 backdrop-blur-md rounded-xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <UserPlus className="h-6 w-6 text-white" />
              <h2 className="text-2xl font-bold text-white">Pending Requests</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {pendingRequests.map(request => (
                <motion.div
                  key={request.id}
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-white/10 rounded-lg p-4"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <UserCircle2 className="h-16 w-16 text-white" />
                    <div>
                      <h3 className="text-lg font-semibold text-white">{request.sender_name}</h3>
                      <div className="flex items-center gap-2">
                        <div 
                          className="radial-progress text-2xl font-bold"
                          style={{
                            background: `conic-gradient(
                              rgba(255,255,255,0.9) ${request.matchScore}%,
                              rgba(255,255,255,0.1) 0
                            )`
                          }}
                        >
                          <span className="text-white">{request.matchScore}%</span>
                        </div>
                        <span className="text-white/60">Match</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleFriendRequest(request.id, 'reject')}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition"
                    >
                      <X className="h-4 w-4" />
                      <span>Decline</span>
                    </button>
                    <button
                      onClick={() => handleFriendRequest(request.id, 'accept')}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 text-green-300 hover:bg-green-500/30 transition"
                    >
                      <Check className="h-4 w-4" />
                      <span>Accept</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Movie Buddies */}
        <section className="bg-white/10 backdrop-blur-md rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Users className="h-6 w-6 text-white" />
            <h2 className="text-2xl font-bold text-white">Movie Buddies</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {friends.map(friend => (
              <motion.div
                key={friend.userId}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white/10 rounded-lg p-4 relative overflow-hidden"
                onClick={() => setCurrentGradient(prev => (prev + 1) % gradients.length)}
              >
                <div className="flex items-center gap-4">
                  <UserCircle2 className="h-16 w-16 text-white" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">{friend.name}</h3>
                    <div className="flex items-center gap-2">
                      <div 
                        className="radial-progress text-2xl font-bold"
                        style={{
                          background: `conic-gradient(
                            rgba(255,255,255,0.9) ${friend.matchScore}%,
                            rgba(255,255,255,0.1) 0
                          )`
                        }}
                      >
                        <span className="text-white">{friend.matchScore}%</span>
                      </div>
                      <span className="text-white/60">Match</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {friends.length === 0 && (
            <p className="text-white/80 text-center py-8">
              You haven't connected with any movie buddies yet. Find some below!
            </p>
          )}
        </section>

        {/* Discover Section */}
        <section className="bg-white/10 backdrop-blur-md rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <UserCircle2 className="h-6 w-6 text-white" />
            <h2 className="text-2xl font-bold text-white">Discover Movie Buddies</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {potentialFriends.map(profile => (
              <motion.div
                key={profile.id}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white/10 rounded-lg p-4"
                onClick={() => setCurrentGradient(prev => (prev + 1) % gradients.length)}
              >
                <div className="flex items-center gap-4">
                  <UserCircle2 className="h-16 w-16 text-white" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">{profile.name}</h3>
                  </div>
                  <button
                    onClick={() => sendFriendRequest(profile.id)}
                    className="px-4 py-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition"
                  >
                    Connect
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {potentialFriends.length === 0 && (
            <p className="text-white/80 text-center py-8">
              No new movie buddies to discover at the moment. Check back later!
            </p>
          )}
        </section>
      </div>

      {/* Notification */}
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md rounded-lg px-6 py-3 shadow-lg"
          >
            <p className="text-white">{notificationMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}