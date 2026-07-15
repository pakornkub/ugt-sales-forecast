import prisma from '../src/db/prisma.ts';

const apply = process.argv.includes('--apply');

const rows = await prisma.$queryRaw`
  SELECT m.id, m.plantCode, m.plantName, m.keyForNoCRM
  FROM dbo.master_data_crm_registrations m
  WHERE m.createdBy = N'excel-import'
    AND m.plantName IS NOT NULL
    AND LTRIM(RTRIM(m.plantName)) <> N''
    AND m.plantName NOT LIKE N'%[^0-9]%'
`;

console.log(`excel-import rows with numeric PlantName: ${rows.length}`);
console.log(apply ? 'MODE: APPLY' : 'MODE: dry-run');
for (const row of rows.slice(0, 15)) {
  console.log(' ', row.plantCode, '| name', row.plantName, '|', row.keyForNoCRM);
}

if (apply && rows.length > 0) {
  const result = await prisma.$executeRaw`
    UPDATE dbo.master_data_crm_registrations
    SET plantName = NULL, updatedAt = SYSUTCDATETIME()
    WHERE createdBy = N'excel-import'
      AND plantName IS NOT NULL
      AND LTRIM(RTRIM(plantName)) <> N''
      AND plantName NOT LIKE N'%[^0-9]%'
  `;
  console.log('cleared plantName on', result, 'rows');
}

await prisma.$disconnect();
