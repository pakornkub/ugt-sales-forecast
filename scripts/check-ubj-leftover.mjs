import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

async function main() {
  const managed = await p.$queryRaw`
    SELECT id, newKey, keyForNoCRM, plantCode, plantName, createdBy
    FROM dbo.master_data_crm_registrations
    WHERE keyForNoCRM LIKE N'%/UBJ/%'
       OR newKey LIKE N'%/UBJ/%'
       OR UPPER(LTRIM(RTRIM(ISNULL(plantCode, N'')))) = N'UBJ'
       OR UPPER(LTRIM(RTRIM(ISNULL(plantName, N'')))) = N'UBJ'
  `;

  const dim = await p.$queryRaw`
    SELECT TOP 50
      CAST(d.NewKey AS NVARCHAR(200)) AS newKey,
      CAST(d.KeyforNoCRM AS NVARCHAR(500)) AS keyForNoCRM,
      CAST(d.PlantCode AS NVARCHAR(100)) AS plantCode,
      CAST(d.PlantName AS NVARCHAR(500)) AS plantName
    FROM dbo.DimRegistration d
    WHERE d.KeyforNoCRM LIKE N'%/UBJ/%'
       OR d.NewKey LIKE N'%/UBJ/%'
       OR UPPER(LTRIM(RTRIM(ISNULL(CAST(d.PlantCode AS NVARCHAR(100)), N'')))) = N'UBJ'
       OR UPPER(LTRIM(RTRIM(ISNULL(CAST(d.PlantName AS NVARCHAR(500)), N'')))) = N'UBJ'
  `;

  const dimCount = await p.$queryRaw`
    SELECT COUNT(*) AS c
    FROM dbo.DimRegistration d
    WHERE d.KeyforNoCRM LIKE N'%/UBJ/%'
       OR d.NewKey LIKE N'%/UBJ/%'
       OR UPPER(LTRIM(RTRIM(ISNULL(CAST(d.PlantCode AS NVARCHAR(100)), N'')))) = N'UBJ'
       OR UPPER(LTRIM(RTRIM(ISNULL(CAST(d.PlantName AS NVARCHAR(500)), N'')))) = N'UBJ'
  `;

  const fv = await p.$queryRaw`
    SELECT COUNT(*) AS c
    FROM dbo.forecast_values
    WHERE registrationId LIKE N'%UBJ%'
  `;

  const plantNameUbJ = await p.$queryRaw`
    SELECT COUNT(*) AS c
    FROM dbo.master_data_crm_registrations
    WHERE UPPER(LTRIM(RTRIM(ISNULL(plantName, N'')))) = N'UBJ'
  `;

  console.log(JSON.stringify({
    managedCount: managed.length,
    managed,
    dimCount,
    dimSample: dim,
    forecastUbJIds: fv,
    plantNameUbJManaged: plantNameUbJ,
  }, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
