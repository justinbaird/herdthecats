import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// GET /api/venues/[id]/gigs/[gigId]/access - List musicians with access to a venue gig
export async function GET(
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

    // Check if user is a venue manager or has access themselves
    const { data: manager } = await supabase
      .from('venue_managers')
      .select('*')
      .eq('venue_id', id)
      .eq('user_id', user.id)
      .single()

    const { data: access } = await supabase
      .from('venue_gig_access')
      .select('*')
      .eq('venue_id', id)
      .eq('gig_id', gigId)
      .eq('musician_id', user.id)
      .single()

    const metadata = user.user_metadata
    const isAdmin = metadata?.role === 'admin'

    if (!manager && !access && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: accesses, error } = await supabase
      .from('venue_gig_access')
      .select(`
        *,
        musicians:musician_id (
          id,
          name,
          email
        )
      `)
      .eq('venue_id', id)
      .eq('gig_id', gigId)

    if (error) throw error

    return NextResponse.json({ accesses })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/venues/[id]/gigs/[gigId]/access - Revoke musician access to a venue gig
export async function DELETE(
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

    const { searchParams } = new URL(request.url)
    const musicianId = searchParams.get('musicianId')

    if (!musicianId) {
      return NextResponse.json(
        { error: 'musicianId is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('venue_gig_access')
      .delete()
      .eq('venue_id', id)
      .eq('gig_id', gigId)
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

