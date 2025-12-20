'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { VenueInvitation } from '@/lib/supabase/types'
import { INSTRUMENTS, type Instrument } from '@/lib/supabase/types'

interface InviteContentProps {
  invitationCode: string
  user: User | null
}

export default function InviteContent({ invitationCode, user: initialUser }: InviteContentProps) {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(initialUser)
  const [loading, setLoading] = useState(true)
  const [invitation, setInvitation] = useState<VenueInvitation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    instruments: [] as Instrument[],
  })

  useEffect(() => {
    // Check auth status on client side
    const checkAuth = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        setUser(authUser)
      } catch (err) {
        // Ignore auth errors
      }
    }
    checkAuth()
    loadInvitation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invitationCode])

  const loadInvitation = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/invitations/${invitationCode}`)
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`)
      }

      const data = await response.json()
      const { invitation: inviteData, error: inviteError } = data

      if (!response.ok) {
        throw new Error(inviteError || `HTTP error! status: ${response.status}`)
      }

      if (inviteError) throw new Error(inviteError)
      if (!inviteData) throw new Error('Invitation not found')

      // Check if expired
      if (inviteData.expires_at && new Date(inviteData.expires_at) < new Date()) {
        throw new Error('This invitation has expired')
      }

      // Check if already accepted
      if (inviteData.status === 'accepted') {
        throw new Error('This invitation has already been accepted')
      }

      setInvitation(inviteData)

      // Pre-fill form with invitation data if available
      if (inviteData.musician_first_name) {
        setFormData((prev) => ({ ...prev, firstName: inviteData.musician_first_name }))
      }
      if (inviteData.musician_last_name) {
        setFormData((prev) => ({ ...prev, lastName: inviteData.musician_last_name }))
      }
      if (inviteData.musician_email) {
        setFormData((prev) => ({ ...prev, email: inviteData.musician_email }))
      }
      if (inviteData.musician_phone) {
        setFormData((prev) => ({ ...prev, phone: inviteData.musician_phone }))
      }
      if (inviteData.musician_instruments && inviteData.musician_instruments.length > 0) {
        setFormData((prev) => ({ ...prev, instruments: inviteData.musician_instruments }))
      }
    } catch (error: any) {
      console.error('Error loading invitation:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInstrumentToggle = (instrument: Instrument | 'Voice') => {
    if (instrument === 'Voice') {
      if (formData.instruments.includes('Vocals' as Instrument)) {
        setFormData({ ...formData, instruments: [] })
      } else {
        setFormData({ ...formData, instruments: ['Vocals' as Instrument] })
      }
    } else {
      const currentInstruments = formData.instruments.filter(i => i !== 'Vocals')
      if (currentInstruments.includes(instrument)) {
        setFormData({ ...formData, instruments: currentInstruments.filter(i => i !== instrument) })
      } else {
        setFormData({ ...formData, instruments: [...currentInstruments, instrument] })
      }
    }
  }

  const acceptInvitation = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!invitation) return

    // If not logged in, redirect to signup/login
    if (!user) {
      const redirectUrl = `/invite/${invitationCode}`
      router.push(`/signup?redirect=${encodeURIComponent(redirectUrl)}`)
      return
    }

    setAccepting(true)
    setError(null)

    try {
      // Ensure user has a musician profile
      const { data: existingMusician } = await supabase
        .from('musicians')
        .select('*')
        .eq('user_id', user.id)
        .single()

      let musicianId: string

      if (!existingMusician) {
        // Create musician profile
        const { data: newMusician, error: createError } = await supabase
          .from('musicians')
          .insert({
            user_id: user.id,
            name: `${formData.firstName} ${formData.lastName}`.trim() || user.email?.split('@')[0] || 'Musician',
            email: formData.email || user.email || '',
            instruments: formData.instruments.length > 0 ? formData.instruments : [],
          })
          .select()
          .single()

        if (createError) throw createError
        musicianId = newMusician.id
      } else {
        // Update existing musician profile with invitation data
        const updateData: any = {}
        if (formData.firstName || formData.lastName) {
          const fullName = `${formData.firstName} ${formData.lastName}`.trim()
          if (fullName) updateData.name = fullName
        }
        if (formData.email) updateData.email = formData.email
        if (formData.instruments.length > 0) updateData.instruments = formData.instruments

        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase
            .from('musicians')
            .update(updateData)
            .eq('id', existingMusician.id)

          if (updateError) throw updateError
        }
        musicianId = existingMusician.id
      }

      // Accept invitation
      const response = await fetch(`/api/invitations/${invitationCode}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          instruments: formData.instruments,
        }),
      })

      const { error: acceptError } = await response.json()
      if (acceptError) throw new Error(acceptError)

      // Redirect to venue page
      router.push(`/venues/${invitation.venue_id}`)
    } catch (error: any) {
      console.error('Error accepting invitation:', error)
      setError(error.message)
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-lg text-gray-900">Loading invitation...</div>
        </div>
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
            <h2 className="mb-4 text-2xl font-semibold text-red-600">Invitation Error</h2>
            <p className="mb-6 text-gray-900">{error}</p>
            <Link
              href="/"
              className="inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Go to Homepage
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-4xl font-bold text-gray-900">You're Invited!</h1>
            <p className="text-lg text-gray-600">
              Join the venue network and connect with opportunities
            </p>
          </div>

          {/* Invitation Card */}
          <div className="rounded-lg bg-white p-8 shadow-lg">
            <h2 className="mb-2 text-2xl font-semibold text-gray-900">Join Venue Network</h2>
            <p className="mb-6 text-sm text-gray-600">
              {user
                ? "You've been invited to join a venue network. Please fill in your details below."
                : "You've been invited to join a venue network. Sign up or log in to accept this invitation."}
            </p>

            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={acceptInvitation} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                    First Name
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="John"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Doe"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="musician@example.com"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 234 567 8900"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instruments (or Voice for singers)
                </label>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleInstrumentToggle('Voice')}
                    className={`mr-2 mb-2 rounded-full px-4 py-2 text-sm font-medium ${
                      formData.instruments.includes('Vocals' as Instrument)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                    }`}
                  >
                    Voice
                  </button>
                  <div className="flex flex-wrap gap-2">
                    {INSTRUMENTS.map((instrument) => (
                      <button
                        key={instrument}
                        type="button"
                        onClick={() => handleInstrumentToggle(instrument)}
                        disabled={formData.instruments.includes('Vocals' as Instrument)}
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          formData.instruments.includes(instrument)
                            ? 'bg-indigo-600 text-white'
                            : formData.instruments.includes('Vocals' as Instrument)
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                        }`}
                      >
                        {instrument}
                      </button>
                    ))}
                  </div>
                  {formData.instruments.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      Selected: {formData.instruments.join(', ')}
                    </div>
                  )}
                </div>
              </div>

              {!user && (
                <div className="rounded-md bg-blue-50 p-4">
                  <p className="mb-3 text-sm text-blue-800">
                    You need to sign up or log in to accept this invitation.
                  </p>
                  <div className="flex gap-3">
                    <Link
                      href={`/signup?redirect=${encodeURIComponent(`/invite/${invitationCode}`)}`}
                      className="flex-1 rounded-md bg-indigo-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700"
                    >
                      Sign Up
                    </Link>
                    <Link
                      href={`/login?redirect=${encodeURIComponent(`/invite/${invitationCode}`)}`}
                      className="flex-1 rounded-md bg-gray-200 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-300"
                    >
                      Log In
                    </Link>
                  </div>
                </div>
              )}

              {user && (
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="submit"
                    disabled={accepting}
                    className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-gray-400"
                  >
                    {accepting ? 'Joining...' : 'Join Venue Network'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

