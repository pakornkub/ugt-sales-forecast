import React, { createContext, useCallback, useContext, useState } from 'react';

interface LoadingContextValue {
  isLoading: boolean;
  start: () => void;
  done: () => void;
}

const LoadingContext = createContext<LoadingContextValue>({
  isLoading: false,
  start: () => {},
  done: () => {},
});

export function LoadingProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [count, setCount] = useState(0);
  const start = useCallback(() => setCount(c => c + 1), []);
  const done  = useCallback(() => setCount(c => Math.max(0, c - 1)), []);
  return (
    <LoadingContext.Provider value={{ isLoading: count > 0, start, done }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  return useContext(LoadingContext);
}
