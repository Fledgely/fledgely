/**
 * Renewal Reminders Integration Tests - Story 35.2
 *
 * Integration tests verifying all renewal reminder components work together.
 * Tests the complete flow from reminder detection to user actions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { renderHook, act } from '@testing-library/react'
import { useRenewalReminders } from '../../hooks/useRenewalReminders'
import { RenewalReminderBanner } from './RenewalReminderBanner'
import { RenewalReminderCard } from './RenewalReminderCard'
import { getReminderType, shouldShowReminder, calculateSnoozeExpiry } from '@fledgely/shared'
import { getActiveReminder, getReminderDisplayInfo } from '../../services/renewalReminderService'

describe('Renewal Reminders Integration - Story 35.2', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-01'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('complete reminder flow', () => {
    it('should detect 30-day reminder and display correctly in both components', () => {
      const expiryDate = new Date('2024-07-01') // 30 days from June 1
      const onRenew = vi.fn()
      const onSnooze = vi.fn()
      const onDismiss = vi.fn()

      // Verify reminder type detection
      const reminderType = getReminderType(expiryDate)
      expect(reminderType).toBe('30-day')

      // Verify active reminder
      const activeReminder = getActiveReminder(expiryDate)
      expect(activeReminder?.type).toBe('30-day')
      expect(activeReminder?.urgency).toBe('info')
      expect(activeReminder?.canSnooze).toBe(true)

      // Render banner
      const { rerender } = render(
        <RenewalReminderBanner
          expiryDate={expiryDate}
          onRenewClick={onRenew}
          onSnoozeClick={onSnooze}
          onDismiss={onDismiss}
        />
      )

      expect(screen.getByRole('alert')).toHaveAttribute('data-urgency', 'info')
      expect(screen.getByText(/30 days/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /renew now/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /remind me in 3 days/i })).toBeInTheDocument()

      // Render card
      rerender(
        <RenewalReminderCard
          expiryDate={expiryDate}
          onRenewClick={onRenew}
          onSnoozeClick={onSnooze}
        />
      )

      expect(screen.getByTestId('renewal-reminder-card')).toHaveAttribute('data-urgency', 'info')
      expect(screen.getByText('30')).toBeInTheDocument()
    })

    it('should detect 7-day reminder and display warning urgency', () => {
      const expiryDate = new Date('2024-06-08') // 7 days from June 1
      const onRenew = vi.fn()
      const onSnooze = vi.fn()
      const onDismiss = vi.fn()

      const reminderType = getReminderType(expiryDate)
      expect(reminderType).toBe('7-day')

      const activeReminder = getActiveReminder(expiryDate)
      expect(activeReminder?.urgency).toBe('warning')

      render(
        <RenewalReminderBanner
          expiryDate={expiryDate}
          onRenewClick={onRenew}
          onSnoozeClick={onSnooze}
          onDismiss={onDismiss}
        />
      )

      expect(screen.getByRole('alert')).toHaveAttribute('data-urgency', 'warning')
    })

    it('should detect 1-day reminder and display critical urgency without snooze', () => {
      const expiryDate = new Date('2024-06-02') // 1 day from June 1
      const onRenew = vi.fn()
      const onSnooze = vi.fn()
      const onDismiss = vi.fn()

      const reminderType = getReminderType(expiryDate)
      expect(reminderType).toBe('1-day')

      const activeReminder = getActiveReminder(expiryDate)
      expect(activeReminder?.urgency).toBe('critical')
      expect(activeReminder?.canSnooze).toBe(false)

      render(
        <RenewalReminderBanner
          expiryDate={expiryDate}
          onRenewClick={onRenew}
          onSnoozeClick={onSnooze}
          onDismiss={onDismiss}
        />
      )

      expect(screen.getByRole('alert')).toHaveAttribute('data-urgency', 'critical')
      expect(screen.queryByRole('button', { name: /remind me in 3 days/i })).not.toBeInTheDocument()
    })
  })

  describe('hook integration with components', () => {
    it('should use hook state to control banner visibility', () => {
      const expiryDate = new Date('2024-07-01')
      const onRenewClick = vi.fn()

      const { result } = renderHook(() => useRenewalReminders({ expiryDate, onRenewClick }))

      // Initial state should show reminder
      expect(result.current.isReminderVisible).toBe(true)
      expect(result.current.displayInfo).not.toBeNull()

      // Dismiss should hide
      act(() => {
        result.current.dismissReminder()
      })

      expect(result.current.isReminderVisible).toBe(false)

      // Reset should show again
      act(() => {
        result.current.reset()
      })

      expect(result.current.isReminderVisible).toBe(true)
    })

    it('should handle snooze flow correctly', () => {
      const expiryDate = new Date('2024-07-01')

      const { result } = renderHook(() => useRenewalReminders({ expiryDate }))

      expect(result.current.canSnooze).toBe(true)
      expect(result.current.isSnoozed).toBe(false)

      act(() => {
        result.current.snoozeReminder()
      })

      expect(result.current.isSnoozed).toBe(true)
      expect(result.current.isReminderVisible).toBe(false)
      expect(result.current.snoozedUntil).not.toBeNull()

      // Snooze should expire after 3 days
      const snoozeExpiry = calculateSnoozeExpiry(new Date())
      expect(snoozeExpiry.getDate()).toBe(4) // June 4
    })

    it('should trigger renew callback and hide reminder', () => {
      const expiryDate = new Date('2024-07-01')
      const onRenewClick = vi.fn()

      const { result } = renderHook(() => useRenewalReminders({ expiryDate, onRenewClick }))

      expect(result.current.isReminderVisible).toBe(true)

      act(() => {
        result.current.renewNow()
      })

      expect(onRenewClick).toHaveBeenCalledTimes(1)
      expect(result.current.isReminderVisible).toBe(false)
    })
  })

  describe('parent and child variant consistency', () => {
    it('should show appropriate messages for parent variant', () => {
      const expiryDate = new Date('2024-07-01')

      const displayInfo = getReminderDisplayInfo(expiryDate, 'parent')
      expect(displayInfo?.message).toContain('30 days')

      const { result } = renderHook(() => useRenewalReminders({ expiryDate, variant: 'parent' }))

      expect(result.current.displayInfo?.message).toContain('30 days')
    })

    it('should show appropriate messages for child variant', () => {
      const expiryDate = new Date('2024-07-01')

      const displayInfo = getReminderDisplayInfo(expiryDate, 'child')
      expect(displayInfo?.message).toContain('month')

      const { result } = renderHook(() => useRenewalReminders({ expiryDate, variant: 'child' }))

      expect(result.current.displayInfo?.message).toContain('month')
    })
  })

  describe('threshold boundary conditions', () => {
    it('should correctly handle exactly 30 days', () => {
      // June 1 + 30 days = July 1
      const expiryDate = new Date('2024-07-01')
      expect(getReminderType(expiryDate)).toBe('30-day')
    })

    it('should correctly handle exactly 7 days', () => {
      // June 1 + 7 days = June 8
      const expiryDate = new Date('2024-06-08')
      expect(getReminderType(expiryDate)).toBe('7-day')
    })

    it('should correctly handle exactly 1 day', () => {
      // June 1 + 1 day = June 2
      const expiryDate = new Date('2024-06-02')
      expect(getReminderType(expiryDate)).toBe('1-day')
    })

    it('should return null for past dates', () => {
      const expiryDate = new Date('2024-05-31')
      expect(getReminderType(expiryDate)).toBeNull()
    })

    it('should return 30-day reminder for dates beyond 30 days', () => {
      // Implementation shows 30-day reminder for any date 30+ days away
      const expiryDate = new Date('2024-08-01') // 61 days
      expect(getReminderType(expiryDate)).toBe('30-day')
    })
  })

  describe('snooze behavior', () => {
    it('should not allow snooze for 1-day reminder', () => {
      const expiryDate = new Date('2024-06-02')

      const { result } = renderHook(() => useRenewalReminders({ expiryDate }))

      expect(result.current.canSnooze).toBe(false)

      act(() => {
        result.current.snoozeReminder()
      })

      // Should not snooze
      expect(result.current.isSnoozed).toBe(false)
    })

    it('should show reminder when snooze is allowed but not yet snoozed', () => {
      const expiryDate = new Date('2024-07-01')

      expect(shouldShowReminder(expiryDate)).toBe(true)
      expect(shouldShowReminder(expiryDate, undefined)).toBe(true)
    })

    it('should calculate snooze expiry correctly', () => {
      const snoozedAt = new Date('2024-06-01')
      const expiry = calculateSnoozeExpiry(snoozedAt)

      expect(expiry.getFullYear()).toBe(2024)
      expect(expiry.getMonth()).toBe(5) // June (0-indexed)
      expect(expiry.getDate()).toBe(4) // 3 days later
    })
  })

  describe('complete user journey', () => {
    it('should handle full renewal journey: see → snooze → see again → renew', () => {
      const expiryDate = new Date('2024-07-01')
      const onRenewClick = vi.fn()

      const { result } = renderHook(() => useRenewalReminders({ expiryDate, onRenewClick }))

      // 1. Initially visible
      expect(result.current.isReminderVisible).toBe(true)
      expect(result.current.currentReminder?.type).toBe('30-day')

      // 2. User snoozes
      act(() => {
        result.current.snoozeReminder()
      })
      expect(result.current.isReminderVisible).toBe(false)
      expect(result.current.isSnoozed).toBe(true)

      // 3. Time passes (3 days) - snooze expires
      act(() => {
        vi.setSystemTime(new Date('2024-06-04T12:00:00'))
        result.current.reset() // In real app, this would check on mount
      })
      expect(result.current.isReminderVisible).toBe(true)

      // 4. User clicks renew
      act(() => {
        result.current.renewNow()
      })
      expect(onRenewClick).toHaveBeenCalledTimes(1)
      expect(result.current.isReminderVisible).toBe(false)
    })

    it('should handle dismiss journey: see → dismiss → stays hidden', () => {
      const expiryDate = new Date('2024-07-01')

      const { result } = renderHook(() => useRenewalReminders({ expiryDate }))

      // 1. Initially visible
      expect(result.current.isReminderVisible).toBe(true)

      // 2. User dismisses
      act(() => {
        result.current.dismissReminder()
      })
      expect(result.current.isReminderVisible).toBe(false)

      // 3. Even with time passing, stays dismissed (for session)
      act(() => {
        vi.setSystemTime(new Date('2024-06-04'))
      })
      expect(result.current.isReminderVisible).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle null expiry date gracefully', () => {
      const onRenew = vi.fn()
      const onSnooze = vi.fn()
      const onDismiss = vi.fn()

      const { container } = render(
        <RenewalReminderBanner
          expiryDate={null}
          onRenewClick={onRenew}
          onSnoozeClick={onSnooze}
          onDismiss={onDismiss}
        />
      )

      expect(container.firstChild).toBeNull()
    })

    it('should handle undefined expiry date in hook', () => {
      const { result } = renderHook(() => useRenewalReminders({}))

      expect(result.current.currentReminder).toBeNull()
      expect(result.current.isReminderVisible).toBe(false)
    })

    it('should handle same-day expiry (today) as expired', () => {
      // Expiry is today at midnight - 0 days remaining = expired/null
      const expiryDate = new Date('2024-06-01')

      const reminderType = getReminderType(expiryDate)
      // Same day expiry means 0 days remaining which is < 1, so null
      expect(reminderType).toBeNull()
    })
  })
})
