import type { CPLPrice, Dimension, ForecastValue, Registration, ValueType } from '../../types/forecast';

export function getForecastCellValue(
  reg: Registration,
  month: string,
  selectedVersion: string,
  selectedDimension: Dimension,
  selectedType: ValueType,
  forecastData: ForecastValue[],
  cplPrices: CPLPrice[]
): { value: number; isEditable: boolean } {
  const item = forecastData.find(
    f => f.registrationId === reg.id && f.month === month && f.version === selectedVersion
  );
  const cpl = cplPrices.find(c => c.month === month)?.price ?? 0;
  const priceFcst = cpl + reg.spread;
  const qtyAct = item?.qtyAct ?? 200;
  const priceAct = item?.priceAct ?? 1500;
  const qtyFcst = item?.qtyFcst ?? 0;

  let value = 0;
  let isEditable = false;

  if (selectedDimension === 'Qty') {
    if (selectedType === 'Act') value = qtyAct;
    else if (selectedType === 'Fcst') {
      value = qtyFcst;
      isEditable = true;
    } else value = qtyAct - qtyFcst;
  } else if (selectedDimension === 'Price') {
    if (selectedType === 'Act') value = priceAct;
    else if (selectedType === 'Fcst') value = priceFcst;
    else value = priceAct - priceFcst;
  } else {
    const amtAct = qtyAct * priceAct;
    const amtFcst = qtyFcst * priceFcst;
    if (selectedType === 'Act') value = amtAct;
    else if (selectedType === 'Fcst') value = amtFcst;
    else value = amtAct - amtFcst;
  }

  return { value, isEditable };
}
