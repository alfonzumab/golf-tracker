import { Component } from 'react';
import { T } from '../theme';

class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          alignItems: 'center', height: '100vh', backgroundColor: T.bg,
          color: T.txt, fontFamily: "'DM Sans', sans-serif", padding: 20, textAlign: 'center'
        }}>
          <h1 style={{ marginBottom: 16, color: T.red, fontFamily: "'Playfair Display', serif" }}>
            Something went wrong
          </h1>
          <p style={{ marginBottom: 24, maxWidth: 400, color: T.dim }}>
            The app hit an unexpected error. Tap below to reload.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '14px 32px', backgroundColor: T.acc, color: '#fff',
              border: 'none', borderRadius: 8, cursor: 'pointer',
              fontSize: 16, fontWeight: 600, minHeight: 48
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
