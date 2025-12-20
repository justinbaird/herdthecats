import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// POST /api/venues/[id]/gigs/[gigId]/invite - Invite a musician to view a venue gig
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; gigId: string }> }
) {
  try {
    const { id, gigId } = await params
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is a venue manager
    const { data: manager, error: managerError } = await supabase
      .from('venue_managers')
      .select('*')
      .eq('venue_id', id)
      .eq('user_id', user.id)
      .single()

    if (managerError || !manager) {
      // Check if user is admin
      const metadata = user.user_metadata
      if (metadata?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Verify gig belongs to venue
    const { data: gig, error: gigError } = await supabase
      .from('gigs')
      .select('*')
      .eq('id', gigId)
      .eq('venue_id', id)
      .single()

    if (gigError || !gig) {
      return NextResponse.json(
        { error: 'Gig not found or does not belong to this venue' },
        { status: 404 }
      )
    }

    const { musicianId } = await request.json()

    if (!musicianId) {
      return NextResponse.json(
        { error: 'musicianId is required' },
        { status: 400 }
      )
    }

    // Check if musician exists
    const { data: musician, error: musicianError } = await supabase
      .from('musicians')
      .select('*')
      .eq('user_id', musicianId)
      .single()

    if (musicianError || !musician) {
      return NextResponse.json(
        { error: 'Musician not found' },
        { status: 404 }
      )
    }

    // Grant access
    const { data: access, error } = await supabase
      .from('venue_gig_access')
      .insert({
        venue_id: id,
        gig_id: gigId,
        musician_id: musicianId,
        invited_by: user.id,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Musician already has access to this gig' },
          { status: 400 }
        )
      }
      throw error
    }

    return NextResponse.json({ access }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

