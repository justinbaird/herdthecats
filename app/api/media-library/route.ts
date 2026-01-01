import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// GET /api/media-library - Get all media with gig details, searchable
export async function GET(request: Request) {
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
        { error: 'Only venue managers can access the media library' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''

    // Get all gigs for venues this manager manages
    const venueIds = managerVenues.map((mv) => mv.venue_id)
    const { data: gigs, error: gigsError } = await supabase
      .from('gigs')
      .select('id, title, entry_type')
      .in('venue_id', venueIds)

    if (gigsError) throw gigsError

    const gigIds = gigs?.map((g) => g.id) || []

    // Get all media for these gigs AND library-only media (gig_id IS NULL)
    let mediaQuery = supabase
      .from('gig_media')
      .select('*')
    
    if (gigIds.length > 0) {
      mediaQuery = mediaQuery.or(`gig_id.in.(${gigIds.join(',')}),gig_id.is.null`)
    } else {
      // Only library media if no gigs
      mediaQuery = mediaQuery.is('gig_id', null)
    }
    
    mediaQuery = mediaQuery.order('created_at', { ascending: false })

    const { data: media, error: mediaError } = await mediaQuery

    if (mediaError) throw mediaError

    // Apply search filter if provided
    let filteredMedia = media || []
    if (search) {
      filteredMedia = filteredMedia.filter((m) => {
        const descMatch = m.description?.toLowerCase().includes(search.toLowerCase())
        const nameMatch = m.file_name?.toLowerCase().includes(search.toLowerCase())
        return descMatch || nameMatch
      })
    }

    // Get all descriptions for these gigs
    let descriptions: any[] = []
    if (gigIds.length > 0) {
      let descriptionsQuery = supabase
        .from('gig_descriptions')
        .select('*')
        .in('gig_id', gigIds)
        .order('created_at', { ascending: false })

      if (search) {
        descriptionsQuery = descriptionsQuery.ilike('description', `%${search}%`)
      }

      const { data: descData, error: descError } = await descriptionsQuery

      if (descError) throw descError
      descriptions = descData || []
    }

    // Combine with gig details
    const mediaWithGigs = filteredMedia.map((m) => {
      if (!m.gig_id) {
        // Library-only media
        return {
          ...m,
          gig_title: 'Media Library',
          gig_entry_type: 'library',
        }
      }
      const gig = gigs?.find((g) => g.id === m.gig_id)
      return {
        ...m,
        gig_title: gig?.title || 'Unknown',
        gig_entry_type: gig?.entry_type || 'gig',
      }
    })

    const descriptionsWithGigs = (descriptions || []).map((d) => {
      const gig = gigs?.find((g) => g.id === d.gig_id)
      return {
        ...d,
        gig_title: gig?.title || 'Unknown',
        gig_entry_type: gig?.entry_type || 'gig',
      }
    })

    return NextResponse.json({
      media: mediaWithGigs,
      descriptions: descriptionsWithGigs,
    })
  } catch (error: any) {
    console.error('Error fetching media library:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}



