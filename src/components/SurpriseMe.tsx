import React, { useState } from 'react';
import { X, Sparkles, Film, Heart, ThumbsUp, Coffee, Popcorn, PartyPopper, Brain } from 'lucide-react';
import { getMovies, getTVSeries } from '../lib/tmdb';
import type { Movie, UserPreferences } from '../types';

interface SurpriseMeProps {
  onClose: () => void;
  preferences: UserPreferences;
}

interface Mood {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  primaryGenres: string[];
  fallbackGenres: string[];
  minRating?: number;
  sortBy?: 'popularity' | 'rating' | 'recent';
  preferNewReleases?: boolean;
}

const moods: Mood[] = [
  {
    id: 'fun',
    name: 'Fun & Light',
    icon: <PartyPopper className="h-6 w-6 text-white" />,
    description: 'Looking for something light and entertaining',
    primaryGenres: ['Comedy', 'Romance'],
    fallbackGenres: ['Family', 'Adventure'],
    minRating: 6.5,
    sortBy: 'popularity'
  },
  {
    id: 'romantic',
    name: 'Romantic',
    icon: <Heart className="h-6 w-6 text-white" />,
    description: 'In the mood for love and romance',
    primaryGenres: ['Romance'],
    fallbackGenres: ['Drama', 'Comedy'],
    minRating: 7.0,
    sortBy: 'rating'
  },
  {
    id: 'intense',
    name: 'Intense',
    icon: <Brain className="h-6 w-6 text-white" />,
    description: 'Want something gripping and thought-provoking',
    primaryGenres: ['Thriller', 'Mystery'],
    fallbackGenres: ['Sci-Fi'],
    minRating: 7.5,
    sortBy: 'rating'
  },
  {
    id: 'feelgood',
    name: 'Feel Good',
    icon: <ThumbsUp className="h-6 w-6 text-white" />,
    description: 'Need something uplifting and inspiring',
    primaryGenres: ['Comedy', 'Drama'],
    fallbackGenres: ['Family'],
    minRating: 7.0,
    sortBy: 'rating'
  },
  {
    id: 'chill',
    name: 'Chill & Relax',
    icon: <Coffee className="h-6 w-6 text-white" />,
    description: 'Something easy to watch and unwind',
    primaryGenres: ['Comedy', 'Romance'],
    fallbackGenres: ['Family'],
    minRating: 6.0,
    sortBy: 'popularity'
  },
  {
    id: 'epic',
    name: 'Epic & Grand',
    icon: <Film className="h-6 w-6 text-white" />,
    description: 'Looking for a big cinematic experience',
    primaryGenres: ['Action', 'Adventure'],
    fallbackGenres: ['Fantasy'],
    minRating: 7.5,
    sortBy: 'rating'
  }
];

export function SurpriseMe({ onClose, preferences }: SurpriseMeProps) {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = async (mood: Mood) => {
    setLoading(true);
    setError(null);

    try {
      let allContent: Movie[] = [];
      let page = 1;
      
      // First try with primary genres
      while (allContent.length < 10 && page <= 2) {
        if (preferences.contentType === 'movies' || preferences.contentType === 'both') {
          const movieResponse = await getMovies(page, preferences.languages, mood.primaryGenres);
          if (movieResponse.results) {
            allContent = [...allContent, ...movieResponse.results];
          }
        }
        
        if (preferences.contentType === 'series' || preferences.contentType === 'both') {
          const seriesResponse = await getTVSeries(page, preferences.languages, mood.primaryGenres);
          if (seriesResponse.results) {
            allContent = [...allContent, ...seriesResponse.results];
          }
        }
        page++;
      }

      // If we don't have enough content, try with fallback genres
      if (allContent.length < 10) {
        page = 1;
        while (allContent.length < 20 && page <= 2) {
          if (preferences.contentType === 'movies' || preferences.contentType === 'both') {
            const movieResponse = await getMovies(page, preferences.languages, mood.fallbackGenres);
            if (movieResponse.results) {
              allContent = [...allContent, ...movieResponse.results];
            }
          }
          
          if (preferences.contentType === 'series' || preferences.contentType === 'both') {
            const seriesResponse = await getTVSeries(page, preferences.languages, mood.fallbackGenres);
            if (seriesResponse.results) {
              allContent = [...allContent, ...seriesResponse.results];
            }
          }
          page++;
        }
      }

      if (allContent.length === 0) {
        throw new Error('No recommendations found for this mood. Try another one!');
      }

      // Filter and score content
      const scoredContent = allContent
        .filter(item => item.voteAverage >= (mood.minRating || 0))
        .map(item => {
          let score = item.voteAverage;

          // Calculate genre match score
          const genreMatchScore = item.genres.reduce((sum, genre) => {
            // Primary genres get higher boost
            const primaryBoost = mood.primaryGenres.includes(genre) ? 3 : 0;
            // Fallback genres get smaller boost
            const fallbackBoost = mood.fallbackGenres.includes(genre) ? 1 : 0;
            return sum + primaryBoost + fallbackBoost;
          }, 0);

          score += genreMatchScore;

          // Adjust score based on mood preferences
          if (mood.preferNewReleases) {
            const yearDiff = new Date().getFullYear() - new Date(item.releaseDate).getFullYear();
            score += Math.max(0, 5 - yearDiff); // Boost newer content
          }

          // Popularity boost for certain moods
          if (mood.sortBy === 'popularity') {
            score *= 1.2; // 20% boost for popular content
          }

          // Ensure primary genre matches get priority
          if (item.genres.some(g => mood.primaryGenres.includes(g))) {
            score *= 1.5; // 50% boost for primary genre matches
          }

          return { ...item, matchScore: score };
        });

      // Sort based on mood preferences
      const sortedContent = scoredContent.sort((a, b) => {
        if (mood.sortBy === 'recent') {
          return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
        }
        return b.matchScore - a.matchScore;
      });

      // Take top 3 recommendations
      setRecommendations(sortedContent.slice(0, 3));
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      setError(error instanceof Error ? error.message : 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-white" />
              <h2 className="text-2xl font-bold text-white">Mood-Based Picks</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>

          {!selectedMood ? (
            <div className="space-y-4">
              <p className="text-white/80">How are you feeling today?</p>
              <div className="grid grid-cols-2 gap-4">
                {moods.map(mood => (
                  <button
                    key={mood.id}
                    onClick={() => {
                      setSelectedMood(mood.id);
                      fetchRecommendations(mood);
                    }}
                    className="bg-white/10 hover:bg-white/20 transition rounded-lg p-4 text-left"
                  >
                    <div className="flex items-center gap-3 text-white mb-2">
                      {mood.icon}
                      <span className="font-medium">{mood.name}</span>
                    </div>
                    <p className="text-sm text-white/60">{mood.description}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => {
                    setSelectedMood(null);
                    setRecommendations([]);
                    setError(null);
                  }}
                  className="text-white/60 hover:text-white transition"
                >
                  ← Back to moods
                </button>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                  <p className="text-white/80 mt-4">Finding the perfect recommendations...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-red-400 mb-4">{error}</p>
                  <button
                    onClick={() => {
                      const mood = moods.find(m => m.id === selectedMood);
                      if (mood) fetchRecommendations(mood);
                    }}
                    className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white">
                    Here are your {moods.find(m => m.id === selectedMood)?.name.toLowerCase()} picks:
                  </h3>
                  <div className="grid gap-4">
                    {recommendations.map(movie => (
                      <div
                        key={movie.id}
                        className="bg-white/10 rounded-lg overflow-hidden flex"
                      >
                        <img
                          src={`https://image.tmdb.org/t/p/w200${movie.posterPath}`}
                          alt={movie.title}
                          className="w-24 h-36 object-cover"
                        />
                        <div className="p-4 flex-1">
                          <h4 className="font-medium text-white">{movie.title}</h4>
                          <p className="text-sm text-white/60 line-clamp-2 mt-1">
                            {movie.overview}
                          </p>
                          <div className="mt-2 flex items-center gap-2 text-sm text-white/60">
                            <span>{new Date(movie.releaseDate).getFullYear()}</span>
                            <span>•</span>
                            <span>⭐️ {movie.voteAverage.toFixed(1)}</span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {movie.genres.map(genre => (
                              <span
                                key={genre}
                                className={`px-2 py-0.5 rounded-full text-xs ${
                                  moods.find(m => m.id === selectedMood)?.primaryGenres.includes(genre)
                                    ? 'bg-white/20 text-white'
                                    : 'bg-white/10 text-white/80'
                                }`}
                              >
                                {genre}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}