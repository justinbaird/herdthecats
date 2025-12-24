'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function CheckEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState<string | null>(null)
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)

  useEffect(() => {
    // Get email and redirect URL from query params
    const emailParam = searchParams.get('email')
    const redirectParam = searchParams.get('redirect')
    
    setEmail(emailParam)
    setRedirectUrl(redirectParam)

    // If no email in params, try to get it from the current user session
    if (!emailParam) {
      const checkUserEmail = async () => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user && user.email) {
          setEmail(user.email)
        }
      }
      checkUserEmail()
    }
  }, [searchParams])

  const handleResendConfirmation = async () => {
    if (!email) {
      setResendError('Email address is required')
      return
    }

    setResending(true)
    setResendError(null)
    setResendSuccess(false)

    try {
      const supabase = createClient()
      
      // Get the base URL for email confirmation redirect
      const getRedirectUrl = () => {
        if (typeof window !== 'undefined') {
          return `${window.location.origin}/auth/confirm`
        }
        return process.env.NEXT_PUBLIC_SITE_URL 
          ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`
          : 'http://localhost:3000/auth/confirm'
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: getRedirectUrl(),
        },
      })

      if (error) throw error

      setResendSuccess(true)
      setTimeout(() => setResendSuccess(false), 5000)
    } catch (error: any) {
      setResendError(error.message || 'Failed to resend confirmation email')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold text-gray-900">
            Check Your Email
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            We've sent you a confirmation email
          </p>
        </div>

        <div className="rounded-lg bg-white px-6 py-8 shadow-sm">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
              <svg
                className="h-8 w-8 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">
              Confirm Your Email Address
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              We've sent a confirmation email to
            </p>
            {email && (
              <p className="mt-1 text-sm font-medium text-indigo-600">
                {email}
              </p>
            )}
            <p className="mt-4 text-sm text-gray-600">
              Please check your inbox and click the confirmation link to activate your account.
            </p>
            <p className="mt-2 text-sm text-gray-600">
              Once you've confirmed your email, you'll be able to log in and access your account.
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <div className="rounded-md bg-blue-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-blue-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-blue-800">
                    Didn't receive the email?
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <ul className="list-disc space-y-1 pl-5">
                      <li>Check your spam or junk folder</li>
                      <li>Make sure you entered the correct email address</li>
                      <li>Wait a few minutes - emails can sometimes be delayed</li>
                    </ul>
                  </div>
                  {email && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={handleResendConfirmation}
                        disabled={resending}
                        className="text-sm font-medium text-blue-800 hover:text-blue-900 disabled:opacity-50"
                      >
                        {resending ? 'Sending...' : 'Resend confirmation email'}
                      </button>
                      {resendSuccess && (
                        <p className="mt-1 text-sm text-green-700">
                          Confirmation email sent! Please check your inbox.
                        </p>
                      )}
                      {resendError && (
                        <p className="mt-1 text-sm text-red-700">
                          {resendError}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                href="/login"
                className="flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Back to Login
              </Link>
              {redirectUrl && (
                <Link
                  href={redirectUrl}
                  className="flex w-full justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Return to Invitation
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

