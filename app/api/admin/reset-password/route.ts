import { createClient } from '@supabase/supabase-js'
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

    // Check if user is admin
    const metadata = user.user_metadata
    if (metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { userId } = await request.json()

    // Use Supabase Admin API to reset password
    // Note: This requires SUPABASE_SERVICE_ROLE_KEY
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Get user email
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)
    
    if (userError || !userData?.user?.email) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Generate password reset link
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: userData.user.email,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

