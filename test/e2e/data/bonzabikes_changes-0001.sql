<<<<<<< HEAD
#use bonzatours;
=======

>>>>>>> 612892530525e7202ecec35205fbb98cb9f9580d
UPDATE groups SET groupName = 'Manager', groupCode = 'MANAGER' WHERE groupID = 2;
ALTER TABLE charge ADD  addedToAccounting BOOLEAN DEFAULT FALSE;
ALTER TABLE purchase ADD  enteredAt DATETIME;
ALTER TABLE purchase ADD  updatedBy SMALLINT;
ALTER TABLE purchase ADD  updatedAt DATETIME;
ALTER TABLE charge ADD  addedToAccountingUpdatedBy SMALLINT;
ALTER TABLE charge ADD addedToAccountingUpdatedAt DATETIME;

CREATE TABLE IF NOT EXISTS price_seasons (seasonID INT AUTO_INCREMENT, productID INT, name TEXT, notes TEXT, startDate DATE, finishDate DATE, adultRate DECIMAL(13, 2), childRate DECIMAL(13, 2), infantRate DECIMAL(13, 2), familyRate DECIMAL(13, 2), additionalAdultRate DECIMAL(13, 2), additionalChildRate DECIMAL(13, 2), seniorConcessionRate DECIMAL(13, 2), createdAt TIMESTAMP DEFAULT NOW(), createdBy INT, PRIMARY KEY (seasonID));

CREATE TABLE IF NOT EXISTS discount (discountID INT AUTO_INCREMENT, discountCode TEXT, discountType TEXT, discountAmount INT DEFAULT 0, expireDate text, oneTimeUse BOOLEAN DEFAULT 0, active BOOLEAN DEFAULT 1, useCount INT DEFAULT 0, createdAt TIMESTAMP DEFAULT NOW(), createdBy INT, PRIMARY KEY ( discountID ));
