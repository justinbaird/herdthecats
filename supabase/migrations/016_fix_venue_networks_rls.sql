-- Fix venue_networks RLS policies to use security definer function
-- This avoids permission issues with auth.users table

-- Drop existing policies
DROP POLICY IF EXISTS "Venue managers can add to venue network" ON venue_networks;
DROP POLICY IF EXISTS "Venue managers can remove from venue network" ON venue_networks;

-- Recreate policies using the security definer function
CREATE POLICY "Venue managers can add to venue network"
  ON venue_networks FOR INSERT
  WITH CHECK (
    is_venue_manager_for(venue_networks.venue_id)
  );

CREATE POLICY "Venue managers can remove from venue network"
  ON venue_networks FOR DELETE
  USING (
    is_venue_manager_for(venue_networks.venue_id)
  );


