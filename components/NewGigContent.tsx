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
  const [requiredInstruments, setRequiredInstruments] = useState<Instrument[]>([])

  const handleToggleInstrument = (instrument: Instrument) => {
    setRequiredInstruments((prev) =>
      prev.includes(instrument)
        ? prev.filter((i) => i !== instrument)
        : [...prev, instrument]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (requiredInstruments.length === 0) {
      setError('Please select at least one required instrument')
      setLoading(false)
      return
    }

    if (!datetime) {
      setError('Please select a date and time')
      setLoading(false)
      return
    }

    try {
      // Convert datetime-local value to ISO string with timezone
      // datetime-local format: "YYYY-MM-DDTHH:mm" (local time, no timezone)
      // Parse as local time and convert to ISO string (UTC) for PostgreSQL
      if (!datetime || datetime.trim() === '') {
        setError('Please select a date and time')
        setLoading(false)
        return
      }
      
      // Create a date object treating the input as local time
      // The datetime-local input provides local time without timezone
      const dateObj = new Date(datetime)
      
      // Validate the date is valid
      if (isNaN(dateObj.getTime())) {
        setError('Invalid date and time')
        setLoading(false)
        return
      }
      
      // Convert to ISO string (UTC) for database storage
      const isoDatetime = dateObj.toISOString()

      const { data, error } = await supabase
        .from('gigs')
        .insert({
          posted_by: user.id,
          title,
          description: description || null,
          location,
          datetime: isoDatetime,
          required_instruments: requiredInstruments,
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
                  htmlFor="datetime"
                  className="block text-sm font-medium text-gray-700"
                >
                  Date & Time *
                </label>
                <input
                  type="datetime-local"
                  id="datetime"
                  value={datetime}
                  onChange={(e) => setDatetime(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Required Instruments * (select all that apply)
                </label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {INSTRUMENTS.map((instrument) => (
                    <label
                      key={instrument}
                      className="flex items-center space-x-2 rounded-md border border-gray-300 p-3 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={requiredInstruments.includes(instrument)}
                        onChange={() => handleToggleInstrument(instrument)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">{instrument}</span>
                    </label>
                  ))}
                </div>
                {requiredInstruments.length === 0 && (
                  <p className="mt-2 text-sm text-red-600">
                    Please select at least one instrument
                  </p>
                )}
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

