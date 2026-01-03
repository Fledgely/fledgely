'use client'

/**
 * useAccessWindowCheck Hook - Story 19D.4, Story 39.3
 *
 * Checks if caregiver has active access based on configured windows
 * and temporary access grants.
 *
 * Acceptance Criteria:
 * - AC2: Caregiver can only view status during active window
 * - AC3: Outside window, shows "Access not currently active"
 * - AC5: Access windows shown to caregiver
 * - AC6: Timezone handling for caregiver's location
 *
 * Story 39.3:
 * - AC3: Temporary access grants override regular windows
 * - AC4: Access ends when temporary grant expires
 *
 * Security Note: This is client-side enforcement only for MVP.
 * Server-side enforcement via Firestore security rules is planned for Epic 19E.
 */

import { useMemo, useState, useEffect } from 'react'
import type { AccessWindow, TemporaryAccessGrant } from '@fledgely/shared'

/**
 * Day of week mapping for AccessWindow
 */
const DAY_MAP: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}

/**
 * One-time extension for temporary access
 */
export interface OneTimeExtension {
  grantedAt: Date
  expiresAt: Date
  grantedBy: string
}

/**
 * Source of access for tracking (Story 39.3)
 */
export type AccessSource = 'window' | 'temporary' | 'extension' | 'none' | 'always_active'

/**
 * Result of access window check
 */
export interface AccessWindowCheckResult {
  /** Whether access is currently active */
  isAccessActive: boolean
  /** Next window start time (null if always active or no windows) */
  nextWindowStart: Date | null
  /** Current window end time (null if not in window) */
  currentWindowEnd: Date | null
  /** Reason for current access status */
  reason: 'in_window' | 'extension' | 'outside_window' | 'always_active' | 'temporary'
  /** Formatted string for display */
  statusMessage: string
  /** Source of access: 'window' | 'temporary' | 'extension' | 'none' | 'always_active' (Story 39.3) */
  accessSource: AccessSource
  /** Active temporary grant if applicable (Story 39.3) */
  temporaryGrant?: TemporaryAccessGrant
}

/**
 * Parse time string (HH:MM) to minutes since midnight
 * Validates input format and returns 0 for invalid inputs.
 */
function parseTime(timeStr: string): number {
  // Validate format (HH:MM)
  if (!/^\d{2}:\d{2}$/.test(timeStr)) {
    return 0
  }

  const [hours, minutes] = timeStr.split(':').map(Number)

  // Validate ranges
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return 0
  }

  return hours * 60 + minutes
}

/**
 * Get current time in a specific timezone as Date
 */
function getCurrentTimeInTimezone(timezone: string): Date {
  try {
    // Get the current time in the specified timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    const parts = formatter.formatToParts(new Date())
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value ?? '0'

    return new Date(
      parseInt(getPart('year')),
      parseInt(getPart('month')) - 1,
      parseInt(getPart('day')),
      parseInt(getPart('hour')),
      parseInt(getPart('minute')),
      parseInt(getPart('second'))
    )
  } catch {
    // Fallback to local time if timezone is invalid
    return new Date()
  }
}

/**
 * Check if current time is within an access window
 */
function isInWindow(
  window: AccessWindow,
  now: Date
): { inWindow: boolean; windowEnd: Date | null } {
  const dayOfWeek = now.getDay()
  const windowDay = DAY_MAP[window.dayOfWeek]

  // Check if today matches the window day
  if (dayOfWeek !== windowDay) {
    return { inWindow: false, windowEnd: null }
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const startMinutes = parseTime(window.startTime)
  const endMinutes = parseTime(window.endTime)

  if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
    // Currently in window - calculate end time
    const windowEnd = new Date(now)
    windowEnd.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0)
    return { inWindow: true, windowEnd }
  }

  return { inWindow: false, windowEnd: null }
}

/**
 * Find the next access window start time
 */
function findNextWindowStart(windows: AccessWindow[], now: Date): Date | null {
  if (windows.length === 0) return null

  const currentDay = now.getDay()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  // Sort windows by how soon they occur
  const windowsWithOffset = windows.map((window) => {
    const windowDay = DAY_MAP[window.dayOfWeek]
    const startMinutes = parseTime(window.startTime)

    let daysUntil = windowDay - currentDay
    if (daysUntil < 0) daysUntil += 7
    if (daysUntil === 0 && startMinutes <= currentMinutes) {
      daysUntil = 7 // Already passed today, next week
    }

    return { window, daysUntil, startMinutes }
  })

  // Find soonest window
  windowsWithOffset.sort((a, b) => {
    if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil
    return a.startMinutes - b.startMinutes
  })

  const next = windowsWithOffset[0]
  const nextDate = new Date(now)
  nextDate.setDate(nextDate.getDate() + next.daysUntil)
  nextDate.setHours(Math.floor(next.startMinutes / 60), next.startMinutes % 60, 0, 0)

  return nextDate
}

/**
 * Format time for display
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Format date for display (includes day if not today)
 */
function formatDateTime(date: Date, now: Date): string {
  const isToday = date.toDateString() === now.toDateString()
  const isTomorrow =
    date.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString()

  if (isToday) {
    return `today at ${formatTime(date)}`
  }
  if (isTomorrow) {
    return `tomorrow at ${formatTime(date)}`
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Find active temporary access grant for a caregiver
 * Story 39.3: Temporary access grants override regular windows
 */
function findActiveTemporaryGrant(
  grants: TemporaryAccessGrant[],
  now: Date
): TemporaryAccessGrant | null {
  for (const grant of grants) {
    if (grant.status === 'active' && grant.startAt <= now && grant.endAt > now) {
      return grant
    }
  }
  return null
}

/**
 * Hook to check if caregiver has active access
 *
 * Story 19D.4: Caregiver Access Window Enforcement
 * Story 39.3: Temporary Access Grant Support
 *
 * @param accessWindows - Array of configured access windows (empty = always active)
 * @param oneTimeExtension - Optional one-time extension
 * @param temporaryGrants - Array of temporary access grants (Story 39.3)
 * @returns AccessWindowCheckResult with current access status
 */
export function useAccessWindowCheck(
  accessWindows: AccessWindow[] = [],
  oneTimeExtension?: OneTimeExtension | null,
  temporaryGrants: TemporaryAccessGrant[] = []
): AccessWindowCheckResult {
  // Force re-calculation every minute to handle window transitions
  const [currentMinute, setCurrentMinute] = useState(() => Math.floor(Date.now() / 60000))

  useEffect(() => {
    // Update every minute to check if access status changed
    const interval = setInterval(() => {
      setCurrentMinute(Math.floor(Date.now() / 60000))
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  return useMemo(() => {
    const now = new Date()

    // Story 39.3: Check for active temporary access grant first (overrides windows)
    const activeGrant = findActiveTemporaryGrant(temporaryGrants, now)
    if (activeGrant) {
      return {
        isAccessActive: true,
        nextWindowStart: null,
        currentWindowEnd: activeGrant.endAt,
        reason: 'temporary' as const,
        statusMessage: `Temporary access until ${formatTime(activeGrant.endAt)}`,
        accessSource: 'temporary' as const,
        temporaryGrant: activeGrant,
      }
    }

    // No windows configured = always active (AC2: default state)
    if (accessWindows.length === 0) {
      return {
        isAccessActive: true,
        nextWindowStart: null,
        currentWindowEnd: null,
        reason: 'always_active' as const,
        statusMessage: 'You have access anytime',
        accessSource: 'always_active' as const,
      }
    }

    // Get current time in the window's timezone
    // All windows should have the same timezone (parent's timezone)
    const timezone = accessWindows[0]?.timezone ?? 'America/New_York'
    const nowInTimezone = getCurrentTimeInTimezone(timezone)

    // Check for active one-time extension (AC4)
    if (oneTimeExtension) {
      const expiresAt = new Date(oneTimeExtension.expiresAt)
      if (nowInTimezone < expiresAt) {
        return {
          isAccessActive: true,
          nextWindowStart: null,
          currentWindowEnd: expiresAt,
          reason: 'extension' as const,
          statusMessage: `Extended access until ${formatTime(expiresAt)}`,
          accessSource: 'extension' as const,
        }
      }
    }

    // Check each access window
    for (const window of accessWindows) {
      const { inWindow, windowEnd } = isInWindow(window, nowInTimezone)
      if (inWindow && windowEnd) {
        return {
          isAccessActive: true,
          nextWindowStart: null,
          currentWindowEnd: windowEnd,
          reason: 'in_window' as const,
          statusMessage: `Access until ${formatTime(windowEnd)}`,
          accessSource: 'window' as const,
        }
      }
    }

    // Not in any window - find next window (AC3, AC5)
    const nextWindow = findNextWindowStart(accessWindows, nowInTimezone)
    const statusMessage = nextWindow
      ? `Next access: ${formatDateTime(nextWindow, nowInTimezone)}`
      : 'No scheduled access'

    return {
      isAccessActive: false,
      nextWindowStart: nextWindow,
      currentWindowEnd: null,
      reason: 'outside_window' as const,
      statusMessage,
      accessSource: 'none' as const,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessWindows, oneTimeExtension, temporaryGrants, currentMinute])
}

/**
 * Format access windows for display to caregiver
 *
 * Story 19D.4: AC5 - Show access windows to caregiver
 *
 * @param windows - Array of access windows
 * @returns Formatted strings for display
 */
export function formatAccessWindows(windows: AccessWindow[]): string[] {
  if (windows.length === 0) {
    return ['You have access anytime']
  }

  const dayNames: Record<string, string> = {
    sunday: 'Sunday',
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
  }

  return windows.map((window) => {
    const day = dayNames[window.dayOfWeek] ?? window.dayOfWeek
    const start = formatTimeString(window.startTime)
    const end = formatTimeString(window.endTime)
    return `${day} ${start} - ${end}`
  })
}

/**
 * Format time string (HH:MM) for display
 */
function formatTimeString(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}

export default useAccessWindowCheck
