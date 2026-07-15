import prisma from '../src/db/prisma.ts';

const apply = process.argv.includes('--apply');
const PLANT = '1111';

console.log(apply ? 'MODE: APPLY' : 'MODE: dry-run');
console.log('Target plantCode:', PLANT);

const managed = await prisma.$queryRaw`
  SELECT id, newKey, keyForNoCRM, plantCode, plantName, createdBy
  FROM dbo.master_data_crm_registrations
  WHERE LTRIM(RTRIM(ISNULL(plantCode, N''))) = ${PLANT}
     OR keyForNoCRM LIKE N'%/' + ${PLANT} + N'/%'
     OR newKey LIKE N'%/' + ${PLANT} + N'/%'
`;

const dim = await prisma.$queryRaw`
  SELECT
    CAST(d.NewKey AS NVARCHAR(200)) AS newKey,
    CAST(d.KeyforNoCRM AS NVARCHAR(500)) AS keyForNoCRM,
    CAST(d.PlantCode AS NVARCHAR(100)) AS plantCode,
    CAST(d.PlantName AS NVARCHAR(500)) AS plantName
  FROM dbo.DimRegistration d
  WHERE LTRIM(RTRIM(ISNULL(CAST(d.PlantCode AS NVARCHAR(100)), N''))) = ${PLANT}
     OR d.KeyforNoCRM LIKE N'%/' + ${PLANT} + N'/%'
     OR d.NewKey LIKE N'%/' + ${PLANT} + N'/%'
`;

console.log(`\nManaged registrations: ${managed.length}`);
for (const row of managed) {
  console.log(' ', row.createdBy, '|', row.plantCode, '|', row.keyForNoCRM, '| id=', row.id);
}

console.log(`\nDimRegistration rows: ${dim.length}`);
for (const row of dim.slice(0, 30)) {
  console.log(' ', row.plantCode, '|', row.keyForNoCRM, '| newKey=', row.newKey);
}
if (dim.length > 30) console.log(`  ... +${dim.length - 30} more`);

const managedIds = [...new Set([
  ...managed.map(r => String(r.id)),
  ...managed.map(r => String(r.newKey)).filter(Boolean),
])];

const dimIds = [...new Set(dim.map(r => String(r.newKey)).filter(Boolean))];
const allRegIds = [...new Set([...managedIds, ...dimIds])];

let forecastOnIds = 0;
for (const id of allRegIds) {
  forecastOnIds += await prisma.forecastValue.count({ where: { registrationId: id } });
}

const forecastByKeyPattern = await prisma.$queryRaw`
  SELECT COUNT(*) AS c
  FROM dbo.forecast_values
  WHERE registrationId LIKE N'%/' + ${PLANT} + N'/%'
`;

console.log('\nForecast on matched registrationIds:', forecastOnIds);
console.log('Forecast registrationId contains /1111/:', Number(forecastByKeyPattern[0]?.c ?? 0));

if (!apply) {
  console.log('\nPass --apply to delete managed + forecast (DimRegistration CRM source cannot be deleted if read-only view).');
  await prisma.$disconnect();
  process.exit(0);
}

let deletedForecast = 0;
let deletedSettings = 0;
let deletedCustom = 0;

for (const id of allRegIds) {
  deletedForecast += (await prisma.forecastValue.deleteMany({ where: { registrationId: id } })).count;
  deletedSettings += (await prisma.registrationPriceSetting.deleteMany({ where: { registrationId: id } })).count;
  try {
    deletedCustom += Number(await prisma.$executeRaw`
      DELETE FROM dbo.custom_column_values WHERE registrationId = ${id}
    `);
  } catch { /* ignore */ }
}

deletedForecast += Number(await prisma.$executeRaw`
  DELETE FROM dbo.forecast_values WHERE registrationId LIKE N'%/' + ${PLANT} + N'/%'
`);

for (const row of managed) {
  await prisma.masterDataCrmRegistration.delete({ where: { id: String(row.id) } });
}

// DimRegistration: try delete if it's a writable table/synced copy for managed rows
let deletedDim = 0;
try {
  deletedDim = Number(await prisma.$executeRaw`
    DELETE d
    FROM dbo.DimRegistration d
    WHERE LTRIM(RTRIM(ISNULL(CAST(d.PlantCode AS NVARCHAR(100)), N''))) = ${PLANT}
       OR d.KeyforNoCRM LIKE N'%/' + ${PLANT} + N'/%'
       OR d.NewKey LIKE N'%/' + ${PLANT} + N'/%'
  `);
} catch (err) {
  console.log('\nDimRegistration delete skipped:', err?.message ?? err);
}

console.log('\nDeleted managed:', managed.length);
console.log('Deleted forecast:', deletedForecast);
console.log('Deleted settings:', deletedSettings);
console.log('Deleted custom values:', deletedCustom);
console.log('Deleted DimRegistration:', deletedDim);

await prisma.$disconnect();
