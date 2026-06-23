CREATE TABLE [dbo].[data_snapshot_state] (
  [source] NVARCHAR(50) NOT NULL,
  [activeVersion] NVARCHAR(36),
  [status] NVARCHAR(20) NOT NULL CONSTRAINT [data_snapshot_state_status_df] DEFAULT 'idle',
  [startedAt] DATETIME2,
  [completedAt] DATETIME2,
  [lastError] NVARCHAR(2000),
  [rowCount] INT NOT NULL CONSTRAINT [data_snapshot_state_rowCount_df] DEFAULT 0,
  CONSTRAINT [data_snapshot_state_pkey] PRIMARY KEY CLUSTERED ([source])
);

CREATE TABLE [dbo].[crm_registration_snapshot] (
  [snapshotVersion] NVARCHAR(36) NOT NULL,
  [registrationId] NVARCHAR(200) NOT NULL,
  [newKey] NVARCHAR(1000) NOT NULL,
  [keyForNoCRM] NVARCHAR(500),
  [ownerName] NVARCHAR(500),
  [registrationTopic] NVARCHAR(500),
  [onOffSpec] NVARCHAR(100),
  [plantCode] NVARCHAR(100),
  [countryName] NVARCHAR(500),
  [materialDescription] NVARCHAR(1000),
  [materialCode] NVARCHAR(100),
  [shipToName] NVARCHAR(500),
  [soldToName] NVARCHAR(500),
  [endUser] NVARCHAR(500),
  [soldToCode] NVARCHAR(100),
  [shipToCode] NVARCHAR(100),
  [groupName] NVARCHAR(500),
  [materialNameOnCoa] NVARCHAR(500),
  [additionalRequirement] NVARCHAR(1000),
  [pic] NVARCHAR(500),
  [commission] NVARCHAR(50),
  [productDescription] NVARCHAR(1000),
  [classified] NVARCHAR(500),
  [commissionIndirect] NVARCHAR(50),
  [commissionFinancialDiscount] NVARCHAR(50),
  [newCoaName] NVARCHAR(500),
  [newTier1] NVARCHAR(500),
  [newOem] NVARCHAR(500),
  [packing] NVARCHAR(500),
  [agreedSpecType] NVARCHAR(500),
  [wasteScrap] NVARCHAR(500),
  [forResaleNotApprove] NVARCHAR(500),
  [imdsDate] NVARCHAR(100),
  [model] NVARCHAR(500),
  [createdOn] NVARCHAR(30),
  [approve] NVARCHAR(500),
  [partName] NVARCHAR(500),
  [coaName] NVARCHAR(500),
  [process] NVARCHAR(500),
  [application] NVARCHAR(500),
  [subApp] NVARCHAR(500),
  [zoneName] NVARCHAR(500),
  [plantName] NVARCHAR(500),
  [countryCode] NVARCHAR(100),
  [endUserCode] NVARCHAR(100),
  [endUserExportControl] NVARCHAR(500),
  [endUserName] NVARCHAR(500),
  [productName] NVARCHAR(500),
  CONSTRAINT [crm_registration_snapshot_pkey]
    PRIMARY KEY CLUSTERED ([snapshotVersion], [registrationId])
);

CREATE NONCLUSTERED INDEX [crm_registration_snapshot_active_key]
ON [dbo].[crm_registration_snapshot]([snapshotVersion], [keyForNoCRM])
INCLUDE ([registrationId], [newKey]);

CREATE NONCLUSTERED INDEX [crm_registration_snapshot_active_order]
ON [dbo].[crm_registration_snapshot]([snapshotVersion], [registrationId]);

CREATE TABLE [dbo].[actual_sales_snapshot] (
  [snapshotVersion] NVARCHAR(36) NOT NULL,
  [rowId] INT IDENTITY(1,1) NOT NULL,
  [keyForRegist] NVARCHAR(500),
  [keyForNoRegist] NVARCHAR(500) NOT NULL,
  [deliveryDate] DATETIME2,
  [carryInETD] DATETIME2,
  [carryOutETD] DATETIME2,
  [carryInLoading] DATETIME2,
  [carryOutLoading] DATETIME2,
  [qty] DECIMAL(18,4) NOT NULL,
  [price] DECIMAL(18,4) NOT NULL,
  [amount] DECIMAL(18,4) NOT NULL,
  [country] NVARCHAR(500),
  [soldTo] NVARCHAR(500),
  [shipTo] NVARCHAR(500),
  [endUser] NVARCHAR(500),
  [plant] NVARCHAR(500),
  [materialCode] NVARCHAR(500),
  CONSTRAINT [actual_sales_snapshot_pkey] PRIMARY KEY CLUSTERED ([snapshotVersion], [rowId])
);

CREATE NONCLUSTERED INDEX [actual_sales_snapshot_key_dates]
ON [dbo].[actual_sales_snapshot]([snapshotVersion], [keyForNoRegist])
INCLUDE ([deliveryDate], [carryInETD], [carryOutETD], [carryInLoading], [carryOutLoading], [qty], [price], [amount]);
