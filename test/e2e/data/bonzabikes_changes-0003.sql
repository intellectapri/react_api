ALTER TABLE purchase_tour ADD COLUMN infantRate decimal(10,2) DEFAULT 0;
ALTER TABLE purchase_tour ADD COLUMN seniorConsessionRate decimal(10,2) DEFAULT 0;

ALTER TABLE product ADD COLUMN infantRate decimal(10,2) DEFAULT 0;
ALTER TABLE product ADD COLUMN seniorConsessionRate decimal(10,2) DEFAULT 0;
ALTER TABLE product ADD COLUMN includeInUpcomingTourReport BOOLEAN DEFAULT FALSE;

ALTER TABLE customer ADD COLUMN infantPrice decimal(10,2) DEFAULT 0;
ALTER TABLE customer CHANGE COLUMN `familyAdditionalRiderPrice` `additionalAdultPrice` decimal(10,2) DEFAULT 0;
ALTER TABLE customer ADD COLUMN additionalChildPrice decimal(10,2) DEFAULT 0;
ALTER TABLE customer ADD COLUMN seniorConcessionPrice decimal(10,2) DEFAULT 0;

ALTER TABLE customer MODIFY paymentMethod VARCHAR(256);
ALTER TABLE charge MODIFY method VARCHAR(256);


ALTER TABLE purchase_tour ADD voucherIDs text;
ALTER TABLE purchase_tour ADD voucherCode text;
ALTER TABLE purchase_tour ADD discounted BOOLEAN DEFAULT FALSE;

ALTER TABLE temp_website_order ADD voucherIDs text;

