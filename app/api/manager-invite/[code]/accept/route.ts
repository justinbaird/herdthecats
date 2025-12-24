import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// POST /api/manager-invite/[code]/accept - Accept a venue manager invitation
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

    // 1. Validate invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('venue_manager_invitations')
      .select('*')
      .eq('invitation_code', code.toUpperCase())
      .single()

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Check if email matches
    if (invitation.email.toLowerCase() !== user.email?.toLowerCase()) {
      return NextResponse.json(
        { error: 'This invitation is for a different email address' },
        { status: 400 }
      )
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: `Invitation is ${invitation.status}` },
        { status: 400 }
      )
    }

    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      )
    }

    // 2. Add user as venue manager
    const { error: managerError } = await supabase
      .from('venue_managers')
      .insert({
        venue_id: invitation.venue_id,
        user_id: user.id,
      })
      .select()
      .single()

    if (managerError && managerError.code !== '23505') {
      // Ignore unique constraint error if already a manager
      throw managerError
    }

    // 3. Update invitation status
    const { error: updateInviteError } = await supabase
      .from('venue_manager_invitations')
      .update({
        status: 'accepted',
        accepted_by: user.id,
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitation.id)

    if (updateInviteError) throw updateInviteError

    return NextResponse.json({ success: true, venueId: invitation.venue_id })
  } catch (error: any) {
    console.error('Error accepting invitation:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


