import React, { useState, useEffect } from 'react';
import { User, Lock, Mail, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { supabase, testSupabaseConnection } from '../lib/supabase';

interface AuthProps {
  onAuthSuccess: (user: any) => void;
}

export function Auth({ onAuthSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'failed'>('checking');

  useEffect(() => {
    // Test Supabase connection on component mount
    const checkConnection = async () => {
      if (!supabase) {
        setConnectionStatus('failed');
        setError('Supabase client not configured');
        return;
      }

      const isConnected = await testSupabaseConnection();
      setConnectionStatus(isConnected ? 'connected' : 'failed');
      
      if (!isConnected) {
        setError('Unable to connect to authentication service. Please check your internet connection and try again.');
      }
    };

    checkConnection();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError('Authentication service not available');
      return;
    }

    if (connectionStatus === 'failed') {
      setError('Cannot authenticate - connection to service failed. Please refresh the page and try again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        console.log('Attempting sign in...');
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error('Sign in error:', error);
          throw error;
        }
        if (data.user) {
          console.log('Sign in successful');
          onAuthSuccess(data.user);
        }
      } else {
        console.log('Attempting sign up...');
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name,
            }
          }
        });

        if (error) {
          console.error('Sign up error:', error);
          throw error;
        }
        if (data.user) {
          console.log('Sign up successful');
          onAuthSuccess(data.user);
        }
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      
      // Provide more specific error messages
      if (error.message?.includes('fetch')) {
        setError('Network connection failed. Please check your internet connection and try again.');
      } else if (error.message?.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else if (error.message?.includes('User already registered')) {
        setError('An account with this email already exists. Please sign in instead.');
      } else {
        setError(error.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!supabase) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 w-full max-w-md text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">Configuration Error</h1>
          <p className="text-white/80 mb-4">
            Authentication service is not configured. Please check your environment variables.
          </p>
          <div className="text-left bg-black/20 rounded-lg p-4 text-sm text-white/70">
            <p>Missing or invalid:</p>
            <ul className="list-disc list-inside mt-2">
              <li>VITE_SUPABASE_URL</li>
              <li>VITE_SUPABASE_ANON_KEY</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-4">
            <User className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Welcome to What2WatchNxt
          </h1>
          <p className="text-white/70">
            {isLogin ? 'Sign in to get personalized recommendations' : 'Create an account to start discovering'}
          </p>
          
          {/* Connection Status Indicator */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'checking' ? 'bg-yellow-400 animate-pulse' :
              connectionStatus === 'connected' ? 'bg-green-400' : 'bg-red-400'
            }`}></div>
            <span className="text-xs text-white/60">
              {connectionStatus === 'checking' ? 'Connecting...' :
               connectionStatus === 'connected' ? 'Connected' : 'Connection Failed'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/40" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:border-white/40 transition"
                  placeholder="Enter your full name"
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/40" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:border-white/40 transition"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/40" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 rounded-lg bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:border-white/40 transition"
                placeholder="Enter your password"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white/60 transition"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-300 flex-shrink-0 mt-0.5" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || connectionStatus === 'failed'}
            className="w-full py-3 px-4 rounded-lg bg-white text-purple-900 font-semibold hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-purple-900/20 border-t-purple-900 rounded-full animate-spin"></div>
                <span>{isLogin ? 'Signing in...' : 'Creating account...'}</span>
              </div>
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-white/70 hover:text-white transition"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}