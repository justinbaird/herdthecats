import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

// POST /api/invitations/[code]/accept - Accept an invitation
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('venue_invitations')
      .select('*')
      .eq('invitation_code', code)
      .single()

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Check if expired
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 400 }
      )
    }

    // Check if already accepted
    if (invitation.status === 'accepted') {
      return NextResponse.json(
        { error: 'This invitation has already been accepted' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { firstName, lastName, email, phone, instruments } = body

    // Ensure user has a musician profile
    const { data: existingMusician } = await supabase
      .from('musicians')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    let musicianId: string

    if (!existingMusician) {
      // Create musician profile
      const musicianName = firstName && lastName
        ? `${firstName} ${lastName}`.trim()
        : invitation.musician_first_name && invitation.musician_last_name
        ? `${invitation.musician_first_name} ${invitation.musician_last_name}`.trim()
        : user.email?.split('@')[0] || 'Musician'

      const { data: newMusician, error: createError } = await supabase
        .from('musicians')
        .insert({
          user_id: user.id,
          name: musicianName,
          email: email || invitation.musician_email || user.email || '',
          phone: phone || invitation.musician_phone || null,
          instruments: instruments || invitation.musician_instruments || [],
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating musician profile:', createError)
        throw createError
      }
      musicianId = newMusician.id
    } else {
      // Update existing musician profile with invitation data
      const updateData: any = {}
      if (firstName && lastName) {
        updateData.name = `${firstName} ${lastName}`.trim()
      } else if (invitation.musician_first_name && invitation.musician_last_name) {
        updateData.name = `${invitation.musician_first_name} ${invitation.musician_last_name}`.trim()
      }
      if (email || invitation.musician_email) {
        updateData.email = email || invitation.musician_email
      }
      if (phone || invitation.musician_phone) {
        updateData.phone = phone || invitation.musician_phone
      }
      if (instruments && instruments.length > 0) {
        updateData.instruments = instruments
      } else if (invitation.musician_instruments && invitation.musician_instruments.length > 0) {
        updateData.instruments = invitation.musician_instruments
      }

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('musicians')
          .update(updateData)
          .eq('id', existingMusician.id)

        if (updateError) {
          console.error('Error updating musician profile:', updateError)
          throw updateError
        }
      }
      musicianId = existingMusician.id
    }

    // Update invitation status
    const { error: updateError } = await supabase
      .from('venue_invitations')
      .update({
        status: 'accepted',
        accepted_by: user.id,
        accepted_at: new Date().toISOString(),
        musician_first_name: firstName || invitation.musician_first_name,
        musician_last_name: lastName || invitation.musician_last_name,
        musician_email: email || invitation.musician_email,
        musician_phone: phone || invitation.musician_phone,
        musician_instruments: instruments || invitation.musician_instruments,
      })
      .eq('id', invitation.id)

    if (updateError) {
      console.error('Error updating invitation:', updateError)
      throw updateError
    }

    // Add musician to venue network (using user.id as musician_id references auth.users)
    // Use service role key to bypass RLS since the musician accepting isn't a venue manager
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase environment variables for service role client')
      throw new Error('Server configuration error: Missing Supabase credentials')
    }

    // Create service role client to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Check if musician is already in network (using admin client to bypass RLS)
    const { data: existingNetworkMember, error: checkError } = await supabaseAdmin
      .from('venue_networks')
      .select('id')
      .eq('venue_id', invitation.venue_id)
      .eq('musician_id', user.id)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking existing network member:', checkError)
      // Don't fail the whole process if check fails, just try to insert
    }

    // Only insert if not already in network
    if (!existingNetworkMember) {
      console.log(`Adding musician ${user.id} to venue network ${invitation.venue_id}`)
      
      const { data: networkMember, error: networkError } = await supabaseAdmin
        .from('venue_networks')
        .insert({
          venue_id: invitation.venue_id,
          musician_id: user.id,
          added_by: invitation.created_by,
        })
        .select()
        .single()

      if (networkError) {
        // Check if it's a duplicate error (unique constraint violation)
        if (networkError.code === '23505') {
          // Already exists, that's fine - continue without error
          console.log('Musician already in venue network (duplicate insert prevented)')
        } else {
          // Other error - rollback invitation status
          await supabase
            .from('venue_invitations')
            .update({
              status: 'pending',
              accepted_by: null,
              accepted_at: null,
            })
            .eq('id', invitation.id)

          console.error('Error adding to venue network:', networkError)
          console.error('Network error details:', JSON.stringify(networkError, null, 2))
          throw new Error(`Failed to add musician to venue network: ${networkError.message || JSON.stringify(networkError)}`)
        }
      } else {
        console.log('Successfully added musician to venue network:', networkMember?.id)
      }
    } else {
      // Already in network, just log it (this is fine - they might have been added manually)
      console.log('Musician already in venue network, skipping insert')
    }

    // Verify the musician is in the network (double-check)
    const { data: verifyNetworkMember, error: verifyError } = await supabaseAdmin
      .from('venue_networks')
      .select('id')
      .eq('venue_id', invitation.venue_id)
      .eq('musician_id', user.id)
      .maybeSingle()

    if (verifyError) {
      console.error('Error verifying network membership:', verifyError)
    } else if (!verifyNetworkMember) {
      console.error('WARNING: Musician was not found in network after insert attempt!')
      // Don't fail the whole process, but log the warning
    } else {
      console.log('Verified: Musician is in venue network:', verifyNetworkMember.id)
    }

    return NextResponse.json({ 
      success: true,
      networkAdded: !!verifyNetworkMember,
      networkMemberId: verifyNetworkMember?.id 
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


