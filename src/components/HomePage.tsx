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
    <div className="homepage min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 transition-all duration-1000">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Animated Background Shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-300/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-purple-300/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Logo/Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full mb-6 border border-white/30">
              <Sparkles className="h-4 w-4 text-yellow-300" />
              <span className="text-sm font-semibold text-white">Discover Movies You'll Love</span>
            </div>

            <h1 className="text-5xl sm:text-7xl font-bold text-white mb-6 leading-tight">
              Swipe. Watch.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-pink-200 to-purple-200">
                Repeat.
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-white/90 mb-4 max-w-2xl mx-auto leading-relaxed">
              <strong>Tinder for Movies</strong> – Swipe right on movies you love, left on ones you don't.
            </p>
            <p className="text-base sm:text-lg text-white/80 mb-10 max-w-2xl mx-auto">
              Get personalized recommendations from <strong>Netflix, Prime, Disney+</strong> and more.
              <br className="hidden sm:block" />
              English, Korean, Spanish, German content – all in one place.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={onStart}
                className="inline-flex items-center gap-2 px-8 py-4 text-lg font-bold text-purple-900 bg-white rounded-full hover:bg-white/90 transition transform hover:scale-105 shadow-2xl"
              >
                Start Swiping – It's Free
                <ArrowRight className="h-5 w-5" />
              </button>
              <p className="text-sm text-white/70">No signup required • No credit card</p>
            </div>
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
            className="bg-white/15 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition"
          >
            <div className="text-6xl mb-4">👉</div>
            <h3 className="text-xl font-bold text-white mb-3">
              1. Swipe Right
            </h3>
            <p className="text-white/80">
              Love it? Swipe right or tap the heart. It gets added to your watchlist.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-white/15 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition"
          >
            <div className="text-6xl mb-4">👈</div>
            <h3 className="text-xl font-bold text-white mb-3">
              2. Swipe Left
            </h3>
            <p className="text-white/80">
              Not interested? Swipe left to pass. The app learns your taste.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-white/15 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition"
          >
            <div className="text-6xl mb-4">🎬</div>
            <h3 className="text-xl font-bold text-white mb-3">
              3. Get Smarter Picks
            </h3>
            <p className="text-white/80">
              The more you swipe, the better our recommendations become.
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
          className="bg-white/10 backdrop-blur-md rounded-3xl p-12 border border-white/20"
        >
          <h2 className="text-4xl font-bold text-white mb-4">
            Stop Scrolling. Start Swiping.
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Join users discovering their next favorite movie in seconds, not hours.
          </p>
          <button
            onClick={onStart}
            className="inline-flex items-center gap-2 px-10 py-5 text-xl font-bold text-purple-900 bg-white rounded-full hover:bg-white/90 transition transform hover:scale-105 shadow-2xl"
          >
            Try Swipr Now – Free Forever
            <ArrowRight className="h-6 w-6" />
          </button>
        </motion.div>
      </div>
    </div>
  );
}