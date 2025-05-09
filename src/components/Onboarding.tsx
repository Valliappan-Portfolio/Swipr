import React, { useState } from 'react';
import { Film, Tv, Clock, Tag, Clapperboard, Globe, CheckSquare } from 'lucide-react';
import type { MovieLanguage, ContentType, SeriesType, UserPreferences } from '../types';
import { LANGUAGE_NAMES } from '../lib/tmdb';

interface OnboardingProps {
  onComplete: (name: string, preferences: UserPreferences) => void;
}

const languages: MovieLanguage[] = ['en', 'hi', 'ta', 'te', 'ml'];
const genres = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy',
  'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller'
];

const currentYear = new Date().getFullYear();
const yearRanges = [
  { label: 'All Time', value: [1900, currentYear] },
  { label: 'Last 5 Years', value: [currentYear - 5, currentYear] },
  { label: 'Last 10 Years', value: [currentYear - 10, currentYear] },
  { label: 'Last 20 Years', value: [currentYear - 20, currentYear] },
  { label: 'Classics (Before 1980)', value: [1900, 1980] }
];

const gradients = [
  'from-gray-900 via-purple-900 to-violet-900',
  'from-gray-900 via-blue-900 to-cyan-900',
  'from-slate-900 via-green-900 to-emerald-900',
  'from-zinc-900 via-indigo-900 to-slate-900',
  'from-stone-900 via-rose-900 to-slate-900',
  'from-neutral-900 via-teal-900 to-gray-900',
  'from-gray-900 via-slate-800 to-zinc-900',
  'from-slate-900 via-cyan-900 to-blue-900'
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [currentGradient, setCurrentGradient] = useState(0);
  const [preferences, setPreferences] = useState<UserPreferences>({
    languages: ['en'],
    contentType: 'both',
    seriesType: 'both',
    genres: [],
    yearRange: yearRanges[0].value
  });

  const canProceed = () => {
    switch (step) {
      case 0:
        return name.trim().length > 0;
      case 1:
        return preferences.languages.length > 0;
      case 2:
        return preferences.yearRange.length === 2;
      case 3:
        return preferences.contentType === 'movies' || 
          (preferences.contentType !== 'movies' && preferences.seriesType);
      case 4:
        return preferences.genres.length > 0;
      default:
        return false;
    }
  };

  const handleLanguageSelect = (language: MovieLanguage) => {
    setPreferences(prev => ({
      ...prev,
      languages: prev.languages.includes(language)
        ? prev.languages.filter(l => l !== language)
        : [...prev.languages, language]
    }));
    setCurrentGradient(prev => (prev + 1) % gradients.length);
  };

  const handleYearRangeSelect = (range: number[]) => {
    setPreferences(prev => ({
      ...prev,
      yearRange: range
    }));
    setCurrentGradient(prev => (prev + 1) % gradients.length);
  };

  const handleContentTypeSelect = (type: ContentType) => {
    setPreferences(prev => ({
      ...prev,
      contentType: type,
      seriesType: type === 'series' || type === 'both' ? 'both' : undefined
    }));
    setCurrentGradient(prev => (prev + 1) % gradients.length);
  };

  const handleSeriesTypeSelect = (type: SeriesType) => {
    setPreferences(prev => ({
      ...prev,
      seriesType: type
    }));
    setCurrentGradient(prev => (prev + 1) % gradients.length);
  };

  const handleGenreSelect = (genre: string) => {
    setPreferences(prev => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter(g => g !== genre)
        : [...prev.genres, genre]
    }));
    setCurrentGradient(prev => (prev + 1) % gradients.length);
  };

  const handleSelectAllGenres = () => {
    setPreferences(prev => ({
      ...prev,
      genres: prev.genres.length === genres.length ? [] : [...genres]
    }));
    setCurrentGradient(prev => (prev + 1) % gradients.length);
  };

  const renderNameStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <Clapperboard className="h-12 w-12 text-white mx-auto mb-4 animate-pulse" />
        <h1 className="text-3xl font-bold text-white mb-2">Welcome to What2WatchNxt</h1>
        <p className="text-white/80 text-lg">
          Your Personal Movie Adventure Begins Here
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-4 py-2 rounded-lg bg-white/10 text-white placeholder-white/50 border border-white/20 focus:outline-none focus:border-white/40"
          />
        </div>

        <button
          onClick={() => setStep(1)}
          disabled={!canProceed()}
          className={`w-full px-4 py-2 rounded-lg transition ${
            canProceed()
              ? 'bg-white text-purple-900 hover:bg-white/90'
              : 'bg-white/20 text-white/50 cursor-not-allowed'
          }`}
        >
          Start Your Journey
        </button>
      </div>
    </div>
  );

  const renderLanguagesStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <Globe className="h-12 w-12 text-white mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-white mb-2">Select Languages</h1>
        <p className="text-white/80">Choose the languages you prefer</p>
      </div>

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
    </div>
  );

  const renderYearRangeStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <Clock className="h-12 w-12 text-white mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-white mb-2">Movie Era</h1>
        <p className="text-white/80">What time period interests you most?</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {yearRanges.map(range => (
          <button
            key={range.label}
            onClick={() => handleYearRangeSelect(range.value)}
            className={`p-4 rounded-lg text-left transition ${
              preferences.yearRange[0] === range.value[0] && 
              preferences.yearRange[1] === range.value[1]
                ? 'bg-white/30 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            <Clock className="inline-block mr-2 h-5 w-5" />
            {range.label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderContentTypeStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="flex justify-center gap-2 mb-4">
          <Film className="h-12 w-12 text-white" />
          <Tv className="h-12 w-12 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Content Preferences</h1>
        <p className="text-white/80">What type of content do you prefer?</p>
      </div>

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
        <div className="mt-6">
          <h3 className="text-xl font-bold text-white mb-4">Series Length Preference</h3>
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
    </div>
  );

  const renderGenresStep = () => (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      <div className="text-center mb-8">
        <Tag className="h-12 w-12 text-white mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-white mb-2">Favorite Genres</h1>
        <p className="text-white/80">Select the genres you enjoy most</p>
      </div>

      <button
        onClick={handleSelectAllGenres}
        className="flex items-center justify-center gap-2 px-4 py-2 mb-4 rounded-lg bg-white/10 text-white hover:bg-white/20 transition"
      >
        <CheckSquare className="h-5 w-5" />
        <span>{preferences.genres.length === genres.length ? 'Deselect All' : 'Select All'}</span>
      </button>

      <div className="grid grid-cols-2 gap-4 overflow-y-auto scrollbar-hide pb-4">
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
    </div>
  );

  return (
    <div className={`min-h-screen bg-gradient-to-br ${gradients[currentGradient]} transition-colors duration-1000 flex items-center justify-center p-4`}>
      <div className="bg-black/20 backdrop-blur-lg rounded-xl p-6 sm:p-8 w-full max-w-2xl">
        {step === 0 && renderNameStep()}
        {step === 1 && renderLanguagesStep()}
        {step === 2 && renderYearRangeStep()}
        {step === 3 && renderContentTypeStep()}
        {step === 4 && renderGenresStep()}
        
        {step > 0 && (
          <div className="mt-6 sm:mt-8 flex justify-between">
            <button
              onClick={() => setStep(prev => prev - 1)}
              className="px-4 sm:px-6 py-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition"
            >
              Back
            </button>
            
            <button
              onClick={() => {
                if (step < 4) {
                  setStep(prev => prev + 1);
                  setCurrentGradient(prev => (prev + 1) % gradients.length);
                } else {
                  onComplete(name, preferences);
                }
              }}
              disabled={!canProceed()}
              className={`px-4 sm:px-6 py-2 rounded-full transition ${
                canProceed()
                  ? 'bg-white text-purple-900 hover:bg-white/90'
                  : 'bg-white/20 text-white/50 cursor-not-allowed'
              }`}
            >
              {step === 4 ? 'Start Exploring' : 'Next'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}