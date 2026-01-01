'use client'

import { useEffect, useState } from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks } from 'date-fns'
import type { Gig } from '@/lib/supabase/types'

type ViewMode = 'month' | 'week'

interface PublicVenueCalendarProps {
  venueId: string
  venueName: string
  hash: string
}

export default function PublicVenueCalendar({ venueId, venueName, hash }: PublicVenueCalendarProps) {
  const [loading, setLoading] = useState(true)
  const [gigs, setGigs] = useState<Gig[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadGigs()
  }, [hash])

  const loadGigs = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/public-calendar/${hash}/gigs`)
      
      if (!response.ok) {
        throw new Error('Failed to load calendar')
      }

      const { gigs: gigsData } = await response.json()
      setGigs(gigsData || [])
    } catch (error: any) {
      console.error('Error loading gigs:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Get gigs for a specific date
  const getGigsForDate = (date: Date): Gig[] => {
    if (!gigs || gigs.length === 0) return []
    return gigs.filter((gig) => {
      if (!gig.datetime) return false
      const gigDate = new Date(gig.datetime)
      return isSameDay(gigDate, date)
    })
  }

  // Navigate months/weeks
  const goToPrevious = () => {
    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1))
    } else {
      setCurrentDate(subWeeks(currentDate, 1))
    }
  }

  const goToNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1))
    } else {
      setCurrentDate(addWeeks(currentDate, 1))
    }
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Month view
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart)
    const calendarEnd = endOfWeek(monthEnd)
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    return (
      <div className="rounded-lg bg-white shadow">
        <div className="grid grid-cols-7">
          {weekDays.map((day) => (
            <div key={day} className="border-b border-r p-2 text-center text-sm font-semibold text-gray-900 last:border-r-0">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            const dayGigs = getGigsForDate(day)
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isToday = isSameDay(day, new Date())

            return (
              <div
                key={idx}
                className={`min-h-[100px] border-b border-r p-2 last:border-r-0 ${
                  !isCurrentMonth ? 'bg-gray-50' : 'bg-white'
                }`}
              >
                <span
                  className={`text-sm font-medium ${
                    isToday
                      ? 'flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white'
                      : isCurrentMonth
                      ? 'text-gray-900'
                      : 'text-gray-400'
                  }`}
                >
                  {format(day, 'd')}
                </span>
                <div className="mt-1 space-y-1">
                  {dayGigs.slice(0, 3).map((gig) => (
                    <div
                      key={gig.id}
                      className="break-words rounded bg-indigo-100 px-1 py-0.5 text-xs text-indigo-800"
                      title={gig.title}
                    >
                      {gig.title}
                    </div>
                  ))}
                  {dayGigs.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{dayGigs.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Week view
  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate)
    const weekEnd = endOfWeek(currentDate)
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

    const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

    return (
      <div className="rounded-lg bg-white shadow">
        <div className="grid grid-cols-7">
          {weekDays.map((day, idx) => (
            <div key={day} className="border-b border-r p-3 text-center text-sm font-semibold text-gray-900 last:border-r-0">
              <div>{day}</div>
              <div className={`mt-1 text-lg ${isSameDay(days[idx], new Date()) ? 'text-indigo-600' : 'text-gray-700'}`}>
                {format(days[idx], 'd')}
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 min-h-[400px]">
          {days.map((day, idx) => {
            const dayGigs = getGigsForDate(day)
            const isToday = isSameDay(day, new Date())

            return (
              <div
                key={idx}
                className={`min-h-full border-b border-r p-3 last:border-r-0 ${
                  isToday ? 'bg-indigo-50' : 'bg-white'
                }`}
              >
                <div className="space-y-2">
                  {dayGigs.length === 0 ? (
                    <p className="text-xs text-gray-400">No events</p>
                  ) : (
                    dayGigs.map((gig) => (
                      <div
                        key={gig.id}
                        className="rounded-md bg-indigo-100 p-2 text-xs"
                      >
                        <div className="break-words font-semibold text-indigo-800">{gig.title}</div>
                        {gig.location && (
                          <div className="mt-1 text-xs text-gray-600">{gig.location}</div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-900">Loading calendar...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-lg text-red-600">Error loading calendar: {error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">{venueName} Calendar</h1>
            <p className="mt-2 text-sm text-gray-600">Public calendar view</p>
          </div>

          {/* Calendar Controls */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={goToPrevious}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
              >
                ←
              </button>
              <button
                onClick={goToToday}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
              >
                Today
              </button>
              <button
                onClick={goToNext}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
              >
                →
              </button>
              <h3 className="text-lg font-semibold text-gray-900">
                {viewMode === 'month'
                  ? format(currentDate, 'MMMM yyyy')
                  : `${format(startOfWeek(currentDate), 'MMM d')} - ${format(endOfWeek(currentDate), 'MMM d, yyyy')}`}
              </h3>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('month')}
                className={`rounded-md px-4 py-2 text-sm font-medium ${
                  viewMode === 'month'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`rounded-md px-4 py-2 text-sm font-medium ${
                  viewMode === 'week'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                }`}
              >
                Week
              </button>
            </div>
          </div>

          {/* Calendar View */}
          {viewMode === 'month' ? renderMonthView() : renderWeekView()}
        </div>
      </main>
    </div>
  )
}

