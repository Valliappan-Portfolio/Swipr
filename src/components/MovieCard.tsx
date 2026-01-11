import React, { useState, useEffect, useRef } from 'react';
import { motion, PanInfo, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import { Heart, X, BookmarkPlus, Star, Clock, Globe } from 'lucide-react';
import type { Movie, MovieActionType } from '../types';
import { LANGUAGE_NAMES } from '../lib/tmdb';
import { getPosterUrl } from '../lib/tmdb';

interface MovieCardProps {
  movie: Movie;
  onAction: (action: MovieActionType) => void;
  active?: boolean;
  stackIndex?: number;
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
  const [showDetails, setShowDetails] = useState(true); // Show details by default
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

  // Don't auto-show details - only show when user taps/clicks poster
  useEffect(() => {
    // Clean up timeout on unmount
    return () => {
      if (detailsTimeoutRef.current) {
        clearTimeout(detailsTimeoutRef.current);
      }
    };
  }, []);

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
    const swipeThreshold = 70; // Reduced threshold for easier swiping on mobile
    const velocityThreshold = 250; // Lower velocity threshold for better touch response
    
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
        transition: {
          duration: 0.25,
          ease: [0.4, 0, 0.2, 1], // Smooth cubic-bezier easing
          velocity: Math.abs(info.velocity.y)
        }
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
        transition: {
          duration: 0.25,
          ease: [0.4, 0, 0.2, 1], // Smooth cubic-bezier easing
          velocity: Math.abs(info.velocity.x)
        }
      });
      onAction(action);
    }
    // Return to center if no action triggered
    else {
      controls.start({
        x: 0,
        y: 0,
        transition: {
          type: "spring",
          stiffness: 400, // Increased for snappier return
          damping: 25,    // Smooth damping
          mass: 0.5       // Lighter feel
        }
      });
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
        stiffness: 350,
        damping: 22,
        mass: 0.8
      }}
      drag={active}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.7}  // Slightly reduced for more responsive feel
      dragMomentum={true}
      dragTransition={{
        power: 0.2,      // Smoother drag momentum
        timeConstant: 200 // Faster settling
      }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`absolute w-full max-w-sm ${active ? 'cursor-grab active:cursor-grabbing' : ''} touch-none will-change-transform`}
      whileDrag={{
        scale: 1.03,     // Slightly reduced for subtler effect
        cursor: 'grabbing',
        transition: { duration: 0.1 }
      }}
      onHoverStart={() => active && setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <div
        className="relative aspect-[2/3] overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => {
          // Only toggle details if not dragging and clicking on poster area
          if (!isDraggingRef.current && active) {
            e.stopPropagation();
            setShowDetails(prev => !prev);
          }
        }}
      >
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

        {/* Loading State with Swipr Logo */}
        {!thumbnailLoaded && (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-pink-900 to-rose-900 flex flex-col items-center justify-center gap-4">
            <img
              src="/swipr-logo.png"
              alt="Swipr"
              className="w-24 h-24 object-contain opacity-50 animate-pulse"
            />
            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {/* Recommendation Source Badge - Clean, minimal, mobile-friendly */}
        {movie.recommendationSource?.type === 'tmdb' && movie.recommendationSource.basedOn && (
          <div className="absolute top-3 left-3 right-3 z-10 pointer-events-none">
            <div className="bg-gradient-to-r from-purple-500/90 to-pink-500/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-lg">
              <p className="text-xs font-semibold text-white flex items-center gap-1">
                <span className="text-sm">✨</span>
                <span className="truncate">Because you liked "{movie.recommendationSource.basedOn}"</span>
              </p>
            </div>
          </div>
        )}

        {/* Details Overlay - Clean on/off toggle, shows on click only */}
        {showDetails && (
          <div className="absolute inset-0 flex flex-col justify-end z-20">
            {/* Semi-transparent gradient background - clickable to close */}
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent"
              onClick={(e) => {
                e.stopPropagation();
                setShowDetails(false);
              }}
            />

            <div
              className="relative p-4 space-y-2"
              onClick={(e) => e.stopPropagation()}
            >
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

              {/* OTT Streaming info removed from card - will be shown in Watchlist */}

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