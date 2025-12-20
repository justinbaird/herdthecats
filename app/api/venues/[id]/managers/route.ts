import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// GET /api/venues/[id]/managers - List venue managers
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
      .select('*')
      .eq('venue_id', id)
      .eq('user_id', user.id)
      .single()

    const metadata = user.user_metadata
    const isAdmin = metadata?.role === 'admin'

    if (!manager && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: managers, error } = await supabase
      .from('venue_managers')
      .select(`
        *,
        musicians:user_id (
          id,
          name,
          email
        )
      `)
      .eq('venue_id', id)

    if (error) throw error

    return NextResponse.json({ managers })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/venues/[id]/managers - Add a venue manager
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
    const { data: manager, error: managerError } = await supabase
      .from('venue_managers')
      .select('*')
      .eq('venue_id', id)
      .eq('user_id', user.id)
      .single()

    if (managerError || !manager) {
      // Check if user is admin
      const metadata = user.user_metadata
      if (metadata?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Check if user exists
    const { data: musician, error: musicianError } = await supabase
      .from('musicians')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (musicianError || !musician) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const { data: newManager, error } = await supabase
      .from('venue_managers')
      .insert({
        venue_id: id,
        user_id: userId,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'User is already a venue manager' },
          { status: 400 }
        )
      }
      throw error
    }

    return NextResponse.json({ manager: newManager }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/venues/[id]/managers - Remove a venue manager
export async function DELETE(
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
    const { data: manager, error: managerError } = await supabase
      .from('venue_managers')
      .select('*')
      .eq('venue_id', id)
      .eq('user_id', user.id)
      .single()

    if (managerError || !manager) {
      // Check if user is admin
      const metadata = user.user_metadata
      if (metadata?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Prevent removing yourself if you're the only manager
    const { data: managers, error: countError } = await supabase
      .from('venue_managers')
      .select('*')
      .eq('venue_id', id)

    if (countError) throw countError

    if (managers && managers.length === 1 && managers[0].user_id === userId) {
      return NextResponse.json(
        { error: 'Cannot remove the last venue manager' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('venue_managers')
      .delete()
      .eq('venue_id', id)
      .eq('user_id', userId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

