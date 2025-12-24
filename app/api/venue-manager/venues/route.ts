import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// GET /api/venue-manager/venues - Get all venues for the current venue manager
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
    const { data: managerVenues, error } = await supabase
      .from('venue_managers')
      .select('venue_id')
      .eq('user_id', user.id)

    if (error) {
      console.error('Error fetching venue_managers:', error)
      throw error
    }

    if (!managerVenues || managerVenues.length === 0) {
      return NextResponse.json({ venues: [] })
    }

    // Get venue details
    const venueIds = managerVenues.map((mv) => mv.venue_id)
    const { data: venues, error: venuesError } = await supabase
      .from('venues')
      .select('*')
      .in('id', venueIds)
      .order('created_at', { ascending: false })

    if (venuesError) {
      console.error('Error fetching venues:', venuesError)
      throw venuesError
    }

    return NextResponse.json({ venues: venues || [] })
  } catch (error: any) {
    console.error('Error fetching venue manager venues:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

