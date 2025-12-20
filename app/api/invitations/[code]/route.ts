import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// GET /api/invitations/[code] - Get invitation by code
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

    let supabase
    try {
      supabase = await createServerClient()
    } catch (supabaseError: any) {
      console.error('Error creating Supabase client:', supabaseError)
      return NextResponse.json(
        { error: 'Failed to connect to database' },
        { status: 500 }
      )
    }

    // Get invitation by code
    const { data: invitation, error } = await supabase
      .from('venue_invitations')
      .select('*')
      .eq('invitation_code', code.toUpperCase())
      .single()

    if (error) {
      console.error('Supabase query error:', error)
      // Check if it's a "not found" error
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Invitation not found' },
          { status: 404 }
        )
      }
      // Check if table doesn't exist
      if (error.message?.includes('does not exist') || error.message?.includes('relation') || error.code === '42P01') {
        return NextResponse.json(
          { error: 'Database table not found. Please run the migration to create the venue_invitations table.' },
          { status: 500 }
        )
      }
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
    // Ensure we always return JSON, not HTML
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

