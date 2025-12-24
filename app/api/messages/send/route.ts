import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// POST /api/messages/send - Send a message to a user via email or WhatsApp
export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { recipientId, recipientEmail, recipientPhone, message, method, subject } = await request.json()

    if (!message || !method) {
      return NextResponse.json(
        { error: 'Message and method are required' },
        { status: 400 }
      )
    }

    if (method === 'email') {
      if (!recipientEmail) {
        return NextResponse.json(
          { error: 'Recipient email is required for email messages' },
          { status: 400 }
        )
      }

      // Get sender info
      const { data: senderProfile } = await supabase
        .from('venue_manager_profiles')
        .select('first_name, last_name, email')
        .eq('user_id', user.id)
        .single()

      const senderName = senderProfile
        ? `${senderProfile.first_name} ${senderProfile.last_name}`
        : user.email || 'Venue Manager'

      const senderEmail = senderProfile?.email || user.email || 'noreply@herdthecats.app'

      // Send email using Resend
      const { data, error: emailError } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Herd the Cats <noreply@herdthecats.app>',
        to: recipientEmail,
        subject: subject || 'Message from Herd the Cats',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4f46e5;">Message from ${senderName}</h2>
            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #111827; line-height: 1.6; white-space: pre-wrap;">${message.replace(/\n/g, '<br>')}</p>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              This message was sent through Herd the Cats. Please reply directly to ${senderEmail} if you need to respond.
            </p>
          </div>
        `,
        text: message,
      })

      if (emailError) {
        console.error('Resend error:', emailError)
        return NextResponse.json(
          { error: 'Failed to send email', details: emailError },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        messageId: data?.id,
        method: 'email',
      })
    } else if (method === 'whatsapp') {
      if (!recipientPhone) {
        return NextResponse.json(
          { error: 'Recipient phone number is required for WhatsApp messages' },
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
        method: 'whatsapp',
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid method. Use "email" or "whatsapp"' },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


