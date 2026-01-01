'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { INSTRUMENTS, type Instrument } from '@/lib/supabase/types'
import Navigation from './Navigation'

export default function NewGigContent({ user, initialVenueId, initialDate, initialEntryType }: { user: User; initialVenueId?: string; initialDate?: string; initialEntryType?: 'gig' | 'rehearsal' }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [datetime, setDatetime] = useState('')
  const [callTime, setCallTime] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [numberOfSets, setNumberOfSets] = useState('2 longer or 3 shorter sets')
  const [venueId, setVenueId] = useState<string | null>(initialVenueId || null)
  const [managedVenues, setManagedVenues] = useState<any[]>([])
  const [entryType, setEntryType] = useState<'gig' | 'rehearsal'>(initialEntryType || 'gig')
  const [musicChartsUrl, setMusicChartsUrl] = useState('')
  const [leadMusicianId, setLeadMusicianId] = useState<string | null>(null)
  const [leadMusicianSearch, setLeadMusicianSearch] = useState('')
  const [leadMusicianResults, setLeadMusicianResults] = useState<any[]>([])
  const [searchingLeadMusician, setSearchingLeadMusician] = useState(false)
  // Slots: array of { instruments: Instrument[], inviteOnly: boolean, payment: string }
  const [slots, setSlots] = useState<Array<{ instruments: Instrument[], inviteOnly: boolean, payment: string }>>([{ instruments: [], inviteOnly: false, payment: '' }])

  // Set default times when component mounts or date changes
  useEffect(() => {
    // Use initialDate if provided, otherwise use today's date
    const dateStr = initialDate || new Date().toISOString().split('T')[0]
    
    // Set default times
    // Start time: 8:30 PM (20:30)
    setStartTime(`${dateStr}T20:30`)
    // Call time: 7:30 PM (19:30) - 1 hour earlier
    setCallTime(`${dateStr}T19:30`)
    // End time: 11:00 PM (23:00)
    setEndTime(`${dateStr}T23:00`)
    // Also set datetime for backwards compatibility
    setDatetime(`${dateStr}T20:30`)
  }, [initialDate])

  // Load managed venues on mount
  useEffect(() => {
    const loadManagedVenues = async () => {
      try {
        const { data: managers } = await supabase
          .from('venue_managers')
          .select('venue_id')
          .eq('user_id', user.id)

        if (managers && managers.length > 0) {
          const venueIds = managers.map((m) => m.venue_id)
          const response = await fetch('/api/venues')
          const { venues } = await response.json()
          const managed = venues.filter((v: any) => venueIds.includes(v.id))
          setManagedVenues(managed)
        }
      } catch (error) {
        console.error('Error loading managed venues:', error)
      }
    }
    loadManagedVenues()
  }, [])

  // Search for lead musician (from venue network if venue is selected)
  const searchLeadMusician = async () => {
    if (!leadMusicianSearch.trim() || !venueId) return

    setSearchingLeadMusician(true)
    try {
      // First try to get from venue network
      const networkResponse = await fetch(`/api/venues/${venueId}/network`)
      const { network } = await networkResponse.json()

      if (network && network.length > 0) {
        const query = leadMusicianSearch.toLowerCase()
        const filtered = network.filter((member: any) => {
          const name = member.musician?.name?.toLowerCase() || ''
          const email = member.musician?.email?.toLowerCase() || ''
          return name.includes(query) || email.includes(query)
        })
        setLeadMusicianResults(filtered.map((m: any) => ({
          ...m.musician,
          user_id: m.musician_id,
        })))
      } else {
        // Fallback to general musician search
        const { data: musicians } = await supabase
          .from('musicians')
          .select('*')
          .or(`name.ilike.%${leadMusicianSearch}%,email.ilike.%${leadMusicianSearch}%`)
          .limit(10)
        setLeadMusicianResults(musicians || [])
      }
    } catch (error) {
      console.error('Error searching lead musician:', error)
    } finally {
      setSearchingLeadMusician(false)
    }
  }

  // Slot management functions
  const addSlot = () => {
    setSlots((prev) => [...prev, { instruments: [], inviteOnly: false, payment: '' }])
  }

  const removeSlot = (slotIndex: number) => {
    if (slots.length <= 1) {
      setError('You must have at least one slot')
      return
    }
    setSlots((prev) => prev.filter((_, idx) => idx !== slotIndex))
  }

  const toggleInstrumentInSlot = (slotIndex: number, instrument: Instrument) => {
    setSlots((prev) =>
      prev.map((slot, idx) =>
        idx === slotIndex
          ? {
              ...slot,
              instruments: slot.instruments.includes(instrument)
                ? slot.instruments.filter((i) => i !== instrument)
                : [...slot.instruments, instrument],
            }
          : slot
      )
    )
  }

  const toggleInviteOnly = (slotIndex: number) => {
    setSlots((prev) =>
      prev.map((slot, idx) =>
        idx === slotIndex ? { ...slot, inviteOnly: !slot.inviteOnly } : slot
      )
    )
  }

  const setPaymentForSlot = (slotIndex: number, value: string) => {
    setSlots((prev) =>
      prev.map((slot, idx) =>
        idx === slotIndex ? { ...slot, payment: value } : slot
      )
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Validate slots
    const validSlots = slots.filter((slot) => slot.instruments.length > 0)
    if (validSlots.length === 0) {
      setError('Please add at least one slot with at least one instrument')
      setLoading(false)
      return
    }

    // Validate at least start_time is provided (or datetime for backwards compatibility)
    if (!startTime && !datetime) {
      setError('Please select a start time')
      setLoading(false)
      return
    }

    try {
      // Convert datetime-local values to ISO strings with timezone
      // Use startTime if provided, otherwise fall back to datetime for backwards compatibility
      const primaryDatetime = startTime || datetime
      
      // Create date objects treating inputs as local time
      const startDateObj = startTime ? new Date(startTime) : new Date(datetime)
      
      if (isNaN(startDateObj.getTime())) {
        setError('Invalid start time')
        setLoading(false)
        return
      }

      const isoDatetime = startDateObj.toISOString()
      const isoStartTime = startTime ? startDateObj.toISOString() : null
      
      // Convert other time fields if provided
      const isoCallTime = callTime ? new Date(callTime).toISOString() : null
      const isoEndTime = endTime ? new Date(endTime).toISOString() : null
      
      // Validate call time is before start time if both provided
      if (callTime && startTime && new Date(callTime) >= new Date(startTime)) {
        setError('Call time must be before start time')
        setLoading(false)
        return
      }
      
      // Validate start time is before end time if both provided
      if (startTime && endTime && new Date(startTime) >= new Date(endTime)) {
        setError('Start time must be before end time')
        setLoading(false)
        return
      }

      // Prepare slot-based data
      const instrumentSlots = validSlots.map((slot) => slot.instruments)
      const inviteOnlySlots = validSlots
        .map((slot, idx) => (slot.inviteOnly ? idx : null))
        .filter((idx) => idx !== null) as number[]
      const paymentPerSlot = validSlots
        .map((slot, idx) => {
          if (slot.payment && slot.payment.trim() && !isNaN(parseFloat(slot.payment))) {
            return { slotIndex: idx, amount: parseFloat(slot.payment) }
          }
          return null
        })
        .filter((p) => p !== null) as Array<{ slotIndex: number; amount: number }>

      // Also maintain backwards compatibility with required_instruments (flatten all instruments)
      const allInstruments = validSlots.flatMap((slot) => slot.instruments)
      const uniqueInstruments = Array.from(new Set(allInstruments)) as Instrument[]

      const { data, error } = await supabase
        .from('gigs')
        .insert({
          posted_by: user.id,
          title,
          description: description || null,
          location,
          datetime: isoDatetime, // Keep for backwards compatibility
          call_time: isoCallTime,
          start_time: isoStartTime,
          end_time: isoEndTime,
          number_of_sets: numberOfSets && numberOfSets.trim() ? numberOfSets.trim() : null,
          required_instruments: uniqueInstruments, // Backwards compatibility
          instrument_slots: instrumentSlots,
          invite_only_slots: inviteOnlySlots,
          payment_per_slot: entryType === 'gig' ? paymentPerSlot : [], // Only for gigs
          entry_type: entryType,
          music_charts_url: entryType === 'rehearsal' ? (musicChartsUrl || null) : null,
          venue_id: venueId || null,
          lead_musician_id: leadMusicianId || null,
        })
        .select()
        .single()

      if (error) throw error

      // Notify lead musician only if one is selected
      if (leadMusicianId) {
        try {
          await fetch('/api/gigs/notify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ gigId: data.id, leadMusicianId }),
          })
        } catch (notifyError) {
          // Don't fail the gig creation if notification fails
          console.error('Failed to send notification:', notifyError)
        }
      }

      // If venue gig, redirect back to venue calendar
      if (venueId) {
        router.push(`/venues/${venueId}`)
      } else {
        router.push(`/gigs/${data.id}`)
      }
    } catch (error: any) {
      console.error('Error creating gig:', error)
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} />

      <main className="mx-auto max-w-4xl py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Post a New Entry</h2>
            <p className="mt-2 text-sm text-gray-900">
              Create a new gig or rehearsal. It will be visible to all users, and your network members will be notified.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="rounded-lg bg-white p-6 shadow">
            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="space-y-6">
              {/* Entry Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Entry Type *
                </label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="type-gig"
                      name="entry-type"
                      value="gig"
                      checked={entryType === 'gig'}
                      onChange={() => setEntryType('gig')}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="type-gig" className="ml-2 text-sm text-gray-900">Gig (Paid)</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="type-rehearsal"
                      name="entry-type"
                      value="rehearsal"
                      checked={entryType === 'rehearsal'}
                      onChange={() => setEntryType('rehearsal')}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="type-rehearsal" className="ml-2 text-sm text-gray-900">Rehearsal (Unpaid)</label>
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-900">
                  Gigs are paid performances. Rehearsals are unpaid practice sessions.
                </p>
              </div>

              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700"
                >
                  {entryType === 'rehearsal' ? 'Rehearsal' : 'Gig'} Title *
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  placeholder={entryType === 'rehearsal' ? 'e.g., Rehearsal for Jazz Night' : 'e.g., Jazz Night at The Blue Note'}
                />
              </div>

              {managedVenues.length > 0 && (
                <div>
                  <label
                    htmlFor="venue"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Venue (Optional)
                  </label>
                  <select
                    id="venue"
                    value={venueId || ''}
                    onChange={(e) => setVenueId(e.target.value || null)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">No venue (regular gig)</option>
                    {managedVenues.map((venue) => (
                      <option key={venue.id} value={venue.id}>
                        {venue.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-900">
                    Select a venue to post this {entryType === 'rehearsal' ? 'rehearsal' : 'gig'} on the venue calendar. Only venues you manage are shown.
                  </p>
                </div>
              )}

              {/* Lead Musician Selection - only for venue gigs */}
              {venueId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Lead Musician (Optional)
                  </label>
                  <p className="mt-1 text-xs text-gray-900 mb-2">
                    Select a lead musician to manage musician slots. Once they accept, they'll have full control over configuring slots.
                  </p>
                  {leadMusicianId ? (
                    <div className="flex items-center justify-between rounded-md border border-gray-300 bg-gray-50 p-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {leadMusicianResults.find(m => m.user_id === leadMusicianId)?.name || 'Selected musician'}
                        </p>
                        <p className="text-xs text-gray-600">
                          {leadMusicianResults.find(m => m.user_id === leadMusicianId)?.email || ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setLeadMusicianId(null)
                          setLeadMusicianResults([])
                          setLeadMusicianSearch('')
                        }}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={leadMusicianSearch}
                          onChange={(e) => setLeadMusicianSearch(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), searchLeadMusician())}
                          placeholder="Search by name or email..."
                          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                        />
                        <button
                          type="button"
                          onClick={searchLeadMusician}
                          disabled={searchingLeadMusician || !leadMusicianSearch.trim()}
                          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                        >
                          {searchingLeadMusician ? 'Searching...' : 'Search'}
                        </button>
                      </div>
                      {leadMusicianResults.length > 0 && (
                        <div className="mt-2 space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded-md">
                          {leadMusicianResults.map((musician) => (
                            <button
                              key={musician.user_id}
                              type="button"
                              onClick={() => {
                                setLeadMusicianId(musician.user_id)
                                setLeadMusicianResults([])
                                setLeadMusicianSearch('')
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-indigo-50 text-sm"
                            >
                              <p className="font-medium text-gray-900">{musician.name}</p>
                              <p className="text-xs text-gray-600">{musician.email}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Music Charts URL for Rehearsals */}
              {entryType === 'rehearsal' && (
                <div>
                  <label
                    htmlFor="musicChartsUrl"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Music Charts URL
                  </label>
                  <input
                    type="url"
                    id="musicChartsUrl"
                    value={musicChartsUrl}
                    onChange={(e) => setMusicChartsUrl(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                    placeholder="https://drive.google.com/... or https://dropbox.com/..."
                  />
                  <p className="mt-1 text-xs text-gray-900">
                    Optional: Link to music charts (Google Drive, Dropbox, etc.)
                  </p>
                </div>
              )}

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  placeholder="Additional details about the gig..."
                />
              </div>

              <div>
                <label
                  htmlFor="location"
                  className="block text-sm font-medium text-gray-700"
                >
                  Location *
                </label>
                <input
                  type="text"
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  placeholder="Venue name and address"
                />
              </div>

              <div>
                <label
                  htmlFor="start-time"
                  className="block text-sm font-medium text-gray-700"
                >
                  Start Time *
                </label>
                <input
                  type="datetime-local"
                  id="start-time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-900">
                  When the performance starts
                </p>
              </div>

              <div>
                <label
                  htmlFor="call-time"
                  className="block text-sm font-medium text-gray-700"
                >
                  Call Time
                </label>
                <input
                  type="datetime-local"
                  id="call-time"
                  value={callTime}
                  onChange={(e) => setCallTime(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-900">
                  When musicians should arrive (optional)
                </p>
              </div>

              <div>
                <label
                  htmlFor="end-time"
                  className="block text-sm font-medium text-gray-700"
                >
                  End Time
                </label>
                <input
                  type="datetime-local"
                  id="end-time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-900">
                  When the performance ends (optional)
                </p>
              </div>

              <div>
                <label
                  htmlFor="number-of-sets"
                  className="block text-sm font-medium text-gray-700"
                >
                  Number of Sets
                </label>
                <input
                  type="text"
                  id="number-of-sets"
                  value={numberOfSets}
                  onChange={(e) => setNumberOfSets(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  placeholder="2 longer or 3 shorter sets"
                />
                <p className="mt-1 text-xs text-gray-900">
                  Optional: Describe the number and length of sets
                </p>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Musician Slots *
                  </label>
                  <button
                    type="button"
                    onClick={addSlot}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    + Add Slot
                  </button>
                </div>
                <p className="mb-3 text-xs text-gray-900">
                  Each slot represents one musician position. You can require multiple instruments per slot (e.g., "Alto Sax AND Soprano Sax").
                </p>
                <div className="space-y-4">
                  {slots.map((slot, slotIndex) => (
                    <div
                      key={slotIndex}
                      className="rounded-lg border border-gray-300 p-4 bg-gray-50"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-700">
                          Slot {slotIndex + 1}
                        </h4>
                        {slots.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSlot(slotIndex)}
                            className="text-xs text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-900 mb-2">
                          Required Instruments (select all for this slot):
                        </label>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                          {INSTRUMENTS.map((instrument) => {
                            const isSelected = slot.instruments.includes(instrument)
                            return (
                              <label
                                key={instrument}
                                className="flex items-center space-x-2 cursor-pointer rounded border border-gray-200 p-2 hover:bg-white"
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleInstrumentInSlot(slotIndex, instrument)}
                                  className="h-3 w-3 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-xs text-gray-700">{instrument}</span>
                              </label>
                            )
                          })}
                        </div>
                        {slot.instruments.length === 0 && (
                          <p className="mt-1 text-xs text-red-600">
                            Select at least one instrument for this slot
                          </p>
                        )}
                      </div>

                      <div className="flex items-start gap-4">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={slot.inviteOnly}
                            onChange={() => toggleInviteOnly(slotIndex)}
                            className="h-3 w-3 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-xs text-purple-600 font-medium">
                            Invite Only
                          </span>
                        </label>
                        {entryType === 'gig' && (
                          <div className="flex-1 max-w-xs">
                            <label className="block text-xs text-gray-900 mb-1">
                              Payment ($):
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={slot.payment}
                              onChange={(e) => setPaymentForSlot(slotIndex, e.target.value)}
                              placeholder="Optional"
                              className="block w-full rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Link
                  href="/gigs"
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading || slots.filter(slot => slot.instruments.length > 0).length === 0}
                  className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {loading ? 'Posting...' : entryType === 'rehearsal' ? 'Post Rehearsal' : 'Post Gig'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

