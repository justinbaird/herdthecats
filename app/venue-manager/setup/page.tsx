import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import VenueManagerSetupContent from '@/components/VenueManagerSetupContent'

export default async function VenueManagerSetupPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if profile already exists
  const { data: profile } = await supabase
    .from('venue_manager_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profile) {
    redirect('/dashboard')
  }

  return <VenueManagerSetupContent user={user} />
}


