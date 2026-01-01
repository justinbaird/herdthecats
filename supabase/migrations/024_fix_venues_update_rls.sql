-- Fix venues UPDATE and DELETE policies to use is_admin() function instead of direct auth.users query
-- This prevents "permission denied for table users" errors

DROP POLICY IF EXISTS "Venue managers can update their venues" ON venues;
CREATE POLICY "Venue managers can update their venues"
  ON venues FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM venue_managers
      WHERE venue_id = venues.id
      AND user_id = auth.uid()
    )
    OR is_admin()
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
    OR is_admin()
  );

