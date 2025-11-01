'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { format } from 'date-fns'
import Navigation from './Navigation'

export default function GigDetailContent({
  gigId,
  user,
}: {
  gigId: string
  user: User
}) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [gig, setGig] = useState<any>(null)
  const [musician, setMusician] = useState<any>(null)
  const [applications, setApplications] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [claiming, setClaiming] = useState<string | null>(null)

  useEffect(() => {
    loadGig()
  }, [gigId])

  const loadGig = async () => {
    try {
      // Load gig
      const { data: gigData, error: gigError } = await supabase
        .from('gigs')
        .select('*')
        .eq('id', gigId)
        .single()

      if (gigError) throw gigError

      // Get poster's musician profile
      const { data: posterData } = await supabase
        .from('musicians')
        .select('*')
        .eq('user_id', gigData.posted_by)
        .single()

      setGig({
        ...gigData,
        posted_by_musician: posterData,
      })

      // Load current musician profile
      const { data: musicianData } = await supabase
        .from('musicians')
        .select('*')
        .eq('user_id', user.id)
        .single()

      setMusician(musicianData)

      // Load applications
      const { data: appsData, error: appsError } = await supabase
        .from('gig_applications')
        .select('*')
        .eq('gig_id', gigId)
        .order('created_at', { ascending: true })

      if (appsError) throw appsError

      // Get musician profiles for applications
      if (appsData && appsData.length > 0) {
        const musicianIds = appsData.map((app) => app.musician_id)
        const { data: musiciansData } = await supabase
          .from('musicians')
          .select('*')
          .in('user_id', musicianIds)

        const appsWithMusicians = appsData.map((app) => ({
          ...app,
          musician: musiciansData?.find((m) => m.user_id === app.musician_id) || null,
        }))

        setApplications(appsWithMusicians)
      } else {
        setApplications([])
      }
    } catch (error: any) {
      console.error('Error loading gig:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const claimGig = async (instrument: string) => {
    if (!musician) {
      setError('Please complete your profile first')
      return
    }

    if (!musician.instruments.includes(instrument)) {
      setError(`You don't play ${instrument}. Please update your profile.`)
      return
    }

    setClaiming(instrument)
    setError(null)

    try {
      // Check if instrument slot is already filled
      const existingApp = applications.find(
        (app) => app.instrument === instrument && app.status === 'accepted'
      )

      if (existingApp) {
        setError(`${instrument} slot has already been claimed`)
        setClaiming(null)
        return
      }

      // Check if user already applied for this instrument
      const existingMyApp = applications.find(
        (app) =>
          app.instrument === instrument &&
          app.musician_id === musician.user_id &&
          app.status === 'pending'
      )

      if (existingMyApp) {
        setError('You have already applied for this instrument')
        setClaiming(null)
        return
      }

      // Create application
      const { error: appError } = await supabase
        .from('gig_applications')
        .insert({
          gig_id: gigId,
          musician_id: user.id,
          instrument,
          status: 'pending',
        })

      if (appError) throw appError

      // Check if this is the first application for this instrument
      // If so, auto-accept (first come, first served)
      const { data: allApps } = await supabase
        .from('gig_applications')
        .select('*')
        .eq('gig_id', gigId)
        .eq('instrument', instrument)
        .order('created_at', { ascending: true })

      if (allApps && allApps.length === 1) {
        // First application, auto-accept
        await supabase
          .from('gig_applications')
          .update({ status: 'accepted' })
          .eq('id', allApps[0].id)

        setSuccess(`Congratulations! You got the ${instrument} slot!`)
      } else {
        setSuccess(
          `Application submitted for ${instrument}. You'll be notified if selected.`
        )
      }

      // Reload data
      await loadGig()
      setClaiming(null)
      setTimeout(() => setSuccess(null), 5000)
    } catch (error: any) {
      console.error('Error claiming gig:', error)
      setError(error.message)
      setClaiming(null)
    }
  }

  const handleAcceptApplication = async (applicationId: string) => {
    if (gig.posted_by !== user.id) {
      setError('Only the gig poster can accept applications')
      return
    }

    try {
      const { error } = await supabase
        .from('gig_applications')
        .update({ status: 'accepted' })
        .eq('id', applicationId)

      if (error) throw error

      // Reject other applications for the same instrument
      const app = applications.find((a) => a.id === applicationId)
      if (app) {
        await supabase
          .from('gig_applications')
          .update({ status: 'rejected' })
          .eq('gig_id', gigId)
          .eq('instrument', app.instrument)
          .neq('id', applicationId)
          .eq('status', 'pending')
      }

      setSuccess('Application accepted!')
      await loadGig()
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: any) {
      console.error('Error accepting application:', error)
      setError(error.message)
    }
  }

  const isGigPoster = gig?.posted_by === user.id
  const myInstruments = musician?.instruments || []

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!gig) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Gig not found</div>
      </div>
    )
  }

  // Group applications by instrument
  const appsByInstrument: Record<string, any[]> = {}
  gig.required_instruments.forEach((inst: string) => {
    appsByInstrument[inst] = applications.filter((app) => app.instrument === inst)
  })

  const allSlotsFilled = gig.required_instruments.every((inst: string) =>
    appsByInstrument[inst]?.some((app) => app.status === 'accepted')
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} />

      <main className="mx-auto max-w-4xl py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <Link
            href="/gigs"
            className="mb-4 inline-block text-sm text-indigo-600 hover:text-indigo-500"
          >
            ← Back to Gigs
          </Link>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-md bg-green-50 p-4">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          )}

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-900">{gig.title}</h1>
              <div className="flex items-center gap-3">
                {isGigPoster && (
                  <Link
                    href={`/gigs/${gigId}/edit`}
                    className="rounded-md border border-indigo-300 bg-white px-4 py-2 text-sm font-medium text-indigo-700 shadow-sm hover:bg-indigo-50"
                  >
                    Edit Gig
                  </Link>
                )}
                <span
                  className={`rounded-full px-3 py-1 text-sm font-medium ${
                    gig.status === 'open'
                      ? 'bg-green-100 text-green-800'
                      : gig.status === 'filled'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {gig.status}
                </span>
              </div>
            </div>

            {gig.description && (
              <p className="mb-4 text-gray-700">{gig.description}</p>
            )}

            <div className="mb-4 space-y-2">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Date & Time:</span>{' '}
                {format(new Date(gig.datetime), 'PPpp')}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Location:</span> {gig.location}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Posted by:</span>{' '}
                {gig.posted_by_musician?.name || 'Unknown'}
              </p>
            </div>

            <div className="mt-6">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">
                Required Instruments
              </h2>
              <div className="space-y-4">
                {gig.required_instruments.map((instrument: string) => {
                  const instrumentApps = appsByInstrument[instrument] || []
                  const acceptedApp = instrumentApps.find(
                    (app) => app.status === 'accepted'
                  )
                  const canClaim =
                    gig.status === 'open' &&
                    !acceptedApp &&
                    myInstruments.includes(instrument) &&
                    !instrumentApps.some(
                      (app) =>
                        app.musician_id === user.id &&
                        (app.status === 'pending' || app.status === 'accepted')
                    )

                  return (
                    <div
                      key={instrument}
                      className="rounded-md border border-gray-200 p-4"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="font-medium text-gray-900">{instrument}</h3>
                        {acceptedApp ? (
                          <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                            Filled by {acceptedApp.musician?.name || 'Unknown'}
                          </span>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
                            Open
                          </span>
                        )}
                      </div>

                      {canClaim && (
                        <button
                          onClick={() => claimGig(instrument)}
                          disabled={claiming === instrument}
                          className="mt-2 rounded-md bg-indigo-600 px-3 py-1 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {claiming === instrument ? 'Claiming...' : 'Claim This Slot'}
                        </button>
                      )}

                      {isGigPoster && instrumentApps.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-sm font-medium text-gray-700">
                            Applications:
                          </p>
                          {instrumentApps.map((app) => (
                            <div
                              key={app.id}
                              className="flex items-center justify-between rounded-md bg-gray-50 p-2"
                            >
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {app.musician?.name || 'Unknown'}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {app.musician?.email || 'No email'}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Applied: {format(new Date(app.created_at), 'PPpp')}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <span
                                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                                    app.status === 'accepted'
                                      ? 'bg-green-100 text-green-800'
                                      : app.status === 'rejected'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}
                                >
                                  {app.status}
                                </span>
                                {app.status === 'pending' && !acceptedApp && (
                                  <button
                                    onClick={() => handleAcceptApplication(app.id)}
                                    className="rounded-md bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700"
                                  >
                                    Accept
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

