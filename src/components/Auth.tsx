import React, { useState } from 'react';
import { User, AlertCircle, CheckCircle } from 'lucide-react';
import { getOrCreateUser, testConnection } from '../lib/supabase';

interface AuthProps {
  onAuthSuccess: (user: any) => void;
}

export function Auth({ onAuthSuccess }: AuthProps) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLogin, setIsLogin] = useState(true);

  React.useEffect(() => {
    const checkConnection = async () => {
      const result = await testConnection();
      if (!result.success) {
        console.warn('Supabase connection test failed:', result.error);
      }
    };
    checkConnection();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const trimmedUsername = username.trim();

      if (!trimmedUsername) {
        throw new Error('Please enter a username');
      }

      if (trimmedUsername.length < 3) {
        throw new Error('Username must be at least 3 characters long');
      }

      if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
        throw new Error('Username can only contain letters, numbers, and underscores');
      }

      const result = await getOrCreateUser(trimmedUsername);

      if (result.error) {
        throw result.error;
      }

      if (result.user) {
        const isNewUser = result.isNewUser;

        // Check if user is trying to login but username doesn't exist
        if (isLogin && isNewUser) {
          throw new Error('Username not found. Please sign up first.');
        }

        // Check if user is trying to signup but username already exists
        if (!isLogin && !isNewUser) {
          throw new Error('Username already exists. Please login instead.');
        }

        setSuccess(isNewUser ? 'Account created! Getting started...' : 'Welcome back!');
        setTimeout(() => onAuthSuccess(result.user), 800);
      }
    } catch (error: any) {
      console.error('Authentication error:', error);

      if (error.message?.includes('Failed to fetch')) {
        setError('Unable to connect. Please check your connection and try again.');
      } else {
        setError(error.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-4">
            <User className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {isLogin ? 'Welcome Back to Swipr!' : 'Join Swipr'}
          </h1>
          <p className="text-white/70">
            {isLogin ? 'Enter your username to continue' : 'Choose a username to get started'}
          </p>
          <p className="text-white/50 text-sm mt-2">
            No password needed - just your unique username
          </p>
        </div>

        {/* Login/Signup Toggle - More Prominent */}
        <div className="flex gap-2 mb-6 bg-white/10 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setError(null);
              setSuccess(null);
            }}
            className={`flex-1 py-2 px-4 rounded-md font-semibold transition ${
              isLogin
                ? 'bg-white text-cyan-900'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setError(null);
              setSuccess(null);
            }}
            className={`flex-1 py-2 px-4 rounded-md font-semibold transition ${
              !isLogin
                ? 'bg-white text-cyan-900'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/40" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:border-white/40 transition"
                placeholder={isLogin ? "Enter your username" : "Choose a username"}
                required
                minLength={3}
                pattern="[a-zA-Z0-9_]+"
                autoComplete="off"
              />
            </div>
            <p className="text-white/50 text-xs mt-2">
              Letters, numbers, and underscores only (min 3 characters)
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-300 flex-shrink-0 mt-0.5" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/30">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-300 flex-shrink-0 mt-0.5" />
                <p className="text-green-300 text-sm">{success}</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-lg bg-white text-cyan-900 font-semibold hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-cyan-900/20 border-t-cyan-900 rounded-full animate-spin"></div>
                <span>{isLogin ? 'Logging in...' : 'Creating account...'}</span>
              </div>
            ) : (
              isLogin ? 'Login' : 'Sign Up'
            )}
          </button>

          <div className="text-center">
            <p className="text-white/60 text-xs">
              Your preferences will be saved and used to recommend movies to others
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}