import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminContent from '@/components/AdminContent'

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is admin
  const metadata = user.user_metadata
  if (metadata?.role !== 'admin') {
    redirect('/dashboard')
  }

  return <AdminContent user={user} />
}

