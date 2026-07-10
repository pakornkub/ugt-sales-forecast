import prisma from '../src/db/prisma.ts';

const cat1Source = await prisma.$queryRawUnsafe(`
  SELECT
    d.Cat1Name,
    SUM(CASE WHEN m.createdBy = 'excel-import' THEN 1 ELSE 0 END) AS fromImport,
    SUM(CASE WHEN m.createdBy IS NULL OR m.createdBy <> 'excel-import' THEN 1 ELSE 0 END) AS fromCrm,
    COUNT(*) AS total
  FROM dbo.DimRegistration d
  LEFT JOIN dbo.master_data_crm_registrations m ON m.newKey = d.NewKey
  WHERE d.Cat1Name IS NOT NULL AND LTRIM(RTRIM(d.Cat1Name)) <> ''
  GROUP BY d.Cat1Name
  ORDER BY total DESC
`);

const importCat1 = await prisma.$queryRawUnsafe(`
  SELECT d.Cat1Name, COUNT(*) c
  FROM dbo.DimRegistration d
  INNER JOIN dbo.master_data_crm_registrations m ON m.newKey = d.NewKey
  WHERE m.createdBy = 'excel-import'
    AND d.Cat1Name IS NOT NULL AND LTRIM(RTRIM(d.Cat1Name)) <> ''
  GROUP BY d.Cat1Name
  ORDER BY c DESC
`);

const sampleNonInjExt = await prisma.$queryRawUnsafe(`
  SELECT TOP 8
    d.Cat1Name, d.Cat2Name, d.Cat3Name, d.PlantName, d.CreatedByName
  FROM dbo.DimRegistration d
  LEFT JOIN dbo.master_data_crm_registrations m ON m.newKey = d.NewKey
  WHERE d.Cat1Name NOT IN ('Injection', 'Extrusion')
    AND d.Cat1Name IS NOT NULL AND LTRIM(RTRIM(d.Cat1Name)) <> ''
    AND d.Cat1Name NOT LIKE 'INJ[_]%'
    AND d.Cat1Name NOT LIKE 'EXT[_]%'
  ORDER BY d.CreatedByName, d.Cat1Name
`);

console.log('Cat1 by source (import vs CRM):', JSON.stringify(cat1Source.slice(0, 15), null, 2));
console.log('\nexcel-import Cat1 only:', JSON.stringify(importCat1, null, 2));
console.log('\nSample non Injection/Extrusion rows:', JSON.stringify(sampleNonInjExt, null, 2));

await prisma.$disconnect();
