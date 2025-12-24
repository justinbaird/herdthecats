'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import Navigation from './Navigation'
import { format } from 'date-fns'
import type { GigMedia, GigDescription } from '@/lib/supabase/types'

export default function MediaLibraryContent({ user }: { user: User }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [media, setMedia] = useState<(GigMedia & { gig_title: string; gig_entry_type: string })[]>([])
  const [descriptions, setDescriptions] = useState<(GigDescription & { gig_title: string; gig_entry_type: string })[]>([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadMediaLibrary()
  }, [])

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      loadMediaLibrary()
    }, 300)

    return () => clearTimeout(timer)
  }, [search])

  const loadMediaLibrary = async () => {
    try {
      setLoading(true)
      const url = search
        ? `/api/media-library?search=${encodeURIComponent(search)}`
        : '/api/media-library'
      
      const response = await fetch(url)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load media library')
      }

      setMedia(data.media || [])
      setDescriptions(data.descriptions || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load media library')
    } finally {
      setLoading(false)
    }
  }

  // Combine and sort by date (reverse chronological)
  const allItems = [
    ...media.map((m) => ({ type: 'media' as const, ...m, date: m.created_at })),
    ...descriptions.map((d) => ({ type: 'description' as const, ...d, date: d.created_at })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} />
      <main className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Media Library</h1>
            <p className="mt-2 text-sm text-gray-900">
              View all uploaded content from your venue gigs
            </p>
          </div>

          {/* Search */}
          <div className="mb-6">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by gig title, description, or file name..."
              className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
            />
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="text-lg text-gray-900">Loading...</div>
            </div>
          ) : allItems.length === 0 ? (
            <div className="rounded-lg bg-white p-8 text-center shadow">
              <p className="text-gray-900">
                {search ? 'No results found.' : 'No media or descriptions yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {allItems.map((item, idx) => (
                <div key={idx} className="rounded-lg bg-white p-6 shadow">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {item.gig_title}
                        </h3>
                        <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-800">
                          {item.gig_entry_type === 'rehearsal' ? 'Rehearsal' : 'Gig'}
                        </span>
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
                          {item.type === 'media' ? (item.media_type === 'photo' ? 'Photo' : 'Video') : 'Description'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {format(new Date(item.date), 'PPpp')}
                      </p>
                    </div>
                  </div>

                  {item.type === 'media' ? (
                    <div>
                      {item.description && (
                        <p className="mb-3 text-gray-900">{item.description}</p>
                      )}
                      <div className="mt-3">
                        {item.media_type === 'photo' ? (
                          <img
                            src={item.file_url}
                            alt={item.file_name || 'Photo'}
                            className="max-w-full h-auto rounded-lg"
                          />
                        ) : (
                          <video
                            src={item.file_url}
                            controls
                            className="max-w-full h-auto rounded-lg"
                          >
                            Your browser does not support the video tag.
                          </video>
                        )}
                      </div>
                      {item.file_name && (
                        <p className="mt-2 text-xs text-gray-600">
                          File: {item.file_name}
                          {item.file_size && ` (${(item.file_size / 1024 / 1024).toFixed(2)} MB)`}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-900 whitespace-pre-wrap">{item.description}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}


