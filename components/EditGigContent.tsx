'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { INSTRUMENTS, type Instrument } from '@/lib/supabase/types'
import Navigation from './Navigation'

export default function EditGigContent({
  gigId,
  user,
}: {
  gigId: string
  user: User
}) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [datetime, setDatetime] = useState('')
  const [callTime, setCallTime] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [numberOfSets, setNumberOfSets] = useState('')
  const [requiredInstruments, setRequiredInstruments] = useState<Instrument[]>([])
  const [inviteOnlyInstruments, setInviteOnlyInstruments] = useState<Instrument[]>([])
  const [paymentPerInstrument, setPaymentPerInstrument] = useState<Record<Instrument, string>>({} as Record<Instrument, string>)

  useEffect(() => {
    loadGig()
  }, [gigId])

  const loadGig = async () => {
    try {
      const { data: gigData, error: gigError } = await supabase
        .from('gigs')
        .select('*')
        .eq('id', gigId)
        .eq('posted_by', user.id)
        .single()

      if (gigError) throw gigError
      if (!gigData) throw new Error('Gig not found')

      // Populate form with existing data
      setTitle(gigData.title)
      setDescription(gigData.description || '')
      setLocation(gigData.location)
      
      // Convert datetime to format compatible with datetime-local input
      const date = new Date(gigData.datetime)
      const localDatetime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
      setDatetime(localDatetime)
      
      // Convert timing fields if they exist
      if (gigData.start_time) {
        const startDate = new Date(gigData.start_time)
        const localStartTime = new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16)
        setStartTime(localStartTime)
      }
      
      if (gigData.call_time) {
        const callDate = new Date(gigData.call_time)
        const localCallTime = new Date(callDate.getTime() - callDate.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16)
        setCallTime(localCallTime)
      }
      
      if (gigData.end_time) {
        const endDate = new Date(gigData.end_time)
        const localEndTime = new Date(endDate.getTime() - endDate.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16)
        setEndTime(localEndTime)
      }
      
      setNumberOfSets(gigData.number_of_sets ? gigData.number_of_sets.toString() : '')
      setRequiredInstruments(gigData.required_instruments || [])
      setInviteOnlyInstruments(gigData.invite_only_instruments || [])
      
      // Load payment per instrument
      const payments: Record<Instrument, string> = {} as Record<Instrument, string>
      if (gigData.payment_per_instrument) {
        Object.entries(gigData.payment_per_instrument).forEach(([instrument, amount]) => {
          if (typeof amount === 'number') {
            payments[instrument as Instrument] = amount.toString()
          }
        })
      }
      setPaymentPerInstrument(payments)
    } catch (error: any) {
      console.error('Error loading gig:', error)
      setError(error.message)
      router.push('/gigs')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleInstrument = (instrument: Instrument) => {
    const wasRequired = requiredInstruments.includes(instrument)
    setRequiredInstruments((prev) =>
      prev.includes(instrument)
        ? prev.filter((i) => i !== instrument)
        : [...prev, instrument]
    )
    // Remove from invite-only and payment if removing from required
    if (wasRequired) {
      setInviteOnlyInstruments((prev) => prev.filter((i) => i !== instrument))
      setPaymentPerInstrument((prev) => {
        const updated = { ...prev }
        delete updated[instrument]
        return updated
      })
    }
  }

  const handlePaymentChange = (instrument: Instrument, value: string) => {
    setPaymentPerInstrument((prev) => ({
      ...prev,
      [instrument]: value,
    }))
  }

  const handleToggleInviteOnly = (instrument: Instrument) => {
    if (!requiredInstruments.includes(instrument)) return
    
    setInviteOnlyInstruments((prev) =>
      prev.includes(instrument)
        ? prev.filter((i) => i !== instrument)
        : [...prev, instrument]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    if (requiredInstruments.length === 0) {
      setError('Please select at least one required instrument')
      setSaving(false)
      return
    }

    // Validate at least start_time is provided (or datetime for backwards compatibility)
    if (!startTime && !datetime) {
      setError('Please select a start time')
      setSaving(false)
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
        setSaving(false)
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
        setSaving(false)
        return
      }
      
      // Validate start time is before end time if both provided
      if (startTime && endTime && new Date(startTime) >= new Date(endTime)) {
        setError('Start time must be before end time')
        setSaving(false)
        return
      }

      const { error: updateError } = await supabase
        .from('gigs')
        .update({
          title,
          description: description || null,
          location,
          datetime: isoDatetime, // Keep for backwards compatibility
          call_time: isoCallTime,
          start_time: isoStartTime,
          end_time: isoEndTime,
          number_of_sets: numberOfSets ? parseInt(numberOfSets, 10) : null,
          required_instruments: requiredInstruments,
          invite_only_instruments: inviteOnlyInstruments,
          payment_per_instrument: Object.keys(paymentPerInstrument).reduce((acc, instrument) => {
            const payment = paymentPerInstrument[instrument as Instrument]
            if (payment && payment.trim() && !isNaN(parseFloat(payment))) {
              acc[instrument] = parseFloat(payment)
            }
            return acc
          }, {} as Record<string, number>),
        })
        .eq('id', gigId)
        .eq('posted_by', user.id)

      if (updateError) throw updateError

      router.push(`/gigs/${gigId}`)
    } catch (error: any) {
      console.error('Error updating gig:', error)
      setError(error.message)
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} />

      <main className="mx-auto max-w-4xl py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Edit Gig</h2>
            <p className="mt-2 text-sm text-gray-600">
              Update your gig details. Changes will be visible to all users.
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
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Required Instruments * (select all that apply)
                </label>
                <p className="mb-3 text-xs text-gray-500">
                  Check instruments needed. You can mark any as "Invite Only" to restrict who can apply.
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {INSTRUMENTS.map((instrument) => {
                    const isRequired = requiredInstruments.includes(instrument)
                    const isInviteOnly = inviteOnlyInstruments.includes(instrument)
                    
                    return (
                      <div
                        key={instrument}
                        className="rounded-md border border-gray-300 p-3 hover:bg-gray-50"
                      >
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isRequired}
                            onChange={() => handleToggleInstrument(instrument)}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-gray-700 flex-1">{instrument}</span>
                        </label>
                        {isRequired && (
                          <div className="mt-2 space-y-2">
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isInviteOnly}
                                onChange={() => handleToggleInviteOnly(instrument)}
                                className="h-3 w-3 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                              />
                              <span className="text-xs text-purple-600 font-medium">
                                Invite Only
                              </span>
                            </label>
                            <div>
                              <label className="text-xs text-gray-600">Payment ($):</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={paymentPerInstrument[instrument] || ''}
                                onChange={(e) => handlePaymentChange(instrument, e.target.value)}
                                placeholder="Optional"
                                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                {requiredInstruments.length === 0 && (
                  <p className="mt-2 text-sm text-red-600">
                    Please select at least one instrument
                  </p>
                )}
                {inviteOnlyInstruments.length > 0 && (
                  <p className="mt-2 text-sm text-purple-600">
                    {inviteOnlyInstruments.length} instrument(s) marked as invite-only. Manage invitations on the gig detail page.
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <Link
                  href={`/gigs/${gigId}`}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={saving || requiredInstruments.length === 0}
                  className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

