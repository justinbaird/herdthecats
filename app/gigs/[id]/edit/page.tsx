import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EditGigContent from '@/components/EditGigContent'

export default async function EditGigPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { id } = await params

  // Verify user owns this gig
  const { data: gig, error } = await supabase
    .from('gigs')
    .select('*')
    .eq('id', id)
    .eq('posted_by', user.id)
    .single()

  if (error || !gig) {
    redirect('/gigs')
  }

  return <EditGigContent gigId={id} user={user} />
}

