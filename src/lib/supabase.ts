import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Simple Supabase client configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

// Simple function to get current user
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    // Only log unexpected errors, not the expected "Auth session missing!" message
    if (error.message !== 'Auth session missing!') {
      console.error('Error getting current user:', error);
    }
    return null;
  }
  
  return user;
}

// Simple function to sign up
export async function signUp(email: string, password: string, name: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name
        }
      }
    });
    
    if (error) throw error;
    return { user: data.user, error: null };
  } catch (error) {
    return { user: null, error };
  }
}

// Simple function to sign in
export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    return { user: data.user, error: null };
  } catch (error) {
    return { user: null, error };
  }
}

// Simple function to sign out
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error };
  }
}

// Function to save user preferences
export async function saveUserPreferences(name: string, preferences: any) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

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
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

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