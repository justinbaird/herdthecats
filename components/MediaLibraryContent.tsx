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
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [mediaType, setMediaType] = useState<'photo' | 'video'>('photo')
  const [mediaDescription, setMediaDescription] = useState('')
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [availableGigs, setAvailableGigs] = useState<any[]>([])
  const [selectedGigId, setSelectedGigId] = useState<string>('')

  useEffect(() => {
    loadMediaLibrary()
    loadAvailableGigs()
  }, [])

  const loadAvailableGigs = async () => {
    try {
      const response = await fetch('/api/media-library/gigs')
      if (response.ok) {
        const data = await response.json()
        setAvailableGigs(data.gigs || [])
        if (data.gigs && data.gigs.length > 0) {
          setSelectedGigId(data.gigs[0].id)
        }
      }
    } catch (err) {
      console.error('Error loading gigs:', err)
    }
  }

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

          {/* Search and Upload */}
          <div className="mb-6 flex gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by gig title, description, or file name..."
              className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
            />
            <button
              onClick={() => setShowUploadForm(!showUploadForm)}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              {showUploadForm ? 'Cancel' : 'Upload Media'}
            </button>
          </div>

          {/* Upload Form */}
          {showUploadForm && (
            <div className="mb-6 rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Upload Media</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Select Gig *
                  </label>
                  <select
                    value={selectedGigId}
                    onChange={(e) => setSelectedGigId(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  >
                    <option value="">Select a gig...</option>
                    {availableGigs.map((gig) => (
                      <option key={gig.id} value={gig.id}>
                        {gig.title} ({gig.entry_type === 'rehearsal' ? 'Rehearsal' : 'Gig'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Media Type
                  </label>
                  <select
                    value={mediaType}
                    onChange={(e) => {
                      setMediaType(e.target.value as 'photo' | 'video')
                      setSelectedFile(null)
                    }}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  >
                    <option value="photo">Photo</option>
                    <option value="video">Video</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Select File *
                  </label>
                  <input
                    type="file"
                    accept={mediaType === 'photo' ? 'image/*' : 'video/*'}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setSelectedFile(file)
                      }
                    }}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  />
                  {selectedFile && (
                    <p className="mt-1 text-xs text-gray-600">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={mediaDescription}
                    onChange={(e) => setMediaDescription(e.target.value)}
                    placeholder="Brief description of this media..."
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={async () => {
                      if (!selectedFile) {
                        setError('Please select a file to upload')
                        return
                      }
                      if (!selectedGigId) {
                        setError('Please select a gig')
                        return
                      }
                      setUploadingMedia(true)
                      setError(null)
                      try {
                        // Upload the file
                        const uploadFormData = new FormData()
                        uploadFormData.append('file', selectedFile)
                        uploadFormData.append('mediaType', mediaType)

                        const uploadResponse = await fetch('/api/media/upload', {
                          method: 'POST',
                          body: uploadFormData,
                        })
                        const uploadData = await uploadResponse.json()
                        if (!uploadResponse.ok) throw new Error(uploadData.error)

                        // Add to gig
                        const response = await fetch(`/api/gigs/${selectedGigId}/media`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            file_url: uploadData.file_url,
                            file_name: uploadData.file_name,
                            file_size: uploadData.file_size,
                            media_type: uploadData.media_type,
                            description: mediaDescription.trim() || null,
                          }),
                        })
                        const data = await response.json()
                        if (!response.ok) throw new Error(data.error)

                        setSuccess('Media uploaded successfully!')
                        setTimeout(() => setSuccess(null), 3000)
                        setSelectedFile(null)
                        setMediaDescription('')
                        setShowUploadForm(false)
                        await loadMediaLibrary()
                      } catch (err: any) {
                        setError(err.message || 'Failed to upload media')
                      } finally {
                        setUploadingMedia(false)
                      }
                    }}
                    disabled={uploadingMedia || !selectedFile || !selectedGigId}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {uploadingMedia ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </div>
            </div>
          )}

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



