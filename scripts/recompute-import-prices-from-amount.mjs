import prisma from '../src/db/prisma.ts';

const apply = process.argv.includes('--apply');
const versionFilter = process.argv
  .filter(arg => arg.startsWith('--version='))
  .map(arg => arg.slice('--version='.length));

const versions = versionFilter.length > 0
  ? versionFilter
  : (
    await prisma.forecastValue.findMany({
      distinct: ['versionName'],
      select: { versionName: true },
      orderBy: { versionName: 'asc' },
    })
  ).map(row => row.versionName);

console.log('Versions to check:', versions.join(', '));
console.log(apply ? 'MODE: APPLY' : 'MODE: dry-run (pass --apply to update)');

let totalMismatch = 0;
let totalUpdated = 0;

for (const versionName of versions) {
  const mismatches = await prisma.$queryRaw`
    SELECT COUNT_BIG(*) AS c
    FROM dbo.forecast_values
    WHERE versionName = ${versionName}
      AND CAST(qtyFcst AS FLOAT) > 0
      AND ABS(
        CAST(priceFcst AS FLOAT)
        - (CAST(amountFcst AS FLOAT) / CAST(qtyFcst AS FLOAT))
      ) > 0.01
  `;
  const count = Number(mismatches[0]?.c ?? 0);
  totalMismatch += count;

  const samples = await prisma.$queryRaw`
    SELECT TOP 5
      registrationId,
      period,
      CAST(qtyFcst AS FLOAT) AS qtyFcst,
      CAST(priceFcst AS FLOAT) AS priceFcst,
      CAST(amountFcst AS FLOAT) AS amountFcst,
      CAST(amountFcst AS FLOAT) / CAST(qtyFcst AS FLOAT) AS priceFromAmt
    FROM dbo.forecast_values
    WHERE versionName = ${versionName}
      AND CAST(qtyFcst AS FLOAT) > 0
      AND ABS(
        CAST(priceFcst AS FLOAT)
        - (CAST(amountFcst AS FLOAT) / CAST(qtyFcst AS FLOAT))
      ) > 0.01
    ORDER BY ABS(
      CAST(priceFcst AS FLOAT)
      - (CAST(amountFcst AS FLOAT) / CAST(qtyFcst AS FLOAT))
    ) DESC
  `;

  console.log(`\n${versionName}: ${count} rows where price ≠ amount/qty`);
  for (const row of samples) {
    console.log(
      ' ',
      String(row.registrationId).slice(0, 40),
      String(row.period).slice(0, 10),
      'qty', row.qtyFcst,
      'price', row.priceFcst,
      '→', Number(row.priceFromAmt).toFixed(4),
      'amt', row.amountFcst,
    );
  }

  if (apply && count > 0) {
    const result = await prisma.$executeRaw`
      UPDATE dbo.forecast_values
      SET
        priceFcst = CAST(amountFcst AS FLOAT) / CAST(qtyFcst AS FLOAT),
        updatedAt = SYSUTCDATETIME()
      WHERE versionName = ${versionName}
        AND CAST(qtyFcst AS FLOAT) > 0
        AND ABS(
          CAST(priceFcst AS FLOAT)
          - (CAST(amountFcst AS FLOAT) / CAST(qtyFcst AS FLOAT))
        ) > 0.01
    `;
    totalUpdated += Number(result);
    console.log(`  updated: ${result}`);
  }
}

console.log(`\nTotal mismatches: ${totalMismatch}`);
if (apply) console.log(`Total updated: ${totalUpdated}`);

await prisma.$disconnect();
