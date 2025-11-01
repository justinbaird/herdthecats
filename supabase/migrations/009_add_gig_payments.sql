-- Add payment_per_instrument field to gigs table
-- This will store a JSON object mapping instrument types to payment amounts
-- Example: {"alto_sax": 150, "tenor_sax": 150, "trumpet": 200}
ALTER TABLE gigs 
ADD COLUMN IF NOT EXISTS payment_per_instrument JSONB DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN gigs.payment_per_instrument IS 'JSON object mapping instrument_type to payment amount (e.g., {"alto_sax": 150, "trumpet": 200}). Payment amounts are in the base currency unit (e.g., dollars).';

