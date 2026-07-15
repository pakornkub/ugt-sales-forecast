BEGIN TRY
BEGIN TRAN;

IF OBJECT_ID(N'[dbo].[custom_column_definitions]', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[custom_column_definitions] (
    [id]              NVARCHAR(36)   NOT NULL CONSTRAINT [custom_column_definitions_pkey] PRIMARY KEY DEFAULT NEWID(),
    [name]            NVARCHAR(200)  NOT NULL,
    [type]            NVARCHAR(20)   NOT NULL,
    [dropdownOptions] NVARCHAR(MAX)  NULL,
    [defaultValue]    NVARCHAR(500)  NULL,
    [displayOrder]    INT            NOT NULL CONSTRAINT [custom_column_definitions_displayOrder_df] DEFAULT 0,
    [isActive]        BIT            NOT NULL CONSTRAINT [custom_column_definitions_isActive_df] DEFAULT 1,
    [createdBy]       NVARCHAR(200)  NULL,
    [createdAt]       DATETIME2      NOT NULL CONSTRAINT [custom_column_definitions_createdAt_df] DEFAULT GETUTCDATE(),
    [updatedAt]       DATETIME2      NOT NULL CONSTRAINT [custom_column_definitions_updatedAt_df] DEFAULT GETUTCDATE()
  );
END;

IF OBJECT_ID(N'[dbo].[custom_column_values]', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[custom_column_values] (
    [id]             INT            IDENTITY(1,1) NOT NULL CONSTRAINT [custom_column_values_pkey] PRIMARY KEY,
    [columnId]       NVARCHAR(36)   NOT NULL,
    [registrationId] NVARCHAR(200)  NOT NULL,
    [value]          NVARCHAR(MAX)  NULL,
    [updatedAt]      DATETIME2      NOT NULL CONSTRAINT [custom_column_values_updatedAt_df] DEFAULT GETUTCDATE(),
    [updatedBy]      NVARCHAR(200)  NULL,
    CONSTRAINT [custom_column_values_columnId_fkey]
      FOREIGN KEY ([columnId]) REFERENCES [dbo].[custom_column_definitions]([id]),
    CONSTRAINT [UQ_custom_col_val] UNIQUE ([columnId], [registrationId])
  );
END;

COMMIT TRAN;
END TRY
BEGIN CATCH
IF @@TRANCOUNT > 0 BEGIN ROLLBACK TRAN; END;
THROW
END CATCH
