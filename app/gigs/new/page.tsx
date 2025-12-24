import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NewGigContent from '@/components/NewGigContent'

export default async function NewGigPage({
  searchParams,
}: {
  searchParams: Promise<{ venueId?: string; date?: string; entryType?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const entryType = params.entryType === 'rehearsal' ? 'rehearsal' : 'gig'

  return <NewGigContent user={user} initialVenueId={params.venueId} initialDate={params.date} initialEntryType={entryType} />
}

