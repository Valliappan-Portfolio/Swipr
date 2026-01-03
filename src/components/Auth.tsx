import React, { useState } from 'react';
import { Mail, User, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { signUpUser, loginUser, testConnection } from '../lib/supabase';

interface AuthProps {
  onAuthSuccess: (user: any) => void;
}

export function Auth({ onAuthSuccess }: AuthProps) {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Swipr</h1>
          <p className="text-white/70 text-lg">Your next favorite movie is just a swipe away</p>
        </div>

        {/* Two Column Layout */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Sign Up Section */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">New User? Sign Up</h2>
              <p className="text-white/70 text-sm">Create your account and start discovering</p>
            </div>

            <form onSubmit={handleSignUp} className="space-y-4">
              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/40" />
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:border-white/40 transition"
                    placeholder="your@email.com"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Username Input */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/40" />
                  <input
                    type="text"
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:border-white/40 transition"
                    placeholder="Choose a username"
                    required
                    minLength={3}
                    pattern="[a-zA-Z0-9_]+"
                    autoComplete="off"
                  />
                </div>
                <p className="text-white/50 text-xs mt-1">
                  Min 3 characters, letters/numbers/underscores only
                </p>
              </div>

              {/* Error Message */}
              {signupError && (
                <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-300 flex-shrink-0 mt-0.5" />
                    <p className="text-red-300 text-sm">{signupError}</p>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {signupSuccess && (
                <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/30">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-300 flex-shrink-0 mt-0.5" />
                    <p className="text-green-300 text-sm">{signupSuccess}</p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={signupLoading}
                className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold hover:from-cyan-600 hover:to-teal-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {signupLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    <span>Creating Account...</span>
                  </div>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>
          </div>

          {/* Login Section */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Returning User? Login</h2>
              <p className="text-white/70 text-sm">Welcome back! Enter your email to continue</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/40" />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:border-white/40 transition"
                    placeholder="your@email.com"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Error Message */}
              {loginError && (
                <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-300 flex-shrink-0 mt-0.5" />
                    <p className="text-red-300 text-sm">{loginError}</p>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {loginSuccess && (
                <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/30">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-300 flex-shrink-0 mt-0.5" />
                    <p className="text-green-300 text-sm">{loginSuccess}</p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 px-4 rounded-lg bg-white text-cyan-900 font-semibold hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {loginLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-cyan-900/20 border-t-cyan-900 rounded-full animate-spin"></div>
                    <span>Logging in...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <span>Login</span>
                    <ArrowRight className="h-5 w-5" />
                  </div>
                )}
              </button>

              {/* Link to Sign Up */}
              <div className="text-center pt-4 border-t border-white/10">
                <p className="text-white/60 text-sm">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      // Focus on signup email input
                      const signupEmailInput = document.querySelector('input[type="email"]') as HTMLInputElement;
                      if (signupEmailInput) signupEmailInput.focus();
                    }}
                    className="text-cyan-400 hover:text-cyan-300 font-semibold transition"
                  >
                    Sign up →
                  </button>
                </p>
              </div>
            </form>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-6">
          <p className="text-white/50 text-sm">
            No password needed - just your email and username
          </p>
        </div>
      </div>
    </div>
  );
}
