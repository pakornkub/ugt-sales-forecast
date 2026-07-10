import prisma from '../src/db/prisma.ts';

const rows = await prisma.$queryRawUnsafe(`
  SELECT TOP 30
    d.NewKey, d.KeyforNoCRM, d.Cat1Name, d.Cat2Name, d.Cat3Name,
    d.MaterialCode, d.PlantCode, d.CreatedByName,
    m.process, m.application, m.subApp, m.createdBy, m.keyForNoCRM AS managedKey
  FROM dbo.DimRegistration d
  LEFT JOIN dbo.master_data_crm_registrations m
    ON m.newKey = d.NewKey OR m.keyForNoCRM = d.KeyforNoCRM
  WHERE d.Cat1Name = 'MB Polymer'
     OR d.Cat2Name = 'MB Polymer'
     OR m.process = 'MB Polymer'
     OR m.application = 'MB Polymer'
  ORDER BY d.CreatedByName, d.NewKey
`);

console.log(JSON.stringify(rows, null, 2));
await prisma.$disconnect();
