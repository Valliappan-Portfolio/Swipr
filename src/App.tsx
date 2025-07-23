import React, { useState, useEffect } from 'react';
import { Film, Settings as SettingsIcon, Share2, ListVideo, Sparkles, BarChart3 } from 'lucide-react';
import { MovieCard } from './components/MovieCard';
import { HomePage } from './components/HomePage';
import { Onboarding } from './components/Onboarding';
import { Settings } from './components/Settings';
import { WatchlistView } from './components/WatchlistView';
import { SurpriseMe } from './components/SurpriseMe';
import { UserStats } from './components/UserStats';
import { UndoButton } from './components/UndoButton';
import { ConnectionTest } from './components/ConnectionTest';
import { getMovies, getTVSeries } from './lib/tmdb';
import { intelligentRecommendationEngine } from './lib/intelligentRecommendations';
import { smartRecommendationEngine } from './lib/smartRecommendations';
import { saveUserPreferences, saveMovieAction, getStoredPreferenceId, storePreferenceId } from './lib/supabase';
import type { Movie, MovieActionType, UserPreferences, ViewType } from './types';

const gradients = [
  'from-slate-900 via-teal-900 to-slate-900',
  'from-gray-900 via-indigo-900 to-slate-900',
  'from-slate-900 via-emerald-900 to-gray-900',
  'from-gray-900 via-cyan-900 to-slate-900',
  'from-slate-900 via-blue-900 to-gray-900',
  'from-gray-900 via-purple-900 to-slate-900',
  'from-slate-900 via-green-900 to-gray-900',
  'from-gray-900 via-teal-900 to-slate-900'
];

function App() {
  const [showHomePage, setShowHomePage] = useState(() => {
    return !localStorage.getItem('hasSeenHomepage');
  });
  const [movies, setMovies] = useState<Movie[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [userProfile, setUserProfile] = useState<{ name: string; preferences: UserPreferences } | null>(() => {
    const saved = localStorage.getItem('userProfile');
    return saved ? JSON.parse(saved) : null;
  });
  const [currentGradient, setCurrentGradient] = useState(0);
  const [currentView, setCurrentView] = useState<ViewType>('swipe');
  const [showSurpriseMe, setShowSurpriseMe] = useState(false);
  const [seenMovies, setSeenMovies] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [unwatchedMovies, setUnwatchedMovies] = useState<Movie[]>([]);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [useIntelligentRecommendations, setUseIntelligentRecommendations] = useState(true);
  const [showConnectionTest, setShowConnectionTest] = useState(false);
  const [showUserStats, setShowUserStats] = useState(false);
  const [undoInProgress, setUndoInProgress] = useState(false);
  const [lastUndoMovie, setLastUndoMovie] = useState<Movie | null>(null);

  useEffect(() => {
    const savedSeenMovies = localStorage.getItem('seenMovies');
    if (savedSeenMovies) {
      setSeenMovies(new Set(JSON.parse(savedSeenMovies)));
    }

    const storedId = getStoredPreferenceId();
    if (storedId) {
      setPreferenceId(storedId);
    }

    // Load watchlist from smart recommendation engine
    const watchlist = smartRecommendationEngine.getWatchlist();
    setUnwatchedMovies(watchlist);
  }, []);

  const fetchContent = async (page: number, usePersonalized: boolean = true) => {
    if (!userProfile?.preferences || isFetching) return;

    setIsFetching(true);
    setError(null);
    
    try {
      let allContent: Movie[] = [];
      const { preferences } = userProfile;

      // Use intelligent recommendations if enabled and user has a preference ID
      if (usePersonalized && useIntelligentRecommendations && preferenceId) {
        try {
          console.log(`🔍 Fetching intelligent recommendations for page ${page}...`);
          const personalizedMovies = await intelligentRecommendationEngine.getPersonalizedRecommendations(
            preferenceId,
            preferences,
            seenMovies,
            page
          );
          
          if (personalizedMovies.length > 0) {
            // Apply smart recommendation scoring
            allContent = smartRecommendationEngine.getPersonalizedRecommendations(personalizedMovies);
            console.log(`🎯 Intelligent recommendations loaded: ${personalizedMovies.length} movies for page ${page}`);
            console.log(`📊 User preferences: ${preferences.genres.join(', ')} | Languages: ${preferences.languages.join(', ')}`);
            console.log(`🎬 Sample movies:`, personalizedMovies.slice(0, 3).map(m => ({ title: m.title, genres: m.genres })));
          }
        } catch (error) {
          console.error('Error getting intelligent recommendations:', error);
          console.log('🔄 Falling back to regular content fetching...');
          // Fall back to regular content fetching
          usePersonalized = false; // Disable personalization for this fetch to avoid infinite loop
        }
      }

      // If no personalized content or fallback needed, use regular fetching
      if (allContent.length === 0) {
        if (preferences.contentType === 'movies' || preferences.contentType === 'both') {
          const movieResponse = await getMovies(
            page, 
            preferences.languages, 
            preferences.genres,
            preferences.yearRange
          );
          if (movieResponse.results) {
            allContent = [...allContent, ...movieResponse.results];
          }
        }
        
        if (preferences.contentType === 'series' || preferences.contentType === 'both') {
          const seriesResponse = await getTVSeries(
            page,
            preferences.languages,
            preferences.genres,
            preferences.yearRange
          );
          if (seriesResponse.results) {
            allContent = [...allContent, ...seriesResponse.results];
          }
        }

        // Apply smart scoring to regular content too
        if (allContent.length > 0) {
          const originalLength = allContent.length;
          allContent = smartRecommendationEngine.getPersonalizedRecommendations(allContent);
          console.log('🎯 Smart scoring applied:', {
            originalMovies: originalLength,
            scoredMovies: allContent.length,
            sampleScores: allContent.slice(0, 3).map(m => ({
              title: m.title,
              score: smartRecommendationEngine.scoreMovie(m).toFixed(3)
            }))
          });
        }
      }

      const newContent = allContent
        .filter(item => item && item.id && !seenMovies.has(item.id))
        .filter(item => item.posterPath);

      if (newContent.length === 0 && page < 10) { // Increased from 5 to 10 pages
        return await fetchContent(page + 1, false); // Disable personalization for retry
      }

      // Shuffle content to add variety
      const shuffledContent = newContent.sort(() => Math.random() - 0.5);

      setMovies(prev => [...prev, ...shuffledContent]);
      
      console.log(`📈 Total movies loaded: ${movies.length + shuffledContent.length}, New content: ${shuffledContent.length}`);
      
      return shuffledContent.length > 0;
    } catch (error) {
      console.error('Error fetching content:', error);
      setError('Failed to load movies. Please try again.');
      return false;
    } finally {
      setIsFetching(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!userProfile?.preferences) return;
    
    setIsLoading(true);
    setMovies([]);
    setCurrentIndex(0);
    
    // Load initial content and apply smart scoring
    fetchContent(currentPage).then(() => {
      console.log('🧠 Smart recommendation engine initialized');
      const stats = smartRecommendationEngine.getSessionStats();
      console.log('📈 Current session stats:', stats);
    });
  }, [userProfile?.preferences, preferenceId]);

  const handleAction = async (action: MovieActionType, movie?: Movie) => {
    if (undoInProgress) return; // Prevent actions during undo
    
    if (movies.length === 0 && !movie) return;
    
    const currentMovie = movie || movies[currentIndex];

    // Record swipe in smart recommendation engine with detailed logging
    console.log('🎯 Recording swipe:', {
      action,
      movie: currentMovie.title,
      genres: currentMovie.genres,
      year: new Date(currentMovie.releaseDate).getFullYear()
    });
    
    smartRecommendationEngine.recordSwipe(currentMovie, action);
    
    // Log updated preferences
    const stats = smartRecommendationEngine.getSessionStats();
    console.log('📊 Updated preferences:', {
      likedGenres: stats.preferences.likedGenres,
      totalSwipes: stats.totalSwipes,
      watchlistSize: stats.watchlistSize
    });
    
    setSeenMovies(prev => {
      const next = new Set(prev);
      next.add(currentMovie.id);
      localStorage.setItem('seenMovies', JSON.stringify(Array.from(next)));
      return next;
    });
    
    setCurrentGradient(prev => (prev + 1) % gradients.length);

    // Save action to database for recommendations
    if (preferenceId) {
      await saveMovieAction(
        preferenceId,
        currentMovie.id,
        action,
        currentMovie.genres,
        currentMovie.language || 'en'
      );

      // Update intelligent recommendation engine
      if (useIntelligentRecommendations) {
        await intelligentRecommendationEngine.updateUserProfile(
          preferenceId,
          currentMovie.id,
          action,
          currentMovie
        );
      }
    }

    if (action === 'unwatched') {
      // Smart engine already handles watchlist
      setUnwatchedMovies(smartRecommendationEngine.getWatchlist());
    }

    if (!movie && currentIndex >= movies.length - 3 && !isFetching) {
      const hasMore = await fetchContent(currentPage + 1, true); // Always try personalized first
      if (hasMore) {
        setCurrentPage(prev => prev + 1);
      }
    }
    
    if (!movie) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleUndo = () => {
    if (undoInProgress) return;
    
    setUndoInProgress(true);
    const undoMovie = smartRecommendationEngine.undoLastSwipe();
    
    if (undoMovie && currentIndex > 0) {
      // Move back one movie
      setCurrentIndex(prev => prev - 1);
      
      // Remove from seen movies
      setSeenMovies(prev => {
        const next = new Set(prev);
        next.delete(undoMovie.id);
        localStorage.setItem('seenMovies', JSON.stringify(Array.from(next)));
        return next;
      });

      // Update watchlist
      setUnwatchedMovies(smartRecommendationEngine.getWatchlist());
      
      setLastUndoMovie(undoMovie);
      
      // Reset undo state after animation
      setTimeout(() => {
        setUndoInProgress(false);
        setLastUndoMovie(null);
      }, 500);
    } else {
      setUndoInProgress(false);
    }
  };
  const handleOnboardingComplete = async (name: string, preferences: UserPreferences) => {
    const profile = { name, preferences };
    setUserProfile(profile);
    localStorage.setItem('userProfile', JSON.stringify(profile));

    try {
      // Save preferences to Supabase
      const id = await saveUserPreferences(name, preferences);
      setPreferenceId(id);
      storePreferenceId(id);
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  const handleSettingsSave = async (name: string, preferences: UserPreferences) => {
    const profile = { name, preferences };
    setUserProfile(profile);
    localStorage.setItem('userProfile', JSON.stringify(profile));

    try {
      // Save updated preferences to Supabase
      const id = await saveUserPreferences(name, preferences);
      setPreferenceId(id);
      storePreferenceId(id);
    } catch (error) {
      console.error('Error updating preferences:', error);
    }

    setMovies([]);
    setCurrentIndex(0);
    setCurrentPage(1);
    setSeenMovies(new Set());
    localStorage.removeItem('seenMovies');

    setCurrentView('swipe');
  };

  const handleStartApp = () => {
    localStorage.setItem('hasSeenHomepage', 'true');
    setShowHomePage(false);
  };

  const handleResetApp = () => {
    smartRecommendationEngine.clearAllData();
    setUserProfile(null);
    localStorage.clear();
    setShowHomePage(true);
    setMovies([]);
    setCurrentIndex(0);
    setSeenMovies(new Set());
    setCurrentPage(1);
    setPreferenceId(null);
    setUnwatchedMovies([]);
  };

  if (showHomePage) {
    return <HomePage onStart={handleStartApp} />;
  }

  if (!userProfile) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  if (currentView === 'settings') {
    return (
      <Settings
        initialName={userProfile.name}
        initialPreferences={userProfile.preferences}
        onSave={handleSettingsSave}
        onBack={() => setCurrentView('swipe')}
        onSignOut={handleResetApp}
      />
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${gradients[currentGradient]} transition-colors duration-1000`}>
      <header className="app-header fixed top-0 left-0 right-0 z-30">
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-white" />
            <h1 className="text-lg font-bold text-white">What2WatchNxt</h1>
            <span className="text-xs text-white/60 bg-white/10 px-2 py-1 rounded-full">
              Smart AI
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {preferenceId && (
              <button
                onClick={() => setUseIntelligentRecommendations(!useIntelligentRecommendations)}
                className={`px-3 py-1 rounded-full text-xs transition ${
                  useIntelligentRecommendations
                    ? 'bg-green-500/20 text-green-300'
                    : 'bg-white/20 text-white/60'
                }`}
                title="Toggle intelligent recommendations"
              >
                {useIntelligentRecommendations ? 'AI On' : 'AI Off'}
              </button>
            )}
            <button
              onClick={() => setShowConnectionTest(true)}
              className="px-3 py-1 rounded-full text-xs bg-white/20 text-white/60 hover:bg-white/30 transition"
              title="Test Supabase connection"
            >
              Test DB
            </button>
            <button
              onClick={() => setShowUserStats(true)}
              className="px-3 py-1 rounded-full text-xs bg-white/20 text-white/60 hover:bg-white/30 transition"
              title="View your stats"
            >
              Stats
            </button>
            <button
              onClick={() => setCurrentView('settings')}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition"
              title="Settings"
            >
              <SettingsIcon className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-screen max-w-screen-xl items-center justify-center px-4">
        {currentView === 'swipe' && !showSurpriseMe ? (
          <div className="w-full max-w-6xl mx-auto">
            {movies.length > 0 ? (
              <div className="flex flex-col lg:flex-row gap-8">
                <div className="lg:w-1/2 relative">
                  <div className="movie-card-container">
                    {[3, 2, 1, 0].map(offset => {
                      const index = currentIndex + offset;
                      if (index >= movies.length) return null;
                      
                      return (
                        <MovieCard
                          key={`${movies[index].id}-${index}`}
                          movie={movies[index]}
                          active={offset === 0}
                          stackIndex={offset}
                          onAction={handleAction}
                        />
                      );
                    })}
                  </div>
                  
                  <UndoButton 
                    onUndo={handleUndo} 
                    disabled={undoInProgress || currentIndex === 0}
                  />
                </div>
              </div>
            ) : (
              <div className="text-center text-white/80">
                <p className="text-xl">
                  Loading AI-powered recommendations...
                </p>
                {useIntelligentRecommendations && (
                  <p className="text-sm mt-2">Using machine learning to find movies you'll love</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="watchlist-view w-full max-w-2xl mx-auto">
            {currentView === 'list' && (
              <WatchlistView
                movies={unwatchedMovies}
                onUpdate={() => {
                  setUnwatchedMovies(smartRecommendationEngine.getWatchlist());
                }}
              />
            )}
          </div>
        )}
      </main>

      <nav className="bottom-nav fixed bottom-0 left-0 right-0 z-30">
        <div className="max-w-screen-xl mx-auto px-4 py-2 flex justify-center gap-2">
          <button
            onClick={() => {
              setCurrentView('swipe');
              setShowSurpriseMe(false);
            }}
            className={`flex items-center gap-1 px-3 py-2 rounded-full transition ${
              currentView === 'swipe' && !showSurpriseMe
                ? 'bg-white/20 text-white'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Film className="h-5 w-5" />
            <span className="text-sm">Swipe</span>
          </button>
          <button
            onClick={() => {
              setCurrentView('list');
              setShowSurpriseMe(false);
            }}
            className={`flex items-center gap-1 px-3 py-2 rounded-full transition ${
              currentView === 'list'
                ? 'bg-white/20 text-white'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <ListVideo className="h-5 w-5" />
            <span className="text-sm">Watchlist</span>
          </button>
          <button
            onClick={() => setShowUserStats(true)}
            className="flex items-center gap-1 px-3 py-2 rounded-full transition text-white/60 hover:text-white hover:bg-white/10"
          >
            <BarChart3 className="h-5 w-5" />
            <span className="text-sm">Stats</span>
          </button>
          <button
            onClick={() => setShowSurpriseMe(true)}
            className={`flex items-center gap-1 px-3 py-2 rounded-full transition ${
              showSurpriseMe
                ? 'bg-white/20 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <Sparkles className="h-5 w-5" />
            <span className="text-sm">Surprise</span>
          </button>
        </div>
      </nav>

      {showSurpriseMe && (
        <SurpriseMe
          onClose={() => setShowSurpriseMe(false)}
          preferences={userProfile.preferences}
        />
      )}

      {showUserStats && (
        <UserStats onClose={() => setShowUserStats(false)} />
      )}

      {showConnectionTest && (
        <ConnectionTest onClose={() => setShowConnectionTest(false)} />
      )}
    </div>
  );
}

export default App;