import React, { useState } from 'react';
import { Sparkles, Zap, Globe, Calendar } from 'lucide-react';
import type { MovieLanguage, ContentType, UserPreferences } from '../types';

interface OnboardingProps {
  onComplete: (name: string, preferences: UserPreferences) => void;
  initialName?: string;
}

type Vibe = 'chill' | 'intense' | 'epic' | 'mindbending';
type TimeCommitment = 'movies' | 'series' | 'both';

const vibeToGenres: Record<Vibe, string[]> = {
  chill: ['Comedy', 'Romance', 'Family'],
  intense: ['Thriller', 'Drama', 'Mystery'],
  epic: ['Action', 'Adventure', 'Fantasy'],
  mindbending: ['Sci-Fi', 'Mystery', 'Thriller']
};

const currentYear = new Date().getFullYear();

export function Onboarding({ onComplete, initialName = '' }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [vibes, setVibes] = useState<Vibe[]>([]);
  const [timeCommitment, setTimeCommitment] = useState<TimeCommitment | null>(null);
  // Default to multi-language for global audience (English + Indian languages)
  const [languages] = useState<MovieLanguage[]>(['en', 'ta', 'hi', 'ml']);
  const [era, setEra] = useState<'modern' | 'classic' | 'any'>('modern');

  const handleComplete = () => {
    // Collect all genres from selected vibes
    const allGenres = vibes.length > 0
      ? [...new Set(vibes.flatMap(v => vibeToGenres[v]))]
      : ['Action', 'Comedy', 'Drama', 'Sci-Fi', 'Thriller']; // Smart defaults

    const preferences: UserPreferences = {
      languages,
      contentType: timeCommitment || 'both',
      seriesType: 'both',
      genres: allGenres,
      yearRange: era === 'modern'
        ? [2015, currentYear]
        : era === 'classic'
        ? [1900, 2000]
        : [1900, currentYear]
    };

    onComplete(initialName || 'User', preferences);
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
              <h2 className="text-3xl font-bold text-white mb-2">
                Welcome{initialName ? `, ${initialName}` : ''}!
              </h2>
              <p className="text-white/70">Let's find your perfect movie match</p>
            </div>

            <div className="space-y-6">
              <div>
                <p className="text-white font-semibold mb-3 text-center">What's your vibe?</p>
                <p className="text-white/60 text-sm text-center mb-4">Select all that apply</p>
              </div>
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
                  onClick={() => {
                    setVibes(prev =>
                      prev.includes(option.id as Vibe)
                        ? prev.filter(v => v !== option.id)
                        : [...prev, option.id as Vibe]
                    );
                  }}
                  className={`p-6 rounded-2xl border-2 transition-all transform hover:scale-105 ${
                    vibes.includes(option.id as Vibe)
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
                { id: 'movies', emoji: '🎬', title: 'Movies Only', desc: 'Feature films and cinema', time: 'Movies' },
                { id: 'series', emoji: '📺', title: 'Series Only', desc: 'TV shows and series', time: 'Series' },
                { id: 'both', emoji: '✨', title: 'Both', desc: 'Mix of movies and series', time: 'Both' }
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
            <span className="text-white/60 text-sm">Step {step + 1} of 3</span>
            <span className="text-white/60 text-sm">{Math.round(((step + 1) / 3) * 100)}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${((step + 1) / 3) * 100}%` }}
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

            {step < 2 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="flex-1 px-6 py-3 rounded-xl bg-white text-gray-900 hover:bg-white/90 transition font-semibold"
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
