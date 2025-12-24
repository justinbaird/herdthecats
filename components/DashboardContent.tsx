'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { format } from 'date-fns'
import Navigation from './Navigation'
import VenueCalendarContent from './VenueCalendarContent'
import type { Venue } from '@/lib/supabase/types'

export default function DashboardContent({ user }: { user: User }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [musician, setMusician] = useState<any>(null)
  const [gigs, setGigs] = useState<any[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [isVenueManager, setIsVenueManager] = useState(false)
  const [venues, setVenues] = useState<Venue[]>([])
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)
  const [venueManagerProfile, setVenueManagerProfile] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedVenueId && isVenueManager) {
      // Venue selected, calendar will load via VenueCalendarContent
    }
  }, [selectedVenueId, isVenueManager])

  const loadData = async () => {
    try {
      // Check if admin
      const { data: userData } = await supabase.auth.getUser()
      
      // Check if email is confirmed
      if (userData.user && !userData.user.email_confirmed_at) {
        router.push(`/check-email?email=${encodeURIComponent(userData.user.email || '')}`)
        return
      }
      
      const metadata = userData.user?.user_metadata
      setIsAdmin(metadata?.role === 'admin')

      // Check if user is a venue manager
      const venuesResponse = await fetch('/api/venue-manager/venues')
      let isManager = false
      if (venuesResponse.ok) {
        const venuesData = await venuesResponse.json()
        console.log('Venues data:', venuesData) // Debug log
        if (venuesData.venues && venuesData.venues.length > 0) {
          isManager = true
          setIsVenueManager(true)
          setVenues(venuesData.venues)
          // Set first venue as selected by default
          if (venuesData.venues.length > 0) {
            setSelectedVenueId(venuesData.venues[0].id)
          }
        } else {
          console.log('No venues found for user') // Debug log
        }
      } else {
        try {
          const errorData = await venuesResponse.json()
          console.error('Error fetching venues:', JSON.stringify(errorData, null, 2)) // Debug log
        } catch (e) {
          const text = await venuesResponse.text().catch(() => 'Unable to read error')
          console.error('Error fetching venues - non-JSON response:', venuesResponse.status, venuesResponse.statusText, text.substring(0, 200))
        }
      }

      // Load venue manager profile if they are a venue manager
      if (isManager) {
        const profileResponse = await fetch('/api/venue-manager-profile')
        if (profileResponse.ok) {
          const profileContentType = profileResponse.headers.get('content-type') || ''
          const profileIsJson = profileContentType.includes('application/json')
          if (profileIsJson) {
            const profileData = await profileResponse.json()
            setVenueManagerProfile(profileData.profile)
          }
        }
      } else {
        // Load musician profile (for non-venue managers)
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

  // If venue manager, show venue calendar dashboard
  if (isVenueManager && selectedVenueId) {
    // Check if profile is complete
    if (!venueManagerProfile) {
      // Redirect to profile setup
      router.push('/venue-manager/setup')
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-lg">Redirecting to profile setup...</div>
        </div>
      )
    }

    const selectedVenue = venues.find((v) => v.id === selectedVenueId)

    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} />
        <main className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {selectedVenue?.name || 'Venue Calendar'}
                </h1>
                <p className="mt-1 text-sm text-gray-900">
                  Welcome back, {venueManagerProfile.first_name} {venueManagerProfile.last_name}
                </p>
              </div>
              {venues.length > 1 && (
                <div className="flex items-center gap-2">
                  <label htmlFor="venue-select" className="text-sm font-medium text-gray-900">
                    Venue:
                  </label>
                  <select
                    id="venue-select"
                    value={selectedVenueId}
                    onChange={(e) => setSelectedVenueId(e.target.value)}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  >
                    {venues.map((venue) => (
                      <option key={venue.id} value={venue.id}>
                        {venue.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <VenueCalendarContent venueId={selectedVenueId} user={user} />
          </div>
        </main>
      </div>
    )
  }

  // Regular musician dashboard
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

