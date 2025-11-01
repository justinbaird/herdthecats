'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { INSTRUMENTS, type Instrument } from '@/lib/supabase/types'
import Navigation from './Navigation'

export default function NewGigContent({ user }: { user: User }) {
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
  const [numberOfSets, setNumberOfSets] = useState('')
  // Slots: array of { instruments: Instrument[], inviteOnly: boolean, payment: string }
  const [slots, setSlots] = useState<Array<{ instruments: Instrument[], inviteOnly: boolean, payment: string }>>([{ instruments: [], inviteOnly: false, payment: '' }])

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
          number_of_sets: numberOfSets ? parseInt(numberOfSets, 10) : null,
          required_instruments: uniqueInstruments, // Backwards compatibility
          instrument_slots: instrumentSlots,
          invite_only_slots: inviteOnlySlots,
          payment_per_slot: paymentPerSlot,
        })
        .select()
        .single()

      if (error) throw error

      // Broadcast to network - trigger notifications
      try {
        await fetch('/api/gigs/notify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ gigId: data.id }),
        })
      } catch (notifyError) {
        // Don't fail the gig creation if notification fails
        console.error('Failed to send notifications:', notifyError)
      }

      router.push(`/gigs/${data.id}`)
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
            <h2 className="text-2xl font-bold text-gray-900">Post a New Gig</h2>
            <p className="mt-2 text-sm text-gray-600">
              Create a new gig. It will be visible to all users, and your network members will be notified.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="rounded-lg bg-white p-6 shadow">
            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700"
                >
                  Gig Title *
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  placeholder="e.g., Jazz Night at The Blue Note"
                />
              </div>

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
                <p className="mt-1 text-xs text-gray-500">
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
                <p className="mt-1 text-xs text-gray-500">
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
                <p className="mt-1 text-xs text-gray-500">
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
                  type="number"
                  id="number-of-sets"
                  value={numberOfSets}
                  onChange={(e) => setNumberOfSets(e.target.value)}
                  min="1"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  placeholder="e.g., 2"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Optional: How many sets will be performed
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
                <p className="mb-3 text-xs text-gray-500">
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
                        <label className="block text-xs font-medium text-gray-600 mb-2">
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
                        <div className="flex-1 max-w-xs">
                          <label className="block text-xs text-gray-600 mb-1">
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
                  disabled={loading || requiredInstruments.length === 0}
                  className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {loading ? 'Posting...' : 'Post Gig'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

