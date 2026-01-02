/**
 * useEscalationStatus Hook - Story 34.5.2 Task 6
 *
 * Hook for checking and managing escalation status.
 * AC1: Display Mediation Prompt on Escalation
 *
 * CRITICAL: Supports child empowerment by tracking escalation state.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore'

// ============================================
// Types
// ============================================

/**
 * Escalation event data.
 */
export interface EscalationEvent {
  id: string
  familyId: string
  childId: string
  triggeredAt: Date
  resolvedAt: Date | null
}

/**
 * Current escalation status.
 */
export interface EscalationStatus {
  /** Whether there is an active (unresolved) escalation */
  hasActiveEscalation: boolean
  /** The active escalation event, if any */
  escalationEvent: EscalationEvent | null
  /** Whether child has acknowledged the escalation */
  isAcknowledged: boolean
}

/**
 * Return type for useEscalationStatus hook.
 */
export interface UseEscalationStatusReturn {
  /** Current escalation status */
  status: EscalationStatus | null
  /** Loading state */
  loading: boolean
  /** Error if fetch failed */
  error: Error | null
  /** Function to acknowledge the escalation */
  acknowledgeEscalation: () => Promise<void>
}

// ============================================
// Constants
// ============================================

const ESCALATION_EVENTS_COLLECTION = 'escalationEvents'
const ESCALATION_ACKNOWLEDGMENTS_COLLECTION = 'escalationAcknowledgments'

// ============================================
// Hook Implementation
// ============================================

/**
 * Hook to check and manage escalation status for a child.
 *
 * @param familyId - Family's unique identifier
 * @param childId - Child's unique identifier
 * @returns Escalation status and management functions
 */
export function useEscalationStatus(familyId: string, childId: string): UseEscalationStatusReturn {
  const [status, setStatus] = useState<EscalationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [currentEscalationId, setCurrentEscalationId] = useState<string | null>(null)

  // Subscribe to escalation events
  useEffect(() => {
    const db = getFirestore()

    // Query for active (unresolved) escalation events for this child
    const escalationQuery = query(
      collection(db, ESCALATION_EVENTS_COLLECTION),
      where('familyId', '==', familyId),
      where('childId', '==', childId),
      where('resolvedAt', '==', null),
      orderBy('triggeredAt', 'desc'),
      limit(1)
    )

    const unsubscribe = onSnapshot(
      escalationQuery,
      (snapshot) => {
        if (snapshot.empty) {
          setStatus({
            hasActiveEscalation: false,
            escalationEvent: null,
            isAcknowledged: false,
          })
          setCurrentEscalationId(null)
        } else {
          const docSnap = snapshot.docs[0]
          const data = docSnap.data()

          // Check if escalation is actually resolved
          if (data.resolvedAt) {
            setStatus({
              hasActiveEscalation: false,
              escalationEvent: null,
              isAcknowledged: false,
            })
            setCurrentEscalationId(null)
          } else {
            const escalationEvent: EscalationEvent = {
              id: docSnap.id,
              familyId: data.familyId,
              childId: data.childId,
              triggeredAt: data.triggeredAt?.toDate() || new Date(),
              resolvedAt: null,
            }

            setStatus({
              hasActiveEscalation: true,
              escalationEvent,
              isAcknowledged: false,
            })
            setCurrentEscalationId(docSnap.id)
          }
        }
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [familyId, childId])

  // Acknowledge escalation
  const acknowledgeEscalation = useCallback(async () => {
    if (!currentEscalationId) {
      return
    }

    try {
      const db = getFirestore()
      const ackId = `${childId}_${currentEscalationId}`
      const ackRef = doc(db, ESCALATION_ACKNOWLEDGMENTS_COLLECTION, ackId)

      await setDoc(ackRef, {
        id: ackId,
        familyId,
        childId,
        escalationEventId: currentEscalationId,
        acknowledgedAt: serverTimestamp(),
        viewedResources: false,
      })

      // Update local state
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              isAcknowledged: true,
            }
          : null
      )
    } catch (err) {
      // Surface error to caller - they can handle/display as needed
      setError(err instanceof Error ? err : new Error('Failed to acknowledge escalation'))
      throw err
    }
  }, [familyId, childId, currentEscalationId])

  return {
    status,
    loading,
    error,
    acknowledgeEscalation,
  }
}
