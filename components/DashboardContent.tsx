'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { format } from 'date-fns'
import Navigation from './Navigation'

export default function DashboardContent({ user }: { user: User }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [musician, setMusician] = useState<any>(null)
  const [gigs, setGigs] = useState<any[]>([])
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Check if admin
      const { data: userData } = await supabase.auth.getUser()
      const metadata = userData.user?.user_metadata
      setIsAdmin(metadata?.role === 'admin')

      // Load musician profile
      const { data: musicianData } = await supabase
        .from('musicians')
        .select('*')
        .eq('user_id', user.id)
        .single()

      setMusician(musicianData)

      // Load gigs
      const { data: gigsData } = await supabase
        .from('gigs')
        .select('*')
        .eq('status', 'open')
        .order('datetime', { ascending: true })
        .limit(10)

      // Get musician profiles for posters
      if (gigsData && gigsData.length > 0) {
        const posterIds = [...new Set(gigsData.map((gig) => gig.posted_by))]
        const { data: musiciansData } = await supabase
          .from('musicians')
          .select('*')
          .in('user_id', posterIds)

        const gigsWithPosters = gigsData.map((gig) => ({
          ...gig,
          posted_by_musician: musiciansData?.find((m) => m.user_id === gig.posted_by) || null,
        }))

        setGigs(gigsWithPosters)
      } else {
        setGigs([])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} />

      <main className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              Welcome back{musician?.name ? `, ${musician.name}` : ''}!
            </h2>
            {!musician?.name && (
              <p className="mt-2 text-sm text-gray-900">
                Please complete your profile to get started.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                Open Gigs
              </h3>
              {gigs.length === 0 ? (
                <p className="text-sm text-gray-900">No open gigs at the moment.</p>
              ) : (
                <ul className="space-y-4">
                  {gigs.map((gig) => (
                    <li key={gig.id} className="border-b border-gray-200 pb-4">
                      <Link
                        href={`/gigs/${gig.id}`}
                        className="block hover:text-indigo-600"
                      >
                        <h4 className="font-medium text-gray-900">{gig.title}</h4>
                        <p className="mt-1 text-sm text-gray-900">
                          {format(new Date(gig.datetime), 'PPpp')}
                        </p>
                        <p className="mt-1 text-sm text-gray-900">{gig.location}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {gig.required_instruments.map((inst: string) => (
                            <span
                              key={inst}
                              className="rounded-full bg-indigo-100 px-2 py-1 text-xs text-indigo-800"
                            >
                              {inst}
                            </span>
                          ))}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4">
                <Link
                  href="/gigs"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  View all gigs →
                </Link>
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <Link
                  href="/gigs/new"
                  className="block rounded-md bg-indigo-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Post a New Gig
                </Link>
                <Link
                  href="/network"
                  className="block rounded-md bg-gray-200 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-300"
                >
                  Manage Network
                </Link>
                <Link
                  href="/profile"
                  className="block rounded-md bg-gray-200 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-300"
                >
                  Update Profile
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

