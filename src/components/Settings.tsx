import React, { useState } from 'react';
import { Film, Tv, Clock, Tag, ArrowLeft, RotateCcw, CheckSquare, Globe, MessageSquare, LogOut } from 'lucide-react';
import type { MovieLanguage, ContentType, SeriesType, UserPreferences } from '../types';
import { LANGUAGE_NAMES } from '../lib/tmdb';
import { FeedbackForm } from './FeedbackForm';

interface SettingsProps {
  initialName: string;
  initialPreferences: UserPreferences;
  onSave: (name: string, preferences: UserPreferences) => void;
  onBack: () => void;
  onSignOut?: () => void;
}

const languages: MovieLanguage[] = ['en', 'ta', 'de', 'es'];
const genres = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy',
  'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller'
];

export function Settings({ initialName, initialPreferences, onSave, onBack, onSignOut }: SettingsProps) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [name, setName] = useState(initialName);
  const [preferences, setPreferences] = useState<UserPreferences>(initialPreferences);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleLanguageSelect = (language: MovieLanguage) => {
    setPreferences(prev => ({
      ...prev,
      languages: prev.languages.includes(language)
        ? prev.languages.filter(l => l !== language)
        : [...prev.languages, language]
    }));
  };

  const handleContentTypeSelect = (type: ContentType) => {
    setPreferences(prev => ({
      ...prev,
      contentType: type,
      seriesType: type === 'series' || type === 'both' ? 'both' : undefined
    }));
  };

  const handleSeriesTypeSelect = (type: SeriesType) => {
    setPreferences(prev => ({
      ...prev,
      seriesType: type
    }));
  };

  const handleGenreSelect = (genre: string) => {
    setPreferences(prev => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter(g => g !== genre)
        : [...prev.genres, genre]
    }));
  };

  const handleSelectAllGenres = () => {
    setPreferences(prev => ({
      ...prev,
      genres: prev.genres.length === genres.length ? [] : [...genres]
    }));
  };

  const handleReset = () => {
    // Clear all local storage
    localStorage.clear();
    // Force reload the page to start fresh
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 settings-view">
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-white hover:text-white/80 transition"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Movies
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFeedback(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 transition"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Feedback</span>
            </button>

            {onSignOut && (
              <button
                onClick={onSignOut}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 transition"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            )}

            <button
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>

        <div className="bg-black/20 backdrop-blur-lg rounded-xl p-8">
          <h1 className="text-2xl font-bold text-white mb-8">Settings</h1>

          <div className="space-y-8">
            {/* Name Section */}
            <section>
              <h2 className="text-lg font-semibold text-white mb-4">Your Name</h2>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:border-white/40"
              />
            </section>

            {/* Languages Section */}
            <section>
              <h2 className="text-lg font-semibold text-white mb-4">Languages</h2>
              <div className="grid grid-cols-2 gap-4">
                {languages.map(language => (
                  <button
                    key={language}
                    onClick={() => handleLanguageSelect(language)}
                    className={`p-4 rounded-lg text-left transition ${
                      preferences.languages.includes(language)
                        ? 'bg-white/30 text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    <Globe className="inline-block mr-2 h-5 w-5" />
                    {LANGUAGE_NAMES[language]}
                  </button>
                ))}
              </div>
            </section>

            {/* Content Type Section */}
            <section>
              <h2 className="text-lg font-semibold text-white mb-4">Content Type</h2>
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => handleContentTypeSelect('movies')}
                  className={`p-4 rounded-lg text-left transition ${
                    preferences.contentType === 'movies'
                      ? 'bg-white/30 text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  <Film className="inline-block mr-2 h-5 w-5" />
                  Movies Only
                </button>
                <button
                  onClick={() => handleContentTypeSelect('series')}
                  className={`p-4 rounded-lg text-left transition ${
                    preferences.contentType === 'series'
                      ? 'bg-white/30 text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  <Tv className="inline-block mr-2 h-5 w-5" />
                  Series Only
                </button>
                <button
                  onClick={() => handleContentTypeSelect('both')}
                  className={`p-4 rounded-lg text-left transition ${
                    preferences.contentType === 'both'
                      ? 'bg-white/30 text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  <div className="flex items-center">
                    <Film className="mr-1 h-5 w-5" />
                    <Tv className="mr-2 h-5 w-5" />
                    Both
                  </div>
                </button>
              </div>

              {(preferences.contentType === 'series' || preferences.contentType === 'both') && (
                <div className="mt-4">
                  <h3 className="text-md font-semibold text-white mb-4">Series Length Preference</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <button
                      onClick={() => handleSeriesTypeSelect('mini')}
                      className={`p-4 rounded-lg text-left transition ${
                        preferences.seriesType === 'mini'
                          ? 'bg-white/30 text-white'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      <Clock className="inline-block mr-2 h-5 w-5" />
                      Mini Series
                    </button>
                    <button
                      onClick={() => handleSeriesTypeSelect('long')}
                      className={`p-4 rounded-lg text-left transition ${
                        preferences.seriesType === 'long'
                          ? 'bg-white/30 text-white'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      <Tv className="inline-block mr-2 h-5 w-5" />
                      Long Series
                    </button>
                    <button
                      onClick={() => handleSeriesTypeSelect('both')}
                      className={`p-4 rounded-lg text-left transition ${
                        preferences.seriesType === 'both'
                          ? 'bg-white/30 text-white'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      <div className="flex items-center">
                        <Clock className="mr-1 h-5 w-5" />
                        <Tv className="mr-2 h-5 w-5" />
                        Both
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* Genres Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Favorite Genres</h2>
                <button
                  onClick={handleSelectAllGenres}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition"
                >
                  <CheckSquare className="h-4 w-4" />
                  {preferences.genres.length === genres.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {genres.map(genre => (
                  <button
                    key={genre}
                    onClick={() => handleGenreSelect(genre)}
                    className={`p-4 rounded-lg text-left transition ${
                      preferences.genres.includes(genre)
                        ? 'bg-white/30 text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    <Tag className="inline-block mr-2 h-5 w-5" />
                    {genre}
                  </button>
                ))}
              </div>
            </section>

            <button
              onClick={() => onSave(name, preferences)}
              className="w-full px-6 py-3 rounded-lg bg-white text-purple-900 font-semibold hover:bg-white/90 transition"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {showFeedback && (
        <FeedbackForm onClose={() => setShowFeedback(false)} />
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Reset Preferences?</h3>
            <p className="text-white/80 mb-6">
              This will clear all your preferences and take you back to the onboarding screen. This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}