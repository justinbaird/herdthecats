import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// GET /api/venues/[id] - Get a specific venue
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

    const { data: venue, error } = await supabase
      .from('venues')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    return NextResponse.json({ venue })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/venues/[id] - Update a venue
export async function PUT(
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

    const body = await request.json()
    const { name, address, city, state, zip_code, country, phone, email, website } = body

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (address !== undefined) updateData.address = address
    if (city !== undefined) updateData.city = city || null
    if (state !== undefined) updateData.state = state || null
    if (zip_code !== undefined) updateData.zip_code = zip_code || null
    if (country !== undefined) updateData.country = country || null
    if (phone !== undefined) updateData.phone = phone || null
    if (email !== undefined) updateData.email = email || null
    if (website !== undefined) updateData.website = website || null

    const { data: venue, error } = await supabase
      .from('venues')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ venue })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/venues/[id] - Delete a venue
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

    const { error } = await supabase
      .from('venues')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

