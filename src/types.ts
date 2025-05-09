export type MovieLanguage = 'en' | 'hi' | 'ta' | 'te' | 'ml';

export interface Movie {
  id: number;
  title: string;
  overview: string;
  posterPath: string;
  releaseDate: string;
  voteAverage: number;
  genres: string[];
  type: 'movie' | 'series';
  language?: string;
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