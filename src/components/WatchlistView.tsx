import React, { useState } from 'react';
import { Heart, X, Trash2, Play, ExternalLink } from 'lucide-react';
import type { Movie } from '../types';
import { supabase, getStoredPreferenceId } from '../lib/supabase';
import { getWatchProviders } from '../lib/tmdb';

interface WatchlistViewProps {
  movies: Movie[];
  onUpdate: () => void;
}

interface StreamingInfo {
  [region: string]: {
    flatrate?: { provider_name: string; logo_path: string; provider_id: number }[];
    rent?: { provider_name: string; logo_path: string; provider_id: number }[];
    buy?: { provider_name: string; logo_path: string; provider_id: number }[];
    free?: { provider_name: string; logo_path: string; provider_id: number }[];
    ads?: { provider_name: string; logo_path: string; provider_id: number }[];
  };
}

// OTT Provider URLs with region-specific handling
const PROVIDER_URLS: { [key: number]: { url: string; regions?: { [key: string]: string } } } = {
  8: { // Netflix
    url: 'https://www.netflix.com',
    regions: {
      IN: 'https://www.netflix.com/in'
    }
  },
  119: { // Amazon Prime Video
    url: 'https://www.primevideo.com',
    regions: {
      IN: 'https://www.primevideo.com/region/in'
    }
  },
  122: { // Hotstar
    url: 'https://www.hotstar.com',
    regions: {
      IN: 'https://www.hotstar.com'
    }
  },
  121: { // JioCinema
    url: 'https://www.jiocinema.com'
  },
  237: { // SonyLIV
    url: 'https://www.sonyliv.com'
  },
  2: { // Apple TV
    url: 'https://tv.apple.com'
  },
  3: { // Google Play
    url: 'https://play.google.com/store/movies'
  },
  192: { // YouTube
    url: 'https://www.youtube.com/movies'
  },
  11: { // Mubi
    url: 'https://mubi.com',
    regions: {
      IN: 'https://mubi.com/in'
    }
  },
  531: { // Paramount+
    url: 'https://www.paramountplus.com'
  },
  384: { // HBO Max / Max
    url: 'https://www.max.com'
  },
  337: { // Disney+
    url: 'https://www.disneyplus.com',
    regions: {
      IN: 'https://www.hotstar.com' // Disney+ Hotstar in India
    }
  }
};

export function WatchlistView({ movies, onUpdate }: WatchlistViewProps) {
  const [streamingInfo, setStreamingInfo] = useState<{ [key: number]: StreamingInfo }>({});
  const [loadingProviders, setLoadingProviders] = useState<{ [key: number]: boolean }>({});
  const [selectedMovie, setSelectedMovie] = useState<number | null>(null);

  const handleAction = async (movieId: number, action: 'like' | 'pass') => {
    const preferenceId = getStoredPreferenceId();
    if (!preferenceId) return;

    try {
      await supabase
        .from('anonymous_actions')
        .delete()
        .eq('preference_id', preferenceId)
        .eq('movie_id', movieId)
        .eq('action', 'unwatched');

      if (action !== 'pass') {
        await supabase.from('anonymous_actions').insert({
          preference_id: preferenceId,
          movie_id: movieId,
          action: action,
          genres: [],
          language: 'en'
        });
      }

      onUpdate();
    } catch (error) {
      console.error('Error updating movie action:', error);
    }
  };

  const fetchStreamingInfo = async (movieId: number, type: 'movie' | 'tv') => {
    if (streamingInfo[movieId] || loadingProviders[movieId]) return;

    setLoadingProviders(prev => ({ ...prev, [movieId]: true }));
    try {
      const providers = await getWatchProviders(movieId, type);
      setStreamingInfo(prev => ({ ...prev, [movieId]: providers }));
    } catch (error) {
      console.error('Error fetching streaming info:', error);
    } finally {
      setLoadingProviders(prev => ({ ...prev, [movieId]: false }));
    }
  };

  const handleProviderClick = (providerId: number, region: string = 'IN') => {
    const providerConfig = PROVIDER_URLS[providerId];
    if (!providerConfig) return;

    // Get region-specific URL if available, otherwise use default
    const url = providerConfig.regions?.[region] || providerConfig.url;
    
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const renderStreamingProviders = (movieId: number) => {
    const info = streamingInfo[movieId];
    if (!info?.IN) return null;

    const providers = info.IN;
    const allProviders = [
      ...(providers.flatrate || []),
      ...(providers.free || []),
      ...(providers.ads || [])
    ];

    if (allProviders.length === 0) return null;

    // Remove duplicate providers
    const uniqueProviders = allProviders.filter((provider, index, self) =>
      index === self.findIndex(p => p.provider_id === provider.provider_id)
    );

    return (
      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-white/60">Watch on:</span>
        <div className="flex gap-2">
          {uniqueProviders.map(provider => (
            <button
              key={`provider-${movieId}-${provider.provider_id}`}
              onClick={() => handleProviderClick(provider.provider_id, 'IN')}
              className="group relative"
              title={`Watch on ${provider.provider_name}`}
            >
              <img
                src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                alt={provider.provider_name}
                className="w-6 h-6 rounded-full transition transform group-hover:scale-110"
              />
              <ExternalLink className="absolute -top-1 -right-1 h-3 w-3 text-white opacity-0 group-hover:opacity-100 transition" />
            </button>
          ))}
        </div>
      </div>
    );
  };

  if (movies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-white/80">
        <p className="text-xl">No movies in your watchlist</p>
        <p className="mt-2">Swipe up on movies to add them here!</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 pb-20">
      {movies.map(movie => (
        <div
          key={`watchlist-${movie.id}-${movie.type}`}
          className="bg-white/10 backdrop-blur-sm rounded-lg overflow-hidden cursor-pointer transition hover:bg-white/20"
          onClick={() => {
            fetchStreamingInfo(movie.id, movie.type);
            setSelectedMovie(selectedMovie === movie.id ? null : movie.id);
          }}
        >
          <div className="flex items-start p-4">
            <img
              src={`https://image.tmdb.org/t/p/w200${movie.posterPath}`}
              alt={movie.title}
              className="w-24 h-36 object-cover rounded-lg"
            />
            <div className="flex-1 ml-4">
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

              {loadingProviders[movie.id] ? (
                <div className="mt-3 text-sm text-white/60">
                  Loading streaming info...
                </div>
              ) : (
                renderStreamingProviders(movie.id)
              )}

              <div className="flex gap-2 mt-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction(movie.id, 'like');
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-green-500/20 text-green-400 hover:bg-green-500/30 transition"
                >
                  <Heart className="h-4 w-4" />
                  <span>Like</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction(movie.id, 'pass');
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}