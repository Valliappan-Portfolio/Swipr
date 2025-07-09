import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug logging for environment variables
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key exists:', !!supabaseAnonKey);
console.log('Supabase Anon Key length:', supabaseAnonKey?.length);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  throw new Error(`Invalid Supabase URL format: ${supabaseUrl}`);
}

// Simple Supabase client configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-web'
    }
  }
});

// Test connection function
export async function testConnection() {
  try {
    const { data, error } = await supabase.from('anonymous_preferences').select('*').limit(1);
    console.log('Supabase connection test result:', { data, error });
    return { success: !error, error };
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    return { success: false, error };
  }
}

// Function to save user preferences
export async function saveUserPreferences(name: string, preferences: any) {
  try {
    const { data, error } = await supabase
      .from('anonymous_preferences')
      .insert([{
        name,
        languages: preferences.languages,
        content_type: preferences.contentType,
        series_type: preferences.seriesType,
        genres: preferences.genres
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

// Function to save movie action
export async function saveMovieAction(
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

// Function to get stored preference ID
export function getStoredPreferenceId(): string | null {
  return localStorage.getItem('current_preference_id');
}

// Function to store preference ID
export function storePreferenceId(id: string) {
  localStorage.setItem('current_preference_id', id);
}