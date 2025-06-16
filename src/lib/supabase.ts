import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Present' : 'Missing');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Present' : 'Missing');
}

// Validate URL format
if (supabaseUrl && !supabaseUrl.startsWith('https://') && !supabaseUrl.startsWith('http://')) {
  console.error('Invalid Supabase URL format. Must start with https:// or http://');
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
          console.log('Supabase fetch request to:', url);
          
          // Add timeout to prevent hanging requests
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
          
          return fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
              ...options.headers,
            }
          }).then(response => {
            clearTimeout(timeoutId);
            return response;
          }).catch(error => {
            clearTimeout(timeoutId);
            console.error('Supabase fetch error:', error);
            
            // Provide more specific error information
            if (error.name === 'AbortError') {
              throw new Error('Request timeout - please check your internet connection');
            } else if (error.message.includes('fetch')) {
              throw new Error('Network connection failed - please check your internet connection and try again');
            }
            
            throw error;
          });
        }
      }
    })
  : null;

// Enhanced connection test with better diagnostics
export async function testSupabaseConnection() {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return false;
  }

  try {
    console.log('Testing Supabase connection...');
    console.log('Supabase URL:', supabaseUrl);
    
    // Test auth service directly - this is sufficient to verify connectivity
    const { data, error } = await supabase.auth.getSession();
    
    if (error && error.message.includes('fetch')) {
      console.error('Supabase auth connection test failed - network error:', error);
      return false;
    }
    
    console.log('Supabase connection test successful');
    return true;
  } catch (error) {
    console.error('Supabase connection test error:', error);
    return false;
  }
}

// Helper function to diagnose connection issues
export async function diagnoseConnection() {
  const diagnostics = {
    envVarsPresent: !!(supabaseUrl && supabaseAnonKey),
    urlFormat: supabaseUrl ? supabaseUrl.startsWith('https://') || supabaseUrl.startsWith('http://') : false,
    clientInitialized: !!supabase,
    networkConnectivity: false,
    authServiceReachable: false
  };

  if (!diagnostics.envVarsPresent) {
    return { ...diagnostics, issue: 'Missing environment variables' };
  }

  if (!diagnostics.urlFormat) {
    return { ...diagnostics, issue: 'Invalid URL format' };
  }

  if (!diagnostics.clientInitialized) {
    return { ...diagnostics, issue: 'Client initialization failed' };
  }

  // Test basic network connectivity
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': supabaseAnonKey!,
        'Authorization': `Bearer ${supabaseAnonKey!}`
      }
    });
    diagnostics.networkConnectivity = true;
  } catch (error) {
    return { ...diagnostics, issue: 'Network connectivity failed', error: error.message };
  }

  // Test auth service
  try {
    await supabase!.auth.getSession();
    diagnostics.authServiceReachable = true;
  } catch (error) {
    return { ...diagnostics, issue: 'Auth service unreachable', error: error.message };
  }

  return { ...diagnostics, issue: null };
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