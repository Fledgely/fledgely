/**
 * Safety Setting Service
 *
 * Story 3A.2: Safety Settings Two-Parent Approval
 * Manages safety setting change proposals requiring two-parent approval.
 *
 * This supports:
 * - Proposing safety setting changes (AC1)
 * - Approval/decline workflow (AC3)
 * - Automatic expiration after 72 hours (AC4)
 * - Emergency increases taking effect immediately (AC6)
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
  })

  return docRef.id
}

/**
 * Approve a safety setting change.
 *
 * Only the OTHER guardian (not the proposer) can approve.
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

  await updateDoc(changeRef, {
    status: 'approved',
    approverUid,
    resolvedAt: Timestamp.now(),
  })
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
 * Get pending safety setting changes for a family.
 *
 * Returns all pending changes that haven't expired yet.
 *
 * @param familyId - The family ID
 * @returns Array of pending safety setting changes
 */
export async function getPendingSafetySettingChanges(
  familyId: string
): Promise<SafetySettingChange[]> {
  if (!familyId) {
    throw new Error('familyId is required')
  }

  const db = getFirestoreDb()
  const changesRef = collection(db, 'safetySettingChanges')

  const q = query(
    changesRef,
    where('familyId', '==', familyId),
    where('status', '==', 'pending_approval'),
    orderBy('createdAt', 'desc')
  )

  const snapshot = await getDocs(q)
  const now = new Date()

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
    .filter((change) => new Date(change.expiresAt) > now) // Filter expired
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
