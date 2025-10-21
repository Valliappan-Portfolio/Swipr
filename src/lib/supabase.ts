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
  language: string
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
        language
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

export function getStoredPreferenceId(): string | null {
  return localStorage.getItem('current_preference_id');
}

export function storePreferenceId(id: string) {
  localStorage.setItem('current_preference_id', id);
}