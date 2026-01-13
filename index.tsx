import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("[System] Initializing WorldPulse...");

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
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[System] React Error Boundary Caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: '#ef4444', background: '#020617', height: '100vh', fontFamily: 'monospace' }}>
          <h1 className="text-2xl font-bold mb-4">System Critical Failure</h1>
          <p className="mb-4">The application encountered an unexpected error.</p>
          <div className="bg-slate-900 p-4 rounded border border-red-900 overflow-auto">
            {this.state.error?.toString()}
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-white"
          >
            Reboot System
          </button>
        </div>
      );
    }

    return this.props.children;
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

console.log("[System] React Root rendered");