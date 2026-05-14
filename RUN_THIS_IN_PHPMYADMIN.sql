-- ============================================
-- ADD YEAR VARIANT SUPPORT TO BOOKINGS
-- Run this in phpMyAdmin SQL tab
-- ============================================

USE alrascars;

-- Add year variant fields to bookings table
ALTER TABLE bookings 
ADD COLUMN variant_id CHAR(36) NULL AFTER car_id,
ADD COLUMN model_year INT NULL AFTER variant_id;

-- Add indexes for better query performance
ALTER TABLE bookings
ADD INDEX idx_bookings_variant_id (variant_id),
ADD INDEX idx_bookings_model_year (model_year);

-- Verify the changes
DESCRIBE bookings;

-- Check if columns were added successfully
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE, 
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'alrascars' 
  AND TABLE_NAME = 'bookings' 
  AND COLUMN_NAME IN ('variant_id', 'model_year');
