import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// GET /api/gigs/[id]/description - Get description for current user
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

    const { data: description, error } = await supabase
      .from('gig_descriptions')
      .select('*')
      .eq('gig_id', id)
      .eq('musician_id', user.id)
      .maybeSingle()

    if (error) throw error

    return NextResponse.json({ description })
  } catch (error: any) {
    console.error('Error fetching gig description:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/gigs/[id]/description - Create or update description
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

    const body = await request.json()
    const { description } = body

    if (!description || !description.trim()) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      )
    }

    // Verify user has access to this gig
    const { data: gig } = await supabase
      .from('gigs')
      .select('venue_id')
      .eq('id', id)
      .single()

    if (!gig) {
      return NextResponse.json(
        { error: 'Gig not found' },
        { status: 404 }
      )
    }

    // Check access
    if (gig.venue_id) {
      const { data: access } = await supabase
        .from('venue_gig_access')
        .select('id')
        .eq('gig_id', id)
        .eq('musician_id', user.id)
        .maybeSingle()

      const { data: manager } = await supabase
        .from('venue_managers')
        .select('id')
        .eq('venue_id', gig.venue_id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (!access && !manager) {
        return NextResponse.json(
          { error: 'You do not have access to this gig' },
          { status: 403 }
        )
      }
    }

    // Check if description exists
    const { data: existing } = await supabase
      .from('gig_descriptions')
      .select('id')
      .eq('gig_id', id)
      .eq('musician_id', user.id)
      .maybeSingle()

    let result
    if (existing) {
      // Update
      const { data: updated, error } = await supabase
        .from('gig_descriptions')
        .update({
          description: description.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      result = updated
    } else {
      // Create
      const { data: created, error } = await supabase
        .from('gig_descriptions')
        .insert({
          gig_id: id,
          musician_id: user.id,
          description: description.trim(),
        })
        .select()
        .single()

      if (error) throw error
      result = created
    }

    return NextResponse.json({ description: result }, { status: existing ? 200 : 201 })
  } catch (error: any) {
    console.error('Error saving gig description:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


