import React, { useState, useEffect } from 'react';
import { Film, Settings as SettingsIcon, Share2, ListVideo, Sparkles } from 'lucide-react';
import { MovieCard } from './components/MovieCard';
import { HomePage } from './components/HomePage';
import { Onboarding } from './components/Onboarding';
import { Settings } from './components/Settings';
import { WatchlistView } from './components/WatchlistView';
import { SurpriseMe } from './components/SurpriseMe';
import { Recommendations } from './components/Recommendations';
import { getMovies, getTVSeries } from './lib/tmdb';
import type { Movie, MovieActionType, UserPreferences, ViewType } from './types';
import { supabase, loadExistingPreferences } from './lib/supabase';

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
    // Check if user has seen homepage and has no existing preferences
    return !localStorage.getItem('hasSeenHomepage') || !localStorage.getItem('preferenceId');
  });
  const [movies, setMovies] = useState<Movie[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [userProfile, setUserProfile] = useState<{ name: string; preferences: UserPreferences } | null>(null);
  const [currentGradient, setCurrentGradient] = useState(0);
  const [currentView, setCurrentView] = useState<ViewType>('swipe');
  const [showSurpriseMe, setShowSurpriseMe] = useState(false);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [seenMovies, setSeenMovies] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [unwatchedMovies, setUnwatchedMovies] = useState<Movie[]>([]);

  // Load existing preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      const savedPreferences = await loadExistingPreferences();
      if (savedPreferences) {
        setUserProfile(savedPreferences);
      }
    };
    loadPreferences();
  }, []);

  useEffect(() => {
    const savedSeenMovies = localStorage.getItem('seenMovies');
    if (savedSeenMovies) {
      setSeenMovies(new Set(JSON.parse(savedSeenMovies)));
    }
  }, []);

  const fetchContent = async (page: number) => {
    if (!userProfile?.preferences || isFetching) return;

    setIsFetching(true);
    setError(null);
    
    try {
      let allContent: Movie[] = [];
      const { preferences } = userProfile;
      
      if (preferences.contentType === 'movies' || preferences.contentType === 'both') {
        const movieResponse = await getMovies(page, preferences.languages, preferences.genres);
        if (movieResponse.results) {
          allContent = [...allContent, ...movieResponse.results];
        }
      }
      
      if (preferences.contentType === 'series' || preferences.contentType === 'both') {
        const seriesResponse = await getTVSeries(page, preferences.languages, preferences.genres);
        if (seriesResponse.results) {
          allContent = [...allContent, ...seriesResponse.results];
        }
      }

      // Filter out seen movies and null/undefined values
      const newContent = allContent
        .filter(item => item && item.id && !seenMovies.has(item.id))
        .filter(item => item.posterPath);

      if (newContent.length === 0 && page < 5) {
        return await fetchContent(page + 1);
      }

      const sortedContent = newContent.sort(() => Math.random() - 0.5);
      setMovies(prev => [...prev, ...sortedContent]);
      
      return sortedContent.length > 0;
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
    fetchContent(currentPage);
  }, [userProfile?.preferences]);

  const handleAction = async (action: MovieActionType, movie?: Movie) => {
    if (movies.length === 0 && !movie) return;
    
    const currentMovie = movie || movies[currentIndex];
    
    setSeenMovies(prev => {
      const next = new Set(prev);
      next.add(currentMovie.id);
      localStorage.setItem('seenMovies', JSON.stringify(Array.from(next)));
      return next;
    });
    
    setCurrentGradient(prev => (prev + 1) % gradients.length);

    if (supabase && preferenceId) {
      try {
        await supabase.from('anonymous_actions').insert({
          preference_id: preferenceId,
          movie_id: currentMovie.id,
          action: action,
          genres: currentMovie.genres,
          language: currentMovie.language
        });

        if (action === 'unwatched') {
          setUnwatchedMovies(prev => [...prev, currentMovie]);
        }
      } catch (error) {
        console.error('Error saving action:', error);
      }
    }

    if (!movie && currentIndex >= movies.length - 3 && !isFetching) {
      const hasMore = await fetchContent(currentPage + 1);
      if (hasMore) {
        setCurrentPage(prev => prev + 1);
      }
    }
    
    if (!movie) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleOnboardingComplete = async (name: string, preferences: UserPreferences) => {
    const profile = { name, preferences };
    setUserProfile(profile);

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('anonymous_preferences')
          .insert({
            name: name,
            languages: preferences.languages,
            content_type: preferences.contentType,
            series_type: preferences.seriesType,
            genres: preferences.genres
          })
          .select()
          .single();

        if (error) throw error;
        if (data) setPreferenceId(data.id);
      } catch (error) {
        console.error('Error saving preferences:', error);
      }
    }
  };

  const handleSettingsSave = async (name: string, preferences: UserPreferences) => {
    const profile = { name, preferences };
    setUserProfile(profile);

    setMovies([]);
    setCurrentIndex(0);
    setCurrentPage(1);
    setSeenMovies(new Set());
    localStorage.removeItem('seenMovies');

    if (supabase && preferenceId) {
      try {
        await supabase
          .from('anonymous_preferences')
          .update({
            name: name,
            languages: preferences.languages,
            content_type: preferences.contentType,
            series_type: preferences.seriesType,
            genres: preferences.genres,
            last_active: new Date().toISOString()
          })
          .eq('id', preferenceId);
      } catch (error) {
        console.error('Error updating preferences:', error);
      }
    }

    setCurrentView('swipe');
  };

  const handleStartApp = () => {
    localStorage.setItem('hasSeenHomepage', 'true');
    setShowHomePage(false);
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
          </div>
          
          <button
            onClick={() => setCurrentView('settings')}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition"
            title="Settings"
          >
            <SettingsIcon className="h-5 w-5 text-white" />
          </button>
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
                </div>
                
                <div className="lg:w-1/2">
                  {preferenceId && (
                    <Recommendations
                      preferenceId={preferenceId}
                      onMovieSelect={(movie) => {
                        // Add to watchlist
                        handleAction('unwatched', movie);
                      }}
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-white/80">
                <p className="text-xl">Loading movies...</p>
              </div>
            )}
          </div>
        ) : (
          <div className="watchlist-view w-full max-w-2xl mx-auto">
            {currentView === 'list' && (
              <WatchlistView
                movies={unwatchedMovies}
                onUpdate={() => {
                  setUnwatchedMovies(prev => 
                    prev.filter(m => m.id !== movies[currentIndex].id)
                  );
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
    </div>
  );
}

export default App;