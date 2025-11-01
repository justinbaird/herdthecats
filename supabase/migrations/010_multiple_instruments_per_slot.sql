-- Change to slot-based instrument requirements
-- Each slot can have multiple instruments (musician must play ALL)
-- Structure: [["alto_sax", "soprano_sax"], ["tenor_sax"]] = 2 slots

-- Add new column for slot-based structure (we'll migrate data separately)
ALTER TABLE gigs
ADD COLUMN IF NOT EXISTS instrument_slots JSONB DEFAULT '[]';

-- Migrate existing data: convert each instrument to a single-instrument slot
UPDATE gigs
SET instrument_slots = (
  SELECT jsonb_agg(jsonb_build_array(instr::text))
  FROM unnest(required_instruments) AS instr
)
WHERE instrument_slots = '[]'::jsonb 
  AND required_instruments IS NOT NULL 
  AND array_length(required_instruments, 1) > 0;

COMMENT ON COLUMN gigs.instrument_slots IS 'JSONB array of arrays. Each inner array is a slot requiring ALL listed instruments. Example: [["alto_sax","soprano_sax"], ["tenor_sax"]] means 2 slots.';

-- Add slot-based invite-only tracking (array of slot indices)
ALTER TABLE gigs
ADD COLUMN IF NOT EXISTS invite_only_slots INTEGER[] DEFAULT '{}';

COMMENT ON COLUMN gigs.invite_only_slots IS 'Array of slot indices (0-based) that are invite-only. Example: [0, 2] means slots 0 and 2 are invite-only.';

-- Migrate invite_only_instruments to invite_only_slots
-- Match slots that contain any of the invite-only instruments
UPDATE gigs
SET invite_only_slots = (
  SELECT array_agg(DISTINCT idx - 1)
  FROM jsonb_array_elements(instrument_slots) WITH ORDINALITY AS t(slot, idx)
  WHERE EXISTS (
    SELECT 1
    FROM unnest(invite_only_instruments) AS inv_instr
    WHERE slot @> jsonb_build_array(inv_instr::text)
  )
)
WHERE invite_only_instruments IS NOT NULL 
  AND array_length(invite_only_instruments, 1) > 0
  AND instrument_slots IS NOT NULL
  AND jsonb_array_length(instrument_slots) > 0;

-- Add slot-based payments
ALTER TABLE gigs
ADD COLUMN IF NOT EXISTS payment_per_slot JSONB DEFAULT '[]';

COMMENT ON COLUMN gigs.payment_per_slot IS 'JSONB array of objects. Each object: {"slotIndex": 0, "amount": 200}. Example: [{"slotIndex": 0, "amount": 200}] means slot 0 pays $200.';

-- Update gig_applications to track slot index
ALTER TABLE gig_applications
ADD COLUMN IF NOT EXISTS slot_index INTEGER;

-- Migrate existing applications: try to match by instrument to slot
UPDATE gig_applications ga
SET slot_index = (
  SELECT idx - 1
  FROM gigs g,
  jsonb_array_elements(g.instrument_slots) WITH ORDINALITY AS t(slot, idx)
  WHERE g.id = ga.gig_id
  AND slot @> jsonb_build_array(ga.instrument::text)
  LIMIT 1
)
WHERE slot_index IS NULL;

COMMENT ON COLUMN gig_applications.slot_index IS 'Index of the slot (0-based) in gigs.instrument_slots that this application is for.';

-- Update unique constraint to use slot_index
-- Drop old constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'gig_applications_gig_id_musician_id_instrument_key'
  ) THEN
    ALTER TABLE gig_applications
    DROP CONSTRAINT gig_applications_gig_id_musician_id_instrument_key;
  END IF;
END $$;

-- Allow multiple applications per gig/musician but only one per slot
-- Only add constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'gig_applications_gig_id_musician_id_slot_index_key'
  ) THEN
    ALTER TABLE gig_applications
    ADD CONSTRAINT gig_applications_gig_id_musician_id_slot_index_key
    UNIQUE(gig_id, musician_id, slot_index);
  END IF;
END $$;

-- Update gig_invitations to use slot_index
ALTER TABLE gig_invitations
ADD COLUMN IF NOT EXISTS slot_index INTEGER;

-- Migrate existing invitations
UPDATE gig_invitations gi
SET slot_index = (
  SELECT idx - 1
  FROM gigs g,
  jsonb_array_elements(g.instrument_slots) WITH ORDINALITY AS t(slot, idx)
  WHERE g.id = gi.gig_id
  AND slot @> jsonb_build_array(gi.instrument::text)
  LIMIT 1
)
WHERE slot_index IS NULL;

-- Update unique constraint for invitations
-- Drop old constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'gig_invitations_gig_id_musician_id_instrument_key'
  ) THEN
    ALTER TABLE gig_invitations
    DROP CONSTRAINT gig_invitations_gig_id_musician_id_instrument_key;
  END IF;
END $$;

-- Add new constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'gig_invitations_gig_id_musician_id_slot_index_key'
  ) THEN
    ALTER TABLE gig_invitations
    ADD CONSTRAINT gig_invitations_gig_id_musician_id_slot_index_key
    UNIQUE(gig_id, musician_id, slot_index);
  END IF;
END $$;
