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

