/**
 * useParentNotificationPreferences Hook
 *
 * Story 41.1: Notification Preferences Configuration
 * - AC5: Per-child preferences (FR152)
 * - AC6: Reasonable defaults
 * - AC7: Immediate application
 *
 * Manages parent notification preferences for flags, time limits, sync alerts.
 */

import { useState, useCallback, useEffect } from 'react'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { useAuth } from '../contexts/AuthContext'
import type { ParentNotificationPreferences, NotificationPreferencesUpdate } from '@fledgely/shared'

interface UseParentNotificationPreferencesOptions {
  familyId: string
  childId?: string | null
}

interface UseParentNotificationPreferencesResult {
  preferences: ParentNotificationPreferences | null
  isDefault: boolean
  isLoading: boolean
  isUpdating: boolean
  error: Error | null
  updatePreferences: (
    updates: NotificationPreferencesUpdate
  ) => Promise<{ success: boolean; updatedChildren: string[] }>
  refetch: () => Promise<void>
}

export function useParentNotificationPreferences({
  familyId,
  childId,
}: UseParentNotificationPreferencesOptions): UseParentNotificationPreferencesResult {
  const { firebaseUser } = useAuth()
  const [preferences, setPreferences] = useState<ParentNotificationPreferences | null>(null)
  const [isDefault, setIsDefault] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Load preferences
  const fetchPreferences = useCallback(async () => {
    if (!firebaseUser || !familyId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const functions = getFunctions()
      const getPreferencesCallable = httpsCallable<
        { familyId: string; childId?: string | null },
        { preferences: ParentNotificationPreferences; isDefault: boolean }
      >(functions, 'getNotificationPreferences')

      const result = await getPreferencesCallable({ familyId, childId })
      setPreferences(result.data.preferences)
      setIsDefault(result.data.isDefault)
    } catch (err) {
      console.error('Failed to load notification preferences:', err)
      setError(err instanceof Error ? err : new Error('Failed to load preferences'))
    } finally {
      setIsLoading(false)
    }
  }, [firebaseUser, familyId, childId])

  // Update preferences
  const updatePreferences = useCallback(
    async (
      updates: NotificationPreferencesUpdate
    ): Promise<{ success: boolean; updatedChildren: string[] }> => {
      if (!firebaseUser || !familyId) {
        throw new Error('Not authenticated')
      }

      setIsUpdating(true)
      setError(null)

      try {
        const functions = getFunctions()
        const updatePreferencesCallable = httpsCallable<
          { familyId: string; preferences: NotificationPreferencesUpdate },
          {
            success: boolean
            preferences: ParentNotificationPreferences
            updatedChildren: string[]
          }
        >(functions, 'updateNotificationPreferences')

        const result = await updatePreferencesCallable({
          familyId,
          preferences: { ...updates, childId },
        })

        setPreferences(result.data.preferences)
        setIsDefault(false)

        return {
          success: result.data.success,
          updatedChildren: result.data.updatedChildren,
        }
      } catch (err) {
        console.error('Failed to update notification preferences:', err)
        const error = err instanceof Error ? err : new Error('Failed to update preferences')
        setError(error)
        throw error
      } finally {
        setIsUpdating(false)
      }
    },
    [firebaseUser, familyId, childId]
  )

  // Initial fetch
  useEffect(() => {
    fetchPreferences()
  }, [fetchPreferences])

  return {
    preferences,
    isDefault,
    isLoading,
    isUpdating,
    error,
    updatePreferences,
    refetch: fetchPreferences,
  }
}

export type { ParentNotificationPreferences, NotificationPreferencesUpdate }
