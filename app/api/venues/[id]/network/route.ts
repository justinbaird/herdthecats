import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// GET /api/venues/[id]/network - List venue network members
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

    // Check if user is a venue manager or admin
    const { data: manager } = await supabase
      .from('venue_managers')
      .select('id')
      .eq('venue_id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    const metadata = user.user_metadata
    const isAdmin = metadata?.role === 'admin'

    if (!manager && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get venue network members
    const { data: networkMembers, error } = await supabase
      .from('venue_networks')
      .select('*')
      .eq('venue_id', id)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Get musician details for each network member
    let networkWithMusicians: any[] = []
    if (networkMembers && networkMembers.length > 0) {
      const musicianUserIds = networkMembers.map((m) => m.musician_id)
      const { data: musicians, error: musiciansError } = await supabase
        .from('musicians')
        .select('*')
        .in('user_id', musicianUserIds)

      if (musiciansError) throw musiciansError

      // Combine network and musician data
      networkWithMusicians = networkMembers.map((member) => ({
        ...member,
        musician: musicians?.find((m) => m.user_id === member.musician_id) || null,
      }))
    }

    return NextResponse.json({ network: networkWithMusicians })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/venues/[id]/network - Add a musician to venue network
export async function POST(
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

    // Check if user is a venue manager
    const { data: manager } = await supabase
      .from('venue_managers')
      .select('id')
      .eq('venue_id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    const metadata = user.user_metadata
    const isAdmin = metadata?.role === 'admin'

    if (!manager && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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

    // Add to venue network
    const { data: networkMember, error } = await supabase
      .from('venue_networks')
      .insert({
        venue_id: id,
        musician_id: musicianId,
        added_by: user.id,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Musician is already in venue network' },
          { status: 400 }
        )
      }
      throw error
    }

    return NextResponse.json({ networkMember }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/venues/[id]/network - Remove a musician from venue network
export async function DELETE(
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

    // Check if user is a venue manager
    const { data: manager } = await supabase
      .from('venue_managers')
      .select('id')
      .eq('venue_id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    const metadata = user.user_metadata
    const isAdmin = metadata?.role === 'admin'

    if (!manager && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const musicianId = searchParams.get('musicianId')

    if (!musicianId) {
      return NextResponse.json(
        { error: 'musicianId is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('venue_networks')
      .delete()
      .eq('venue_id', id)
      .eq('musician_id', musicianId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

