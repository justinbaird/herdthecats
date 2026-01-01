-- Allow gig_media to exist without a gig_id (for library-only media)
-- This allows media to be uploaded to the library without being tied to a specific gig

-- Make gig_id nullable
ALTER TABLE gig_media
ALTER COLUMN gig_id DROP NOT NULL;

-- Update the foreign key constraint to allow NULL
-- First drop the existing constraint
ALTER TABLE gig_media
DROP CONSTRAINT IF EXISTS gig_media_gig_id_fkey;

-- Recreate with ON DELETE SET NULL instead of CASCADE for library media
ALTER TABLE gig_media
ADD CONSTRAINT gig_media_gig_id_fkey
FOREIGN KEY (gig_id) REFERENCES gigs(id) ON DELETE SET NULL;

-- Update RLS policy to allow venue managers to upload library media (gig_id IS NULL)
DROP POLICY IF EXISTS "Musicians can upload media to gigs they have access to" ON gig_media;
CREATE POLICY "Musicians can upload media to gigs they have access to"
  ON gig_media FOR INSERT
  WITH CHECK (
    -- Allow library-only media (gig_id IS NULL) for venue managers
    (
      gig_id IS NULL
      AND EXISTS (
        SELECT 1 FROM venue_managers vm
        WHERE vm.user_id = auth.uid()
      )
    )
    OR (
      gig_id IS NOT NULL
      AND (
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
      )
    )
  );

-- Update SELECT policy to allow viewing library media for venue managers
DROP POLICY IF EXISTS "Anyone can view gig media" ON gig_media;
CREATE POLICY "Anyone can view gig media"
  ON gig_media FOR SELECT
  USING (
    -- Library media (gig_id IS NULL) visible to venue managers
    (
      gig_id IS NULL
      AND EXISTS (
        SELECT 1 FROM venue_managers vm
        WHERE vm.user_id = auth.uid()
      )
    )
    OR gig_id IS NOT NULL
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

