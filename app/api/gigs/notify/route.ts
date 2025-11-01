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

    const { gigId } = await request.json()

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

    // Get network members
    const { data: networkMembers, error: networkError } = await supabase
      .from('networks')
      .select('network_member_id')
      .eq('user_id', gig.posted_by)

    if (networkError) {
      return NextResponse.json(
        { error: networkError.message },
        { status: 400 }
      )
    }

    // Get musician profiles for network members
    let relevantMembers: any[] = []
    if (networkMembers && networkMembers.length > 0) {
      const memberUserIds = networkMembers.map((n) => n.network_member_id)
      const { data: musicians, error: musiciansError } = await supabase
        .from('musicians')
        .select('*')
        .in('user_id', memberUserIds)

      if (!musiciansError && musicians) {
        // For each network member, check if they play any required instruments
        relevantMembers = musicians.filter((musician) => {
          const memberInstruments = musician.instruments || []
          return gig.required_instruments.some((inst: string) =>
            memberInstruments.includes(inst)
          )
        })
      }
    }

    // Send notifications (email notifications would be set up via Supabase Edge Functions or webhooks)
    // For now, we'll just return success - actual email sending should be configured separately

    return NextResponse.json({
      success: true,
      notified: relevantMembers?.length || 0,
      message:
        'Gig notifications will be sent via email. Configure Supabase email templates or Edge Functions for actual email delivery.',
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

