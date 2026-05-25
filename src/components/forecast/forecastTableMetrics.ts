/** Shared pixel heights so REG and month panes stay row-aligned. */
export const FORECAST_TABLE_METRICS = {
  headerHeight: 76,
  bodyRowHeight: 36,
  footerHeight: 44,
} as const;

export const forecastTheadRowStyle = {
  height: FORECAST_TABLE_METRICS.headerHeight,
  maxHeight: FORECAST_TABLE_METRICS.headerHeight,
} as const;

export const forecastTbodyRowStyle = {
  height: FORECAST_TABLE_METRICS.bodyRowHeight,
  maxHeight: FORECAST_TABLE_METRICS.bodyRowHeight,
} as const;

export const forecastTfootRowStyle = {
  height: FORECAST_TABLE_METRICS.footerHeight,
  maxHeight: FORECAST_TABLE_METRICS.footerHeight,
} as const;

export const forecastCellInnerClass =
  'h-full w-full flex items-center box-border overflow-hidden';

export const forecastHeaderCellClass = `${forecastCellInnerClass} px-2 py-1`;

export const forecastBodyCellClass = `${forecastCellInnerClass} px-2 text-[11px]`;

export const forecastFooterCellClass = `${forecastCellInnerClass} px-2 text-[10px] font-bold uppercase`;
