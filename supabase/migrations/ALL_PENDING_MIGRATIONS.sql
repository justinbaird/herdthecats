-- ============================================
-- Combined SQL for Pending Migrations
-- Run this in your Supabase SQL Editor
-- ============================================

-- Migration 007: Add phone number fields to musicians table
-- Add phone number and country code fields to musicians table
ALTER TABLE musicians 
ADD COLUMN IF NOT EXISTS country_code TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Add comments for documentation
COMMENT ON COLUMN musicians.country_code IS 'Country calling code (e.g., +1, +44, +33)';
COMMENT ON COLUMN musicians.phone_number IS 'Phone number without country code';

-- Migration 008: Add timing fields to gigs table
-- Add timing and set fields to gigs table
ALTER TABLE gigs 
ADD COLUMN IF NOT EXISTS call_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS number_of_sets INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN gigs.call_time IS 'When musicians should arrive (call time)';
COMMENT ON COLUMN gigs.start_time IS 'When the gig/performance actually starts';
COMMENT ON COLUMN gigs.end_time IS 'When the gig/performance ends';
COMMENT ON COLUMN gigs.number_of_sets IS 'Number of sets in the performance';
COMMENT ON COLUMN gigs.datetime IS 'Legacy field - kept for backwards compatibility, use start_time instead';

-- Migration 009: Add payment per instrument to gigs table
-- Add payment_per_instrument field to gigs table
-- This will store a JSON object mapping instrument types to payment amounts
-- Example: {"alto_sax": 150, "tenor_sax": 150, "trumpet": 200}
ALTER TABLE gigs 
ADD COLUMN IF NOT EXISTS payment_per_instrument JSONB DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN gigs.payment_per_instrument IS 'JSON object mapping instrument_type to payment amount (e.g., {"alto_sax": 150, "trumpet": 200}). Payment amounts are in the base currency unit (e.g., dollars).';

