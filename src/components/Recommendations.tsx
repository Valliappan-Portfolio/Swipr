import React, { useState, useEffect } from 'react';
import { Film } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Movie } from '../types';
import { getMovies, getTVSeries } from '../lib/tmdb';

interface RecommendationsProps {
  preferenceId: string;
  onMovieSelect: (movie: Movie) => void;
}

export function Recommendations({ preferenceId, onMovieSelect }: RecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!supabase || !preferenceId) return;

      try {
        setLoading(true);
        setError(null);

        // Get user's liked movies
        const { data: likedMovies } = await supabase
          .from('anonymous_actions')
          .select('movie_id, genres, language')
          .eq('preference_id', preferenceId)
          .eq('action', 'like')
          .limit(5);

        if (!likedMovies || likedMovies.length === 0) {
          setRecommendations([]);
          return;
        }

        // Fetch movie details for liked movies
        const movieDetails = await Promise.all(
          likedMovies.map(async (liked) => {
            const movieResponse = await getMovies(1, [], [], liked.movie_id);
            if (movieResponse.results?.[0]) {
              return movieResponse.results[0];
            }
            const seriesResponse = await getTVSeries(1, [], [], liked.movie_id);
            return seriesResponse.results?.[0];
          })
        );

        // Filter out any null results and sort by vote average
        setRecommendations(
          movieDetails
            .filter(Boolean)
            .sort((a, b) => b.voteAverage - a.voteAverage)
        );
      } catch (err) {
        console.error('Error fetching recommendations:', err);
        setError('Failed to load recommendations');
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [preferenceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-white/80">
        <p>{error}</p>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-8 text-white/80">
        <p>Start liking movies to get personalized recommendations!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Film className="h-6 w-6 text-white" />
        <h2 className="text-2xl font-bold text-white">Movies You Might Like</h2>
      </div>

      <div className="grid gap-4">
        {recommendations.map((movie) => (
          <div
            key={`${movie.id}-${movie.type}`}
            className="bg-white/10 rounded-lg overflow-hidden cursor-pointer transition hover:bg-white/20"
            onClick={() => onMovieSelect(movie)}
          >
            <div className="flex items-start p-4">
              <img
                src={`https://image.tmdb.org/t/p/w200${movie.posterPath}`}
                alt={movie.title}
                className="w-24 h-36 object-cover rounded-lg"
                loading="lazy"
              />
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-white">{movie.title}</h3>
                <p className="text-sm text-white/80 line-clamp-2 mt-1">
                  {movie.overview}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-white/60">
                    {new Date(movie.releaseDate).getFullYear()}
                  </span>
                  <span className="text-sm text-white/60">
                    ⭐️ {movie.voteAverage.toFixed(1)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {movie.genres.map(genre => (
                    <span
                      key={genre}
                      className="px-2 py-0.5 rounded-full bg-white/10 text-white/80 text-xs"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}