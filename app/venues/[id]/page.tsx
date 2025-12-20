import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import VenueCalendarContent from '@/components/VenueCalendarContent'

export default async function VenueCalendarPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <VenueCalendarContent venueId={id} user={user} />
}

