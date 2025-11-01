import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GigsContent from '@/components/GigsContent'

export default async function GigsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <GigsContent user={user} />
}

