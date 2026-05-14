-- Add year variant fields to bookings table
-- This allows bookings to track which specific year variant was booked

ALTER TABLE bookings 
ADD COLUMN variant_id CHAR(36) NULL AFTER car_id,
ADD COLUMN model_year INT NULL AFTER variant_id,
ADD INDEX idx_bookings_variant_id (variant_id),
ADD INDEX idx_bookings_model_year (model_year);

-- Optional: Add foreign key constraint if you want referential integrity
-- Uncomment if you want strict enforcement
-- ALTER TABLE bookings 
-- ADD CONSTRAINT fk_bookings_variant_id 
--     FOREIGN KEY (variant_id) 
--     REFERENCES car_variants(id) 
--     ON DELETE SET NULL;

-- Verify the changes
DESCRIBE bookings;
