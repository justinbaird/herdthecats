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
  const [subject, setSubject] = useState('')
  const [method, setMethod] = useState<'email' | 'whatsapp'>('email')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null)

  if (!isOpen) return null

  const musician = member.musician
  const hasEmail = musician?.email
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

    if (method === 'email' && !hasEmail) {
      setError('This musician does not have an email address on file')
      return
    }

    if (method === 'whatsapp' && !hasPhone) {
      setError('This musician does not have a phone number on file')
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
          recipientEmail: musician?.email,
          recipientPhone: fullPhone,
          message,
          subject: subject || undefined,
          method,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      if (method === 'whatsapp' && data.whatsappUrl) {
        setWhatsappUrl(data.whatsappUrl)
        setSuccess('WhatsApp link generated! Click the button below to open WhatsApp.')
      } else {
        setSuccess('Message sent successfully!')
        setMessage('')
        setSubject('')
        setTimeout(() => {
          onClose()
        }, 2000)
      }
    } catch (error: any) {
      console.error('Error sending message:', error)
      setError(error.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    setMessage('')
    setSubject('')
    setError(null)
    setSuccess(null)
    setWhatsappUrl(null)
    setMethod('email')
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
          {/* Method Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Send via:
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="method"
                  value="email"
                  checked={method === 'email'}
                  onChange={() => setMethod('email')}
                  disabled={!hasEmail}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                />
                <span className={`ml-2 text-sm ${hasEmail ? 'text-gray-900' : 'text-gray-400'}`}>
                  Email {!hasEmail && '(not available)'}
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="method"
                  value="whatsapp"
                  checked={method === 'whatsapp'}
                  onChange={() => setMethod('whatsapp')}
                  disabled={!hasPhone}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                />
                <span className={`ml-2 text-sm ${hasPhone ? 'text-gray-900' : 'text-gray-400'}`}>
                  WhatsApp {!hasPhone && '(not available)'}
                </span>
              </label>
            </div>
          </div>

          {/* Email Subject (only for email) */}
          {method === 'email' && (
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                Subject (Optional)
              </label>
              <input
                type="text"
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="Message subject"
              />
            </div>
          )}

          {/* Message */}
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700">
              Message *
            </label>
            <textarea
              id="message"
              rows={8}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              placeholder={
                method === 'email'
                  ? 'Enter your message here...'
                  : 'Enter your WhatsApp message here...'
              }
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
              disabled={sending || !message.trim() || (method === 'email' && !hasEmail) || (method === 'whatsapp' && !hasPhone)}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? 'Sending...' : method === 'email' ? 'Send Email' : 'Generate WhatsApp Link'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

