-- Admin role check function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin can view all networks
DROP POLICY IF EXISTS "Admins can view all networks" ON networks;
CREATE POLICY "Admins can view all networks"
  ON networks FOR SELECT
  USING (is_admin());

-- Admin can delete any network
DROP POLICY IF EXISTS "Admins can delete any network" ON networks;
CREATE POLICY "Admins can delete any network"
  ON networks FOR DELETE
  USING (is_admin());

-- Admin can view all gig applications
DROP POLICY IF EXISTS "Admins can view all applications" ON gig_applications;
CREATE POLICY "Admins can view all applications"
  ON gig_applications FOR SELECT
  USING (is_admin());

-- Admin can update any musician profile
DROP POLICY IF EXISTS "Admins can update any musician profile" ON musicians;
CREATE POLICY "Admins can update any musician profile"
  ON musicians FOR UPDATE
  USING (is_admin());

-- Admin can delete any musician profile
DROP POLICY IF EXISTS "Admins can delete any musician profile" ON musicians;
CREATE POLICY "Admins can delete any musician profile"
  ON musicians FOR DELETE
  USING (is_admin());

-- Admin can update any gig
DROP POLICY IF EXISTS "Admins can update any gig" ON gigs;
CREATE POLICY "Admins can update any gig"
  ON gigs FOR UPDATE
  USING (is_admin());

-- Admin can delete any gig
DROP POLICY IF EXISTS "Admins can delete any gig" ON gigs;
CREATE POLICY "Admins can delete any gig"
  ON gigs FOR DELETE
  USING (is_admin());

-- Admin can update any gig application
DROP POLICY IF EXISTS "Admins can update any application" ON gig_applications;
CREATE POLICY "Admins can update any application"
  ON gig_applications FOR UPDATE
  USING (is_admin());

