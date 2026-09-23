import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  readonly children: ReactNode;
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    window.electronAPI.reportError({
      message: error.message,
      stack: `${error.stack ?? ''}\n${errorInfo.componentStack}`.trim(),
      source: 'error-boundary',
    });
  }

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="app-shell">
          <section className="scaffold-card" aria-live="assertive">
            <p className="eyebrow">Unexpected error</p>
            <h1>Something went wrong</h1>
            <p>Restart the player and try again. Diagnostic information was recorded locally.</p>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
