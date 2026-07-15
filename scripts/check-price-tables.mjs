import prisma from '../src/db/prisma.ts';

const cpl = await prisma.$queryRaw`SELECT COUNT(*) AS c FROM dbo.cpl_prices`;
const pmv = await prisma.$queryRaw`SELECT COUNT(*) AS c FROM dbo.price_management_values`;
const sampleCpl = await prisma.$queryRaw`SELECT TOP 8 month, price FROM dbo.cpl_prices ORDER BY month`;
const samplePmv = await prisma.$queryRaw`
  SELECT TOP 8 month, priceType, versionName, cplPrice
  FROM dbo.price_management_values
  ORDER BY month, priceType, versionName
`;
console.log(JSON.stringify({ cpl, pmv, sampleCpl, samplePmv }, null, 2));
await prisma.$disconnect();
