import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// POST /api/media-library/upload - Upload media to library (without gig_id)
export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is a venue manager
    const { data: managerVenues } = await supabase
      .from('venue_managers')
      .select('venue_id')
      .eq('user_id', user.id)

    if (!managerVenues || managerVenues.length === 0) {
      return NextResponse.json(
        { error: 'Only venue managers can upload to the media library' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { file_url, file_name, file_size, media_type, description } = body

    if (!file_url || !media_type) {
      return NextResponse.json(
        { error: 'file_url and media_type are required' },
        { status: 400 }
      )
    }

    // Insert media with gig_id = NULL (library-only media)
    const { data: media, error } = await supabase
      .from('gig_media')
      .insert({
        gig_id: null, // Library-only media
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
    console.error('Error uploading library media:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

