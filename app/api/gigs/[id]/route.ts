import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// DELETE /api/gigs/[id] - Delete a gig
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

    // Verify user owns this gig or is a venue manager/admin
    const { data: gig, error: gigError } = await supabase
      .from('gigs')
      .select('posted_by, venue_id')
      .eq('id', id)
      .single()

    if (gigError || !gig) {
      return NextResponse.json(
        { error: 'Gig not found' },
        { status: 404 }
      )
    }

    // Check if user is the owner
    const isOwner = gig.posted_by === user.id

    // Check if user is a venue manager (if gig has a venue)
    let isVenueManager = false
    if (gig.venue_id) {
      const { data: manager } = await supabase
        .from('venue_managers')
        .select('id')
        .eq('venue_id', gig.venue_id)
        .eq('user_id', user.id)
        .maybeSingle()
      isVenueManager = !!manager
    }

    // Check if user is admin
    const metadata = user.user_metadata
    const isAdmin = metadata?.role === 'admin'

    if (!isOwner && !isVenueManager && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete the gig (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from('gigs')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting gig:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

