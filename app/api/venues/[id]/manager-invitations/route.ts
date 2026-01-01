import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// Helper to generate a unique invitation code
async function generateUniqueInvitationCode(supabase: any): Promise<string> {
  let code: string
  let isUnique = false
  do {
    const { data, error } = await supabase.rpc('generate_venue_manager_invitation_code')
    if (error) throw error
    code = data

    const { data: existing, error: checkError } = await supabase
      .from('venue_manager_invitations')
      .select('id')
      .eq('invitation_code', code)
      .maybeSingle()

    if (checkError) throw checkError
    isUnique = !existing
  } while (!isUnique)
  return code
}

// GET /api/venues/[id]/manager-invitations - List venue manager invitations
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

    const isAdmin = user.user_metadata?.role === 'admin'

    if (!manager && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: invitations, error } = await supabase
      .from('venue_manager_invitations')
      .select('*')
      .eq('venue_id', id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ invitations })
  } catch (error: any) {
    console.error('Error fetching venue manager invitations:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/venues/[id]/manager-invitations - Create a new venue manager invitation
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: venueId } = await params
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
      .eq('venue_id', venueId)
      .eq('user_id', user.id)
      .maybeSingle()

    const isAdmin = user.user_metadata?.role === 'admin'

    if (!manager && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { email, expires_at } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const invitation_code = await generateUniqueInvitationCode(supabase)

    const { data: invitation, error } = await supabase
      .from('venue_manager_invitations')
      .insert({
        venue_id: venueId,
        email,
        invitation_code,
        invited_by: user.id,
        expires_at: expires_at || null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ invitation }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating venue manager invitation:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}



