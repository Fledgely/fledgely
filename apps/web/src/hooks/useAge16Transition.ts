/**
 * useAge16Transition Hook - Story 52.1 Task 6
 *
 * Hook for managing age 16 transition state and notifications.
 *
 * AC1: Check if child is approaching 16
 * AC2: Fetch pending transition notifications
 * AC5: Handle notification dismissal
 */

'use client'

import { useCallback, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpsCallable } from 'firebase/functions'
import { getFirebaseFunctions } from '../lib/firebase'
import type {
  Age16TransitionNotification,
  TransitionEligibility,
  TransitionGuide,
} from '@fledgely/shared'
import { getDefaultTransitionGuide } from '@fledgely/shared'

// Query keys
const QUERY_KEYS = {
  eligibility: ['age16-eligibility'] as const,
  notifications: ['age16-notifications'] as const,
}

// Types for callable function inputs/outputs
interface GetEligibilityInput {
  childId: string
}

interface GetEligibilityResponse {
  eligibility: TransitionEligibility
}

interface GetNotificationsInput {
  childId: string
}

interface GetNotificationsResponse {
  notifications: Age16TransitionNotification[]
}

interface DismissNotificationInput {
  notificationId: string
}

interface DismissNotificationResponse {
  success: boolean
}

interface AcknowledgeNotificationInput {
  notificationId: string
}

interface AcknowledgeNotificationResponse {
  success: boolean
}

/**
 * Hook for checking transition eligibility.
 */
export function useTransitionEligibility(childId: string | undefined) {
  return useQuery({
    queryKey: [...QUERY_KEYS.eligibility, childId],
    queryFn: async (): Promise<TransitionEligibility | null> => {
      if (!childId) return null

      const functions = getFirebaseFunctions()
      const fn = httpsCallable<GetEligibilityInput, GetEligibilityResponse>(
        functions,
        'getAge16TransitionEligibility'
      )
      const result = await fn({ childId })
      return result.data.eligibility
    },
    enabled: !!childId,
  })
}

/**
 * Hook for fetching pending transition notifications.
 */
export function useTransitionNotifications(childId: string | undefined) {
  return useQuery({
    queryKey: [...QUERY_KEYS.notifications, childId],
    queryFn: async (): Promise<Age16TransitionNotification[]> => {
      if (!childId) return []

      const functions = getFirebaseFunctions()
      const fn = httpsCallable<GetNotificationsInput, GetNotificationsResponse>(
        functions,
        'getAge16TransitionNotifications'
      )
      const result = await fn({ childId })
      return result.data.notifications
    },
    enabled: !!childId,
  })
}

/**
 * Hook for dismissing a transition notification.
 */
export function useDismissTransitionNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notificationId: string): Promise<void> => {
      const functions = getFirebaseFunctions()
      const fn = httpsCallable<DismissNotificationInput, DismissNotificationResponse>(
        functions,
        'dismissAge16TransitionNotification'
      )
      await fn({ notificationId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications })
    },
  })
}

/**
 * Hook for acknowledging a transition notification.
 */
export function useAcknowledgeTransitionNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notificationId: string): Promise<void> => {
      const functions = getFirebaseFunctions()
      const fn = httpsCallable<AcknowledgeNotificationInput, AcknowledgeNotificationResponse>(
        functions,
        'acknowledgeAge16TransitionNotification'
      )
      await fn({ notificationId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications })
    },
  })
}

/**
 * Main hook for age 16 transition state management.
 */
export function useAge16Transition(childId?: string) {
  // Get eligibility status
  const eligibilityQuery = useTransitionEligibility(childId)

  // Get pending notifications
  const notificationsQuery = useTransitionNotifications(childId)

  // Mutations
  const dismissMutation = useDismissTransitionNotification()
  const acknowledgeMutation = useAcknowledgeTransitionNotification()

  // Derived state
  const eligibility = eligibilityQuery.data
  const notifications = useMemo(() => notificationsQuery.data || [], [notificationsQuery.data])

  const isEligible = eligibility?.isEligible ?? false
  const isApproaching = eligibility?.isApproaching ?? false
  const daysUntil16 = eligibility?.daysUntil16 ?? null

  // Get the first pending notification (not dismissed, not acknowledged)
  const pendingNotification = useMemo(() => {
    return notifications.find((n) => !n.dismissed && !n.acknowledged) || null
  }, [notifications])

  // Actions
  const dismissNotification = useCallback(
    (notificationId: string) => {
      return dismissMutation.mutateAsync(notificationId)
    },
    [dismissMutation]
  )

  const acknowledgeNotification = useCallback(
    (notificationId: string) => {
      return acknowledgeMutation.mutateAsync(notificationId)
    },
    [acknowledgeMutation]
  )

  // Get the transition guide
  const getGuide = useCallback((): TransitionGuide => {
    return getDefaultTransitionGuide()
  }, [])

  // Check if reverse mode is available (must be 16+)
  const isReverseModeAvailable = isEligible

  return {
    // State
    eligibility,
    notifications,
    pendingNotification,
    isEligible,
    isApproaching,
    daysUntil16,
    isReverseModeAvailable,

    // Loading states
    isLoading: eligibilityQuery.isLoading || notificationsQuery.isLoading,
    isLoadingEligibility: eligibilityQuery.isLoading,
    isLoadingNotifications: notificationsQuery.isLoading,

    // Errors
    error: eligibilityQuery.error || notificationsQuery.error,
    eligibilityError: eligibilityQuery.error,
    notificationsError: notificationsQuery.error,

    // Actions
    dismissNotification,
    acknowledgeNotification,
    getGuide,

    // Mutation states
    isDismissing: dismissMutation.isPending,
    isAcknowledging: acknowledgeMutation.isPending,

    // Refetch
    refetchEligibility: eligibilityQuery.refetch,
    refetchNotifications: notificationsQuery.refetch,
  }
}

export default useAge16Transition
