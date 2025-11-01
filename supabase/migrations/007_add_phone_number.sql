-- Add phone number and country code fields to musicians table
ALTER TABLE musicians 
ADD COLUMN IF NOT EXISTS country_code TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Add comments for documentation
COMMENT ON COLUMN musicians.country_code IS 'Country calling code (e.g., +1, +44, +33)';
COMMENT ON COLUMN musicians.phone_number IS 'Phone number without country code';

