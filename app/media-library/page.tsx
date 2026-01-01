import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MediaLibraryContent from '@/components/MediaLibraryContent'

export default async function MediaLibraryPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <MediaLibraryContent user={user} />
}



