import { supabase } from './supabase';

export interface DetailedUserMatch {
  userId: string;
  username?: string;
  similarityScore: number;
  commonLikes: Array<{ movieId: number; title?: string }>;
  commonDislikes: Array<{ movieId: number; title?: string }>;
  theyLikedButYouHavent: Array<{ movieId: number; title?: string }>;
}

export interface DetailedMovieRecommendation {
  movieId: number;
  movieTitle: string;
  contentScore: number;
  userBasedScore: number;
  itemItemScore: number;
  totalScore: number;

  // Detailed breakdowns
  contentReasons: string[];

  // User-based details
  similarUsersWhoLiked: Array<{
    userId: string;
    username?: string;
    similarity: number;
    theirLikes: string[]; // Movie titles they liked that you also liked
  }>;

  // Item-item details
  associations: Array<{
    yourLikedMovie: string;
    associationStrength: number;
    coWatchCount: number; // How many users liked both
  }>;
}

/**
 * Get detailed analysis of why a movie is recommended
 * This is for internal understanding - showing ACTUAL user data
 */
export async function getDetailedRecommendationAnalysis(
  currentUserId: string,
  targetMovieId: number,
  targetMovieTitle: string
): Promise<DetailedMovieRecommendation | null> {
  if (!supabase) return null;

  try {
    const result: DetailedMovieRecommendation = {
      movieId: targetMovieId,
      movieTitle: targetMovieTitle,
      contentScore: 0,
      userBasedScore: 0,
      itemItemScore: 0,
      totalScore: 0,
      contentReasons: [],
      similarUsersWhoLiked: [],
      associations: []
    };

    // 1. Get current user's liked movies
    const { data: currentUserLikes } = await supabase
      .from('anonymous_actions')
      .select('movie_id, movie_title')
      .eq('user_id', currentUserId)
      .eq('action', 'like');

    if (!currentUserLikes || currentUserLikes.length === 0) {
      return null;
    }

    const currentUserLikedIds = currentUserLikes.map(l => l.movie_id);

    // 2. USER-BASED: Find users who liked similar movies
    const { data: similarUserActions } = await supabase
      .from('anonymous_actions')
      .select('user_id, movie_id, action')
      .in('movie_id', currentUserLikedIds)
      .neq('user_id', currentUserId);

    if (similarUserActions && similarUserActions.length > 0) {
      // Group by user
      const userMatches = new Map<string, { likes: number[]; total: number }>();

      similarUserActions.forEach(action => {
        if (!userMatches.has(action.user_id)) {
          userMatches.set(action.user_id, { likes: [], total: 0 });
        }
        const match = userMatches.get(action.user_id)!;
        match.total++;
        if (action.action === 'like') {
          match.likes.push(action.movie_id);
        }
      });

      // Find which of these users liked the target movie
      const { data: targetLikers } = await supabase
        .from('anonymous_actions')
        .select('user_id')
        .eq('movie_id', targetMovieId)
        .eq('action', 'like')
        .in('user_id', Array.from(userMatches.keys()));

      if (targetLikers && targetLikers.length > 0) {
        for (const liker of targetLikers) {
          const match = userMatches.get(liker.user_id);
          if (match && match.likes.length >= 2) { // At least 2 common likes
            const similarity = match.likes.length / currentUserLikedIds.length;

            // Get the actual movie titles they both liked
            const commonMovieTitles = currentUserLikes
              .filter(l => match.likes.includes(l.movie_id))
              .map(l => l.movie_title || `Movie ${l.movie_id}`)
              .slice(0, 5); // Show max 5

            result.similarUsersWhoLiked.push({
              userId: liker.user_id.substring(0, 8) + '...', // Anonymize
              similarity: Math.round(similarity * 100),
              theirLikes: commonMovieTitles
            });
          }
        }
      }
    }

    // 3. ITEM-ITEM: Find association patterns
    for (const likedMovie of currentUserLikes.slice(0, 10)) { // Check top 10 liked movies
      // Find users who liked this movie
      const { data: coWatchers } = await supabase
        .from('anonymous_actions')
        .select('user_id')
        .eq('movie_id', likedMovie.movie_id)
        .eq('action', 'like');

      if (!coWatchers || coWatchers.length === 0) continue;

      const coWatcherIds = coWatchers.map(c => c.user_id);

      // Check how many of them also liked the target
      const { data: alsoLikedTarget } = await supabase
        .from('anonymous_actions')
        .select('user_id')
        .eq('movie_id', targetMovieId)
        .eq('action', 'like')
        .in('user_id', coWatcherIds);

      if (alsoLikedTarget && alsoLikedTarget.length > 0) {
        const strength = alsoLikedTarget.length / coWatchers.length;

        result.associations.push({
          yourLikedMovie: likedMovie.movie_title || `Movie ${likedMovie.movie_id}`,
          associationStrength: Math.round(strength * 100),
          coWatchCount: alsoLikedTarget.length
        });
      }
    }

    // Sort by strength
    result.associations.sort((a, b) => b.associationStrength - a.associationStrength);
    result.associations = result.associations.slice(0, 5); // Top 5

    return result;
  } catch (error) {
    console.error('Error getting detailed analysis:', error);
    return null;
  }
}

/**
 * Get detailed breakdown of similar users
 */
export async function getDetailedUserMatches(
  currentUserId: string
): Promise<DetailedUserMatch[]> {
  if (!supabase) return [];

  try {
    // Get current user's actions
    const { data: currentUserActions } = await supabase
      .from('anonymous_actions')
      .select('movie_id, action, movie_title')
      .eq('user_id', currentUserId);

    if (!currentUserActions || currentUserActions.length === 0) {
      return [];
    }

    const currentUserMovieIds = currentUserActions.map(a => a.movie_id);
    const currentUserLikes = currentUserActions.filter(a => a.action === 'like').map(a => a.movie_id);

    // Find other users who interacted with same movies
    const { data: otherUserActions } = await supabase
      .from('anonymous_actions')
      .select('user_id, movie_id, action, movie_title')
      .in('movie_id', currentUserMovieIds)
      .neq('user_id', currentUserId);

    if (!otherUserActions || otherUserActions.length === 0) {
      return [];
    }

    // Group by user
    const userMatches = new Map<string, DetailedUserMatch>();

    otherUserActions.forEach(action => {
      if (!userMatches.has(action.user_id)) {
        userMatches.set(action.user_id, {
          userId: action.user_id.substring(0, 8) + '...',
          similarityScore: 0,
          commonLikes: [],
          commonDislikes: [],
          theyLikedButYouHavent: []
        });
      }

      const match = userMatches.get(action.user_id)!;
      const currentUserAction = currentUserActions.find(a => a.movie_id === action.movie_id);

      if (currentUserAction) {
        if (currentUserAction.action === 'like' && action.action === 'like') {
          match.commonLikes.push({
            movieId: action.movie_id,
            title: action.movie_title || undefined
          });
        } else if (currentUserAction.action === 'pass' && action.action === 'pass') {
          match.commonDislikes.push({
            movieId: action.movie_id,
            title: action.movie_title || undefined
          });
        }
      }
    });

    // Calculate similarity scores and get their unique likes
    const results: DetailedUserMatch[] = [];

    for (const [userId, match] of userMatches.entries()) {
      const commonMovies = match.commonLikes.length + match.commonDislikes.length;
      if (commonMovies >= 3) { // At least 3 common movies
        const agreements = match.commonLikes.length + match.commonDislikes.length;
        match.similarityScore = Math.round((agreements / commonMovies) * 100);

        // Get what they liked that current user hasn't seen
        const { data: theirLikes } = await supabase
          .from('anonymous_actions')
          .select('movie_id, movie_title')
          .eq('user_id', userId)
          .eq('action', 'like')
          .not('movie_id', 'in', `(${currentUserMovieIds.join(',')})`);

        if (theirLikes) {
          match.theyLikedButYouHavent = theirLikes.map(l => ({
            movieId: l.movie_id,
            title: l.movie_title || undefined
          })).slice(0, 10);
        }

        results.push(match);
      }
    }

    return results.sort((a, b) => b.similarityScore - a.similarityScore);
  } catch (error) {
    console.error('Error getting user matches:', error);
    return [];
  }
}
