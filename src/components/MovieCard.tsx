import React, { useState, useEffect, useRef } from 'react';
import { motion, PanInfo, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import { Heart, X, BookmarkPlus, Star, Clock, Globe, Users, Calendar } from 'lucide-react';
import type { Movie, MovieActionType } from '../types';
import { LANGUAGE_NAMES } from '../lib/tmdb';
import { getPosterUrl, getMovieDetails } from '../lib/tmdb';

interface MovieCardProps {
  movie: Movie;
  onAction: (action: MovieActionType) => void;
  active?: boolean;
  stackIndex?: number;
}

interface MovieDetails {
  cast: { name: string; character: string; profilePath: string | null }[];
  crew: { name: string; job: string }[];
  runtime: number;
}
export function MovieCard({ movie, onAction, active = true, stackIndex = 0 }: MovieCardProps) {
  const controls = useAnimation();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const [showTutorial, setShowTutorial] = useState(() => {
    return !localStorage.getItem('hasSeenTutorial');
  });
  const [isHovered, setIsHovered] = useState(false);
  const [posterLoaded, setPosterLoaded] = useState(false);
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [movieDetails, setMovieDetails] = useState<MovieDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const detailsTimeoutRef = useRef<number>();
  const isDraggingRef = useRef(false);
  
  const opacity = useTransform(
    x,
    [-200, -150, 0, 150, 200],
    [0.5, 0.8, 1, 0.8, 0.5]
  );

  const scale = useTransform(
    x,
    [-200, -100, 0, 100, 200],
    [0.8, 0.9, 1, 0.9, 0.8]
  );

  const likeScale = useTransform(x, [0, 150], [1, 1.2]);
  const passScale = useTransform(x, [-150, 0], [1.2, 1]);
  const unwatchedScale = useTransform(y, [-150, 0], [1.2, 1]);

  const likeOpacity = useTransform(x, [0, 150], [0, 1]);
  const passOpacity = useTransform(x, [-150, 0], [1, 0]);
  const unwatchedOpacity = useTransform(y, [-150, 0], [1, 0]);

  // Stack positioning
  const stackY = 8 * stackIndex;
  const stackScale = 1 - (stackIndex * 0.05);
  const stackRotate = -2 * stackIndex;
  const stackOpacity = 1 - (stackIndex * 0.2);

  // Fetch movie details when card becomes active
  useEffect(() => {
    if (active && !movieDetails && !loadingDetails) {
      const fetchDetails = async () => {
        setLoadingDetails(true);
        try {
          const details = await getMovieDetails(movie.id, movie.type);
          if (details) {
            setMovieDetails({
              cast: details.cast,
              crew: details.crew,
              runtime: details.runtime
            });
          }
        } catch (error) {
          console.error('Error fetching movie details:', error);
        } finally {
          setLoadingDetails(false);
        }
      };
      
      // Delay fetching to avoid too many API calls
      const timeout = setTimeout(fetchDetails, 1000);
      return () => clearTimeout(timeout);
    }
  }, [active, movie.id, movie.type, movieDetails, loadingDetails]);
  useEffect(() => {
    if (!active || showTutorial || isDraggingRef.current) return;

    detailsTimeoutRef.current = window.setTimeout(() => {
      if (!isDraggingRef.current) {
        setShowDetails(true);
      }
    }, 500) as unknown as number;

    return () => {
      if (detailsTimeoutRef.current) {
        clearTimeout(detailsTimeoutRef.current);
      }
    };
  }, [active, showTutorial]);

  useEffect(() => {
    if (!active || !showTutorial) return;

    const showTutorialAnimation = async () => {
      await controls.start({ x: 100, transition: { duration: 1, type: "spring" } });
      await controls.start({ x: 0, transition: { duration: 0.5, type: "spring" } });
      
      await controls.start({ x: -100, transition: { duration: 1, type: "spring" } });
      await controls.start({ x: 0, transition: { duration: 0.5, type: "spring" } });
      
      await controls.start({ y: -100, transition: { duration: 1, type: "spring" } });
      await controls.start({ y: 0, transition: { duration: 0.5, type: "spring" } });
      
      localStorage.setItem('hasSeenTutorial', 'true');
      setShowTutorial(false);
    };

    showTutorialAnimation();
  }, [active, controls, showTutorial]);

  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!active) return;
      
      switch (e.key) {
        case 'ArrowRight':
          controls.start({ 
            x: 200, 
            opacity: 0,
            transition: { duration: 0.3, type: "spring" }
          }).then(() => onAction('like'));
          break;
        case 'ArrowLeft':
          controls.start({ 
            x: -200, 
            opacity: 0,
            transition: { duration: 0.3, type: "spring" }
          }).then(() => onAction('pass'));
          break;
        case 'ArrowUp':
          controls.start({ 
            y: -200, 
            opacity: 0,
            transition: { duration: 0.3, type: "spring" }
          }).then(() => onAction('unwatched'));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active, onAction, controls]);

  const handleDragStart = () => {
    isDraggingRef.current = true;
    setShowDetails(false);
    if (detailsTimeoutRef.current) {
      clearTimeout(detailsTimeoutRef.current);
    }
  };

  const handleDragEnd = async (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    isDraggingRef.current = false;
    const xOffset = Math.abs(info.offset.x);
    const yOffset = Math.abs(info.offset.y);
    const velocity = Math.max(Math.abs(info.velocity.x), Math.abs(info.velocity.y));
    
    // Improved thresholds for better mobile experience
    const swipeThreshold = 80; // Reduced threshold for easier swiping
    const velocityThreshold = 300; // Lower velocity threshold
    
    console.log('👆 Swipe detected:', {
      movie: movie.title,
      xOffset,
      yOffset,
      velocity,
      direction: info.offset.y < -swipeThreshold ? 'up' : info.offset.x > 0 ? 'right' : 'left'
    });
    
    // Check for upward swipe first (unwatched action)
    if (info.offset.y < -swipeThreshold || (info.velocity.y < -velocityThreshold && yOffset > 30)) {
      console.log('📚 Adding to watchlist:', movie.title);
      await controls.start({ 
        y: -300, 
        opacity: 0,
        transition: { duration: 0.3, type: "spring", velocity: Math.abs(info.velocity.y) }
      });
      onAction('unwatched');
    }
    // Check for horizontal swipes (like/pass)
    else if (xOffset > swipeThreshold || Math.abs(info.velocity.x) > velocityThreshold) {
      const direction = info.offset.x > 0 ? 1 : -1;
      const action = direction > 0 ? 'like' : 'pass';
      console.log(`${action === 'like' ? '❤️' : '👎'} ${action}:`, movie.title);
      await controls.start({ 
        x: direction * 300,
        opacity: 0,
        transition: { duration: 0.3, type: "spring", velocity: Math.abs(info.velocity.x) }
      });
      onAction(action);
    }
    // Return to center if no action triggered
    else {
      controls.start({ 
        x: 0, 
        y: 0,
        transition: { type: "spring", stiffness: 300, damping: 20 }
      });
      
      detailsTimeoutRef.current = window.setTimeout(() => {
        if (!isDraggingRef.current) {
          setShowDetails(true);
        }
      }, 500) as unknown as number;
    }
  };

  return (
    <motion.div
      style={{
        x,
        y,
        rotate,
        scale,
        opacity,
        zIndex: 1000 - stackIndex,
      }}
      initial={{
        scale: stackScale,
        y: stackY,
        rotate: stackRotate,
        opacity: stackOpacity,
      }}
      animate={{
        scale: stackScale,
        y: stackY,
        rotate: stackRotate,
        opacity: stackOpacity,
      }}
      exit={{
        x: x.get(),
        y: y.get(),
        opacity: 0,
        transition: { duration: 0.2 }
      }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 20
      }}
      drag={active}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.8}
      dragMomentum={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`absolute w-full max-w-sm ${active ? 'cursor-grab active:cursor-grabbing' : ''} touch-none will-change-transform`}
      whileDrag={{ scale: 1.05, cursor: 'grabbing' }}
      onHoverStart={() => active && setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-white shadow-xl">
        {/* Progressive Image Loading */}
        <div className="relative h-full w-full">
          {/* Low quality thumbnail */}
          <img
            src={getPosterUrl(movie.posterPath, 'THUMBNAIL')}
            alt={movie.title}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
              posterLoaded ? 'opacity-0' : 'opacity-100'
            }`}
            onLoad={() => setThumbnailLoaded(true)}
            loading="eager"
          />
          
          {/* High quality image */}
          <img
            src={getPosterUrl(movie.posterPath, 'MEDIUM')}
            alt={movie.title}
            className={`h-full w-full object-cover transition-opacity duration-300 ${
              posterLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ filter: 'brightness(0.85)' }}
            onLoad={() => setPosterLoaded(true)}
            loading={active ? 'eager' : 'lazy'}
          />
        </div>

        {/* Loading State */}
        {!thumbnailLoaded && (
          <div className="absolute inset-0 bg-gray-900 animate-pulse flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {/* Movie Details Overlay */}
        {showDetails && (
          <div 
            className="absolute inset-0 flex flex-col justify-end z-10"
            onClick={() => setShowDetails(false)}
          >
            {/* Semi-transparent gradient background */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent pointer-events-none" />
            
            <div className="relative p-4 space-y-2">
              <h3 className="text-2xl font-bold text-white">
                {movie.title}
              </h3>

              {movie.overview && (
                <p className="text-sm text-white/90 line-clamp-3">
                  {movie.overview}
                </p>
              )}
              
              <div className="flex flex-wrap gap-3 text-white text-sm">
                {movie.releaseDate && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{new Date(movie.releaseDate).getFullYear()}</span>
                  </div>
                )}
                {movie.voteAverage > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-400" />
                    <span>{movie.voteAverage.toFixed(1)}</span>
                  </div>
                )}
                {movie.language && (
                  <div className="flex items-center gap-1">
                    <Globe className="h-4 w-4" />
                    <span>{LANGUAGE_NAMES[movie.language]}</span>
                  </div>
                )}
                {movieDetails?.runtime && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{movieDetails.runtime}min</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {movie.genres.map(genre => (
                  <span
                    key={genre}
                    className="text-xs text-white/90 font-medium"
                  >
                    {genre}
                  </span>
                ))}
              </div>

              {/* Enhanced Details */}
              {movieDetails && (
                <div className="space-y-2 pt-2">
                  {/* Cast */}
                  {movieDetails.cast.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <Users className="h-3 w-3 text-white/60" />
                        <span className="text-xs font-medium text-white/80">Cast</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {movieDetails.cast.slice(0, 4).map(actor => (
                          <span
                            key={actor.name}
                            className="text-xs bg-white/20 text-white/80 px-2 py-0.5 rounded-full"
                          >
                            {actor.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Crew */}
                  {movieDetails.crew.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <Calendar className="h-3 w-3 text-white/60" />
                        <span className="text-xs font-medium text-white/80">Crew</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {movieDetails.crew.slice(0, 2).map(person => (
                          <span
                            key={`${person.name}-${person.job}`}
                            className="text-xs bg-white/20 text-white/80 px-2 py-0.5 rounded-full"
                          >
                            {person.name} ({person.job})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-between pt-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction('pass');
                  }}
                  className="rounded-full bg-black/20 backdrop-blur-sm p-3 transition hover:bg-black/30"
                  title="Pass (Left Arrow)"
                >
                  <X className="h-6 w-6 text-white" />
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction('unwatched');
                  }}
                  className="rounded-full bg-black/20 backdrop-blur-sm p-3 transition hover:bg-black/30"
                  title="Save for Later (Up Arrow)"
                >
                  <BookmarkPlus className="h-6 w-6 text-white" />
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction('like');
                  }}
                  className="rounded-full bg-black/20 backdrop-blur-sm p-3 transition hover:bg-black/30"
                  title="Like (Right Arrow)"
                >
                  <Heart className="h-6 w-6 text-white" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Indicators */}
        <motion.div
          className="absolute top-8 right-8 bg-green-500/80 backdrop-blur-sm rounded-full p-4 z-20"
          style={{ opacity: likeOpacity, scale: likeScale }}
        >
          <Heart className="h-8 w-8 text-white" />
        </motion.div>
        
        <motion.div
          className="absolute top-8 left-8 bg-red-500/80 backdrop-blur-sm rounded-full p-4 z-20"
          style={{ opacity: passOpacity, scale: passScale }}
        >
          <X className="h-8 w-8 text-white" />
        </motion.div>
        
        <motion.div
          className="absolute top-8 left-1/2 -translate-x-1/2 bg-blue-500/80 backdrop-blur-sm rounded-full p-4 z-20"
          style={{ opacity: unwatchedOpacity, scale: unwatchedScale }}
        >
          <BookmarkPlus className="h-8 w-8 text-white" />
        </motion.div>

        {/* Tutorial Overlay */}
        {showTutorial && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-30">
            <div className="text-white text-center p-6">
              <h3 className="text-xl font-bold mb-4">How to use Swipr</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-2 justify-center">
                  <Heart className="h-6 w-6 text-green-400" />
                  <span>Swipe right to like</span>
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <X className="h-6 w-6 text-red-400" />
                  <span>Swipe left to pass</span>
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <BookmarkPlus className="h-6 w-6 text-blue-400" />
                  <span>Swipe up to save for later</span>
                </div>
                <p className="text-sm text-white/60 mt-4">
                  Tap the poster to show/hide details
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}