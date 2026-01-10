export type MovieLanguage = 'en' | 'ta' | 'de' | 'es' | 'hi' | 'te' | 'ml' | 'kn';

export interface StreamingProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority: number;
}

export interface WatchProviders {
  flatrate?: StreamingProvider[];
  rent?: StreamingProvider[];
  buy?: StreamingProvider[];
  link?: string;
}

export interface Movie {
  id: number;
  title: string;
  overview: string;
  posterPath: string;
  releaseDate: string;
  voteAverage: number;
  voteCount?: number; // Number of votes - used for quality filtering
  genres: string[];
  type: 'movie' | 'series';
  language?: string;
  director?: string;
  popularity?: number;
  watchProviders?: WatchProviders | null;
  isAnime?: boolean; // Detected via keywords or Japanese animation
  recommendationSource?: {
    type: 'tmdb' | 'discover';
    basedOn?: string; // Movie title that this was recommended from
  };
}

export type MovieActionType = 'like' | 'pass' | 'unwatched';

export type ContentType = 'movies' | 'series' | 'both';
export type SeriesType = 'mini' | 'long' | 'both';

export interface UserPreferences {
  languages: MovieLanguage[];
  contentType: ContentType;
  seriesType?: SeriesType;
  genres: string[];
  yearRange: [number, number]; // Start and end year
}

export type ViewType = 'swipe' | 'list' | 'settings';