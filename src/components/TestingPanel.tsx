import React, { useState, useEffect } from 'react';
import { User, Film, Heart, X, BookmarkPlus, Sparkles, ArrowRight } from 'lucide-react';
import type { Movie, MovieActionType, UserPreferences } from '../types';

interface TestUser {
  id: string;
  name: string;
  preferences: UserPreferences;
  avatar: string;
  movieActions: { [movieId: number]: MovieActionType };
}

// Simulated test users with different preferences
const TEST_USERS: TestUser[] = [
  {
    id: 'user1',
    name: "Action Fan",
    preferences: {
      languages: ["en", "ta"],
      contentType: "movies",
      genres: ["Action", "Thriller"]
    },
    avatar: "https://images.unsplash.com/photo-1600486913747-55e5470d6f40?w=80&h=80&fit=crop",
    movieActions: {}
  },
  {
    id: 'user2',
    name: "Drama Lover",
    preferences: {
      languages: ["en", "hi"],
      contentType: "both",
      genres: ["Drama", "Romance"]
    },
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop",
    movieActions: {}
  },
  {
    id: 'user3',
    name: "Comedy Fan",
    preferences: {
      languages: ["en", "ml"],
      contentType: "movies",
      genres: ["Comedy", "Family"]
    },
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop",
    movieActions: {}
  }
];

interface TestingPanelProps {
  movies: Movie[];
  onSelectUser: (preferences: UserPreferences) => void;
}

interface UserSimilarity {
  user1: string;
  user2: string;
  similarity: number;
  commonMovies: Movie[];
  matchedActions: { movieId: number; user1Action: MovieActionType; user2Action: MovieActionType }[];
}

export function TestingPanel({ movies, onSelectUser }: TestingPanelProps) {
  const [testUsers, setTestUsers] = useState<TestUser[]>(TEST_USERS);
  const [similarities, setSimilarities] = useState<UserSimilarity[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [showAlgorithm, setShowAlgorithm] = useState(false);

  // Generate random actions for test users
  useEffect(() => {
    if (movies.length === 0) return;

    const updatedUsers = testUsers.map(user => {
      const actions: { [movieId: number]: MovieActionType } = {};
      
      movies.forEach(movie => {
        // Bias the random selection based on user preferences
        const matchesGenres = movie.genres.some(g => user.preferences.genres.includes(g));
        const rand = Math.random();
        
        if (matchesGenres) {
          // Higher chance of 'like' if genres match
          actions[movie.id] = rand < 0.6 ? 'like' : rand < 0.8 ? 'unwatched' : 'pass';
        } else {
          // Lower chance of 'like' if genres don't match
          actions[movie.id] = rand < 0.3 ? 'like' : rand < 0.6 ? 'unwatched' : 'pass';
        }
      });

      return { ...user, movieActions: actions };
    });

    setTestUsers(updatedUsers);
  }, [movies]);

  // Calculate similarities between users
  useEffect(() => {
    const sims: UserSimilarity[] = [];

    for (let i = 0; i < testUsers.length; i++) {
      for (let j = i + 1; j < testUsers.length; j++) {
        const user1 = testUsers[i];
        const user2 = testUsers[j];
        let similarity = 0;
        const matchedActions = [];
        const commonMovies: Movie[] = [];

        movies.forEach(movie => {
          const action1 = user1.movieActions[movie.id];
          const action2 = user2.movieActions[movie.id];

          if (action1 && action2) {
            if (action1 === action2) {
              similarity += 1;
              commonMovies.push(movie);
              matchedActions.push({
                movieId: movie.id,
                user1Action: action1,
                user2Action: action2
              });
            } else if (
              (action1 === 'like' && action2 === 'unwatched') ||
              (action1 === 'unwatched' && action2 === 'like')
            ) {
              similarity += 0.5;
            }
          }
        });

        sims.push({
          user1: user1.id,
          user2: user2.id,
          similarity: (similarity / movies.length) * 100,
          commonMovies,
          matchedActions
        });
      }
    }

    setSimilarities(sims.sort((a, b) => b.similarity - a.similarity));
  }, [testUsers, movies]);

  const getActionIcon = (action: MovieActionType) => {
    switch (action) {
      case 'like':
        return <Heart className="h-4 w-4 text-green-400" />;
      case 'pass':
        return <X className="h-4 w-4 text-red-400" />;
      case 'unwatched':
        return <BookmarkPlus className="h-4 w-4 text-blue-400" />;
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="bg-black/40 backdrop-blur-lg rounded-xl p-4 shadow-lg max-w-4xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-white" />
            <h3 className="text-lg font-semibold text-white">Test Users</h3>
          </div>
          <button
            onClick={() => setShowAlgorithm(!showAlgorithm)}
            className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
          >
            <Sparkles className="h-4 w-4" />
            {showAlgorithm ? 'Hide Algorithm' : 'Show Algorithm'}
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            {testUsers.map(user => (
              <button
                key={user.id}
                onClick={() => {
                  onSelectUser(user.preferences);
                  setSelectedUser(user.id);
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition text-white text-left ${
                  selectedUser === user.id
                    ? 'bg-white/20'
                    : 'bg-white/10 hover:bg-white/15'
                }`}
              >
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-sm opacity-80">
                    {user.preferences.genres.join(", ")}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {showAlgorithm && (
            <div className="bg-black/20 rounded-lg p-4">
              <h4 className="text-white font-semibold mb-3">Recommendation Map</h4>
              
              {similarities.map((sim, index) => (
                <div
                  key={index}
                  className={`mb-3 rounded-lg p-3 ${
                    selectedUser && (selectedUser === sim.user1 || selectedUser === sim.user2)
                      ? 'bg-white/20'
                      : 'bg-black/20'
                  }`}
                >
                  <div className="flex items-center gap-2 text-white mb-2">
                    <span>
                      {testUsers.find(u => u.id === sim.user1)?.name}
                    </span>
                    <ArrowRight className="h-4 w-4 opacity-50" />
                    <span>
                      {testUsers.find(u => u.id === sim.user2)?.name}
                    </span>
                    <span className="ml-auto font-semibold">
                      {sim.similarity.toFixed(1)}% Match
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {sim.matchedActions.slice(0, 4).map(match => {
                      const movie = movies.find(m => m.id === match.movieId);
                      if (!movie) return null;

                      return (
                        <div
                          key={match.movieId}
                          className="flex items-center gap-2 text-white/80"
                        >
                          <Film className="h-3 w-3 opacity-50" />
                          <span className="truncate flex-1">{movie.title}</span>
                          <div className="flex items-center gap-1">
                            {getActionIcon(match.user1Action)}
                            {getActionIcon(match.user2Action)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}