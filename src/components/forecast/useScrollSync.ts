import { useCallback, useRef, useState } from 'react';
import { FORECAST_TABLE_METRICS } from './forecastTableMetrics';

export function useScrollSync() {
  const regPaneRef = useRef<HTMLDivElement>(null);
  const monthPaneRef = useRef<HTMLDivElement>(null);
  const scrollTopRef = useRef(0);
  const renderedRowRef = useRef(0);
  const [scrollTop, setScrollTopState] = useState(0);

  const setScrollTop = useCallback((value: number) => {
    scrollTopRef.current = value;
    const rowIndex = Math.floor(value / FORECAST_TABLE_METRICS.bodyRowHeight);
    if (renderedRowRef.current === rowIndex) return;
    renderedRowRef.current = rowIndex;
    setScrollTopState(rowIndex * FORECAST_TABLE_METRICS.bodyRowHeight);
  }, []);

  // Sync vertically in the same scroll event. Horizontal positions stay independent.
  const syncFromReg = useCallback(() => {
    const source = regPaneRef.current;
    const target = monthPaneRef.current;
    if (!source || !target) return;
    const nextScrollTop = source.scrollTop;
    if (target.scrollTop !== nextScrollTop) target.scrollTop = nextScrollTop;
    setScrollTop(nextScrollTop);
  }, [setScrollTop]);

  const syncFromMonth = useCallback(() => {
    const source = monthPaneRef.current;
    const target = regPaneRef.current;
    if (!source || !target) return;
    const nextScrollTop = source.scrollTop;
    if (target.scrollTop !== nextScrollTop) target.scrollTop = nextScrollTop;
    setScrollTop(nextScrollTop);
  }, [setScrollTop]);

  const resetScrollTop = useCallback(() => {
    if (regPaneRef.current) regPaneRef.current.scrollTop = 0;
    if (monthPaneRef.current) monthPaneRef.current.scrollTop = 0;
    renderedRowRef.current = 0;
    setScrollTop(0);
  }, [setScrollTop]);

  return { regPaneRef, monthPaneRef, scrollTop, syncFromReg, syncFromMonth, resetScrollTop };
}
