import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// GET /api/gigs/[id]/media - Get all media for a gig
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

    const { data: media, error } = await supabase
      .from('gig_media')
      .select('*')
      .eq('gig_id', id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ media })
  } catch (error: any) {
    console.error('Error fetching gig media:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/gigs/[id]/media - Upload media for a gig
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
    const { file_url, file_name, file_size, media_type, description } = body

    if (!file_url || !media_type) {
      return NextResponse.json(
        { error: 'file_url and media_type are required' },
        { status: 400 }
      )
    }

    // Verify user has access to this gig (via venue_gig_access or is venue manager)
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

    const { data: media, error } = await supabase
      .from('gig_media')
      .insert({
        gig_id: id,
        uploaded_by: user.id,
        file_url,
        file_name: file_name || null,
        file_size: file_size || null,
        media_type,
        description: description || null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ media }, { status: 201 })
  } catch (error: any) {
    console.error('Error uploading gig media:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}



