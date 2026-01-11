import React, { useState } from 'react';
import { BarChart3, Heart, X, BookmarkPlus, TrendingUp, Award, Calendar, Sparkles } from 'lucide-react';
import { smartRecommendationEngine } from '../lib/smartRecommendations';

interface UserStatsProps {
  onClose: () => void;
}

export function UserStats({ onClose }: UserStatsProps) {
  const [stats] = useState(() => smartRecommendationEngine.getSessionStats());

  const getTopGenres = () => {
    return stats.preferences.likedGenres.slice(0, 5);
  };

  const getPreferredDecades = () => {
    return stats.preferences.preferredDecades
      .sort((a, b) => b - a)
      .slice(0, 3)
      .map(decade => `${decade}s`);
  };

  const getLikePercentage = () => {
    if (stats.totalSwipes === 0) return 0;
    return Math.round((stats.likesCount / stats.totalSwipes) * 100);
  };

  const getWatchTimeEstimate = () => {
    // Assume average movie is 110 minutes
    const estimatedMinutes = stats.unwatchedCount * 110;
    const hours = Math.floor(estimatedMinutes / 60);
    return hours;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-teal-400" />
            <h2 className="text-2xl font-bold text-white">Your Movie Journey</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* Total Swipes */}
          <div className="bg-white/10 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-white">{stats.totalSwipes}</div>
            <div className="text-sm text-white/60">Total Swipes</div>
          </div>

          {/* Likes */}
          <div className="bg-green-500/20 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Heart className="h-4 w-4 text-green-400" />
              <div className="text-2xl font-bold text-green-400">{stats.likesCount}</div>
            </div>
            <div className="text-sm text-white/60">Liked</div>
          </div>

          {/* Watchlist */}
          <div className="bg-blue-500/20 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <BookmarkPlus className="h-4 w-4 text-blue-400" />
              <div className="text-2xl font-bold text-blue-400">{stats.unwatchedCount}</div>
            </div>
            <div className="text-sm text-white/60">Watchlist</div>
          </div>

          {/* Like Rate */}
          <div className="bg-purple-500/20 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-4 w-4 text-purple-400" />
              <div className="text-2xl font-bold text-purple-400">{getLikePercentage()}%</div>
            </div>
            <div className="text-sm text-white/60">Like Rate</div>
          </div>
        </div>

        {stats.hasHistory && (
          <>
            {/* Favorite Genres */}
            <div className="bg-white/10 rounded-lg p-4 mb-4">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-400" />
                Your Favorite Genres
              </h3>
              <div className="flex flex-wrap gap-2">
                {getTopGenres().map((genre, index) => (
                  <span
                    key={genre}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      index === 0
                        ? 'bg-yellow-500/20 text-yellow-300'
                        : index === 1
                        ? 'bg-orange-500/20 text-orange-300'
                        : 'bg-white/20 text-white'
                    }`}
                  >
                    {genre}
                    {index === 0 && ' 👑'}
                  </span>
                ))}
              </div>
              {getTopGenres().length === 0 && (
                <p className="text-white/60 text-sm">Keep swiping to discover your preferences!</p>
              )}
            </div>

            {/* Preferred Decades */}
            {getPreferredDecades().length > 0 && (
              <div className="bg-white/10 rounded-lg p-4 mb-4">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-400" />
                  Preferred Eras
                </h3>
                <div className="flex flex-wrap gap-2">
                  {getPreferredDecades().map(decade => (
                    <span
                      key={decade}
                      className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-sm font-medium"
                    >
                      {decade}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Watch Time Estimate */}
            {stats.watchlistSize > 0 && (
              <div className="bg-white/10 rounded-lg p-4 mb-4">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Award className="h-5 w-5 text-green-400" />
                  Watchlist Insights
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-white">{getWatchTimeEstimate()}h</div>
                    <div className="text-sm text-white/60">Estimated watch time</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{stats.preferences.averageRatingPreference.toFixed(1)}</div>
                    <div className="text-sm text-white/60">Preferred rating</div>
                  </div>
                </div>
              </div>
            )}

            {/* Taste Profile */}
            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-3">Your Taste Profile</h3>
              <div className="space-y-2 text-sm">
                {getLikePercentage() > 70 && (
                  <p className="text-green-300">🎯 You're easy to please! You like most movies you see.</p>
                )}
                {getLikePercentage() < 30 && (
                  <p className="text-orange-300">🎭 You're a movie critic! You have high standards.</p>
                )}
                {stats.preferences.likedGenres.length > 5 && (
                  <p className="text-blue-300">🌈 You're genre-diverse! You enjoy many different types of movies.</p>
                )}
                {stats.preferences.preferredDecades.some(d => d < 1990) && (
                  <p className="text-yellow-300">📼 You appreciate classic cinema!</p>
                )}
                {stats.preferences.averageRatingPreference > 8.0 && (
                  <p className="text-purple-300">⭐ You seek out highly-rated films!</p>
                )}
              </div>
            </div>
          </>
        )}

        {!stats.hasHistory && (
          <div className="text-center py-8">
            <Sparkles className="h-12 w-12 text-white/40 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Start Your Journey!</h3>
            <p className="text-white/60">
              Swipe on a few movies to see your personalized stats and recommendations.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}