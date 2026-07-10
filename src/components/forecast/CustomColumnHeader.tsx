import React from 'react';
import { cn } from '../../lib/utils';
import type { ColumnFilterValue, CustomColumnDef } from '../../types/forecast';
import { customColumnFilterKey } from '../../types/forecast';
import { FilterDropdown } from './FilterDropdown';
import { forecastHeaderCellClass } from './forecastTableMetrics';
import { CUSTOM_COLUMN_WIDTH } from './regTableColumns';

export function CustomColumnHeader({
  column,
  filterValue,
  onFilterChange,
  staticOptions,
}: Readonly<{
  column: CustomColumnDef;
  filterValue: ColumnFilterValue;
  onFilterChange: (value: ColumnFilterValue) => void;
  staticOptions: string[];
}>) {
  const filterKey = customColumnFilterKey(column.id);

  return (
    <th
      style={{ width: CUSTOM_COLUMN_WIDTH, minWidth: CUSTOM_COLUMN_WIDTH, maxWidth: CUSTOM_COLUMN_WIDTH }}
      className={cn(
        'sticky top-0 z-20 p-0 text-[10px] text-slate-500 uppercase text-left font-black border-r border-slate-200 bg-slate-100 align-middle overflow-visible',
      )}
    >
      <div className={forecastHeaderCellClass}>
        <div className="flex-1 min-w-0 min-h-0 overflow-visible">
          <FilterDropdown
            columnKey={filterKey}
            label={column.name}
            registrations={[]}
            staticOptions={staticOptions}
            value={filterValue}
            onChange={onFilterChange}
          />
        </div>
      </div>
    </th>
  );
}
