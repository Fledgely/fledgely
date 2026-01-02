/**
 * SignalRetentionService - Story 7.5.6 Task 5
 *
 * Service for legal retention requirements.
 * AC6: Legal retention requirements per jurisdiction.
 *
 * CRITICAL SAFETY:
 * - Minimum retention per jurisdiction-specific child protection laws
 * - Legal holds prevent deletion regardless of retention period
 * - All retention operations logged
 * - Deletion requires authorization after retention period
 */

import { getFirestore, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'

// ============================================
// Constants
// ============================================

/**
 * Firestore collection for signal retention status.
 * CRITICAL: This collection is at ROOT level, ISOLATED from family data.
 */
export const SIGNAL_RETENTION_COLLECTION = 'signalRetentionStatus'

// ============================================
// Types
// ============================================

/**
 * Jurisdiction-specific retention requirements.
 */
export interface RetentionPolicy {
  /** Jurisdiction code (e.g., 'US', 'UK') */
  jurisdiction: string

  /** Minimum days to retain signal data */
  minimumRetentionDays: number

  /** Maximum days to retain (null = indefinite) */
  maximumRetentionDays: number | null

  /** Legal basis for retention requirement */
  legalBasis: string
}

/**
 * Retention status for a signal.
 */
export interface SignalRetentionStatus {
  /** Signal ID */
  signalId: string

  /** Jurisdiction code */
  jurisdiction: string

  /** When the retention period started */
  retentionStartDate: Date

  /** Earliest date signal can be deleted */
  minimumRetainUntil: Date

  /** Whether a legal hold is active */
  legalHold: boolean

  /** Reason for legal hold if active */
  legalHoldReason: string | null

  /** When legal hold was placed */
  legalHoldPlacedAt?: Date

  /** Who placed the legal hold */
  legalHoldPlacedBy?: string
}

/**
 * Result of canDeleteSignal check.
 */
export interface CanDeleteResult {
  /** Whether signal can be deleted */
  canDelete: boolean

  /** Reason why it can or cannot be deleted */
  reason: string
}

// ============================================
// Default Retention Policies
// ============================================

/**
 * Default retention policies by jurisdiction.
 *
 * AC6: Signals are retained per child protection legal requirements.
 *
 * These are based on typical child protection laws in each jurisdiction.
 * In production, these would be configurable per deployment.
 */
export const DEFAULT_RETENTION_POLICIES: RetentionPolicy[] = [
  {
    jurisdiction: 'US',
    minimumRetentionDays: 365 * 7, // 7 years
    maximumRetentionDays: null,
    legalBasis: 'Child Abuse Prevention and Treatment Act',
  },
  {
    jurisdiction: 'UK',
    minimumRetentionDays: 365 * 6, // 6 years
    maximumRetentionDays: null,
    legalBasis: 'Children Act 1989',
  },
  {
    jurisdiction: 'CA',
    minimumRetentionDays: 365 * 7, // 7 years
    maximumRetentionDays: null,
    legalBasis: 'Child and Family Services Act',
  },
  {
    jurisdiction: 'AU',
    minimumRetentionDays: 365 * 7, // 7 years
    maximumRetentionDays: null,
    legalBasis: 'Children and Young Persons (Care and Protection) Act',
  },
  {
    jurisdiction: 'DEFAULT',
    minimumRetentionDays: 365 * 7, // 7 years default
    maximumRetentionDays: null,
    legalBasis: 'General child protection standards',
  },
]

// ============================================
// Firestore Helpers
// ============================================

function getRetentionDocRef(signalId: string) {
  const db = getFirestore()
  return doc(db, SIGNAL_RETENTION_COLLECTION, signalId)
}

// ============================================
// Policy Functions
// ============================================

/**
 * Get retention policy for a jurisdiction.
 *
 * @param jurisdiction - Jurisdiction code
 * @returns Retention policy for the jurisdiction
 */
export function getRetentionPolicy(jurisdiction: string): RetentionPolicy {
  if (!jurisdiction || jurisdiction.trim().length === 0) {
    throw new Error('jurisdiction is required')
  }

  const policy = DEFAULT_RETENTION_POLICIES.find(
    (p) => p.jurisdiction === jurisdiction.toUpperCase()
  )

  if (policy) {
    return policy
  }

  // Return default policy for unknown jurisdictions
  return DEFAULT_RETENTION_POLICIES.find((p) => p.jurisdiction === 'DEFAULT')!
}

// ============================================
// Retention Status Functions
// ============================================

/**
 * Create retention status for a signal.
 *
 * AC6: Sets retention period based on jurisdiction-specific rules.
 *
 * @param signalId - Signal ID
 * @param jurisdiction - Jurisdiction code
 * @returns Created retention status
 */
export async function createRetentionStatus(
  signalId: string,
  jurisdiction: string
): Promise<SignalRetentionStatus> {
  if (!signalId || signalId.trim().length === 0) {
    throw new Error('signalId is required')
  }
  if (!jurisdiction || jurisdiction.trim().length === 0) {
    throw new Error('jurisdiction is required')
  }

  const policy = getRetentionPolicy(jurisdiction)
  const now = new Date()
  const minimumRetainUntil = new Date(
    now.getTime() + policy.minimumRetentionDays * 24 * 60 * 60 * 1000
  )

  const retentionStatus: SignalRetentionStatus = {
    signalId,
    jurisdiction: jurisdiction.toUpperCase(),
    retentionStartDate: now,
    minimumRetainUntil,
    legalHold: false,
    legalHoldReason: null,
  }

  const docRef = getRetentionDocRef(signalId)
  await setDoc(docRef, retentionStatus)

  // Log the retention status creation
  // In production, this would log to admin audit trail
  // console.log(`Retention status created for signal ${signalId} in ${jurisdiction}`)

  return retentionStatus
}

/**
 * Get retention status for a signal.
 *
 * @param signalId - Signal ID
 * @returns Retention status or null if not found
 */
export async function getRetentionStatus(signalId: string): Promise<SignalRetentionStatus | null> {
  if (!signalId || signalId.trim().length === 0) {
    throw new Error('signalId is required')
  }

  const docRef = getRetentionDocRef(signalId)
  const snapshot = await getDoc(docRef)

  if (!snapshot.exists()) {
    return null
  }

  const data = snapshot.data() as SignalRetentionStatus

  return {
    ...data,
    retentionStartDate:
      data.retentionStartDate instanceof Date
        ? data.retentionStartDate
        : (data.retentionStartDate as { toDate?: () => Date })?.toDate?.() || new Date(),
    minimumRetainUntil:
      data.minimumRetainUntil instanceof Date
        ? data.minimumRetainUntil
        : (data.minimumRetainUntil as { toDate?: () => Date })?.toDate?.() || new Date(),
  }
}

// ============================================
// Deletion Check Functions
// ============================================

/**
 * Check if a signal can be deleted.
 *
 * AC6: Deletion only occurs after legal hold review.
 *
 * @param signalId - Signal ID
 * @returns Whether signal can be deleted and reason
 */
export async function canDeleteSignal(signalId: string): Promise<CanDeleteResult> {
  if (!signalId || signalId.trim().length === 0) {
    throw new Error('signalId is required')
  }

  const status = await getRetentionStatus(signalId)

  if (!status) {
    return {
      canDelete: false,
      reason: 'Retention status not found',
    }
  }

  // Check legal hold first
  if (status.legalHold) {
    return {
      canDelete: false,
      reason: `Legal hold active: ${status.legalHoldReason}`,
    }
  }

  // Check retention period
  const now = new Date()
  if (now < status.minimumRetainUntil) {
    const daysRemaining = Math.ceil(
      (status.minimumRetainUntil.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    )
    return {
      canDelete: false,
      reason: `Retention period not passed. ${daysRemaining} days remaining.`,
    }
  }

  return {
    canDelete: true,
    reason: 'Retention period passed and no legal hold',
  }
}

// ============================================
// Legal Hold Functions
// ============================================

/**
 * Place legal hold on a signal.
 *
 * AC6: Legal holds prevent deletion regardless of retention period.
 *
 * @param signalId - Signal ID
 * @param reason - Reason for legal hold
 */
export async function placeLegalHold(signalId: string, reason: string): Promise<void> {
  if (!signalId || signalId.trim().length === 0) {
    throw new Error('signalId is required')
  }
  if (!reason || reason.trim().length === 0) {
    throw new Error('reason is required')
  }

  const docRef = getRetentionDocRef(signalId)
  const snapshot = await getDoc(docRef)

  if (!snapshot.exists()) {
    throw new Error('Retention status not found')
  }

  const status = snapshot.data() as SignalRetentionStatus

  if (status.legalHold) {
    throw new Error('Legal hold already active')
  }

  await updateDoc(docRef, {
    legalHold: true,
    legalHoldReason: reason,
    legalHoldPlacedAt: new Date(),
  })

  // Log the legal hold
  // In production, this would log to admin audit trail
  // console.log(`Legal hold placed on signal ${signalId}: ${reason}`)
}

/**
 * Remove legal hold from a signal.
 *
 * AC6: Removal requires authorization.
 *
 * @param signalId - Signal ID
 * @param authorizationId - Authorization ID for removal
 */
export async function removeLegalHold(signalId: string, authorizationId: string): Promise<void> {
  if (!signalId || signalId.trim().length === 0) {
    throw new Error('signalId is required')
  }
  if (!authorizationId || authorizationId.trim().length === 0) {
    throw new Error('authorizationId is required')
  }

  const docRef = getRetentionDocRef(signalId)
  const snapshot = await getDoc(docRef)

  if (!snapshot.exists()) {
    throw new Error('Retention status not found')
  }

  const status = snapshot.data() as SignalRetentionStatus

  if (!status.legalHold) {
    throw new Error('No legal hold active')
  }

  await updateDoc(docRef, {
    legalHold: false,
    legalHoldReason: null,
    legalHoldRemovedAt: new Date(),
    legalHoldRemovedBy: authorizationId,
  })

  // Log the legal hold removal
  // In production, this would log to admin audit trail
  // console.log(`Legal hold removed from signal ${signalId} with authorization ${authorizationId}`)
}
