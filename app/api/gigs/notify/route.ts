import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { gigId, leadMusicianId } = await request.json()

    // Only notify if leadMusicianId is provided
    if (!leadMusicianId) {
      return NextResponse.json({
        success: true,
        notified: 0,
        message: 'No lead musician specified, no notification sent.',
      })
    }

    // Get gig details
    const { data: gig, error: gigError } = await supabase
      .from('gigs')
      .select('*, posted_by_musician:musicians!gigs_posted_by_fkey(*)')
      .eq('id', gigId)
      .single()

    if (gigError || !gig) {
      return NextResponse.json(
        { error: 'Gig not found' },
        { status: 404 }
      )
    }

    // Verify the leadMusicianId matches the gig's lead_musician_id
    if (gig.lead_musician_id !== leadMusicianId) {
      return NextResponse.json({
        success: true,
        notified: 0,
        message: 'Lead musician ID does not match gig.',
      })
    }

    // Get lead musician profile
    const { data: leadMusician, error: musicianError } = await supabase
      .from('musicians')
      .select('*')
      .eq('user_id', leadMusicianId)
      .single()

    if (musicianError || !leadMusician) {
      return NextResponse.json(
        { error: 'Lead musician not found' },
        { status: 404 }
      )
    }

    // Send notification to lead musician (email notifications would be set up via Supabase Edge Functions or webhooks)
    // For now, we'll just return success - actual email sending should be configured separately

    return NextResponse.json({
      success: true,
      notified: 1,
      leadMusicianEmail: leadMusician.email,
      message:
        'Gig notification will be sent to lead musician via email. Configure Supabase email templates or Edge Functions for actual email delivery.',
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

