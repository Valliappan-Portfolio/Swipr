import React, { useState, useEffect } from 'react';
import { User, Film, Activity, Clock, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UserStats {
  id: string;
  name: string;
  email: string;
  lastActive: string;
  totalActions: number;
  movieActions: {
    like: number;
    pass: number;
    unwatched: number;
  };
  favoriteGenres: string[];
}

export function AdminPanel() {
  const [users, setUsers] = useState<UserStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [sortField, setSortField] = useState<keyof UserStats>('totalActions');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    async function checkDeveloperStatus() {
      if (!supabase) return;

      const user = await supabase.auth.getUser();
      if (!user.data.user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_developer')
        .eq('id', user.data.user.id)
        .single();

      setIsDeveloper(profile?.is_developer || false);
    }

    checkDeveloperStatus();
  }, []);

  useEffect(() => {
    async function fetchUserStats() {
      if (!supabase || !isDeveloper) return;

      try {
        // Fetch all user profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*');

        if (profilesError) throw profilesError;

        // Fetch all users' movie actions
        const { data: actions, error: actionsError } = await supabase
          .from('movie_actions')
          .select('*');

        if (actionsError) throw actionsError;

        // Get user emails
        const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
        if (usersError) throw usersError;

        // Combine data
        const userStats: UserStats[] = profiles.map(profile => {
          const userActions = actions.filter(a => a.user_id === profile.id);
          const userEmail = users.find(u => u.id === profile.id)?.email || '';

          return {
            id: profile.id,
            name: profile.name,
            email: userEmail,
            lastActive: profile.last_active,
            totalActions: profile.total_actions,
            movieActions: {
              like: userActions.filter(a => a.action === 'like').length,
              pass: userActions.filter(a => a.action === 'pass').length,
              unwatched: userActions.filter(a => a.action === 'unwatched').length
            },
            favoriteGenres: profile.favorite_genres || []
          };
        });

        setUsers(userStats);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch user data');
      } finally {
        setLoading(false);
      }
    }

    if (showPanel) {
      fetchUserStats();
    }
  }, [showPanel, isDeveloper]);

  if (!isDeveloper) return null;

  const sortUsers = (a: UserStats, b: UserStats) => {
    const aValue = a[sortField];
    const bValue = b[sortField];

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }

    return 0;
  };

  const toggleSort = (field: keyof UserStats) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: keyof UserStats }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="fixed bottom-4 right-4 p-3 rounded-full bg-purple-600 text-white hover:bg-purple-700 transition shadow-lg z-50"
        title="Developer Panel"
      >
        <Activity className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-auto">
      <div className="max-w-6xl mx-auto p-4 my-8">
        <div className="bg-gray-900 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Activity className="h-6 w-6 text-purple-400" />
              <h2 className="text-xl font-bold text-white">Developer Panel</h2>
            </div>
            <button
              onClick={() => setShowPanel(false)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
            >
              <Users className="h-5 w-5 text-white" />
            </button>
          </div>

          {loading ? (
            <div className="text-white text-center py-8">Loading user data...</div>
          ) : error ? (
            <div className="text-red-400 text-center py-8">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="py-3 px-4">
                      <button
                        onClick={() => toggleSort('name')}
                        className="flex items-center gap-1 text-white/80 hover:text-white"
                      >
                        User <SortIcon field="name" />
                      </button>
                    </th>
                    <th className="py-3 px-4">
                      <button
                        onClick={() => toggleSort('email')}
                        className="flex items-center gap-1 text-white/80 hover:text-white"
                      >
                        Email <SortIcon field="email" />
                      </button>
                    </th>
                    <th className="py-3 px-4">
                      <button
                        onClick={() => toggleSort('lastActive')}
                        className="flex items-center gap-1 text-white/80 hover:text-white"
                      >
                        Last Active <SortIcon field="lastActive" />
                      </button>
                    </th>
                    <th className="py-3 px-4">
                      <button
                        onClick={() => toggleSort('totalActions')}
                        className="flex items-center gap-1 text-white/80 hover:text-white"
                      >
                        Actions <SortIcon field="totalActions" />
                      </button>
                    </th>
                    <th className="py-3 px-4 text-white/80">Preferences</th>
                  </tr>
                </thead>
                <tbody>
                  {users.sort(sortUsers).map(user => (
                    <tr key={user.id} className="border-b border-white/5">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <User className="h-5 w-5 text-white/40" />
                          <span className="text-white">{user.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-white/80">{user.email}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-white/80">
                          <Clock className="h-4 w-4" />
                          {new Date(user.lastActive).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-green-400">
                            <Film className="h-4 w-4" />
                            <span>Likes: {user.movieActions.like}</span>
                          </div>
                          <div className="flex items-center gap-2 text-red-400">
                            <Film className="h-4 w-4" />
                            <span>Passes: {user.movieActions.pass}</span>
                          </div>
                          <div className="flex items-center gap-2 text-blue-400">
                            <Film className="h-4 w-4" />
                            <span>Watchlist: {user.movieActions.unwatched}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-2">
                          {user.favoriteGenres.map(genre => (
                            <span
                              key={genre}
                              className="px-2 py-1 rounded-full bg-white/10 text-white/80 text-sm"
                            >
                              {genre}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}