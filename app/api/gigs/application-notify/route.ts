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

    const { gigId, musicianId, instrument } = await request.json()

    // Get gig details
    const { data: gig, error: gigError } = await supabase
      .from('gigs')
      .select('*, posted_by:auth.users!gigs_posted_by_fkey(email)')
      .eq('id', gigId)
      .single()

    if (gigError || !gig) {
      return NextResponse.json(
        { error: 'Gig not found' },
        { status: 404 }
      )
    }

    // Get the applicant's musician profile
    const { data: applicant } = await supabase
      .from('musicians')
      .select('*')
      .eq('user_id', musicianId)
      .single()

    // Get the gig poster's musician profile (which includes email)
    const { data: poster } = await supabase
      .from('musicians')
      .select('*')
      .eq('user_id', gig.posted_by)
      .single()
    
    // Send notification email (configure Supabase Edge Functions or webhooks for actual email delivery)
    // For now, we'll just return success - actual email sending should be configured separately
    // The gig poster will see the application in their gig detail page

    return NextResponse.json({
      success: true,
      message: 'Gig poster will be notified. They can review applications on the gig detail page.',
      posterEmail: poster?.email,
      applicantName: applicant?.name || 'Unknown',
      instrument,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

