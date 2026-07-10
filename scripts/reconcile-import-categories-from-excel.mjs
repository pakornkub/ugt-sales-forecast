import { readFileSync, existsSync } from 'node:fs';
import * as XLSX from 'xlsx';
import { normalizeExcelImportCategoryFields } from '../src/api/services/registrationCategory.ts';
import prisma from '../src/db/prisma.ts';

const EXCEL_PATH = 'c:/Users/Tapanawat/Downloads/Upload_Fcst_NYL.xlsx';
const SKIP_SHEETS = new Set(['mapping', 'fcst version']);
const KEY_HEADER = 'Key for no regist';
const SYNTHETIC_PREFIX = '__IMPORT__';
const apply = process.argv.includes('--apply');

const POLYMER_METADATA = {
  layout: 'polymer',
  materialCode: 6,
  plantCode: 17,
  process: 21,
  application: 22,
  subApplication: 23,
};

const CP_METADATA = {
  layout: 'cp',
  materialCode: 5,
  plantCode: 15,
  process: 19,
  application: 20,
  subApplication: 21,
};

function text(value) {
  return String(value ?? '').trim();
}

function nullableText(value) {
  const valueText = text(value);
  return valueText || null;
}

function normalizeKey(value) {
  return text(value);
}

function buildSyntheticImportKey(sheetName, sourceRow) {
  return `${SYNTHETIC_PREFIX}/${sheetName}/${sourceRow}`;
}

function resolveImportMetadataColumns(header) {
  const secondColumn = text(header[1]).toUpperCase();
  if (secondColumn === 'H/C') return POLYMER_METADATA;
  if (secondColumn === 'CODE') return CP_METADATA;
  if (header.findIndex(value => text(value).toUpperCase() === 'PIC') >= 0) return CP_METADATA;
  if (header.findIndex(value => text(value).toUpperCase() === 'H/C') >= 0) return POLYMER_METADATA;
  return POLYMER_METADATA;
}

function firstValue(current, value) {
  return current ?? nullableText(value);
}

function readSheetCategories(sheetName, sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, blankrows: false, raw: true });
  const header = rows[0] ?? [];
  if (normalizeKey(header[0]) !== KEY_HEADER) return null;

  const metadata = resolveImportMetadataColumns(header);
  const byKey = new Map();

  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index] ?? [];
    const sourceRow = index + 1;
    const rawKey = normalizeKey(row[0]);
    const key = rawKey || buildSyntheticImportKey(sheetName, sourceRow);

    const existing = byKey.get(key) ?? {
      key,
      sourceSheet: sheetName,
      sourceRow,
      process: null,
      application: null,
      subApplication: null,
    };

    existing.process = firstValue(existing.process, row[metadata.process]);
    existing.application = firstValue(existing.application, row[metadata.application]);
    existing.subApplication = firstValue(existing.subApplication, row[metadata.subApplication]);
    byKey.set(key, existing);
  }

  return { metadata, byKey };
}

function expectedCategories(row) {
  return normalizeExcelImportCategoryFields(row.process, row.application, row.subApplication);
}

if (!existsSync(EXCEL_PATH)) {
  console.error('Excel not found:', EXCEL_PATH);
  process.exit(1);
}

const wb = XLSX.read(readFileSync(EXCEL_PATH), { type: 'buffer', cellDates: false });
console.log('Excel:', EXCEL_PATH);
console.log('Sheets:', wb.SheetNames.join(', '));

const bbSheets = wb.SheetNames.filter(name => /bb/i.test(name) && !SKIP_SHEETS.has(name.trim().toLowerCase()));
const targetSheets = bbSheets.length > 0 ? bbSheets : wb.SheetNames.filter(name => !SKIP_SHEETS.has(name.trim().toLowerCase()));
console.log('Target sheets:', targetSheets.join(', '));

const excelByKey = new Map();
for (const sheetName of targetSheets) {
  const parsed = readSheetCategories(sheetName, wb.Sheets[sheetName]);
  if (!parsed) {
    console.log(`Skip ${sheetName}: not a forecast sheet`);
    continue;
  }
  for (const [key, row] of parsed.byKey) {
    if (!excelByKey.has(key)) excelByKey.set(key, row);
  }
  console.log(`${sheetName}: ${parsed.byKey.size} keys (layout ${parsed.metadata.layout})`);
}

const dbRows = await prisma.masterDataCrmRegistration.findMany({
  where: { createdBy: 'excel-import' },
  select: {
    id: true,
    keyForNoCRM: true,
    newKey: true,
    process: true,
    application: true,
    subApp: true,
  },
});

const mismatches = [];
const notInExcel = [];
const matched = [];

for (const row of dbRows) {
  const excel = excelByKey.get(row.keyForNoCRM);
  if (!excel) {
    notInExcel.push(row);
    continue;
  }

  const expected = expectedCategories(excel);
  const same =
    (row.process ?? null) === expected.process
    && (row.application ?? null) === expected.application
    && (row.subApp ?? null) === expected.subApp;

  if (same) {
    matched.push(row.keyForNoCRM);
    continue;
  }

  mismatches.push({
    id: row.id,
    keyForNoCRM: row.keyForNoCRM,
    sheet: excel.sourceSheet,
    row: excel.sourceRow,
    db: { process: row.process, application: row.application, subApp: row.subApp },
    excel: {
      raw: {
        process: nullableText(excel.process),
        application: nullableText(excel.application),
        subApp: nullableText(excel.subApplication),
      },
      expected,
    },
  });
}

console.log(`\nDB excel-import rows: ${dbRows.length}`);
console.log(`Matched Excel keys: ${matched.length}`);
console.log(`Mismatches in target sheets: ${mismatches.length}`);
console.log(`DB rows not in target Excel sheets: ${notInExcel.length}`);

if (mismatches.length > 0) {
  console.log('\nFirst mismatches:');
  for (const item of mismatches.slice(0, 25)) {
    console.log(JSON.stringify(item, null, 2));
  }
}

let updated = 0;
if (apply && mismatches.length > 0) {
  for (const item of mismatches) {
    await prisma.masterDataCrmRegistration.update({
      where: { id: item.id },
      data: {
        process: item.excel.expected.process,
        application: item.excel.expected.application,
        subApp: item.excel.expected.subApp,
      },
    });
    updated += 1;
  }
  console.log(`\nUpdated ${updated} rows`);
} else if (mismatches.length > 0) {
  console.log('\nDry run only. Re-run with --apply to fix mismatches.');
}

await prisma.$disconnect();
