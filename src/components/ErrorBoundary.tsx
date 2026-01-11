import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    // Clear error state and reload app
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-red-500/20 rounded-full">
                <AlertTriangle className="h-12 w-12 text-red-400" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-white mb-3">
              Oops! Something went wrong
            </h1>

            <p className="text-white/70 mb-6">
              The app encountered an unexpected error. Don't worry, your data is safe.
            </p>

            {this.state.error && (
              <div className="mb-6 p-4 bg-black/20 rounded-lg">
                <p className="text-xs text-white/50 font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 px-6 rounded-xl hover:from-purple-600 hover:to-pink-600 transition flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-5 w-5" />
              Reload App
            </button>

            <p className="text-xs text-white/40 mt-4">
              If this keeps happening, please contact support
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
