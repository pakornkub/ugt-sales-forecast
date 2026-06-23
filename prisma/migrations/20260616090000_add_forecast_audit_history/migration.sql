CREATE TABLE [dbo].[forecast_commit_batches] (
  [id] NVARCHAR(36) NOT NULL CONSTRAINT [forecast_commit_batches_id_df] DEFAULT CONVERT(NVARCHAR(36), NEWID()),
  [source] NVARCHAR(50) NOT NULL,
  [changedBy] NVARCHAR(100) NOT NULL,
  [recordCount] INT NOT NULL CONSTRAINT [forecast_commit_batches_recordCount_df] DEFAULT 0,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [forecast_commit_batches_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT [forecast_commit_batches_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE TABLE [dbo].[forecast_change_logs] (
  [id] NVARCHAR(36) NOT NULL CONSTRAINT [forecast_change_logs_id_df] DEFAULT CONVERT(NVARCHAR(36), NEWID()),
  [batchId] NVARCHAR(36) NOT NULL,
  [registrationId] NVARCHAR(200) NOT NULL,
  [versionName] NVARCHAR(100) NOT NULL,
  [period] NVARCHAR(15) NOT NULL,
  [granularity] NVARCHAR(10) NOT NULL,
  [oldQtyFcst] DECIMAL(18,4),
  [newQtyFcst] DECIMAL(18,4) NOT NULL,
  [oldPriceFcst] DECIMAL(18,4),
  [newPriceFcst] DECIMAL(18,4) NOT NULL,
  [changedAt] DATETIME2 NOT NULL CONSTRAINT [forecast_change_logs_changedAt_df] DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT [forecast_change_logs_pkey] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [forecast_change_logs_batchId_fkey]
    FOREIGN KEY ([batchId]) REFERENCES [dbo].[forecast_commit_batches]([id])
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE NONCLUSTERED INDEX [forecast_change_logs_registration_period_idx]
ON [dbo].[forecast_change_logs]([registrationId], [versionName], [period]);

CREATE NONCLUSTERED INDEX [forecast_change_logs_batch_idx]
ON [dbo].[forecast_change_logs]([batchId]);
