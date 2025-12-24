-- Version 2.0: Venue Manager Profiles, Rehearsals, and Media Library
-- Adds venue manager profiles, rehearsals, and media uploads for gigs

-- Create venue_manager_profiles table
CREATE TABLE IF NOT EXISTS venue_manager_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  email TEXT NOT NULL, -- Stored here but should match auth.users.email
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create venue_manager_invitations table for inviting new venue managers
CREATE TABLE IF NOT EXISTS venue_manager_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invitation_code TEXT UNIQUE NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'expired'
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add entry_type to gigs table: 'gig' or 'rehearsal'
ALTER TABLE gigs
ADD COLUMN IF NOT EXISTS entry_type TEXT DEFAULT 'gig' CHECK (entry_type IN ('gig', 'rehearsal'));

-- Add music_charts_url for rehearsals
ALTER TABLE gigs
ADD COLUMN IF NOT EXISTS music_charts_url TEXT;

-- Create gig_media table for photos and videos uploaded by musicians
CREATE TABLE IF NOT EXISTS gig_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video')),
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER, -- in bytes
  description TEXT, -- Optional text description for the media
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create gig_descriptions table for text descriptions added by musicians
CREATE TABLE IF NOT EXISTS gig_descriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  musician_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(gig_id, musician_id) -- One description per musician per gig
);

-- Enable RLS on all new tables
ALTER TABLE venue_manager_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_manager_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE gig_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE gig_descriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for venue_manager_profiles
DROP POLICY IF EXISTS "Users can view venue manager profiles" ON venue_manager_profiles;
CREATE POLICY "Users can view venue manager profiles"
  ON venue_manager_profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own venue manager profile" ON venue_manager_profiles;
CREATE POLICY "Users can insert their own venue manager profile"
  ON venue_manager_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own venue manager profile" ON venue_manager_profiles;
CREATE POLICY "Users can update their own venue manager profile"
  ON venue_manager_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for venue_manager_invitations
DROP POLICY IF EXISTS "Venue managers can view invitations for their venues" ON venue_manager_invitations;
CREATE POLICY "Venue managers can view invitations for their venues"
  ON venue_manager_invitations FOR SELECT
  USING (
    is_venue_manager_for(venue_id)
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

DROP POLICY IF EXISTS "Anyone can view invitations by code" ON venue_manager_invitations;
CREATE POLICY "Anyone can view invitations by code"
  ON venue_manager_invitations FOR SELECT
  USING (true); -- Needed for redemption

DROP POLICY IF EXISTS "Venue managers can create invitations" ON venue_manager_invitations;
CREATE POLICY "Venue managers can create invitations"
  ON venue_manager_invitations FOR INSERT
  WITH CHECK (
    is_venue_manager_for(venue_id)
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

DROP POLICY IF EXISTS "Venue managers can update invitations" ON venue_manager_invitations;
CREATE POLICY "Venue managers can update invitations"
  ON venue_manager_invitations FOR UPDATE
  USING (
    is_venue_manager_for(venue_id)
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can accept invitations" ON venue_manager_invitations;
CREATE POLICY "Users can accept invitations"
  ON venue_manager_invitations FOR UPDATE
  USING (
    status = 'pending'
    AND (expires_at IS NULL OR expires_at > NOW())
  )
  WITH CHECK (
    status = 'accepted'
    AND accepted_by = auth.uid()
  );

-- RLS Policies for gig_media
DROP POLICY IF EXISTS "Anyone can view gig media" ON gig_media;
CREATE POLICY "Anyone can view gig media"
  ON gig_media FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Musicians can upload media to gigs they have access to" ON gig_media;
CREATE POLICY "Musicians can upload media to gigs they have access to"
  ON gig_media FOR INSERT
  WITH CHECK (
    -- Musician must have access to the gig (via venue_gig_access or is venue manager)
    EXISTS (
      SELECT 1 FROM venue_gig_access
      WHERE gig_id = gig_media.gig_id
      AND musician_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM gigs g
      JOIN venue_managers vm ON vm.venue_id = g.venue_id
      WHERE g.id = gig_media.gig_id
      AND vm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

DROP POLICY IF EXISTS "Musicians can delete their own media" ON gig_media;
CREATE POLICY "Musicians can delete their own media"
  ON gig_media FOR DELETE
  USING (uploaded_by = auth.uid());

-- RLS Policies for gig_descriptions
DROP POLICY IF EXISTS "Anyone can view gig descriptions" ON gig_descriptions;
CREATE POLICY "Anyone can view gig descriptions"
  ON gig_descriptions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Musicians can add descriptions to gigs they have access to" ON gig_descriptions;
CREATE POLICY "Musicians can add descriptions to gigs they have access to"
  ON gig_descriptions FOR INSERT
  WITH CHECK (
    -- Musician must have access to the gig (via venue_gig_access or is venue manager)
    EXISTS (
      SELECT 1 FROM venue_gig_access
      WHERE gig_id = gig_descriptions.gig_id
      AND musician_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM gigs g
      JOIN venue_managers vm ON vm.venue_id = g.venue_id
      WHERE g.id = gig_descriptions.gig_id
      AND vm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

DROP POLICY IF EXISTS "Musicians can update their own descriptions" ON gig_descriptions;
CREATE POLICY "Musicians can update their own descriptions"
  ON gig_descriptions FOR UPDATE
  USING (musician_id = auth.uid());

DROP POLICY IF EXISTS "Musicians can delete their own descriptions" ON gig_descriptions;
CREATE POLICY "Musicians can delete their own descriptions"
  ON gig_descriptions FOR DELETE
  USING (musician_id = auth.uid());

-- Create function to generate venue manager invitation codes
CREATE OR REPLACE FUNCTION generate_venue_manager_invitation_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Excluding confusing chars
  code TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..10 LOOP -- Longer code for manager invitations
    code := code || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_venue_manager_profiles_user_id ON venue_manager_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_venue_manager_invitations_venue_id ON venue_manager_invitations(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_manager_invitations_code ON venue_manager_invitations(invitation_code);
CREATE INDEX IF NOT EXISTS idx_gig_media_gig_id ON gig_media(gig_id);
CREATE INDEX IF NOT EXISTS idx_gig_media_uploaded_by ON gig_media(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_gig_descriptions_gig_id ON gig_descriptions(gig_id);
CREATE INDEX IF NOT EXISTS idx_gigs_entry_type ON gigs(entry_type);

-- Add comments for documentation
COMMENT ON COLUMN gigs.entry_type IS 'Type of calendar entry: "gig" (paid) or "rehearsal" (unpaid)';
COMMENT ON COLUMN gigs.music_charts_url IS 'URL to music charts (Google Drive, Dropbox, etc.) for rehearsals';
COMMENT ON TABLE gig_media IS 'Photos and videos uploaded by musicians for gigs';
COMMENT ON TABLE gig_descriptions IS 'Text descriptions added by musicians for gigs';


