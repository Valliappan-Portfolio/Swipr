import React, { useState } from 'react';
import { Sparkles, Zap, Globe, Calendar } from 'lucide-react';
import type { MovieLanguage, ContentType, UserPreferences } from '../types';

interface OnboardingProps {
  onComplete: (name: string, preferences: UserPreferences) => void;
}

type Vibe = 'chill' | 'intense' | 'epic' | 'mindbending';
type TimeCommitment = 'quick' | 'series' | 'both';

const vibeToGenres: Record<Vibe, string[]> = {
  chill: ['Comedy', 'Romance', 'Family'],
  intense: ['Thriller', 'Drama', 'Mystery'],
  epic: ['Action', 'Adventure', 'Fantasy'],
  mindbending: ['Sci-Fi', 'Mystery', 'Thriller']
};

const currentYear = new Date().getFullYear();

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [vibe, setVibe] = useState<Vibe | null>(null);
  const [timeCommitment, setTimeCommitment] = useState<TimeCommitment | null>(null);
  const [languages, setLanguages] = useState<MovieLanguage[]>(['en']);
  const [era, setEra] = useState<'modern' | 'classic' | 'any'>('modern');

  const handleComplete = () => {
    if (!vibe || !timeCommitment) return;

    const preferences: UserPreferences = {
      languages,
      contentType: timeCommitment === 'quick' ? 'movies' : timeCommitment === 'series' ? 'series' : 'both',
      seriesType: 'both',
      genres: vibeToGenres[vibe],
      yearRange: era === 'modern'
        ? [2015, currentYear]
        : era === 'classic'
        ? [1900, 2000]
        : [1900, currentYear]
    };

    onComplete(name || 'Movie Lover', preferences);
  };

  const gradients = [
    'from-purple-900 via-pink-900 to-rose-900',
    'from-blue-900 via-cyan-900 to-teal-900',
    'from-indigo-900 via-purple-900 to-pink-900',
    'from-emerald-900 via-teal-900 to-cyan-900'
  ];

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-8 animate-fadeIn">
            <div className="text-center">
              <Sparkles className="h-16 w-16 text-yellow-400 mx-auto mb-4 animate-pulse" />
              <h2 className="text-3xl font-bold text-white mb-2">What's your vibe?</h2>
              <p className="text-white/70">Pick what you're in the mood for</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { id: 'chill', emoji: '😌', title: 'Chill & Light', desc: 'Comedy, Romance, Easy watching' },
                { id: 'intense', emoji: '😰', title: 'Intense & Gripping', desc: 'Thriller, Drama, Edge of seat' },
                { id: 'epic', emoji: '🚀', title: 'Epic & Visual', desc: 'Action, Adventure, Blockbusters' },
                { id: 'mindbending', emoji: '🤯', title: 'Mind-Bending', desc: 'Sci-Fi, Mystery, Plot twists' }
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => setVibe(option.id as Vibe)}
                  className={`p-6 rounded-2xl border-2 transition-all transform hover:scale-105 ${
                    vibe === option.id
                      ? 'bg-white/20 border-white shadow-lg shadow-white/20'
                      : 'bg-white/5 border-white/20 hover:bg-white/10'
                  }`}
                >
                  <div className="text-4xl mb-2">{option.emoji}</div>
                  <div className="text-white font-semibold mb-1">{option.title}</div>
                  <div className="text-white/60 text-xs">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-8 animate-fadeIn">
            <div className="text-center">
              <Zap className="h-16 w-16 text-blue-400 mx-auto mb-4 animate-pulse" />
              <h2 className="text-3xl font-bold text-white mb-2">How much time do you have?</h2>
              <p className="text-white/70">We'll match the perfect length</p>
            </div>

            <div className="space-y-4">
              {[
                { id: 'quick', emoji: '⚡', title: 'Quick Escape', desc: 'Movies under 2 hours', time: '< 2hrs' },
                { id: 'series', emoji: '📺', title: 'Ready to Binge', desc: 'TV series & shows', time: 'Series' },
                { id: 'both', emoji: '🎬', title: 'I\'m Flexible', desc: 'Show me everything', time: 'Any' }
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => setTimeCommitment(option.id as TimeCommitment)}
                  className={`w-full p-6 rounded-2xl border-2 transition-all transform hover:scale-102 flex items-center gap-4 ${
                    timeCommitment === option.id
                      ? 'bg-white/20 border-white shadow-lg shadow-white/20'
                      : 'bg-white/5 border-white/20 hover:bg-white/10'
                  }`}
                >
                  <div className="text-4xl">{option.emoji}</div>
                  <div className="flex-1 text-left">
                    <div className="text-white font-semibold">{option.title}</div>
                    <div className="text-white/60 text-sm">{option.desc}</div>
                  </div>
                  <div className="text-white/80 font-mono text-sm bg-white/10 px-3 py-1 rounded-full">
                    {option.time}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-8 animate-fadeIn">
            <div className="text-center">
              <Globe className="h-16 w-16 text-green-400 mx-auto mb-4 animate-pulse" />
              <h2 className="text-3xl font-bold text-white mb-2">Language preference?</h2>
              <p className="text-white/70">Select all that apply</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'en', flag: '🇺🇸', name: 'English' },
                { id: 'ta', flag: '🇮🇳', name: 'Tamil' },
                { id: 'de', flag: '🇩🇪', name: 'German' },
                { id: 'es', flag: '🇪🇸', name: 'Spanish' }
              ].map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => {
                    setLanguages(prev =>
                      prev.includes(lang.id as MovieLanguage)
                        ? prev.filter(l => l !== lang.id)
                        : [...prev, lang.id as MovieLanguage]
                    );
                  }}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    languages.includes(lang.id as MovieLanguage)
                      ? 'bg-white/20 border-white'
                      : 'bg-white/5 border-white/20 hover:bg-white/10'
                  }`}
                >
                  <div className="text-3xl mb-1">{lang.flag}</div>
                  <div className="text-white font-medium text-sm">{lang.name}</div>
                </button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-8 animate-fadeIn">
            <div className="text-center">
              <Calendar className="h-16 w-16 text-purple-400 mx-auto mb-4 animate-pulse" />
              <h2 className="text-3xl font-bold text-white mb-2">Prefer old or new?</h2>
              <p className="text-white/70">When were your favorites made?</p>
            </div>

            <div className="space-y-4">
              {[
                { id: 'modern', emoji: '🆕', title: 'Modern Hits', desc: '2015 onwards', range: '2015+' },
                { id: 'classic', emoji: '📼', title: 'Timeless Classics', desc: 'Before 2000', range: '< 2000' },
                { id: 'any', emoji: '🎞️', title: 'All Eras', desc: 'From silent films to today', range: 'Any' }
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => setEra(option.id as any)}
                  className={`w-full p-6 rounded-2xl border-2 transition-all flex items-center gap-4 ${
                    era === option.id
                      ? 'bg-white/20 border-white shadow-lg shadow-white/20'
                      : 'bg-white/5 border-white/20 hover:bg-white/10'
                  }`}
                >
                  <div className="text-4xl">{option.emoji}</div>
                  <div className="flex-1 text-left">
                    <div className="text-white font-semibold">{option.title}</div>
                    <div className="text-white/60 text-sm">{option.desc}</div>
                  </div>
                  <div className="text-white/80 font-mono text-sm bg-white/10 px-3 py-1 rounded-full">
                    {option.range}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${gradients[step]} transition-all duration-1000 flex items-center justify-center p-4`}>
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-white/60 text-sm">Step {step + 1} of 4</span>
            <span className="text-white/60 text-sm">{Math.round(((step + 1) / 4) * 100)}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${((step + 1) / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
          {renderStep()}

          {/* Navigation */}
          <div className="flex gap-4 mt-8">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-6 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition font-semibold"
              >
                Back
              </button>
            )}

            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 0 && !vibe) ||
                  (step === 1 && !timeCommitment) ||
                  (step === 2 && languages.length === 0)
                }
                className="flex-1 px-6 py-3 rounded-xl bg-white text-gray-900 hover:bg-white/90 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition font-semibold shadow-lg"
              >
                Start Swiping! 🎬
              </button>
            )}
          </div>
        </div>

        {/* Skip Option */}
        {step === 0 && (
          <div className="text-center mt-4">
            <button
              onClick={() => handleComplete()}
              className="text-white/60 hover:text-white text-sm transition"
            >
              Skip and use smart defaults →
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
