import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { AppProviders } from './app/AppProviders';
import { ErrorBoundary } from './app/ErrorBoundary';
import './styles/index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Renderer root element was not found.');
}

rootElement.setAttribute('aria-busy', 'false');

window.addEventListener('error', (event) => {
  window.electronAPI.reportError({
    message: event.error instanceof Error ? event.error.message : event.message,
    stack: event.error instanceof Error ? event.error.stack : undefined,
    source: 'error',
  });
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
  window.electronAPI.reportError({
    message: reason.message,
    stack: reason.stack,
    source: 'unhandled-rejection',
  });
});

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </AppProviders>
  </StrictMode>,
);
