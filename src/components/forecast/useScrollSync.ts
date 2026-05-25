import { useCallback, useRef } from 'react';

export function useScrollSync() {
  const regPaneRef = useRef<HTMLDivElement>(null);
  const monthPaneRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef(false);

  /** Sync vertical scroll only — each pane keeps its own horizontal scroll position. */
  const syncFromReg = useCallback(() => {
    if (syncingRef.current || !regPaneRef.current || !monthPaneRef.current) return;
    syncingRef.current = true;
    monthPaneRef.current.scrollTop = regPaneRef.current.scrollTop;
    requestAnimationFrame(() => {
      syncingRef.current = false;
    });
  }, []);

  const syncFromMonth = useCallback(() => {
    if (syncingRef.current || !regPaneRef.current || !monthPaneRef.current) return;
    syncingRef.current = true;
    regPaneRef.current.scrollTop = monthPaneRef.current.scrollTop;
    requestAnimationFrame(() => {
      syncingRef.current = false;
    });
  }, []);

  return { regPaneRef, monthPaneRef, syncFromReg, syncFromMonth };
}
