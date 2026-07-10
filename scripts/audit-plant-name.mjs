import prisma from '../src/db/prisma.ts';

const crmSample = await prisma.$queryRawUnsafe(`
  SELECT TOP 8 PlantCode, PlantName, CreatedByName
  FROM dbo.DimRegistration
  WHERE CreatedByName <> 'excel-import'
    AND PlantName IS NOT NULL AND PlantName <> ''
    AND PlantCode <> '0'
  ORDER BY PlantCode
`);

const importNumericName = await prisma.$queryRawUnsafe(`
  SELECT PlantCode, PlantName, COUNT(*) c
  FROM dbo.DimRegistration d
  INNER JOIN dbo.master_data_crm_registrations m ON m.newKey = d.NewKey
  WHERE m.createdBy = 'excel-import'
    AND d.PlantName LIKE '[0-9]%'
  GROUP BY PlantCode, PlantName
  ORDER BY c DESC
`);

console.log('CRM PlantName samples:', JSON.stringify(crmSample, null, 2));
console.log('Import rows with numeric PlantName:', JSON.stringify(importNumericName, null, 2));

await prisma.$disconnect();
