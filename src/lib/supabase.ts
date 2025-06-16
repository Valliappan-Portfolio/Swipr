import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Present' : 'Missing');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Present' : 'Missing');
}

// Create a single, shared client with proper configuration
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      },
      global: {
        fetch: (url, options = {}) => {
          console.log('Supabase fetch request:', url);
          return fetch(url, {
            ...options,
            headers: {
              ...options.headers,
            }
          }).catch(error => {
            console.error('Supabase fetch error:', error);
            throw error;
          });
        }
      }
    })
  : null;

// Helper function to test Supabase connection
export async function testSupabaseConnection() {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return false;
  }

  try {
    console.log('Testing Supabase connection...');
    
    // Use a more reliable connection test that doesn't depend on specific tables
    // This tests the basic auth service connectivity
    const { data, error } = await supabase.auth.getSession();
    
    if (error && error.message.includes('fetch')) {
      console.error('Supabase connection test failed - network error:', error);
      return false;
    }
    
    console.log('Supabase connection test successful');
    return true;
  } catch (error) {
    console.error('Supabase connection test error:', error);
    return false;
  }
}

// Helper function to get stored preference ID
export function getStoredPreferenceId(): string | null {
  return localStorage.getItem('preferenceId');
}

// Helper function to store preference ID
export function storePreferenceId(id: string) {
  localStorage.setItem('preferenceId', id);
}

// Helper function to get or create anonymous preferences
export async function getOrCreatePreferences(name: string, preferences: any) {
  if (!supabase) return null;

  try {
    // Check for existing stored ID
    const storedId = getStoredPreferenceId();
    
    if (storedId) {
      // Try to get existing preferences
      const { data: existing } = await supabase
        .from('anonymous_preferences')
        .select('*')
        .eq('id', storedId)
        .single();

      if (existing) {
        // Update last active timestamp
        await supabase
          .from('anonymous_preferences')
          .update({ last_active: new Date().toISOString() })
          .eq('id', storedId);
          
        return storedId;
      }
    }

    // Create new anonymous preferences
    const { data, error } = await supabase
      .from('anonymous_preferences')
      .insert({
        name,
        languages: preferences.languages,
        content_type: preferences.contentType,
        series_type: preferences.seriesType,
        genres: preferences.genres
      })
      .select()
      .single();

    if (error) throw error;
    
    // Store the new ID
    if (data) {
      storePreferenceId(data.id);
      return data.id;
    }
    
    return null;
  } catch (error) {
    console.error('Error with preferences:', error);
    return null;
  }
}

// Helper function to save movie action
export async function saveMovieAction(
  preferenceId: string,
  movieId: number,
  action: 'like' | 'pass' | 'unwatched',
  genres: string[],
  language: string
) {
  if (!supabase || !preferenceId) return;

  try {
    await supabase.from('anonymous_actions').insert({
      preference_id: preferenceId,
      movie_id: movieId,
      action,
      genres,
      language
    });
  } catch (error) {
    console.error('Error saving movie action:', error);
  }
}

// Helper function to load existing preferences
export async function loadExistingPreferences() {
  if (!supabase) return null;

  const storedId = getStoredPreferenceId();
  if (!storedId) return null;

  try {
    const { data, error } = await supabase
      .from('anonymous_preferences')
      .select('*')
      .eq('id', storedId)
      .single();

    if (error) throw error;
    
    if (data) {
      return {
        name: data.name,
        preferences: {
          languages: data.languages,
          contentType: data.content_type,
          seriesType: data.series_type,
          genres: data.genres
        }
      };
    }

    return null;
  } catch (error) {
    console.error('Error loading preferences:', error);
    return null;
  }
}