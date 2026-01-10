import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key exists:', !!supabaseAnonKey);
console.log('Supabase Anon Key length:', supabaseAnonKey?.length);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

try {
  new URL(supabaseUrl);
} catch (error) {
  throw new Error(`Invalid Supabase URL format: ${supabaseUrl}`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-web'
    }
  }
});

export async function testConnection() {
  try {
    const { data, error } = await supabase.from('anonymous_users').select('*').limit(1);
    console.log('Supabase connection test result:', { data, error });
    return { success: !error, error };
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    return { success: false, error };
  }
}

// New email-based authentication functions
export async function signUpUser(email: string, username: string) {
  try {
    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('anonymous_users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      return {
        user: null,
        error: new Error('Email already registered. Please login instead.'),
        exists: true
      };
    }

    // Check if username already exists
    const { data: existingUsername } = await supabase
      .from('anonymous_users')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (existingUsername) {
      return {
        user: null,
        error: new Error('Username already taken. Please choose another.'),
        exists: false
      };
    }

    // Create new user
    const { data: newUser, error: insertError } = await supabase
      .from('anonymous_users')
      .insert([{ email, username }])
      .select()
      .single();

    if (insertError) throw insertError;

    console.log('✅ New user created:', { email, username });

    return {
      user: newUser,
      error: null,
      exists: false
    };
  } catch (error) {
    console.error('Error signing up user:', error);
    return { user: null, error, exists: false };
  }
}

export async function loginUser(email: string) {
  try {
    const { data: user, error: fetchError } = await supabase
      .from('anonymous_users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!user) {
      return {
        user: null,
        error: new Error('Email not found. Please sign up first.'),
        notFound: true
      };
    }

    // Update last_seen
    await supabase
      .from('anonymous_users')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', user.id);

    console.log('✅ User logged in:', { email, username: user.username });

    return {
      user,
      error: null,
      notFound: false
    };
  } catch (error) {
    console.error('Error logging in user:', error);
    return { user: null, error, notFound: false };
  }
}

// Legacy function - kept for backwards compatibility
export async function getOrCreateUser(username: string) {
  try {
    const { data: existingUser, error: fetchError } = await supabase
      .from('anonymous_users')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (existingUser) {
      await supabase
        .from('anonymous_users')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', existingUser.id);

      return {
        user: existingUser,
        error: null,
        isNewUser: false
      };
    }

    const { data: newUser, error: insertError } = await supabase
      .from('anonymous_users')
      .insert([{ username }])
      .select()
      .single();

    if (insertError) throw insertError;

    return {
      user: newUser,
      error: null,
      isNewUser: true
    };
  } catch (error) {
    console.error('Error getting or creating user:', error);
    return { user: null, error, isNewUser: false };
  }
}

export async function getUserPreferences(userId: string) {
  try {
    const { data, error } = await supabase
      .from('anonymous_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      return {
        name: data.name,
        preferences: {
          languages: data.languages || ['en'],
          contentType: data.content_type || 'both',
          seriesType: data.series_type || 'both',
          genres: data.genres || [],
          yearRange: data.year_range || [1900, new Date().getFullYear()]
        },
        preferenceId: data.id
      };
    }

    return null;
  } catch (error) {
    console.error('Error loading preferences:', error);
    return null;
  }
}

export async function saveUserPreferences(userId: string, name: string, preferences: any) {
  try {
    const { data: existingPrefs } = await supabase
      .from('anonymous_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingPrefs) {
      const { data, error } = await supabase
        .from('anonymous_preferences')
        .update({
          name,
          languages: preferences.languages,
          content_type: preferences.contentType,
          series_type: preferences.seriesType,
          genres: preferences.genres,
          year_range: preferences.yearRange
        })
        .eq('id', existingPrefs.id)
        .select()
        .single();

      if (error) throw error;
      return data.id;
    }

    const { data, error } = await supabase
      .from('anonymous_preferences')
      .insert([{
        user_id: userId,
        name,
        languages: preferences.languages,
        content_type: preferences.contentType,
        series_type: preferences.seriesType,
        genres: preferences.genres,
        year_range: preferences.yearRange
      }])
      .select()
      .single();

    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('Error saving preferences:', error);
    throw error;
  }
}

export async function saveMovieAction(
  userId: string,
  preferenceId: string,
  movieId: number,
  action: string,
  genres: string[],
  language: string,
  movieTitle?: string,
  releaseYear?: number,
  rating?: number,
  director?: string
) {
  try {
    const { error } = await supabase
      .from('anonymous_actions')
      .insert([{
        user_id: userId,
        preference_id: preferenceId,
        movie_id: movieId,
        action,
        genres,
        language,
        movie_title: movieTitle,
        release_year: releaseYear,
        rating,
        director
      }]);

    if (error) throw error;
  } catch (error) {
    console.error('Error saving movie action:', error);
    throw error;
  }
}

export function getStoredUserId(): string | null {
  return localStorage.getItem('current_user_id');
}

export function storeUserId(id: string) {
  localStorage.setItem('current_user_id', id);
}

export function getStoredUsername(): string | null {
  return localStorage.getItem('current_username');
}

export function storeUsername(username: string) {
  localStorage.setItem('current_username', username);
}

export function getStoredEmail(): string | null {
  return localStorage.getItem('current_email');
}

export function storeEmail(email: string) {
  localStorage.setItem('current_email', email);
}

export function getStoredPreferenceId(): string | null {
  return localStorage.getItem('current_preference_id');
}

export function storePreferenceId(id: string) {
  localStorage.setItem('current_preference_id', id);
}

// Watchlist functions
export async function addToWatchlist(userId: string, preferenceId: string | null, movie: any) {
  try {
    const { error } = await supabase
      .from('anonymous_watchlist')
      .insert([{
        user_id: userId,
        preference_id: preferenceId,
        movie_id: movie.id,
        movie_title: movie.title,
        movie_overview: movie.overview,
        movie_poster_path: movie.posterPath,
        movie_release_date: movie.releaseDate,
        movie_vote_average: movie.voteAverage,
        movie_genres: movie.genres,
        movie_type: movie.type,
        movie_language: movie.language
      }]);

    if (error) {
      // Ignore duplicate errors (user already has this in watchlist)
      if (error.code === '23505') {
        console.log('Movie already in watchlist');
        return;
      }
      throw error;
    }

    console.log('✅ Added to watchlist:', movie.title);
  } catch (error) {
    console.error('Error adding to watchlist:', error);
    throw error;
  }
}

export async function getWatchlist(userId: string) {
  try {
    const { data, error } = await supabase
      .from('anonymous_watchlist')
      .select('*')
      .eq('user_id', userId)
      .order('added_at', { ascending: false });

    if (error) throw error;

    // Convert to Movie format
    return (data || []).map(item => ({
      id: item.movie_id,
      title: item.movie_title,
      overview: item.movie_overview || '',
      posterPath: item.movie_poster_path || '',
      releaseDate: item.movie_release_date || '',
      voteAverage: item.movie_vote_average || 0,
      genres: item.movie_genres || [],
      type: item.movie_type as 'movie' | 'series',
      language: item.movie_language
    }));
  } catch (error) {
    console.error('Error loading watchlist:', error);
    return [];
  }
}

export async function removeFromWatchlist(userId: string, movieId: number) {
  try {
    const { error } = await supabase
      .from('anonymous_watchlist')
      .delete()
      .eq('user_id', userId)
      .eq('movie_id', movieId);

    if (error) throw error;

    console.log('✅ Removed from watchlist:', movieId);
  } catch (error) {
    console.error('Error removing from watchlist:', error);
    throw error;
  }
}

// Seen Movies Tracking (prevents duplicates)
export async function markMovieAsSeen(userId: string, movieId: number) {
  try {
    const { error } = await supabase
      .from('seen_movies')
      .insert([{
        user_id: userId,
        movie_id: movieId
      }]);

    // Ignore duplicate errors (movie already marked as seen)
    if (error && !error.message.includes('unique')) {
      throw error;
    }
  } catch (error) {
    console.error('Error marking movie as seen:', error);
  }
}

export async function getSeenMovies(userId: string): Promise<Set<number>> {
  try {
    const { data, error } = await supabase
      .from('seen_movies')
      .select('movie_id')
      .eq('user_id', userId);

    if (error) throw error;

    return new Set(data?.map(row => row.movie_id) || []);
  } catch (error) {
    console.error('Error getting seen movies:', error);
    return new Set();
  }
}

export async function removeSeenMovie(userId: string, movieId: number) {
  try {
    const { error} = await supabase
      .from('seen_movies')
      .delete()
      .eq('user_id', userId)
      .eq('movie_id', movieId);

    if (error) throw error;
  } catch (error) {
    console.error('Error removing seen movie:', error);
  }
}

/**
 * Get user's liked movies for TMDB recommendations
 * Returns the most recent liked movies with their details
 */
export async function getUserLikedMovies(userId: string, limit: number = 10) {
  try {
    const { data, error } = await supabase
      .from('anonymous_actions')
      .select('movie_id, movie_title, movie_type')
      .eq('user_id', userId)
      .eq('action', 'like')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(item => ({
      id: item.movie_id,
      type: item.movie_type as 'movie' | 'series',
      title: item.movie_title
    }));
  } catch (error) {
    console.error('Error getting liked movies:', error);
    return [];
  }
}