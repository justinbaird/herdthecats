'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { INSTRUMENTS, type Instrument } from '@/lib/supabase/types'
import Navigation from './Navigation'

export default function ProfileContent({ user }: { user: User }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [instruments, setInstruments] = useState<Instrument[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('musicians')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        throw new Error(error.message || 'Failed to load profile')
      }

      if (data) {
        setName(data.name || '')
        setEmail(data.email || user.email || '')
        setInstruments(data.instruments || [])
      } else {
        // No profile exists yet, use defaults
        setName('')
        setEmail(user.email || '')
        setInstruments([])
      }
    } catch (error: any) {
      console.error('Error loading profile:', error)
      setError(error?.message || error?.toString() || 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleInstrument = (instrument: Instrument) => {
    setInstruments((prev) =>
      prev.includes(instrument)
        ? prev.filter((i) => i !== instrument)
        : [...prev, instrument]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSaving(true)

    try {
      const { error } = await supabase
        .from('musicians')
        .upsert({
          user_id: user.id,
          name: name || 'User',
          email: email || user.email || '',
          instruments,
        }, {
          onConflict: 'user_id'
        })

      if (error) {
        throw new Error(error.message || 'Failed to save profile')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error: any) {
      console.error('Error saving profile:', error)
      setError(error?.message || error?.toString() || 'Failed to save profile')
    } finally {
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
            <h2 className="text-2xl font-bold text-gray-900">Your Profile</h2>
            <p className="mt-2 text-sm text-gray-600">
              Update your profile information and instruments.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="rounded-lg bg-white p-6 shadow">
            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 rounded-md bg-green-50 p-4">
                <p className="text-sm text-green-800">
                  Profile updated successfully!
                </p>
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Instruments I Play
                </label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {INSTRUMENTS.map((instrument) => (
                    <label
                      key={instrument}
                      className="flex items-center space-x-2 rounded-md border border-gray-300 p-3 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={instruments.includes(instrument)}
                        onChange={() => handleToggleInstrument(instrument)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">{instrument}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Link
                  href="/dashboard"
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={saving}
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

