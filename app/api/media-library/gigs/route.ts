import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// GET /api/media-library/gigs - Get all gigs for venues the user manages
export async function GET() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all venues where user is a manager
    const { data: managerVenues } = await supabase
      .from('venue_managers')
      .select('venue_id')
      .eq('user_id', user.id)

    if (!managerVenues || managerVenues.length === 0) {
      return NextResponse.json({ gigs: [] })
    }

    const venueIds = managerVenues.map((mv) => mv.venue_id)
    
    // Get all gigs for these venues
    const { data: gigs, error } = await supabase
      .from('gigs')
      .select('id, title, datetime, entry_type')
      .in('venue_id', venueIds)
      .order('datetime', { ascending: false })

    if (error) throw error

    return NextResponse.json({ gigs: gigs || [] })
  } catch (error: any) {
    console.error('Error fetching venue gigs:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

