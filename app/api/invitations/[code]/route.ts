import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Helper to ensure JSON response
function jsonResponse(data: any, status: number = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}

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
      return jsonResponse(
        { error: 'Invalid invitation code parameter' },
        400
      )
    }
    
    if (!code || typeof code !== 'string') {
      return jsonResponse(
        { error: 'Invitation code is required' },
        400
      )
    }

    let supabase
    try {
      supabase = await createServerClient()
    } catch (supabaseError: any) {
      console.error('Error creating Supabase client:', supabaseError)
      // Return detailed error in development, generic in production
      const errorMessage = process.env.NODE_ENV === 'development' 
        ? `Failed to connect to database: ${supabaseError.message}`
        : 'Failed to connect to database'
      return jsonResponse(
        { error: errorMessage },
        500
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
      return jsonResponse(
        { error: 'Database query failed', details: queryException.message },
        500
      )
    }

    if (queryError) {
      console.error('Supabase query error:', queryError)
      // Check if it's a "not found" error
      if (queryError.code === 'PGRST116') {
        return jsonResponse(
          { error: 'Invitation not found' },
          404
        )
      }
      // Check if table doesn't exist
      if (queryError.message?.includes('does not exist') || queryError.message?.includes('relation') || queryError.code === '42P01') {
        return jsonResponse(
          { error: 'Database table not found. Please run the migration to create the venue_invitations table.' },
          500
        )
      }
      return jsonResponse(
        { error: queryError.message || 'Invitation not found' },
        404
      )
    }

    if (!invitation) {
      return jsonResponse(
        { error: 'Invitation not found' },
        404
      )
    }

    return jsonResponse({ invitation })
  } catch (error: any) {
    console.error('Error fetching invitation:', error)
    // Ensure we always return JSON, not HTML
    return jsonResponse(
      { error: error?.message || 'Internal server error' },
      500
    )
  }
}

