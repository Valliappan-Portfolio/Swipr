import React, { useState, useEffect } from 'react';
import { Activity, ChevronDown, ChevronUp, Film, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AnalyticsData {
  totalUsers: number;
  totalActions: number;
  popularMovies: {
    movieId: number;
    title: string;
    likes: number;
    passes: number;
    unwatched: number;
  }[];
  recentActivity: {
    timestamp: string;
    action: string;
    movieId: number;
  }[];
}

export function DeveloperPanel() {
  const [isVisible, setIsVisible] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!supabase) return;

      try {
        // Fetch anonymous preferences count
        const { count: anonCount } = await supabase
          .from('anonymous_preferences')
          .select('*', { count: 'exact', head: true });

        // Fetch anonymous actions
        const { data: anonActions } = await supabase
          .from('anonymous_actions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        // Fetch authenticated user actions
        const { data: userActions } = await supabase
          .from('movie_actions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        // Combine and process data
        const allActions = [...(anonActions || []), ...(userActions || [])];
        const movieStats = new Map();

        allActions.forEach(action => {
          const movieId = action.movie_id;
          const stats = movieStats.get(movieId) || { likes: 0, passes: 0, unwatched: 0 };
          stats[action.action + 's']++;
          movieStats.set(movieId, stats);
        });

        // Convert to analytics format
        setAnalytics({
          totalUsers: (anonCount || 0),
          totalActions: allActions.length,
          popularMovies: Array.from(movieStats.entries()).map(([movieId, stats]) => ({
            movieId,
            title: `Movie ${movieId}`, // We'd need to fetch actual titles from TMDB
            ...stats
          })),
          recentActivity: allActions.map(a => ({
            timestamp: a.created_at,
            action: a.action,
            movieId: a.movie_id
          }))
        });
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isVisible) {
      fetchAnalytics();
      const interval = setInterval(fetchAnalytics, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [isVisible]);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 p-3 rounded-full bg-purple-600 text-white hover:bg-purple-700 transition shadow-lg z-50"
        title="Developer Panel"
      >
        <Activity className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-xl p-6 max-w-4xl w-full max-h-[80vh] overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-purple-400" />
            <h2 className="text-xl font-bold text-white">Developer Analytics</h2>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
          >
            <ChevronDown className="h-5 w-5 text-white" />
          </button>
        </div>

        {loading ? (
          <div className="text-white text-center py-8">Loading analytics...</div>
        ) : analytics ? (
          <div className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-lg p-4">
                <h3 className="text-sm font-medium text-white/60 mb-1">Total Users</h3>
                <p className="text-2xl font-bold text-white">{analytics.totalUsers}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <h3 className="text-sm font-medium text-white/60 mb-1">Total Actions</h3>
                <p className="text-2xl font-bold text-white">{analytics.totalActions}</p>
              </div>
            </div>

            {/* Popular Movies */}
            <div className="bg-white/10 rounded-lg p-4">
              <h3 className="text-lg font-medium text-white mb-4">Popular Movies</h3>
              <div className="space-y-3">
                {analytics.popularMovies.slice(0, 5).map(movie => (
                  <div key={movie.movieId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Film className="h-4 w-4 text-white/60" />
                      <span className="text-white">{movie.title}</span>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span className="text-green-400">👍 {movie.likes}</span>
                      <span className="text-red-400">👎 {movie.passes}</span>
                      <span className="text-blue-400">🔖 {movie.unwatched}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white/10 rounded-lg p-4">
              <h3 className="text-lg font-medium text-white mb-4">Recent Activity</h3>
              <div className="space-y-2">
                {analytics.recentActivity.slice(0, 10).map((activity, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-white/60">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="text-white">Movie {activity.movieId}</span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      activity.action === 'like' ? 'bg-green-500/20 text-green-400' :
                      activity.action === 'pass' ? 'bg-red-500/20 text-red-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {activity.action}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-red-400 text-center py-8">Failed to load analytics</div>
        )}
      </div>
    </div>
  );
}