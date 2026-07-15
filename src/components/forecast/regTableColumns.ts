import type { RegColumnKey } from '../../types/forecast';
import { REG_COLUMN_KEYS } from '../../types/forecast';

export const REG_COLUMN_WIDTH = 120;
export const CUSTOM_COLUMN_WIDTH = 120;
export const CUSTOM_COLUMN_ADD_BUTTON_WIDTH = 40;
export const MONTH_COLUMN_WIDTH = 110;
export const FORMULA_COLUMN_WIDTH = 130;
export const SPREAD_COLUMN_WIDTH = 90;
export const REG_PANE_MIN_WIDTH = 200;
export const REG_PANE_MAX_RATIO = 0.75;

export interface RegColumnDef {
  key: RegColumnKey;
  label: string;
}

export const ALL_REG_COLUMNS: RegColumnDef[] = [
  { key: 'ownerName', label: 'Owner Name' },
  { key: 'businessUnit', label: 'BU' },
  { key: 'registrationTopic', label: 'Registration Topic' },
  { key: 'onOffSpec', label: 'On/Off Spec' },
  { key: 'plantCode', label: 'Plant Code' },
  { key: 'countryName', label: 'Country Name' },
  { key: 'materialDescription', label: 'Material Description' },
  { key: 'materialCode', label: 'Material Code' },
  { key: 'inventoryA0Qty', label: 'A0' },
  { key: 'inventoryNonA0Qty', label: 'NonA0' },
  { key: 'inventoryWaitJudgeQty', label: 'WaitJudge' },
  { key: 'inventoryOgQty', label: 'OG' },
  { key: 'inventoryYoQty', label: 'YO' },
  { key: 'carryInETD', label: 'Carry In ETD' },
  { key: 'carryOutETD', label: 'Carry Out ETD' },
  { key: 'carryInLoading', label: 'Carry In Loading' },
  { key: 'carryOutLoading', label: 'Carry Out Loading' },
  { key: 'shipTo_name', label: 'Ship To' },
  { key: 'soldTo_name', label: 'Sold To' },
  { key: 'end_user', label: 'End User' },
  { key: 'soldToCode', label: 'Sold To Code' },
  { key: 'shipToCode', label: 'Ship To Code' },
  { key: 'group', label: 'Group' },
  { key: 'materialNameOnCoa', label: 'Material Name on COA' },
  { key: 'additionalRequirement', label: 'Additional Requirement' },
  { key: 'pic', label: 'PIC' },
  { key: 'commission', label: 'Commission' },
  { key: 'productDescription', label: 'Product Description' },
  { key: 'classified', label: 'Classified' },
  { key: 'commissionIndirect', label: 'Commission Indirect' },
  { key: 'commissionFinancialDiscount', label: 'Commission Financial Discount' },
  { key: 'newCoaName', label: 'New COA Name' },
  { key: 'newTier1', label: 'New Tier 1' },
  { key: 'newOem', label: 'New OEM' },
  { key: 'packing', label: 'Packing' },
  { key: 'agreedSpecType', label: 'Agreed Spec Type' },
  { key: 'wasteScrap', label: 'Waste Scrap' },
  { key: 'forResaleNotApprove', label: 'For Resale Not Approve' },
  { key: 'imdsDate', label: 'IMDS Date' },
  { key: 'model', label: 'Model' },
  { key: 'createdOn', label: 'Created On' },
  { key: 'approve', label: 'Approve' },
  { key: 'partName', label: 'Part Name' },
  { key: 'coaName', label: 'COA Name' },
  { key: 'process', label: 'Process' },
  { key: 'application', label: 'Application' },
  { key: 'subApp', label: 'Sub App' },
  { key: 'zoneName', label: 'Zone Name' },
  { key: 'plantName', label: 'Plant Name' },
  { key: 'countryCode', label: 'Country Code' },
  { key: 'endUserCode', label: 'End User Code' },
  { key: 'endUserExportControl', label: 'End User Export Control' },
  { key: 'endUserName', label: 'End User Name' },
  { key: 'productName', label: 'Product Name' },
  { key: 'productNamePud', label: 'Product Name (PUD)' },
  { key: 'gradeUfa', label: 'Grade(UFA)' },
  { key: 'gradeSap', label: 'Grade(SAP)' },
  { key: 'column1', label: 'Column 1' },
  { key: 'priceFormula', label: 'Formula' },
  { key: 'spread', label: 'Spread' },
];

const UFA_ONLY_COLUMN_KEYS = new Set<RegColumnKey>([
  'productNamePud',
  'gradeUfa',
  'gradeSap',
]);

export function getRegColumnsForAppMode(appMode?: 'nyl' | 'ufa' | null): RegColumnDef[] {
  if (appMode === 'ufa') return ALL_REG_COLUMNS;
  return ALL_REG_COLUMNS.filter(col => !UFA_ONLY_COLUMN_KEYS.has(col.key));
}

const columnDefMap = Object.fromEntries(
  ALL_REG_COLUMNS.map(col => [col.key, col])
) as Record<RegColumnKey, RegColumnDef>;

const baseColumnOrder = REG_COLUMN_KEYS.filter(
  key => key !== 'priceFormula' && key !== 'spread',
);
const carryOutLoadingIndex = baseColumnOrder.indexOf('carryOutLoading');

export const DEFAULT_COLUMN_ORDER: RegColumnKey[] = [
  ...baseColumnOrder.slice(0, carryOutLoadingIndex + 1),
  'priceFormula',
  'spread',
  ...baseColumnOrder.slice(carryOutLoadingIndex + 1),
];

// Limit default visible columns to an approved, sensible subset
export const DEFAULT_VISIBLE_COLUMN_KEYS: RegColumnKey[] = [
  'ownerName',
  'businessUnit',
  'registrationTopic',
  'shipToCode',
  'endUserCode',
  'materialCode',
  'materialDescription',
  'inventoryA0Qty',
  'inventoryNonA0Qty',
  'inventoryWaitJudgeQty',
  'inventoryOgQty',
  'inventoryYoQty',
  'carryInETD',
  'carryOutETD',
  'carryInLoading',
  'carryOutLoading',
  'priceFormula',
  'spread',
  'plantName',
  'countryName',
  'shipTo_name',
  'soldTo_name',
  'partName',
  'productName',
];

export function getDefaultVisibleColumnKeys(appMode?: 'nyl' | 'ufa' | null): RegColumnKey[] {
  if (appMode !== 'ufa') return DEFAULT_VISIBLE_COLUMN_KEYS;
  const withUfa: RegColumnKey[] = DEFAULT_VISIBLE_COLUMN_KEYS.filter(key => key !== 'productName');
  const insertAt = withUfa.indexOf('partName');
  const ufaCols: RegColumnKey[] = ['productNamePud', 'gradeUfa', 'gradeSap'];
  if (insertAt >= 0) {
    withUfa.splice(insertAt + 1, 0, ...ufaCols);
  } else {
    withUfa.push(...ufaCols);
  }
  return withUfa;
}

export interface OrderedRegColumn extends RegColumnDef {
  width: number;
}

export function getOrderedColumns(
  columnOrder: RegColumnKey[],
  appMode?: 'nyl' | 'ufa' | null
): OrderedRegColumn[] {
  const defs = getRegColumnsForAppMode(appMode);
  const map = Object.fromEntries(defs.map(col => [col.key, col])) as Record<RegColumnKey, RegColumnDef>;
  return columnOrder
    .map(key => map[key] ?? columnDefMap[key])
    .filter((col): col is RegColumnDef => Boolean(col))
    .map(col => ({
      ...col,
      width: col.key === 'priceFormula'
        ? FORMULA_COLUMN_WIDTH
        : col.key === 'spread'
          ? SPREAD_COLUMN_WIDTH
          : REG_COLUMN_WIDTH,
    }));
}

export function getRegColumnsTotalWidth(columns: OrderedRegColumn[]): number {
  return columns.reduce((sum, col) => sum + col.width, 0);
}

export function getCustomColumnsTotalWidth(columnCount: number, includeAddButton = false): number {
  if (columnCount === 0 && !includeAddButton) return 0;
  return (columnCount * CUSTOM_COLUMN_WIDTH) + (includeAddButton ? CUSTOM_COLUMN_ADD_BUTTON_WIDTH : 0);
}

export function reorderColumns(
  order: RegColumnKey[],
  draggedKey: RegColumnKey,
  targetKey: RegColumnKey
): RegColumnKey[] {
  if (draggedKey === targetKey) return order;
  const next = order.filter(k => k !== draggedKey);
  const targetIndex = next.indexOf(targetKey);
  if (targetIndex === -1) return order;
  next.splice(targetIndex, 0, draggedKey);
  return next;
}
