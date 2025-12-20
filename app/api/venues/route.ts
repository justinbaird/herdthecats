import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// GET /api/venues - List all venues
export async function GET() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: venues, error } = await supabase
      .from('venues')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error

    return NextResponse.json({ venues })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/venues - Create a new venue
export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, address, city, state, zip_code, country, phone, email, website } = body

    if (!name || !address) {
      return NextResponse.json(
        { error: 'Name and address are required' },
        { status: 400 }
      )
    }

    // Create venue
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .insert({
        name,
        address,
        city: city || null,
        state: state || null,
        zip_code: zip_code || null,
        country: country || 'SG',
        phone: phone || null,
        email: email || null,
        website: website || null,
      })
      .select()
      .single()

    if (venueError) throw venueError

    // Automatically add creator as venue manager
    const { error: managerError } = await supabase
      .from('venue_managers')
      .insert({
        venue_id: venue.id,
        user_id: user.id,
      })

    if (managerError) {
      // If adding manager fails, delete the venue
      await supabase.from('venues').delete().eq('id', venue.id)
      throw managerError
    }

    return NextResponse.json({ venue }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

