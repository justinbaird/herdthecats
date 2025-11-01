import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NetworkContent from '@/components/NetworkContent'

export default async function NetworkPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <NetworkContent user={user} />
}

