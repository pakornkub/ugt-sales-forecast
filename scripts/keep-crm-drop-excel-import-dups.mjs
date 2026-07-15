import prisma from '../src/db/prisma.ts';

const apply = process.argv.includes('--apply');

// Managed excel-import rows whose keyForNoCRM also exists in CRM (MainRegist=1)
const dups = await prisma.$queryRaw`
  SELECT
    m.id AS managedId,
    m.newKey AS managedNewKey,
    m.keyForNoCRM AS keyForNoCRM,
    CAST(c.NewKey AS NVARCHAR(1000)) AS crmId,
    m.createdBy
  FROM dbo.master_data_crm_registrations m
  INNER JOIN dbo.VW_CRM_RegistrationAll_1 c
    ON c.KeyforNoCRM = m.keyForNoCRM
   AND c.MainRegist = 1
   AND c.NewKey IS NOT NULL
  WHERE m.createdBy = N'excel-import'
  ORDER BY m.keyForNoCRM
`;

console.log(`Duplicate managed vs CRM: ${dups.length}`);
console.log(apply ? 'MODE: APPLY' : 'MODE: dry-run (pass --apply)');

let movedForecast = 0;
let deletedManaged = 0;

for (const row of dups) {
  const managedId = String(row.managedId);
  const crmId = String(row.crmId);
  const key = String(row.keyForNoCRM);

  const fcstCount = await prisma.forecastValue.count({
    where: { registrationId: { in: [managedId, String(row.managedNewKey)] } },
  });
  const crmFcst = await prisma.forecastValue.count({ where: { registrationId: crmId } });
  const spreadManaged = await prisma.registrationPriceSetting.findUnique({
    where: { registrationId: managedId },
    select: { spread: true },
  });
  const spreadCrm = await prisma.registrationPriceSetting.findUnique({
    where: { registrationId: crmId },
    select: { spread: true },
  });

  console.log({
    key,
    managedId,
    crmId,
    fcstOnManaged: fcstCount,
    fcstOnCrm: crmFcst,
    spreadManaged: spreadManaged?.spread ?? null,
    spreadCrm: spreadCrm?.spread ?? null,
  });

  if (!apply) continue;

  // Move forecast rows from managed → CRM (overwrite CRM on same version+period)
  const managedRows = await prisma.forecastValue.findMany({
    where: { registrationId: { in: [managedId, String(row.managedNewKey)] } },
  });

  for (const fv of managedRows) {
    await prisma.$executeRaw`
      MERGE dbo.forecast_values AS target
      USING (
        SELECT
          ${crmId} AS registrationId,
          ${fv.versionName} AS versionName,
          ${fv.period} AS period,
          ${fv.granularity} AS granularity,
          ${fv.qtyFcst} AS qtyFcst,
          ${fv.priceFcst} AS priceFcst,
          ${fv.amountFcst} AS amountFcst,
          ${fv.lastBatchId} AS lastBatchId
      ) AS source
      ON target.registrationId = source.registrationId
        AND target.versionName = source.versionName
        AND target.period = source.period
      WHEN MATCHED THEN
        UPDATE SET
          granularity = source.granularity,
          qtyFcst = source.qtyFcst,
          priceFcst = source.priceFcst,
          amountFcst = source.amountFcst,
          lastBatchId = source.lastBatchId,
          updatedAt = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN
        INSERT (registrationId, versionName, period, granularity, qtyFcst, priceFcst, amountFcst, lastBatchId, updatedAt)
        VALUES (source.registrationId, source.versionName, source.period, source.granularity, source.qtyFcst, source.priceFcst, source.amountFcst, source.lastBatchId, SYSUTCDATETIME());
    `;
    movedForecast += 1;
  }

  if (managedRows.length > 0) {
    await prisma.forecastValue.deleteMany({
      where: { registrationId: { in: [managedId, String(row.managedNewKey)] } },
    });
  }

  // Move spread to CRM settings if CRM has none and managed has one
  if (spreadManaged?.spread != null && (spreadCrm?.spread == null || spreadCrm.spread === '')) {
    await prisma.$executeRaw`
      MERGE dbo.registration_price_settings AS target
      USING (SELECT ${crmId} AS registrationId, ${spreadManaged.spread} AS spread) AS source
      ON target.registrationId = source.registrationId
      WHEN MATCHED THEN UPDATE SET spread = source.spread, updatedAt = GETUTCDATE()
      WHEN NOT MATCHED THEN INSERT (registrationId, spread, updatedAt)
        VALUES (source.registrationId, source.spread, GETUTCDATE());
    `;
  }
  await prisma.registrationPriceSetting.deleteMany({ where: { registrationId: managedId } });

  // Custom column values
  await prisma.$executeRaw`
    DELETE FROM dbo.custom_column_values WHERE registrationId = ${managedId}
  `.catch(() => undefined);

  await prisma.masterDataCrmRegistration.delete({ where: { id: managedId } });
  deletedManaged += 1;
  console.log('  deleted managed', managedId, '→ kept CRM', crmId);
}

console.log(`\nMoved forecast rows: ${movedForecast}`);
console.log(`Deleted managed regs: ${deletedManaged}`);
await prisma.$disconnect();
