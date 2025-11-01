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

