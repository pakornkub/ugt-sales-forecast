import React, { useEffect, useRef, useState } from 'react';
import { useLoading } from '../lib/loadingContext';

export function LoadingBar() {
  const { isLoading } = useLoading();
  const [progress, setProgress] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const [mounted, setMounted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (hideRef.current) clearTimeout(hideRef.current);
  };

  useEffect(() => {
    if (isLoading) {
      clearTimers();
      setProgress(0);
      setOpacity(1);
      setMounted(true);

      // Quickly reach ~30%, then crawl toward 85%.
      let p = 0;
      intervalRef.current = setInterval(() => {
        p += p < 30 ? 12 : 2;
        if (p > 85) p = 85;
        setProgress(p);
      }, 180);
    } else {
      clearTimers();
      // Complete bar then fade out
      setProgress(100);
      hideRef.current = setTimeout(() => {
        setOpacity(0);
        hideRef.current = setTimeout(() => {
          setMounted(false);
          setProgress(0);
          setOpacity(1);
        }, 350);
      }, 150);
    }
    return clearTimers;
  }, [isLoading]);

  if (!mounted) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 48,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 10000,
        pointerEvents: 'none',
        opacity,
        transition: 'opacity 0.35s ease',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #3b82f6, #60a5fa, #93c5fd)',
          boxShadow: '0 0 14px rgba(59,130,246,0.85), 0 0 5px rgba(59,130,246,0.6)',
          borderRadius: '0 2px 2px 0',
          transition: progress === 100
            ? 'width 0.2s ease-out'
            : 'width 0.18s linear',
        }}
      />
    </div>
  );
}
