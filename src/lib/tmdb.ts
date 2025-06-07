import { supabase } from './supabase';

const POSTER_SIZES = {
  THUMBNAIL: 'w92',
  SMALL: 'w154',
  MEDIUM: 'w342',
  LARGE: 'w500'
} as const;

export function getPosterUrl(path: string, size: keyof typeof POSTER_SIZES = 'MEDIUM') {
  return `https://image.tmdb.org/t/p/${POSTER_SIZES[size]}${path}`;
}

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

if (!TMDB_API_KEY) {
  console.error('TMDB API key is missing! Check your .env file');
  throw new Error('Missing TMDB API key');
}

export const LANGUAGE_NAMES: { [key: string]: string } = {
  en: 'English',
  hi: 'Hindi',
  ta: 'Tamil',
  te: 'Telugu',
  ml: 'Malayalam'
};

export async function getWatchProviders(contentId: number, contentType: 'movie' | 'tv') {
  try {
    const url = `${TMDB_BASE_URL}/${contentType}/${contentId}/watch/providers?api_key=${TMDB_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.results || {};
  } catch (error) {
    console.error('[TMDB] Error fetching watch providers:', error);
    return {};
  }
}

export async function getMovies(
  page = 1, 
  languages: string[] = ['en'], 
  userGenres: string[] = [],
  yearRange?: [number, number]
) {
  try {
    const moviePromises = languages.map(async (language) => {
      const url = new URL(`${TMDB_BASE_URL}/discover/movie`);
      url.searchParams.append('api_key', TMDB_API_KEY);
      url.searchParams.append('language', 'en-US');
      url.searchParams.append('sort_by', 'popularity.desc,vote_average.desc');
      url.searchParams.append('include_adult', 'false');
      url.searchParams.append('page', page.toString());
      url.searchParams.append('with_original_language', language);
      url.searchParams.append('vote_count.gte', '100');

      if (yearRange) {
        url.searchParams.append('primary_release_date.gte', `${yearRange[0]}-01-01`);
        url.searchParams.append('primary_release_date.lte', `${yearRange[1]}-12-31`);
      }
      
      if (userGenres.length > 0) {
        const genreIds = userGenres
          .map(genre => GENRE_IDS[genre])
          .filter(Boolean);
        url.searchParams.append('with_genres', genreIds.join('|'));
      }

      const response = await fetch(url.toString());
      const data = await response.json();
      
      return (data.results || []).map((movie: any) => ({
        ...movie,
        language
      }));
    });

    const allMoviesArrays = await Promise.all(moviePromises);
    const allMovies = allMoviesArrays.flat().sort((a, b) => {
      // Sort by popularity first
      const popularityDiff = b.popularity - a.popularity;
      if (Math.abs(popularityDiff) > 1) return popularityDiff;
      // If popularity is similar, sort by rating
      return b.vote_average - a.vote_average;
    });

    const movies = allMovies
      .filter(movie => {
        const hasValidPoster = !!movie.poster_path;
        const hasValidTitle = !!movie.title;
        const isCorrectLanguage = languages.includes(movie.original_language);
        const isInYearRange = !yearRange || (
          new Date(movie.release_date).getFullYear() >= yearRange[0] &&
          new Date(movie.release_date).getFullYear() <= yearRange[1]
        );
        return hasValidPoster && hasValidTitle && isCorrectLanguage && isInYearRange;
      })
      .map(movie => ({
        id: movie.id,
        title: movie.title,
        overview: movie.overview || '',
        posterPath: movie.poster_path,
        releaseDate: movie.release_date || '',
        voteAverage: movie.vote_average || 0,
        genres: (movie.genre_ids || [])
          .map(id => GENRE_NAMES[id])
          .filter(Boolean),
        type: 'movie' as const,
        language: movie.language
      }));

    return {
      results: movies,
      total_pages: Math.ceil(movies.length / 20)
    };
  } catch (error) {
    console.error('[TMDB] Error fetching movies:', error);
    return { results: [], total_pages: 0 };
  }
}

export async function getTVSeries(
  page = 1,
  languages: string[] = ['en'],
  userGenres: string[] = [],
  yearRange?: [number, number]
) {
  try {
    const seriesPromises = languages.map(async (language) => {
      const url = new URL(`${TMDB_BASE_URL}/discover/tv`);
      url.searchParams.append('api_key', TMDB_API_KEY);
      url.searchParams.append('language', 'en-US');
      url.searchParams.append('sort_by', 'popularity.desc,vote_average.desc');
      url.searchParams.append('include_adult', 'false');
      url.searchParams.append('page', page.toString());
      url.searchParams.append('with_original_language', language);
      
      if (yearRange) {
        url.searchParams.append('first_air_date.gte', `${yearRange[0]}-01-01`);
        url.searchParams.append('first_air_date.lte', `${yearRange[1]}-12-31`);
      }

      if (userGenres.length > 0) {
        const genreIds = userGenres
          .map(genre => TV_GENRE_IDS[genre])
          .filter(Boolean);
        url.searchParams.append('with_genres', genreIds.join('|'));
      }

      const response = await fetch(url.toString());
      const data = await response.json();
      
      return (data.results || []).map((show: any) => ({
        ...show,
        language
      }));
    });

    const allSeriesArrays = await Promise.all(seriesPromises);
    const allSeries = allSeriesArrays.flat().sort((a, b) => {
      // Sort by popularity first
      const popularityDiff = b.popularity - a.popularity;
      if (Math.abs(popularityDiff) > 1) return popularityDiff;
      // If popularity is similar, sort by rating
      return b.vote_average - a.vote_average;
    });

    const series = allSeries
      .filter(show => {
        const hasValidPoster = !!show.poster_path;
        const hasValidTitle = !!show.name;
        const isCorrectLanguage = languages.includes(show.original_language);
        const isInYearRange = !yearRange || (
          new Date(show.first_air_date).getFullYear() >= yearRange[0] &&
          new Date(show.first_air_date).getFullYear() <= yearRange[1]
        );
        return hasValidPoster && hasValidTitle && isCorrectLanguage && isInYearRange;
      })
      .map(show => ({
        id: show.id,
        title: show.name,
        overview: show.overview || '',
        posterPath: show.poster_path,
        releaseDate: show.first_air_date || '',
        voteAverage: show.vote_average || 0,
        genres: (show.genre_ids || [])
          .map(id => TV_GENRE_NAMES[id])
          .filter(Boolean),
        type: 'series' as const,
        language: show.language
      }));

    return {
      results: series,
      total_pages: Math.ceil(series.length / 20)
    };
  } catch (error) {
    console.error('[TMDB] Error fetching TV series:', error);
    return { results: [], total_pages: 0 };
  }
}

const GENRE_IDS: { [key: string]: number } = {
  'Action': 28,
  'Adventure': 12,
  'Comedy': 35,
  'Drama': 18,
  'Fantasy': 14,
  'Horror': 27,
  'Mystery': 9648,
  'Romance': 10749,
  'Sci-Fi': 878,
  'Thriller': 53,
  'Family': 10751
};

const TV_GENRE_IDS: { [key: string]: number } = {
  'Action': 10759,
  'Adventure': 10759,
  'Comedy': 35,
  'Drama': 18,
  'Fantasy': 10765,
  'Horror': 9648,
  'Mystery': 9648,
  'Romance': 10749,
  'Sci-Fi': 10765,
  'Thriller': 80,
  'Family': 10751
};

const GENRE_NAMES: { [key: number]: string } = {
  28: 'Action',
  12: 'Adventure',
  35: 'Comedy',
  18: 'Drama',
  14: 'Fantasy',
  27: 'Horror',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  53: 'Thriller',
  10751: 'Family',
  10759: 'Action & Adventure',
  10765: 'Sci-Fi & Fantasy',
  80: 'Crime'
};

const TV_GENRE_NAMES: { [key: number]: string } = {
  10759: 'Action & Adventure',
  35: 'Comedy',
  18: 'Drama',
  10765: 'Sci-Fi & Fantasy',
  9648: 'Mystery',
  10749: 'Romance',
  80: 'Thriller',
  10751: 'Family'
};