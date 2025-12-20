'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { VenueNetwork, VenueInvitation } from '@/lib/supabase/types'
import { INSTRUMENTS, type Instrument } from '@/lib/supabase/types'

interface VenueNetworkContentProps {
  venueId: string
  user: User
}

export default function VenueNetworkContent({ venueId, user }: VenueNetworkContentProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [networkMembers, setNetworkMembers] = useState<VenueNetwork[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [adding, setAdding] = useState(false)
  const [createdInvitation, setCreatedInvitation] = useState<VenueInvitation | null>(null)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    instruments: [] as Instrument[],
  })
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadNetwork()
  }, [venueId])

  const loadNetwork = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/venues/${venueId}/network`)
      const { network, error: networkError } = await response.json()

      if (networkError) throw new Error(networkError)

      setNetworkMembers(network || [])
    } catch (error: any) {
      console.error('Error loading venue network:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const searchMusicians = async () => {
    if (!searchQuery.trim()) return

    setSearching(true)
    setError(null)

    try {
      const { data: musicians, error: searchError } = await supabase
        .from('musicians')
        .select('*')
        .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(10)

      if (searchError) throw searchError

      // Filter out musicians already in network
      const networkMusicianIds = networkMembers.map((m) => m.musician_id)
      const filtered = musicians?.filter(
        (m) => !networkMusicianIds.includes(m.user_id)
      ) || []

      setSearchResults(filtered)
    } catch (error: any) {
      console.error('Error searching musicians:', error)
      setError(error.message)
    } finally {
      setSearching(false)
    }
  }

  const handleInstrumentToggle = (instrument: Instrument | 'Voice') => {
    if (instrument === 'Voice') {
      // Toggle Voice - remove all other instruments when Voice is selected
      if (formData.instruments.includes('Vocals' as Instrument)) {
        setFormData({ ...formData, instruments: [] })
      } else {
        setFormData({ ...formData, instruments: ['Vocals' as Instrument] })
      }
    } else {
      // Toggle regular instrument - remove Vocals if selecting other instruments
      const currentInstruments = formData.instruments.filter(i => i !== 'Vocals')
      if (currentInstruments.includes(instrument)) {
        setFormData({ ...formData, instruments: currentInstruments.filter(i => i !== instrument) })
      } else {
        setFormData({ ...formData, instruments: [...currentInstruments, instrument] })
      }
    }
  }

  const createInvitation = async (e: React.FormEvent) => {
    e.preventDefault()

    setAdding(true)
    setError(null)
    setCreatedInvitation(null)

    try {
      const response = await fetch(`/api/venues/${venueId}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          musician_email: formData.email || null,
          musician_first_name: formData.firstName || null,
          musician_last_name: formData.lastName || null,
          musician_phone: formData.phone || null,
          musician_instruments: formData.instruments.length > 0 ? formData.instruments : null,
          expires_in_days: 30,
        }),
      })

      const { invitation, error: inviteError } = await response.json()

      if (inviteError) throw new Error(inviteError)

      setCreatedInvitation(invitation)
      setSuccess('Invitation created successfully!')
      
      // Reset form after a delay
      setTimeout(() => {
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          instruments: [],
        })
      }, 2000)
    } catch (error: any) {
      console.error('Error creating invitation:', error)
      setError(error.message)
    } finally {
      setAdding(false)
    }
  }

  const getInvitationUrl = () => {
    if (createdInvitation) {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
      return `${baseUrl}/invite/${createdInvitation.invitation_code}`
    }
    return ''
  }

  const copyInvitationCode = () => {
    if (createdInvitation) {
      const invitationUrl = getInvitationUrl()
      navigator.clipboard.writeText(invitationUrl)
      setSuccess('Invitation URL copied to clipboard!')
      setTimeout(() => setSuccess(null), 2000)
    }
  }

  const addToNetwork = async (musicianUserId: string) => {
    try {
      const response = await fetch(`/api/venues/${venueId}/network`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ musicianId: musicianUserId }),
      })

      const { networkMember, error: addError } = await response.json()

      if (addError) throw new Error(addError)

      setSuccess('Musician added to venue network!')
      setSearchQuery('')
      setSearchResults([])
      await loadNetwork()
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: any) {
      console.error('Error adding to network:', error)
      setError(error.message)
    }
  }

  const removeFromNetwork = async (musicianId: string) => {
    if (!confirm('Are you sure you want to remove this musician from the venue network?')) {
      return
    }

    try {
      const response = await fetch(
        `/api/venues/${venueId}/network?musicianId=${musicianId}`,
        {
          method: 'DELETE',
        }
      )

      const { error: deleteError } = await response.json()

      if (deleteError) throw new Error(deleteError)

      setSuccess('Musician removed from venue network!')
      await loadNetwork()
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: any) {
      console.error('Error removing from network:', error)
      setError(error.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-lg text-gray-900">Loading venue network...</div>
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Venue Network</h3>
          <p className="mt-1 text-sm text-gray-900">
            Build a network of musicians for this venue. These musicians can be invited to specific gigs.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
          title="Add musician to network"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      </div>

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

      {/* Search and Add */}
      <div className="mb-6">
        <div className="flex gap-2">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchMusicians()}
            placeholder="Search by name or email..."
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
          />
          <button
            onClick={searchMusicians}
            disabled={searching || !searchQuery.trim()}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-gray-400"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="mt-4 rounded-md border border-gray-200">
            {searchResults.map((musician) => (
              <div
                key={musician.id}
                className="flex items-center justify-between border-b border-gray-200 p-3 last:border-b-0"
              >
                <div>
                  <div className="font-medium text-gray-900">{musician.name}</div>
                  <div className="text-sm text-gray-600">{musician.email}</div>
                  {musician.instruments && musician.instruments.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {musician.instruments.map((inst: string) => (
                        <span
                          key={inst}
                          className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-800"
                        >
                          {inst}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => addToNetwork(musician.user_id)}
                  className="rounded-md bg-indigo-600 px-3 py-1 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Network Members List */}
      <div>
        <h4 className="mb-3 text-lg font-semibold text-gray-900">
          Network Members ({networkMembers.length})
        </h4>
        {networkMembers.length === 0 ? (
          <p className="text-gray-900">No musicians in venue network yet.</p>
        ) : (
          <div className="space-y-2">
            {networkMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-md border border-gray-200 p-3"
              >
                <div>
                  <div className="font-medium text-gray-900">
                    {member.musician?.name || 'Unknown'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {member.musician?.email || 'No email'}
                  </div>
                  {member.musician?.instruments &&
                    member.musician.instruments.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {member.musician.instruments.map((inst) => (
                          <span
                            key={inst}
                            className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-800"
                          >
                            {inst}
                          </span>
                        ))}
                      </div>
                    )}
                </div>
                <button
                  onClick={() => removeFromNetwork(member.musician_id)}
                  className="rounded-md bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Musician Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Invite Musician to Venue Network</h3>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setFormData({
                    firstName: '',
                    lastName: '',
                    email: '',
                    phone: '',
                    instruments: [],
                  })
                  setCreatedInvitation(null)
                  setError(null)
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {createdInvitation ? (
              <div className="space-y-4">
                <div className="rounded-md bg-green-50 p-4">
                  <h4 className="text-lg font-semibold text-green-900 mb-2">Invitation Created Successfully!</h4>
                  <p className="text-sm text-green-800 mb-4">
                    Share this invitation URL with the musician so they can join the venue network.
                  </p>
                  <div className="space-y-2">
                    <div className="rounded-md bg-white border-2 border-green-500 px-4 py-3">
                      <div className="text-xs text-gray-500 mb-1">Invitation Code</div>
                      <div className="text-xl font-mono font-bold text-gray-900">{createdInvitation.invitation_code}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 rounded-md bg-white border-2 border-green-500 px-4 py-3">
                        <div className="text-xs text-gray-500 mb-1">Invitation URL</div>
                        <div className="text-sm font-mono text-gray-900 break-all">{getInvitationUrl()}</div>
                      </div>
                      <button
                        onClick={copyInvitationCode}
                        className="rounded-md bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700 whitespace-nowrap"
                      >
                        Copy URL
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setShowAddModal(false)
                      setCreatedInvitation(null)
                      setFormData({
                        firstName: '',
                        lastName: '',
                        email: '',
                        phone: '',
                        instruments: [],
                      })
                    }}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={createInvitation} className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  Fill in any information you know about the musician. All fields are optional. An invitation code will be generated that you can share with them.
                </p>

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

                {error && (
                  <div className="rounded-md bg-red-50 p-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false)
                      setFormData({
                        firstName: '',
                        lastName: '',
                        email: '',
                        phone: '',
                        instruments: [],
                      })
                      setError(null)
                    }}
                    className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adding}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-gray-400"
                  >
                    {adding ? 'Creating Invitation...' : 'Create Invitation'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

