import { readFileSync, existsSync } from 'node:fs';
import * as XLSX from 'xlsx';
import prisma from '../src/db/prisma.ts';

const apply = process.argv.includes('--apply');
const EXCEL_CANDIDATES = [
  'c:/Users/Tapanawat/Downloads/Upload_Fcst_NYL(07-07-2026).xlsx',
  'c:/Users/Tapanawat/Downloads/Upload_Fcst_NYL.xlsx',
];

console.log(apply ? 'MODE: APPLY' : 'MODE: dry-run');

function text(value) {
  return String(value ?? '').trim();
}

function normalizeUbJKeyToStored(excelKey) {
  const parts = excelKey.split('/');
  if (parts.length !== 6) return null;
  if (parts[3].toUpperCase() !== 'UBJ') return null;
  parts[3] = '0';
  return parts.join('/');
}

const ubjExcelKeys = new Set();
const excelPath = EXCEL_CANDIDATES.find(path => existsSync(path));
if (excelPath) {
  const wb = XLSX.read(readFileSync(excelPath), { type: 'buffer' });
  for (const sheetName of ['Polymer', 'CP']) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, blankrows: false });
    for (let i = 1; i < rows.length; i += 1) {
      const key = text(rows[i]?.[0]);
      if (key.toUpperCase().includes('/UBJ/')) ubjExcelKeys.add(key);
    }
  }
  console.log('Excel:', excelPath, 'UBJ keys:', ubjExcelKeys.size);
}

const storedFromExcel = [...ubjExcelKeys].map(normalizeUbJKeyToStored).filter(Boolean);
const exactKeys = [...new Set([...ubjExcelKeys, ...storedFromExcel])];

const managedExact = exactKeys.length === 0
  ? []
  : await prisma.masterDataCrmRegistration.findMany({
      where: { keyForNoCRM: { in: exactKeys } },
      select: { id: true, newKey: true, keyForNoCRM: true, plantCode: true, createdBy: true },
    });

const managedText = await prisma.$queryRaw`
  SELECT id, newKey, keyForNoCRM, plantCode, plantName, createdBy
  FROM dbo.master_data_crm_registrations
  WHERE keyForNoCRM LIKE N'%/UBJ/%'
     OR newKey LIKE N'%/UBJ/%'
     OR UPPER(LTRIM(RTRIM(ISNULL(plantCode, N'')))) = N'UBJ'
     OR UPPER(LTRIM(RTRIM(ISNULL(plantName, N'')))) = N'UBJ'
`;

const byId = new Map();
for (const row of [...managedExact, ...managedText]) {
  byId.set(String(row.id), row);
}
const managed = [...byId.values()];

console.log(`\nManaged to delete: ${managed.length}`);
for (const row of managed) {
  console.log(' ', row.createdBy, row.plantCode, '|', row.keyForNoCRM);
}

const regIds = [...new Set([
  ...managed.map(r => String(r.id)),
  ...managed.map(r => String(r.newKey)).filter(Boolean),
])];

let forecastCount = 0;
for (const id of regIds) {
  forecastCount += await prisma.forecastValue.count({ where: { registrationId: id } });
}
const fcstUbJ = await prisma.forecastValue.count({
  where: { registrationId: { contains: 'UBJ' } },
});
console.log('Forecast on managed:', forecastCount);
console.log('Forecast registrationId contains UBJ:', fcstUbJ);

if (!apply) {
  console.log('\nPass --apply to delete.');
  await prisma.$disconnect();
  process.exit(0);
}

let deletedForecast = 0;
let deletedSettings = 0;
let deletedCustom = 0;

for (const id of regIds) {
  deletedForecast += (await prisma.forecastValue.deleteMany({ where: { registrationId: id } })).count;
  deletedSettings += (await prisma.registrationPriceSetting.deleteMany({ where: { registrationId: id } })).count;
  try {
    deletedCustom += Number(await prisma.$executeRaw`
      DELETE FROM dbo.custom_column_values WHERE registrationId = ${id}
    `);
  } catch { /* ignore */ }
}

deletedForecast += Number(await prisma.$executeRaw`
  DELETE FROM dbo.forecast_values WHERE registrationId LIKE N'%UBJ%'
`);

for (const row of managed) {
  await prisma.masterDataCrmRegistration.delete({ where: { id: String(row.id) } });
}

console.log('\nDeleted managed:', managed.length);
console.log('Deleted forecast:', deletedForecast);
console.log('Deleted settings:', deletedSettings);
console.log('Deleted custom values:', deletedCustom);

await prisma.$disconnect();
