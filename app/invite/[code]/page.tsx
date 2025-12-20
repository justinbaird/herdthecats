import InviteContent from '@/components/InviteContent'

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  
  return <InviteContent invitationCode={code} user={null} />
}
