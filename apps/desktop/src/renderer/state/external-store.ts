export interface ExternalStore<State> {
  getSnapshot(): State;
  subscribe(listener: () => void): () => void;
  setState(next: State | ((current: State) => State)): void;
}

/**
 * Small dependency-free store primitive for renderer boundaries. Each feature
 * owns a separate store, so a fast playback clock cannot notify app or UI
 * subscribers that do not consume playback state.
 */
export function createExternalStore<State>(initialState: State): ExternalStore<State> {
  let state = initialState;
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setState: (next) => {
      const nextState =
        typeof next === 'function' ? (next as (current: State) => State)(state) : next;

      if (Object.is(nextState, state)) {
        return;
      }

      state = nextState;
      listeners.forEach((listener) => listener());
    },
  };
}
