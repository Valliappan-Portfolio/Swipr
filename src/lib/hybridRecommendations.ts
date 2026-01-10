import { supabase } from './supabase';
import { smartRecommendationEngine } from './smartRecommendations';
import type { Movie } from '../types';

interface CollaborativeData {
  similarUsers: string[];
  sharedLikes: number;
  sharedDislikes: number;
  collaborativeScore: number;
  explanation: string;
}

interface ItemItemData {
  coWatchedCount: number;
  associationStrength: number;
  explanation: string;
}

interface HybridScore {
  contentScore: number;
  userBasedScore: number;
  itemItemScore: number;
  totalScore: number;
  explanation: string[];
}

class HybridRecommendationEngine {
  private static instance: HybridRecommendationEngine;
  private userSimilarityCache: Map<string, Map<string, number>> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes
  private lastCacheUpdate: number = 0;

  static getInstance(): HybridRecommendationEngine {
    if (!HybridRecommendationEngine.instance) {
      HybridRecommendationEngine.instance = new HybridRecommendationEngine();
    }
    return HybridRecommendationEngine.instance;
  }

  /**
   * Calculate similarity between two users based on their movie preferences
   * Returns a score between 0 and 1
   */
  async calculateUserSimilarity(userId1: string, userId2: string): Promise<number> {
    if (!supabase) return 0;

    try {
      // Get actions for both users
      const [{ data: user1Actions }, { data: user2Actions }] = await Promise.all([
        supabase
          .from('anonymous_actions')
          .select('movie_id, action, genres')
          .eq('user_id', userId1),
        supabase
          .from('anonymous_actions')
          .select('movie_id, action, genres')
          .eq('user_id', userId2)
      ]);

      if (!user1Actions?.length || !user2Actions?.length) return 0;

      // Create maps for quick lookup
      const user1Movies = new Map(user1Actions.map(a => [a.movie_id, a.action]));
      const user2Movies = new Map(user2Actions.map(a => [a.movie_id, a.action]));

      // Find common movies and agreements
      let commonMovies = 0;
      let agreements = 0;
      let strongAgreements = 0; // Both liked

      user1Movies.forEach((action1, movieId) => {
        const action2 = user2Movies.get(movieId);
        if (action2) {
          commonMovies++;
          if (action1 === action2) {
            agreements++;
            if (action1 === 'like') {
              strongAgreements++;
            }
          }
        }
      });

      // Need at least 3 common movies to consider similarity
      if (commonMovies < 3) return 0;

      // Calculate similarity score (Jaccard-like coefficient with bonus for likes)
      const agreementRatio = agreements / commonMovies;
      const strongAgreementBonus = strongAgreements * 0.1;

      return Math.min(1, agreementRatio + strongAgreementBonus);
    } catch (error) {
      console.error('Error calculating user similarity:', error);
      return 0;
    }
  }

  /**
   * Find users similar to the current user
   */
  async findSimilarUsers(userId: string, minSimilarity: number = 0.3): Promise<Map<string, number>> {
    if (!supabase) return new Map();

    try {
      // Get all users who have made actions (excluding current user)
      const { data: otherUsers } = await supabase
        .from('anonymous_actions')
        .select('user_id')
        .neq('user_id', userId);

      if (!otherUsers?.length) return new Map();

      // Get unique user IDs
      const uniqueUserIds = [...new Set(otherUsers.map(u => u.user_id))];

      // Calculate similarity with each user
      const similarUsers = new Map<string, number>();

      for (const otherUserId of uniqueUserIds) {
        const similarity = await this.calculateUserSimilarity(userId, otherUserId);
        if (similarity >= minSimilarity) {
          similarUsers.set(otherUserId, similarity);
        }
      }

      console.log(`👥 Found ${similarUsers.size} similar users for user ${userId.slice(0, 8)}...`);

      return similarUsers;
    } catch (error) {
      console.error('Error finding similar users:', error);
      return new Map();
    }
  }

  /**
   * Get collaborative filtering score for a specific movie
   */
  async getCollaborativeScore(
    userId: string,
    movieId: number,
    similarUsers: Map<string, number>
  ): Promise<CollaborativeData> {
    if (!supabase || similarUsers.size === 0) {
      return {
        similarUsers: [],
        sharedLikes: 0,
        sharedDislikes: 0,
        collaborativeScore: 0,
        explanation: ''
      };
    }

    try {
      const similarUserIds = Array.from(similarUsers.keys());

      // Get actions from similar users for this movie
      const { data: actions } = await supabase
        .from('anonymous_actions')
        .select('user_id, action')
        .eq('movie_id', movieId)
        .in('user_id', similarUserIds);

      if (!actions?.length) {
        return {
          similarUsers: [],
          sharedLikes: 0,
          sharedDislikes: 0,
          collaborativeScore: 0,
          explanation: ''
        };
      }

      // Calculate weighted score based on user similarity
      let weightedScore = 0;
      let totalWeight = 0;
      let likesCount = 0;
      let dislikesCount = 0;
      const usersWhoInteracted: string[] = [];

      actions.forEach(action => {
        const similarity = similarUsers.get(action.user_id) || 0;
        usersWhoInteracted.push(action.user_id);

        if (action.action === 'like') {
          weightedScore += similarity * 1.0;
          likesCount++;
        } else if (action.action === 'unwatched') {
          weightedScore += similarity * 0.5;
        } else if (action.action === 'pass') {
          weightedScore += similarity * -0.5;
          dislikesCount++;
        }

        totalWeight += similarity;
      });

      const collaborativeScore = totalWeight > 0 ? weightedScore / totalWeight : 0;

      // Generate explanation
      let explanation = '';
      if (likesCount > 0) {
        explanation = `${likesCount} user${likesCount > 1 ? 's' : ''} with similar taste liked this`;
      }
      if (dislikesCount > 0) {
        explanation += explanation ? ` (${dislikesCount} passed)` : `${dislikesCount} similar user${dislikesCount > 1 ? 's' : ''} passed`;
      }

      return {
        similarUsers: usersWhoInteracted,
        sharedLikes: likesCount,
        sharedDislikes: dislikesCount,
        collaborativeScore: Math.max(-1, Math.min(1, collaborativeScore)),
        explanation
      };
    } catch (error) {
      console.error('Error getting collaborative score:', error);
      return {
        similarUsers: [],
        sharedLikes: 0,
        sharedDislikes: 0,
        collaborativeScore: 0,
        explanation: ''
      };
    }
  }

  /**
   * Item-Item Collaborative Filtering: "Users who liked Dark also liked Black Mirror"
   */
  async getItemItemScore(
    userId: string,
    targetMovieId: number
  ): Promise<ItemItemData> {
    if (!supabase) {
      return {
        coWatchedCount: 0,
        associationStrength: 0,
        explanation: ''
      };
    }

    try {
      // Get movies this user has liked
      const { data: userLikes } = await supabase
        .from('anonymous_actions')
        .select('movie_id')
        .eq('user_id', userId)
        .eq('action', 'like');

      if (!userLikes || userLikes.length === 0) {
        return {
          coWatchedCount: 0,
          associationStrength: 0,
          explanation: 'Not enough viewing history yet'
        };
      }

      const likedMovieIds = userLikes.map(l => l.movie_id);

      // For each movie user liked, find users who also liked the target movie
      const associationScores: number[] = [];

      for (const likedMovieId of likedMovieIds) {
        if (likedMovieId === targetMovieId) continue; // Skip if same movie

        // Find users who liked BOTH this movie AND the target
        const { data: coLikes } = await supabase
          .from('anonymous_actions')
          .select('user_id')
          .eq('movie_id', likedMovieId)
          .eq('action', 'like');

        if (!coLikes || coLikes.length === 0) continue;

        const coLikeUserIds = coLikes.map(c => c.user_id);

        // Check how many of these users also liked the target
        const { data: targetLikes } = await supabase
          .from('anonymous_actions')
          .select('user_id')
          .eq('movie_id', targetMovieId)
          .eq('action', 'like')
          .in('user_id', coLikeUserIds);

        if (targetLikes && targetLikes.length > 0) {
          // Association strength = users who liked both / users who liked first
          const strength = targetLikes.length / coLikes.length;
          associationScores.push(strength);
        }
      }

      if (associationScores.length === 0) {
        return {
          coWatchedCount: 0,
          associationStrength: 0,
          explanation: ''
        };
      }

      // Average association strength across all liked movies
      const avgStrength = associationScores.reduce((a, b) => a + b, 0) / associationScores.length;
      const coWatchedCount = associationScores.length;

      let explanation = '';
      if (coWatchedCount > 0) {
        explanation = `People who liked ${coWatchedCount} of your favorites also liked this`;
      }

      return {
        coWatchedCount,
        associationStrength: avgStrength,
        explanation
      };
    } catch (error) {
      console.error('Error getting item-item score:', error);
      return {
        coWatchedCount: 0,
        associationStrength: 0,
        explanation: ''
      };
    }
  }

  /**
   * Score a movie using hybrid approach (content-based + user-based + item-item)
   */
  async scoreMovieHybrid(
    movie: Movie,
    userId: string,
    similarUsers: Map<string, number>
  ): Promise<HybridScore> {
    // Get content-based score from smart engine (but remove base 0.5)
    let contentScore = smartRecommendationEngine.scoreMovie(movie);
    contentScore = Math.max(0, contentScore - 0.5); // Remove base, start at 0

    // Get user-based collaborative score
    const collaborativeData = await this.getCollaborativeScore(userId, movie.id, similarUsers);

    // Get item-item collaborative score
    const itemItemData = await this.getItemItemScore(userId, movie.id);

    // Combine scores with new weights:
    // Content-based: 30%
    // User-based collaborative: 40%
    // Item-item collaborative: 30%
    const contentWeight = 0.3;
    const userBasedWeight = 0.4;
    const itemItemWeight = 0.3;

    const userBasedScore = Math.max(0, collaborativeData.collaborativeScore);
    const itemItemScore = itemItemData.associationStrength;

    const totalScore =
      (contentScore * contentWeight) +
      (userBasedScore * userBasedWeight) +
      (itemItemScore * itemItemWeight);

    const explanation: string[] = [];

    // Add content-based explanation
    if (contentScore > 0) {
      explanation.push(`Your preferences match: ${(contentScore * 100).toFixed(0)}%`);
    }

    // Add user-based collaborative explanation
    if (collaborativeData.sharedLikes > 0 || collaborativeData.sharedDislikes > 0) {
      explanation.push(`👥 ${collaborativeData.explanation}`);
    }

    // Add item-item collaborative explanation
    if (itemItemData.coWatchedCount > 0) {
      explanation.push(`🎬 ${itemItemData.explanation}`);
    }

    if (explanation.length === 0) {
      explanation.push('Building your taste profile...');
    }

    return {
      contentScore,
      userBasedScore,
      itemItemScore,
      totalScore: Math.max(0, Math.min(1, totalScore)),
      explanation
    };
  }

  /**
   * Sort movies by hybrid score
   */
  async sortMoviesByHybridScore(
    movies: Movie[],
    userId: string
  ): Promise<Array<{ movie: Movie; score: number; collaborative: CollaborativeData }>> {
    // Find similar users (cache this)
    const similarUsers = await this.findSimilarUsers(userId);

    if (similarUsers.size === 0) {
      console.log('📊 No similar users found, using content-based only');
      // Fall back to content-based only
      return movies.map(movie => ({
        movie,
        score: smartRecommendationEngine.scoreMovie(movie),
        collaborative: {
          similarUsers: [],
          sharedLikes: 0,
          sharedDislikes: 0,
          collaborativeScore: 0,
          explanation: 'Building taste profile...'
        }
      }));
    }

    console.log(`🎯 Using hybrid recommendations with ${similarUsers.size} similar users`);

    // Score all movies with hybrid approach
    const scoredMovies = await Promise.all(
      movies.map(async movie => {
        const contentScore = smartRecommendationEngine.scoreMovie(movie);
        const collaborativeData = await this.getCollaborativeScore(movie.id, userId, similarUsers);

        // Combine: 70% content, 30% collaborative
        const hybridScore = (contentScore * 0.7) + (Math.max(0, collaborativeData.collaborativeScore) * 0.3);

        return {
          movie,
          score: hybridScore,
          collaborative: collaborativeData
        };
      })
    );

    return scoredMovies.sort((a, b) => b.score - a.score);
  }

  /**
   * Get session stats including collaborative filtering status
   */
  getHybridStats(userId: string) {
    const baseStats = smartRecommendationEngine.getSessionStats();

    return {
      ...baseStats,
      userId,
      hasCollaborativeData: false, // Will be updated when similar users are found
      similarUsersCount: 0
    };
  }
}

export const hybridRecommendationEngine = HybridRecommendationEngine.getInstance();
