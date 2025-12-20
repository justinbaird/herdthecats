-- Fix infinite recursion in venue_managers RLS policies
-- Create a security definer function to check venue manager status without triggering RLS

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view venue managers for venues they manage or are managed by" ON venue_managers;
DROP POLICY IF EXISTS "Venue managers can add managers to their venues" ON venue_managers;
DROP POLICY IF EXISTS "Venue managers can remove managers from their venues" ON venue_managers;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS is_venue_manager_for(UUID);

-- Create a security definer function to check if user is a venue manager
-- SECURITY DEFINER runs with postgres privileges, bypassing RLS
CREATE OR REPLACE FUNCTION is_venue_manager_for(venue_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_manager BOOLEAN;
  is_admin BOOLEAN;
BEGIN
  -- Check if user is admin first (doesn't require venue_managers table)
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' = 'admin'
  ) INTO is_admin;
  
  IF is_admin THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is a venue manager (SECURITY DEFINER bypasses RLS)
  SELECT EXISTS (
    SELECT 1 FROM venue_managers
    WHERE venue_id = venue_uuid
    AND user_id = auth.uid()
  ) INTO is_manager;
  
  RETURN is_manager;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate policies using the security definer function
-- SELECT: Users can see managers if they are the manager themselves, or if they manage the venue, or if admin
CREATE POLICY "Users can view venue managers for venues they manage or are managed by"
  ON venue_managers FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_venue_manager_for(venue_id)
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- INSERT: Only venue managers or admins can add managers
CREATE POLICY "Venue managers can add managers to their venues"
  ON venue_managers FOR INSERT
  WITH CHECK (
    is_venue_manager_for(venue_id)
  );

-- DELETE: Only venue managers or admins can remove managers
CREATE POLICY "Venue managers can remove managers from their venues"
  ON venue_managers FOR DELETE
  USING (
    is_venue_manager_for(venue_id)
  );
