import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PublicVenueCalendar from '@/components/PublicVenueCalendar'

export default async function PublicCalendarPage({
  params,
}: {
  params: Promise<{ hash: string }>
}) {
  const { hash } = await params
  const supabase = await createClient()

  // Find venue by public_calendar_hash
  const { data: venue, error } = await supabase
    .from('venues')
    .select('id, name')
    .eq('public_calendar_hash', hash)
    .single()

  if (error || !venue) {
    redirect('/')
  }

  return <PublicVenueCalendar venueId={venue.id} venueName={venue.name} hash={hash} />
}

