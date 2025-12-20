'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { format } from 'date-fns'
import Navigation from './Navigation'

export default function GigsContent({ user }: { user: User }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [gigs, setGigs] = useState<any[]>([])
  const [filter, setFilter] = useState<'all' | 'open' | 'my-gigs'>('all')

  useEffect(() => {
    loadGigs()
  }, [filter])

  const loadGigs = async () => {
    try {
      let query = supabase
        .from('gigs')
        .select('*')
        .order('datetime', { ascending: true })

      if (filter === 'open') {
        query = query.eq('status', 'open')
      } else if (filter === 'my-gigs') {
        query = query.eq('posted_by', user.id)
      }

      const { data, error } = await query

      if (error) throw error

      // Get musician profiles for posters
      if (data && data.length > 0) {
        const posterIds = [...new Set(data.map((gig) => gig.posted_by))]
        const { data: musiciansData } = await supabase
          .from('musicians')
          .select('*')
          .in('user_id', posterIds)

        const gigsWithPosters = data.map((gig) => ({
          ...gig,
          posted_by_musician: musiciansData?.find((m) => m.user_id === gig.posted_by) || null,
        }))

        setGigs(gigsWithPosters)
      } else {
        setGigs([])
      }
    } catch (error: any) {
      console.error('Error loading gigs:', error)
    } finally {
      setLoading(false)
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

      <main className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Gigs</h2>
              <p className="mt-2 text-sm text-gray-900">
                Browse available gigs or manage your posted gigs.
              </p>
            </div>
            <Link
              href="/gigs/new"
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Post New Gig
            </Link>
          </div>

          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`rounded-md px-4 py-2 text-sm font-medium ${
                filter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              All Gigs
            </button>
            <button
              onClick={() => setFilter('open')}
              className={`rounded-md px-4 py-2 text-sm font-medium ${
                filter === 'open'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Open Gigs
            </button>
            <button
              onClick={() => setFilter('my-gigs')}
              className={`rounded-md px-4 py-2 text-sm font-medium ${
                filter === 'my-gigs'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              My Gigs
            </button>
          </div>

          {gigs.length === 0 ? (
            <div className="rounded-lg bg-white p-8 text-center shadow">
              <p className="text-gray-900">No gigs found.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {gigs.map((gig) => (
                <Link
                  key={gig.id}
                  href={`/gigs/${gig.id}`}
                  className="block rounded-lg bg-white p-6 shadow hover:shadow-lg transition-shadow"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {gig.title}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        gig.status === 'open'
                          ? 'bg-green-100 text-green-800'
                          : gig.status === 'filled'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {gig.status}
                    </span>
                  </div>
                  {gig.description && (
                    <p className="mb-3 text-sm text-gray-900 line-clamp-2">
                      {gig.description}
                    </p>
                  )}
                  <p className="mb-2 text-sm text-gray-700">
                    <span className="font-medium">Date:</span>{' '}
                    {format(new Date(gig.datetime), 'PPpp')}
                  </p>
                  <p className="mb-3 text-sm text-gray-700">
                    <span className="font-medium">Location:</span> {gig.location}
                  </p>
                  <p className="mb-2 text-sm font-medium text-gray-700">
                    Posted by: {gig.posted_by_musician?.name || 'Unknown'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {gig.required_instruments.map((inst: string) => (
                      <span
                        key={inst}
                        className="rounded-full bg-indigo-100 px-2 py-1 text-xs text-indigo-800"
                      >
                        {inst}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

