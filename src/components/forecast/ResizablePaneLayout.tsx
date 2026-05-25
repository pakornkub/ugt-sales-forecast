import React, { RefObject } from 'react';
import { cn } from '../../lib/utils';
import { PaneResizeDivider } from './PaneResizeDivider';

interface ResizablePaneLayoutProps {
  splitContainerRef: RefObject<HTMLDivElement | null>;
  regPaneWidth: number;
  isDragging: boolean;
  onDividerPointerDown: (e: React.PointerEvent) => void;
  fixedPane: React.ReactNode;
  monthPane: React.ReactNode;
}

/**
 * Flex split: fixed-width left pane + divider + month pane fills remaining space to the right edge.
 */
export function ResizablePaneLayout({
  splitContainerRef,
  regPaneWidth,
  isDragging,
  onDividerPointerDown,
  fixedPane,
  monthPane,
}: ResizablePaneLayoutProps) {
  return (
    <div
      ref={splitContainerRef}
      id="forecast-table-split-container"
      className={cn(
        'flex flex-1 min-h-0 w-full min-w-0',
        isDragging && 'select-none'
      )}
    >
      <div
        className="shrink-0 flex flex-col min-h-0 min-w-0 bg-white shadow-[4px_0_12px_-6px_rgba(15,23,42,0.12)] z-10"
        style={{ width: regPaneWidth, flexShrink: 0 }}
      >
        {fixedPane}
      </div>

      <PaneResizeDivider onPointerDown={onDividerPointerDown} isDragging={isDragging} />

      <div className="flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden">
        {monthPane}
      </div>
    </div>
  );
}
