import React, { useState, useEffect } from 'react';
import { Heart, X, Trash2, Play, ExternalLink, Users, Calendar, Clock, Star, BookmarkPlus } from 'lucide-react';
import type { Movie } from '../types';
import { smartRecommendationEngine } from '../lib/smartRecommendations';
import { getWatchProviders, getMovieDetails } from '../lib/tmdb';

interface WatchlistViewProps {
  movies: Movie[];
  onUpdate: () => void;
  onRemove?: (movieId: number) => Promise<void>;
}

interface MovieDetails {
  cast: { name: string; character: string; profilePath: string | null }[];
  crew: { name: string; job: string }[];
  runtime: number;
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

export function WatchlistView({ movies, onUpdate, onRemove }: WatchlistViewProps) {
  const [streamingInfo, setStreamingInfo] = useState<{ [key: number]: StreamingInfo }>({});
  const [loadingProviders, setLoadingProviders] = useState<{ [key: number]: boolean }>({});
  const [movieDetails, setMovieDetails] = useState<{ [key: number]: MovieDetails }>({});
  const [loadingDetails, setLoadingDetails] = useState<{ [key: number]: boolean }>({});
  const [collapsedMovies, setCollapsedMovies] = useState<Set<number>>(new Set()); // Track which movies are collapsed

  // Auto-fetch details and streaming info for all movies on mount
  useEffect(() => {
    console.log('📋 Watchlist loaded:', {
      count: movies.length,
      movies: movies.map(m => ({
        id: m.id,
        title: m.title,
        type: m.type,
        hasOverview: !!m.overview,
        overviewLength: m.overview?.length || 0
      }))
    });

    movies.forEach(movie => {
      fetchStreamingInfo(movie.id, movie.type);
      fetchMovieDetails(movie.id, movie.type);
    });
  }, [movies]);

  const handleAction = async (movieId: number, action: 'like' | 'pass') => {
    try {
      // If onRemove is provided (Supabase mode), use it
      if (onRemove) {
        await onRemove(movieId);
      } else {
        // Fallback to localStorage mode
        smartRecommendationEngine.removeFromWatchlist(movieId);
      }

      // If user liked it, record the action in smart engine
      if (action === 'like') {
        const movie = movies.find(m => m.id === movieId);
        if (movie) {
          smartRecommendationEngine.recordSwipe(movie, 'like');
        }
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
      // Convert 'series' to 'tv' for TMDB API compatibility
      const contentType = type === 'series' ? 'tv' : 'movie';
      console.log('📺 Fetching OTT providers for:', movieId, contentType);
      const providers = await getWatchProviders(movieId, contentType);
      console.log('✅ OTT providers fetched:', { movieId, providers, regions: Object.keys(providers) });
      setStreamingInfo(prev => ({ ...prev, [movieId]: providers }));
    } catch (error) {
      console.error('❌ Error fetching streaming info:', error);
    } finally {
      setLoadingProviders(prev => ({ ...prev, [movieId]: false }));
    }
  };

  const fetchMovieDetails = async (movieId: number, type: 'movie' | 'tv') => {
    if (movieDetails[movieId] || loadingDetails[movieId]) return;

    setLoadingDetails(prev => ({ ...prev, [movieId]: true }));
    try {
      const details = await getMovieDetails(movieId, type);
      if (details) {
        setMovieDetails(prev => ({ 
          ...prev, 
          [movieId]: {
            cast: details.cast,
            crew: details.crew,
            runtime: details.runtime
          }
        }));
      }
    } catch (error) {
      console.error('Error fetching movie details:', error);
    } finally {
      setLoadingDetails(prev => ({ ...prev, [movieId]: false }));
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

    // If we haven't fetched yet, don't show anything
    if (!info) return null;

    // Check multiple regions: India, US, UK, Germany
    const regions = ['IN', 'US', 'GB', 'DE'];
    const allProviders: { provider: any; region: string }[] = [];

    regions.forEach(region => {
      if (info[region]) {
        const providers = info[region];
        const regionProviders = [
          ...(providers.flatrate || []),
          ...(providers.free || []),
          ...(providers.ads || [])
        ];
        regionProviders.forEach(provider => {
          allProviders.push({ provider, region });
        });
      }
    });

    if (allProviders.length === 0) {
      return (
        <div className="mt-3 flex items-center gap-2">
          <Play className="h-4 w-4 text-white/40" />
          <span className="text-xs text-white/50">Not available on major streaming platforms</span>
        </div>
      );
    }

    // Remove duplicate providers (same provider across regions)
    const uniqueProviders = allProviders.filter((item, index, self) =>
      index === self.findIndex(p => p.provider.provider_id === item.provider.provider_id)
    );

    const regionNames: { [key: string]: string } = {
      'IN': '🇮🇳',
      'US': '🇺🇸',
      'GB': '🇬🇧',
      'DE': '🇩🇪'
    };

    return (
      <div className="mt-3 border-t border-white/10 pt-3">
        <div className="flex items-center gap-2 mb-2">
          <Play className="h-4 w-4 text-white/60" />
          <span className="text-sm font-medium text-white/80">Streaming on:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {uniqueProviders.map(({ provider, region }) => (
            <button
              key={`provider-${movieId}-${provider.provider_id}`}
              onClick={(e) => {
                e.stopPropagation();
                handleProviderClick(provider.provider_id, region);
              }}
              className="group relative flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition border border-white/20"
              title={`Watch on ${provider.provider_name}`}
            >
              <img
                src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                alt={provider.provider_name}
                className="w-5 h-5 rounded transition transform group-hover:scale-110"
              />
              <span className="text-xs text-white/90">{provider.provider_name}</span>
              <span className="text-xs">{regionNames[region]}</span>
              <ExternalLink className="h-3 w-3 text-white/60 group-hover:text-white transition" />
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderMovieDetails = (movieId: number) => {
    const details = movieDetails[movieId];
    if (!details) return null;

    return (
      <div className="mt-4 space-y-3">
        {/* Runtime */}
        {details.runtime && (
          <div className="flex items-center gap-2 text-sm text-white/80">
            <Clock className="h-4 w-4" />
            <span>{details.runtime} minutes</span>
          </div>
        )}

        {/* Cast */}
        {details.cast.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-white/60" />
              <span className="text-sm font-medium text-white/80">Cast</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {details.cast.map(actor => (
                <span
                  key={actor.name}
                  className="text-xs bg-white/10 text-white/70 px-2 py-1 rounded-full"
                >
                  {actor.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Crew */}
        {details.crew.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-white/60" />
              <span className="text-sm font-medium text-white/80">Crew</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {details.crew.map(person => (
                <span
                  key={`${person.name}-${person.job}`}
                  className="text-xs bg-white/10 text-white/70 px-2 py-1 rounded-full"
                >
                  {person.name} ({person.job})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };
  if (movies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6">
        <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center mb-6">
          <BookmarkPlus className="h-12 w-12 text-white/60" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Your Watchlist is Empty</h2>
        <p className="text-white/70 mb-6 max-w-md">
          Swipe up ↑ on any movie while swiping to save it to your watchlist!
        </p>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 max-w-sm border border-white/20">
          <p className="text-sm text-white/80">
            <strong className="text-white">Pro tip:</strong> Add movies you want to watch later, and we'll show you where to stream them!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 pb-20">
      {movies.map(movie => {
        const isCollapsed = collapsedMovies.has(movie.id);
        return (
          <div
            key={`watchlist-${movie.id}-${movie.type}`}
            className="bg-white/10 backdrop-blur-sm rounded-lg overflow-hidden cursor-pointer transition hover:bg-white/20 border border-white/10 hover:border-white/30"
            onClick={() => {
              setCollapsedMovies(prev => {
                const newSet = new Set(prev);
                if (newSet.has(movie.id)) {
                  newSet.delete(movie.id); // Expand
                } else {
                  newSet.add(movie.id); // Collapse
                }
                return newSet;
              });
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

                {/* Full description - show all by default, collapse on click */}
                <p className={`text-sm text-white/80 mt-1 ${isCollapsed ? 'line-clamp-2' : ''}`}>
                  {movie.overview || 'No description available.'}
                </p>

                <div className="flex items-center gap-3 mt-2">
                  <span className="text-sm text-white/60 flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(movie.releaseDate).getFullYear()}
                  </span>
                  <span className="text-sm text-white/60 flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-400" />
                    {movie.voteAverage.toFixed(1)}
                  </span>
                  {movie.genres && movie.genres.length > 0 && (
                    <span className="text-sm text-white/60">
                      {movie.genres.slice(0, 2).join(', ')}
                    </span>
                  )}
                </div>

                {/* Show details by default, hide when collapsed */}
                {!isCollapsed && (
                  <>
                    {loadingDetails[movie.id] ? (
                      <div className="mt-3 text-sm text-white/60">
                        Loading details...
                      </div>
                    ) : (
                      renderMovieDetails(movie.id)
                    )}
                  </>
                )}

                {/* Always show streaming providers (unless collapsed) */}
                {!isCollapsed && (
                  <>
                    {loadingProviders[movie.id] ? (
                      <div className="mt-3 text-sm text-white/60">
                        Loading streaming info...
                      </div>
                    ) : (
                      renderStreamingProviders(movie.id)
                    )}
                  </>
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
        );
      })}
    </div>
  );
}