import { supabase } from './supabase';

// Add image size constants
const POSTER_SIZES = {
  THUMBNAIL: 'w92',
  SMALL: 'w154',
  MEDIUM: 'w342',
  LARGE: 'w500'
} as const;

// Update image URL generation with progressive loading
export function getPosterUrl(path: string, size: keyof typeof POSTER_SIZES = 'MEDIUM') {
  return `https://image.tmdb.org/t/p/${POSTER_SIZES[size]}${path}`;
}

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

if (!TMDB_API_KEY) {
  console.error('TMDB API key is missing! Check your .env file');
  throw new Error('Missing TMDB API key');
}

// Language display names
export const LANGUAGE_NAMES: { [key: string]: string } = {
  en: 'English',
  hi: 'Hindi',
  ta: 'Tamil',
  te: 'Telugu',
  ml: 'Malayalam'
};

// TMDB Genre IDs mapping
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

// TV Series Genre IDs (some differ from movie genres)
const TV_GENRE_IDS: { [key: string]: number } = {
  'Action': 10759, // Action & Adventure
  'Adventure': 10759,
  'Comedy': 35,
  'Drama': 18,
  'Fantasy': 10765, // Sci-Fi & Fantasy
  'Horror': 9648,  // Using Mystery for TV since Horror isn't a direct category
  'Mystery': 9648,
  'Romance': 10749,
  'Sci-Fi': 10765,
  'Thriller': 80,   // Using Crime for TV since Thriller isn't a direct category
  'Family': 10751
};

// Reverse mapping for genre names
const GENRE_NAMES: { [key: number]: string } = {
  ...Object.entries(GENRE_IDS).reduce((acc, [name, id]) => ({ ...acc, [id]: name }), {}),
  10759: 'Action & Adventure',
  10765: 'Sci-Fi & Fantasy',
  80: 'Crime'
};

async function fetchWithRetry(url: string, retries = 3, delay = 1000): Promise<Response> {
  let lastError: Error | null = null;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        return new Response(JSON.stringify(data), {
          status: response.status,
          headers: response.headers
        });
      }

      if (response.status === 404) {
        console.warn(`[TMDB] Resource not found: ${url}`);
        return new Response(JSON.stringify({ results: [] }), { status: 200 });
      }
      
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '5');
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }

      throw new Error(`HTTP error! status: ${response.status}`);
    } catch (error) {
      lastError = error as Error;
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }

  throw lastError || new Error('Failed to fetch after retries');
}

export async function getMovies(
  page = 1, 
  languages: string[] = ['en'], 
  userGenres: string[] = [], 
  specificMovieId?: number,
  trending = false
) {
  try {
    const baseUrl = trending 
      ? `${TMDB_BASE_URL}/trending/movie/week`
      : `${TMDB_BASE_URL}/discover/movie`;

    const genreIds = userGenres
      .map(genre => GENRE_IDS[genre])
      .filter(Boolean);

    // If a specific movie ID is provided, fetch that instead
    if (specificMovieId) {
      const url = new URL(`${TMDB_BASE_URL}/movie/${specificMovieId}`);
      url.searchParams.append('api_key', TMDB_API_KEY);
      url.searchParams.append('language', 'en-US');

      const response = await fetchWithRetry(url.toString());
      const movie = await response.json();

      if (!movie.id) return { results: [] };

      return {
        results: [{
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
          language: movie.original_language
        }]
      };
    }

    // Fetch movies for each language in parallel
    const moviePromises = languages.map(async (language) => {
      const url = new URL(baseUrl);
      url.searchParams.append('api_key', TMDB_API_KEY);
      url.searchParams.append('language', 'en-US');
      url.searchParams.append('sort_by', trending ? 'popularity.desc' : 'vote_average.desc');
      url.searchParams.append('include_adult', 'false');
      url.searchParams.append('page', page.toString());
      if (!trending) {
        url.searchParams.append('with_original_language', language);
        url.searchParams.append('vote_count.gte', '100');
        
        if (genreIds.length > 0) {
          url.searchParams.append('with_genres', genreIds.join('|'));
        }
      }

      const response = await fetchWithRetry(url.toString());
      const data = await response.json();
      
      return (data.results || []).map((movie: any) => ({
        ...movie,
        language
      }));
    });

    const allMoviesArrays = await Promise.all(moviePromises);
    const allMovies = allMoviesArrays.flat().sort((a, b) => {
      if (trending) {
        return b.popularity - a.popularity;
      }
      return b.vote_average - a.vote_average;
    });

    const movies = allMovies
      .filter(movie => {
        const hasValidPoster = !!movie.poster_path;
        const hasValidTitle = !!movie.title;
        const isCorrectLanguage = languages.includes(movie.original_language);
        return hasValidPoster && hasValidTitle && isCorrectLanguage;
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

    if (movies.length === 0 && genreIds.length > 0) {
      return getMovies(page, languages, []);
    }

    return {
      results: movies,
      total_pages: Math.ceil(movies.length / 20)
    };
  } catch (error) {
    console.error('[TMDB] Error fetching movies:', error);
    return { results: [], total_pages: 0 };
  }
}

export async function getTVSeries(page = 1, languages: string[] = ['en'], userGenres: string[] = []) {
  try {
    const genreIds = userGenres
      .map(genre => TV_GENRE_IDS[genre])
      .filter(Boolean)
      .filter((id, index, self) => self.indexOf(id) === index);

    const seriesPromises = languages.map(async (language) => {
      const url = new URL(`${TMDB_BASE_URL}/discover/tv`);
      url.searchParams.append('api_key', TMDB_API_KEY);
      url.searchParams.append('language', 'en-US');
      url.searchParams.append('sort_by', 'popularity.desc');
      url.searchParams.append('include_adult', 'false');
      url.searchParams.append('page', page.toString());
      url.searchParams.append('with_original_language', language);
      url.searchParams.append('with_status', 'Released');
      url.searchParams.append('with_type', 'Scripted');
      
      if (genreIds.length > 0) {
        url.searchParams.append('with_genres', genreIds.join('|'));
      }

      const response = await fetchWithRetry(url.toString());
      const data = await response.json();
      
      return (data.results || []).map((show: any) => ({
        ...show,
        language
      }));
    });

    const allSeriesArrays = await Promise.all(seriesPromises);
    const allSeries = allSeriesArrays.flat().sort(() => Math.random() - 0.5);

    const series = allSeries
      .filter(show => {
        const hasValidPoster = !!show.poster_path;
        const hasValidTitle = !!show.name;
        const isCorrectLanguage = languages.includes(show.original_language);
        return hasValidPoster && hasValidTitle && isCorrectLanguage;
      })
      .map(show => {
        const genres = (show.genre_ids || []).map(id => {
          if (id === 10759) return ['Action', 'Adventure'];
          if (id === 10765) return ['Fantasy', 'Sci-Fi'];
          if (id === 80) return ['Thriller'];
          if (id === 9648) return ['Mystery', 'Horror'];
          return [GENRE_NAMES[id]].filter(Boolean);
        }).flat();

        return {
          id: show.id,
          title: show.name,
          overview: show.overview || '',
          posterPath: show.poster_path,
          releaseDate: show.first_air_date || '',
          voteAverage: show.vote_average || 0,
          genres: Array.from(new Set(genres)),
          type: 'series' as const,
          language: show.language
        };
      });

    if (series.length === 0 && genreIds.length > 0) {
      return getTVSeries(page, languages, []);
    }

    return {
      results: series,
      total_pages: Math.ceil(series.length / 20)
    };
  } catch (error) {
    console.error('[TMDB] Error fetching TV series:', error);
    return { results: [], total_pages: 0 };
  }
}

export async function getWatchProviders(movieId: number, type: 'movie' | 'tv' = 'movie') {
  try {
    const url = new URL(`${TMDB_BASE_URL}/${type}/${movieId}/watch/providers`);
    url.searchParams.append('api_key', TMDB_API_KEY);

    const response = await fetchWithRetry(url.toString());
    const data = await response.json();
    
    return data.results || {};
  } catch (error) {
    console.error('[TMDB] Error fetching watch providers:', error);
    return {};
  }
}