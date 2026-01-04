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
  ta: 'Tamil',
  de: 'German',
  es: 'Spanish',
  hi: 'Hindi',
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
      url.searchParams.append('vote_count.gte', '50'); // Reduced from 100 to 50 for more content

      if (yearRange) {
        // Add 2-year tolerance as requested
        const startYear = Math.max(1900, yearRange[0] - 2);
        const endYear = Math.min(new Date().getFullYear(), yearRange[1] + 2);
        url.searchParams.append('primary_release_date.gte', `${startYear}-01-01`);
        url.searchParams.append('primary_release_date.lte', `${endYear}-12-31`);
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
          new Date(movie.release_date).getFullYear() >= (yearRange[0] - 2) &&
          new Date(movie.release_date).getFullYear() <= (yearRange[1] + 2)
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
      total_pages: 500 // Increased to ensure more pages are available
    };
  } catch (error) {
    console.error('[TMDB] Error fetching movies:', error);
    return { results: [], total_pages: 0 };
  }
}

// Function to get top-rated movies for cold start (rating >= 8.5)
export async function getTopRatedMovies(languages: string[] = ['en']) {
  try {
    const moviePromises = languages.map(async (language) => {
      const url = new URL(`${TMDB_BASE_URL}/discover/movie`);
      url.searchParams.append('api_key', TMDB_API_KEY);
      url.searchParams.append('language', 'en-US');
      url.searchParams.append('sort_by', 'vote_average.desc');
      url.searchParams.append('include_adult', 'false');
      url.searchParams.append('vote_count.gte', '1000'); // Ensure popular movies with many votes
      url.searchParams.append('vote_average.gte', '8.0'); // Lowered from 8.5 to get more results
      url.searchParams.append('with_original_language', language);
      url.searchParams.append('page', '1');

      const response = await fetch(url.toString());
      const data = await response.json();

      return (data.results || []).map((movie: any) => ({
        ...movie,
        language
      }));
    });

    const allMoviesArrays = await Promise.all(moviePromises);
    const allMovies = allMoviesArrays.flat().sort((a, b) => {
      // Sort by rating first
      const ratingDiff = b.vote_average - a.vote_average;
      if (Math.abs(ratingDiff) > 0.1) return ratingDiff;
      // If rating is similar, sort by vote count
      return b.vote_count - a.vote_count;
    });

    const movies = allMovies
      .filter(movie => {
        const hasValidPoster = !!movie.poster_path;
        const hasValidTitle = !!movie.title;
        return hasValidPoster && hasValidTitle;
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

    console.log('🌟 Top-rated movies fetched:', {
      count: movies.length,
      topRatings: movies.slice(0, 5).map(m => ({ title: m.title, rating: m.voteAverage }))
    });

    return movies;
  } catch (error) {
    console.error('[TMDB] Error fetching top-rated movies:', error);
    return [];
  }
}

export async function getTopRatedSeries(languages: string[] = ['en']) {
  try {
    const seriesPromises = languages.map(async (language) => {
      const url = new URL(`${TMDB_BASE_URL}/discover/tv`);
      url.searchParams.append('api_key', TMDB_API_KEY);
      url.searchParams.append('language', 'en-US');
      url.searchParams.append('sort_by', 'vote_average.desc');
      url.searchParams.append('include_adult', 'false');
      url.searchParams.append('vote_count.gte', '500'); // Lower threshold for TV series
      url.searchParams.append('vote_average.gte', '8.0'); // Only highly rated
      url.searchParams.append('with_original_language', language);
      url.searchParams.append('page', '1');

      const response = await fetch(url.toString());
      const data = await response.json();

      return (data.results || []).map((show: any) => ({
        ...show,
        language
      }));
    });

    const allSeriesArrays = await Promise.all(seriesPromises);
    const allSeries = allSeriesArrays.flat().sort((a, b) => {
      // Sort by rating first
      const ratingDiff = b.vote_average - a.vote_average;
      if (Math.abs(ratingDiff) > 0.1) return ratingDiff;
      // If rating is similar, sort by vote count
      return b.vote_count - a.vote_count;
    });

    const series = allSeries
      .filter(show => {
        const hasValidPoster = !!show.poster_path;
        const hasValidTitle = !!show.name;
        return hasValidPoster && hasValidTitle;
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

    console.log('🌟 Top-rated series fetched:', {
      count: series.length,
      topRatings: series.slice(0, 5).map(s => ({ title: s.title, rating: s.voteAverage }))
    });

    return series;
  } catch (error) {
    console.error('[TMDB] Error fetching top-rated series:', error);
    return [];
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
        // Add 2-year tolerance as requested
        const startYear = Math.max(1900, yearRange[0] - 2);
        const endYear = Math.min(new Date().getFullYear(), yearRange[1] + 2);
        url.searchParams.append('first_air_date.gte', `${startYear}-01-01`);
        url.searchParams.append('first_air_date.lte', `${endYear}-12-31`);
      }

      if (userGenres.length > 0) {
        const genreIds = userGenres
          .map(genre => TV_GENRE_IDS[genre])
          .filter(Boolean);
        if (genreIds.length > 0) {
        url.searchParams.append('with_genres', genreIds.join('|'));
        }
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
          new Date(show.first_air_date).getFullYear() >= (yearRange[0] - 2) &&
          new Date(show.first_air_date).getFullYear() <= (yearRange[1] + 2)
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
      total_pages: 500 // Increased to ensure more pages are available
    };
  } catch (error) {
    console.error('[TMDB] Error fetching TV series:', error);
    return { results: [], total_pages: 0 };
  }
}

// Function to get detailed movie information including cast and crew
export async function getMovieDetails(movieId: number, type: 'movie' | 'tv' = 'movie') {
  try {
    const endpoint = type === 'movie' ? 'movie' : 'tv';
    const url = `${TMDB_BASE_URL}/${endpoint}/${movieId}?api_key=${TMDB_API_KEY}&append_to_response=credits,videos`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }
    
    return {
      id: data.id,
      title: type === 'movie' ? data.title : data.name,
      overview: data.overview,
      runtime: data.runtime || (data.episode_run_time && data.episode_run_time[0]),
      releaseDate: type === 'movie' ? data.release_date : data.first_air_date,
      voteAverage: data.vote_average,
      genres: data.genres?.map((g: any) => g.name) || [],
      cast: data.credits?.cast?.slice(0, 6).map((person: any) => ({
        id: person.id,
        name: person.name,
        character: person.character,
        profilePath: person.profile_path
      })) || [],
      crew: data.credits?.crew?.filter((person: any) => 
        ['Director', 'Producer', 'Writer'].includes(person.job)
      ).slice(0, 4).map((person: any) => ({
        id: person.id,
        name: person.name,
        job: person.job
      })) || [],
      videos: data.videos?.results?.filter((video: any) => 
        video.type === 'Trailer' && video.site === 'YouTube'
      ).slice(0, 1) || []
    };
  } catch (error) {
    console.error('[TMDB] Error fetching movie details:', error);
    return null;
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