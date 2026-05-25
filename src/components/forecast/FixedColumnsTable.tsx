import React, { RefObject } from 'react';
import { cn } from '../../lib/utils';
import type {
  ColumnFilterValue,
  ColumnFiltersState,
  Dimension,
  Registration,
  RegColumnKey,
} from '../../types/forecast';
import { DraggableRegColumnHeader } from './DraggableRegColumnHeader';
import {
  forecastFooterCellClass,
  forecastTbodyRowStyle,
  forecastTfootRowStyle,
  forecastTheadRowStyle,
} from './forecastTableMetrics';
import { RegTableCell } from './RegTableCell';
import type { OrderedRegColumn } from './regTableColumns';

interface FixedColumnsTableProps {
  scrollRef: RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  tableWidth: number;
  columns: OrderedRegColumn[];
  registrations: Registration[];
  allRegistrations: Registration[];
  columnFilters: ColumnFiltersState;
  onColumnFilterChange: (key: RegColumnKey, value: ColumnFilterValue) => void;
  draggedColumnKey: RegColumnKey | null;
  dragOverColumnKey: RegColumnKey | null;
  onDragStart: (key: RegColumnKey) => void;
  onDragEnd: () => void;
  onDragOver: (key: RegColumnKey) => void;
  onDragLeave: () => void;
  onColumnDrop: (key: RegColumnKey) => void;
  selectedDimension: Dimension;
}

export function FixedColumnsTable({
  scrollRef,
  onScroll,
  tableWidth,
  columns,
  registrations,
  allRegistrations,
  columnFilters,
  onColumnFilterChange,
  draggedColumnKey,
  dragOverColumnKey,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onColumnDrop,
  selectedDimension,
}: FixedColumnsTableProps) {
  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className="flex-1 min-h-0 min-w-0 w-full forecast-reg-pane forecast-table-scroll"
    >
      <table
        className="border-collapse table-fixed"
        style={{ width: tableWidth, minWidth: tableWidth }}
      >
        <thead>
          <tr className="divide-x divide-slate-200" style={forecastTheadRowStyle}>
            {columns.map(col => (
              <DraggableRegColumnHeader
                key={col.key}
                column={col}
                allRegistrations={allRegistrations}
                columnFilters={columnFilters}
                onColumnFilterChange={onColumnFilterChange}
                isDragging={draggedColumnKey === col.key}
                isDragOver={dragOverColumnKey === col.key && draggedColumnKey !== col.key}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragOver={(_e, key) => onDragOver(key)}
                onDragLeave={onDragLeave}
                onDrop={onColumnDrop}
              />
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {registrations.map(reg => (
            <tr key={reg.id} className="hover:bg-slate-50 group" style={forecastTbodyRowStyle}>
              {columns.map(col => (
                <RegTableCell key={col.key} reg={reg} columnKey={col.key} width={col.width} />
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot className="shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
          <tr style={forecastTfootRowStyle}>
            <td
              colSpan={columns.length}
              className="sticky bottom-0 z-20 p-0 bg-slate-900 border-r border-slate-700 align-middle overflow-hidden"
            >
              <div
                className={cn(
                  forecastFooterCellClass,
                  'justify-end text-slate-400 tracking-widest'
                )}
              >
                Monthly Aggregated {selectedDimension}
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
