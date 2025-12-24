import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// GET /api/venues/[id]/contacts - List venue contacts
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

    const metadata = user.user_metadata
    const isAdmin = metadata?.role === 'admin'

    if (!manager && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get venue contacts
    const { data: contacts, error } = await supabase
      .from('venue_contacts')
      .select('*')
      .eq('venue_id', id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ contacts })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/venues/[id]/contacts - Create a new venue contact
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
    const { data: manager } = await supabase
      .from('venue_managers')
      .select('id')
      .eq('venue_id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    const metadata = user.user_metadata
    const isAdmin = metadata?.role === 'admin'

    if (!manager && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { first_name, last_name, email, phone, country_code, instruments, notes } = body

    if (!email && !phone) {
      return NextResponse.json(
        { error: 'Email or phone number is required' },
        { status: 400 }
      )
    }

    // Create contact
    const { data: contact, error } = await supabase
      .from('venue_contacts')
      .insert({
        venue_id: id,
        first_name: first_name || null,
        last_name: last_name || null,
        email: email || null,
        phone: phone || null,
        country_code: country_code || null,
        instruments: instruments || [],
        notes: notes || null,
        added_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ contact }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/venues/[id]/contacts?contactId=xxx - Delete a venue contact
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
    const { data: manager } = await supabase
      .from('venue_managers')
      .select('id')
      .eq('venue_id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    const metadata = user.user_metadata
    const isAdmin = metadata?.role === 'admin'

    if (!manager && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const contactId = searchParams.get('contactId')

    if (!contactId) {
      return NextResponse.json(
        { error: 'contactId is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('venue_contacts')
      .delete()
      .eq('id', contactId)
      .eq('venue_id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


