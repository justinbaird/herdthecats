'use client'

import { useState } from 'react'
import type { VenueNetwork } from '@/lib/supabase/types'

interface MessageMusicianModalProps {
  member: VenueNetwork
  isOpen: boolean
  onClose: () => void
}

export default function MessageMusicianModal({
  member,
  isOpen,
  onClose,
}: MessageMusicianModalProps) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null)

  if (!isOpen) return null

  const musician = member.musician
  // Combine country_code and phone_number for WhatsApp
  const fullPhone = musician?.country_code && musician?.phone_number
    ? `${musician.country_code}${musician.phone_number.replace(/[^\d]/g, '')}`
    : null
  const hasPhone = !!fullPhone

  const handleSend = async () => {
    if (!message.trim()) {
      setError('Please enter a message')
      return
    }

    if (!hasPhone) {
      setError('This musician does not have a WhatsApp number on file')
      return
    }

    setSending(true)
    setError(null)
    setSuccess(null)
    setWhatsappUrl(null)

    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: member.musician_id,
          recipientPhone: fullPhone,
          message,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate WhatsApp link')
      }

      if (data.whatsappUrl) {
        setWhatsappUrl(data.whatsappUrl)
        setSuccess('WhatsApp link generated! Click the button below to open WhatsApp.')
      } else {
        throw new Error('Failed to generate WhatsApp link')
      }
    } catch (error: any) {
      console.error('Error generating WhatsApp link:', error)
      setError(error.message || 'Failed to generate WhatsApp link')
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    setMessage('')
    setError(null)
    setSuccess(null)
    setWhatsappUrl(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">
            Send Message to {musician?.name || 'Musician'}
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
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

        <div className="space-y-4">
          {!hasPhone && (
            <div className="rounded-md bg-yellow-50 p-4">
              <p className="text-sm text-yellow-800">
                This musician does not have a WhatsApp number on file. Please add their WhatsApp number to their profile to send messages.
              </p>
            </div>
          )}

          {/* Message */}
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700">
              WhatsApp Message *
            </label>
            <textarea
              id="message"
              rows={8}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              placeholder="Enter your WhatsApp message here..."
            />
          </div>

          {/* WhatsApp URL Display */}
          {whatsappUrl && (
            <div className="rounded-md bg-blue-50 p-4">
              <p className="text-sm text-blue-800 mb-2">
                Click the button below to open WhatsApp with your message:
              </p>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Open WhatsApp
              </a>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={handleClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !message.trim() || !hasPhone}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? 'Generating...' : 'Generate WhatsApp Link'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

