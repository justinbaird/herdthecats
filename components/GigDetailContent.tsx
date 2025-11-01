'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { format } from 'date-fns'
import Navigation from './Navigation'
import { generateGoogleCalendarLink, downloadICalFile } from '@/lib/calendar'

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
  const [invitations, setInvitations] = useState<any[]>([])
  const [managingInvitesFor, setManagingInvitesFor] = useState<string | null>(null)
  const [inviteSearchName, setInviteSearchName] = useState('')
  const [inviteSearchResults, setInviteSearchResults] = useState<any[]>([])
  const [inviting, setInviting] = useState(false)

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

      // Load invitations
      const { data: invitesData, error: invitesError } = await supabase
        .from('gig_invitations')
        .select('*')
        .eq('gig_id', gigId)

      if (invitesError) throw invitesError

      // Get musician profiles for invitations
      if (invitesData && invitesData.length > 0) {
        const inviteMusicianIds = invitesData.map((inv) => inv.musician_id)
        const { data: inviteMusiciansData } = await supabase
          .from('musicians')
          .select('*')
          .in('user_id', inviteMusicianIds)

        const invitesWithMusicians = invitesData.map((inv) => ({
          ...inv,
          musician: inviteMusiciansData?.find((m) => m.user_id === inv.musician_id) || null,
        }))

        setInvitations(invitesWithMusicians)
      } else {
        setInvitations([])
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

    // Check if slot is invite-only and if user is invited
    const isInviteOnly = gig?.invite_only_instruments?.includes(instrument)
    if (isInviteOnly) {
      const isInvited = invitations.some(
        (inv) => inv.instrument === instrument && inv.musician_id === user.id
      )
      if (!isInvited) {
        setError(`${instrument} is invite-only. You must be invited by the gig poster to apply.`)
        return
      }
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

      // Notify gig poster about the new application
      try {
        await fetch('/api/gigs/application-notify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            gigId,
            musicianId: user.id,
            instrument,
          }),
        })
      } catch (notifyError) {
        // Don't fail the application if notification fails
        console.error('Failed to send notification:', notifyError)
      }

      setSuccess(
        `Application submitted for ${instrument}. The gig poster will review and notify you if selected.`
      )

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
      const app = applications.find((a) => a.id === applicationId)
      if (!app) {
        setError('Application not found')
        return
      }

      // Accept this application
      const { error } = await supabase
        .from('gig_applications')
        .update({ status: 'accepted' })
        .eq('id', applicationId)

      if (error) throw error

      // Reject other applications for the same instrument
      await supabase
        .from('gig_applications')
        .update({ status: 'rejected' })
        .eq('gig_id', gigId)
        .eq('instrument', app.instrument)
        .neq('id', applicationId)
        .eq('status', 'pending')

      // Send calendar invitation email to the accepted musician
      let emailSent = false
      try {
        const emailResponse = await fetch('/api/gigs/send-calendar-invite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ applicationId }),
        })

        if (emailResponse.ok) {
          const emailResult = await emailResponse.json()
          emailSent = emailResult.success === true
        } else {
          console.error('Failed to send calendar invite email:', await emailResponse.text())
        }
      } catch (emailError) {
        console.error('Error sending calendar invite email:', emailError)
        // Don't fail the acceptance if email fails
      }

      setSuccess(emailSent 
        ? 'Application accepted! Calendar invitation email sent.'
        : 'Application accepted! (Email service not configured - calendar links available on the gig page)'
      )
      await loadGig()
      setTimeout(() => setSuccess(null), 5000)
    } catch (error: any) {
      console.error('Error accepting application:', error)
      setError(error.message)
    }
  }

  const handleRejectApplication = async (applicationId: string) => {
    if (gig.posted_by !== user.id) {
      setError('Only the gig poster can reject applications')
      return
    }

    try {
      const { error } = await supabase
        .from('gig_applications')
        .update({ status: 'rejected' })
        .eq('id', applicationId)

      if (error) throw error

      setSuccess('Application rejected')
      await loadGig()
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: any) {
      console.error('Error rejecting application:', error)
      setError(error.message)
    }
  }

  const searchMusiciansForInvite = async (nameQuery: string) => {
    if (!nameQuery.trim()) {
      setInviteSearchResults([])
      return
    }

    try {
      // Split search query into parts (handles first name, last name, or both)
      const nameParts = nameQuery.trim().toLowerCase().split(/\s+/)
      
      // Search for musicians whose name contains any of the search terms
      // This allows searching by first name, last name, or full name
      const { data, error } = await supabase
        .from('musicians')
        .select('*')
        .limit(20)

      if (error) throw error

      // Filter results client-side to match any part of the name
      const filtered = (data || []).filter((musician) => {
        const fullName = (musician.name || '').toLowerCase()
        // Check if all search parts match the name
        return nameParts.every(part => fullName.includes(part))
      })

      setInviteSearchResults(filtered.slice(0, 10))
    } catch (error: any) {
      console.error('Error searching musicians:', error)
      setInviteSearchResults([])
    }
  }

  const handleInviteMusician = async (musicianId: string, instrument: string) => {
    if (gig.posted_by !== user.id) {
      setError('Only the gig poster can send invitations')
      return
    }

    setInviting(true)
    try {
      const { error } = await supabase
        .from('gig_invitations')
        .insert({
          gig_id: gigId,
          musician_id: musicianId,
          instrument,
        })

      if (error) throw error

      setSuccess('Invitation sent!')
      setInviteSearchName('')
      setInviteSearchResults([])
      await loadGig()
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: any) {
      console.error('Error sending invitation:', error)
      setError(error.message || 'Failed to send invitation')
    } finally {
      setInviting(false)
    }
  }

  const handleRemoveInvitation = async (invitationId: string) => {
    if (gig.posted_by !== user.id) {
      setError('Only the gig poster can remove invitations')
      return
    }

    try {
      const { error } = await supabase
        .from('gig_invitations')
        .delete()
        .eq('id', invitationId)

      if (error) throw error

      setSuccess('Invitation removed')
      await loadGig()
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: any) {
      console.error('Error removing invitation:', error)
      setError(error.message)
    }
  }

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

  const isGigPoster = gig.posted_by === user.id
  const myInstruments = musician?.instruments || []

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
                  // Sort applications: pending first (by time), then accepted, then rejected
                  const instrumentAppsUnsorted = appsByInstrument[instrument] || []
                  const instrumentApps = [...instrumentAppsUnsorted].sort((a, b) => {
                    // Pending applications first, sorted by created_at (oldest first)
                    if (a.status === 'pending' && b.status !== 'pending') return -1
                    if (a.status !== 'pending' && b.status === 'pending') return 1
                    if (a.status === 'pending' && b.status === 'pending') {
                      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                    }
                    // Accepted next
                    if (a.status === 'accepted' && b.status !== 'accepted') return -1
                    if (a.status !== 'accepted' && b.status === 'accepted') return 1
                    // Rejected last
                    if (a.status === 'rejected' && b.status !== 'rejected') return 1
                    if (a.status !== 'rejected' && b.status === 'rejected') return -1
                    // Same status, sort by created_at
                    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                  })
                  const acceptedApp = instrumentApps.find(
                    (app) => app.status === 'accepted'
                  )
                  const pendingApps = instrumentApps.filter(
                    (app) => app.status === 'pending'
                  )
                  const isInviteOnly = gig.invite_only_instruments?.includes(instrument) || false
                  const instrumentInvitations = invitations.filter(
                    (inv) => inv.instrument === instrument
                  )
                  const isInvited = isInviteOnly && instrumentInvitations.some(
                    (inv) => inv.musician_id === user.id
                  )
                  
                  const canClaim =
                    gig.status === 'open' &&
                    !acceptedApp &&
                    myInstruments.includes(instrument) &&
                    !instrumentApps.some(
                      (app) =>
                        app.musician_id === user.id &&
                        (app.status === 'pending' || app.status === 'accepted')
                    ) &&
                    (!isInviteOnly || isInvited)

                  return (
                    <div
                      key={instrument}
                      className="rounded-md border border-gray-200 p-4"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900">{instrument}</h3>
                          {isInviteOnly && (
                            <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800">
                              Invite Only
                            </span>
                          )}
                        </div>
                        {acceptedApp ? (
                          <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                            Filled by {acceptedApp.musician?.name || 'Unknown'}
                            {acceptedApp.musician_id === user.id && (
                              <span className="ml-1">(You)</span>
                            )}
                          </span>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
                            Open
                          </span>
                        )}
                      </div>

                      {acceptedApp && acceptedApp.musician_id === user.id && (
                        <div className="mb-2 flex flex-wrap gap-2">
                          <a
                            href={generateGoogleCalendarLink({
                              title: `${gig.title} - ${instrument}`,
                              description: gig.description || `Playing ${instrument} at ${gig.title}`,
                              location: gig.location,
                              startTime: new Date(gig.datetime),
                            })}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                          >
                            📅 Add to Google Calendar
                          </a>
                          <button
                            onClick={() => {
                              downloadICalFile({
                                title: `${gig.title} - ${instrument}`,
                                description: gig.description || `Playing ${instrument} at ${gig.title}`,
                                location: gig.location,
                                startTime: new Date(gig.datetime),
                              })
                            }}
                            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            📥 Download .ics
                          </button>
                        </div>
                      )}

                      {canClaim && (
                        <button
                          onClick={() => claimGig(instrument)}
                          disabled={claiming === instrument}
                          className="mt-2 rounded-md bg-indigo-600 px-3 py-1 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {claiming === instrument ? 'Claiming...' : 'Claim This Slot'}
                        </button>
                      )}

                      {isInviteOnly && !canClaim && !acceptedApp && (
                        <p className="mt-2 text-sm text-purple-600">
                          This slot is invite-only. Only invited musicians can apply.
                        </p>
                      )}

                      {isGigPoster && isInviteOnly && (
                        <div className="mt-3 rounded-md border border-purple-200 bg-purple-50 p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-sm font-semibold text-purple-900">
                              Manage Invitations ({instrumentInvitations.length} invited)
                            </p>
                            <button
                              onClick={() => {
                                if (managingInvitesFor === instrument) {
                                  setManagingInvitesFor(null)
                                  setInviteSearchName('')
                                  setInviteSearchResults([])
                                } else {
                                  setManagingInvitesFor(instrument)
                                }
                              }}
                              className="text-xs text-purple-700 hover:text-purple-900 font-medium"
                            >
                              {managingInvitesFor === instrument ? 'Cancel' : 'Manage'}
                            </button>
                          </div>

                          {instrumentInvitations.length > 0 && (
                            <div className="mb-2 space-y-1">
                              {instrumentInvitations.map((inv) => (
                                <div
                                  key={inv.id}
                                  className="flex items-center justify-between rounded bg-white px-2 py-1 text-xs"
                                >
                                  <span className="text-gray-700">
                                    {inv.musician?.name || 'Unknown'} ({inv.musician?.email})
                                  </span>
                                  <button
                                    onClick={() => handleRemoveInvitation(inv.id)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {managingInvitesFor === instrument && (
                            <div>
                              <div className="flex gap-2 mb-2">
                                <input
                                  type="text"
                                  value={inviteSearchName}
                                  onChange={(e) => {
                                    setInviteSearchName(e.target.value)
                                    searchMusiciansForInvite(e.target.value)
                                  }}
                                  placeholder="Search by name (first, last, or both)..."
                                  className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-900 placeholder-gray-400"
                                />
                              </div>

                              {inviteSearchResults.length > 0 && (
                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                  {inviteSearchResults
                                    .filter(
                                      (m) =>
                                        !instrumentInvitations.some(
                                          (inv) => inv.musician_id === m.user_id
                                        ) && m.instruments?.includes(instrument)
                                    )
                                    .map((musician) => (
                                      <div
                                        key={musician.user_id}
                                        className="flex items-center justify-between rounded bg-white px-2 py-1 text-xs"
                                      >
                                        <span className="text-gray-700">
                                          {musician.name} ({musician.email})
                                        </span>
                                        <button
                                          onClick={() =>
                                            handleInviteMusician(musician.user_id, instrument)
                                          }
                                          disabled={inviting}
                                          className="text-purple-600 hover:text-purple-800 disabled:opacity-50"
                                        >
                                          {inviting ? 'Inviting...' : 'Invite'}
                                        </button>
                                      </div>
                                    ))}
                                </div>
                              )}

                              {inviteSearchName &&
                                inviteSearchResults.length === 0 &&
                                !inviting && (
                                  <p className="text-xs text-gray-500">
                                    No musicians found matching that name.
                                  </p>
                                )}
                            </div>
                          )}
                        </div>
                      )}

                      {isGigPoster && (
                        <div className="mt-3">
                          {pendingApps.length > 0 && (
                            <div className="mb-3">
                              <p className="mb-2 text-sm font-semibold text-gray-900">
                                Pending Applications ({pendingApps.length}):
                              </p>
                              <div className="space-y-2">
                                {pendingApps.map((app) => (
                                  <div
                                    key={app.id}
                                    className="flex items-center justify-between rounded-md border border-yellow-200 bg-yellow-50 p-3"
                                  >
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-gray-900">
                                        {app.musician?.name || 'Unknown'}
                                      </p>
                                      <p className="text-xs text-gray-600">
                                        {app.musician?.email || 'No email'}
                                      </p>
                                      <p className="mt-1 text-xs text-gray-500">
                                        Applied: {format(new Date(app.created_at), 'PPp')}
                                      </p>
                                    </div>
                                    <div className="ml-4 flex gap-2">
                                      <button
                                        onClick={() => handleAcceptApplication(app.id)}
                                        className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                                      >
                                        Accept
                                      </button>
                                      <button
                                        onClick={() => handleRejectApplication(app.id)}
                                        className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {instrumentApps.filter((app) => app.status !== 'pending').length > 0 && (
                            <div>
                              <p className="mb-2 text-sm font-semibold text-gray-900">
                                Application History:
                              </p>
                              <div className="space-y-2">
                                {instrumentApps
                                  .filter((app) => app.status !== 'pending')
                                  .map((app) => {
                                    const isMyAcceptedApplication = app.status === 'accepted' && app.musician_id === user.id
                                    const showCalendarLinks = app.status === 'accepted'
                                    
                                    return (
                                      <div
                                        key={app.id}
                                        className={`flex items-center justify-between rounded-md p-3 ${
                                          app.status === 'accepted'
                                            ? 'bg-green-50 border border-green-200'
                                            : 'bg-gray-50 border border-gray-200'
                                        }`}
                                      >
                                        <div className="flex-1">
                                          <p className="text-sm font-medium text-gray-900">
                                            {app.musician?.name || 'Unknown'}
                                            {isMyAcceptedApplication && (
                                              <span className="ml-2 text-xs font-normal text-green-700">(You)</span>
                                            )}
                                          </p>
                                          <p className="text-xs text-gray-600">
                                            {app.musician?.email || 'No email'}
                                          </p>
                                          <p className="mt-1 text-xs text-gray-500">
                                            Applied: {format(new Date(app.created_at), 'PPp')}
                                          </p>
                                          {showCalendarLinks && (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                              <a
                                                href={generateGoogleCalendarLink({
                                                  title: `${gig.title} - ${app.instrument}`,
                                                  description: gig.description || `Playing ${app.instrument} at ${gig.title}`,
                                                  location: gig.location,
                                                  startTime: new Date(gig.datetime),
                                                })}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
                                              >
                                                📅 Add to Google Calendar
                                              </a>
                                              <button
                                                onClick={() => {
                                                  downloadICalFile({
                                                    title: `${gig.title} - ${app.instrument}`,
                                                    description: gig.description || `Playing ${app.instrument} at ${gig.title}`,
                                                    location: gig.location,
                                                    startTime: new Date(gig.datetime),
                                                  })
                                                }}
                                                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                              >
                                                📥 Download .ics
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                        <span
                                          className={`ml-4 rounded-full px-3 py-1 text-xs font-medium ${
                                            app.status === 'accepted'
                                              ? 'bg-green-100 text-green-800'
                                              : 'bg-gray-100 text-gray-800'
                                          }`}
                                        >
                                          {app.status}
                                        </span>
                                      </div>
                                    )
                                  })}
                              </div>
                            </div>
                          )}

                          {instrumentApps.length === 0 && (
                            <p className="mt-2 text-sm text-gray-500">
                              No applications yet for this instrument.
                            </p>
                          )}
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

