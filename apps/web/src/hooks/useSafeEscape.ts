'use client'

/**
 * useSafeEscape Hook
 *
 * Story 40.3: Fleeing Mode - Safe Escape
 *
 * Hook for activating and managing Safe Escape functionality.
 * Provides instant location feature disabling for family members
 * who feel unsafe.
 *
 * CRITICAL SAFETY DESIGN:
 * - Instant activation with no confirmation (AC1)
 * - Neutral, calming error messages
 * - Only activator can re-enable (AC5)
 *
 * Requirements:
 * - AC1: Instant activation, no confirmation
 * - AC5: Only activator can re-enable
 */

import { useState, useCallback, useEffect } from 'react'
import { httpsCallable, HttpsCallableResult } from 'firebase/functions'
import { getFirebaseFunctions } from '../lib/firebase'
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  type DocumentData,
} from 'firebase/firestore'
import { getFirebaseApp } from '../lib/firebase'
import type {
  ActivateSafeEscapeInput,
  ActivateSafeEscapeResponse,
  ReenableSafeEscapeInput,
  ReenableSafeEscapeResponse,
  SafeEscapeActivation,
} from '@fledgely/shared'

interface UseSafeEscapeResult {
  /** Activate Safe Escape - INSTANT, NO CONFIRMATION */
  activate: () => Promise<{ activationId: string }>
  /** Re-enable location features (only for activator) */
  reenable: () => Promise<void>
  /** Whether Safe Escape is currently activated */
  isActivated: boolean
  /** Current activation details (if activated) */
  activation: SafeEscapeActivation | null
  /** Whether the current user is the activator */
  isActivator: boolean
  /** Whether an activation is in progress */
  isActivating: boolean
  /** Whether re-enabling is in progress */
  isReenabling: boolean
  /** Error message (neutral language) */
  error: string | null
  /** Clear any error state */
  clearError: () => void
}

interface UseSafeEscapeOptions {
  /** Family ID to monitor */
  familyId: string
  /** Current user ID */
  userId: string
}

/**
 * Hook to manage Safe Escape functionality.
 *
 * CRITICAL: This feature must work INSTANTLY without confirmation.
 * Any delays could put a family member in danger.
 *
 * Example usage:
 * ```tsx
 * const {
 *   activate,
 *   reenable,
 *   isActivated,
 *   isActivator,
 *   isActivating,
 *   error
 * } = useSafeEscape({ familyId: 'family-123', userId: 'user-456' })
 *
 * const handleActivate = async () => {
 *   await activate() // Instant, no confirmation
 * }
 * ```
 */
export function useSafeEscape({ familyId, userId }: UseSafeEscapeOptions): UseSafeEscapeResult {
  const [isActivating, setIsActivating] = useState(false)
  const [isReenabling, setIsReenabling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activation, setActivation] = useState<SafeEscapeActivation | null>(null)

  // Subscribe to the most recent active Safe Escape activation
  useEffect(() => {
    if (!familyId) return

    const db = getFirestore(getFirebaseApp())
    const activationsRef = collection(db, 'families', familyId, 'safeEscapeActivations')
    const q = query(
      activationsRef,
      where('reenabledAt', '==', null),
      orderBy('activatedAt', 'desc'),
      limit(1)
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          setActivation(null)
        } else {
          const doc = snapshot.docs[0]
          const data = doc.data() as DocumentData
          setActivation({
            id: data.id || doc.id,
            familyId: data.familyId,
            activatedBy: data.activatedBy,
            activatedAt: data.activatedAt?.toDate?.() ?? new Date(data.activatedAt),
            notificationSentAt: data.notificationSentAt?.toDate?.() ?? null,
            clearedLocationHistory: data.clearedLocationHistory ?? true,
            reenabledAt: null,
            reenabledBy: null,
          })
        }
      },
      (err) => {
        // Log error but don't expose to user
        console.error('[SafeEscape] Subscription error:', err)
      }
    )

    return () => unsubscribe()
  }, [familyId])

  // Activate Safe Escape - INSTANT, NO CONFIRMATION
  const activate = useCallback(async (): Promise<{ activationId: string }> => {
    if (isActivating) {
      return { activationId: '' }
    }

    setIsActivating(true)
    setError(null)

    try {
      const functions = getFirebaseFunctions()
      const activateFn = httpsCallable<ActivateSafeEscapeInput, ActivateSafeEscapeResponse>(
        functions,
        'activateSafeEscape'
      )

      const result: HttpsCallableResult<ActivateSafeEscapeResponse> = await activateFn({
        familyId,
      })

      if (result.data.success) {
        return { activationId: result.data.activationId }
      }

      // Shouldn't happen, but handle gracefully
      setError('Unable to activate. Please try again.')
      return { activationId: '' }
    } catch (err: unknown) {
      const errorCode = (err as { code?: string })?.code || ''

      if (errorCode === 'functions/permission-denied') {
        setError('You do not have permission to activate this feature.')
      } else if (errorCode === 'functions/not-found') {
        setError('Family not found. Please try again.')
      } else {
        // Neutral error for other cases
        setError('Unable to activate. Please try again.')
      }

      console.error('[SafeEscape] Activation error:', { code: errorCode })
      return { activationId: '' }
    } finally {
      setIsActivating(false)
    }
  }, [familyId, isActivating])

  // Re-enable location features (only for activator)
  const reenable = useCallback(async (): Promise<void> => {
    if (isReenabling || !activation) {
      return
    }

    setIsReenabling(true)
    setError(null)

    try {
      const functions = getFirebaseFunctions()
      const reenableFn = httpsCallable<ReenableSafeEscapeInput, ReenableSafeEscapeResponse>(
        functions,
        'reenableSafeEscape'
      )

      const result: HttpsCallableResult<ReenableSafeEscapeResponse> = await reenableFn({
        familyId,
        activationId: activation.id,
      })

      if (!result.data.success) {
        setError('Unable to re-enable. Please try again.')
      }
    } catch (err: unknown) {
      const errorCode = (err as { code?: string })?.code || ''

      if (errorCode === 'functions/permission-denied') {
        // AC5: Only activator can re-enable
        setError('Only the person who activated Safe Escape can re-enable.')
      } else if (errorCode === 'functions/not-found') {
        setError('Activation not found. It may have already been re-enabled.')
      } else {
        setError('Unable to re-enable. Please try again.')
      }

      console.error('[SafeEscape] Reenable error:', { code: errorCode })
    } finally {
      setIsReenabling(false)
    }
  }, [familyId, activation, isReenabling])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    activate,
    reenable,
    isActivated: activation !== null,
    activation,
    isActivator: activation?.activatedBy === userId,
    isActivating,
    isReenabling,
    error,
    clearError,
  }
}
