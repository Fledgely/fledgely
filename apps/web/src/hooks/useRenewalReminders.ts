/**
 * useRenewalReminders Hook - Story 35.2
 *
 * Hook for managing renewal reminder state and actions.
 * AC4: Reminders for both parent and child
 * AC5: One-tap "Renew now" action
 * AC6: Snooze option
 */

import { useState, useMemo, useCallback } from 'react'
import { getReminderConfig, calculateSnoozeExpiry, type ReminderType } from '@fledgely/shared'
import {
  getActiveReminder,
  getReminderDisplayInfo,
  type ReminderUrgency,
  type ActiveReminder,
  type ReminderDisplayInfo,
} from '../services/renewalReminderService'

export interface UseRenewalRemindersParams {
  /** Agreement expiry date */
  expiryDate?: Date | null
  /** Display variant for messaging */
  variant?: 'parent' | 'child'
  /** Callback when renew action is triggered */
  onRenewClick?: () => void
}

export interface UseRenewalRemindersResult {
  /** Current active reminder or null */
  currentReminder: ActiveReminder | null
  /** Whether reminder should be visible */
  isReminderVisible: boolean
  /** Display information for rendering */
  displayInfo: ReminderDisplayInfo | null
  /** Current urgency level */
  urgency: ReminderUrgency | null
  /** Whether reminder is currently snoozed */
  isSnoozed: boolean
  /** Date when snooze expires */
  snoozedUntil: Date | null
  /** Whether current reminder can be snoozed */
  canSnooze: boolean
  /** Snooze the reminder for 3 days */
  snoozeReminder: () => void
  /** Dismiss the reminder (permanent for session) */
  dismissReminder: () => void
  /** Trigger renew action */
  renewNow: () => void
  /** Reset all reminder state */
  reset: () => void
}

/**
 * Hook for managing renewal reminder state and actions.
 */
export function useRenewalReminders({
  expiryDate,
  variant = 'parent',
  onRenewClick,
}: UseRenewalRemindersParams = {}): UseRenewalRemindersResult {
  const [isDismissed, setIsDismissed] = useState(false)
  const [snoozeInfo, setSnoozeInfo] = useState<{
    snoozedAt: Date
    reminderType: ReminderType
  } | null>(null)

  // Get current reminder
  const currentReminder = useMemo(() => {
    return getActiveReminder(expiryDate ?? null)
  }, [expiryDate])

  // Get display info
  const displayInfo = useMemo(() => {
    return getReminderDisplayInfo(expiryDate ?? null, variant)
  }, [expiryDate, variant])

  // Calculate urgency
  const urgency = useMemo(() => {
    if (!currentReminder) return null
    return currentReminder.urgency
  }, [currentReminder])

  // Check if snoozed and snooze expired
  const isSnoozed = useMemo(() => {
    if (!snoozeInfo || !currentReminder) return false
    // Check if snooze expired
    const snoozeExpiry = calculateSnoozeExpiry(snoozeInfo.snoozedAt)
    const now = new Date()
    if (now >= snoozeExpiry) {
      return false // Snooze expired
    }
    // Only snoozed if same reminder type
    return snoozeInfo.reminderType === currentReminder.type
  }, [snoozeInfo, currentReminder])

  // Calculate snoozed until date
  const snoozedUntil = useMemo(() => {
    if (!snoozeInfo || !isSnoozed) return null
    return calculateSnoozeExpiry(snoozeInfo.snoozedAt)
  }, [snoozeInfo, isSnoozed])

  // Check if current reminder can be snoozed
  const canSnooze = useMemo(() => {
    if (!currentReminder) return false
    const config = getReminderConfig(currentReminder.type)
    return config.canSnooze
  }, [currentReminder])

  // Is reminder visible?
  const isReminderVisible = useMemo(() => {
    if (!currentReminder) return false
    if (isDismissed) return false
    if (isSnoozed) return false
    return true
  }, [currentReminder, isDismissed, isSnoozed])

  // Snooze reminder
  const snoozeReminder = useCallback(() => {
    if (!currentReminder || !canSnooze) return
    setSnoozeInfo({
      snoozedAt: new Date(),
      reminderType: currentReminder.type,
    })
  }, [currentReminder, canSnooze])

  // Dismiss reminder
  const dismissReminder = useCallback(() => {
    setIsDismissed(true)
  }, [])

  // Renew now action
  const renewNow = useCallback(() => {
    setIsDismissed(true)
    onRenewClick?.()
  }, [onRenewClick])

  // Reset all state
  const reset = useCallback(() => {
    setIsDismissed(false)
    setSnoozeInfo(null)
  }, [])

  return {
    currentReminder,
    isReminderVisible,
    displayInfo,
    urgency,
    isSnoozed,
    snoozedUntil,
    canSnooze,
    snoozeReminder,
    dismissReminder,
    renewNow,
    reset,
  }
}
