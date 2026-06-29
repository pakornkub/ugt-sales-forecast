IF COL_LENGTH('dbo.crm_registration_snapshot', 'businessUnit') IS NULL
BEGIN
  ALTER TABLE [dbo].[crm_registration_snapshot]
    ADD [businessUnit] NVARCHAR(50) NULL;
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'crm_registration_snapshot_snapshotVersion_businessUnit_registrationId_idx'
    AND object_id = OBJECT_ID('dbo.crm_registration_snapshot')
)
BEGIN
  CREATE NONCLUSTERED INDEX [crm_registration_snapshot_snapshotVersion_businessUnit_registrationId_idx]
  ON [dbo].[crm_registration_snapshot]([snapshotVersion], [businessUnit], [registrationId]);
END;

IF COL_LENGTH('dbo.master_data_crm_registrations', 'businessUnit') IS NULL
BEGIN
  ALTER TABLE [dbo].[master_data_crm_registrations]
    ADD [businessUnit] NVARCHAR(50) NOT NULL
      CONSTRAINT [master_data_crm_registrations_businessUnit_df] DEFAULT 'Composite';

  EXEC(N'
    UPDATE [dbo].[master_data_crm_registrations]
    SET [businessUnit] = CASE
      WHEN [plantCode] IN (''1506'', ''1504'', ''1505'') THEN ''UFA''
      WHEN [plantCode] IN (''1104'', ''1105'', ''1109'') THEN ''Polymer''
      ELSE ''Composite''
    END
    WHERE [businessUnit] IS NULL OR LTRIM(RTRIM([businessUnit])) = ''''
  ');
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'master_data_crm_registrations_businessUnit_id_idx'
    AND object_id = OBJECT_ID('dbo.master_data_crm_registrations')
)
BEGIN
  CREATE NONCLUSTERED INDEX [master_data_crm_registrations_businessUnit_id_idx]
  ON [dbo].[master_data_crm_registrations]([businessUnit], [id]);
END;
