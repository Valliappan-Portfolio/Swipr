import { supabase } from './supabase';
import { getMovies, getTVSeries } from './tmdb';
import type { Movie, UserPreferences } from '../types';

interface UserProfile {
  id: string;
  preferences: UserPreferences;
  genreWeights: { [genre: string]: number };
  languageWeights: { [language: string]: number };
  yearPreferences: { [year: string]: number };
  actorPreferences: { [actor: string]: number };
  directorPreferences: { [director: string]: number };
  totalActions: number;
}

interface MovieFeatures {
  id: number;
  genres: string[];
  language: string;
  year: number;
  rating: number;
  popularity: number;
  actors?: string[];
  director?: string;
}

interface RecommendationScore {
  movie: Movie;
  score: number;
  reasons: string[];
  confidence: number;
}

class IntelligentRecommendationEngine {
  private userProfiles: Map<string, UserProfile> = new Map();
  private movieFeatures: Map<number, MovieFeatures> = new Map();
  private collaborativeMatrix: Map<string, Map<number, number>> = new Map();

  async initializeUserProfile(userId: string, preferences: UserPreferences): Promise<UserProfile> {
    if (!supabase) throw new Error('Supabase not initialized');

    // Get user's action history
    const { data: actions } = await supabase
      .from('anonymous_actions')
      .select('*')
      .eq('preference_id', userId);

    const profile: UserProfile = {
      id: userId,
      preferences,
      genreWeights: {},
      languageWeights: {},
      yearPreferences: {},
      actorPreferences: {},
      directorPreferences: {},
      totalActions: actions?.length || 0
    };

    if (actions) {
      // Calculate genre weights based on user actions
      actions.forEach(action => {
        const weight = this.getActionWeight(action.action);
        
        // Genre preferences
        if (action.genres) {
          action.genres.forEach((genre: string) => {
            profile.genreWeights[genre] = (profile.genreWeights[genre] || 0) + weight;
          });
        }

        // Language preferences
        if (action.language) {
          profile.languageWeights[action.language] = 
            (profile.languageWeights[action.language] || 0) + weight;
        }

        // Year preferences (extract from movie data)
        // This would be enhanced with actual movie release dates
      });

      // Normalize weights
      this.normalizeWeights(profile.genreWeights);
      this.normalizeWeights(profile.languageWeights);
    }

    this.userProfiles.set(userId, profile);
    return profile;
  }

  private getActionWeight(action: string): number {
    switch (action) {
      case 'like': return 3;
      case 'unwatched': return 1;
      case 'pass': return -1;
      default: return 0;
    }
  }

  private normalizeWeights(weights: { [key: string]: number }) {
    const total = Object.values(weights).reduce((sum, weight) => sum + Math.abs(weight), 0);
    if (total > 0) {
      Object.keys(weights).forEach(key => {
        weights[key] = weights[key] / total;
      });
    }
  }

  async getPersonalizedRecommendations(
    userId: string,
    preferences: UserPreferences,
    seenMovies: Set<number>,
    page: number = 1
  ): Promise<Movie[]> {
    try {
      // Initialize or get user profile
      let userProfile = this.userProfiles.get(userId);
      if (!userProfile) {
        userProfile = await this.initializeUserProfile(userId, preferences);
      }

      // Get candidate movies
      const candidates = await this.getCandidateMovies(preferences, seenMovies, page);
      
      // Score each movie
      const scoredMovies = await Promise.all(
        candidates.map(movie => this.scoreMovie(movie, userProfile!))
      );

      // Sort by score and apply diversity
      const recommendations = this.applyDiversityFilter(
        scoredMovies.sort((a, b) => b.score - a.score)
      );

      return recommendations.slice(0, 20).map(r => r.movie);
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
    return recommendations.slice(0, 50).map(r => r.movie); // Increased from 20 to 50
    }
  }

  private async getCandidateMovies(
    preferences: UserPreferences,
    seenMovies: Set<number>,
    page: number
  ): Promise<Movie[]> {
    let allMovies: Movie[] = [];

    // Fetch movies based on preferences
    if (preferences.contentType === 'movies' || preferences.contentType === 'both') {
      const movieResponse = await getMovies(page, preferences.languages, preferences.genres);
      if (movieResponse.results) {
        allMovies = [...allMovies, ...movieResponse.results];
      }
    }

    if (preferences.contentType === 'series' || preferences.contentType === 'both') {
      const seriesResponse = await getTVSeries(page, preferences.languages, preferences.genres);
      if (seriesResponse.results) {
        allMovies = [...allMovies, ...seriesResponse.results];
      }
    }

    // Filter out seen movies and ensure we have enough content
    if (allMovies.length < 10 && page < 5) {
      // Fetch more pages if we don't have enough content
      const nextPageMovies = await this.getCandidateMovies(preferences, seenMovies, page + 1);
      allMovies = [...allMovies, ...nextPageMovies];
    }
    return allMovies.filter(movie => !seenMovies.has(movie.id));
  }

  private async scoreMovie(movie: Movie, userProfile: UserProfile): Promise<RecommendationScore> {
    let score = 0;
    const reasons: string[] = [];
    let confidence = 0;

    // Genre matching (40% weight)
    const genreScore = this.calculateGenreScore(movie, userProfile);
    score += genreScore * 0.4;
    confidence += genreScore > 0.5 ? 0.3 : 0.1;
    if (genreScore > 0.5) {
      reasons.push(`Matches your taste in ${movie.genres.join(', ')}`);
    }

    // Language matching (20% weight)
    const languageScore = this.calculateLanguageScore(movie, userProfile);
    score += languageScore * 0.2;
    confidence += languageScore > 0.5 ? 0.2 : 0.05;
    if (languageScore > 0.5) {
      reasons.push(`In your preferred language`);
    }

    // Quality score (20% weight)
    const qualityScore = Math.min(movie.voteAverage / 10, 1);
    score += qualityScore * 0.2;
    if (movie.voteAverage > 7.5) {
      reasons.push(`Highly rated (${movie.voteAverage.toFixed(1)}/10)`);
    }

    // Popularity boost (10% weight)
    const popularityScore = Math.min(movie.voteAverage / 10, 1);
    score += popularityScore * 0.1;

    // Collaborative filtering (10% weight)
    const collaborativeScore = await this.getCollaborativeScore(movie.id, userProfile.id);
    score += collaborativeScore * 0.1;
    confidence += collaborativeScore > 0.3 ? 0.2 : 0;
    if (collaborativeScore > 0.3) {
      reasons.push('Users with similar taste liked this');
    }

    // Recency bonus for new releases
    const currentYear = new Date().getFullYear();
    const movieYear = new Date(movie.releaseDate).getFullYear();
    if (currentYear - movieYear <= 2) {
      score += 0.05;
      reasons.push('Recent release');
    }

    return {
      movie,
      score: Math.min(score, 1),
      reasons,
      confidence: Math.min(confidence, 1)
    };
  }

  private calculateGenreScore(movie: Movie, userProfile: UserProfile): number {
    if (!movie.genres.length) return 0;

    let totalWeight = 0;
    let matchedGenres = 0;

    movie.genres.forEach(genre => {
      const weight = userProfile.genreWeights[genre] || 0;
      totalWeight += Math.abs(weight);
      if (weight > 0) matchedGenres++;
    });

    // Penalize if user dislikes these genres
    const negativeWeight = movie.genres.reduce((sum, genre) => {
      const weight = userProfile.genreWeights[genre] || 0;
      return sum + (weight < 0 ? Math.abs(weight) : 0);
    }, 0);

    const positiveScore = totalWeight / movie.genres.length;
    return Math.max(0, positiveScore - negativeWeight);
  }

  private calculateLanguageScore(movie: Movie, userProfile: UserProfile): number {
    if (!movie.language) return 0.5; // Neutral if no language info

    const weight = userProfile.languageWeights[movie.language] || 0;
    return Math.max(0, weight);
  }

  private async getCollaborativeScore(movieId: number, userId: string): Promise<number> {
    if (!supabase) return 0;

    try {
      // Find users with similar preferences
      const { data: similarUsers } = await supabase
        .from('anonymous_actions')
        .select('preference_id')
        .eq('movie_id', movieId)
        .eq('action', 'like')
        .neq('preference_id', userId);

      if (!similarUsers?.length) return 0;

      // Calculate similarity with these users
      let totalSimilarity = 0;
      let userCount = 0;

      for (const user of similarUsers) {
        const similarity = await this.calculateUserSimilarity(userId, user.preference_id);
        if (similarity > 0.3) { // Only consider reasonably similar users
          totalSimilarity += similarity;
          userCount++;
        }
      }

      return userCount > 0 ? totalSimilarity / userCount : 0;
    } catch (error) {
      console.error('Error calculating collaborative score:', error);
      return 0;
    }
  }

  private async calculateUserSimilarity(userId1: string, userId2: string): Promise<number> {
    if (!supabase) return 0;

    try {
      // Get actions for both users
      const { data: user1Actions } = await supabase
        .from('anonymous_actions')
        .select('movie_id, action')
        .eq('preference_id', userId1);

      const { data: user2Actions } = await supabase
        .from('anonymous_actions')
        .select('movie_id, action')
        .eq('preference_id', userId2);

      if (!user1Actions?.length || !user2Actions?.length) return 0;

      // Find common movies
      const user1Movies = new Map(user1Actions.map(a => [a.movie_id, a.action]));
      const user2Movies = new Map(user2Actions.map(a => [a.movie_id, a.action]));

      let commonMovies = 0;
      let agreements = 0;

      user1Movies.forEach((action1, movieId) => {
        const action2 = user2Movies.get(movieId);
        if (action2) {
          commonMovies++;
          if (action1 === action2) {
            agreements++;
          }
        }
      });

      return commonMovies > 0 ? agreements / commonMovies : 0;
    } catch (error) {
      console.error('Error calculating user similarity:', error);
      return 0;
    }
  }

  private applyDiversityFilter(recommendations: RecommendationScore[]): RecommendationScore[] {
    const diverseRecs: RecommendationScore[] = [];
    const genreCount: { [genre: string]: number } = {};
    const languageCount: { [language: string]: number } = {};

    for (const rec of recommendations) {
      // Check diversity constraints
      const movieGenres = rec.movie.genres;
      const movieLanguage = rec.movie.language || 'unknown';

      // Limit movies per genre (max 3 per genre in top 10)
      const genreOverlap = movieGenres.some(genre => (genreCount[genre] || 0) >= 3);
      const languageOverlap = (languageCount[movieLanguage] || 0) >= 5;

      if (!genreOverlap && !languageOverlap) {
        diverseRecs.push(rec);
        
        // Update counts
        movieGenres.forEach(genre => {
          genreCount[genre] = (genreCount[genre] || 0) + 1;
        });
        languageCount[movieLanguage] = (languageCount[movieLanguage] || 0) + 1;
      }

      if (diverseRecs.length >= 20) break;
    }

    return diverseRecs.length > 0 ? diverseRecs : recommendations.slice(0, 20); // Fallback to non-diverse if needed
  }

  // Method to update user profile based on new actions
  async updateUserProfile(userId: string, movieId: number, action: string, movieData: Movie) {
    const profile = this.userProfiles.get(userId);
    if (!profile) return;

    const weight = this.getActionWeight(action);
    
    // Update genre weights
    movieData.genres.forEach(genre => {
      profile.genreWeights[genre] = (profile.genreWeights[genre] || 0) + weight * 0.1;
    });

    // Update language weights
    if (movieData.language) {
      profile.languageWeights[movieData.language] = 
        (profile.languageWeights[movieData.language] || 0) + weight * 0.1;
    }

    profile.totalActions++;

    // Re-normalize weights
    this.normalizeWeights(profile.genreWeights);
    this.normalizeWeights(profile.languageWeights);
  }
}

export const intelligentRecommendationEngine = new IntelligentRecommendationEngine();