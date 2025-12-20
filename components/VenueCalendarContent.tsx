'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { format } from 'date-fns'
import Navigation from './Navigation'
import VenueCalendar from './VenueCalendar'
import VenueNetworkContent from './VenueNetworkContent'
import type { Venue, Gig } from '@/lib/supabase/types'
import { COUNTRIES } from '@/lib/countries'

export default function VenueCalendarContent({
  venueId,
  user,
}: {
  venueId: string
  user: User
}) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [venue, setVenue] = useState<Venue | null>(null)
  const [gigs, setGigs] = useState<Gig[]>([])
  const [isManager, setIsManager] = useState(false)
  const [hasAccess, setHasAccess] = useState(false)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [selectedGigId, setSelectedGigId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (venueId) {
      loadVenueData()
    } else {
      setError('Venue ID is missing')
      setLoading(false)
    }
  }, [venueId])

  const loadVenueData = async () => {
    if (!venueId) {
      setError('Venue ID is required')
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      // Load venue
      const venueResponse = await fetch(`/api/venues/${venueId}`)
      const { venue: venueData, error: venueError } = await venueResponse.json()
      if (venueError) throw new Error(venueError)
      setVenue(venueData)

      // Check if user is manager or admin using API route (avoids RLS issues)
      const metadata = user.user_metadata
      const isAdmin = metadata?.role === 'admin'
      
      let userIsManager = isAdmin
      
      if (!isAdmin) {
        // Use dedicated endpoint to check manager status
        try {
          const managerCheckResponse = await fetch(`/api/venues/${venueId}/is-manager`)
          if (managerCheckResponse.ok) {
            const { isManager } = await managerCheckResponse.json()
            userIsManager = isManager || false
          }
        } catch (err) {
          console.error('Error checking manager status:', err)
          userIsManager = false
        }
      }
      
      setIsManager(userIsManager)
      
      console.log('Manager check:', { isAdmin, userIsManager, venueId, userId: user.id })

      // Load gigs
      const gigsResponse = await fetch(`/api/venues/${venueId}/gigs`)
      const { gigs: gigsData, error: gigsError } = await gigsResponse.json()
      if (gigsError) throw new Error(gigsError)

      // Filter gigs based on access (managers see all gigs)
      if (userIsManager) {
        setGigs(gigsData || [])
        setHasAccess(true)
      } else if (gigsData && gigsData.length > 0) {
        // Check access for each gig
        const accessPromises = gigsData.map(async (gig: Gig) => {
          const accessRes = await fetch(
            `/api/venues/${venueId}/gigs/${gig.id}/access`
          )
          const { accesses: gigAccesses } = await accessRes.json()
          return {
            gig,
            hasAccess: gigAccesses?.some(
              (a: any) => a.musician_id === user.id
            ),
          }
        })
        const accessResults = await Promise.all(accessPromises)
        const visibleGigs = accessResults
          .filter((r) => r.hasAccess)
          .map((r) => r.gig)
        setGigs(visibleGigs)
        setHasAccess(visibleGigs.length > 0)
      } else {
        setGigs([])
        setHasAccess(false)
      }
    } catch (error: any) {
      console.error('Error loading venue data:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInviteMusician = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedGigId || !inviteEmail) return

    setError(null)

    try {
      // Find musician by email
      const { data: musician } = await supabase
        .from('musicians')
        .select('*')
        .eq('email', inviteEmail)
        .single()

      if (!musician) {
        setError('Musician not found with that email')
        return
      }

      const response = await fetch(
        `/api/venues/${venueId}/gigs/${selectedGigId}/invite`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ musicianId: musician.user_id }),
        }
      )

      const { error: responseError } = await response.json()
      if (responseError) throw new Error(responseError)

      setShowInviteForm(false)
      setInviteEmail('')
      setSelectedGigId(null)
      loadVenueData()
    } catch (error: any) {
      setError(error.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} />
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-lg">Loading venue calendar...</div>
        </div>
      </div>
    )
  }

  if (!venue) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} />
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-lg text-red-600">Venue not found</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} />

      <main className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <Link
              href="/venues"
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              ← Back to Venues
            </Link>
          </div>

          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{venue.name}</h1>
              <p className="mt-2 text-gray-900">{venue.address}</p>
              {venue.city && (
                <p className="text-gray-900">
                  {venue.city}
                  {venue.state && `, ${venue.state}`}
                  {venue.zip_code && ` ${venue.zip_code}`}
                </p>
              )}
              {venue.country && (
                <p className="text-gray-900">
                  {COUNTRIES.find(c => c.code === venue.country)?.name || venue.country}
                </p>
              )}
            </div>
            {isManager && (
              <Link
                href={`/gigs/new?venueId=${venueId}`}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Post Gig
              </Link>
            )}
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {isManager && (
            <div className="mb-6 rounded-lg bg-blue-50 p-4">
              <p className="text-sm text-blue-800">
                You are a venue manager. You can post gigs and invite musicians
                to view specific gigs.
              </p>
            </div>
          )}

          <div className="mb-6">
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">Calendar</h2>
            {isManager ? (
              // Venue managers see the calendar view
              <VenueCalendar gigs={gigs || []} venueId={venueId} isManager={isManager} />
            ) : (
              // Non-managers see a list view
              <>
                {gigs.length === 0 ? (
                  <p className="mt-4 text-gray-900">
                    No gigs available. Contact the venue manager for access.
                  </p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {gigs.map((gig) => (
                      <div
                        key={gig.id}
                        className="rounded-lg bg-white p-6 shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <Link
                              href={`/gigs/${gig.id}`}
                              className="text-xl font-semibold text-indigo-600 hover:text-indigo-800"
                            >
                              {gig.title}
                            </Link>
                            {gig.description && (
                              <p className="mt-2 text-gray-900">{gig.description}</p>
                            )}
                            <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-900">
                              <span>
                                <strong>Date:</strong>{' '}
                                {format(new Date(gig.datetime), 'PPP p')}
                              </span>
                              <span>
                                <strong>Location:</strong> {gig.location}
                              </span>
                              <span>
                                <strong>Status:</strong>{' '}
                                <span
                                  className={`font-semibold ${
                                    gig.status === 'open'
                                      ? 'text-green-600'
                                      : gig.status === 'filled'
                                      ? 'text-blue-600'
                                      : 'text-red-600'
                                  }`}
                                >
                                  {gig.status}
                                </span>
                              </span>
                            </div>
                            {gig.required_instruments &&
                              gig.required_instruments.length > 0 && (
                                <div className="mt-4">
                                  <strong className="text-sm text-gray-700">
                                    Required Instruments:
                                  </strong>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {gig.required_instruments.map((instrument) => (
                                      <span
                                        key={instrument}
                                        className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-800"
                                      >
                                        {instrument}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {showInviteForm && selectedGigId && (
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                Invite Musician to Gig
              </h3>
              <form onSubmit={handleInviteMusician} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Musician Email
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="musician@example.com"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowInviteForm(false)
                      setInviteEmail('')
                      setSelectedGigId(null)
                    }}
                    className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    Invite
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Venue Network Section - Only for managers */}
          {isManager && (
            <div className="mt-8">
              <VenueNetworkContent venueId={venueId} user={user} />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

