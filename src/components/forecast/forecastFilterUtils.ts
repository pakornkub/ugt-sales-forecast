import type { ColumnFilterValue, ColumnFiltersState, Registration } from '../../types/forecast';
import { EMPTY_COLUMN_FILTER } from '../../types/forecast';

export function getRegistrationFieldValue(reg: Registration, key: string): string {
  const value = reg[key as keyof Registration];
  if (key.startsWith('inventory') && typeof value === 'number') {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    });
  }
  return String(value ?? '');
}

export function getUniqueColumnValues(registrations: Registration[], key: string): string[] {
  const values = new Set<string>();
  registrations.forEach(reg => {
    const v = getRegistrationFieldValue(reg, key).trim();
    if (v) values.add(v);
  });
  return Array.from(values).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function normalizeColumnFilter(filter?: ColumnFilterValue): ColumnFilterValue {
  return filter ?? { ...EMPTY_COLUMN_FILTER };
}

export function isColumnFilterActive(filter?: ColumnFilterValue): boolean {
  return normalizeColumnFilter(filter).selectedValues.length > 0;
}

export function hasActiveColumnFilters(filters: ColumnFiltersState): boolean {
  return Object.values(filters).some(isColumnFilterActive);
}

export function matchesColumnFilter(reg: Registration, key: string, filter?: ColumnFilterValue): boolean {
  const { selectedValues } = normalizeColumnFilter(filter);
  if (selectedValues.length === 0) return true;

  const regLower = getRegistrationFieldValue(reg, key).toLowerCase();
  return selectedValues.some(selected => regLower === selected.toLowerCase());
}

export function filterRegistrations(
  registrations: Registration[],
  columnFilters: ColumnFiltersState
): Registration[] {
  return registrations.filter(reg =>
    Object.entries(columnFilters).every(([key, filter]) =>
      matchesColumnFilter(reg, key, filter)
    )
  );
}
