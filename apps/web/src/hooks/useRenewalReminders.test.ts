/**
 * useRenewalReminders Hook Tests - Story 35.2
 *
 * Tests for managing renewal reminder state and actions.
 * AC4: Reminders sent to both parent and child
 * AC5: One-tap "Renew now" action
 * AC6: Snooze option
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRenewalReminders } from './useRenewalReminders'

describe('useRenewalReminders - Story 35.2', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-01'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initialization', () => {
    it('should initialize with null when no expiry date', () => {
      const { result } = renderHook(() => useRenewalReminders({}))

      expect(result.current.currentReminder).toBeNull()
      expect(result.current.isReminderVisible).toBe(false)
    })

    it('should show reminder when expiry is within threshold', () => {
      const expiryDate = new Date('2024-07-01') // 30 days
      const { result } = renderHook(() => useRenewalReminders({ expiryDate }))

      expect(result.current.currentReminder).not.toBeNull()
      expect(result.current.currentReminder?.type).toBe('30-day')
    })

    it('should not show reminder when expiry is past', () => {
      const expiryDate = new Date('2024-05-01') // expired
      const { result } = renderHook(() => useRenewalReminders({ expiryDate }))

      expect(result.current.currentReminder).toBeNull()
    })
  })

  describe('reminder visibility', () => {
    it('should be visible by default when reminder exists', () => {
      const expiryDate = new Date('2024-07-01')
      const { result } = renderHook(() => useRenewalReminders({ expiryDate }))

      expect(result.current.isReminderVisible).toBe(true)
    })

    it('should not be visible after dismiss', () => {
      const expiryDate = new Date('2024-07-01')
      const { result } = renderHook(() => useRenewalReminders({ expiryDate }))

      act(() => {
        result.current.dismissReminder()
      })

      expect(result.current.isReminderVisible).toBe(false)
    })
  })

  describe('snooze functionality (AC6)', () => {
    it('should hide reminder after snooze', () => {
      const expiryDate = new Date('2024-07-01')
      const { result } = renderHook(() => useRenewalReminders({ expiryDate }))

      act(() => {
        result.current.snoozeReminder()
      })

      expect(result.current.isReminderVisible).toBe(false)
      expect(result.current.isSnoozed).toBe(true)
    })

    it('should set snoozedUntil date', () => {
      const expiryDate = new Date('2024-07-01')
      const { result } = renderHook(() => useRenewalReminders({ expiryDate }))

      act(() => {
        result.current.snoozeReminder()
      })

      expect(result.current.snoozedUntil).not.toBeNull()
      expect(result.current.snoozedUntil?.getDate()).toBe(4) // June 4
    })

    it('should not allow snooze for 1-day reminder', () => {
      const expiryDate = new Date('2024-06-03') // 2 days - 1-day zone
      const { result } = renderHook(() => useRenewalReminders({ expiryDate }))

      expect(result.current.canSnooze).toBe(false)
    })

    it('should allow snooze for 30-day reminder', () => {
      const expiryDate = new Date('2024-07-01')
      const { result } = renderHook(() => useRenewalReminders({ expiryDate }))

      expect(result.current.canSnooze).toBe(true)
    })
  })

  describe('renew action (AC5)', () => {
    it('should call onRenewClick when renewNow is called', () => {
      const onRenewClick = vi.fn()
      const expiryDate = new Date('2024-07-01')
      const { result } = renderHook(() => useRenewalReminders({ expiryDate, onRenewClick }))

      act(() => {
        result.current.renewNow()
      })

      expect(onRenewClick).toHaveBeenCalledTimes(1)
    })

    it('should hide reminder after renew action', () => {
      const expiryDate = new Date('2024-07-01')
      const { result } = renderHook(() => useRenewalReminders({ expiryDate }))

      act(() => {
        result.current.renewNow()
      })

      expect(result.current.isReminderVisible).toBe(false)
    })
  })

  describe('display variant (AC4)', () => {
    it('should provide parent message by default', () => {
      const expiryDate = new Date('2024-07-01')
      const { result } = renderHook(() => useRenewalReminders({ expiryDate }))

      expect(result.current.displayInfo?.message).toContain('30 days')
    })

    it('should provide child-friendly message when variant is child', () => {
      const expiryDate = new Date('2024-07-01')
      const { result } = renderHook(() => useRenewalReminders({ expiryDate, variant: 'child' }))

      expect(result.current.displayInfo?.message).toContain('month')
    })
  })

  describe('urgency levels', () => {
    it('should return info urgency for 30-day', () => {
      const expiryDate = new Date('2024-07-01')
      const { result } = renderHook(() => useRenewalReminders({ expiryDate }))

      expect(result.current.urgency).toBe('info')
    })

    it('should return warning urgency for 7-day', () => {
      const expiryDate = new Date('2024-06-10')
      const { result } = renderHook(() => useRenewalReminders({ expiryDate }))

      expect(result.current.urgency).toBe('warning')
    })

    it('should return critical urgency for 1-day', () => {
      const expiryDate = new Date('2024-06-03')
      const { result } = renderHook(() => useRenewalReminders({ expiryDate }))

      expect(result.current.urgency).toBe('critical')
    })
  })

  describe('reset functionality', () => {
    it('should reset snoozed state', () => {
      const expiryDate = new Date('2024-07-01')
      const { result } = renderHook(() => useRenewalReminders({ expiryDate }))

      act(() => {
        result.current.snoozeReminder()
      })

      expect(result.current.isSnoozed).toBe(true)

      act(() => {
        result.current.reset()
      })

      expect(result.current.isSnoozed).toBe(false)
      expect(result.current.isReminderVisible).toBe(true)
    })
  })
})
