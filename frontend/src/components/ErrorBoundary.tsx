import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Vantage crashed:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="container" style={{ paddingTop: 80, textAlign: 'center' }}>
          <p className="label">SOMETHING WENT WRONG</p>
          <h2 style={{ fontFamily: 'var(--font-display)' }}>The page hit an unexpected error</h2>
          <p style={{ color: 'var(--grey)' }}>{this.state.error.message}</p>
          <button className="btn" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
