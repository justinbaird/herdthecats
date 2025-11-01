import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { generateICalContent } from '@/lib/calendar'

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { applicationId } = await request.json()

    // Get the application details
    const { data: application, error: appError } = await supabase
      .from('gig_applications')
      .select('*')
      .eq('id', applicationId)
      .single()

    if (appError || !application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    // Get the gig details
    const { data: gig, error: gigError } = await supabase
      .from('gigs')
      .select('*')
      .eq('id', application.gig_id)
      .single()

    if (gigError || !gig) {
      return NextResponse.json(
        { error: 'Gig not found' },
        { status: 404 }
      )
    }

    // Get the musician details
    const { data: musician, error: musicianError } = await supabase
      .from('musicians')
      .select('*')
      .eq('user_id', application.musician_id)
      .single()

    if (musicianError || !musician) {
      return NextResponse.json(
        { error: 'Musician profile not found' },
        { status: 404 }
      )
    }

    // Verify the application is accepted
    if (application.status !== 'accepted') {
      return NextResponse.json(
        { error: 'Application is not accepted' },
        { status: 400 }
      )
    }

    // Verify the user accepting has permission (gig poster)
    if (gig.posted_by !== user.id) {
      return NextResponse.json(
        { error: 'Only the gig poster can send calendar invites' },
        { status: 403 }
      )
    }

    // Generate calendar invitation (.ics content)
    const startTime = new Date(gig.start_time || gig.datetime)
    const endTime = gig.end_time ? new Date(gig.end_time) : undefined
    
    const calendarContent = generateICalContent({
      title: `${gig.title} - ${application.instrument}`,
      description: gig.description || `Playing ${application.instrument} at ${gig.title}`,
      location: gig.location,
      startTime,
      endTime,
    })

    // Get gig poster's name for the email
    const { data: poster } = await supabase
      .from('musicians')
      .select('name')
      .eq('user_id', gig.posted_by)
      .single()

    const posterName = poster?.name || 'Gig Organizer'

    // Email subject and body
    const subject = `You're confirmed for: ${gig.title}`
    const emailBodyHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .gig-details { background-color: white; padding: 15px; border-radius: 4px; margin: 15px 0; }
    .gig-details p { margin: 8px 0; }
    .gig-details strong { color: #4F46E5; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 You're Confirmed!</h1>
    </div>
    <div class="content">
      <p>Hello ${musician.name || 'there'},</p>
      
      <p>Great news! Your application has been accepted for the following gig:</p>
      
      <div class="gig-details">
        <p><strong>Gig:</strong> ${gig.title}</p>
        <p><strong>Instrument:</strong> ${application.instrument}</p>
        ${gig.call_time ? `<p><strong>Call Time:</strong> ${new Date(gig.call_time).toLocaleString()}</p>` : ''}
        <p><strong>Start Time:</strong> ${startTime.toLocaleString()}</p>
        ${endTime ? `<p><strong>End Time:</strong> ${endTime.toLocaleString()}</p>` : ''}
        <p><strong>Location:</strong> ${gig.location}</p>
        ${gig.number_of_sets ? `<p><strong>Sets:</strong> ${gig.number_of_sets}</p>` : ''}
        ${gig.description ? `<p><strong>Description:</strong> ${gig.description}</p>` : ''}
      </div>
      
      <p>A calendar invitation (.ics file) is attached to this email. Please add it to your calendar so you don't miss it!</p>
      
      <p>If you have any questions, please contact ${posterName}.</p>
      
      <p>Looking forward to playing with you!</p>
      
      <div class="footer">
        <p>Best regards,<br>${posterName}</p>
      </div>
    </div>
  </div>
</body>
</html>
`

    // Try to send email using Resend (if configured)
    const resendApiKey = process.env.RESEND_API_KEY
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'gigs@herdthecats.app'

    if (resendApiKey) {
      try {
        // Dynamic import for Resend (optional dependency)
        const { Resend } = await import('resend')
        const resend = new Resend(resendApiKey)

        const calendarFilename = `${gig.title.replace(/[^a-z0-9]/gi, '_')}.ics`

        await resend.emails.send({
          from: fromEmail,
          to: musician.email,
          subject: subject,
          html: emailBodyHTML,
          attachments: [
            {
              filename: calendarFilename,
              content: Buffer.from(calendarContent).toString('base64'),
            },
          ],
        })

        return NextResponse.json({
          success: true,
          message: 'Calendar invitation email sent successfully',
        })
      } catch (emailError: any) {
        console.error('Error sending email with Resend:', emailError)
        // Fall through to return error or use fallback
      }
    }

    // If Resend is not configured, return instructions
    return NextResponse.json({
      success: false,
      message: 'Email service not configured',
      error: 'RESEND_API_KEY environment variable is not set',
      instructions: 'To enable email sending, add RESEND_API_KEY and RESEND_FROM_EMAIL to your environment variables. Sign up at https://resend.com for a free account.',
      emailDetails: {
        to: musician.email,
        subject: subject,
        calendarFilename: `${gig.title.replace(/[^a-z0-9]/gi, '_')}.ics`,
      },
    }, { status: 200 }) // Still return 200 so acceptance doesn't fail
  } catch (error: any) {
    console.error('Error sending calendar invite:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

