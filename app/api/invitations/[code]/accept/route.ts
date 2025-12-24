import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// POST /api/invitations/[code]/accept - Accept an invitation
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('venue_invitations')
      .select('*')
      .eq('invitation_code', code)
      .single()

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Check if expired
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 400 }
      )
    }

    // Check if already accepted
    if (invitation.status === 'accepted') {
      return NextResponse.json(
        { error: 'This invitation has already been accepted' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { firstName, lastName, email, phone, instruments } = body

    // Update invitation status
    const { error: updateError } = await supabase
      .from('venue_invitations')
      .update({
        status: 'accepted',
        accepted_by: user.id,
        accepted_at: new Date().toISOString(),
        musician_first_name: firstName || invitation.musician_first_name,
        musician_last_name: lastName || invitation.musician_last_name,
        musician_email: email || invitation.musician_email,
        musician_phone: phone || invitation.musician_phone,
        musician_instruments: instruments || invitation.musician_instruments,
      })
      .eq('id', invitation.id)

    if (updateError) throw updateError

    // Add musician to venue network
    const { error: networkError } = await supabase
      .from('venue_networks')
      .insert({
        venue_id: invitation.venue_id,
        musician_id: user.id,
        added_by: invitation.created_by,
      })

    if (networkError) {
      // If network insert fails, rollback invitation status
      await supabase
        .from('venue_invitations')
        .update({
          status: 'pending',
          accepted_by: null,
          accepted_at: null,
        })
        .eq('id', invitation.id)

      throw networkError
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


