/**
 * Safety Setting Service
 *
 * Story 3A.2: Safety Settings Two-Parent Approval
 * Story 3A.4: Safety Rule 48-Hour Cooling Period
 *
 * Manages safety setting change proposals requiring two-parent approval.
 *
 * This supports:
 * - Proposing safety setting changes (AC1)
 * - Approval/decline workflow (AC3)
 * - Automatic expiration after 72 hours (AC4)
 * - Emergency increases taking effect immediately (AC6)
 * - 48-hour cooling period for protection reductions (3A.4 AC1)
 * - Cooling period cancellation by either guardian (3A.4 AC3)
 */

import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  Timestamp,
  orderBy,
} from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import { safetySettingTypeSchema } from '@fledgely/shared/contracts'
import type { SafetySettingType, SafetySettingChange } from '@fledgely/shared/contracts'

/** 72 hours in milliseconds for proposal expiration */
const PROPOSAL_EXPIRY_MS = 72 * 60 * 60 * 1000

/** 48 hours in milliseconds for emergency increase review */
const EMERGENCY_REVIEW_MS = 48 * 60 * 60 * 1000

/** 7 days in milliseconds for decline cooldown */
const DECLINE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000

/** 48 hours in milliseconds for cooling period (Story 3A.4) */
const COOLING_PERIOD_MS = 48 * 60 * 60 * 1000

/**
 * Parameters for proposing a safety setting change.
 */
export interface ProposeSafetySettingParams {
  /** ID of the family */
  familyId: string
  /** Type of safety setting being changed */
  settingType: SafetySettingType
  /** Current value of the setting */
  currentValue: unknown
  /** Proposed new value for the setting */
  proposedValue: unknown
  /** UID of the guardian proposing the change */
  proposedByUid: string
}

/**
 * Parameters for approving a safety setting change.
 */
export interface ApproveSafetySettingParams {
  /** ID of the change proposal */
  changeId: string
  /** UID of the guardian approving */
  approverUid: string
}

/**
 * Parameters for declining a safety setting change.
 */
export interface DeclineSafetySettingParams {
  /** ID of the change proposal */
  changeId: string
  /** UID of the guardian declining */
  declinerUid: string
  /** Optional reason for declining */
  reason?: string
}

/**
 * Parameters for cancelling a safety setting change during cooling period.
 * Story 3A.4: Safety Rule 48-Hour Cooling Period - AC3
 */
export interface CancelSafetySettingParams {
  /** ID of the change proposal */
  changeId: string
  /** UID of the guardian cancelling */
  cancellerUid: string
}

/**
 * Determine if a proposed change is more restrictive (emergency increase).
 *
 * More restrictive changes take effect immediately:
 * - monitoring_interval: Shorter interval = more restrictive
 * - retention_period: Shorter retention = more restrictive
 * - time_limits: Less time allowed = more restrictive
 * - age_restrictions: Higher age = more restrictive
 */
export function isEmergencySafetyIncrease(
  settingType: SafetySettingType,
  currentValue: unknown,
  proposedValue: unknown
): boolean {
  // For MVP, we compare numeric values where lower = more restrictive
  // for most settings, except age_restrictions where higher = more restrictive
  const current = typeof currentValue === 'number' ? currentValue : 0
  const proposed = typeof proposedValue === 'number' ? proposedValue : 0

  if (settingType === 'age_restrictions') {
    // Higher age restriction = more restrictive
    return proposed > current
  }

  // For other settings: lower value = more restrictive
  return proposed < current
}

/**
 * Determine if a proposed change is less restrictive (protection reduction).
 *
 * Story 3A.4: Safety Rule 48-Hour Cooling Period - AC1
 * Less restrictive changes require 48-hour cooling period:
 * - monitoring_interval: Longer interval = less restrictive
 * - retention_period: Longer retention = less restrictive
 * - time_limits: More time allowed = less restrictive
 * - age_restrictions: Lower age = less restrictive
 *
 * This is the inverse of isEmergencySafetyIncrease.
 */
export function isProtectionReduction(
  settingType: SafetySettingType,
  currentValue: unknown,
  proposedValue: unknown
): boolean {
  // Protection reduction is the inverse of emergency increase
  // If it's NOT an emergency increase (not more restrictive), it's a reduction
  return !isEmergencySafetyIncrease(settingType, currentValue, proposedValue)
}

/**
 * Propose a safety setting change.
 *
 * Creates a pending proposal that requires approval from the other guardian.
 * Emergency increases (more restrictive) take effect immediately but are
 * subject to 48-hour review.
 *
 * @param params - The proposal parameters
 * @returns The created proposal ID
 * @throws Error if validation fails or Firestore write fails
 */
export async function proposeSafetySettingChange(
  params: ProposeSafetySettingParams
): Promise<string> {
  const { familyId, settingType, currentValue, proposedValue, proposedByUid } = params

  // Validate required fields
  if (!familyId) {
    throw new Error('familyId is required for safety setting change')
  }
  if (!proposedByUid) {
    throw new Error('proposedByUid is required for safety setting change')
  }

  // Validate settingType
  const typeResult = safetySettingTypeSchema.safeParse(settingType)
  if (!typeResult.success) {
    throw new Error(`Invalid settingType: ${settingType}`)
  }

  // Check for decline cooldown
  const recentDeclines = await getRecentDeclinedChanges(familyId, settingType, proposedByUid)
  if (recentDeclines.length > 0) {
    const lastDecline = recentDeclines[0]
    const cooldownEnd = new Date(lastDecline.resolvedAt!.getTime() + DECLINE_COOLDOWN_MS)
    if (new Date() < cooldownEnd) {
      const daysLeft = Math.ceil((cooldownEnd.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
      throw new Error(
        `Cannot re-propose this setting change. Please wait ${daysLeft} days after decline (cooldown expires: ${cooldownEnd.toLocaleDateString()})`
      )
    }
  }

  const isEmergency = isEmergencySafetyIncrease(settingType, currentValue, proposedValue)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + PROPOSAL_EXPIRY_MS)
  const reviewExpiresAt = isEmergency ? new Date(now.getTime() + EMERGENCY_REVIEW_MS) : null

  const db = getFirestoreDb()
  const changesRef = collection(db, 'safetySettingChanges')

  const docRef = await addDoc(changesRef, {
    familyId,
    settingType,
    currentValue,
    proposedValue,
    proposedByUid,
    approverUid: null,
    status: 'pending_approval',
    declineReason: null,
    isEmergencyIncrease: isEmergency,
    reviewExpiresAt: reviewExpiresAt ? Timestamp.fromDate(reviewExpiresAt) : null,
    createdAt: Timestamp.now(),
    expiresAt: Timestamp.fromDate(expiresAt),
    resolvedAt: null,
    effectiveAt: null, // Story 3A.4: Set when entering cooling period
    cancelledByUid: null, // Story 3A.4: Set when cancelled during cooling
  })

  return docRef.id
}

/**
 * Approve a safety setting change.
 *
 * Only the OTHER guardian (not the proposer) can approve.
 *
 * Story 3A.4: For protection reductions, enters 48-hour cooling period.
 * For protection increases (emergency), takes effect immediately.
 *
 * @param params - The approval parameters
 * @throws Error if change not found, already resolved, or proposer tries to self-approve
 */
export async function approveSafetySettingChange(
  params: ApproveSafetySettingParams
): Promise<void> {
  const { changeId, approverUid } = params

  if (!changeId) {
    throw new Error('changeId is required')
  }
  if (!approverUid) {
    throw new Error('approverUid is required')
  }

  const db = getFirestoreDb()
  const changeRef = doc(db, 'safetySettingChanges', changeId)
  const changeSnap = await getDoc(changeRef)

  if (!changeSnap.exists()) {
    throw new Error('Safety setting change not found')
  }

  const data = changeSnap.data()

  // Prevent self-approval
  if (data.proposedByUid === approverUid) {
    throw new Error('Cannot approve your own proposed change')
  }

  // Check if already resolved
  if (data.status !== 'pending_approval') {
    throw new Error(`Cannot approve change with status: ${data.status}`)
  }

  // Check if expired
  const expiresAt = data.expiresAt.toDate()
  if (new Date() > expiresAt) {
    throw new Error('Cannot approve expired change')
  }

  // Story 3A.4: Check if this is a protection reduction (needs cooling period)
  const isReduction = isProtectionReduction(data.settingType, data.currentValue, data.proposedValue)

  if (isReduction) {
    // Protection reduction: Enter 48-hour cooling period (AC1)
    const effectiveAt = new Date(Date.now() + COOLING_PERIOD_MS)
    await updateDoc(changeRef, {
      status: 'cooling_period',
      approverUid,
      resolvedAt: Timestamp.now(),
      effectiveAt: Timestamp.fromDate(effectiveAt),
    })
    // AC2: Notification placeholder for Story 41
    console.log(
      `[Notification] Safety setting change entering 48-hour cooling period. Takes effect: ${effectiveAt.toLocaleString()}`
    )
  } else {
    // Protection increase: Takes effect immediately
    await updateDoc(changeRef, {
      status: 'approved',
      approverUid,
      resolvedAt: Timestamp.now(),
    })
  }
}

/**
 * Decline a safety setting change.
 *
 * Only the OTHER guardian (not the proposer) can decline.
 *
 * @param params - The decline parameters
 * @throws Error if change not found, already resolved, or proposer tries to self-decline
 */
export async function declineSafetySettingChange(
  params: DeclineSafetySettingParams
): Promise<void> {
  const { changeId, declinerUid, reason } = params

  if (!changeId) {
    throw new Error('changeId is required')
  }
  if (!declinerUid) {
    throw new Error('declinerUid is required')
  }

  const db = getFirestoreDb()
  const changeRef = doc(db, 'safetySettingChanges', changeId)
  const changeSnap = await getDoc(changeRef)

  if (!changeSnap.exists()) {
    throw new Error('Safety setting change not found')
  }

  const data = changeSnap.data()

  // Prevent self-decline
  if (data.proposedByUid === declinerUid) {
    throw new Error('Cannot decline your own proposed change')
  }

  // Check if already resolved
  if (data.status !== 'pending_approval') {
    throw new Error(`Cannot decline change with status: ${data.status}`)
  }

  await updateDoc(changeRef, {
    status: 'declined',
    approverUid: declinerUid, // The person who acted on it
    declineReason: reason ?? null,
    resolvedAt: Timestamp.now(),
  })
}

/**
 * Cancel a safety setting change during the cooling period.
 *
 * Story 3A.4: Safety Rule 48-Hour Cooling Period - AC3
 * Either guardian can cancel during the 48-hour cooling period.
 *
 * @param params - The cancellation parameters
 * @throws Error if change not found, not in cooling period, or already resolved
 */
export async function cancelSafetySettingChange(params: CancelSafetySettingParams): Promise<void> {
  const { changeId, cancellerUid } = params

  if (!changeId) {
    throw new Error('changeId is required')
  }
  if (!cancellerUid) {
    throw new Error('cancellerUid is required')
  }

  const db = getFirestoreDb()
  const changeRef = doc(db, 'safetySettingChanges', changeId)
  const changeSnap = await getDoc(changeRef)

  if (!changeSnap.exists()) {
    throw new Error('Safety setting change not found')
  }

  const data = changeSnap.data()

  // Check if in cooling period
  if (data.status !== 'cooling_period') {
    throw new Error(
      `Cannot cancel change with status: ${data.status}. Only changes in cooling period can be cancelled.`
    )
  }

  // Check if cooling period has ended (effectiveAt has passed)
  if (data.effectiveAt) {
    const effectiveAt = data.effectiveAt.toDate()
    if (new Date() > effectiveAt) {
      throw new Error('Cooling period has ended. Change has already taken effect.')
    }
  }

  await updateDoc(changeRef, {
    status: 'cancelled',
    cancelledByUid: cancellerUid,
    resolvedAt: Timestamp.now(),
  })

  // AC3: Notification placeholder for Story 41
  console.log(
    `[Notification] Safety setting change cancelled during cooling period by guardian: ${cancellerUid}`
  )
}

/**
 * Get pending and cooling period safety setting changes for a family.
 *
 * Story 3A.4: Now includes changes in cooling_period status.
 * Returns all pending changes that haven't expired yet.
 *
 * @param familyId - The family ID
 * @returns Array of pending and cooling period safety setting changes
 */
export async function getPendingSafetySettingChanges(
  familyId: string
): Promise<SafetySettingChange[]> {
  if (!familyId) {
    throw new Error('familyId is required')
  }

  const db = getFirestoreDb()
  const changesRef = collection(db, 'safetySettingChanges')

  // Query for pending_approval status
  const pendingQuery = query(
    changesRef,
    where('familyId', '==', familyId),
    where('status', '==', 'pending_approval'),
    orderBy('createdAt', 'desc')
  )

  // Query for cooling_period status (Story 3A.4)
  const coolingQuery = query(
    changesRef,
    where('familyId', '==', familyId),
    where('status', '==', 'cooling_period'),
    orderBy('createdAt', 'desc')
  )

  const [pendingSnapshot, coolingSnapshot] = await Promise.all([
    getDocs(pendingQuery),
    getDocs(coolingQuery),
  ])

  const now = new Date()

  const mapDocToChange = (docSnap: { id: string; data: () => Record<string, unknown> }) => {
    const data = docSnap.data()
    return {
      id: docSnap.id,
      familyId: data.familyId as string,
      settingType: data.settingType,
      currentValue: data.currentValue,
      proposedValue: data.proposedValue,
      proposedByUid: data.proposedByUid as string,
      approverUid: (data.approverUid as string) ?? null,
      status: data.status,
      declineReason: (data.declineReason as string) ?? null,
      isEmergencyIncrease: data.isEmergencyIncrease as boolean,
      reviewExpiresAt: (data.reviewExpiresAt as { toDate: () => Date })?.toDate() ?? null,
      createdAt: (data.createdAt as { toDate: () => Date }).toDate(),
      expiresAt: (data.expiresAt as { toDate: () => Date }).toDate(),
      resolvedAt: (data.resolvedAt as { toDate: () => Date })?.toDate() ?? null,
      effectiveAt: (data.effectiveAt as { toDate: () => Date })?.toDate() ?? null,
      cancelledByUid: (data.cancelledByUid as string) ?? null,
    } as SafetySettingChange
  }

  const pendingChanges = pendingSnapshot.docs
    .map(mapDocToChange)
    .filter((change) => new Date(change.expiresAt) > now)

  const coolingChanges = coolingSnapshot.docs
    .map(mapDocToChange)
    .filter((change) => change.effectiveAt && new Date(change.effectiveAt) > now)

  // Combine and sort by createdAt descending
  return [...pendingChanges, ...coolingChanges].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  )
}

/**
 * Get recently declined changes for cooldown checking.
 *
 * @param familyId - The family ID
 * @param settingType - The setting type to check
 * @param proposerUid - The proposer's UID
 * @returns Array of declined changes within cooldown period
 */
async function getRecentDeclinedChanges(
  familyId: string,
  settingType: SafetySettingType,
  proposerUid: string
): Promise<SafetySettingChange[]> {
  const db = getFirestoreDb()
  const changesRef = collection(db, 'safetySettingChanges')

  const q = query(
    changesRef,
    where('familyId', '==', familyId),
    where('settingType', '==', settingType),
    where('proposedByUid', '==', proposerUid),
    where('status', '==', 'declined'),
    orderBy('resolvedAt', 'desc')
  )

  const snapshot = await getDocs(q)
  const cooldownStart = new Date(Date.now() - DECLINE_COOLDOWN_MS)

  return snapshot.docs
    .map((docSnap) => {
      const data = docSnap.data()
      return {
        id: docSnap.id,
        familyId: data.familyId,
        settingType: data.settingType,
        currentValue: data.currentValue,
        proposedValue: data.proposedValue,
        proposedByUid: data.proposedByUid,
        approverUid: data.approverUid,
        status: data.status,
        declineReason: data.declineReason,
        isEmergencyIncrease: data.isEmergencyIncrease,
        reviewExpiresAt: data.reviewExpiresAt?.toDate() ?? null,
        createdAt: data.createdAt.toDate(),
        expiresAt: data.expiresAt.toDate(),
        resolvedAt: data.resolvedAt?.toDate() ?? null,
      } as SafetySettingChange
    })
    .filter((change) => change.resolvedAt && change.resolvedAt > cooldownStart)
}

/**
 * Reverse an emergency increase during the review period.
 *
 * Only available for emergency increases within the 48-hour review period.
 *
 * @param changeId - The change ID
 * @param reverterUid - The UID of the guardian reversing
 * @throws Error if not an emergency increase, outside review period, or not authorized
 */
export async function reverseEmergencyIncrease(
  changeId: string,
  reverterUid: string
): Promise<void> {
  if (!changeId) {
    throw new Error('changeId is required')
  }
  if (!reverterUid) {
    throw new Error('reverterUid is required')
  }

  const db = getFirestoreDb()
  const changeRef = doc(db, 'safetySettingChanges', changeId)
  const changeSnap = await getDoc(changeRef)

  if (!changeSnap.exists()) {
    throw new Error('Safety setting change not found')
  }

  const data = changeSnap.data()

  // Must be an emergency increase
  if (!data.isEmergencyIncrease) {
    throw new Error('Only emergency increases can be reversed')
  }

  // Must be within review period
  if (!data.reviewExpiresAt) {
    throw new Error('No review period set for this change')
  }

  const reviewExpires = data.reviewExpiresAt.toDate()
  if (new Date() > reviewExpires) {
    throw new Error('Review period has expired')
  }

  // Mark as declined (reversed)
  await updateDoc(changeRef, {
    status: 'declined',
    approverUid: reverterUid,
    declineReason: 'Reversed during emergency review period',
    resolvedAt: Timestamp.now(),
  })
}
