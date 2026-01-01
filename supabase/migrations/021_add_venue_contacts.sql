-- Venue Contacts table
-- Allows venue managers to store contact information for musicians who haven't signed up yet
CREATE TABLE IF NOT EXISTS venue_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT, -- WhatsApp number
  country_code TEXT, -- Country calling code for phone
  instruments TEXT[], -- Array of instruments
  notes TEXT, -- Optional notes about the contact
  added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Ensure at least email or phone is provided
  CONSTRAINT venue_contacts_email_or_phone CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_venue_contacts_venue_id ON venue_contacts(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_contacts_email ON venue_contacts(email);
CREATE INDEX IF NOT EXISTS idx_venue_contacts_phone ON venue_contacts(phone);

-- RLS Policies
ALTER TABLE venue_contacts ENABLE ROW LEVEL SECURITY;

-- Venue managers can view contacts for their venues
CREATE POLICY "Venue managers can view their venue contacts"
  ON venue_contacts FOR SELECT
  USING (
    is_venue_manager_for(venue_id)
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Venue managers can create contacts for their venues
CREATE POLICY "Venue managers can create contacts"
  ON venue_contacts FOR INSERT
  WITH CHECK (
    is_venue_manager_for(venue_id)
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Venue managers can update contacts for their venues
CREATE POLICY "Venue managers can update contacts"
  ON venue_contacts FOR UPDATE
  USING (
    is_venue_manager_for(venue_id)
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Venue managers can delete contacts for their venues
CREATE POLICY "Venue managers can delete contacts"
  ON venue_contacts FOR DELETE
  USING (
    is_venue_manager_for(venue_id)
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );



