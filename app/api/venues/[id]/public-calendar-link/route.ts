import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import crypto from 'crypto'

// GET /api/venues/[id]/public-calendar-link - Get or generate public calendar hash
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin or venue manager
    const metadata = user.user_metadata
    const isAdmin = metadata?.role === 'admin'

    let isVenueManager = isAdmin
    if (!isAdmin) {
      const { data: manager } = await supabase
        .from('venue_managers')
        .select('id')
        .eq('venue_id', id)
        .eq('user_id', user.id)
        .maybeSingle()
      isVenueManager = !!manager
    }

    if (!isVenueManager) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get venue and check if hash exists
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('public_calendar_hash')
      .eq('id', id)
      .single()

    if (venueError) throw venueError

    let hash = venue.public_calendar_hash

    // Generate hash if it doesn't exist
    if (!hash) {
      // Generate a secure random hash
      hash = crypto.randomBytes(16).toString('hex')
      
      const { error: updateError } = await supabase
        .from('venues')
        .update({ public_calendar_hash: hash })
        .eq('id', id)

      if (updateError) throw updateError
    }

    // Get base URL from request
    const url = new URL(request.url)
    const baseUrl = `${url.protocol}//${url.host}`
    const publicLink = `${baseUrl}/public-calendar/${hash}`

    return NextResponse.json({ publicLink, hash })
  } catch (error: any) {
    console.error('Error getting public calendar link:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

