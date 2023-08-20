ALTER TABLE st_emailtemplate ADD archived bool DEFAULT FALSE;

ALTER TABLE temp_website_order ADD COLUMN noOfAdditionalAdults INT;
ALTER TABLE temp_website_order ADD COLUMN noOfAdditionalChildren INT;

ALTER TABLE purchase_tour ADD COLUMN noOfAdditionalsAdults INT;
ALTER TABLE purchase_tour ADD COLUMN noOfAdditionalsChildren INT;