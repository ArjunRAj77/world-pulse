
import React, { ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Copy, RefreshCw, AlertTriangle } from 'lucide-react';

// console.log("[System] Initializing Geo-Pulse...");

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("[System] CRITICAL: Could not find root element");
  throw new Error("Could not find root element to mount to");
}

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null, errorInfo: null, copied: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null, copied: false };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Keep this one for critical debugging, but it's not exposing user data
    // console.error("[System] React Error Boundary Caught:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleClearCacheAndReload = () => {
    try {
        localStorage.clear();
        sessionStorage.clear();
        // console.log("[System] Cache cleared.");
    } catch (e) {
        // console.error("[System] Failed to clear cache", e);
    }
    window.location.reload();
  };

  handleCopyError = () => {
    const text = `Error: ${this.state.error?.toString()}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack}`;
    navigator.clipboard.writeText(text).then(() => {
        this.setState({ copied: true });
        setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans text-slate-200">
            <div className="max-w-2xl w-full bg-slate-900 border border-red-900/50 rounded-xl shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-red-900/30 bg-red-950/10 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-900/20 flex items-center justify-center border border-red-800">
                        <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-red-400 tracking-wide">SYSTEM CRITICAL FAILURE</h1>
                        <p className="text-xs text-red-300/60 font-mono uppercase">Runtime Exception Detected</p>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                             <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Error Log</h3>
                             <button 
                                onClick={this.handleCopyError}
                                className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors"
                             >
                                <span className="w-4 h-4">{this.state.copied ? '✓' : '📋'}</span>
                                {this.state.copied ? 'COPIED' : 'COPY LOG'}
                             </button>
                        </div>
                        <div className="bg-black/50 p-4 rounded-lg border border-slate-800 font-mono text-xs text-red-300 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
                            {this.state.error?.toString()}
                            {this.state.errorInfo?.componentStack && (
                                <div className="mt-4 pt-4 border-t border-red-900/30 text-slate-500">
                                    {this.state.errorInfo.componentStack.split('\n').slice(0, 5).join('\n')}...
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Common Causes</h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex items-start gap-2">
                                    <span className="text-indigo-500">•</span>
                                    <span>Invalid API Key configuration</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-indigo-500">•</span>
                                    <span>Ad Blockers (blocking Firebase/Scripts)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-indigo-500">•</span>
                                    <span>Network interruption or timeout</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-indigo-500">•</span>
                                    <span>Corrupted local browser cache</span>
                                </li>
                            </ul>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Troubleshooting</h3>
                             <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex items-start gap-2">
                                    <span className="text-emerald-500">1.</span>
                                    <span>Check your <code>.env</code> file.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-emerald-500">2.</span>
                                    <span>Disable Ad Blockers for this site.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-emerald-500">3.</span>
                                    <span>Reset application data (see below).</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-slate-900/50 border-t border-slate-800 flex flex-col md:flex-row gap-4 justify-end">
                    <button 
                        onClick={this.handleClearCacheAndReload}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors border border-slate-700 flex items-center justify-center gap-2"
                    >
                        <span>Clear Cache & Restart</span>
                    </button>
                    <button 
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all hover:scale-105"
                    >
                        Reboot System
                    </button>
                </div>
            </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// console.log("[System] React Root rendered");
