-- Add lead_musician_id to gigs table
-- When a lead musician is assigned and accepts, they get full control over musician slots
ALTER TABLE gigs
ADD COLUMN IF NOT EXISTS lead_musician_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN gigs.lead_musician_id IS 'User ID of the lead musician who manages musician slots for this gig. When set and accepted, they have full editing rights for slots.';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_gigs_lead_musician_id ON gigs(lead_musician_id);

-- Update RLS policies to allow lead musicians to update gigs they lead
-- Note: We'll need to update the existing UPDATE policy or add a new one
-- First, let's check if there's an existing UPDATE policy and modify it

-- Drop existing UPDATE policy if it exists (we'll recreate it)
DROP POLICY IF EXISTS "Gig posters can update their own gigs" ON gigs;
DROP POLICY IF EXISTS "Venue managers can update venue gigs" ON gigs;

-- Create comprehensive UPDATE policy
CREATE POLICY "Gig posters and lead musicians can update gigs"
  ON gigs FOR UPDATE
  USING (
    posted_by = auth.uid()
    OR lead_musician_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM venue_managers vm
      WHERE vm.venue_id = gigs.venue_id
      AND vm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Also allow lead musicians to view and manage invitations
-- Update gig_invitations policies to include lead musicians
DROP POLICY IF EXISTS "Gig posters can create invitations" ON gig_invitations;
CREATE POLICY "Gig posters and lead musicians can create invitations"
  ON gig_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM gigs 
      WHERE gigs.id = gig_invitations.gig_id 
      AND (
        gigs.posted_by = auth.uid()
        OR gigs.lead_musician_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Gig posters can delete invitations" ON gig_invitations;
CREATE POLICY "Gig posters and lead musicians can delete invitations"
  ON gig_invitations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM gigs 
      WHERE gigs.id = gig_invitations.gig_id 
      AND (
        gigs.posted_by = auth.uid()
        OR gigs.lead_musician_id = auth.uid()
      )
    )
  );

-- Update gig_applications policies to allow lead musicians to accept/reject
DROP POLICY IF EXISTS "Gig posters can update applications" ON gig_applications;
CREATE POLICY "Gig posters and lead musicians can update applications"
  ON gig_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM gigs 
      WHERE gigs.id = gig_applications.gig_id 
      AND (
        gigs.posted_by = auth.uid()
        OR gigs.lead_musician_id = auth.uid()
      )
    )
  );



