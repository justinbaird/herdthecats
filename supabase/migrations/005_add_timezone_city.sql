-- Add timezone and city fields to musicians table
ALTER TABLE musicians 
ADD COLUMN IF NOT EXISTS timezone TEXT,
ADD COLUMN IF NOT EXISTS city TEXT;

-- Add comments for documentation
COMMENT ON COLUMN musicians.timezone IS 'IANA timezone identifier (e.g., America/New_York, Europe/London)';
COMMENT ON COLUMN musicians.city IS 'City name for display (e.g., New York, London)';

