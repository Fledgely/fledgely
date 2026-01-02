/**
 * RejectionPatternService - Story 34.5.1 Task 1
 *
 * Service for tracking and analyzing rejection patterns.
 * AC1: Track Proposal Rejections
 * AC2: 90-Day Rolling Window
 * AC3: Threshold Detection
 *
 * CRITICAL SAFETY:
 * - Privacy-preserving: Only track aggregate patterns
 * - No proposal content stored
 * - Child rights: Surface communication breakdowns
 */

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
} from 'firebase/firestore'

// ============================================
// Constants
// ============================================

/**
 * Firestore collection for rejection patterns.
 * Tracks aggregate data per child (family-visible).
 */
export const REJECTION_PATTERNS_COLLECTION = 'rejectionPatterns'

/**
 * Firestore collection for rejection events.
 * Individual events (system-only, privacy).
 */
export const REJECTION_EVENTS_COLLECTION = 'rejectionEvents'

/**
 * Firestore collection for escalation events.
 * Threshold breach events (family-visible).
 */
export const ESCALATION_EVENTS_COLLECTION = 'escalationEvents'

/**
 * Default window for rejection pattern analysis (90 days).
 */
export const REJECTION_WINDOW_DAYS = 90

/**
 * Default threshold for escalation (3 rejections within window).
 */
export const REJECTION_THRESHOLD = 3

// ============================================
// Types
// ============================================

/**
 * Rejection pattern tracking data.
 * Aggregate data per child - family-visible.
 */
export interface RejectionPattern {
  /** Unique pattern identifier */
  id: string
  /** Family ID */
  familyId: string
  /** Child ID */
  childId: string
  /** Total proposals submitted by child */
  totalProposals: number
  /** Total rejections received */
  totalRejections: number
  /** Rejections within the rolling window */
  rejectionsInWindow: number
  /** Last proposal timestamp */
  lastProposalAt: Date | null
  /** Last rejection timestamp */
  lastRejectionAt: Date | null
  /** Whether escalation has been triggered */
  escalationTriggered: boolean
  /** When escalation was triggered */
  escalationTriggeredAt: Date | null
  /** When pattern was created */
  createdAt: Date
  /** When pattern was last updated */
  updatedAt: Date
}

/**
 * Rejection event for tracking.
 * Individual event - system-only for privacy.
 * CRITICAL: No proposal content stored.
 */
export interface RejectionEvent {
  /** Unique event identifier */
  id: string
  /** Family ID */
  familyId: string
  /** Child ID */
  childId: string
  /** Proposal ID reference only (no content) */
  proposalId: string
  /** When rejected */
  rejectedAt: Date
}

/**
 * Escalation event for threshold breaches.
 * Family-visible to promote transparency.
 */
export interface EscalationEvent {
  /** Unique event identifier */
  id: string
  /** Family ID */
  familyId: string
  /** Child ID */
  childId: string
  /** When escalation was triggered */
  triggeredAt: Date
  /** Number of rejections that triggered escalation */
  rejectionsCount: number
  /** Window period in days */
  windowDays: number
  /** Whether escalation has been acknowledged */
  acknowledged: boolean
  /** When acknowledged */
  acknowledgedAt: Date | null
}

// ============================================
// Firestore Helpers
// ============================================

function getPatternDocRef(childId: string) {
  const db = getFirestore()
  return doc(db, REJECTION_PATTERNS_COLLECTION, childId)
}

function getEventsCollection() {
  const db = getFirestore()
  return collection(db, REJECTION_EVENTS_COLLECTION)
}

function getEscalationCollection() {
  const db = getFirestore()
  return collection(db, ESCALATION_EVENTS_COLLECTION)
}

/**
 * Convert Firestore timestamp to Date if needed.
 */
function toDate(value: unknown): Date | null {
  if (value === null || value === undefined) {
    return null
  }
  if (value instanceof Date) {
    return value
  }
  if (value && typeof value === 'object' && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate()
  }
  return null
}

// ============================================
// Pattern Management
// ============================================

/**
 * Record a proposal rejection.
 *
 * AC1: Track proposal rejections with dates.
 * AC2: Automatically updates window calculation.
 *
 * @param familyId - Family ID
 * @param childId - Child ID
 * @param proposalId - Proposal ID (reference only, no content)
 * @returns Updated rejection pattern
 */
export async function recordRejection(
  familyId: string,
  childId: string,
  proposalId: string
): Promise<RejectionPattern> {
  if (!familyId || familyId.trim().length === 0) {
    throw new Error('familyId is required')
  }
  if (!childId || childId.trim().length === 0) {
    throw new Error('childId is required')
  }
  if (!proposalId || proposalId.trim().length === 0) {
    throw new Error('proposalId is required')
  }

  const now = new Date()
  const patternRef = getPatternDocRef(childId)
  const patternSnapshot = await getDoc(patternRef)

  let pattern: RejectionPattern

  if (patternSnapshot.exists()) {
    // Update existing pattern
    const data = patternSnapshot.data()
    const newTotalRejections = (data.totalRejections || 0) + 1

    // Calculate rejections in window
    const rejectionsInWindow = await calculateRejectionsInWindow(childId)

    pattern = {
      id: childId,
      familyId,
      childId,
      totalProposals: data.totalProposals || 0,
      totalRejections: newTotalRejections,
      rejectionsInWindow: rejectionsInWindow + 1, // Include this rejection
      lastProposalAt: toDate(data.lastProposalAt),
      lastRejectionAt: now,
      escalationTriggered: data.escalationTriggered || false,
      escalationTriggeredAt: toDate(data.escalationTriggeredAt),
      createdAt: toDate(data.createdAt) || now,
      updatedAt: now,
    }

    await updateDoc(patternRef, {
      totalRejections: pattern.totalRejections,
      rejectionsInWindow: pattern.rejectionsInWindow,
      lastRejectionAt: pattern.lastRejectionAt,
      updatedAt: pattern.updatedAt,
    })
  } else {
    // Create new pattern
    pattern = {
      id: childId,
      familyId,
      childId,
      totalProposals: 0,
      totalRejections: 1,
      rejectionsInWindow: 1,
      lastProposalAt: null,
      lastRejectionAt: now,
      escalationTriggered: false,
      escalationTriggeredAt: null,
      createdAt: now,
      updatedAt: now,
    }

    await setDoc(patternRef, pattern)
  }

  // Record rejection event (privacy-preserving - no content)
  const eventsRef = getEventsCollection()
  await addDoc(eventsRef, {
    familyId,
    childId,
    proposalId,
    rejectedAt: now,
  })

  return pattern
}

/**
 * Calculate rejections within the rolling window.
 *
 * AC2: 90-day rolling window for pattern detection.
 *
 * @param childId - Child ID
 * @param windowDays - Window period in days (default: 90)
 * @returns Number of rejections within window
 */
export async function calculateRejectionsInWindow(
  childId: string,
  windowDays: number = REJECTION_WINDOW_DAYS
): Promise<number> {
  if (!childId || childId.trim().length === 0) {
    throw new Error('childId is required')
  }

  const db = getFirestore()
  const eventsRef = collection(db, REJECTION_EVENTS_COLLECTION)

  // Calculate window start date
  const windowStart = new Date()
  windowStart.setDate(windowStart.getDate() - windowDays)

  const q = query(
    eventsRef,
    where('childId', '==', childId),
    where('rejectedAt', '>=', windowStart)
  )

  const snapshot = await getDocs(q)

  return snapshot.docs.length
}

/**
 * Check if escalation threshold is reached.
 *
 * AC3: Threshold detection (3 rejections within 90 days).
 *
 * @param childId - Child ID
 * @param threshold - Threshold count (default: 3)
 * @returns True if threshold reached
 */
export async function checkEscalationThreshold(
  childId: string,
  threshold: number = REJECTION_THRESHOLD
): Promise<boolean> {
  if (!childId || childId.trim().length === 0) {
    throw new Error('childId is required')
  }

  const rejectionsInWindow = await calculateRejectionsInWindow(childId)

  return rejectionsInWindow >= threshold
}

/**
 * Get rejection pattern for a child.
 *
 * @param childId - Child ID
 * @returns Rejection pattern or null if not found
 */
export async function getRejectionPattern(childId: string): Promise<RejectionPattern | null> {
  if (!childId || childId.trim().length === 0) {
    throw new Error('childId is required')
  }

  const patternRef = getPatternDocRef(childId)
  const patternSnapshot = await getDoc(patternRef)

  if (!patternSnapshot.exists()) {
    return null
  }

  const data = patternSnapshot.data()

  return {
    id: data.id || childId,
    familyId: data.familyId,
    childId: data.childId,
    totalProposals: data.totalProposals || 0,
    totalRejections: data.totalRejections || 0,
    rejectionsInWindow: data.rejectionsInWindow || 0,
    lastProposalAt: toDate(data.lastProposalAt),
    lastRejectionAt: toDate(data.lastRejectionAt),
    escalationTriggered: data.escalationTriggered || false,
    escalationTriggeredAt: toDate(data.escalationTriggeredAt),
    createdAt: toDate(data.createdAt) || new Date(),
    updatedAt: toDate(data.updatedAt) || new Date(),
  }
}

// ============================================
// Escalation Management
// ============================================

/**
 * Escalation notification collection.
 * Stores queued escalation notifications for guardians.
 */
export const ESCALATION_NOTIFICATIONS_COLLECTION = 'escalationNotifications'

function getEscalationNotificationsCollection() {
  const db = getFirestore()
  return collection(db, ESCALATION_NOTIFICATIONS_COLLECTION)
}

/**
 * Trigger escalation event.
 *
 * AC3: Escalation event is recorded.
 * AC3: Escalation notification is queued.
 *
 * @param familyId - Family ID
 * @param childId - Child ID
 */
export async function triggerEscalation(familyId: string, childId: string): Promise<void> {
  if (!familyId || familyId.trim().length === 0) {
    throw new Error('familyId is required')
  }
  if (!childId || childId.trim().length === 0) {
    throw new Error('childId is required')
  }

  const patternRef = getPatternDocRef(childId)
  const patternSnapshot = await getDoc(patternRef)

  if (!patternSnapshot.exists()) {
    return
  }

  const data = patternSnapshot.data()

  // Check if already escalated
  if (data.escalationTriggered) {
    return
  }

  const now = new Date()

  // Create escalation event
  const escalationRef = getEscalationCollection()
  const escalationDoc = await addDoc(escalationRef, {
    familyId,
    childId,
    triggeredAt: now,
    rejectionsCount: data.rejectionsInWindow || REJECTION_THRESHOLD,
    windowDays: REJECTION_WINDOW_DAYS,
    acknowledged: false,
    acknowledgedAt: null,
  })

  // AC3: Queue escalation notification for guardians
  // This notification will be processed by Cloud Functions to notify all family guardians
  const notificationsRef = getEscalationNotificationsCollection()
  await addDoc(notificationsRef, {
    familyId,
    childId,
    escalationEventId: escalationDoc.id,
    type: 'rejection_pattern_escalation',
    status: 'pending',
    createdAt: now,
    // Message will be personalized by Cloud Function when delivering
    messageTemplate: 'Multiple proposal rejections detected. Consider a family conversation.',
  })

  // Update pattern to mark escalation triggered
  await updateDoc(patternRef, {
    escalationTriggered: true,
    escalationTriggeredAt: now,
    updatedAt: now,
  })
}

// ============================================
// Proposal Count Management
// ============================================

/**
 * Increment proposal count for a child.
 *
 * AC5: Track total proposals for metrics.
 *
 * @param familyId - Family ID
 * @param childId - Child ID
 */
export async function incrementProposalCount(familyId: string, childId: string): Promise<void> {
  if (!familyId || familyId.trim().length === 0) {
    throw new Error('familyId is required')
  }
  if (!childId || childId.trim().length === 0) {
    throw new Error('childId is required')
  }

  const now = new Date()
  const patternRef = getPatternDocRef(childId)
  const patternSnapshot = await getDoc(patternRef)

  if (patternSnapshot.exists()) {
    const data = patternSnapshot.data()

    await updateDoc(patternRef, {
      totalProposals: (data.totalProposals || 0) + 1,
      lastProposalAt: now,
      updatedAt: now,
    })
  } else {
    // Create new pattern
    const pattern: RejectionPattern = {
      id: childId,
      familyId,
      childId,
      totalProposals: 1,
      totalRejections: 0,
      rejectionsInWindow: 0,
      lastProposalAt: now,
      lastRejectionAt: null,
      escalationTriggered: false,
      escalationTriggeredAt: null,
      createdAt: now,
      updatedAt: now,
    }

    await setDoc(patternRef, pattern)
  }
}
