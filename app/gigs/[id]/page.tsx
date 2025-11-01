import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GigDetailContent from '@/components/GigDetailContent'

export default async function GigDetailPage({
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

  return <GigDetailContent gigId={id} user={user} />
}

