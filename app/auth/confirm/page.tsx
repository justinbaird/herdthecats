'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ConfirmEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const confirmEmail = async () => {
      const supabase = createClient()
      
      // Get the token and type from URL hash
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const tokenType = hashParams.get('type')
      const error = hashParams.get('error')
      const errorDescription = hashParams.get('error_description')

      // Handle errors from URL
      if (error) {
        setError(errorDescription || error || 'An error occurred during email confirmation')
        setLoading(false)
        return
      }

      // If we have an access token, the email is already confirmed
      // We just need to set the session
      if (accessToken && tokenType === 'recovery') {
        // This is a password reset flow
        router.push(`/reset-password?access_token=${accessToken}`)
        return
      }

      if (accessToken) {
        // Email confirmation successful
        setSuccess(true)
        setLoading(false)
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/dashboard')
          router.refresh()
        }, 2000)
      } else {
        // Try to get session from query params (alternative flow)
        const token = searchParams.get('token')
        const type = searchParams.get('type')

        if (token && type === 'signup') {
          // Verify the token and confirm email
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'signup',
          })

          if (verifyError) {
            setError(verifyError.message)
          } else {
            setSuccess(true)
            setTimeout(() => {
              router.push('/dashboard')
              router.refresh()
            }, 2000)
          }
        } else {
          // No token found - might already be confirmed or link expired
          setError('Invalid or expired confirmation link. Please try signing up again or contact support.')
        }
        
        setLoading(false)
      }
    }

    confirmEmail()
  }, [router, searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold text-gray-900">
            Herd the Cats
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Email Confirmation
          </p>
        </div>

        <div className="rounded-md bg-white p-6 shadow-sm">
          {loading && (
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
              <p className="mt-4 text-sm text-gray-600">Confirming your email...</p>
            </div>
          )}

          {success && (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="mt-4 text-lg font-medium text-gray-900">
                Email Confirmed!
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Your email has been successfully confirmed. Redirecting to dashboard...
              </p>
            </div>
          )}

          {error && (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="mt-4 text-lg font-medium text-gray-900">
                Confirmation Failed
              </h2>
              <p className="mt-2 text-sm text-red-600">{error}</p>
              <div className="mt-6 space-y-3">
                <Link
                  href="/signup"
                  className="block rounded-md bg-indigo-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Try Signing Up Again
                </Link>
                <Link
                  href="/login"
                  className="block rounded-md border border-gray-300 bg-white px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Go to Login
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

