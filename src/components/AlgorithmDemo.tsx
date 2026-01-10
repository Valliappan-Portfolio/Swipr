import { useEffect, useState } from 'react';
import { X, TrendingUp, Target, Award, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { smartRecommendationEngine } from '../lib/smartRecommendations';
import { hybridRecommendationEngine } from '../lib/hybridRecommendations';
import { getStoredUserId } from '../lib/supabase';
import { getDetailedRecommendationAnalysis, type DetailedMovieRecommendation } from '../lib/detailedCollaborativeAnalysis';
import type { Movie } from '../types';

interface AlgorithmDemoProps {
  onClose: () => void;
  sampleMovies: Movie[];
}

interface CollaborativeInfo {
  similarUsersCount: number;
  sharedLikes: number;
  sharedDislikes: number;
  userBasedExplanation: string;
  itemItemExplanation: string;
  detailedAnalysis?: DetailedMovieRecommendation | null;
}

export function AlgorithmDemo({ onClose, sampleMovies }: AlgorithmDemoProps) {
  const stats = smartRecommendationEngine.getSessionStats();
  const preferences = stats.preferences;
  const userId = getStoredUserId();

  const [scoredMovies, setScoredMovies] = useState<Array<{
    movie: Movie;
    score: number;
    breakdown: any;
    collaborative: CollaborativeInfo;
  }>>([]);
  const [similarUsersCount, setSimilarUsersCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedMovie, setExpandedMovie] = useState<number | null>(null);

  useEffect(() => {
    async function loadHybridScores() {
      if (!userId) {
        // No user ID, fall back to content-based only
        const contentBased = sampleMovies
          .map(movie => ({
            movie,
            score: smartRecommendationEngine.scoreMovie(movie),
            breakdown: calculateScoreBreakdown(movie),
            collaborative: {
              similarUsersCount: 0,
              sharedLikes: 0,
              sharedDislikes: 0,
              userBasedExplanation: 'Sign in to see user-based recommendations',
              itemItemExplanation: ''
            }
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);
        setScoredMovies(contentBased);
        setIsLoading(false);
        return;
      }

      // Get hybrid scores with collaborative filtering
      const similarUsers = await hybridRecommendationEngine.findSimilarUsers(userId);
      setSimilarUsersCount(similarUsers.size);

      const hybridScored = await Promise.all(
        sampleMovies.slice(0, 10).map(async movie => {
          const hybridScore = await hybridRecommendationEngine.scoreMovieHybrid(
            movie,
            userId,
            similarUsers
          );

          // Get detailed analysis for each movie
          const detailedAnalysis = await getDetailedRecommendationAnalysis(
            userId,
            movie.id,
            movie.title
          );

          return {
            movie,
            score: hybridScore.totalScore,
            breakdown: calculateScoreBreakdown(movie),
            collaborative: {
              similarUsersCount: similarUsers.size,
              sharedLikes: 0,
              sharedDislikes: 0,
              userBasedExplanation: hybridScore.explanation.find(e => e.includes('👥')) || '',
              itemItemExplanation: hybridScore.explanation.find(e => e.includes('🎬')) || '',
              detailedAnalysis
            }
          };
        })
      );

      const sorted = hybridScored.sort((a, b) => b.score - a.score).slice(0, 3);
      setScoredMovies(sorted);
      setIsLoading(false);
    }

    loadHybridScores();
  }, [userId, sampleMovies]);

  function calculateScoreBreakdown(movie: Movie) {
    const breakdown = {
      base: 0.5,
      genre: 0,
      decade: 0,
      rating: 0,
      total: 0,
      explanation: [] as string[]
    };

    // Genre scoring
    const likedGenresInMovie = movie.genres.filter(g => preferences.likedGenres.includes(g));
    const dislikedGenresInMovie = movie.genres.filter(g => preferences.dislikedGenres.includes(g));

    movie.genres.forEach(genre => {
      if (preferences.likedGenres.includes(genre)) {
        breakdown.genre += 0.4;
      }
      if (preferences.dislikedGenres.includes(genre)) {
        breakdown.genre -= 0.6;
      }
    });

    if (likedGenresInMovie.length > 0) {
      breakdown.explanation.push(`✓ Contains ${likedGenresInMovie.length} of your favorite genre${likedGenresInMovie.length > 1 ? 's' : ''}: ${likedGenresInMovie.join(', ')} (+${(likedGenresInMovie.length * 0.4).toFixed(1)} points)`);
    }
    if (dislikedGenresInMovie.length > 0) {
      breakdown.explanation.push(`✗ Contains ${dislikedGenresInMovie.length} genre${dislikedGenresInMovie.length > 1 ? 's' : ''} you avoid: ${dislikedGenresInMovie.join(', ')} (${(dislikedGenresInMovie.length * -0.6).toFixed(1)} points)`);
    }

    // Decade scoring
    const movieYear = new Date(movie.releaseDate).getFullYear();
    const movieDecade = Math.floor(movieYear / 10) * 10;
    if (preferences.preferredDecades.includes(movieDecade)) {
      breakdown.decade += 0.2;
      breakdown.explanation.push(`✓ From your preferred decade: ${movieDecade}s (+0.2 points)`);
    }

    // Rating scoring
    if (movie.voteAverage >= preferences.averageRatingPreference) {
      breakdown.rating += 0.1;
      breakdown.explanation.push(`✓ Rating ${movie.voteAverage.toFixed(1)} is above your average preference of ${preferences.averageRatingPreference.toFixed(1)} (+0.1 points)`);
    }
    if (movie.voteAverage >= 8.0) {
      breakdown.rating += 0.1;
      breakdown.explanation.push(`✓ Highly rated (${movie.voteAverage.toFixed(1)}/10) (+0.1 points)`);
    }

    // Director boost (NEW!)
    if (movie.director && preferences.likedDirectors && preferences.likedDirectors.includes(movie.director)) {
      breakdown.rating += 0.3;
      breakdown.explanation.push(`✓ Directed by ${movie.director} - one of your favorites! (+0.3 points)`);
    }

    // Popularity preference (NEW!)
    if (preferences.popularityPreference && movie.popularity) {
      if (preferences.popularityPreference === 'mainstream' && movie.popularity > 50) {
        breakdown.rating += 0.15;
        breakdown.explanation.push(`✓ Popular mainstream content (${movie.popularity.toFixed(0)} popularity) (+0.15 points)`);
      } else if (preferences.popularityPreference === 'indie' && movie.popularity < 30) {
        breakdown.rating += 0.15;
        breakdown.explanation.push(`✓ Hidden gem indie content (${movie.popularity.toFixed(0)} popularity) (+0.15 points)`);
      }
    }

    breakdown.total = Math.max(0, Math.min(1,
      breakdown.base + breakdown.genre + breakdown.decade + breakdown.rating
    ));

    if (breakdown.explanation.length === 0) {
      breakdown.explanation.push('No strong matches with your preferences yet. Keep swiping to help us learn what you like!');
    }

    return breakdown;
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-900 to-purple-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            How Our Algorithm Works
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* User Profile Summary */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Target className="h-5 w-5" />
            Your Profile
          </h3>

          <div className="grid md:grid-cols-2 gap-4 text-white">
            <div>
              <p className="text-sm text-white/60 mb-2">Total Swipes</p>
              <p className="text-2xl font-bold">{stats.totalSwipes}</p>
            </div>
            <div>
              <p className="text-sm text-white/60 mb-2">Likes vs Passes</p>
              <p className="text-2xl font-bold">{stats.likesCount} / {stats.dislikesCount}</p>
            </div>
          </div>

          {preferences.likedGenres.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-white/60 mb-2">Favorite Genres</p>
              <div className="flex flex-wrap gap-2">
                {preferences.likedGenres.map(genre => (
                  <span key={genre} className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm">
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          )}

          {preferences.dislikedGenres.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-white/60 mb-2">Avoided Genres</p>
              <div className="flex flex-wrap gap-2">
                {preferences.dislikedGenres.map(genre => (
                  <span key={genre} className="px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-sm">
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          )}

          {preferences.preferredDecades.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-white/60 mb-2">Preferred Decades</p>
              <div className="flex flex-wrap gap-2">
                {preferences.preferredDecades.map(decade => (
                  <span key={decade} className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">
                    {decade}s
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4">
            <p className="text-sm text-white/60 mb-2">Average Rating Preference</p>
            <p className="text-lg font-semibold text-white">{preferences.averageRatingPreference.toFixed(1)} / 10</p>
          </div>
        </div>

        {/* Scoring Formula */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-6">
          <h3 className="text-xl font-bold text-white mb-4">Hybrid Scoring Formula</h3>

          {/* Content-Based Filtering */}
          <div className="mb-4">
            <h4 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Content-Based Filtering (30% weight)
            </h4>
            <div className="space-y-2 text-white/90 text-sm pl-6">
              <p><strong className="text-white">Base Score:</strong> 0 (each movie starts at 0%)</p>
              <p><strong className="text-white">Genre Match:</strong> +0.4 per liked genre, -0.6 per disliked genre (3+ passes required)</p>
              <p><strong className="text-white">Decade Match:</strong> +0.2 if from preferred decades</p>
              <p><strong className="text-white">Director Boost:</strong> +0.3 if by your favorite directors</p>
              <p><strong className="text-white">Rating Boost:</strong> +0.1 if above your average, +0.1 if ≥ 8.0</p>
              <p><strong className="text-white">Popularity Match:</strong> +0.15 if matches your mainstream/indie preference</p>
            </div>
          </div>

          {/* User-Based Collaborative Filtering */}
          <div className="border-t border-white/20 pt-4 mb-4">
            <h4 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <Users className="h-4 w-4" />
              User-Based Collaborative (40% weight)
            </h4>
            <div className="space-y-2 text-white/90 text-sm pl-6">
              {similarUsersCount > 0 ? (
                <>
                  <p><strong className="text-white">Similar Users Found:</strong> {similarUsersCount} users with matching taste</p>
                  <p><strong className="text-white">How it works:</strong> Users who liked/disliked similar movies to you</p>
                  <p><strong className="text-white">Score Boost:</strong> +1.0 if similar users liked, -0.5 if they passed</p>
                  <p className="text-green-300">✓ User-based filtering is active!</p>
                </>
              ) : (
                <>
                  <p className="text-white/70">Finding users with similar taste...</p>
                  <p className="text-white/70">Need at least 3 common movies with other users to activate</p>
                  <p className="text-yellow-300">⏳ Building your profile...</p>
                </>
              )}
            </div>
          </div>

          {/* Item-Item Collaborative Filtering */}
          <div className="border-t border-white/20 pt-4">
            <h4 className="text-lg font-semibold text-white mb-2 flex items-center gap-1">
              🎬 Item-Item Association (30% weight)
            </h4>
            <div className="space-y-2 text-white/90 text-sm pl-6">
              <p><strong className="text-white">How it works:</strong> "People who liked Dark also liked Black Mirror"</p>
              <p><strong className="text-white">Association Strength:</strong> Based on co-watch patterns across all users</p>
              <p><strong className="text-white">Your Impact:</strong> Uses your liked movies to find associations</p>
              <p className="text-blue-300">💡 The more you swipe, the better the associations!</p>
            </div>
          </div>

          <p className="pt-4 border-t border-white/20 mt-4 text-sm text-white/80">
            <strong className="text-white">Final Score:</strong> (Content × 0.3) + (User-Based × 0.4) + (Item-Item × 0.3), clamped 0.0-1.0
          </p>
        </div>

        {/* Real Examples */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Award className="h-5 w-5" />
            Top Recommendations for You
          </h3>

          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-white/60 mb-2">Analyzing recommendations...</p>
              <p className="text-white/40 text-sm">Finding similar users and calculating scores</p>
            </div>
          ) : scoredMovies.length === 0 ? (
            <p className="text-white/60 text-center py-8">
              No sample movies available. Start swiping to see recommendations!
            </p>
          ) : (
            <div className="space-y-4">
              {scoredMovies.map(({ movie, score, breakdown, collaborative }) => (
                <div key={movie.id} className="bg-black/20 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-white mb-1">{movie.title}</h4>
                      <p className="text-sm text-white/60">
                        {new Date(movie.releaseDate).getFullYear()} • {movie.voteAverage.toFixed(1)}⭐
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {movie.genres.map(genre => (
                          <span
                            key={genre}
                            className={`text-xs px-2 py-1 rounded ${
                              preferences.likedGenres.includes(genre)
                                ? 'bg-green-500/20 text-green-300'
                                : preferences.dislikedGenres.includes(genre)
                                ? 'bg-red-500/20 text-red-300'
                                : 'bg-white/10 text-white/60'
                            }`}
                          >
                            {genre}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-3xl font-bold text-white">
                        {(score * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-white/60">Match Score</div>
                    </div>
                  </div>

                  <div className="border-t border-white/20 pt-3 mt-3">
                    <p className="text-xs text-white/60 mb-2">Score Breakdown:</p>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs mb-3">
                      <div>
                        <span className="text-white/60">Base:</span>
                        <span className="text-white font-semibold ml-1">+{breakdown.base.toFixed(1)}</span>
                      </div>
                      <div>
                        <span className="text-white/60">Genre:</span>
                        <span className={`font-semibold ml-1 ${breakdown.genre >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {breakdown.genre >= 0 ? '+' : ''}{breakdown.genre.toFixed(1)}
                        </span>
                      </div>
                      <div>
                        <span className="text-white/60">Decade:</span>
                        <span className={`font-semibold ml-1 ${breakdown.decade >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {breakdown.decade >= 0 ? '+' : ''}{breakdown.decade.toFixed(1)}
                        </span>
                      </div>
                      <div>
                        <span className="text-white/60">Rating:</span>
                        <span className="text-green-400 font-semibold ml-1">+{breakdown.rating.toFixed(1)}</span>
                      </div>
                      <div>
                        <span className="text-white/60">Total:</span>
                        <span className="text-white font-bold ml-1">{breakdown.total.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="bg-black/30 rounded-lg p-3 mt-3">
                      <p className="text-xs font-semibold text-white/80 mb-2">Why this recommendation?</p>

                      {/* Content-based reasons */}
                      <div className="space-y-1 mb-3">
                        {breakdown.explanation.map((reason: string, idx: number) => (
                          <p key={idx} className="text-xs text-white/70 leading-relaxed">
                            {reason}
                          </p>
                        ))}
                      </div>

                      {/* Collaborative filtering info */}
                      {(collaborative.userBasedExplanation || collaborative.itemItemExplanation) && (
                        <div className="border-t border-white/20 pt-2 space-y-2">
                          {collaborative.userBasedExplanation && (
                            <div>
                              <p className="text-xs font-semibold text-blue-300 mb-1 flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                User-Based Collaborative:
                              </p>
                              <p className="text-xs text-white/70">
                                {collaborative.userBasedExplanation.replace('👥 ', '')}
                              </p>
                              {collaborative.similarUsersCount > 0 && (
                                <p className="text-xs text-white/60 mt-1">
                                  Based on {collaborative.similarUsersCount} similar user{collaborative.similarUsersCount !== 1 ? 's' : ''}
                                </p>
                              )}
                            </div>
                          )}

                          {collaborative.itemItemExplanation && (
                            <div>
                              <p className="text-xs font-semibold text-purple-300 mb-1 flex items-center gap-1">
                                🎬 Item-Item Association:
                              </p>
                              <p className="text-xs text-white/70">
                                {collaborative.itemItemExplanation.replace('🎬 ', '')}
                              </p>
                            </div>
                          )}

                          {/* Detailed Analysis Toggle (Internal Use Only) */}
                          {collaborative.detailedAnalysis && (
                            <div className="mt-3 border-t border-white/10 pt-2">
                              <button
                                onClick={() => setExpandedMovie(expandedMovie === movie.id ? null : movie.id)}
                                className="flex items-center gap-2 text-xs text-yellow-300 hover:text-yellow-200 transition"
                              >
                                {expandedMovie === movie.id ? (
                                  <ChevronUp className="h-3 w-3" />
                                ) : (
                                  <ChevronDown className="h-3 w-3" />
                                )}
                                <span className="font-semibold">Show Detailed Data (Internal - Will Remove Before Launch)</span>
                              </button>

                              {expandedMovie === movie.id && (
                                <div className="mt-2 bg-yellow-900/20 border border-yellow-500/30 rounded p-3 space-y-3">
                                  {/* Similar Users Who Liked This */}
                                  {collaborative.detailedAnalysis.similarUsersWhoLiked.length > 0 && (
                                    <div>
                                      <p className="text-xs font-bold text-yellow-200 mb-2">
                                        👥 Similar Users Who Also Liked This:
                                      </p>
                                      <div className="space-y-2">
                                        {collaborative.detailedAnalysis.similarUsersWhoLiked.map((user, idx) => (
                                          <div key={idx} className="bg-black/30 rounded p-2">
                                            <p className="text-xs text-white/90">
                                              <span className="font-mono text-blue-300">{user.userId}</span>
                                              <span className="text-green-300 ml-2">({user.similarity}% similar)</span>
                                            </p>
                                            <p className="text-xs text-white/70 mt-1">
                                              <span className="text-white/50">They also liked:</span>{' '}
                                              {user.theirLikes.join(', ')}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Item-Item Associations */}
                                  {collaborative.detailedAnalysis.associations.length > 0 && (
                                    <div>
                                      <p className="text-xs font-bold text-purple-200 mb-2">
                                        🎬 Association Patterns:
                                      </p>
                                      <div className="space-y-2">
                                        {collaborative.detailedAnalysis.associations.map((assoc, idx) => (
                                          <div key={idx} className="bg-black/30 rounded p-2">
                                            <p className="text-xs text-white/90">
                                              <span className="text-purple-300">"{assoc.yourLikedMovie}"</span>
                                              <span className="text-white/50 mx-1">→</span>
                                              <span className="text-green-300">{assoc.associationStrength}% association</span>
                                            </p>
                                            <p className="text-xs text-white/60 mt-1">
                                              {assoc.coWatchCount} user{assoc.coWatchCount !== 1 ? 's' : ''} liked both
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {collaborative.detailedAnalysis.similarUsersWhoLiked.length === 0 &&
                                   collaborative.detailedAnalysis.associations.length === 0 && (
                                    <p className="text-xs text-white/50 italic">
                                      No collaborative data yet. Keep swiping to build connections!
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-sm text-white/60">
          The algorithm learns from every swipe and continuously improves recommendations based on your preferences.
        </div>
      </div>
    </div>
  );
}
