-- Add public_calendar_hash to venues table for private calendar sharing
ALTER TABLE venues
ADD COLUMN IF NOT EXISTS public_calendar_hash TEXT UNIQUE;

-- Create index for faster lookups by hash
CREATE INDEX IF NOT EXISTS idx_venues_public_calendar_hash ON venues(public_calendar_hash);

-- Function to generate a secure random hash for public calendar links
CREATE OR REPLACE FUNCTION generate_public_calendar_hash()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  hash TEXT := '';
  i INTEGER;
BEGIN
  -- Generate a 32-character random hash
  FOR i IN 1..32 LOOP
    hash := hash || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN hash;
END;
$$ LANGUAGE plpgsql;

