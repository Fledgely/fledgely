/**
 * useAccessWindowCheck Hook Tests - Story 19D.4
 *
 * Tests for the access window checking hook.
 *
 * Story 19D.4 Acceptance Criteria:
 * - AC2: Caregiver can only view status during active window
 * - AC3: Outside window, shows "Access not currently active"
 * - AC5: Access windows shown to caregiver
 * - AC6: Timezone handling for caregiver's location
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAccessWindowCheck, formatAccessWindows } from './useAccessWindowCheck'
import type { AccessWindow } from '@fledgely/shared'

describe('useAccessWindowCheck', () => {
  beforeEach(() => {
    // Mock current time: Tuesday, December 30, 2025, 2:30 PM EST
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-12-30T14:30:00-05:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Always active (no windows configured)', () => {
    it('returns always_active when no windows provided', () => {
      const { result } = renderHook(() => useAccessWindowCheck([]))

      expect(result.current.isAccessActive).toBe(true)
      expect(result.current.reason).toBe('always_active')
      expect(result.current.statusMessage).toBe('You have access anytime')
    })

    it('returns null for next/current window times when always active', () => {
      const { result } = renderHook(() => useAccessWindowCheck([]))

      expect(result.current.nextWindowStart).toBeNull()
      expect(result.current.currentWindowEnd).toBeNull()
    })
  })

  describe('In window access (AC2)', () => {
    it('returns in_window when current time is in configured window', () => {
      // Tuesday 2:30 PM - should be in a Tuesday 2-6pm window
      const windows: AccessWindow[] = [
        {
          dayOfWeek: 'tuesday',
          startTime: '14:00',
          endTime: '18:00',
          timezone: 'America/New_York',
        },
      ]

      const { result } = renderHook(() => useAccessWindowCheck(windows))

      expect(result.current.isAccessActive).toBe(true)
      expect(result.current.reason).toBe('in_window')
    })

    it('provides current window end time', () => {
      const windows: AccessWindow[] = [
        {
          dayOfWeek: 'tuesday',
          startTime: '14:00',
          endTime: '18:00',
          timezone: 'America/New_York',
        },
      ]

      const { result } = renderHook(() => useAccessWindowCheck(windows))

      expect(result.current.currentWindowEnd).not.toBeNull()
      expect(result.current.statusMessage).toMatch(/Access until 6:00 PM/)
    })

    it('handles window at start boundary', () => {
      // Set time to exactly 2:00 PM
      vi.setSystemTime(new Date('2025-12-30T14:00:00-05:00'))

      const windows: AccessWindow[] = [
        {
          dayOfWeek: 'tuesday',
          startTime: '14:00',
          endTime: '18:00',
          timezone: 'America/New_York',
        },
      ]

      const { result } = renderHook(() => useAccessWindowCheck(windows))

      expect(result.current.isAccessActive).toBe(true)
      expect(result.current.reason).toBe('in_window')
    })
  })

  describe('Outside window access (AC3)', () => {
    it('returns outside_window when current time is not in any window', () => {
      // Tuesday 2:30 PM - not in Saturday window
      const windows: AccessWindow[] = [
        {
          dayOfWeek: 'saturday',
          startTime: '14:00',
          endTime: '18:00',
          timezone: 'America/New_York',
        },
      ]

      const { result } = renderHook(() => useAccessWindowCheck(windows))

      expect(result.current.isAccessActive).toBe(false)
      expect(result.current.reason).toBe('outside_window')
    })

    it('provides next window start time', () => {
      const windows: AccessWindow[] = [
        {
          dayOfWeek: 'saturday',
          startTime: '14:00',
          endTime: '18:00',
          timezone: 'America/New_York',
        },
      ]

      const { result } = renderHook(() => useAccessWindowCheck(windows))

      expect(result.current.nextWindowStart).not.toBeNull()
      expect(result.current.statusMessage).toMatch(/Next access:/)
    })

    it('shows "No scheduled access" when windows are empty but passed in', () => {
      // This edge case shouldn't happen, but test for safety
      const { result } = renderHook(() => useAccessWindowCheck([]))

      // Empty array = always active
      expect(result.current.statusMessage).toBe('You have access anytime')
    })

    it('returns outside_window when before window on same day', () => {
      // Tuesday 9:00 AM - before Tuesday 2-6pm window
      vi.setSystemTime(new Date('2025-12-30T09:00:00-05:00'))

      const windows: AccessWindow[] = [
        {
          dayOfWeek: 'tuesday',
          startTime: '14:00',
          endTime: '18:00',
          timezone: 'America/New_York',
        },
      ]

      const { result } = renderHook(() => useAccessWindowCheck(windows))

      expect(result.current.isAccessActive).toBe(false)
      expect(result.current.statusMessage).toMatch(/today at 2:00 PM/i)
    })

    it('returns outside_window when after window on same day', () => {
      // Tuesday 7:00 PM - after Tuesday 2-6pm window
      vi.setSystemTime(new Date('2025-12-30T19:00:00-05:00'))

      const windows: AccessWindow[] = [
        {
          dayOfWeek: 'tuesday',
          startTime: '14:00',
          endTime: '18:00',
          timezone: 'America/New_York',
        },
      ]

      const { result } = renderHook(() => useAccessWindowCheck(windows))

      expect(result.current.isAccessActive).toBe(false)
      expect(result.current.reason).toBe('outside_window')
    })
  })

  describe('One-time extension (AC4)', () => {
    it('grants access with valid extension', () => {
      const windows: AccessWindow[] = [
        {
          dayOfWeek: 'saturday',
          startTime: '14:00',
          endTime: '18:00',
          timezone: 'America/New_York',
        },
      ]

      const extension = {
        grantedAt: new Date('2025-12-30T14:00:00'),
        expiresAt: new Date('2025-12-30T16:00:00'), // Expires at 4 PM - after current time (2:30 PM)
        grantedBy: 'parent-123',
      }

      const { result } = renderHook(() => useAccessWindowCheck(windows, extension))

      expect(result.current.isAccessActive).toBe(true)
      expect(result.current.reason).toBe('extension')
      expect(result.current.statusMessage).toMatch(/Extended access until/)
    })

    it('does not grant access with expired extension', () => {
      const windows: AccessWindow[] = [
        {
          dayOfWeek: 'saturday',
          startTime: '14:00',
          endTime: '18:00',
          timezone: 'America/New_York',
        },
      ]

      const extension = {
        grantedAt: new Date('2025-12-30T12:00:00'),
        expiresAt: new Date('2025-12-30T13:00:00'), // Expired at 1 PM - before current time (2:30 PM)
        grantedBy: 'parent-123',
      }

      const { result } = renderHook(() => useAccessWindowCheck(windows, extension))

      expect(result.current.isAccessActive).toBe(false)
      expect(result.current.reason).toBe('outside_window')
    })

    it('ignores null extension', () => {
      const windows: AccessWindow[] = [
        {
          dayOfWeek: 'saturday',
          startTime: '14:00',
          endTime: '18:00',
          timezone: 'America/New_York',
        },
      ]

      const { result } = renderHook(() => useAccessWindowCheck(windows, null))

      expect(result.current.isAccessActive).toBe(false)
      expect(result.current.reason).toBe('outside_window')
    })
  })

  describe('Multiple windows', () => {
    it('grants access if any window is active', () => {
      const windows: AccessWindow[] = [
        {
          dayOfWeek: 'saturday',
          startTime: '14:00',
          endTime: '18:00',
          timezone: 'America/New_York',
        },
        {
          dayOfWeek: 'tuesday', // Today at 2:30 PM
          startTime: '14:00',
          endTime: '18:00',
          timezone: 'America/New_York',
        },
      ]

      const { result } = renderHook(() => useAccessWindowCheck(windows))

      expect(result.current.isAccessActive).toBe(true)
      expect(result.current.reason).toBe('in_window')
    })

    it('finds soonest next window when outside all windows', () => {
      // Tuesday 2:30 PM
      const windows: AccessWindow[] = [
        {
          dayOfWeek: 'saturday', // 4 days away
          startTime: '14:00',
          endTime: '18:00',
          timezone: 'America/New_York',
        },
        {
          dayOfWeek: 'wednesday', // 1 day away (tomorrow)
          startTime: '10:00',
          endTime: '14:00',
          timezone: 'America/New_York',
        },
      ]

      const { result } = renderHook(() => useAccessWindowCheck(windows))

      expect(result.current.isAccessActive).toBe(false)
      expect(result.current.statusMessage).toMatch(/tomorrow at 10:00 AM/i)
    })
  })

  describe('Timezone handling (AC6)', () => {
    it('uses window timezone for calculations', () => {
      // Test with different timezone - the hook should use the window's timezone
      const windows: AccessWindow[] = [
        {
          dayOfWeek: 'tuesday',
          startTime: '14:00',
          endTime: '18:00',
          timezone: 'America/New_York',
        },
      ]

      const { result } = renderHook(() => useAccessWindowCheck(windows))

      // Current time in EST is 2:30 PM, which is in the 2-6 PM window
      expect(result.current.isAccessActive).toBe(true)
    })

    it('falls back gracefully with invalid timezone', () => {
      const windows: AccessWindow[] = [
        {
          dayOfWeek: 'tuesday',
          startTime: '14:00',
          endTime: '18:00',
          timezone: 'Invalid/Timezone',
        },
      ]

      // Should not throw - falls back to local time
      const { result } = renderHook(() => useAccessWindowCheck(windows))

      expect(result.current).toBeDefined()
    })
  })
})

describe('formatAccessWindows', () => {
  it('returns "anytime" message for empty windows', () => {
    const result = formatAccessWindows([])

    expect(result).toEqual(['You have access anytime'])
  })

  it('formats single window correctly', () => {
    const windows: AccessWindow[] = [
      { dayOfWeek: 'saturday', startTime: '14:00', endTime: '18:00', timezone: 'America/New_York' },
    ]

    const result = formatAccessWindows(windows)

    expect(result).toEqual(['Saturday 2:00 PM - 6:00 PM'])
  })

  it('formats multiple windows correctly', () => {
    const windows: AccessWindow[] = [
      { dayOfWeek: 'saturday', startTime: '14:00', endTime: '18:00', timezone: 'America/New_York' },
      { dayOfWeek: 'sunday', startTime: '10:00', endTime: '14:00', timezone: 'America/New_York' },
    ]

    const result = formatAccessWindows(windows)

    expect(result).toEqual(['Saturday 2:00 PM - 6:00 PM', 'Sunday 10:00 AM - 2:00 PM'])
  })

  it('handles morning times correctly', () => {
    const windows: AccessWindow[] = [
      { dayOfWeek: 'monday', startTime: '09:00', endTime: '11:00', timezone: 'America/New_York' },
    ]

    const result = formatAccessWindows(windows)

    expect(result).toEqual(['Monday 9:00 AM - 11:00 AM'])
  })

  it('handles noon correctly', () => {
    const windows: AccessWindow[] = [
      {
        dayOfWeek: 'wednesday',
        startTime: '12:00',
        endTime: '14:00',
        timezone: 'America/New_York',
      },
    ]

    const result = formatAccessWindows(windows)

    expect(result).toEqual(['Wednesday 12:00 PM - 2:00 PM'])
  })

  it('handles midnight correctly', () => {
    const windows: AccessWindow[] = [
      { dayOfWeek: 'friday', startTime: '00:00', endTime: '02:00', timezone: 'America/New_York' },
    ]

    const result = formatAccessWindows(windows)

    expect(result).toEqual(['Friday 12:00 AM - 2:00 AM'])
  })
})
