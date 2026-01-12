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
    <div className="homepage min-h-screen bg-gradient-to-br from-slate-900 via-cyan-900 to-blue-900 transition-all duration-1000">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Animated Background Shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-400/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-teal-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Hook */}
            <p className="text-base sm:text-lg text-cyan-200 mb-6 max-w-2xl mx-auto font-medium">
              Tired of endless scrolling through Netflix? Wasting hours deciding what to watch?
            </p>

            <h1 className="text-5xl sm:text-7xl font-bold text-white mb-6 leading-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300">
                Swipr
              </span>
              <br />
              Tinder for Movies
            </h1>

            <p className="text-lg sm:text-xl text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed">
              Swipe right to save, left to pass. Get personalized picks from <strong>Netflix, Prime, Disney+</strong> and more.
              <br className="hidden sm:block" />
              <span className="text-cyan-200">English, Korean, Spanish, German</span> – all in one place.
            </p>

            <button
              onClick={onStart}
              className="inline-flex items-center gap-2 px-10 py-5 text-xl font-bold text-slate-900 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full hover:from-cyan-300 hover:to-blue-300 transition transform hover:scale-105 shadow-2xl"
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
        <h2 className="text-3xl font-bold text-white text-center mb-12">
          How It Works
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-cyan-400/30 hover:border-cyan-400/50 transition"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-400 rounded-full mb-6"></div>
            <h3 className="text-2xl font-bold text-white mb-3">
              Swipe Right
            </h3>
            <p className="text-white/80 leading-relaxed">
              Love it? Swipe right. It learns your taste and recommends similar content.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-cyan-400/30 hover:border-cyan-400/50 transition"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-slate-400 to-gray-400 rounded-full mb-6"></div>
            <h3 className="text-2xl font-bold text-white mb-3">
              Swipe Left
            </h3>
            <p className="text-white/80 leading-relaxed">
              Not interested? Swipe left to pass. The algorithm learns what you don't like.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-cyan-400/30 hover:border-cyan-400/50 transition"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-400 rounded-full mb-6"></div>
            <h3 className="text-2xl font-bold text-white mb-3">
              Swipe Up
            </h3>
            <p className="text-white/80 leading-relaxed">
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
          className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 backdrop-blur-md rounded-3xl p-12 border border-cyan-400/30"
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Stop Wasting Time Scrolling
          </h2>
          <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
            Find your next favorite movie in 30 seconds, not 30 minutes.
          </p>
          <button
            onClick={onStart}
            className="inline-flex items-center gap-3 px-12 py-6 text-xl font-bold text-slate-900 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full hover:from-cyan-300 hover:to-blue-300 transition transform hover:scale-105 shadow-2xl"
          >
            Start Swiping
            <ArrowRight className="h-6 w-6" />
          </button>
        </motion.div>
      </div>
    </div>
  );
}