'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { formatTimezoneDisplay, getTimezoneCode } from '@/lib/timezones'

export default function Navigation({ user }: { user: User }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [isAdmin, setIsAdmin] = useState(false)
  const [musicianProfile, setMusicianProfile] = useState<any>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    checkAdmin()
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const { data } = await supabase
        .from('musicians')
        .select('city, timezone')
        .eq('user_id', user.id)
        .maybeSingle()
      
      if (data) {
        setMusicianProfile(data)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const checkAdmin = async () => {
    const { data: userData } = await supabase.auth.getUser()
    const metadata = userData.user?.user_metadata
    setIsAdmin(metadata?.role === 'admin')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(path + '/')
  }

  useEffect(() => {
    setIsMenuOpen(false)
  }, [pathname])

  const navigationLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/profile', label: 'Profile' },
    { href: '/network', label: 'Network' },
    { href: '/gigs', label: 'Gigs' },
    { href: '/admin', label: 'Admin', adminOnly: true },
  ]

  const availableLinks = navigationLinks.filter(
    (link) => !link.adminOnly || (link.adminOnly && isAdmin)
  )

  return (
    <nav className="bg-white shadow">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex flex-1 items-center">
            <div className="flex flex-shrink-0 items-center">
              <Link href="/dashboard" className="text-xl font-bold text-gray-900">
                Herd the Cats
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {availableLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
                    isActive(link.href)
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="hidden items-center sm:flex">
            <div className="mr-4 text-right">
              <div className="text-sm text-gray-700">{user.email}</div>
              {musicianProfile?.city && musicianProfile?.timezone && (
                <div className="text-xs text-gray-500">
                  {formatTimezoneDisplay(musicianProfile.city, musicianProfile.timezone)}
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
            >
              Logout
            </button>
          </div>
          <div className="flex items-center sm:hidden">
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="inline-flex items-center justify-center rounded-md p-2 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              aria-controls="mobile-menu"
              aria-expanded={isMenuOpen}
            >
              <span className="sr-only">Toggle primary navigation</span>
              {isMenuOpen ? (
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5M3.75 12h16.5M3.75 18.75h16.5" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className={`${isMenuOpen ? 'block' : 'hidden'} sm:hidden`} id="mobile-menu">
        <div className="space-y-1 px-2 pb-3 pt-2">
          {availableLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`block border-l-4 px-3 py-2 text-base font-medium ${
                isActive(link.href)
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-transparent text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="border-t border-gray-200 px-4 pb-3">
          <div className="py-3">
            <div className="text-sm font-medium text-gray-700">{user.email}</div>
            {musicianProfile?.city && musicianProfile?.timezone && (
              <div className="text-xs text-gray-500">
                {formatTimezoneDisplay(musicianProfile.city, musicianProfile.timezone)}
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="w-full rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  )
}

