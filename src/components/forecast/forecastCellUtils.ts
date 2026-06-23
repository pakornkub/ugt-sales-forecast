import { addDays, endOfMonth, format, getDay, parseISO, startOfMonth } from 'date-fns';
import type { CPLPrice, Dimension, ForecastValue, PriceFormula, Registration, ValueType } from '../../types/forecast';

const isDailyKey = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const isWeekRangeKey = (value: string) => /^\d{4}-\d{2}-\d{2}\|\d{4}-\d{2}-\d{2}$/.test(value);
export const monthKey = (value: string) => {
  if (isDailyKey(value)) return value.slice(0, 7);
  if (isWeekRangeKey(value)) return value.split('|')[0].slice(0, 7);
  return value;
};

function firstWednesdayOfMonth(value: string) {
  const monthStart = startOfMonth(parseISO(`${value}-01`));
  return format(addDays(monthStart, (3 - getDay(monthStart) + 7) % 7), 'yyyy-MM-dd');
}

export function getForecastCellValue(
  reg: Registration,
  month: string,
  selectedVersion: string,
  selectedDimension: Dimension,
  selectedType: ValueType,
  forecastData: ForecastValue[],
  cplPrices: CPLPrice[],
  forecastMode: 'month' | 'week' | 'day',
  planningView: 'sale' | 'accounting' | 'production',
  forecastIndex?: Map<string, ForecastValue>,
  formula?: PriceFormula,
  naphthaprices?: CPLPrice[],
  benzeneprices?: CPLPrice[],
  fixedPriceMap?: Map<string, Map<string, number>>,
  priceMaps?: {
    cpl: Map<string, number>;
    naphtha: Map<string, number>;
    benzene: Map<string, number>;
  }
): { value: number; isEditable: boolean } {
  const directItem = forecastIndex
    ? forecastIndex.get(`${reg.id}|${selectedVersion}|${month}`)
    : forecastData.find(
        f => f.registrationId === reg.id && f.version === selectedVersion && f.month === month
      );

  const fallbackItem = isWeekRangeKey(month)
    ? (forecastIndex
        ? forecastIndex.get(`${reg.id}|${selectedVersion}|${monthKey(month)}`)
        : forecastData.find(
            f => f.registrationId === reg.id && f.version === selectedVersion && f.month === monthKey(month)
          ))
    : forecastMode === 'week' && isDailyKey(month)
      ? forecastData.find(f => {
          if (f.registrationId !== reg.id || f.version !== selectedVersion || !isWeekRangeKey(f.month)) return false;
          const [rangeStart, rangeEnd] = f.month.split('|');
          return month >= rangeStart && month <= rangeEnd;
        }) ?? (
          month === firstWednesdayOfMonth(monthKey(month))
            ? (forecastIndex
                ? forecastIndex.get(`${reg.id}|${selectedVersion}|${monthKey(month)}`)
                : forecastData.find(
                    f =>
                      f.registrationId === reg.id &&
                      f.version === selectedVersion &&
                      f.month === monthKey(month)
                  ))
            : undefined
        )
      : undefined;

  const activeItem = directItem ?? fallbackItem;
  // Actual is shared across forecast versions. Resolve it by registration and
  // period so a missing/stale version selection cannot hide real DB actuals.
  const actualItem = forecastIndex
    ? forecastIndex.get(`actual|${reg.id}|${month}`) ?? activeItem
    : forecastData.find(
        f =>
          f.registrationId === reg.id &&
          f.month === month &&
          (
            f.qtyAct !== 0 ||
            (f.amountAct ?? 0) !== 0 ||
            (f.carryInETD ?? 0) !== 0 ||
            (f.carryOutETD ?? 0) !== 0 ||
            (f.carryInLoading ?? 0) !== 0 ||
            (f.carryOutLoading ?? 0) !== 0
          )
      ) ?? forecastData.find(
        f => f.registrationId === reg.id && f.month === month
      ) ?? activeItem;
  let qtyAct = actualItem?.qtyAct;
  let qtyFcst = activeItem?.qtyFcst;
  const priceAct = actualItem?.priceAct ?? 0;
  let hasAggregatedDailyData = false;

  if (forecastMode === 'month') {
    if (forecastIndex) {
      const aggregate =
        forecastIndex.get(`weeklyMonth|${reg.id}|${selectedVersion}|${month}`) ??
        forecastIndex.get(`dailyMonth|${reg.id}|${selectedVersion}|${month}`);
      if (aggregate) {
        qtyFcst = aggregate.qtyFcst;
        hasAggregatedDailyData = true;
      }
    } else {
    // Prefer aggregating from weekly entries if present (week is lowest editable level).
    const monthStartStr = format(parseISO(`${month}-01`), 'yyyy-MM-dd');
    const monthEndStr = format(endOfMonth(parseISO(`${month}-01`)), 'yyyy-MM-dd');

    const weeklyItems = forecastData.filter(
      f =>
        f.registrationId === reg.id &&
        f.version === selectedVersion &&
        isWeekRangeKey(f.month) &&
        // include week if it overlaps the month
        (() => {
          const [ws, we] = f.month.split('|');
          return ws <= monthEndStr && we >= monthStartStr;
        })()
    );

    if (weeklyItems.length > 0) {
      qtyFcst = weeklyItems.reduce((sum, item) => sum + item.qtyFcst, 0);
      hasAggregatedDailyData = true;
    } else {
      const dailyItems = forecastData.filter(
        f =>
          f.registrationId === reg.id &&
          f.version === selectedVersion &&
          isDailyKey(f.month) &&
          f.month.startsWith(`${month}-`)
      );

      if (dailyItems.length > 0) {
        qtyFcst = dailyItems.reduce((sum, item) => sum + item.qtyFcst, 0);
        hasAggregatedDailyData = true;
      }
    }
    }
  } else if (forecastMode === 'week' && isWeekRangeKey(month)) {
    const [rangeStart, rangeEnd] = month.split('|');
    const dailyItems = forecastData.filter(
      f =>
        f.registrationId === reg.id &&
        f.version === selectedVersion &&
        isDailyKey(f.month) &&
        f.month >= rangeStart &&
        f.month <= rangeEnd
    );

    if (dailyItems.length > 0) {
      qtyAct = dailyItems.reduce((sum, item) => sum + item.qtyAct, 0);
      qtyFcst = dailyItems.reduce((sum, item) => sum + item.qtyFcst, 0);
      hasAggregatedDailyData = true;
    }
  }

  const pricingMonth = monthKey(month);
  const cpl = priceMaps?.cpl.get(pricingMonth) ?? cplPrices.find(c => c.month === pricingMonth)?.price ?? 0;
  const naphtha = priceMaps?.naphtha.get(pricingMonth) ?? (naphthaprices ?? []).find(c => c.month === pricingMonth)?.price ?? 0;
  const benzene = priceMaps?.benzene.get(pricingMonth) ?? (benzeneprices ?? []).find(c => c.month === pricingMonth)?.price ?? 0;

  let priceFcst: number;
  const resolvedFormula = formula ?? 'CPL';
  if (resolvedFormula === 'Naphtha') {
    priceFcst = naphtha;
  } else if (resolvedFormula === 'Benzene') {
    priceFcst = benzene;
  } else if (resolvedFormula === 'Fixed Price') {
    priceFcst = fixedPriceMap?.get(reg.id)?.get(pricingMonth) ?? (cpl + reg.spread);
  } else {
    // CPL
    priceFcst = cpl + reg.spread;
  }

  const baseActValue = qtyAct ?? 0;
  const baseAmountAct = actualItem?.amountAct ?? baseActValue * priceAct;
  const baseFcstValue = qtyFcst ?? (directItem ? directItem.qtyFcst : 0);
  const carryInETD = actualItem?.carryInETD ?? 0;
  const carryOutETD = actualItem?.carryOutETD ?? 0;
  const carryInLoading = actualItem?.carryInLoading ?? 0;
  const carryOutLoading = actualItem?.carryOutLoading ?? 0;
  const actValue = (() => {
    if (planningView === 'accounting') {
      return baseActValue + carryInETD - carryOutETD;
    }
    if (planningView === 'production') {
      return baseActValue + carryInLoading - carryOutLoading;
    }
    return baseActValue;
  })();
  const fcstValue = (() => {
    if (planningView === 'accounting') {
      return baseFcstValue + carryInETD - carryOutETD;
    }
    if (planningView === 'production') {
      return baseFcstValue + carryInLoading - carryOutLoading;
    }
    return baseFcstValue;
  })();

  let value = 0;
  let isEditable = false;

  if (selectedDimension === 'Qty') {
    if (selectedType === 'Act') value = actValue;
    else if (selectedType === 'Fcst') {
      value = fcstValue;
      if (planningView === 'sale' && reg.sourceStatus !== 'actual_only') {
        // Week mode is the lowest editable level: allow editing weekly FCST
        isEditable = forecastMode === 'week' ? true : !hasAggregatedDailyData;
      } else {
        isEditable = false;
      }
    } else value = actValue - fcstValue;
  } else if (selectedDimension === 'Price') {
    if (selectedType === 'Act') value = priceAct;
    else if (selectedType === 'Fcst') {
      value = priceFcst;
      if (resolvedFormula === 'Fixed Price') isEditable = true;
    }
    else value = priceAct - priceFcst;
  } else {
    const amtAct = planningView === 'sale'
      ? baseAmountAct
      : baseAmountAct + (actValue - baseActValue) * priceAct;
    const amtFcst = fcstValue * priceFcst;
    if (selectedType === 'Act') value = amtAct;
    else if (selectedType === 'Fcst') value = amtFcst;
    else value = amtAct - amtFcst;
  }

  return { value, isEditable };
}
