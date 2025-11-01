-- Add invite_only_instruments field to gigs table
ALTER TABLE gigs 
ADD COLUMN IF NOT EXISTS invite_only_instruments instrument_type[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN gigs.invite_only_instruments IS 'Array of instruments that are invite-only (only invited musicians can apply)';

-- Create gig_invitations table to track which musicians are invited to which slots
CREATE TABLE IF NOT EXISTS gig_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  musician_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instrument instrument_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(gig_id, musician_id, instrument)
);

-- Enable RLS on gig_invitations
ALTER TABLE gig_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gig_invitations
DROP POLICY IF EXISTS "Users can view invitations for gigs they posted or are invited to" ON gig_invitations;
CREATE POLICY "Users can view invitations for gigs they posted or are invited to"
  ON gig_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gigs WHERE gigs.id = gig_invitations.gig_id 
      AND gigs.posted_by = auth.uid()
    )
    OR musician_id = auth.uid()
  );

DROP POLICY IF EXISTS "Gig posters can create invitations" ON gig_invitations;
CREATE POLICY "Gig posters can create invitations"
  ON gig_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM gigs WHERE gigs.id = gig_invitations.gig_id 
      AND gigs.posted_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Gig posters can delete invitations" ON gig_invitations;
CREATE POLICY "Gig posters can delete invitations"
  ON gig_invitations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM gigs WHERE gigs.id = gig_invitations.gig_id 
      AND gigs.posted_by = auth.uid()
    )
  );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_gig_invitations_gig_id ON gig_invitations(gig_id);
CREATE INDEX IF NOT EXISTS idx_gig_invitations_musician_id ON gig_invitations(musician_id);
CREATE INDEX IF NOT EXISTS idx_gig_invitations_instrument ON gig_invitations(instrument);

