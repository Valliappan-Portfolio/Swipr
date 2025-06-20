import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
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
    const { error } = await supabase.from('anonymous_preferences').select('count').limit(1);
    return !error;
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    return false;
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
      // Test basic network connectivity
      const response = await fetch('https://httpbin.org/get', { 
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      networkConnectivity = response.ok;
      
      if (networkConnectivity) {
        // Test Supabase auth service
        authServiceReachable = await testSupabaseConnection();
        if (!authServiceReachable) {
          issue = 'Supabase service unreachable';
        }
      } else {
        issue = 'No internet connection';
      }
    } catch (err: any) {
      error = err.message;
      if (err.name === 'TimeoutError') {
        issue = 'Connection timeout';
      } else {
        issue = 'Network error';
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
  // Try Supabase first
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('anonymous_preferences')
        .insert([{ name, preferences }])
        .select()
        .single();

      if (!error && data) {
        return data.id;
      }
    } catch (error) {
      console.error('Failed to save preferences to Supabase:', error);
    }
  }

  // Fallback to local storage
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
  // Try Supabase first
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
          console.error('Failed to save to movie_actions:', movieActionError);
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
        return; // Success with Supabase
      }
    } catch (error) {
      console.error('Failed to save movie action to Supabase:', error);
    }
  }

  // Fallback to local storage
  const localActions = JSON.parse(localStorage.getItem('local_movie_actions') || '[]');
  localActions.push({
    preference_id: preferenceId,
    movie_id: movieId,
    action,
    genres,
    language,
    created_at: new Date().toISOString()
  });
  
  localStorage.setItem('local_movie_actions', JSON.stringify(localActions));
}