import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Enhanced Supabase client with better error handling
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
      },
      global: {
        headers: {
          'X-Client-Info': 'what2watchnxt-web'
        }
      }
    })
  : null;

// Local user management for fallback authentication
const LOCAL_USER_KEY = 'local_user';
const LOCAL_PREFERENCES_KEY = 'local_preferences';

export interface LocalUser {
  id: string;
  email: string;
  name?: string;
  created_at: string;
  isLocal: true;
}

export function createLocalUser(email: string, name?: string): LocalUser {
  const localUser: LocalUser = {
    id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    email,
    name,
    created_at: new Date().toISOString(),
    isLocal: true
  };
  
  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(localUser));
  return localUser;
}

export function getLocalUser(): LocalUser | null {
  const stored = localStorage.getItem(LOCAL_USER_KEY);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function signOutLocal(): void {
  localStorage.removeItem(LOCAL_USER_KEY);
  localStorage.removeItem(LOCAL_PREFERENCES_KEY);
}

export async function testSupabaseConnection(): Promise<boolean> {
  if (!supabase) return false;
  
  try {
    // Use a simpler test that doesn't require specific tables
    const { data, error } = await supabase.auth.getSession();
    
    // If we can get session info without error, connection is working
    if (error && error.message.includes('fetch')) {
      return false;
    }
    
    // Additional test: try to access the auth endpoint directly
    const { error: healthError } = await supabase.auth.getUser();
    return !healthError || !healthError.message.includes('fetch');
    
  } catch (error: any) {
    console.error('Supabase connection test failed:', error);
    // Check if it's a network/fetch error specifically
    return !error.message?.includes('fetch') && !error.name?.includes('TypeError');
  }
}

export async function diagnoseConnection() {
  const envVarsPresent = !!(supabaseUrl && supabaseAnonKey);
  const urlFormat = supabaseUrl ? supabaseUrl.includes('supabase.co') : false;
  const clientInitialized = !!supabase;
  
  let networkConnectivity = false;
  let authServiceReachable = false;
  let issue = '';
  let error = '';

  if (!envVarsPresent) {
    issue = 'Missing environment variables';
  } else if (!urlFormat) {
    issue = 'Invalid Supabase URL format';
  } else if (!clientInitialized) {
    issue = 'Supabase client failed to initialize';
  } else {
    try {
      // Test basic network connectivity with a more reliable endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      try {
        const response = await fetch('https://api.github.com/zen', { 
          method: 'GET',
          signal: controller.signal,
          mode: 'cors'
        });
        clearTimeout(timeoutId);
        networkConnectivity = response.ok;
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          issue = 'Connection timeout';
        } else {
          networkConnectivity = false;
        }
      }
      
      if (networkConnectivity) {
        // Test Supabase auth service with better error handling
        try {
          authServiceReachable = await testSupabaseConnection();
          if (!authServiceReachable) {
            issue = 'Supabase service unreachable - possible CORS issue';
          }
        } catch (supabaseError: any) {
          authServiceReachable = false;
          if (supabaseError.message?.includes('fetch')) {
            issue = 'CORS policy blocking Supabase requests';
          } else {
            issue = 'Supabase authentication service error';
          }
          error = supabaseError.message;
        }
      } else {
        issue = 'No internet connection detected';
      }
    } catch (err: any) {
      error = err.message;
      if (err.name === 'AbortError') {
        issue = 'Connection timeout';
      } else if (err.message?.includes('fetch')) {
        issue = 'Network fetch error - check CORS settings';
      } else {
        issue = 'Network connectivity issue';
      }
    }
  }

  return {
    envVarsPresent,
    urlFormat,
    clientInitialized,
    networkConnectivity,
    authServiceReachable,
    issue,
    error
  };
}

export async function getOrCreatePreferences(name: string, preferences: any): Promise<string | null> {
  // Always try Supabase first for better algorithm performance
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('anonymous_preferences')
        .insert([{ name, preferences }])
        .select()
        .single();

      if (!error && data) {
        console.log('Preferences saved to Supabase successfully');
        return data.id;
      } else {
        console.warn('Failed to save to Supabase, falling back to local:', error);
      }
    } catch (error) {
      console.error('Supabase preferences save error:', error);
    }
  }

  // Fallback to local storage only if Supabase fails
  console.log('Using local storage for preferences');
  const localId = `local_pref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const localPreferences = {
    id: localId,
    name,
    preferences,
    created_at: new Date().toISOString()
  };
  
  localStorage.setItem(`${LOCAL_PREFERENCES_KEY}_${localId}`, JSON.stringify(localPreferences));
  localStorage.setItem('current_preference_id', localId);
  
  return localId;
}

export function getStoredPreferenceId(): string | null {
  return localStorage.getItem('current_preference_id');
}

export async function saveMovieAction(
  preferenceId: string,
  movieId: number,
  action: string,
  genres: number[],
  language: string,
  authUserId?: string
): Promise<void> {
  let supabaseSuccess = false;
  
  // Always prioritize Supabase for better algorithm performance
  if (supabase) {
    try {
      // Save to movie_actions table for authenticated users
      if (authUserId) {
        const { error: movieActionError } = await supabase
          .from('movie_actions')
          .insert([{
            user_id: authUserId,
            movie_id: movieId,
            action,
            genres,
            language
          }]);

        if (movieActionError) {
          console.warn('Failed to save to movie_actions:', movieActionError);
        } else {
          console.log('Movie action saved to authenticated user table');
        }
      }

      // Always save to anonymous_actions for recommendation engine
      const { error: anonymousActionError } = await supabase
        .from('anonymous_actions')
        .insert([{
          preference_id: preferenceId,
          movie_id: movieId,
          action,
          genres,
          language
        }]);

      if (!anonymousActionError) {
        console.log('Movie action saved to Supabase successfully');
        supabaseSuccess = true;
        return; // Success with Supabase
      } else {
        console.warn('Failed to save to anonymous_actions:', anonymousActionError);
      }
    } catch (error) {
      console.error('Supabase movie action save error:', error);
    }
  }

  // Only use local storage if Supabase completely fails
  if (!supabaseSuccess) {
    console.log('Falling back to local storage for movie action');
    const localActions = JSON.parse(localStorage.getItem('local_movie_actions') || '[]');
    localActions.push({
      preference_id: preferenceId,
      movie_id: movieId,
      action,
      genres,
      language,
      user_id: authUserId,
      created_at: new Date().toISOString()
    });
    
    localStorage.setItem('local_movie_actions', JSON.stringify(localActions));
  }
}

// Enhanced function to check current authentication status
export async function getCurrentUser() {
  if (!supabase) return null;
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Error getting current user:', error);
      return null;
    }
    return user;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}

// Function to handle authentication state changes
export function onAuthStateChange(callback: (user: any) => void) {
  if (!supabase) return () => {};
  
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, session?.user?.email);
    callback(session?.user || null);
  });
  
  return () => subscription.unsubscribe();
}