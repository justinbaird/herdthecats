import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NewGigContent from '@/components/NewGigContent'

export default async function NewGigPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <NewGigContent user={user} />
}

