-- Fix venue_contacts RLS policies to not query auth.users directly
-- The current policies try to query auth.users which causes permission denied errors
-- Use the is_admin() security definer function instead

-- Drop existing policies
DROP POLICY IF EXISTS "Venue managers can view their venue contacts" ON venue_contacts;
DROP POLICY IF EXISTS "Venue managers can create contacts" ON venue_contacts;
DROP POLICY IF EXISTS "Venue managers can update contacts" ON venue_contacts;
DROP POLICY IF EXISTS "Venue managers can delete contacts" ON venue_contacts;

-- Recreate policies using is_admin() function instead of direct auth.users query
CREATE POLICY "Venue managers can view their venue contacts"
  ON venue_contacts FOR SELECT
  USING (
    is_venue_manager_for(venue_id)
    OR is_admin()
  );

CREATE POLICY "Venue managers can create contacts"
  ON venue_contacts FOR INSERT
  WITH CHECK (
    is_venue_manager_for(venue_id)
    OR is_admin()
  );

CREATE POLICY "Venue managers can update contacts"
  ON venue_contacts FOR UPDATE
  USING (
    is_venue_manager_for(venue_id)
    OR is_admin()
  );

CREATE POLICY "Venue managers can delete contacts"
  ON venue_contacts FOR DELETE
  USING (
    is_venue_manager_for(venue_id)
    OR is_admin()
  );

