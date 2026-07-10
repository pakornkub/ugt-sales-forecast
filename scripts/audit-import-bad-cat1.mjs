import prisma from '../src/db/prisma.ts';

const badImport = await prisma.$queryRawUnsafe(`
  SELECT d.Cat1Name, d.Cat2Name, d.Cat3Name, COUNT(*) c
  FROM dbo.DimRegistration d
  INNER JOIN dbo.master_data_crm_registrations m ON m.newKey = d.NewKey
  WHERE m.createdBy = 'excel-import'
    AND d.Cat1Name IS NOT NULL AND d.Cat1Name <> ''
    AND d.Cat1Name NOT IN ('Injection','Extrusion')
  GROUP BY d.Cat1Name, d.Cat2Name, d.Cat3Name
  ORDER BY c DESC
`);

const blankCat1 = await prisma.$queryRawUnsafe(`
  SELECT COUNT(*) c
  FROM dbo.DimRegistration d
  INNER JOIN dbo.master_data_crm_registrations m ON m.newKey = d.NewKey
  WHERE m.createdBy = 'excel-import'
    AND (d.Cat1Name IS NULL OR LTRIM(RTRIM(d.Cat1Name)) = '')
`);

const weirdCat2 = await prisma.$queryRawUnsafe(`
  SELECT TOP 20 d.Cat2Name, COUNT(*) c
  FROM dbo.DimRegistration d
  INNER JOIN dbo.master_data_crm_registrations m ON m.newKey = d.NewKey
  WHERE m.createdBy = 'excel-import'
    AND d.Cat2Name IS NOT NULL AND d.Cat2Name <> ''
    AND d.Cat2Name NOT LIKE 'INJ[_]%'
    AND d.Cat2Name NOT LIKE 'EXT[_]%'
    AND d.Cat2Name NOT IN ('Injection','Extrusion')
  GROUP BY d.Cat2Name
  ORDER BY c DESC
`);

console.log('excel-import bad Cat1 combos:', JSON.stringify(badImport, null, 2));
console.log('excel-import blank Cat1:', blankCat1);
console.log('excel-import weird Cat2:', JSON.stringify(weirdCat2, null, 2));

await prisma.$disconnect();
