-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for instruments (ensures consistency)
DO $$ BEGIN
  CREATE TYPE instrument_type AS ENUM (
    'Drums',
    'Bass Guitar',
    'Double Bass',
    'Piano',
    'Electric Piano',
    'Electric Guitar',
    'Acoustic Guitar',
    'Baritone Sax',
    'Tenor Sax',
    'Alto Sax',
    'Soprano Sax',
    'Harmonica',
    'Flute',
    'Trumpet',
    'Trombone',
    'Vocals'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum for gig status
DO $$ BEGIN
  CREATE TYPE gig_status AS ENUM ('open', 'filled', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum for application status
DO $$ BEGIN
  CREATE TYPE application_status AS ENUM ('pending', 'accepted', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Musicians table (extends auth.users)
CREATE TABLE IF NOT EXISTS musicians (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  instruments instrument_type[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Network table (many-to-many relationship for musician networks)
CREATE TABLE IF NOT EXISTS networks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  network_member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, network_member_id),
  CHECK (user_id != network_member_id)
);

-- Gigs table
CREATE TABLE IF NOT EXISTS gigs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  posted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  datetime TIMESTAMPTZ NOT NULL,
  required_instruments instrument_type[] NOT NULL DEFAULT '{}',
  status gig_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Gig applications table
CREATE TABLE IF NOT EXISTS gig_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  musician_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instrument instrument_type NOT NULL,
  status application_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(gig_id, musician_id, instrument)
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_musicians_updated_at ON musicians;
CREATE TRIGGER update_musicians_updated_at BEFORE UPDATE ON musicians
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_gigs_updated_at ON gigs;
CREATE TRIGGER update_gigs_updated_at BEFORE UPDATE ON gigs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies

-- Enable RLS on all tables
ALTER TABLE musicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE gigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gig_applications ENABLE ROW LEVEL SECURITY;

-- Musicians policies
DROP POLICY IF EXISTS "Users can view all musicians" ON musicians;
CREATE POLICY "Users can view all musicians"
  ON musicians FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own musician profile" ON musicians;
CREATE POLICY "Users can insert their own musician profile"
  ON musicians FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own musician profile" ON musicians;
CREATE POLICY "Users can update their own musician profile"
  ON musicians FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own musician profile" ON musicians;
CREATE POLICY "Users can delete their own musician profile"
  ON musicians FOR DELETE
  USING (auth.uid() = user_id);

-- Networks policies
DROP POLICY IF EXISTS "Users can view their own network" ON networks;
CREATE POLICY "Users can view their own network"
  ON networks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add to their network" ON networks;
CREATE POLICY "Users can add to their network"
  ON networks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove from their network" ON networks;
CREATE POLICY "Users can remove from their network"
  ON networks FOR DELETE
  USING (auth.uid() = user_id);

-- Gigs policies
DROP POLICY IF EXISTS "Users can view all gigs" ON gigs;
CREATE POLICY "Users can view all gigs"
  ON gigs FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can create gigs" ON gigs;
CREATE POLICY "Users can create gigs"
  ON gigs FOR INSERT
  WITH CHECK (auth.uid() = posted_by);

DROP POLICY IF EXISTS "Users can update their own gigs" ON gigs;
CREATE POLICY "Users can update their own gigs"
  ON gigs FOR UPDATE
  USING (auth.uid() = posted_by);

DROP POLICY IF EXISTS "Users can delete their own gigs" ON gigs;
CREATE POLICY "Users can delete their own gigs"
  ON gigs FOR DELETE
  USING (auth.uid() = posted_by);

-- Gig applications policies
DROP POLICY IF EXISTS "Users can view applications for gigs they posted or applied to" ON gig_applications;
CREATE POLICY "Users can view applications for gigs they posted or applied to"
  ON gig_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gigs WHERE gigs.id = gig_applications.gig_id 
      AND gigs.posted_by = auth.uid()
    )
    OR musician_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can create applications" ON gig_applications;
CREATE POLICY "Users can create applications"
  ON gig_applications FOR INSERT
  WITH CHECK (auth.uid() = musician_id);

DROP POLICY IF EXISTS "Gig posters can update applications for their gigs" ON gig_applications;
CREATE POLICY "Gig posters can update applications for their gigs"
  ON gig_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM gigs WHERE gigs.id = gig_applications.gig_id 
      AND gigs.posted_by = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_musicians_user_id ON musicians(user_id);
CREATE INDEX IF NOT EXISTS idx_networks_user_id ON networks(user_id);
CREATE INDEX IF NOT EXISTS idx_networks_member_id ON networks(network_member_id);
CREATE INDEX IF NOT EXISTS idx_gigs_posted_by ON gigs(posted_by);
CREATE INDEX IF NOT EXISTS idx_gigs_status ON gigs(status);
CREATE INDEX IF NOT EXISTS idx_gigs_datetime ON gigs(datetime);
CREATE INDEX IF NOT EXISTS idx_gig_applications_gig_id ON gig_applications(gig_id);
CREATE INDEX IF NOT EXISTS idx_gig_applications_musician_id ON gig_applications(musician_id);

-- Function to automatically create musician profile on user signup
CREATE OR REPLACE FUNCTION create_musician_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO musicians (user_id, name, email)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.email, '')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error creating musician profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create musician profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_musician_profile();

