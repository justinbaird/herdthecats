import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET /api/invitations/[code] - Get invitation by code
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    let code: string
    try {
      const resolvedParams = await params
      code = resolvedParams.code
    } catch (paramError: any) {
      console.error('Error resolving params:', paramError)
      return NextResponse.json(
        { error: 'Invalid invitation code parameter' },
        { status: 400 }
      )
    }
    
    if (!code || typeof code !== 'string') {
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
    let invitation
    let queryError
    
    try {
      const result = await supabase
        .from('venue_invitations')
        .select('*')
        .eq('invitation_code', code.toUpperCase())
        .single()
      
      invitation = result.data
      queryError = result.error
    } catch (queryException: any) {
      console.error('Exception querying invitations:', queryException)
      return NextResponse.json(
        { error: 'Database query failed', details: queryException.message },
        { status: 500 }
      )
    }

    if (queryError) {
      console.error('Supabase query error:', queryError)
      // Check if it's a "not found" error
      if (queryError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Invitation not found' },
          { status: 404 }
        )
      }
      // Check if table doesn't exist
      if (queryError.message?.includes('does not exist') || queryError.message?.includes('relation') || queryError.code === '42P01') {
        return NextResponse.json(
          { error: 'Database table not found. Please run the migration to create the venue_invitations table.' },
          { status: 500 }
        )
      }
      return NextResponse.json(
        { error: queryError.message || 'Invitation not found' },
        { status: 404 }
      )
    }

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ invitation }, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error: any) {
    console.error('Error fetching invitation:', error)
    // Ensure we always return JSON, not HTML
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }
}

