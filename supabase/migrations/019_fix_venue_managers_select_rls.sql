-- Fix venue_managers SELECT policy to not query auth.users directly
-- The current policy tries to query auth.users which causes permission denied errors

-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can view venue managers for venues they manage or are managed by" ON venue_managers;

-- Create a new SELECT policy that only checks user_id (users can see their own manager records)
-- This avoids querying auth.users directly
CREATE POLICY "Users can view venue managers for venues they manage or are managed by"
  ON venue_managers FOR SELECT
  USING (
    -- Users can always see their own manager records
    user_id = auth.uid()
    -- Or use the security definer function to check if they manage the venue
    OR is_venue_manager_for(venue_id)
  );



