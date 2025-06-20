import React, { useState, useEffect } from 'react';
import { User, Lock, Mail, Eye, EyeOff, AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { supabase, testSupabaseConnection, diagnoseConnection, createLocalUser, getLocalUser } from '../lib/supabase';

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
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [useLocalAuth, setUseLocalAuth] = useState(false);

  useEffect(() => {
    checkConnection();
    
    // Check if there's already a local user
    const localUser = getLocalUser();
    if (localUser) {
      onAuthSuccess(localUser);
    }
  }, []);

  const checkConnection = async () => {
    setConnectionStatus('checking');
    setError(null);
    
    if (!supabase) {
      setConnectionStatus('failed');
      setUseLocalAuth(true);
      return;
    }

    const isConnected = await testSupabaseConnection();
    setConnectionStatus(isConnected ? 'connected' : 'failed');
    
    if (!isConnected) {
      const diag = await diagnoseConnection();
      setDiagnostics(diag);
      setUseLocalAuth(true);
      
      if (diag.issue) {
        setError(`Connection failed: ${diag.issue}. Using offline mode.`);
      } else {
        setError('Unable to connect to authentication service. Using offline mode.');
      }
    } else {
      setUseLocalAuth(false);
    }
  };

  const handleLocalAuth = async () => {
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    if (!isLogin && !name.trim()) {
      setError('Please enter your name');
      return;
    }

    try {
      const localUser = createLocalUser(email, isLogin ? undefined : name);
      onAuthSuccess(localUser);
    } catch (error) {
      setError('Failed to create local account');
    }
  };

  const handleSupabaseAuth = async () => {
    if (!supabase) {
      throw new Error('Authentication service not available');
    }

    if (isLogin) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (data.user) {
        onAuthSuccess(data.user);
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          }
        }
      });

      if (error) throw error;
      if (data.user) {
        onAuthSuccess(data.user);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (useLocalAuth || connectionStatus === 'failed') {
        await handleLocalAuth();
      } else {
        await handleSupabaseAuth();
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      
      // Check if it's a network-related error and fallback to local auth
      const isNetworkError = error.message?.includes('fetch') || 
                           error.message?.includes('Network connection failed') ||
                           error.message?.includes('timeout') ||
                           error.name === 'TypeError';

      if (isNetworkError) {
        console.log('Network error detected, falling back to local authentication');
        try {
          await handleLocalAuth();
          setError('Connected in offline mode. Your preferences will be saved locally.');
          return;
        } catch (localError) {
          setError('Failed to authenticate. Please try again.');
        }
      } else {
        // Handle other authentication errors
        if (error.message?.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please check your credentials and try again.');
        } else if (error.message?.includes('User already registered')) {
          setError('An account with this email already exists. Please sign in instead.');
        } else if (error.message?.includes('Email not confirmed')) {
          setError('Please check your email and click the confirmation link before signing in.');
        } else {
          setError(error.message || 'Authentication failed. Please try again.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (!supabase && !useLocalAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 w-full max-w-md text-center">
          <AlertCircle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">Offline Mode</h1>
          <p className="text-white/80 mb-6">
            Authentication service is not configured. You can still use the app in offline mode.
          </p>
          <button
            onClick={() => setUseLocalAuth(true)}
            className="w-full py-3 px-4 rounded-lg bg-white text-purple-900 font-semibold hover:bg-white/90 transition"
          >
            Continue in Offline Mode
          </button>
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
              connectionStatus === 'connected' ? 'bg-green-400' : 'bg-orange-400'
            }`}></div>
            <span className="text-xs text-white/60">
              {connectionStatus === 'checking' ? 'Connecting...' :
               connectionStatus === 'connected' ? 'Online' : 'Offline Mode'}
            </span>
            {connectionStatus === 'connected' ? (
              <Wifi className="h-3 w-3 text-green-400" />
            ) : connectionStatus === 'failed' ? (
              <WifiOff className="h-3 w-3 text-orange-400" />
            ) : null}
          </div>

          {/* Connection retry button */}
          {connectionStatus === 'failed' && (
            <div className="mt-2 flex items-center justify-center gap-2">
              <button
                onClick={checkConnection}
                className="text-xs text-white/60 hover:text-white/80 flex items-center gap-1 transition"
              >
                <RefreshCw className="h-3 w-3" />
                Retry Connection
              </button>
              <span className="text-white/40">|</span>
              <button
                onClick={() => setShowDiagnostics(!showDiagnostics)}
                className="text-xs text-white/60 hover:text-white/80 transition"
              >
                {showDiagnostics ? 'Hide' : 'Show'} Details
              </button>
            </div>
          )}

          {/* Diagnostics panel */}
          {showDiagnostics && diagnostics && (
            <div className="mt-4 text-left bg-black/20 rounded-lg p-4 text-xs text-white/70">
              <p className="font-semibold mb-2">Connection Diagnostics:</p>
              <ul className="space-y-1">
                <li>Environment Variables: {diagnostics.envVarsPresent ? '✓' : '✗'}</li>
                <li>URL Format: {diagnostics.urlFormat ? '✓' : '✗'}</li>
                <li>Client Initialized: {diagnostics.clientInitialized ? '✓' : '✗'}</li>
                <li>Network Connectivity: {diagnostics.networkConnectivity ? '✓' : '✗'}</li>
                <li>Auth Service: {diagnostics.authServiceReachable ? '✓' : '✗'}</li>
              </ul>
              {diagnostics.issue && (
                <p className="mt-2 text-orange-300">Issue: {diagnostics.issue}</p>
              )}
            </div>
          )}

          {/* Offline mode notice */}
          {useLocalAuth && (
            <div className="mt-4 p-3 rounded-lg bg-orange-500/20 border border-orange-500/30">
              <p className="text-orange-300 text-sm">
                Running in offline mode. Your preferences will be saved locally.
              </p>
            </div>
          )}
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

          {!useLocalAuth && (
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
                  required={!useLocalAuth}
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
          )}

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
            disabled={loading}
            className="w-full py-3 px-4 rounded-lg bg-white text-purple-900 font-semibold hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-purple-900/20 border-t-purple-900 rounded-full animate-spin"></div>
                <span>
                  {useLocalAuth ? 'Creating local account...' : 
                   isLogin ? 'Signing in...' : 'Creating account...'}
                </span>
              </div>
            ) : (
              useLocalAuth ? 'Continue' :
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>

          {!useLocalAuth && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-white/70 hover:text-white transition"
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}