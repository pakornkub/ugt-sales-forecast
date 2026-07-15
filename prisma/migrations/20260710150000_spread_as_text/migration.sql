-- Convert spread from DECIMAL to NVARCHAR so formula notes can be stored.
-- Numeric values remain as text (e.g. '950') and are TRY_CONVERT'd for price math.

-- registration_price_settings
IF COL_LENGTH(N'dbo.registration_price_settings', N'spread') IS NOT NULL
   AND EXISTS (
     SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = N'dbo'
       AND TABLE_NAME = N'registration_price_settings'
       AND COLUMN_NAME = N'spread'
       AND DATA_TYPE IN (N'decimal', N'numeric')
   )
BEGIN
  ALTER TABLE [dbo].[registration_price_settings]
    ADD [spread_text] NVARCHAR(1000) NULL;

  EXEC(N'
    UPDATE [dbo].[registration_price_settings]
    SET [spread_text] = CONVERT(NVARCHAR(1000), [spread]);
  ');

  DECLARE @rpsDf SYSNAME;
  SELECT @rpsDf = dc.name
  FROM sys.default_constraints dc
  INNER JOIN sys.columns c
    ON c.default_object_id = dc.object_id
  WHERE dc.parent_object_id = OBJECT_ID(N'dbo.registration_price_settings')
    AND c.name = N'spread';
  IF @rpsDf IS NOT NULL
    EXEC(N'ALTER TABLE [dbo].[registration_price_settings] DROP CONSTRAINT [' + @rpsDf + N']');

  ALTER TABLE [dbo].[registration_price_settings] DROP COLUMN [spread];
  EXEC sp_rename N'dbo.registration_price_settings.spread_text', N'spread', N'COLUMN';
END;

-- master_data_crm_registrations
IF COL_LENGTH(N'dbo.master_data_crm_registrations', N'spread') IS NOT NULL
   AND EXISTS (
     SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = N'dbo'
       AND TABLE_NAME = N'master_data_crm_registrations'
       AND COLUMN_NAME = N'spread'
       AND DATA_TYPE IN (N'decimal', N'numeric')
   )
BEGIN
  ALTER TABLE [dbo].[master_data_crm_registrations]
    ADD [spread_text] NVARCHAR(1000) NULL;

  EXEC(N'
    UPDATE [dbo].[master_data_crm_registrations]
    SET [spread_text] = CONVERT(NVARCHAR(1000), [spread]);
  ');

  DECLARE @managedDf SYSNAME;
  SELECT @managedDf = dc.name
  FROM sys.default_constraints dc
  INNER JOIN sys.columns c
    ON c.default_object_id = dc.object_id
  WHERE dc.parent_object_id = OBJECT_ID(N'dbo.master_data_crm_registrations')
    AND c.name = N'spread';
  IF @managedDf IS NOT NULL
    EXEC(N'ALTER TABLE [dbo].[master_data_crm_registrations] DROP CONSTRAINT [' + @managedDf + N']');

  ALTER TABLE [dbo].[master_data_crm_registrations] DROP COLUMN [spread];
  EXEC sp_rename N'dbo.master_data_crm_registrations.spread_text', N'spread', N'COLUMN';
END;

-- FactForecast: parse text spread for effective price math
EXEC(N'
CREATE OR ALTER VIEW [dbo].[FactForecast] AS
WITH fact_base AS (
  SELECT
    forecast.[registrationId],
    COALESCE(managed.[newKey], forecast.[registrationId]) AS [registrationKey],
    forecast.[versionName],
    forecast.[period],
    forecast.[granularity],
    forecast.[qtyFcst],
    forecast.[priceFcst],
    forecast.[amountFcst],
    forecast.[updatedAt],
    forecast.[lastBatchId],
    versions.[versionKey],
    batch.[changedBy],
    batch.[stampPeriod],
    batch.[createdAt] AS [batchCreatedAt],
    ISNULL(managed.[priceFormula], N''CPL'') AS [priceFormula],
    ISNULL(
      TRY_CONVERT(
        DECIMAL(18,4),
        NULLIF(LTRIM(RTRIM(COALESCE(rps.[spread], managed.[spread]))), N'''')
      ),
      0
    ) AS [spread],
    cpl.[price] AS [cplPrice],
    COALESCE(
      TRY_CONVERT(DATE, forecast.[period]),
      TRY_CONVERT(DATE, CONCAT(CAST(forecast.[period] AS NVARCHAR(15)), N''-01''), 126)
    ) AS [periodDate]
  FROM [dbo].[forecast_values] forecast
  INNER JOIN [dbo].[forecast_versions] versions
    ON versions.[name] = forecast.[versionName]
  LEFT JOIN [dbo].[forecast_commit_batches] batch
    ON batch.[id] = forecast.[lastBatchId]
  LEFT JOIN [dbo].[master_data_crm_registrations] managed
    ON managed.[id] = forecast.[registrationId]
    OR managed.[newKey] = forecast.[registrationId]
  LEFT JOIN [dbo].[registration_price_settings] rps
    ON rps.[registrationId] = forecast.[registrationId]
  LEFT JOIN [dbo].[cpl_prices] cpl
    ON cpl.[month] = FORMAT(
      COALESCE(
        TRY_CONVERT(DATE, forecast.[period]),
        TRY_CONVERT(DATE, CONCAT(CAST(forecast.[period] AS NVARCHAR(15)), N''-01''), 126)
      ),
      ''yyyy-MM''
    )
),
resolved_fact AS (
  SELECT
    *,
    COALESCE([batchCreatedAt], [updatedAt]) AS [revisionDate],
    COALESCE(NULLIF([changedBy], N''''), N''sales-forecast-web'') AS [revisionUser],
    COALESCE(NULLIF([stampPeriod], N''''), N''No'') AS [resolvedStampPeriod],
    DATEFROMPARTS(YEAR([periodDate]), MONTH([periodDate]), 1) AS [fcstPeriodDate],
    CASE
      WHEN [priceFormula] = N''Fixed Price'' THEN ISNULL([priceFcst], 0)
      WHEN [priceFormula] IN (N''Naphtha'', N''Benzene'') THEN ISNULL([priceFcst], 0)
      ELSE ISNULL([cplPrice], 0) + ISNULL([spread], 0)
    END AS [effectivePrice]
  FROM fact_base
  WHERE [periodDate] IS NOT NULL
)
SELECT
  CONCAT(
    CAST([versionKey] AS NVARCHAR(20)),
    N''-'',
    CONVERT(CHAR(10), [revisionDate], 105),
    N''-'',
    REPLACE(CONVERT(CHAR(5), [revisionDate], 108), N'':'', N''''),
    N''-'',
    [revisionUser]
  ) AS [Fcst Rev Key],
  CONCAT(
    CONVERT(CHAR(10), [revisionDate], 105),
    N''-'',
    REPLACE(CONVERT(CHAR(5), [revisionDate], 108), N'':'', N''''),
    N''-'',
    [revisionUser]
  ) AS [Revision],
  [versionName] AS [Forecast Version],
  [versionKey] AS [Version Key],
  [registrationKey] AS [Registration Key],
  [fcstPeriodDate] AS [Fcst Period],
  CAST([qtyFcst] AS DECIMAL(18,4)) AS [NewQty],
  CAST([effectivePrice] AS DECIMAL(18,4)) AS [Price],
  CAST(
    COALESCE(NULLIF([amountFcst], 0), [qtyFcst] * [effectivePrice])
    AS DECIMAL(18,4)
  ) AS [Amount],
  [resolvedStampPeriod] AS [Stamp Period]
FROM resolved_fact;
');
