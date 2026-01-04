import React, { useState } from 'react';
import { Mail, User, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { signUpUser, loginUser, testConnection } from '../lib/supabase';

interface AuthProps {
  onAuthSuccess: (user: any) => void;
}

export function Auth({ onAuthSuccess }: AuthProps) {
  const [mode, setMode] = useState<'signup' | 'login'>('signup');

  // Sign Up state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState<string | null>(null);

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState<string | null>(null);

  React.useEffect(() => {
    const checkConnection = async () => {
      const result = await testConnection();
      if (!result.success) {
        console.warn('Supabase connection test failed:', result.error);
      }
    };
    checkConnection();
  }, []);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateUsername = (username: string): boolean => {
    return username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(username);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupLoading(true);
    setSignupError(null);
    setSignupSuccess(null);

    try {
      const trimmedEmail = signupEmail.trim().toLowerCase();
      const trimmedUsername = signupUsername.trim();

      if (!trimmedEmail) {
        throw new Error('Please enter your email address');
      }

      if (!validateEmail(trimmedEmail)) {
        throw new Error('Please enter a valid email address');
      }

      if (!trimmedUsername) {
        throw new Error('Please enter a username');
      }

      if (!validateUsername(trimmedUsername)) {
        throw new Error('Username must be at least 3 characters (letters, numbers, and underscores only)');
      }

      const result = await signUpUser(trimmedEmail, trimmedUsername);

      if (result.error) {
        throw result.error;
      }

      if (result.user) {
        setSignupSuccess('Account created! Setting up your profile...');
        setTimeout(() => onAuthSuccess(result.user), 1000);
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      setSignupError(error.message || 'Something went wrong. Please try again.');
    } finally {
      setSignupLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    setLoginSuccess(null);

    try {
      const trimmedEmail = loginEmail.trim().toLowerCase();

      if (!trimmedEmail) {
        throw new Error('Please enter your email address');
      }

      if (!validateEmail(trimmedEmail)) {
        throw new Error('Please enter a valid email address');
      }

      const result = await loginUser(trimmedEmail);

      if (result.error) {
        throw result.error;
      }

      if (result.user) {
        setLoginSuccess(`Welcome back, ${result.user.username}!`);
        setTimeout(() => onAuthSuccess(result.user), 1000);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setLoginError(error.message || 'Something went wrong. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-600 via-violet-600 to-indigo-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-3">Swipr</h1>
          <p className="text-white/90 text-lg">Your next favorite movie is just a swipe away</p>
        </div>

        {/* Main Auth Card */}
        <div className="bg-white/15 backdrop-blur-xl rounded-3xl p-8 border border-white/30 shadow-2xl">
          {/* Mode Toggle */}
          <div className="flex gap-2 mb-8 p-1.5 bg-black/20 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setSignupError(null);
                setLoginError(null);
              }}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                mode === 'signup'
                  ? 'bg-white text-violet-600 shadow-lg'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Sign Up
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setSignupError(null);
                setLoginError(null);
              }}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                mode === 'login'
                  ? 'bg-white text-violet-600 shadow-lg'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Login
            </button>
          </div>

          {/* Info Text */}
          <div className="mb-6 text-center">
            <p className="text-white/80 text-sm">
              {mode === 'signup'
                ? 'New here? Create your account to start discovering amazing movies!'
                : 'Welcome back! Enter your email to continue your journey.'}
            </p>
          </div>

          {/* Sign Up Form */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-5">
              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/20 text-white placeholder-white/50 border border-white/30 focus:outline-none focus:border-white focus:bg-white/25 transition"
                    placeholder="your@email.com"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Username Input */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
                  <input
                    type="text"
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/20 text-white placeholder-white/50 border border-white/30 focus:outline-none focus:border-white focus:bg-white/25 transition"
                    placeholder="Choose a username"
                    required
                    minLength={3}
                    pattern="[a-zA-Z0-9_]+"
                    autoComplete="off"
                  />
                </div>
                <p className="text-white/60 text-xs mt-2">
                  At least 3 characters (letters, numbers, underscores)
                </p>
              </div>

              {/* Error Message */}
              {signupError && (
                <div className="p-4 rounded-xl bg-red-500/20 border border-red-400/40">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-200 flex-shrink-0 mt-0.5" />
                    <p className="text-red-100 text-sm">{signupError}</p>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {signupSuccess && (
                <div className="p-4 rounded-xl bg-green-500/20 border border-green-400/40">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-200 flex-shrink-0 mt-0.5" />
                    <p className="text-green-100 text-sm">{signupSuccess}</p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={signupLoading}
                className="w-full py-4 px-4 rounded-xl bg-white text-violet-600 font-bold text-lg hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {signupLoading ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-3 border-violet-600/30 border-t-violet-600 rounded-full animate-spin"></div>
                    <span>Creating Account...</span>
                  </div>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>
          )}

          {/* Login Form */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/20 text-white placeholder-white/50 border border-white/30 focus:outline-none focus:border-white focus:bg-white/25 transition"
                    placeholder="your@email.com"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Error Message */}
              {loginError && (
                <div className="p-4 rounded-xl bg-red-500/20 border border-red-400/40">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-200 flex-shrink-0 mt-0.5" />
                    <p className="text-red-100 text-sm">{loginError}</p>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {loginSuccess && (
                <div className="p-4 rounded-xl bg-green-500/20 border border-green-400/40">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-200 flex-shrink-0 mt-0.5" />
                    <p className="text-green-100 text-sm">{loginSuccess}</p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-4 px-4 rounded-xl bg-white text-violet-600 font-bold text-lg hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {loginLoading ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-3 border-violet-600/30 border-t-violet-600 rounded-full animate-spin"></div>
                    <span>Logging in...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <span>Login</span>
                    <ArrowRight className="h-6 w-6" />
                  </div>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer Note */}
        <div className="text-center mt-8">
          <p className="text-white/80 text-sm bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full inline-block">
            🔒 No password needed - secure email-based authentication
          </p>
        </div>
      </div>
    </div>
  );
}
