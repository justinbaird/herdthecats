'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { VenueManagerInvitation, Venue } from '@/lib/supabase/types'

interface ManagerInviteContentProps {
  invitationCode: string
  user: User | null
}

export default function ManagerInviteContent({ invitationCode, user: initialUser }: ManagerInviteContentProps) {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(initialUser)
  const [loading, setLoading] = useState(true)
  const [invitation, setInvitation] = useState<VenueManagerInvitation | null>(null)
  const [venue, setVenue] = useState<Venue | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)

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
      const response = await fetch(`/api/manager-invite/${invitationCode}`)
      
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
      setVenue(inviteData.venue)
    } catch (err: any) {
      setError(err.message || 'Failed to load invitation')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async () => {
    if (!user) {
      // Redirect to login with redirect back to this page
      const loginUrl = `/login?redirect=${encodeURIComponent(`/manager-invite/${invitationCode}`)}`
      router.push(loginUrl)
      return
    }

    // Check if email matches
    if (invitation && user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      setError(`This invitation is for ${invitation.email}, but you are logged in as ${user.email}`)
      return
    }

    try {
      setAccepting(true)
      setError(null)

      const response = await fetch(`/api/manager-invite/${invitationCode}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invitation')
      }

      // Redirect to profile setup or dashboard
      router.push('/venue-manager/setup')
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation')
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
          <div className="text-center">
            <div className="text-lg text-gray-900">Loading invitation...</div>
          </div>
        </div>
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
          <h2 className="mb-4 text-2xl font-semibold text-red-600">Invitation Error</h2>
          <p className="text-gray-900 mb-6">{error}</p>
          <Link
            href="/login"
            className="block w-full rounded-md bg-indigo-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700"
          >
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  if (!invitation) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <h2 className="mb-2 text-2xl font-bold text-gray-900">You're Invited!</h2>
        <p className="mb-6 text-gray-900">
          You've been invited to become a Venue Manager for <strong>{venue?.name}</strong>
        </p>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {!user ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-900">
              Please sign in or create an account to accept this invitation.
            </p>
            <div className="flex gap-3">
              <Link
                href={`/login?redirect=${encodeURIComponent(`/manager-invite/${invitationCode}`)}`}
                className="flex-1 rounded-md bg-indigo-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700"
              >
                Sign In
              </Link>
              <Link
                href={`/signup?redirect=${encodeURIComponent(`/manager-invite/${invitationCode}`)}`}
                className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Sign Up
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {user.email?.toLowerCase() !== invitation.email.toLowerCase() && (
              <div className="rounded-md bg-yellow-50 p-4">
                <p className="text-sm text-yellow-800">
                  This invitation is for {invitation.email}, but you are logged in as {user.email}.
                  Please log out and sign in with the correct email.
                </p>
              </div>
            )}
            <button
              onClick={handleAccept}
              disabled={accepting || user.email?.toLowerCase() !== invitation.email.toLowerCase()}
              className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {accepting ? 'Accepting...' : 'Accept Invitation'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}


