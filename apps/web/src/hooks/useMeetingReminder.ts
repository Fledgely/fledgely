/**
 * useMeetingReminder Hook - Story 34.5.4 Task 4
 *
 * React hook for managing meeting reminder state.
 * AC4: Meeting Reminder (Optional)
 */

import { useState, useEffect, useCallback } from 'react'
import type { AgeTier } from '@fledgely/shared/contracts/mediationResources'
import type { FamilyMeetingReminder } from '@fledgely/shared/contracts/familyMeetingReminder'
import {
  scheduleMeetingReminder,
  cancelMeetingReminder,
  getPendingReminders,
} from '@fledgely/shared/services/familyMeetingReminderService'

// ============================================
// Types
// ============================================

export interface UseMeetingReminderProps {
  /** Family ID */
  familyId: string
  /** Who is creating the reminder */
  createdBy: string
  /** Template being used */
  templateId: string
  /** Age tier for content adaptation */
  ageTier: AgeTier
}

export interface UseMeetingReminderReturn {
  /** Current pending reminder for the family */
  pendingReminder: FamilyMeetingReminder | null
  /** Whether data is loading */
  loading: boolean
  /** Error if any operation failed */
  error: Error | null
  /** Schedule a new reminder */
  scheduleReminder: (scheduledAt: Date) => Promise<void>
  /** Cancel the pending reminder */
  cancelReminder: () => Promise<void>
  /** Whether a schedule operation is in progress */
  isScheduling: boolean
}

// ============================================
// Hook Implementation
// ============================================

/**
 * Hook to manage family meeting reminders.
 *
 * Loads any pending reminder on mount and provides
 * functions to schedule and cancel reminders.
 */
export function useMeetingReminder({
  familyId,
  createdBy,
  templateId,
  ageTier,
}: UseMeetingReminderProps): UseMeetingReminderReturn {
  const [pendingReminder, setPendingReminder] = useState<FamilyMeetingReminder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isScheduling, setIsScheduling] = useState(false)

  // Load pending reminders on mount
  useEffect(() => {
    let mounted = true

    async function loadPendingReminders() {
      try {
        const reminders = await getPendingReminders(familyId)
        if (mounted) {
          // Get the first pending reminder (if any)
          setPendingReminder(reminders.length > 0 ? reminders[0] : null)
          setLoading(false)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to load reminders'))
          setLoading(false)
        }
      }
    }

    loadPendingReminders()

    return () => {
      mounted = false
    }
  }, [familyId])

  // Schedule a new reminder
  const scheduleReminderFn = useCallback(
    async (scheduledAt: Date) => {
      setIsScheduling(true)
      setError(null)

      try {
        const reminder = await scheduleMeetingReminder({
          familyId,
          scheduledAt,
          createdBy,
          templateId,
          ageTier,
        })
        setPendingReminder(reminder)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to schedule reminder'))
      } finally {
        setIsScheduling(false)
      }
    },
    [familyId, createdBy, templateId, ageTier]
  )

  // Cancel the pending reminder
  const cancelReminderFn = useCallback(async () => {
    if (!pendingReminder) {
      return
    }

    try {
      await cancelMeetingReminder(pendingReminder.id)
      setPendingReminder(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to cancel reminder'))
    }
  }, [pendingReminder])

  return {
    pendingReminder,
    loading,
    error,
    scheduleReminder: scheduleReminderFn,
    cancelReminder: cancelReminderFn,
    isScheduling,
  }
}
