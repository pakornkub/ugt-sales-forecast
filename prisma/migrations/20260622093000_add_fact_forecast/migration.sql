ALTER TABLE [dbo].[forecast_versions]
ADD [versionKey] INT NOT NULL CONSTRAINT [forecast_versions_versionKey_df] DEFAULT 0;

EXEC(N'
WITH ordered_versions AS (
  SELECT
    [name],
    CASE [name]
      WHEN N''Current Forecast'' THEN 1
      WHEN N''BB FY26'' THEN 2
      WHEN N''SepF FY26'' THEN 3
      WHEN N''DecF FY26'' THEN 4
      ELSE 1000 + ROW_NUMBER() OVER (ORDER BY [createdAt], [name])
    END AS [nextVersionKey]
  FROM [dbo].[forecast_versions]
)
UPDATE versions
SET [versionKey] = ordered_versions.[nextVersionKey]
FROM [dbo].[forecast_versions] versions
INNER JOIN ordered_versions
  ON ordered_versions.[name] = versions.[name];
');

EXEC(N'
CREATE UNIQUE NONCLUSTERED INDEX [forecast_versions_versionKey_key]
ON [dbo].[forecast_versions]([versionKey]);
');

ALTER TABLE [dbo].[forecast_values]
ADD [lastBatchId] NVARCHAR(36) NULL;

EXEC(N'
ALTER TABLE [dbo].[forecast_values]
ADD CONSTRAINT [forecast_values_lastBatchId_fkey]
FOREIGN KEY ([lastBatchId]) REFERENCES [dbo].[forecast_commit_batches]([id])
ON DELETE SET NULL ON UPDATE NO ACTION;
');
