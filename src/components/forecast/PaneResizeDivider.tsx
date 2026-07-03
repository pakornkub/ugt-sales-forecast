import React from 'react';
import { cn } from '../../lib/utils';

export function PaneResizeDivider({
  onPointerDown,
  isDragging,
}: Readonly<{
  onPointerDown: (e: React.PointerEvent) => void;
  isDragging: boolean;
}>) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize fixed columns and month sections"
      onPointerDown={onPointerDown}
      className={cn(
        'shrink-0 w-1.5 cursor-col-resize touch-none relative z-20 group',
        'hover:w-2 transition-[width] duration-150',
        isDragging && 'w-2'
      )}
    >
      <div
        className={cn(
          'absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-slate-200 transition-colors',
          'group-hover:bg-blue-400',
          isDragging && 'bg-blue-500 w-0.5'
        )}
      />
      <div
        className={cn(
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 rounded-full',
          'bg-slate-300 opacity-0 group-hover:opacity-100 transition-opacity',
          isDragging && 'opacity-100 bg-blue-500'
        )}
      />
    </div>
  );
}
