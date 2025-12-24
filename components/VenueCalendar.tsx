'use client'

import { useState } from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks } from 'date-fns'
import Link from 'next/link'
import type { Gig } from '@/lib/supabase/types'

type ViewMode = 'month' | 'week'

interface VenueCalendarProps {
  gigs: Gig[]
  venueId: string
  isManager: boolean
}

export default function VenueCalendar({ gigs, venueId, isManager }: VenueCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('month')

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
                <div className="flex items-center justify-between">
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
                  {isManager && isCurrentMonth && (
                    <Link
                      href={`/gigs/new?venueId=${venueId}&date=${format(day, 'yyyy-MM-dd')}`}
                      className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
                      title="Add entry"
                    >
                      +
                    </Link>
                  )}
                </div>
                <div className="mt-1 space-y-1">
                  {dayGigs.slice(0, 3).map((gig) => (
                    <Link
                      key={gig.id}
                      href={`/gigs/${gig.id}`}
                      className="block truncate rounded bg-indigo-100 px-1 py-0.5 text-xs text-indigo-800 hover:bg-indigo-200"
                      title={gig.title}
                    >
                      {format(new Date(gig.datetime), 'HH:mm')} {gig.title}
                    </Link>
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
                {isManager && (
                  <Link
                    href={`/gigs/new?venueId=${venueId}&date=${format(day, 'yyyy-MM-dd')}`}
                    className="mb-2 block rounded-md bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700 text-center"
                  >
                    + Add Entry
                  </Link>
                )}
                <div className="space-y-2">
                  {dayGigs.length === 0 ? (
                    <p className="text-xs text-gray-400">No gigs</p>
                  ) : (
                    dayGigs.map((gig) => (
                      <Link
                        key={gig.id}
                        href={`/gigs/${gig.id}`}
                        className="block rounded-md bg-indigo-100 p-2 text-xs hover:bg-indigo-200"
                      >
                        <div className="font-semibold text-indigo-900">
                          {format(new Date(gig.datetime), 'HH:mm')}
                        </div>
                        <div className="mt-1 text-indigo-800">{gig.title}</div>
                        {gig.location && (
                          <div className="mt-1 text-gray-600">{gig.location}</div>
                        )}
                      </Link>
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

  return (
    <div>
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
  )
}

