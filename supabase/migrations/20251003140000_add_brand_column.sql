-- Add brand column to spares table

ALTER TABLE spares ADD COLUMN brand VARCHAR(100) DEFAULT NULL AFTER part_number;

-- Update existing spares with some brand examples
UPDATE spares SET brand = 'TechScale' WHERE id IN (1,2,3,4,5);

-- Add index for brand column for better search performance
CREATE INDEX idx_spares_brand ON spares(brand);
