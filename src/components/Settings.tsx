import React, { useState } from 'react';
import { Film, Tv, Clock, Tag, ArrowLeft, RotateCcw, CheckSquare, Globe, MessageSquare, LogOut, Sparkles, Calendar } from 'lucide-react';
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

type Vibe = 'chill' | 'intense' | 'epic' | 'mindbending';

const vibeToGenres: Record<Vibe, string[]> = {
  chill: ['Comedy', 'Romance', 'Family'],
  intense: ['Thriller', 'Drama', 'Mystery'],
  epic: ['Action', 'Adventure', 'Fantasy'],
  mindbending: ['Sci-Fi', 'Mystery', 'Thriller']
};

const currentYear = new Date().getFullYear();

export function Settings({ initialName, initialPreferences, onSave, onBack, onSignOut }: SettingsProps) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [name, setName] = useState(initialName);
  const [preferences, setPreferences] = useState<UserPreferences>(initialPreferences);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Derive vibes from current genres
  const getVibesFromGenres = (genres: string[]): Vibe[] => {
    const vibes: Vibe[] = [];
    Object.entries(vibeToGenres).forEach(([vibe, vibeGenres]) => {
      if (vibeGenres.some(g => genres.includes(g))) {
        vibes.push(vibe as Vibe);
      }
    });
    return vibes;
  };

  const [selectedVibes, setSelectedVibes] = useState<Vibe[]>(getVibesFromGenres(initialPreferences.genres));

  const handleVibeToggle = (vibe: Vibe) => {
    const newVibes = selectedVibes.includes(vibe)
      ? selectedVibes.filter(v => v !== vibe)
      : [...selectedVibes, vibe];

    setSelectedVibes(newVibes);

    // Convert vibes to genres
    const allGenres = newVibes.length > 0
      ? [...new Set(newVibes.flatMap(v => vibeToGenres[v]))]
      : ['Action', 'Comedy', 'Drama', 'Sci-Fi', 'Thriller'];

    setPreferences(prev => ({
      ...prev,
      genres: allGenres
    }));
  };

  const handleContentTypeSelect = (type: ContentType) => {
    setPreferences(prev => ({
      ...prev,
      contentType: type
    }));
  };

  const handleEraSelect = (era: 'modern' | 'classic' | 'any') => {
    setPreferences(prev => ({
      ...prev,
      yearRange: era === 'modern'
        ? [2015, currentYear]
        : era === 'classic'
        ? [1900, 2000]
        : [1900, currentYear]
    }));
  };

  const handleLanguageToggle = (language: MovieLanguage) => {
    setPreferences(prev => ({
      ...prev,
      languages: prev.languages.includes(language)
        ? prev.languages.filter(l => l !== language)
        : [...prev.languages, language]
    }));
  };

  const handleReset = () => {
    // Clear all local storage
    localStorage.clear();
    // Force reload the page to start fresh
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-sky-50 settings-view">
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-700 hover:text-slate-900 transition"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Movies
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFeedback(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-100 text-sky-700 hover:bg-sky-200 transition border border-sky-200"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Feedback</span>
            </button>

            {onSignOut && (
              <button
                onClick={onSignOut}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 transition border border-orange-200"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            )}

            <button
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition border border-red-200"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl p-8 border border-sky-200 shadow-lg">
          <h1 className="text-2xl font-bold text-slate-900 mb-8">Settings</h1>

          <div className="space-y-8">
            {/* Name Section */}
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Your Name</h2>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-sky-50 text-slate-900 border border-sky-200 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              />
            </section>

            {/* Vibes Section */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-yellow-400" />
                <h2 className="text-lg font-semibold text-slate-900">What's Your Vibe?</h2>
              </div>
              <p className="text-slate-900/60 text-sm mb-4">Select all that apply</p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'chill', emoji: '😌', title: 'Chill & Light', desc: 'Comedy, Romance' },
                  { id: 'intense', emoji: '😰', title: 'Intense & Gripping', desc: 'Thriller, Drama' },
                  { id: 'epic', emoji: '🚀', title: 'Epic & Visual', desc: 'Action, Adventure' },
                  { id: 'mindbending', emoji: '🤯', title: 'Mind-Bending', desc: 'Sci-Fi, Mystery' }
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleVibeToggle(option.id as Vibe)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedVibes.includes(option.id as Vibe)
                        ? 'bg-gradient-to-br from-sky-100 to-cyan-100 border-sky-500'
                        : 'bg-sky-50 border-sky-200 hover:bg-sky-100'
                    }`}
                  >
                    <div className="text-3xl mb-2">{option.emoji}</div>
                    <div className="text-slate-900 font-semibold text-sm">{option.title}</div>
                    <div className="text-slate-900/60 text-xs mt-1">{option.desc}</div>
                  </button>
                ))}
              </div>
            </section>

            {/* Content Type Section */}
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Content Type</h2>
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => handleContentTypeSelect('movies')}
                  className={`p-4 rounded-lg text-left transition ${
                    preferences.contentType === 'movies'
                      ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white'
                      : 'bg-sky-50 text-slate-700 hover:bg-sky-100 border border-sky-200'
                  }`}
                >
                  <Film className="inline-block mr-2 h-5 w-5" />
                  Movies Only
                </button>
                <button
                  onClick={() => handleContentTypeSelect('series')}
                  className={`p-4 rounded-lg text-left transition ${
                    preferences.contentType === 'series'
                      ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white'
                      : 'bg-sky-50 text-slate-700 hover:bg-sky-100 border border-sky-200'
                  }`}
                >
                  <Tv className="inline-block mr-2 h-5 w-5" />
                  Series Only
                </button>
                <button
                  onClick={() => handleContentTypeSelect('both')}
                  className={`p-4 rounded-lg text-left transition ${
                    preferences.contentType === 'both'
                      ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white'
                      : 'bg-sky-50 text-slate-700 hover:bg-sky-100 border border-sky-200'
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
                  <h3 className="text-md font-semibold text-slate-900 mb-4">Series Length Preference</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <button
                      onClick={() => handleSeriesTypeSelect('mini')}
                      className={`p-4 rounded-lg text-left transition ${
                        preferences.seriesType === 'mini'
                          ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white'
                          : 'bg-sky-50 text-slate-700 hover:bg-sky-100 border border-sky-200'
                      }`}
                    >
                      <Clock className="inline-block mr-2 h-5 w-5" />
                      Mini Series
                    </button>
                    <button
                      onClick={() => handleSeriesTypeSelect('long')}
                      className={`p-4 rounded-lg text-left transition ${
                        preferences.seriesType === 'long'
                          ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white'
                          : 'bg-sky-50 text-slate-700 hover:bg-sky-100 border border-sky-200'
                      }`}
                    >
                      <Tv className="inline-block mr-2 h-5 w-5" />
                      Long Series
                    </button>
                    <button
                      onClick={() => handleSeriesTypeSelect('both')}
                      className={`p-4 rounded-lg text-left transition ${
                        preferences.seriesType === 'both'
                          ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white'
                          : 'bg-sky-50 text-slate-700 hover:bg-sky-100 border border-sky-200'
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

            {/* Era Preference Section */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-purple-400" />
                <h2 className="text-lg font-semibold text-slate-900">Prefer Old or New?</h2>
              </div>
              <div className="space-y-3">
                {[
                  { id: 'modern', emoji: '🆕', title: 'Modern Hits', desc: '2015 onwards' },
                  { id: 'classic', emoji: '📼', title: 'Timeless Classics', desc: 'Before 2000' },
                  { id: 'any', emoji: '🎞️', title: 'All Eras', desc: 'From silent films to today' }
                ].map((option) => {
                  const isSelected = preferences.yearRange[0] === (option.id === 'modern' ? 2015 : option.id === 'classic' ? 1900 : 1900) &&
                                    preferences.yearRange[1] === (option.id === 'modern' ? currentYear : option.id === 'classic' ? 2000 : currentYear);
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleEraSelect(option.id as any)}
                      className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                        isSelected
                          ? 'bg-gradient-to-br from-sky-100 to-cyan-100 border-sky-500'
                          : 'bg-sky-50 border-sky-200 hover:bg-sky-100'
                      }`}
                    >
                      <div className="text-3xl">{option.emoji}</div>
                      <div className="flex-1 text-left">
                        <div className="text-slate-900 font-semibold">{option.title}</div>
                        <div className="text-slate-900/60 text-sm">{option.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Language Preferences Section */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Globe className="h-5 w-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-slate-900">Content Languages</h2>
              </div>
              <p className="text-slate-900/60 text-sm mb-4">
                Select all languages you want to see. International hits like Dark, Money Heist, and Squid Game will appear!
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { code: 'en' as MovieLanguage, flag: '🇺🇸', name: 'English' },
                  { code: 'es' as MovieLanguage, flag: '🇪🇸', name: 'Spanish' },
                  { code: 'de' as MovieLanguage, flag: '🇩🇪', name: 'German' },
                  { code: 'ja' as MovieLanguage, flag: '🇯🇵', name: 'Japanese' },
                  { code: 'hi' as MovieLanguage, flag: '🇮🇳', name: 'Hindi' },
                  { code: 'ta' as MovieLanguage, flag: '🇮🇳', name: 'Tamil' },
                  { code: 'ml' as MovieLanguage, flag: '🇮🇳', name: 'Malayalam' },
                  { code: 'te' as MovieLanguage, flag: '🇮🇳', name: 'Telugu' }
                ].map((lang) => {
                  const isSelected = preferences.languages.includes(lang.code);
                  return (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageToggle(lang.code)}
                      className={`p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                        isSelected
                          ? 'bg-blue-500/20 border-blue-400'
                          : 'bg-sky-50 border-sky-200 hover:bg-sky-100'
                      }`}
                    >
                      <div className="text-2xl">{lang.flag}</div>
                      <div className="text-left flex-1">
                        <div className={`text-sm font-semibold ${isSelected ? 'text-blue-200' : 'text-slate-900/90'}`}>
                          {lang.name}
                        </div>
                      </div>
                      {isSelected && (
                        <CheckSquare className="h-4 w-4 text-blue-400" />
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-slate-900/50 text-xs mt-3">
                💡 Tip: Select multiple languages to discover highly-rated international content. Quality shows will be prioritized regardless of language!
              </p>
            </section>

            <button
              onClick={() => onSave(name, preferences)}
              className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-semibold hover:bg-white/90 transition"
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
            <h3 className="text-xl font-bold text-slate-900 mb-4">Reset Preferences?</h3>
            <p className="text-slate-900/80 mb-6">
              This will clear all your preferences and take you back to the onboarding screen. This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-sky-100 text-slate-900 hover:bg-sky-200 border border-sky-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-slate-900 hover:bg-red-600 transition"
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