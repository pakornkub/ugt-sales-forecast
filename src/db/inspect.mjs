// Quick script to inspect view columns and sample data
// Run: node --env-file=.env src/db/inspect.mjs
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspect() {
  console.log('\n=== VW_CRM_RegistrationAll_1 COLUMNS ===');
  const regCols = await prisma.$queryRaw`
    SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'VW_CRM_RegistrationAll_1' ORDER BY ORDINAL_POSITION
  `;
  console.log(JSON.stringify(regCols, null, 2));

  console.log('\n=== VW_CRM_RegistrationAll_1 SAMPLE ROW ===');
  const regRow = await prisma.$queryRaw`SELECT TOP 1 * FROM [dbo].[VW_CRM_RegistrationAll_1]`;
  console.log(JSON.stringify(regRow, null, 2));

  console.log('\n=== MKT_SALEReport_ZSDR001_UGT_CRM_NYL_1 COLUMNS ===');
  const actCols = await prisma.$queryRaw`
    SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'MKT_SALEReport_ZSDR001_UGT_CRM_NYL_1' ORDER BY ORDINAL_POSITION
  `;
  console.log(JSON.stringify(actCols, null, 2));

  console.log('\n=== MKT_SALEReport_ZSDR001_UGT_CRM_NYL_1 SAMPLE ROW ===');
  const actRow = await prisma.$queryRaw`SELECT TOP 1 * FROM [dbo].[MKT_SALEReport_ZSDR001_UGT_CRM_NYL_1]`;
  console.log(JSON.stringify(actRow, null, 2));

  await prisma.$disconnect();
}

inspect().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
