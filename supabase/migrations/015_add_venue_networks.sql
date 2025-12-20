-- Venue Networks table (separate from musician networks)
-- Venue managers can build a network of musicians for their venue
CREATE TABLE IF NOT EXISTS venue_networks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  musician_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(venue_id, musician_id)
);

-- RLS Policies for venue_networks
ALTER TABLE venue_networks ENABLE ROW LEVEL SECURITY;

-- Anyone can view venue networks (for checking if someone is in a venue network)
CREATE POLICY "Anyone can view venue networks"
  ON venue_networks FOR SELECT
  USING (true);

-- Only venue managers can add musicians to venue network
-- Use the security definer function to avoid RLS recursion
CREATE POLICY "Venue managers can add to venue network"
  ON venue_networks FOR INSERT
  WITH CHECK (
    is_venue_manager_for(venue_networks.venue_id)
  );

-- Only venue managers can remove musicians from venue network
-- Use the security definer function to avoid RLS recursion
CREATE POLICY "Venue managers can remove from venue network"
  ON venue_networks FOR DELETE
  USING (
    is_venue_manager_for(venue_networks.venue_id)
  );

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_venue_networks_venue_id ON venue_networks(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_networks_musician_id ON venue_networks(musician_id);

