/**
 * Generate calendar links for gigs
 */

export interface CalendarEvent {
  title: string
  description: string
  location: string
  startTime: Date
  endTime?: Date
  duration?: number // in minutes, defaults to 2 hours
}

/**
 * Generate a Google Calendar URL
 */
export function generateGoogleCalendarLink(event: CalendarEvent): string {
  const start = event.startTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const end = event.endTime 
    ? event.endTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    : new Date(event.startTime.getTime() + (event.duration || 120) * 60000)
        .toISOString()
        .replace(/[-:]/g, '')
        .split('.')[0] + 'Z'

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${start}/${end}`,
    details: event.description || '',
    location: event.location || '',
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * Generate an iCal file content (for download)
 */
export function generateICalContent(event: CalendarEvent): string {
  const start = formatICalDate(event.startTime)
  const end = event.endTime
    ? formatICalDate(event.endTime)
    : formatICalDate(
        new Date(event.startTime.getTime() + (event.duration || 120) * 60000)
      )

  const description = (event.description || '').replace(/\n/g, '\\n').replace(/,/g, '\\,')
  const location = (event.location || '').replace(/,/g, '\\,')
  const title = event.title.replace(/,/g, '\\,')

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Herd the Cats//Gig Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

/**
 * Format date for iCal (UTC format)
 */
function formatICalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

/**
 * Download iCal file
 */
export function downloadICalFile(event: CalendarEvent, filename?: string): void {
  const content = generateICalContent(event)
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename || `${event.title.replace(/[^a-z0-9]/gi, '_')}.ics`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

