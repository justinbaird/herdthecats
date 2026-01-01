-- Change number_of_sets from INTEGER to TEXT to support descriptive text like "2 longer or 3 shorter sets"
ALTER TABLE gigs 
ALTER COLUMN number_of_sets TYPE TEXT USING number_of_sets::TEXT;

-- Update comment
COMMENT ON COLUMN gigs.number_of_sets IS 'Description of number and length of sets (e.g., "2 longer or 3 shorter sets")';

