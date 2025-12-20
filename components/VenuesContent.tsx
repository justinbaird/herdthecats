'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'
import Navigation from './Navigation'
import type { Venue } from '@/lib/supabase/types'
import { COUNTRIES, getPostalCodeLabel, getStateLabel, countryHasState } from '@/lib/countries'

export default function VenuesContent({ user }: { user: User }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [venues, setVenues] = useState<Venue[]>([])
  const [managedVenues, setManagedVenues] = useState<Venue[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'SG',
    phone: '',
    email: '',
    website: '',
  })

  useEffect(() => {
    loadVenues()
  }, [])

  const loadVenues = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/venues')
      const { venues: allVenues, error } = await response.json()

      if (error) throw new Error(error)

      setVenues(allVenues || [])

      // Load venues user manages
      const { data: managers } = await supabase
        .from('venue_managers')
        .select('venue_id')
        .eq('user_id', user.id)

      if (managers && managers.length > 0) {
        const venueIds = managers.map((m) => m.venue_id)
        const managed = allVenues.filter((v: Venue) => venueIds.includes(v.id))
        setManagedVenues(managed)
      }
    } catch (error: any) {
      console.error('Error loading venues:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      const response = await fetch('/api/venues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const { venue, error: responseError } = await response.json()

      if (responseError) throw new Error(responseError)

      setShowCreateForm(false)
      setFormData({
        name: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        country: 'SG',
        phone: '',
        email: '',
        website: '',
      })
      loadVenues()
      router.push(`/venues/${venue.id}`)
    } catch (error: any) {
      setError(error.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} />
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-lg">Loading venues...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} />

      <main className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Venues</h1>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              {showCreateForm ? 'Cancel' : 'Create Venue'}
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {showCreateForm && (
            <div className="mb-6 rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">Create New Venue</h2>
              <form onSubmit={handleCreateVenue} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-gray-900 focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Address *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-gray-900 focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-gray-900 focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  {countryHasState(formData.country) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        {getStateLabel(formData.country)}
                      </label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) =>
                          setFormData({ ...formData, state: e.target.value })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-gray-900 focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {getPostalCodeLabel(formData.country)}
                    </label>
                    <input
                      type="text"
                      value={formData.zip_code}
                      onChange={(e) =>
                        setFormData({ ...formData, zip_code: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-gray-900 focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Country *
                    </label>
                    <select
                      required
                      value={formData.country}
                      onChange={(e) =>
                        setFormData({ ...formData, country: e.target.value, state: '' })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-gray-900 focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      {COUNTRIES.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-gray-900 focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-gray-900 focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Website
                    </label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) =>
                        setFormData({ ...formData, website: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-gray-900 focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    Create Venue
                  </button>
                </div>
              </form>
            </div>
          )}

          {managedVenues.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">My Venues</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {managedVenues.map((venue) => (
                  <Link
                    key={venue.id}
                    href={`/venues/${venue.id}`}
                    className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-md"
                  >
                    <h3 className="text-lg font-semibold text-gray-900">
                      {venue.name}
                    </h3>
                    <p className="mt-2 text-sm text-gray-900">{venue.address}</p>
                    {venue.city && (
                      <p className="text-sm text-gray-900">
                        {venue.city}
                        {venue.state && `, ${venue.state}`}
                        {venue.zip_code && ` ${venue.zip_code}`}
                      </p>
                    )}
                    {venue.country && (
                      <p className="text-sm text-gray-900">
                        {COUNTRIES.find(c => c.code === venue.country)?.name || venue.country}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">All Venues</h2>
            {venues.length === 0 ? (
              <p className="text-gray-900">No venues found.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {venues.map((venue) => (
                  <Link
                    key={venue.id}
                    href={`/venues/${venue.id}`}
                    className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-md"
                  >
                    <h3 className="text-lg font-semibold text-gray-900">
                      {venue.name}
                    </h3>
                    <p className="mt-2 text-sm text-gray-900">{venue.address}</p>
                    {venue.city && (
                      <p className="text-sm text-gray-900">
                        {venue.city}
                        {venue.state && `, ${venue.state}`}
                        {venue.zip_code && ` ${venue.zip_code}`}
                      </p>
                    )}
                    {venue.country && (
                      <p className="text-sm text-gray-900">
                        {COUNTRIES.find(c => c.code === venue.country)?.name || venue.country}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

