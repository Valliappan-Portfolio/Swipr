import { supabase } from './supabase';
import type { FriendMatch } from '../types';

export async function getFriendMatches(userId: string): Promise<FriendMatch[]> {
  if (!supabase) return [];

  // Get all movie actions for the current user
  const { data: userActions } = await supabase
    .from('movie_actions')
    .select('movie_id, action')
    .eq('user_id', userId);

  if (!userActions) return [];

  // Get all friends
  const { data: friendships } = await supabase
    .from('friendships')
    .select('friend_id')
    .eq('user_id', userId)
    .eq('status', 'accepted');

  if (!friendships) return [];

  const friendIds = friendships.map(f => f.friend_id);

  // Get all friend profiles
  const { data: friendProfiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', friendIds);

  if (!friendProfiles) return [];

  // Get all friend actions
  const { data: friendActions } = await supabase
    .from('movie_actions')
    .select('user_id, movie_id, action')
    .in('user_id', friendIds);

  if (!friendActions) return [];

  // Calculate matches for each friend
  const matches: FriendMatch[] = friendProfiles.map(friend => {
    const friendMovieActions = friendActions.filter(a => a.user_id === friend.id);
    const commonMovies = userActions.filter(ua => 
      friendMovieActions.some(fa => fa.movie_id === ua.movie_id)
    );

    let matchScore = 0;
    let commonLikes = 0;

    commonMovies.forEach(userMovie => {
      const friendMovie = friendMovieActions.find(fa => fa.movie_id === userMovie.movie_id);
      if (friendMovie) {
        if (userMovie.action === friendMovie.action) {
          matchScore += 1;
          if (userMovie.action === 'like') {
            commonLikes += 1;
          }
        } else if (
          (userMovie.action === 'like' && friendMovie.action === 'maybe') ||
          (userMovie.action === 'maybe' && friendMovie.action === 'like')
        ) {
          matchScore += 0.5;
        }
      }
    });

    const totalMovies = commonMovies.length;
    const matchPercentage = totalMovies > 0 ? (matchScore / totalMovies) * 100 : 0;

    return {
      userId: friend.id,
      name: friend.name,
      avatarUrl: friend.avatar_url,
      matchScore: Math.round(matchPercentage),
      commonLikes,
      totalMovies
    };
  });

  // Sort by match score
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}