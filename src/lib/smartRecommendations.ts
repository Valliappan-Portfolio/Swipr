interface UserPreferences {
  likedGenres: string[];
  dislikedGenres: string[];
  preferredDecades: number[];
  likedActors: string[];
  likedDirectors: string[];
  preferredRatings: number[];
  averageRatingPreference: number;
  popularityPreference: 'mainstream' | 'balanced' | 'indie' | null;
}

interface UserSession {
  preferences: UserPreferences;
  swipeHistory: SwipeAction[];
  sessionStats: {
    totalSwipes: number;
    likesCount: number;
    dislikesCount: number;
    unwatchedCount: number;
  };
  lastUpdated: string;
}

interface SwipeAction {
  movieId: number;
  action: 'like' | 'pass' | 'unwatched';
  timestamp: string;
  movieData: {
    genres: string[];
    year: number;
    rating: number;
    popularity?: number;
    director?: string;
    actors?: string[];
  };
}

import type { Movie } from '../types';

class SmartRecommendationEngine {
  private static instance: SmartRecommendationEngine;
  private userSession: UserSession;
  private movieQueue: Movie[] = [];
  private readonly STORAGE_KEY = 'swipr_session';
  private readonly QUEUE_SIZE = 20;

  constructor() {
    this.userSession = this.loadUserSession();
  }

  static getInstance(): SmartRecommendationEngine {
    if (!SmartRecommendationEngine.instance) {
      SmartRecommendationEngine.instance = new SmartRecommendationEngine();
    }
    return SmartRecommendationEngine.instance;
  }

  private loadUserSession(): UserSession {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const session = JSON.parse(stored);
        console.log('📱 Loaded user session:', {
          totalSwipes: session.sessionStats?.totalSwipes || 0,
          likedGenres: session.preferences?.likedGenres?.length || 0
        });
        return session;
      }
    } catch (error) {
      console.error('Error loading user session:', error);
    }

    // Default session for new users
    return {
      preferences: {
        likedGenres: [],
        dislikedGenres: [],
        preferredDecades: [],
        likedActors: [],
        likedDirectors: [],
        preferredRatings: [],
        averageRatingPreference: 7.0,
        popularityPreference: null
      },
      swipeHistory: [],
      sessionStats: {
        totalSwipes: 0,
        likesCount: 0,
        dislikesCount: 0,
        unwatchedCount: 0
      },
      lastUpdated: new Date().toISOString()
    };
  }

  private saveUserSession(): void {
    try {
      this.userSession.lastUpdated = new Date().toISOString();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.userSession));
      console.log('💾 Session saved:', {
        totalSwipes: this.userSession.sessionStats.totalSwipes
      });
    } catch (error) {
      console.error('Error saving user session:', error);
    }
  }

  scoreMovie(movie: Movie): number {
    const prefs = this.userSession.preferences;
    let score = 0.5; // Base score
    let scoreBreakdown = { base: 0.5, genre: 0, year: 0, rating: 0, director: 0, popularity: 0, anime: 0 };

    // Anime penalty (check BEFORE genre scoring)
    if (movie.isAnime && prefs.dislikedGenres.includes('Animation')) {
      const animePenalty = -0.8; // Heavy penalty for anime if user dislikes animation
      score += animePenalty;
      scoreBreakdown.anime = animePenalty;
      console.log(`🚫 Anime detected and penalized: "${movie.title}" (${animePenalty})`);
    }

    // Genre preferences (major factor - 40% weight)
    movie.genres.forEach(genre => {
      // Skip Animation genre if it's anime (already penalized above)
      if (genre === 'Animation' && movie.isAnime && prefs.dislikedGenres.includes('Animation')) {
        return; // Already penalized as anime
      }

      if (prefs.likedGenres.includes(genre)) {
        const boost = 0.4;
        score += boost;
        scoreBreakdown.genre += boost;
      }
      if (prefs.dislikedGenres.includes(genre)) {
        const penalty = -0.6;
        score += penalty;
        scoreBreakdown.genre += penalty;
      }
    });

    // Year preferences (20% weight)
    const movieYear = new Date(movie.releaseDate).getFullYear();
    const movieDecade = Math.floor(movieYear / 10) * 10;
    if (prefs.preferredDecades.includes(movieDecade)) {
      const boost = 0.2;
      score += boost;
      scoreBreakdown.year += boost;
    }

    // Director preferences (15% weight) - NEW!
    if (movie.director && prefs.likedDirectors.includes(movie.director)) {
      const boost = 0.3;
      score += boost;
      scoreBreakdown.director += boost;
    }

    // Rating preferences (10% weight)
    if (movie.voteAverage >= prefs.averageRatingPreference) {
      const boost = 0.1;
      score += boost;
      scoreBreakdown.rating += boost;
    }

    // Boost for highly rated movies
    if (movie.voteAverage >= 8.0) {
      const boost = 0.1;
      score += boost;
      scoreBreakdown.rating += boost;
    }

    // CRITICAL: Quality content boost - ensures top-tier shows always appear
    // This helps surface critically acclaimed shows like Dark, Severance, etc.
    if (movie.voteAverage >= 8.0 && movie.voteAverage < 10) {
      const voteCount = (movie as any).vote_count || 0;
      if (voteCount >= 1000) {
        const qualityBoost = 0.25; // Significant boost for proven quality
        score += qualityBoost;
        scoreBreakdown.rating += qualityBoost;
      }
    }

    // Popularity preferences (10% weight) - NEW!
    if (prefs.popularityPreference && movie.popularity) {
      if (prefs.popularityPreference === 'mainstream' && movie.popularity > 50) {
        const boost = 0.15;
        score += boost;
        scoreBreakdown.popularity += boost;
      } else if (prefs.popularityPreference === 'indie' && movie.popularity < 30) {
        const boost = 0.15;
        score += boost;
        scoreBreakdown.popularity += boost;
      }
    }

    const finalScore = Math.max(0, Math.min(1, score));

    // Log detailed scoring for first few movies or when score is interesting
    if (Math.random() < 0.1 || finalScore > 0.8 || finalScore < 0.3) {
      console.log('🎯 Movie scoring:', {
        movie: movie.title,
        genres: movie.genres,
        year: movieYear,
        rating: movie.voteAverage,
        director: movie.director,
        popularity: movie.popularity,
        scoreBreakdown,
        finalScore: finalScore.toFixed(3)
      });
    }

    return finalScore;
  }

  recordSwipe(movie: Movie, action: 'like' | 'pass' | 'unwatched'): void {
    const movieYear = new Date(movie.releaseDate).getFullYear();
    const movieDecade = Math.floor(movieYear / 10) * 10;

    console.log('🎬 Processing swipe:', {
      movie: movie.title,
      action,
      genres: movie.genres,
      year: movieYear,
      decade: movieDecade
    });
    // Record the swipe
    const swipeAction: SwipeAction = {
      movieId: movie.id,
      action,
      timestamp: new Date().toISOString(),
      movieData: {
        genres: movie.genres,
        year: movieYear,
        rating: movie.voteAverage,
        popularity: movie.popularity,
        director: movie.director
      }
    };

    this.userSession.swipeHistory.unshift(swipeAction);
    
    // Keep only last 100 swipes
    if (this.userSession.swipeHistory.length > 100) {
      this.userSession.swipeHistory = this.userSession.swipeHistory.slice(0, 100);
    }

    // Update session stats
    this.userSession.sessionStats.totalSwipes++;
    if (action === 'like') {
      this.userSession.sessionStats.likesCount++;
    } else if (action === 'pass') {
      this.userSession.sessionStats.dislikesCount++;
    } else if (action === 'unwatched') {
      this.userSession.sessionStats.unwatchedCount++;
    }

    // Update preferences based on action
    this.updatePreferences(movie, action, movieDecade);

    console.log('🧠 Preferences updated:', {
      likedGenres: this.userSession.preferences.likedGenres,
      dislikedGenres: this.userSession.preferences.dislikedGenres,
      preferredDecades: this.userSession.preferences.preferredDecades,
      averageRating: this.userSession.preferences.averageRatingPreference.toFixed(1)
    });

    this.saveUserSession();

    console.log('💾 Session saved:', {
      totalSwipes: this.userSession.sessionStats.totalSwipes,
      likesCount: this.userSession.sessionStats.likesCount,
      newMovieScore: this.scoreMovie(movie).toFixed(3)
    });
  }

  private updatePreferences(movie: Movie, action: 'like' | 'pass' | 'unwatched', movieDecade: number): void {
    const prefs = this.userSession.preferences;

    if (action === 'like') {
      // Add genres to liked list
      movie.genres.forEach(genre => {
        if (!prefs.likedGenres.includes(genre)) {
          prefs.likedGenres.push(genre);
        }
        // Remove from disliked if present
        const dislikedIndex = prefs.dislikedGenres.indexOf(genre);
        if (dislikedIndex > -1) {
          prefs.dislikedGenres.splice(dislikedIndex, 1);
        }
      });

      // Add decade preference
      if (!prefs.preferredDecades.includes(movieDecade)) {
        prefs.preferredDecades.push(movieDecade);
      }

      // Add director to liked list (NEW!)
      if (movie.director && !prefs.likedDirectors.includes(movie.director)) {
        prefs.likedDirectors.push(movie.director);
      }

      // Update average rating preference
      const likedMovies = this.userSession.swipeHistory.filter(s => s.action === 'like');
      if (likedMovies.length > 0) {
        const avgRating = likedMovies.reduce((sum, s) => sum + s.movieData.rating, 0) / likedMovies.length;
        prefs.averageRatingPreference = avgRating;
      }

      // Learn popularity preference (NEW!)
      this.updatePopularityPreference();

    } else if (action === 'pass') {
      // Add genres to disliked list (more aggressive - 2+ passes out of last 3)
      movie.genres.forEach(genre => {
        const recentPasses = this.userSession.swipeHistory
          .filter(s => s.action === 'pass' && s.movieData.genres.includes(genre))
          .slice(0, 5); // Last 5 passes with this genre

        // Mark as disliked if 2+ passes out of last 3 swipes with this genre
        if (recentPasses.length >= 2 && !prefs.dislikedGenres.includes(genre)) {
          console.log(`🚫 Genre "${genre}" marked as disliked after ${recentPasses.length} passes`);
          prefs.dislikedGenres.push(genre);
          // Remove from liked if present
          const likedIndex = prefs.likedGenres.indexOf(genre);
          if (likedIndex > -1) {
            prefs.likedGenres.splice(likedIndex, 1);
          }
        }
      });
    }

    // Keep lists manageable
    if (prefs.likedGenres.length > 10) {
      prefs.likedGenres = prefs.likedGenres.slice(0, 10);
    }
    if (prefs.dislikedGenres.length > 8) {
      prefs.dislikedGenres = prefs.dislikedGenres.slice(0, 8);
    }
    if (prefs.preferredDecades.length > 6) {
      prefs.preferredDecades = prefs.preferredDecades.slice(0, 6);
    }
    if (prefs.likedDirectors.length > 10) {
      prefs.likedDirectors = prefs.likedDirectors.slice(0, 10);
    }
  }

  private updatePopularityPreference(): void {
    const likedMovies = this.userSession.swipeHistory.filter(s => s.action === 'like' && s.movieData.popularity);

    if (likedMovies.length < 5) return; // Need at least 5 liked movies

    const avgPopularity = likedMovies.reduce((sum, s) => sum + (s.movieData.popularity || 0), 0) / likedMovies.length;

    if (avgPopularity > 60) {
      this.userSession.preferences.popularityPreference = 'mainstream';
    } else if (avgPopularity < 25) {
      this.userSession.preferences.popularityPreference = 'indie';
    } else {
      this.userSession.preferences.popularityPreference = 'balanced';
    }
  }

  getSessionStats() {
    return {
      ...this.userSession.sessionStats,
      preferences: this.userSession.preferences,
      hasHistory: this.userSession.swipeHistory.length > 0
    };
  }

  sortMoviesByPreference(movies: Movie[]): Movie[] {
    return movies
      .map(movie => ({
        movie,
        score: this.scoreMovie(movie)
      }))
      .sort((a, b) => b.score - a.score)
      .map(item => item.movie);
  }

  getLastSwipe(): SwipeAction | null {
    return this.userSession.swipeHistory[0] || null;
  }

  undoLastSwipe(): Movie | null {
    const lastSwipe = this.userSession.swipeHistory.shift();
    if (!lastSwipe) return null;

    // Revert stats
    this.userSession.sessionStats.totalSwipes--;
    if (lastSwipe.action === 'like') {
      this.userSession.sessionStats.likesCount--;
    } else if (lastSwipe.action === 'pass') {
      this.userSession.sessionStats.dislikesCount--;
    } else if (lastSwipe.action === 'unwatched') {
      this.userSession.sessionStats.unwatchedCount--;
    }

    this.saveUserSession();

    // Return a basic movie object (we'll need to fetch full details)
    return {
      id: lastSwipe.movieId,
      title: 'Previous Movie',
      overview: '',
      posterPath: '',
      releaseDate: '',
      voteAverage: lastSwipe.movieData.rating,
      genres: lastSwipe.movieData.genres,
      type: 'movie' as const
    };
  }

  clearAllData(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.userSession = this.loadUserSession();
    console.log('🗑️ All user data cleared');
  }

  // Get personalized movie recommendations with cold start
  getPersonalizedRecommendations(movies: Movie[], coldStartMovies?: Movie[]): Movie[] {
    // Cold start: First 10 swipes show ONLY top-rated English content
    if (this.userSession.sessionStats.totalSwipes < 10 && coldStartMovies && coldStartMovies.length > 0) {
      console.log('❄️ Cold start mode: Showing ONLY top-rated English content (first 10 swipes)', {
        swipeCount: this.userSession.sessionStats.totalSwipes,
        topRatedCount: coldStartMovies.length,
        remainingColdStartSwipes: 10 - this.userSession.sessionStats.totalSwipes
      });
      // Return ONLY top-rated content for first 10 swipes
      return coldStartMovies.slice(0, 10);
    }

    // For experienced users (10+ swipes), use smart scoring
    console.log('🎯 Personalized mode: Using learned preferences', {
      swipeCount: this.userSession.sessionStats.totalSwipes,
      likedGenres: this.userSession.preferences.likedGenres
    });
    return this.sortMoviesByPreference(movies);
  }

  private getDiverseSelection(movies: Movie[]): Movie[] {
    // For new users, ensure diversity across genres and decades
    const genreGroups: { [key: string]: Movie[] } = {};
    
    movies.forEach(movie => {
      movie.genres.forEach(genre => {
        if (!genreGroups[genre]) genreGroups[genre] = [];
        genreGroups[genre].push(movie);
      });
    });

    const diverseMovies: Movie[] = [];
    const usedMovies = new Set<number>();

    // Take 2-3 movies from each genre
    Object.values(genreGroups).forEach(genreMovies => {
      const shuffled = genreMovies.sort(() => Math.random() - 0.5);
      let added = 0;
      for (const movie of shuffled) {
        if (!usedMovies.has(movie.id) && added < 3) {
          diverseMovies.push(movie);
          usedMovies.add(movie.id);
          added++;
        }
      }
    });

    return diverseMovies.sort(() => Math.random() - 0.5);
  }
}

export const smartRecommendationEngine = SmartRecommendationEngine.getInstance();