ALTER TABLE temp_website_order ADD COLUMN miscPurchases text;
ALTER TABLE purchase_tour ADD COLUMN checkInInitial BOOL DEFAULT FALSE;
ALTER TABLE purchase_tour ADD COLUMN noShowInitial BOOL DEFAULT FALSE;