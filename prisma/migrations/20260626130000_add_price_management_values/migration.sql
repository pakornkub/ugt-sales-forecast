BEGIN TRY

BEGIN TRAN;

IF OBJECT_ID(N'[dbo].[price_management_values]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[price_management_values] (
        [month] NVARCHAR(7) NOT NULL,
        [priceType] NVARCHAR(10) NOT NULL,
        [versionName] NVARCHAR(100) NOT NULL,
        [cplPrice] DECIMAL(18,4) NOT NULL CONSTRAINT [price_management_values_cplPrice_df] DEFAULT 0,
        [naphthaPrice] DECIMAL(18,4) NOT NULL CONSTRAINT [price_management_values_naphthaPrice_df] DEFAULT 0,
        [benzenePrice] DECIMAL(18,4) NOT NULL CONSTRAINT [price_management_values_benzenePrice_df] DEFAULT 0,
        [updatedAt] DATETIME2 NOT NULL CONSTRAINT [price_management_values_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT [price_management_values_pkey] PRIMARY KEY CLUSTERED ([month], [priceType], [versionName])
    );

    CREATE NONCLUSTERED INDEX [price_management_values_priceType_versionName_month_idx]
        ON [dbo].[price_management_values]([priceType], [versionName], [month]);
END;

MERGE [dbo].[price_management_values] AS target
USING (
    SELECT [month], [price] FROM [dbo].[cpl_prices]
) AS source
ON target.[month] = source.[month]
   AND target.[priceType] = N'Fcst'
   AND target.[versionName] = N'Current Forecast'
WHEN NOT MATCHED THEN
    INSERT ([month], [priceType], [versionName], [cplPrice], [naphthaPrice], [benzenePrice])
    VALUES (source.[month], N'Fcst', N'Current Forecast', source.[price], 0, 0);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
