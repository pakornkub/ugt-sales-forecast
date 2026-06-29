import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';

const UFA_PLANTS = new Set(['1504', '1505', '1506']);
const POLYMER_PLANTS = new Set(['1104', '1105', '1109']);

let crmBusinessUnitColumnPromise: Promise<boolean> | null = null;

function normalizePlantCode(value: unknown) {
  return String(value ?? '').trim();
}

export function businessUnitFromPlantCode(value: unknown) {
  const plantCode = normalizePlantCode(value);
  if (UFA_PLANTS.has(plantCode)) return 'UFA';
  if (POLYMER_PLANTS.has(plantCode)) return 'Polymer';
  return 'Composite';
}

export async function hasCrmBusinessUnitColumn() {
  if (!crmBusinessUnitColumnPromise) {
    crmBusinessUnitColumnPromise = prisma.$queryRaw<Array<{ hasColumn: number }>>`
      SELECT CASE WHEN EXISTS (
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'dbo'
          AND TABLE_NAME = 'VW_CRM_RegistrationAll_1'
          AND COLUMN_NAME = 'BU'
      ) THEN 1 ELSE 0 END AS hasColumn
    `.then(rows => Number(rows[0]?.hasColumn ?? 0) === 1);
  }
  return crmBusinessUnitColumnPromise;
}

export async function crmBusinessUnitSelectSql(alias = 'r', columnAlias = 'BusinessUnit') {
  if (await hasCrmBusinessUnitColumn()) {
    return Prisma.sql`NULLIF(LTRIM(RTRIM(CAST(${Prisma.raw(`${alias}.BU`)} AS NVARCHAR(50)))), '') AS ${Prisma.raw(columnAlias)}`;
  }
  return Prisma.sql`CAST(NULL AS NVARCHAR(50)) AS ${Prisma.raw(columnAlias)}`;
}

export async function crmBusinessUnitSelectRaw(columnAlias = 'businessUnit') {
  if (await hasCrmBusinessUnitColumn()) {
    return `NULLIF(LTRIM(RTRIM(CAST(r.BU AS NVARCHAR(50)))), '') AS ${columnAlias}`;
  }
  return `CAST(NULL AS NVARCHAR(50)) AS ${columnAlias}`;
}
