import { AsyncLocalStorage } from 'node:async_hooks';
import { Prisma } from '@prisma/client';
import prisma from '../db/prisma';

// Lazy import avoids circular dependency with registrations routes.

export type AppMode = 'nyl' | 'ufa';
export type PublicAppMode = 'nylon' | 'ufa';

export const DEFAULT_APP_BASE_PATH = '/ugt-sales-forecast';
export const UFA_PLANT_CODES = ['1504', '1505', '1506'] as const;

const DEFAULT_ALLOWED_BY_MODE: Record<AppMode, string[]> = {
  nyl: ['Polymer', 'Composite'],
  ufa: ['UFA'],
};

const DISPLAY_NAME_BY_MODE: Record<AppMode, string> = {
  nyl: 'Nylon Sale Forecast',
  ufa: 'UFA Sales Forecast',
};

type AppModeStore = { mode: AppMode };
const appModeStorage = new AsyncLocalStorage<AppModeStore>();

function parseMode(value: string | undefined | null): AppMode {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'ufa') return 'ufa';
  if (normalized === 'nyl' || normalized === 'nylon') return 'nyl';
  return 'nyl';
}

/** Accepts nylon|ufa|nyl (case-insensitive). Unknown values become nylon. */
export function parsePublicAppMode(value: unknown): AppMode {
  return parseMode(typeof value === 'string' ? value : undefined);
}

export function toPublicAppMode(mode: AppMode = getAppMode()): PublicAppMode {
  return mode === 'ufa' ? 'ufa' : 'nylon';
}

export function runWithAppMode<T>(mode: AppMode, fn: () => T): T {
  return appModeStorage.run({ mode }, fn);
}

export function getAppMode(): AppMode {
  const fromRequest = appModeStorage.getStore()?.mode;
  if (fromRequest) return fromRequest;
  // Background jobs / scripts: prefer env only if explicitly set; else Nylon.
  if (process.env.APP_MODE?.trim()) return parseMode(process.env.APP_MODE);
  return 'nyl';
}

export function getAllowedBusinessUnits(mode: AppMode = getAppMode()): string[] {
  // ALLOWED_BUSINESS_UNITS is ignored for request mode; each mode has fixed BU set.
  // Keep env override only when it matches the selected mode (backward compatible).
  const raw = process.env.ALLOWED_BUSINESS_UNITS?.trim();
  if (raw && !appModeStorage.getStore()) {
    const parsed = raw.split(',').map(part => part.trim()).filter(Boolean);
    if (parsed.length > 0) return parsed;
  }
  return [...DEFAULT_ALLOWED_BY_MODE[mode]];
}

export function getAppDisplayName(mode: AppMode = getAppMode()): string {
  // Per-request display name always follows mode (ignore APP_DISPLAY_NAME for switching).
  if (appModeStorage.getStore()) return DISPLAY_NAME_BY_MODE[mode];
  const fromEnv = process.env.APP_DISPLAY_NAME?.trim();
  if (fromEnv) return fromEnv;
  return DISPLAY_NAME_BY_MODE[mode];
}

export function getAppBasePath() {
  return normalizeAppBasePath(process.env.APP_BASE_PATH);
}

export function normalizeAppBasePath(value = process.env.APP_BASE_PATH ?? DEFAULT_APP_BASE_PATH) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed || trimmed === '/') return '';
  return `/${trimmed.replace(/^\/+/, '').replace(/\/+$/, '')}`;
}

export function getAppConfigPublic(mode: AppMode = getAppMode()) {
  return {
    appMode: mode,
    publicMode: toPublicAppMode(mode),
    allowedBusinessUnits: getAllowedBusinessUnits(mode),
    displayName: getAppDisplayName(mode),
    basePath: getAppBasePath() || DEFAULT_APP_BASE_PATH,
  };
}

export function isUfaPlantCode(value: unknown) {
  const plant = String(value ?? '').trim();
  return (UFA_PLANT_CODES as readonly string[]).includes(plant);
}

export function isUfaRegistration(
  businessUnit: string | null | undefined,
  plantCode: string | null | undefined
) {
  const bu = String(businessUnit ?? '').trim().toUpperCase();
  return bu === 'UFA' || isUfaPlantCode(plantCode);
}

/** Whether a registration belongs in the given mode (data is never deleted). */
export function isRegistrationInAppMode(
  businessUnit: string | null | undefined,
  plantCode: string | null | undefined,
  mode: AppMode = getAppMode()
) {
  const isUfa = isUfaRegistration(businessUnit, plantCode);
  return mode === 'ufa' ? isUfa : !isUfa;
}

export function isBusinessUnitAllowed(
  businessUnit: string | null | undefined,
  mode: AppMode = getAppMode()
) {
  const value = String(businessUnit ?? '').trim().toLowerCase();
  if (!value) return false;
  return getAllowedBusinessUnits(mode).some(allowed => allowed.toLowerCase() === value);
}

export function clampBusinessUnitFilterValues(
  values: string[],
  mode: AppMode = getAppMode()
) {
  const allowed = new Set(getAllowedBusinessUnits(mode).map(item => item.toLowerCase()));
  return values.filter(value => allowed.has(value.trim().toLowerCase()));
}

/**
 * Always-on scope so NYL never lists UFA rows and UFA never lists Polymer/Composite.
 * Does not delete data — only filters visibility per request mode.
 */
export function buildAppModeRegistrationScopeSql(
  alias = 'r',
  mode: AppMode = getAppMode()
) {
  const businessUnit = Prisma.raw(`${alias}.BusinessUnit`);
  const plantCode = Prisma.raw(`${alias}.PlantCode`);
  const ufaPlants = Prisma.join(UFA_PLANT_CODES.map(code => Prisma.sql`${code}`));

  if (mode === 'ufa') {
    return Prisma.sql`
      AND (
        UPPER(LTRIM(RTRIM(ISNULL(CONVERT(NVARCHAR(50), ${businessUnit}), N'')))) = N'UFA'
        OR LTRIM(RTRIM(ISNULL(CONVERT(NVARCHAR(100), ${plantCode}), N''))) IN (${ufaPlants})
      )
    `;
  }

  return Prisma.sql`
    AND NOT (
      UPPER(LTRIM(RTRIM(ISNULL(CONVERT(NVARCHAR(50), ${businessUnit}), N'')))) = N'UFA'
      OR LTRIM(RTRIM(ISNULL(CONVERT(NVARCHAR(100), ${plantCode}), N''))) IN (${ufaPlants})
    )
  `;
}

export function getPreferredLegacySheetNames(mode: AppMode = getAppMode()) {
  return mode === 'ufa' ? ['UFA', 'Sheet1'] : ['Polymer', 'Sheet1'];
}

export function getPreferredVersionedSheetNames(mode: AppMode = getAppMode()) {
  return mode === 'ufa' ? ['UFA'] : ['Polymer', 'CP'];
}

/** Excel key plant segment is outside this mode (skip import; do not delete). */
export function isOutOfAppModeImportKey(
  excelKey: string,
  businessUnit?: string | null,
  mode: AppMode = getAppMode()
) {
  const parts = String(excelKey ?? '').split('/').map(part => part.trim());
  // 7-part NewKey: Topic/SoldTo/ShipTo/EndUser/Plant/Material/OnOff — plant at index 4
  // 6-part Key for no regist: plant at index 3
  const plant = parts.length === 7 ? (parts[4] ?? '') : (parts[3] ?? '');
  return !isRegistrationInAppMode(businessUnit, plant, mode);
}

/**
 * Returns registration IDs that are allowed in the current/request mode.
 * Unknown IDs (not found in registration source) are excluded (fail closed).
 */
export async function filterRegistrationIdsInAppMode(
  registrationIds: string[],
  mode: AppMode = getAppMode()
): Promise<string[]> {
  const unique = Array.from(
    new Set(registrationIds.map(id => String(id ?? '').trim()).filter(Boolean))
  );
  if (unique.length === 0) return [];

  const { getRegistrationSourceSql } = await import('../api/routes/registrations');
  const registrationSourceSql = await getRegistrationSourceSql();
  const modeScopeSql = buildAppModeRegistrationScopeSql('r', mode);
  const allowed: string[] = [];
  const chunkSize = 400;
  for (let offset = 0; offset < unique.length; offset += chunkSize) {
    const chunk = unique.slice(offset, offset + chunkSize);
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      WITH registration_source AS (${registrationSourceSql})
      SELECT DISTINCT LTRIM(RTRIM(CONVERT(NVARCHAR(200), r.RegistrationId))) AS id
      FROM registration_source r
      WHERE r.RegistrationId IN (${Prisma.join(chunk)})
        ${modeScopeSql}
    `;
    for (const row of rows) {
      const id = String(row.id ?? '').trim();
      if (id) allowed.push(id);
    }
  }
  return allowed;
}

export async function assertRegistrationIdsInAppMode(
  registrationIds: string[],
  mode: AppMode = getAppMode()
) {
  const unique = Array.from(
    new Set(registrationIds.map(id => String(id ?? '').trim()).filter(Boolean))
  );
  if (unique.length === 0) return;
  const allowed = await filterRegistrationIdsInAppMode(unique, mode);
  if (allowed.length !== unique.length) {
    const error = new Error('One or more registrations are outside the selected application mode');
    (error as Error & { code?: string }).code = 'REGISTRATION_OUT_OF_MODE';
    throw error;
  }
}
