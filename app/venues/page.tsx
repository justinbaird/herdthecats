import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import VenuesContent from '@/components/VenuesContent'

export default async function VenuesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <VenuesContent user={user} />
}



