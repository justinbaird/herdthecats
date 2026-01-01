import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// GET /api/venue-manager-profile - Get current user's venue manager profile
export async function GET() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error } = await supabase
      .from('venue_manager_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) throw error

    return NextResponse.json({ profile })
  } catch (error: any) {
    console.error('Error fetching venue manager profile:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/venue-manager-profile - Create or update venue manager profile
export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { first_name, last_name, phone } = body

    if (!first_name || !last_name) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      )
    }

    // Get user's email from auth
    const email = user.email || ''

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('venue_manager_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    let profile
    if (existingProfile) {
      // Update existing profile
      const { data: updatedProfile, error } = await supabase
        .from('venue_manager_profiles')
        .update({
          first_name,
          last_name,
          phone: phone || null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      profile = updatedProfile
    } else {
      // Create new profile
      const { data: newProfile, error } = await supabase
        .from('venue_manager_profiles')
        .insert({
          user_id: user.id,
          first_name,
          last_name,
          phone: phone || null,
          email,
        })
        .select()
        .single()

      if (error) throw error
      profile = newProfile
    }

    return NextResponse.json({ profile }, { status: existingProfile ? 200 : 201 })
  } catch (error: any) {
    console.error('Error saving venue manager profile:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}



