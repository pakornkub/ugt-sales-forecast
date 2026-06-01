import type { CPLPrice, Dimension, ForecastValue, Registration, ValueType } from '../../types/forecast';

const isDailyKey = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const isWeekRangeKey = (value: string) => /^\d{4}-\d{2}-\d{2}\|\d{4}-\d{2}-\d{2}$/.test(value);
const monthKey = (value: string) => {
  if (isDailyKey(value)) return value.slice(0, 7);
  if (isWeekRangeKey(value)) return value.split('|')[0].slice(0, 7);
  return value;
};

export function getForecastCellValue(
  reg: Registration,
  month: string,
  selectedVersion: string,
  selectedDimension: Dimension,
  selectedType: ValueType,
  forecastData: ForecastValue[],
  cplPrices: CPLPrice[],
  forecastMode: 'month' | 'week' | 'day'
): { value: number; isEditable: boolean } {
  const directItem = forecastData.find(
    f => f.registrationId === reg.id && f.version === selectedVersion && f.month === month
  );

  const fallbackItem = isWeekRangeKey(month)
    ? forecastData.find(
        f => f.registrationId === reg.id && f.version === selectedVersion && f.month === monthKey(month)
      )
    : undefined;

  const activeItem = directItem ?? fallbackItem;
  let qtyAct = activeItem?.qtyAct;
  let qtyFcst = activeItem?.qtyFcst;
  const priceAct = activeItem?.priceAct ?? 1500;
  let hasAggregatedDailyData = false;

  if (forecastMode === 'month') {
    const dailyItems = forecastData.filter(
      f =>
        f.registrationId === reg.id &&
        f.version === selectedVersion &&
        isDailyKey(f.month) &&
        f.month.startsWith(`${month}-`)
    );

    if (dailyItems.length > 0) {
      qtyAct = dailyItems.reduce((sum, item) => sum + item.qtyAct, 0);
      qtyFcst = dailyItems.reduce((sum, item) => sum + item.qtyFcst, 0);
      hasAggregatedDailyData = true;
    }
  }

  const cpl = cplPrices.find(c => c.month === monthKey(month))?.price ?? 0;
  const priceFcst = cpl + reg.spread;

  const actValue = qtyAct ?? (directItem ? directItem.qtyAct : 200);
  const fcstValue = qtyFcst ?? (directItem ? directItem.qtyFcst : 0);

  let value = 0;
  let isEditable = false;

  if (selectedDimension === 'Qty') {
    if (selectedType === 'Act') value = actValue;
    else if (selectedType === 'Fcst') {
      value = fcstValue;
      isEditable = !hasAggregatedDailyData;
    } else value = actValue - fcstValue;
  } else if (selectedDimension === 'Price') {
    if (selectedType === 'Act') value = priceAct;
    else if (selectedType === 'Fcst') value = priceFcst;
    else value = priceAct - priceFcst;
  } else {
    const amtAct = actValue * priceAct;
    const amtFcst = fcstValue * priceFcst;
    if (selectedType === 'Act') value = amtAct;
    else if (selectedType === 'Fcst') value = amtFcst;
    else value = amtAct - amtFcst;
  }

  return { value, isEditable };
}
