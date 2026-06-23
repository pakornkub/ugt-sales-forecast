BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[forecast_versions] (
    [name] NVARCHAR(100) NOT NULL,
    [isStandard] BIT NOT NULL CONSTRAINT [forecast_versions_isStandard_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [forecast_versions_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [forecast_versions_pkey] PRIMARY KEY CLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[forecast_values] (
    [registrationId] NVARCHAR(50) NOT NULL,
    [versionName] NVARCHAR(100) NOT NULL,
    [period] NVARCHAR(10) NOT NULL,
    [granularity] NVARCHAR(10) NOT NULL,
    [qtyFcst] DECIMAL(18,4) NOT NULL CONSTRAINT [forecast_values_qtyFcst_df] DEFAULT 0,
    [priceFcst] DECIMAL(18,4) NOT NULL CONSTRAINT [forecast_values_priceFcst_df] DEFAULT 0,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [forecast_values_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [forecast_values_pkey] PRIMARY KEY CLUSTERED ([registrationId],[versionName],[period])
);

-- CreateTable
CREATE TABLE [dbo].[cpl_prices] (
    [month] NVARCHAR(7) NOT NULL,
    [price] DECIMAL(18,4) NOT NULL CONSTRAINT [cpl_prices_price_df] DEFAULT 0,
    CONSTRAINT [cpl_prices_pkey] PRIMARY KEY CLUSTERED ([month])
);

-- AddForeignKey
ALTER TABLE [dbo].[forecast_values] ADD CONSTRAINT [forecast_values_versionName_fkey] FOREIGN KEY ([versionName]) REFERENCES [dbo].[forecast_versions]([name]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
