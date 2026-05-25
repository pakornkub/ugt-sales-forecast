import React from 'react';
import { cn } from '../../lib/utils';
import type { Registration, RegColumnKey } from '../../types/forecast';
import { forecastBodyCellClass } from './forecastTableMetrics';
import { getRegistrationFieldValue } from './forecastFilterUtils';

const cellStyles: Partial<Record<RegColumnKey, string>> = {
  ownerName: 'font-semibold text-slate-700',
  registrationTopic: 'font-mono text-slate-500 text-[10px]',
  materialCode: 'font-mono text-slate-500 uppercase',
  plantCode: 'font-mono font-bold text-blue-700',
  onOffSpec: 'font-bold text-slate-600',
};

export function RegTableCell({
  reg,
  columnKey,
  width,
}: {
  reg: Registration;
  columnKey: RegColumnKey;
  width: number;
}) {
  const value = getRegistrationFieldValue(reg, columnKey);
  return (
    <td
      style={{ width, minWidth: width, maxWidth: width }}
      className="p-0 border-r border-slate-100 bg-white align-middle overflow-hidden"
    >
      <div
        className={cn(
          forecastBodyCellClass,
          'group-hover:bg-slate-50 transition-colors truncate',
          cellStyles[columnKey] ?? 'text-slate-600'
        )}
        title={value}
      >
        {value}
      </div>
    </td>
  );
}
