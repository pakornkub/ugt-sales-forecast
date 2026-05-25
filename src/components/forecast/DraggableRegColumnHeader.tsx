import React from 'react';
import { GripVertical } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ColumnFilterValue, Registration, RegColumnKey } from '../../types/forecast';
import { FilterDropdown } from './FilterDropdown';
import { normalizeColumnFilter } from './forecastFilterUtils';
import { forecastHeaderCellClass } from './forecastTableMetrics';
import type { OrderedRegColumn } from './regTableColumns';

export function DraggableRegColumnHeader({
  column,
  allRegistrations,
  columnFilters,
  onColumnFilterChange,
  isDragging,
  isDragOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  column: OrderedRegColumn;
  allRegistrations: Registration[];
  columnFilters: Record<string, ColumnFilterValue | undefined>;
  onColumnFilterChange: (key: RegColumnKey, value: ColumnFilterValue) => void;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (key: RegColumnKey) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, key: RegColumnKey) => void;
  onDragLeave: () => void;
  onDrop: (key: RegColumnKey) => void;
}) {
  const { key, label, width } = column;

  return (
    <th
      draggable
      onDragStart={e => {
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(key);
      }}
      onDragEnd={onDragEnd}
      onDragOver={e => {
        e.preventDefault();
        onDragOver(e, key);
      }}
      onDragLeave={onDragLeave}
      onDrop={e => {
        e.preventDefault();
        onDrop(key);
      }}
      style={{ width, minWidth: width, maxWidth: width }}
      className={cn(
        'sticky top-0 z-20 p-0 text-[10px] text-slate-500 uppercase text-left font-black border-r border-slate-200 bg-slate-100 align-middle overflow-visible',
        'group cursor-grab active:cursor-grabbing transition-all duration-200',
        isDragging && 'opacity-40 scale-[0.98]',
        isDragOver && 'ring-2 ring-inset ring-blue-400 bg-blue-50/80'
      )}
    >
      <div className={forecastHeaderCellClass}>
        <GripVertical size={10} className="shrink-0 text-slate-300 group-hover:text-slate-500" />
        <div className="flex-1 min-w-0 min-h-0 overflow-visible">
          <FilterDropdown
            columnKey={key}
            label={label}
            registrations={allRegistrations}
            value={normalizeColumnFilter(columnFilters[key])}
            onChange={v => onColumnFilterChange(key, v)}
          />
        </div>
      </div>
    </th>
  );
}
