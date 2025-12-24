import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// POST /api/messages/send - Generate WhatsApp link for messaging
export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { recipientId, recipientPhone, message } = await request.json()

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    if (!recipientPhone) {
      return NextResponse.json(
        { error: 'Recipient phone number is required' },
        { status: 400 }
      )
    }

    // Format phone number (remove non-numeric characters except +)
    const formattedPhone = recipientPhone.replace(/[^\d+]/g, '')
    
    // Create WhatsApp Web link
    const encodedMessage = encodeURIComponent(message)
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`

    return NextResponse.json({
      success: true,
      whatsappUrl,
    })
  } catch (error: any) {
    console.error('Error generating WhatsApp link:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


