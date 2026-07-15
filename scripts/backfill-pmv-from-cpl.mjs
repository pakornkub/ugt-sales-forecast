import prisma from '../src/db/prisma.ts';

// Backfill Current Forecast Price Management from legacy cpl_prices (fill missing / zero only).
const result = await prisma.$executeRaw`
  MERGE [dbo].[price_management_values] AS target
  USING (
    SELECT [month], [price]
    FROM [dbo].[cpl_prices]
  ) AS source
  ON target.[month] = source.[month]
    AND target.[priceType] = N'Fcst'
    AND target.[versionName] = N'Current Forecast'
  WHEN MATCHED AND ISNULL(target.[cplPrice], 0) = 0 AND ISNULL(source.[price], 0) <> 0 THEN
    UPDATE SET
      [cplPrice] = source.[price],
      [updatedAt] = CURRENT_TIMESTAMP
  WHEN NOT MATCHED THEN
    INSERT ([month], [priceType], [versionName], [cplPrice], [naphthaPrice], [benzenePrice])
    VALUES (source.[month], N'Fcst', N'Current Forecast', source.[price], 0, 0);
`;

console.log('Backfilled price_management_values from cpl_prices. rows affected:', result);
await prisma.$disconnect();
