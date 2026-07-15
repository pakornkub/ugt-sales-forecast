import prisma from '../src/db/prisma.ts';

const fromKey1111 = await prisma.$queryRawUnsafe(`
  SELECT TOP 20
    d.NewKey, d.KeyforNoCRM, d.PlantCode, d.PlantName, d.CreatedByName,
    m.plantCode AS managedPlant, m.plantName AS managedPlantName, m.keyForNoCRM
  FROM dbo.DimRegistration d
  LEFT JOIN dbo.master_data_crm_registrations m
    ON m.newKey = d.NewKey OR m.keyForNoCRM = d.KeyforNoCRM
  WHERE d.PlantCode = '1111'
  ORDER BY d.CreatedByName, d.NewKey
`);

const import1111 = await prisma.$queryRawUnsafe(`
  SELECT COUNT(*) c
  FROM dbo.DimRegistration d
  INNER JOIN dbo.master_data_crm_registrations m ON m.newKey = d.NewKey
  WHERE m.createdBy = 'excel-import' AND d.PlantCode = '1111'
`);

const keyHas1111 = await prisma.$queryRawUnsafe(`
  SELECT TOP 20 keyForNoCRM, plantCode, plantName
  FROM dbo.master_data_crm_registrations
  WHERE createdBy = 'excel-import'
    AND (keyForNoCRM LIKE '%/1111/%' OR plantCode = '1111')
  ORDER BY keyForNoCRM
`);

console.log('DimRegistration PlantCode=1111:', JSON.stringify(fromKey1111, null, 2));
console.log('excel-import with PlantCode 1111:', import1111);
console.log('import rows key or plant 1111:', JSON.stringify(keyHas1111, null, 2));

await prisma.$disconnect();
