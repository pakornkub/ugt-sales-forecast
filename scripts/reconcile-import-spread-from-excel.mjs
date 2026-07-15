import { readFileSync, existsSync } from 'node:fs';
import * as XLSX from 'xlsx';
import prisma from '../src/db/prisma.ts';

const EXCEL_PATH = 'c:/Users/Tapanawat/Downloads/Upload_Fcst_NYL.xlsx';
const apply = process.argv.includes('--apply');

function text(value) {
  return String(value ?? '').trim();
}

function findSpreadColumnIndex(header) {
  const normalized = header.map(value => text(value));
  const exactCustomer5 = normalized.findIndex(value => value.toLowerCase() === 'spread to customer5');
  if (exactCustomer5 >= 0) return exactCustomer5;
  const customerSpread = normalized.findIndex(value => {
    const lower = value.toLowerCase();
    return lower === 'spread to customer' || lower.startsWith('spread to customer');
  });
  if (customerSpread >= 0) return customerSpread;
  return normalized.findIndex(value => /^spread/i.test(value));
}

function parseSpreadCell(value) {
  if (value === null || value === undefined) return { ok: true, value: null };
  if (typeof value === 'number') {
    return Number.isFinite(value) ? { ok: true, value: String(value) } : { ok: false };
  }
  const textValue = String(value).trim();
  if (textValue === '') return { ok: true, value: null };
  return { ok: true, value: textValue };
}

function readSpreadByKey(sheetName, sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, blankrows: false, raw: true });
  const header = rows[0] ?? [];
  const spreadIdx = findSpreadColumnIndex(header);
  if (spreadIdx < 0) return { spreadIdx, byKey: new Map() };

  const byKey = new Map();
  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index] ?? [];
    const key = text(row[0]);
    if (!key) continue;
    const parsed = parseSpreadCell(row[spreadIdx]);
    if (!parsed.ok || parsed.value === null) continue;
    if (!byKey.has(key)) byKey.set(key, parsed.value);
  }
  return { spreadIdx, header: String(header[spreadIdx] ?? ''), byKey };
}

if (!existsSync(EXCEL_PATH)) {
  console.error('Excel not found:', EXCEL_PATH);
  process.exit(1);
}

const wb = XLSX.read(readFileSync(EXCEL_PATH), { type: 'buffer' });
const excelSpread = new Map();
for (const sheetName of ['Polymer', 'CP']) {
  const parsed = readSpreadByKey(sheetName, wb.Sheets[sheetName]);
  console.log(`${sheetName}: spread col [${parsed.spreadIdx}] ${parsed.header}, keys=${parsed.byKey.size}`);
  for (const [key, spread] of parsed.byKey) {
    if (!excelSpread.has(key)) excelSpread.set(key, spread);
  }
}

const dbRows = await prisma.masterDataCrmRegistration.findMany({
  where: { createdBy: 'excel-import' },
  select: { id: true, keyForNoCRM: true, newKey: true, spread: true },
});

const crmRows = await prisma.$queryRawUnsafe(`
  SELECT CAST(d.NewKey AS NVARCHAR(1000)) AS registrationId,
         CAST(d.KeyforNoCRM AS NVARCHAR(1000)) AS keyForNoCRM,
         COALESCE(NULLIF(LTRIM(RTRIM(rps.spread)), ''), NULLIF(LTRIM(RTRIM(m.spread)), '')) AS spread
  FROM dbo.DimRegistration d
  LEFT JOIN dbo.master_data_crm_registrations m ON m.newKey = d.NewKey
  LEFT JOIN dbo.registration_price_settings rps ON rps.registrationId = d.NewKey
  WHERE d.CreatedByName <> 'excel-import'
`);

let mismatches = 0;
let updated = 0;

for (const row of dbRows) {
  const expected = excelSpread.get(row.keyForNoCRM);
  if (expected === undefined) continue;
  const current = row.spread == null ? null : String(row.spread);
  if (current === expected) continue;
  mismatches += 1;
  console.log('managed', row.keyForNoCRM, 'db', current, 'excel', expected);
  if (apply) {
    await prisma.masterDataCrmRegistration.update({
      where: { id: row.id },
      data: { spread: expected },
    });
    updated += 1;
  }
}

async function upsertCrmSpread(registrationId, spread) {
  const managed = await prisma.masterDataCrmRegistration.findFirst({
    where: { OR: [{ id: registrationId }, { newKey: registrationId }] },
    select: { id: true },
  });
  if (managed) {
    await prisma.masterDataCrmRegistration.update({ where: { id: managed.id }, data: { spread } });
    return;
  }
  await prisma.$executeRaw`
    MERGE [dbo].[registration_price_settings] AS target
    USING (SELECT ${registrationId} AS registrationId, ${spread} AS spread) AS source
    ON target.[registrationId] = source.registrationId
    WHEN MATCHED THEN UPDATE SET [spread] = source.spread, [updatedAt] = GETUTCDATE()
    WHEN NOT MATCHED THEN INSERT ([registrationId], [spread], [updatedAt])
    VALUES (source.registrationId, source.spread, GETUTCDATE());
  `;
}

for (const row of crmRows) {
  const expected = excelSpread.get(row.keyForNoCRM);
  if (expected === undefined) continue;
  const current = row.spread == null ? null : String(row.spread).trim() || null;
  if (current === expected) continue;
  mismatches += 1;
  console.log('crm', row.keyForNoCRM, 'db', current, 'excel', expected);
  if (apply) {
    await upsertCrmSpread(row.registrationId, expected);
    updated += 1;
  }
}

console.log(`Spread mismatches: ${mismatches}`);
if (apply) console.log(`Updated: ${updated}`);
else if (mismatches > 0) console.log('Dry run. Re-run with --apply to update.');

await prisma.$disconnect();
