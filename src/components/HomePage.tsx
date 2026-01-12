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

  // DESIGN TOGGLE: Change this number (1-5) to switch designs
  const DESIGN_OPTION = 1;

  const designs = {
    1: {
      // Midnight Teal - Dark with teal/cyan accents
      bgClass: 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950',
      heroText: 'text-white',
      accentText: 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400',
      hookText: 'text-slate-300',
      ctaBg: 'bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500',
      ctaText: 'text-slate-900 font-bold',
      cardBg: 'bg-slate-900/60 backdrop-blur-xl',
      cardBorder: 'border-teal-500/20',
      cardHover: 'hover:border-teal-400/40 hover:shadow-xl hover:shadow-teal-500/10',
      featureDot1: 'from-cyan-500 to-teal-600',
      featureDot2: 'from-teal-500 to-emerald-600',
      featureDot3: 'from-blue-500 to-cyan-600',
    },
    2: {
      // Carbon Black - Pure dark with minimal color
      bgClass: 'bg-black',
      heroText: 'text-white',
      accentText: 'text-white',
      hookText: 'text-gray-400',
      ctaBg: 'bg-white hover:bg-gray-100',
      ctaText: 'text-black font-bold',
      cardBg: 'bg-zinc-900/90 backdrop-blur-sm',
      cardBorder: 'border-zinc-700',
      cardHover: 'hover:border-zinc-500 hover:shadow-xl hover:shadow-white/5',
      featureDot1: 'from-gray-500 to-gray-600',
      featureDot2: 'from-zinc-500 to-zinc-600',
      featureDot3: 'from-slate-500 to-slate-600',
    },
    3: {
      // Forest Green - Dark with green/lime accents
      bgClass: 'bg-gradient-to-br from-zinc-950 via-emerald-950 to-zinc-950',
      heroText: 'text-white',
      accentText: 'text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-emerald-400',
      hookText: 'text-emerald-100',
      ctaBg: 'bg-gradient-to-r from-lime-600 to-emerald-600 hover:from-lime-500 hover:to-emerald-500',
      ctaText: 'text-zinc-900 font-bold',
      cardBg: 'bg-zinc-900/70 backdrop-blur-xl',
      cardBorder: 'border-emerald-500/20',
      cardHover: 'hover:border-emerald-400/40 hover:shadow-xl hover:shadow-emerald-500/10',
      featureDot1: 'from-lime-500 to-emerald-600',
      featureDot2: 'from-emerald-500 to-green-600',
      featureDot3: 'from-green-500 to-teal-600',
    },
    4: {
      // Electric Blue - Dark with bright blue accents
      bgClass: 'bg-gradient-to-br from-gray-950 via-blue-950 to-gray-950',
      heroText: 'text-white',
      accentText: 'text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-sky-400',
      hookText: 'text-blue-200',
      ctaBg: 'bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500',
      ctaText: 'text-white font-bold',
      cardBg: 'bg-gray-900/70 backdrop-blur-xl',
      cardBorder: 'border-blue-500/20',
      cardHover: 'hover:border-blue-400/40 hover:shadow-xl hover:shadow-blue-500/10',
      featureDot1: 'from-blue-500 to-indigo-600',
      featureDot2: 'from-sky-500 to-blue-600',
      featureDot3: 'from-indigo-500 to-blue-600',
    },
    5: {
      // Amber Glow - Dark with warm amber/orange accents
      bgClass: 'bg-gradient-to-br from-neutral-950 via-stone-900 to-neutral-950',
      heroText: 'text-white',
      accentText: 'text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400',
      hookText: 'text-amber-100',
      ctaBg: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500',
      ctaText: 'text-neutral-900 font-bold',
      cardBg: 'bg-neutral-900/70 backdrop-blur-xl',
      cardBorder: 'border-amber-500/20',
      cardHover: 'hover:border-amber-400/40 hover:shadow-xl hover:shadow-amber-500/10',
      featureDot1: 'from-amber-500 to-orange-600',
      featureDot2: 'from-orange-500 to-amber-600',
      featureDot3: 'from-yellow-500 to-orange-600',
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
        <div className="absolute inset-0 overflow-hidden opacity-30">
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
            className={`${d.cardBg} rounded-2xl p-8 border ${d.cardBorder} ${d.cardHover} hover:scale-105 transition-all duration-300`}
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
            className={`${d.cardBg} rounded-2xl p-8 border ${d.cardBorder} ${d.cardHover} hover:scale-105 transition-all duration-300`}
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
            className={`${d.cardBg} rounded-2xl p-8 border ${d.cardBorder} ${d.cardHover} hover:scale-105 transition-all duration-300`}
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