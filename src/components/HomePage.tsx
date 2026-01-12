import React, { useEffect, useState, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Film, Sparkles, ArrowRight } from 'lucide-react';
import { getMovies, getTVSeries } from '../lib/tmdb';
import type { Movie } from '../types';

interface HomePageProps {
  onStart: () => void;
}

export function HomePage({ onStart }: HomePageProps) {
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();

  // DESIGN TOGGLE: Change this number (1, 2, 3, or 4) to switch designs
  const DESIGN_OPTION = 1; // 1=Netflix Dark, 2=Clean White, 3=Deep Ocean, 4=Sunset Warm

  // Design configurations
  const designs = {
    1: {
      // Netflix Dark
      bgClass: 'bg-black',
      heroText: 'text-white',
      accentText: 'text-red-500',
      hookText: 'text-gray-300',
      ctaBg: 'bg-red-600 hover:bg-red-700',
      ctaText: 'text-white',
      cardBg: 'bg-zinc-900/80',
      cardBorder: 'border-red-600/40',
      featureDot1: 'from-red-600 to-red-700',
      featureDot2: 'from-gray-600 to-gray-700',
      featureDot3: 'from-red-500 to-orange-600',
    },
    2: {
      // Clean White
      bgClass: 'bg-white',
      heroText: 'text-slate-900',
      accentText: 'text-blue-600',
      hookText: 'text-slate-600',
      ctaBg: 'bg-slate-900 hover:bg-slate-800',
      ctaText: 'text-white',
      cardBg: 'bg-white shadow-xl',
      cardBorder: 'border-slate-200',
      featureDot1: 'from-blue-500 to-indigo-500',
      featureDot2: 'from-slate-400 to-slate-500',
      featureDot3: 'from-green-500 to-emerald-500',
    },
    3: {
      // Deep Ocean
      bgClass: 'bg-gradient-to-br from-slate-900 via-blue-950 to-teal-950',
      heroText: 'text-white',
      accentText: 'text-teal-400',
      hookText: 'text-teal-200',
      ctaBg: 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400',
      ctaText: 'text-slate-900',
      cardBg: 'bg-blue-950/50 backdrop-blur-md',
      cardBorder: 'border-teal-500/30',
      featureDot1: 'from-teal-400 to-cyan-400',
      featureDot2: 'from-blue-400 to-blue-500',
      featureDot3: 'from-emerald-400 to-teal-400',
    },
    4: {
      // Sunset Warm
      bgClass: 'bg-gradient-to-br from-purple-950 via-orange-950 to-pink-950',
      heroText: 'text-white',
      accentText: 'text-orange-400',
      hookText: 'text-orange-200',
      ctaBg: 'bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-400 hover:to-pink-400',
      ctaText: 'text-white',
      cardBg: 'bg-orange-950/50 backdrop-blur-md',
      cardBorder: 'border-orange-500/30',
      featureDot1: 'from-orange-500 to-pink-500',
      featureDot2: 'from-purple-500 to-purple-600',
      featureDot3: 'from-pink-500 to-rose-500',
    },
  };

  const d = designs[DESIGN_OPTION as keyof typeof designs];

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        // Fetch only English top-rated and popular movies for carousel
        const [popularMovies, topRatedMovies] = await Promise.all([
          getMovies(1, ['en'], []),
          getMovies(2, ['en'], [])
        ]);

        const allMovies = [
          ...(popularMovies.results || []).slice(0, 10),
          ...(topRatedMovies.results || []).slice(0, 10)
        ].sort(() => Math.random() - 0.5);

        // Duplicate movies for infinite scroll effect
        setTrendingMovies([...allMovies, ...allMovies]);
        console.log('🎬 HomePage carousel loaded:', allMovies.length, 'English movies');
      } catch (error) {
        console.error('Error fetching trending:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrending();
  }, []);

  useEffect(() => {
    if (!loading && scrollRef.current) {
      const scroll = async () => {
        await controls.start({
          x: [0, -1920],
          transition: {
            duration: 60, // Doubled the duration for slower scroll
            ease: "linear",
            repeat: Infinity
          }
        });
      };
      scroll();
    }
  }, [loading, controls]);

  return (
    <div className={`homepage min-h-screen ${d.bgClass} transition-all duration-1000`}>
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Animated Background Shapes - More subtle, flowing */}
        {DESIGN_OPTION !== 2 && ( // Skip background shapes for white theme
          <div className="absolute inset-0 overflow-hidden opacity-40">
            {/* Horizontal flowing waves instead of circles */}
            <div className="absolute top-1/4 left-0 right-0 h-64">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent blur-2xl"
                   style={{ animation: 'wave 8s ease-in-out infinite', transform: 'skewY(-6deg)' }}></div>
            </div>
            <div className="absolute top-1/2 left-0 right-0 h-48">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/3 to-transparent blur-3xl"
                   style={{ animation: 'wave 12s ease-in-out infinite reverse', animationDelay: '2s', transform: 'skewY(3deg)' }}></div>
            </div>
            <div className="absolute top-3/4 left-0 right-0 h-56">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/4 to-transparent blur-2xl"
                   style={{ animation: 'wave 10s ease-in-out infinite', animationDelay: '4s', transform: 'skewY(-4deg)' }}></div>
            </div>
          </div>
        )}

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Hook */}
            <p className={`text-base sm:text-lg ${d.hookText} mb-6 max-w-2xl mx-auto font-medium`}>
              Overwhelmed by choices on Netflix? Spending hours deciding what to watch?
            </p>

            <h1 className={`text-5xl sm:text-7xl font-bold ${d.heroText} mb-6 leading-tight`}>
              <span className={`${d.accentText}`}>
                Swipr
              </span>
              <br />
              Tinder for Movies
            </h1>

            <p className={`text-lg sm:text-xl ${d.heroText} opacity-90 mb-10 max-w-2xl mx-auto leading-relaxed`}>
              Swipe right to save, left to pass. Get personalized picks from <strong>Netflix, Prime, Disney+</strong> and more.
              <br className="hidden sm:block" />
              <span className={d.accentText}>English, Korean, Spanish, German</span> – all in one place.
            </p>

            <button
              onClick={onStart}
              className={`inline-flex items-center gap-2 px-10 py-5 text-xl font-bold ${d.ctaText} ${d.ctaBg} rounded-full transition transform hover:scale-105 shadow-2xl`}
            >
              Start Swiping Now
              <ArrowRight className="h-6 w-6" />
            </button>
          </motion.div>
        </div>
      </div>

      {/* Movie Carousel */}
      <div className="relative overflow-hidden py-8 bg-black/20">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6 px-4">Trending Movies</h2>
          
          <div className="relative overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center w-full py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            ) : (
              <motion.div
                ref={scrollRef}
                animate={controls}
                className="flex gap-4 px-4"
                style={{ width: "fit-content" }}
              >
                {trendingMovies.map((movie, index) => (
                  <motion.div
                    key={`${movie.id}-${index}`}
                    className="flex-none w-32"
                  >
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden group">
                      <img
                        src={`https://image.tmdb.org/t/p/w342${movie.posterPath}`}
                        alt={movie.title}
                        className="w-full h-full object-cover transition duration-300 group-hover:scale-110"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="absolute bottom-0 left-0 right-0 p-2">
                          <h3 className="text-white font-semibold text-xs line-clamp-2">{movie.title}</h3>
                          <p className="text-white/70 text-xs mt-1">
                            {new Date(movie.releaseDate).getFullYear()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className={`text-3xl font-bold ${d.heroText} text-center mb-12`}>
          How It Works
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={`${d.cardBg} rounded-2xl p-8 border ${d.cardBorder} hover:scale-105 transition-transform`}
          >
            <div className={`w-12 h-12 bg-gradient-to-br ${d.featureDot1} rounded-full mb-6`}></div>
            <h3 className={`text-2xl font-bold ${d.heroText} mb-3`}>
              Swipe Right
            </h3>
            <p className={`${d.heroText} opacity-80 leading-relaxed`}>
              Love it? Swipe right. It learns your taste and recommends similar content.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className={`${d.cardBg} rounded-2xl p-8 border ${d.cardBorder} hover:scale-105 transition-transform`}
          >
            <div className={`w-12 h-12 bg-gradient-to-br ${d.featureDot2} rounded-full mb-6`}></div>
            <h3 className={`text-2xl font-bold ${d.heroText} mb-3`}>
              Swipe Left
            </h3>
            <p className={`${d.heroText} opacity-80 leading-relaxed`}>
              Not interested? Swipe left to pass. The algorithm learns what you don't like.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className={`${d.cardBg} rounded-2xl p-8 border ${d.cardBorder} hover:scale-105 transition-transform`}
          >
            <div className={`w-12 h-12 bg-gradient-to-br ${d.featureDot3} rounded-full mb-6`}></div>
            <h3 className={`text-2xl font-bold ${d.heroText} mb-3`}>
              Swipe Up
            </h3>
            <p className={`${d.heroText} opacity-80 leading-relaxed`}>
              Want to watch later? Swipe up to add directly to your watchlist.
            </p>
          </motion.div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className={`${d.cardBg} rounded-3xl p-12 border ${d.cardBorder}`}
        >
          <h2 className={`text-4xl sm:text-5xl font-bold ${d.heroText} mb-6`}>
            Turn Browsing into Binge-Watching
          </h2>
          <p className={`text-xl ${d.heroText} opacity-90 mb-10 max-w-2xl mx-auto`}>
            Find your next favorite in 30 seconds, not 30 minutes.
          </p>
          <button
            onClick={onStart}
            className={`inline-flex items-center gap-3 px-12 py-6 text-xl font-bold ${d.ctaText} ${d.ctaBg} rounded-full transition transform hover:scale-105 shadow-2xl`}
          >
            Start Swiping
            <ArrowRight className="h-6 w-6" />
          </button>
        </motion.div>
      </div>
    </div>
  );
}