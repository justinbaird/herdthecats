import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// GET /api/venues/[id]/invitations - List venue invitations
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

    // Check if user is a venue manager or admin
    const { data: manager } = await supabase
      .from('venue_managers')
      .select('id')
      .eq('venue_id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    const metadata = user.user_metadata
    const isAdmin = metadata?.role === 'admin'

    if (!manager && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get venue invitations
    const { data: invitations, error } = await supabase
      .from('venue_invitations')
      .select('*')
      .eq('venue_id', id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ invitations: invitations || [] })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/venues/[id]/invitations - Create a new invitation
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

    // Check if user is a venue manager
    const { data: manager } = await supabase
      .from('venue_managers')
      .select('id')
      .eq('venue_id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    const metadata = user.user_metadata
    const isAdmin = metadata?.role === 'admin'

    if (!manager && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      musician_email,
      musician_first_name,
      musician_last_name,
      musician_phone,
      musician_instruments,
      expires_in_days,
    } = body

    // Generate unique invitation code
    let invitationCode: string
    let isUnique = false
    let attempts = 0
    const maxAttempts = 10

    while (!isUnique && attempts < maxAttempts) {
      // Generate 8-character code
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
      invitationCode = ''
      for (let i = 0; i < 8; i++) {
        invitationCode += chars.charAt(Math.floor(Math.random() * chars.length))
      }

      // Check if code exists
      const { data: existing } = await supabase
        .from('venue_invitations')
        .select('id')
        .eq('invitation_code', invitationCode)
        .single()

      if (!existing) {
        isUnique = true
      }
      attempts++
    }

    if (!isUnique) {
      return NextResponse.json(
        { error: 'Failed to generate unique invitation code' },
        { status: 500 }
      )
    }

    // Calculate expiration date (default 30 days)
    const expiresAt = expires_in_days
      ? new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    // Create invitation
    const { data: invitation, error } = await supabase
      .from('venue_invitations')
      .insert({
        venue_id: id,
        invitation_code: invitationCode,
        created_by: user.id,
        musician_email: musician_email || null,
        musician_first_name: musician_first_name || null,
        musician_last_name: musician_last_name || null,
        musician_phone: musician_phone || null,
        musician_instruments: musician_instruments || null,
        expires_at: expiresAt,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ invitation }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

