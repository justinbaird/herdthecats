-- Venue Calendar Feature Migration
-- Adds support for venues, venue managers, and venue-specific gig access

-- Create venues table
CREATE TABLE IF NOT EXISTS venues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'USA',
  phone TEXT,
  email TEXT,
  website TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create venue_managers table (many-to-many: venues can have multiple managers, users can manage multiple venues)
CREATE TABLE IF NOT EXISTS venue_managers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(venue_id, user_id)
);

-- Add venue_id to gigs table (nullable for backwards compatibility with existing gigs)
ALTER TABLE gigs
ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES venues(id) ON DELETE SET NULL;

-- Create venue_gig_access table (tracks which musicians can view specific gigs on a venue calendar)
CREATE TABLE IF NOT EXISTS venue_gig_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  musician_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(venue_id, gig_id, musician_id)
);

-- Enable RLS on all new tables
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_gig_access ENABLE ROW LEVEL SECURITY;

-- RLS Policies for venues
DROP POLICY IF EXISTS "Users can view all venues" ON venues;
CREATE POLICY "Users can view all venues"
  ON venues FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Venue managers can create venues" ON venues;
CREATE POLICY "Venue managers can create venues"
  ON venues FOR INSERT
  WITH CHECK (
    -- Allow if user is a venue manager of any venue (for creating new venues)
    -- Or if user is admin
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
    OR true -- Allow any authenticated user to create venues initially
  );

DROP POLICY IF EXISTS "Venue managers can update their venues" ON venues;
CREATE POLICY "Venue managers can update their venues"
  ON venues FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM venue_managers
      WHERE venue_id = venues.id
      AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

DROP POLICY IF EXISTS "Venue managers can delete their venues" ON venues;
CREATE POLICY "Venue managers can delete their venues"
  ON venues FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM venue_managers
      WHERE venue_id = venues.id
      AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- RLS Policies for venue_managers
DROP POLICY IF EXISTS "Users can view venue managers for venues they manage or are managed by" ON venue_managers;
CREATE POLICY "Users can view venue managers for venues they manage or are managed by"
  ON venue_managers FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM venue_managers vm
      WHERE vm.venue_id = venue_managers.venue_id
      AND vm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

DROP POLICY IF EXISTS "Venue managers can add managers to their venues" ON venue_managers;
CREATE POLICY "Venue managers can add managers to their venues"
  ON venue_managers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM venue_managers vm
      WHERE vm.venue_id = venue_managers.venue_id
      AND vm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

DROP POLICY IF EXISTS "Venue managers can remove managers from their venues" ON venue_managers;
CREATE POLICY "Venue managers can remove managers from their venues"
  ON venue_managers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM venue_managers vm
      WHERE vm.venue_id = venue_managers.venue_id
      AND vm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- RLS Policies for venue_gig_access
DROP POLICY IF EXISTS "Musicians can view their venue gig access" ON venue_gig_access;
CREATE POLICY "Musicians can view their venue gig access"
  ON venue_gig_access FOR SELECT
  USING (
    musician_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM venue_managers vm
      WHERE vm.venue_id = venue_gig_access.venue_id
      AND vm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

DROP POLICY IF EXISTS "Venue managers can grant gig access" ON venue_gig_access;
CREATE POLICY "Venue managers can grant gig access"
  ON venue_gig_access FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM venue_managers vm
      WHERE vm.venue_id = venue_gig_access.venue_id
      AND vm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

DROP POLICY IF EXISTS "Venue managers can revoke gig access" ON venue_gig_access;
CREATE POLICY "Venue managers can revoke gig access"
  ON venue_gig_access FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM venue_managers vm
      WHERE vm.venue_id = venue_gig_access.venue_id
      AND vm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Update gigs RLS policies to allow venue managers to create/update gigs for their venues
DROP POLICY IF EXISTS "Venue managers can create gigs for their venues" ON gigs;
CREATE POLICY "Venue managers can create gigs for their venues"
  ON gigs FOR INSERT
  WITH CHECK (
    auth.uid() = posted_by
    OR (
      venue_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM venue_managers vm
        WHERE vm.venue_id = gigs.venue_id
        AND vm.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Venue managers can update gigs for their venues" ON gigs;
CREATE POLICY "Venue managers can update gigs for their venues"
  ON gigs FOR UPDATE
  USING (
    auth.uid() = posted_by
    OR (
      venue_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM venue_managers vm
        WHERE vm.venue_id = gigs.venue_id
        AND vm.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Venue managers can delete gigs for their venues" ON gigs;
CREATE POLICY "Venue managers can delete gigs for their venues"
  ON gigs FOR DELETE
  USING (
    auth.uid() = posted_by
    OR (
      venue_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM venue_managers vm
        WHERE vm.venue_id = gigs.venue_id
        AND vm.user_id = auth.uid()
      )
    )
  );

-- Update gigs SELECT policy to allow musicians with venue_gig_access to view gigs
DROP POLICY IF EXISTS "Users can view all gigs" ON gigs;
CREATE POLICY "Users can view all gigs"
  ON gigs FOR SELECT
  USING (
    true -- Keep existing behavior: all users can view all gigs
    -- Venue-specific access control will be handled at application level if needed
  );

-- Update gig_applications policies to allow musicians with venue_gig_access to apply
DROP POLICY IF EXISTS "Musicians with venue gig access can create applications" ON gig_applications;
CREATE POLICY "Musicians with venue gig access can create applications"
  ON gig_applications FOR INSERT
  WITH CHECK (
    auth.uid() = musician_id
    AND (
      -- Allow if gig is not venue-specific
      NOT EXISTS (
        SELECT 1 FROM gigs WHERE id = gig_applications.gig_id AND venue_id IS NOT NULL
      )
      -- Or if musician has access to this venue gig
      OR EXISTS (
        SELECT 1 FROM venue_gig_access vga
        JOIN gigs g ON g.id = gig_applications.gig_id
        WHERE vga.venue_id = g.venue_id
        AND vga.gig_id = gig_applications.gig_id
        AND vga.musician_id = auth.uid()
      )
    )
  );

-- Add trigger for updated_at on venues
DROP TRIGGER IF EXISTS update_venues_updated_at ON venues;
CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON venues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_venues_name ON venues(name);
CREATE INDEX IF NOT EXISTS idx_venue_managers_venue_id ON venue_managers(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_managers_user_id ON venue_managers(user_id);
CREATE INDEX IF NOT EXISTS idx_gigs_venue_id ON gigs(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_gig_access_venue_id ON venue_gig_access(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_gig_access_gig_id ON venue_gig_access(gig_id);
CREATE INDEX IF NOT EXISTS idx_venue_gig_access_musician_id ON venue_gig_access(musician_id);

-- Helper function to check if user is a venue manager
CREATE OR REPLACE FUNCTION is_venue_manager(venue_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM venue_managers
    WHERE venue_id = venue_uuid
    AND user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if musician has access to venue gig
CREATE OR REPLACE FUNCTION has_venue_gig_access(gig_uuid UUID, musician_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM venue_gig_access vga
    JOIN gigs g ON g.id = gig_uuid
    WHERE vga.venue_id = g.venue_id
    AND vga.gig_id = gig_uuid
    AND vga.musician_id = musician_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

