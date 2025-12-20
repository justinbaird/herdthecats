export type Instrument = 
  | 'Drums'
  | 'Bass Guitar'
  | 'Double Bass'
  | 'Piano'
  | 'Electric Piano'
  | 'Electric Guitar'
  | 'Acoustic Guitar'
  | 'Baritone Sax'
  | 'Tenor Sax'
  | 'Alto Sax'
  | 'Soprano Sax'
  | 'Harmonica'
  | 'Flute'
  | 'Trumpet'
  | 'Trombone'
  | 'Vocals'

export const INSTRUMENTS: Instrument[] = [
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
  'Vocals',
]

export interface Musician {
  id: string
  user_id: string
  name: string
  email: string
  instruments: Instrument[]
  created_at: string
  updated_at: string
}

export interface Network {
  id: string
  user_id: string
  network_member_id: string
  created_at: string
}

export interface Gig {
  id: string
  posted_by: string
  title: string
  description?: string
  location: string
  datetime: string
  required_instruments: Instrument[]
  status: 'open' | 'filled' | 'cancelled'
  venue_id?: string | null
  created_at: string
  updated_at: string
}

export interface GigApplication {
  id: string
  gig_id: string
  musician_id: string
  instrument: Instrument
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
}

export interface Venue {
  id: string
  name: string
  address: string
  city?: string | null
  state?: string | null
  zip_code?: string | null
  country?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  created_at: string
  updated_at: string
}

export interface VenueManager {
  id: string
  venue_id: string
  user_id: string
  created_at: string
}

export interface VenueGigAccess {
  id: string
  venue_id: string
  gig_id: string
  musician_id: string
  invited_by: string
  created_at: string
}

export interface VenueNetwork {
  id: string
  venue_id: string
  musician_id: string
  added_by: string
  created_at: string
  musician?: Musician
}

export interface VenueInvitation {
  id: string
  venue_id: string
  invitation_code: string
  created_by: string
  musician_email?: string | null
  musician_first_name?: string | null
  musician_last_name?: string | null
  musician_phone?: string | null
  musician_instruments?: Instrument[] | null
  status: 'pending' | 'accepted' | 'expired'
  accepted_by?: string | null
  accepted_at?: string | null
  expires_at?: string | null
  created_at: string
  updated_at: string
}

