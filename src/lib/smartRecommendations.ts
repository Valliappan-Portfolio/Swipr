interface UserPreferences {
  likedGenres: string[];
  dislikedGenres: string[];
  preferredDecades: number[];
  likedActors: string[];
  preferredRatings: number[];
  averageRatingPreference: number;
}

interface UserSession {
  preferences: UserPreferences;
  watchlist: Movie[];
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
          likedGenres: session.preferences?.likedGenres?.length || 0,
          watchlistSize: session.watchlist?.length || 0
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
        preferredRatings: [],
        averageRatingPreference: 7.0
      },
      watchlist: [],
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
        totalSwipes: this.userSession.sessionStats.totalSwipes,
        watchlistSize: this.userSession.watchlist.length
      });
    } catch (error) {
      console.error('Error saving user session:', error);
    }
  }

  scoreMovie(movie: Movie): number {
    const prefs = this.userSession.preferences;
    let score = 0.5; // Base score
    let scoreBreakdown = { base: 0.5, genre: 0, year: 0, rating: 0 };

    // Genre preferences (major factor - 40% weight)
    movie.genres.forEach(genre => {
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

    // Slight penalty for very old movies unless user likes them
    if (movieYear < 2000 && !prefs.preferredDecades.some(d => d < 2000)) {
      const penalty = -0.1;
      score += penalty;
      scoreBreakdown.year += penalty;
    }

    const finalScore = Math.max(0, Math.min(1, score));
    
    // Log detailed scoring for first few movies or when score is interesting
    if (Math.random() < 0.1 || finalScore > 0.8 || finalScore < 0.3) {
      console.log('🎯 Movie scoring:', {
        movie: movie.title,
        genres: movie.genres,
        year: movieYear,
        rating: movie.voteAverage,
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
        rating: movie.voteAverage
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
    // Add to watchlist if unwatched
    if (action === 'unwatched') {
      this.addToWatchlist(movie);
    }

    this.saveUserSession();

    console.log('💾 Session saved:', {
      totalSwipes: this.userSession.sessionStats.totalSwipes,
      likesCount: this.userSession.sessionStats.likesCount,
      watchlistSize: this.userSession.watchlist.length,
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

      // Update average rating preference
      const likedMovies = this.userSession.swipeHistory.filter(s => s.action === 'like');
      if (likedMovies.length > 0) {
        const avgRating = likedMovies.reduce((sum, s) => sum + s.movieData.rating, 0) / likedMovies.length;
        prefs.averageRatingPreference = avgRating;
      }

    } else if (action === 'pass') {
      // Add genres to disliked list (but only if consistently disliked)
      movie.genres.forEach(genre => {
        const recentPasses = this.userSession.swipeHistory
          .filter(s => s.action === 'pass' && s.movieData.genres.includes(genre))
          .slice(0, 3); // Last 3 passes with this genre

        if (recentPasses.length >= 2 && !prefs.dislikedGenres.includes(genre)) {
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
  }

  addToWatchlist(movie: Movie): void {
    // Check if already in watchlist
    if (!this.userSession.watchlist.find(m => m.id === movie.id)) {
      this.userSession.watchlist.unshift(movie);
      console.log('📚 Added to watchlist:', movie.title);
    }
  }

  removeFromWatchlist(movieId: number): void {
    this.userSession.watchlist = this.userSession.watchlist.filter(m => m.id !== movieId);
    this.saveUserSession();
  }

  getWatchlist(): Movie[] {
    return this.userSession.watchlist;
  }

  getSessionStats() {
    return {
      ...this.userSession.sessionStats,
      preferences: this.userSession.preferences,
      watchlistSize: this.userSession.watchlist.length,
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
      // Remove from watchlist
      this.removeFromWatchlist(lastSwipe.movieId);
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