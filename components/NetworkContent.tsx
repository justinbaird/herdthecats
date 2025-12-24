'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'
import Navigation from './Navigation'
import VenueNetworkContent from './VenueNetworkContent'
import type { Venue } from '@/lib/supabase/types'

interface NetworkMember {
  id: string
  network_member_id: string
  musician: {
    id: string
    name: string
    email: string
    instruments: string[]
  } | null
}

export default function NetworkContent({ user }: { user: User }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [networkMembers, setNetworkMembers] = useState<NetworkMember[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isVenueManager, setIsVenueManager] = useState(false)
  const [venues, setVenues] = useState<Venue[]>([])
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)

  useEffect(() => {
    checkVenueManagerStatus()
  }, [])

  useEffect(() => {
    if (isVenueManager && selectedVenueId) {
      // Venue manager view - don't load regular network
      setLoading(false)
    } else if (!isVenueManager) {
      // Regular musician view - load network
      loadNetwork()
    }
  }, [isVenueManager, selectedVenueId])

  const checkVenueManagerStatus = async () => {
    try {
      const response = await fetch('/api/venue-manager/venues')
      if (response.ok) {
        const data = await response.json()
        if (data.venues && data.venues.length > 0) {
          setIsVenueManager(true)
          setVenues(data.venues)
          setSelectedVenueId(data.venues[0].id)
        } else {
          setIsVenueManager(false)
          loadNetwork()
        }
      } else {
        setIsVenueManager(false)
        loadNetwork()
      }
    } catch (error) {
      console.error('Error checking venue manager status:', error)
      setIsVenueManager(false)
      loadNetwork()
    }
  }

  const loadNetwork = async () => {
    try {
      const { data, error } = await supabase
        .from('networks')
        .select(`
          id,
          network_member_id
        `)
        .eq('user_id', user.id)

      if (error) throw error

      // Get musician details for each network member
      if (data && data.length > 0) {
        const memberUserIds = data.map((n) => n.network_member_id)
        const { data: musicians, error: musiciansError } = await supabase
          .from('musicians')
          .select('id, name, email, instruments, user_id')
          .in('user_id', memberUserIds)

        if (musiciansError) throw musiciansError

        // Combine network and musician data
        const combined: NetworkMember[] = data.map((network) => ({
          ...network,
          musician: musicians?.find((m) => m.user_id === network.network_member_id) || null,
        }))

        setNetworkMembers(combined)
      } else {
        setNetworkMembers([])
      }
    } catch (error: any) {
      console.error('Error loading network:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const searchMusicians = async () => {
    if (!searchQuery.trim()) return

    setSearching(true)
    setError(null)
    setSearchResults([])

    try {
      const query = searchQuery.trim().toLowerCase()
      const isEmailQuery = query.includes('@')
      
      let data: any[] = []
      
      if (isEmailQuery) {
        // If it looks like an email, search by email
        const { data: emailData, error: emailError } = await supabase
          .from('musicians')
          .select('id, name, email, instruments, user_id')
          .ilike('email', `%${query}%`)
          .neq('user_id', user.id)
          .limit(20)

        if (emailError) throw emailError
        data = emailData || []
      } else {
        // Otherwise, search by name
        // Split search query into parts (handles first name, last name, or both)
        const nameParts = query.split(/\s+/)
        
        // Get all musicians (we'll filter client-side for name matching)
        const { data: allMusicians, error: allError } = await supabase
          .from('musicians')
          .select('id, name, email, instruments, user_id')
          .neq('user_id', user.id)
          .limit(50)

        if (allError) throw allError

        // Filter results client-side to match name parts
        data = (allMusicians || []).filter((musician) => {
          const fullName = (musician.name || '').toLowerCase()
          // Check if all search parts match the name
          return nameParts.every(part => fullName.includes(part))
        })
      }

      // Filter out musicians already in network
      const networkUserIds = networkMembers.map((m) => m.network_member_id)
      const filtered = data.filter(
        (m) => !networkUserIds.includes(m.user_id)
      )

      setSearchResults(filtered.slice(0, 10))
    } catch (error: any) {
      console.error('Error searching:', error)
      setError(error.message)
    } finally {
      setSearching(false)
    }
  }

  const addToNetwork = async (memberUserId: string) => {
    try {
      const { error } = await supabase.from('networks').insert({
        user_id: user.id,
        network_member_id: memberUserId,
      })

      if (error) throw error

      setSuccess('Musician added to network!')
      setSearchQuery('')
      setSearchResults([])
      await loadNetwork()
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: any) {
      console.error('Error adding to network:', error)
      setError(error.message)
    }
  }

  const removeFromNetwork = async (networkId: string) => {
    if (!confirm('Are you sure you want to remove this musician from your network?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('networks')
        .delete()
        .eq('id', networkId)

      if (error) throw error

      setSuccess('Musician removed from network!')
      await loadNetwork()
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: any) {
      console.error('Error removing from network:', error)
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

  // Show Venue Network for venue managers
  if (isVenueManager && selectedVenueId) {
    const selectedVenue = venues.find((v) => v.id === selectedVenueId)
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} />
        <main className="mx-auto max-w-4xl py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Venue Network</h2>
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
            {selectedVenue && (
              <p className="mb-4 text-sm text-gray-900">
                Manage musicians in the network for <strong>{selectedVenue.name}</strong>.
              </p>
            )}
            <VenueNetworkContent venueId={selectedVenueId} user={user} />
          </div>
        </main>
      </div>
    )
  }

  // Regular musician network view
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} />

      <main className="mx-auto max-w-4xl py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">My Network</h2>
            <p className="mt-2 text-sm text-gray-900">
              Build your network of musicians you want to play with. When you post a gig, all musicians in your network will be notified.
            </p>
            <p className="mt-2 text-xs text-gray-900">
              Note: All gigs are visible to everyone on the platform. Your network only determines who receives notifications when you post new gigs.
            </p>
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

          <div className="mb-6 rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Add Musician to Network
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchMusicians()}
                placeholder="Search by name (first, last, or both) or email..."
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
              <button
                onClick={searchMusicians}
                disabled={searching || !searchQuery.trim()}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Search Results:</h4>
                {searchResults.map((musician) => (
                  <div
                    key={musician.id}
                    className="flex items-center justify-between rounded-md border border-gray-200 p-3"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{musician.name}</p>
                      <p className="text-sm text-gray-900">{musician.email}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {musician.instruments.map((inst: string) => (
                          <span
                            key={inst}
                            className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                          >
                            {inst}
                          </span>
                        ))}
                      </div>
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

          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Network Members ({networkMembers.length})
            </h3>
            {networkMembers.length === 0 ? (
              <p className="text-sm text-gray-900">
                No musicians in your network yet. Search above to add some!
              </p>
            ) : (
              <div className="space-y-4">
                {networkMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-md border border-gray-200 p-4"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {member.musician?.name || 'Unknown'}
                      </p>
                      <p className="text-sm text-gray-900">
                        {member.musician?.email || 'No email'}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {member.musician?.instruments?.map((inst: string) => (
                          <span
                            key={inst}
                            className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-800"
                          >
                            {inst}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromNetwork(member.id)}
                      className="rounded-md bg-red-100 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-200"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

