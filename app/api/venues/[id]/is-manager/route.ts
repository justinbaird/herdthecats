import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// GET /api/venues/[id]/is-manager - Check if current user is a venue manager
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

    // Check if user is admin
    const metadata = user.user_metadata
    const isAdmin = metadata?.role === 'admin'

    if (isAdmin) {
      return NextResponse.json({ isManager: true })
    }

    // Check if user is a venue manager
    // Use maybeSingle() to avoid errors when no record exists
    const { data: manager } = await supabase
      .from('venue_managers')
      .select('id')
      .eq('venue_id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    return NextResponse.json({ isManager: !!manager })
  } catch (error: any) {
    console.error('Error checking manager status:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error', isManager: false },
      { status: 500 }
    )
  }
}

