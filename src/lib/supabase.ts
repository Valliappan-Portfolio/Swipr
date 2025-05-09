import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a single, shared anonymous client
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

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