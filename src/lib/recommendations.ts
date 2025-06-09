import { supabase, getStoredPreferenceId, saveMovieAction } from './supabase';
import { getMovies, getTVSeries } from './tmdb';
import type { Movie, UserPreferences } from '../types';

interface UserProfile {
  id: string;
  preferences: UserPreferences;
  actions: { [movieId: number]: 'like' | 'pass' | 'unwatched' };
  genreWeights: { [genre: string]: number };
  languageWeights: { [language: string]: number };
}

interface MovieScore {
  movie: Movie;
  score: number;
  reasons: string[];
}

class RecommendationEngine {
  private userProfiles: Map<string, UserProfile> = new Map();
  private movieSimilarities: Map<string, number> = new Map();
  private globalGenrePopularity: Map<string, number> = new Map();

  async initializeEngine() {
    if (!supabase) return;

    try {
      // Load all user preferences and actions
      const { data: preferences } = await supabase
        .from('anonymous_preferences')
        .select('*');

      const { data: actions } = await supabase
        .from('anonymous_actions')
        .select('*');

      if (preferences && actions) {
        this.buildUserProfiles(preferences, actions);
        this.calculateMovieSimilarities(actions);
        this.calculateGlobalTrends(actions);
      }
    } catch (error) {
      console.error('Error initializing recommendation engine:', error);
    }
  }

  private buildUserProfiles(preferences: any[], actions: any[]) {
    preferences.forEach(pref => {
      const userActions = actions.filter(a => a.preference_id === pref.id);
      const genreWeights: { [genre: string]: number } = {};
      const languageWeights: { [language: string]: number } = {};

      // Calculate genre preferences based on actions
      userActions.forEach(action => {
        if (action.genres) {
          action.genres.forEach((genre: string) => {
            if (!genreWeights[genre]) genreWeights[genre] = 0;
            
            switch (action.action) {
              case 'like':
                genreWeights[genre] += 3;
                break;
              case 'unwatched':
                genreWeights[genre] += 1;
                break;
              case 'pass':
                genreWeights[genre] -= 1;
                break;
            }
          });
        }

        if (action.language) {
          if (!languageWeights[action.language]) languageWeights[action.language] = 0;
          
          switch (action.action) {
            case 'like':
              languageWeights[action.language] += 2;
              break;
            case 'unwatched':
              languageWeights[action.language] += 0.5;
              break;
          }
        }
      });

      const actionMap: { [movieId: number]: 'like' | 'pass' | 'unwatched' } = {};
      userActions.forEach(action => {
        actionMap[action.movie_id] = action.action;
      });

      this.userProfiles.set(pref.id, {
        id: pref.id,
        preferences: {
          languages: pref.languages || [],
          contentType: pref.content_type || 'both',
          seriesType: pref.series_type,
          genres: pref.genres || [],
          yearRange: [1990, new Date().getFullYear()]
        },
        actions: actionMap,
        genreWeights,
        languageWeights
      });
    });
  }

  private calculateMovieSimilarities(actions: any[]) {
    const moviePairs: Map<string, { likes: number; total: number }> = new Map();

    // Group actions by user
    const userActions: Map<string, any[]> = new Map();
    actions.forEach(action => {
      if (!userActions.has(action.preference_id)) {
        userActions.set(action.preference_id, []);
      }
      userActions.get(action.preference_id)!.push(action);
    });

    // Calculate co-occurrence of movies
    userActions.forEach(userMovies => {
      for (let i = 0; i < userMovies.length; i++) {
        for (let j = i + 1; j < userMovies.length; j++) {
          const movie1 = userMovies[i];
          const movie2 = userMovies[j];
          const pairKey = `${Math.min(movie1.movie_id, movie2.movie_id)}-${Math.max(movie1.movie_id, movie2.movie_id)}`;

          if (!moviePairs.has(pairKey)) {
            moviePairs.set(pairKey, { likes: 0, total: 0 });
          }

          const pair = moviePairs.get(pairKey)!;
          pair.total++;

          if (movie1.action === 'like' && movie2.action === 'like') {
            pair.likes++;
          }
        }
      }
    });

    // Store similarity scores
    moviePairs.forEach((data, pairKey) => {
      const similarity = data.likes / data.total;
      if (similarity > 0.3) { // Only store meaningful similarities
        this.movieSimilarities.set(pairKey, similarity);
      }
    });
  }

  private calculateGlobalTrends(actions: any[]) {
    const genreCounts: Map<string, number> = new Map();
    const totalActions = actions.filter(a => a.action === 'like').length;

    actions.forEach(action => {
      if (action.action === 'like' && action.genres) {
        action.genres.forEach((genre: string) => {
          genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
        });
      }
    });

    genreCounts.forEach((count, genre) => {
      this.globalGenrePopularity.set(genre, count / totalActions);
    });
  }

  private findSimilarUsers(currentUserId: string): string[] {
    const currentUser = this.userProfiles.get(currentUserId);
    if (!currentUser) return [];

    const similarities: { userId: string; score: number }[] = [];

    this.userProfiles.forEach((otherUser, userId) => {
      if (userId === currentUserId) return;

      let similarity = 0;
      let commonMovies = 0;

      // Calculate movie preference similarity
      Object.keys(currentUser.actions).forEach(movieId => {
        if (otherUser.actions[movieId]) {
          commonMovies++;
          if (currentUser.actions[movieId] === otherUser.actions[movieId]) {
            similarity += currentUser.actions[movieId] === 'like' ? 2 : 1;
          }
        }
      });

      // Calculate genre preference similarity
      let genreSimilarity = 0;
      const currentGenres = Object.keys(currentUser.genreWeights);
      const otherGenres = Object.keys(otherUser.genreWeights);
      
      currentGenres.forEach(genre => {
        if (otherUser.genreWeights[genre]) {
          genreSimilarity += Math.min(
            currentUser.genreWeights[genre],
            otherUser.genreWeights[genre]
          );
        }
      });

      if (commonMovies > 2) {
        const finalScore = (similarity / commonMovies) * 0.7 + (genreSimilarity / 10) * 0.3;
        similarities.push({ userId, score: finalScore });
      }
    });

    return similarities
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(s => s.userId);
  }

  async getPersonalizedRecommendations(
    userId: string,
    preferences: UserPreferences,
    seenMovies: Set<number>,
    page: number = 1
  ): Promise<Movie[]> {
    await this.initializeEngine();

    const currentUser = this.userProfiles.get(userId);
    if (!currentUser) {
      // For new users, return popular movies in their preferred genres
      return this.getPopularMoviesForNewUser(preferences, seenMovies);
    }

    const similarUsers = this.findSimilarUsers(userId);
    const recommendedMovies: MovieScore[] = [];

    // Get movies from similar users
    const collaborativeMovies = this.getCollaborativeRecommendations(currentUser, similarUsers);
    
    // Get content-based recommendations
    const contentBasedMovies = await this.getContentBasedRecommendations(currentUser, preferences, seenMovies);

    // Combine and score all recommendations
    const allMovies = [...collaborativeMovies, ...contentBasedMovies];
    const movieScores = new Map<number, MovieScore>();

    allMovies.forEach(movieScore => {
      const existing = movieScores.get(movieScore.movie.id);
      if (existing) {
        existing.score += movieScore.score;
        existing.reasons.push(...movieScore.reasons);
      } else {
        movieScores.set(movieScore.movie.id, movieScore);
      }
    });

    // Sort by score and return top recommendations
    return Array.from(movieScores.values())
      .sort((a, b) => b.score - a.score)
      .filter(ms => !seenMovies.has(ms.movie.id))
      .slice(0, 20)
      .map(ms => ms.movie);
  }

  private getCollaborativeRecommendations(currentUser: UserProfile, similarUsers: string[]): MovieScore[] {
    const recommendations: MovieScore[] = [];

    similarUsers.forEach(similarUserId => {
      const similarUser = this.userProfiles.get(similarUserId);
      if (!similarUser) return;

      Object.entries(similarUser.actions).forEach(([movieIdStr, action]) => {
        const movieId = parseInt(movieIdStr);
        if (currentUser.actions[movieId] || action !== 'like') return;

        // This is a placeholder - in a real implementation, you'd fetch movie details
        // For now, we'll skip this part as it requires movie data
      });
    });

    return recommendations;
  }

  private async getContentBasedRecommendations(
    currentUser: UserProfile,
    preferences: UserPreferences,
    seenMovies: Set<number>
  ): Promise<MovieScore[]> {
    const recommendations: MovieScore[] = [];

    try {
      // Get movies based on user's preferred genres and languages
      const topGenres = Object.entries(currentUser.genreWeights)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([genre]) => genre);

      const topLanguages = Object.entries(currentUser.languageWeights)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 2)
        .map(([lang]) => lang);

      // Fetch movies for top genres and languages
      if (preferences.contentType === 'movies' || preferences.contentType === 'both') {
        const movieResponse = await getMovies(1, topLanguages, topGenres);
        if (movieResponse.results) {
          movieResponse.results.forEach(movie => {
            if (!seenMovies.has(movie.id)) {
              const score = this.calculateContentScore(movie, currentUser);
              recommendations.push({
                movie,
                score,
                reasons: [`Matches your taste in ${movie.genres.join(', ')}`]
              });
            }
          });
        }
      }

      if (preferences.contentType === 'series' || preferences.contentType === 'both') {
        const seriesResponse = await getTVSeries(1, topLanguages, topGenres);
        if (seriesResponse.results) {
          seriesResponse.results.forEach(movie => {
            if (!seenMovies.has(movie.id)) {
              const score = this.calculateContentScore(movie, currentUser);
              recommendations.push({
                movie,
                score,
                reasons: [`Matches your taste in ${movie.genres.join(', ')}`]
              });
            }
          });
        }
      }
    } catch (error) {
      console.error('Error getting content-based recommendations:', error);
    }

    return recommendations;
  }

  private calculateContentScore(movie: Movie, user: UserProfile): number {
    let score = 0;

    // Genre matching
    movie.genres.forEach(genre => {
      if (user.genreWeights[genre]) {
        score += user.genreWeights[genre] * 0.4;
      }
    });

    // Language matching
    if (movie.language && user.languageWeights[movie.language]) {
      score += user.languageWeights[movie.language] * 0.3;
    }

    // Rating boost
    score += (movie.voteAverage / 10) * 0.2;

    // Popularity boost (but not too much to maintain diversity)
    score += Math.log(movie.voteAverage + 1) * 0.1;

    return score;
  }

  private async getPopularMoviesForNewUser(
    preferences: UserPreferences,
    seenMovies: Set<number>
  ): Promise<Movie[]> {
    try {
      let allMovies: Movie[] = [];

      if (preferences.contentType === 'movies' || preferences.contentType === 'both') {
        const movieResponse = await getMovies(1, preferences.languages, preferences.genres);
        if (movieResponse.results) {
          allMovies = [...allMovies, ...movieResponse.results];
        }
      }

      if (preferences.contentType === 'series' || preferences.contentType === 'both') {
        const seriesResponse = await getTVSeries(1, preferences.languages, preferences.genres);
        if (seriesResponse.results) {
          allMovies = [...allMovies, ...seriesResponse.results];
        }
      }

      return allMovies
        .filter(movie => !seenMovies.has(movie.id))
        .sort((a, b) => b.voteAverage - a.voteAverage)
        .slice(0, 20);
    } catch (error) {
      console.error('Error getting popular movies for new user:', error);
      return [];
    }
  }
}

export const recommendationEngine = new RecommendationEngine();