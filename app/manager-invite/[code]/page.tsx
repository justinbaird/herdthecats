import ManagerInviteContent from '@/components/ManagerInviteContent'
import { createClient } from '@/lib/supabase/server'

export default async function ManagerInvitePage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Pass user as null if not logged in - component will handle it
  return <ManagerInviteContent invitationCode={code} user={user || null} />
}


