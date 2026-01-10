/**
 * OTT (Over-The-Top) Streaming Integration
 * Fetches and displays "Where to Watch" information for movies
 */

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export interface StreamingProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority: number;
}

export interface WatchProviders {
  flatrate?: StreamingProvider[]; // Subscription streaming (Netflix, Prime, etc.)
  rent?: StreamingProvider[]; // Rent options
  buy?: StreamingProvider[]; // Purchase options
  link?: string; // JustWatch link
}

export interface OTTAvailability {
  movieId: number;
  movieTitle: string;
  providers: WatchProviders | null;
  region: string;
}

/**
 * Fetch streaming availability for a movie
 * @param movieId - TMDB movie ID
 * @param region - ISO 3166-1 country code (default: US)
 */
export async function getStreamingAvailability(
  movieId: number,
  region: string = 'US'
): Promise<WatchProviders | null> {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${movieId}/watch/providers?api_key=${TMDB_API_KEY}`
    );

    if (!response.ok) {
      console.warn(`Failed to fetch streaming data for movie ${movieId}`);
      return null;
    }

    const data = await response.json();

    // Get region-specific providers
    const regionData = data.results?.[region];

    if (!regionData) {
      return null;
    }

    return {
      flatrate: regionData.flatrate || undefined,
      rent: regionData.rent || undefined,
      buy: regionData.buy || undefined,
      link: regionData.link || undefined
    };
  } catch (error) {
    console.error('Error fetching streaming availability:', error);
    return null;
  }
}

/**
 * Get popular streaming providers for display
 * Maps provider IDs to common names and icons
 */
export const POPULAR_PROVIDERS = {
  8: { name: 'Netflix', color: '#E50914', icon: '🎬' },
  9: { name: 'Amazon Prime', color: '#00A8E1', icon: '📺' },
  337: { name: 'Disney+', color: '#113CCF', icon: '🏰' },
  384: { name: 'HBO Max', color: '#B100E8', icon: '🎭' },
  15: { name: 'Hulu', color: '#1CE783', icon: '📡' },
  350: { name: 'Apple TV+', color: '#000000', icon: '🍎' },
  531: { name: 'Paramount+', color: '#0064FF', icon: '⭐' },
  387: { name: 'Peacock', color: '#000000', icon: '🦚' },
  1899: { name: 'Max', color: '#002BE7', icon: '🎬' },
  2: { name: 'Apple iTunes', color: '#000000', icon: '🍎' },
  3: { name: 'Google Play', color: '#EA4335', icon: '▶️' },
  10: { name: 'Amazon Video', color: '#00A8E1', icon: '📹' }
} as const;

/**
 * Get formatted provider name and icon
 */
export function getProviderInfo(providerId: number): { name: string; icon: string; color?: string } {
  const info = POPULAR_PROVIDERS[providerId as keyof typeof POPULAR_PROVIDERS];

  if (info) {
    return { name: info.name, icon: info.icon, color: info.color };
  }

  // Fallback for unknown providers
  return { name: `Provider ${providerId}`, icon: '📺' };
}

/**
 * Check if a movie is available on any popular streaming service
 */
export function hasStreamingAvailability(providers: WatchProviders | null): boolean {
  return !!(providers?.flatrate && providers.flatrate.length > 0);
}

/**
 * Get primary streaming provider (first in flatrate list)
 */
export function getPrimaryProvider(providers: WatchProviders | null): StreamingProvider | null {
  if (!providers?.flatrate || providers.flatrate.length === 0) {
    return null;
  }

  // Sort by display priority (lower is better)
  const sorted = [...providers.flatrate].sort((a, b) =>
    a.display_priority - b.display_priority
  );

  return sorted[0];
}

/**
 * Format provider list for display
 */
export function formatProviderList(providers: WatchProviders | null): string {
  if (!providers?.flatrate || providers.flatrate.length === 0) {
    return 'Not available for streaming';
  }

  const names = providers.flatrate
    .sort((a, b) => a.display_priority - b.display_priority)
    .slice(0, 3) // Show max 3 providers
    .map(p => getProviderInfo(p.provider_id).name);

  if (providers.flatrate.length > 3) {
    return `${names.join(', ')} +${providers.flatrate.length - 3} more`;
  }

  return names.join(', ');
}

/**
 * Batch fetch streaming availability for multiple movies
 */
export async function batchGetStreamingAvailability(
  movieIds: number[],
  region: string = 'US'
): Promise<Map<number, WatchProviders | null>> {
  const results = new Map<number, WatchProviders | null>();

  // Fetch in parallel with rate limiting (max 10 concurrent)
  const chunks: number[][] = [];
  for (let i = 0; i < movieIds.length; i += 10) {
    chunks.push(movieIds.slice(i, i + 10));
  }

  for (const chunk of chunks) {
    const promises = chunk.map(async (movieId) => {
      const providers = await getStreamingAvailability(movieId, region);
      results.set(movieId, providers);
    });

    await Promise.all(promises);

    // Small delay between chunks to respect API rate limits
    if (chunks.indexOf(chunk) < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}
