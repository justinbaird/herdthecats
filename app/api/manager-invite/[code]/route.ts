import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// GET /api/manager-invite/[code] - Get venue manager invitation by code
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    
    if (!code) {
      return NextResponse.json(
        { error: 'Invitation code is required' },
        { status: 400 }
      )
    }

    const supabase = await createServerClient()

    // Get invitation by code
    const { data: invitation, error } = await supabase
      .from('venue_manager_invitations')
      .select('*, venue:venues(*)')
      .eq('invitation_code', code.toUpperCase())
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Invitation not found' },
          { status: 404 }
        )
      }
      console.error('Supabase error fetching invitation:', error)
      return NextResponse.json(
        { error: error.message || 'Invitation not found' },
        { status: 404 }
      )
    }

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ invitation })
  } catch (error: any) {
    console.error('Error fetching invitation:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


