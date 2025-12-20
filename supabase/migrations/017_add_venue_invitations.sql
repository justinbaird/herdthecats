-- Venue Invitations table
-- Venues can create invitations with codes that musicians can use to join
CREATE TABLE IF NOT EXISTS venue_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  invitation_code TEXT UNIQUE NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  musician_email TEXT,
  musician_first_name TEXT,
  musician_last_name TEXT,
  musician_phone TEXT,
  musician_instruments TEXT[], -- Array of instruments or ['Voice'] for singers
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'expired'
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Generate unique invitation codes
CREATE OR REPLACE FUNCTION generate_invitation_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Excluding confusing chars like 0, O, I, 1
  code TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies for venue_invitations
ALTER TABLE venue_invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Venue managers can view venue invitations" ON venue_invitations;
DROP POLICY IF EXISTS "Anyone can view invitations by code" ON venue_invitations;
DROP POLICY IF EXISTS "Venue managers can create invitations" ON venue_invitations;
DROP POLICY IF EXISTS "Venue managers can update invitations" ON venue_invitations;
DROP POLICY IF EXISTS "Musicians can accept invitations" ON venue_invitations;

-- Venue managers can view invitations for their venues
CREATE POLICY "Venue managers can view venue invitations"
  ON venue_invitations FOR SELECT
  USING (
    is_venue_manager_for(venue_id)
  );

-- Anyone can view invitations by code (for redemption)
CREATE POLICY "Anyone can view invitations by code"
  ON venue_invitations FOR SELECT
  USING (true); -- Needed for musicians to redeem codes

-- Venue managers can create invitations
CREATE POLICY "Venue managers can create invitations"
  ON venue_invitations FOR INSERT
  WITH CHECK (
    is_venue_manager_for(venue_id)
  );

-- Venue managers can update invitations
CREATE POLICY "Venue managers can update invitations"
  ON venue_invitations FOR UPDATE
  USING (
    is_venue_manager_for(venue_id)
  );

-- Musicians can update invitations when accepting (status change)
CREATE POLICY "Musicians can accept invitations"
  ON venue_invitations FOR UPDATE
  USING (
    status = 'pending'
    AND (expires_at IS NULL OR expires_at > NOW())
  )
  WITH CHECK (
    status = 'accepted'
    AND accepted_by = auth.uid()
  );

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_venue_invitations_venue_id ON venue_invitations(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_invitations_code ON venue_invitations(invitation_code);
CREATE INDEX IF NOT EXISTS idx_venue_invitations_status ON venue_invitations(status);

