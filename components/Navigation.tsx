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

  return (
    <nav className="bg-white shadow">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="flex flex-shrink-0 items-center">
              <Link href="/dashboard" className="text-xl font-bold text-gray-900">
                Herd the Cats
              </Link>
            </div>
            <div className="ml-6 flex space-x-8">
              <Link
                href="/dashboard"
                className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
                  isActive('/dashboard')
                    ? 'border-indigo-500 text-gray-900'
                    : 'border-transparent text-gray-900 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/profile"
                className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
                  isActive('/profile')
                    ? 'border-indigo-500 text-gray-900'
                    : 'border-transparent text-gray-900 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Profile
              </Link>
              <Link
                href="/network"
                className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
                  isActive('/network')
                    ? 'border-indigo-500 text-gray-900'
                    : 'border-transparent text-gray-900 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Network
              </Link>
              <Link
                href="/gigs"
                className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
                  isActive('/gigs')
                    ? 'border-indigo-500 text-gray-900'
                    : 'border-transparent text-gray-900 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Gigs
              </Link>
              <Link
                href="/venues"
                className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
                  isActive('/venues')
                    ? 'border-indigo-500 text-gray-900'
                    : 'border-transparent text-gray-900 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Venues
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
                    isActive('/admin')
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-900 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  Admin
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center">
            <div className="mr-4 text-right">
              <div className="text-sm text-gray-700">{user.email}</div>
              {musicianProfile?.city && musicianProfile?.timezone && (
                <div className="text-xs text-gray-900">
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
        </div>
      </div>
    </nav>
  )
}

