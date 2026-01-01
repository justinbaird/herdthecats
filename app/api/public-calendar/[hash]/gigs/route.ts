import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// GET /api/public-calendar/[hash]/gigs - Get gigs for public calendar (read-only, limited details)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ hash: string }> }
) {
  try {
    const { hash } = await params
    const supabase = await createServerClient()

    // Find venue by hash
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('id')
      .eq('public_calendar_hash', hash)
      .single()

    if (venueError || !venue) {
      return NextResponse.json(
        { error: 'Invalid calendar link' },
        { status: 404 }
      )
    }

    // Get gigs for this venue - public access, no auth required
    // Only return limited fields: id, title, location, datetime (start_time or datetime)
    const { data: gigs, error } = await supabase
      .from('gigs')
      .select('id, title, location, datetime, start_time')
      .eq('venue_id', venue.id)
      .order('datetime', { ascending: true })

    if (error) throw error

    // Use start_time if available, otherwise fall back to datetime
    const formattedGigs = (gigs || []).map((gig) => ({
      id: gig.id,
      title: gig.title,
      location: gig.location,
      datetime: gig.start_time || gig.datetime,
    }))

    return NextResponse.json({ gigs: formattedGigs })
  } catch (error: any) {
    console.error('Error fetching public calendar gigs:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

