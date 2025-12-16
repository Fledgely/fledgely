'use client'

import {
  doc,
  getDoc,
  serverTimestamp,
  writeBatch,
  Timestamp,
  collection,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  familyDissolutionSchema,
  getDissolutionErrorMessage,
  calculateScheduledDeletionDate,
  COOLING_PERIOD_DAYS,
  type DataHandlingOption,
  type DissolutionStatus,
  type FamilyDissolution,
  type DissolutionAcknowledgment,
} from '@fledgely/contracts'

/**
 * Dissolution Service - Firestore operations for family dissolution
 *
 * Follows project guidelines:
 * - Direct Firestore SDK (no abstractions)
 * - Types from Zod schemas
 * - Server timestamps for reliability
 * - Batch operations for atomic updates
 *
 * Story 2.7: Family Dissolution Initiation
 */

/** Collection name for family documents */
const FAMILIES_COLLECTION = 'families'

/** Subcollection name for audit logs */
const AUDIT_LOG_SUBCOLLECTION = 'auditLog'

/**
 * Custom error class for dissolution service errors
 */
export class DissolutionServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'DissolutionServiceError'
  }
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(code: string): string {
  return getDissolutionErrorMessage(code)
}

/**
 * Guardian type from family document
 */
interface FamilyGuardian {
  uid: string
  role: string
  permissions: string
}

/**
 * Initiate family dissolution
 * Creates dissolution request in family document
 *
 * @param familyId - Family to dissolve
 * @param userId - User initiating dissolution
 * @param dataHandlingOption - How to handle data after dissolution
 * @param reauthToken - Fresh re-authentication token
 * @returns Created dissolution request
 * @throws DissolutionServiceError on failure
 */
export async function initiateDissolution(
  familyId: string,
  userId: string,
  dataHandlingOption: DataHandlingOption,
  reauthToken: string
): Promise<FamilyDissolution> {
  try {
    // 1. Get family document
    const familyRef = doc(db, FAMILIES_COLLECTION, familyId)
    const familyDoc = await getDoc(familyRef)

    if (!familyDoc.exists()) {
      throw new DissolutionServiceError('family-not-found', 'Family not found')
    }

    const familyData = familyDoc.data()

    // 2. Verify user is a guardian
    const guardians = (familyData.guardians || []) as FamilyGuardian[]
    const isGuardian = guardians.some((g) => g.uid === userId)

    if (!isGuardian) {
      throw new DissolutionServiceError('not-a-guardian', 'Not a guardian')
    }

    // 3. Verify no existing active dissolution
    const existingDissolution = familyData.dissolution as
      | { status: DissolutionStatus }
      | undefined
    if (
      existingDissolution?.status &&
      !['cancelled', 'completed'].includes(existingDissolution.status)
    ) {
      throw new DissolutionServiceError(
        'already-dissolving',
        'Already dissolving'
      )
    }

    // 4. Verify re-authentication (check token exists)
    // TODO [TECH-DEBT]: In production, verify token server-side via Firebase Admin SDK
    // See Story 2.6 code review - server-side validation required for production
    if (!reauthToken) {
      throw new DissolutionServiceError('reauth-required', 'Re-auth required')
    }

    // 5. Determine if shared custody (multiple guardians)
    const isSharedCustody = guardians.length > 1
    const initialStatus: DissolutionStatus = isSharedCustody
      ? 'pending_acknowledgment'
      : 'cooling_period'

    // 6. Calculate scheduled deletion date
    const now = new Date()
    const scheduledDeletionAt = isSharedCustody
      ? null // Will be set when all acknowledge
      : calculateScheduledDeletionDate(dataHandlingOption, now)

    // 7. Create dissolution request data
    const dissolutionData = {
      status: initialStatus,
      initiatedBy: userId,
      initiatedAt: serverTimestamp(),
      dataHandlingOption,
      acknowledgments: [] as DissolutionAcknowledgment[],
      allAcknowledgedAt: isSharedCustody ? null : serverTimestamp(),
      scheduledDeletionAt: scheduledDeletionAt
        ? Timestamp.fromDate(scheduledDeletionAt)
        : null,
      cancelledBy: null,
      cancelledAt: null,
    }

    // 8. Execute update in batch with audit log
    const batch = writeBatch(db)

    batch.update(familyRef, {
      dissolution: dissolutionData,
    })

    // Create audit log entry
    const auditRef = doc(
      collection(db, FAMILIES_COLLECTION, familyId, AUDIT_LOG_SUBCOLLECTION)
    )
    batch.set(auditRef, {
      id: auditRef.id,
      action: 'dissolution_initiated',
      entityId: familyId,
      entityType: 'family',
      metadata: {
        dataHandlingOption,
        isSharedCustody,
        guardianCount: guardians.length,
        scheduledDeletionAt: scheduledDeletionAt?.toISOString() || null,
      },
      performedBy: userId,
      performedAt: serverTimestamp(),
    })

    await batch.commit()

    // 9. Return optimistic dissolution data
    return familyDissolutionSchema.parse({
      status: initialStatus,
      initiatedBy: userId,
      initiatedAt: now,
      dataHandlingOption,
      acknowledgments: [],
      allAcknowledgedAt: isSharedCustody ? null : now,
      scheduledDeletionAt,
      cancelledBy: null,
      cancelledAt: null,
    })
  } catch (error) {
    if (error instanceof DissolutionServiceError) {
      const message = getErrorMessage(error.code)
      console.error('[dissolutionService.initiateDissolution]', error)
      throw new Error(message)
    }
    const message = getErrorMessage('dissolution-failed')
    console.error('[dissolutionService.initiateDissolution]', error)
    throw new Error(message)
  }
}

/**
 * Acknowledge dissolution request (for non-initiating guardians)
 *
 * @param familyId - Family ID
 * @param userId - Guardian acknowledging
 * @returns Updated dissolution request
 * @throws DissolutionServiceError on failure
 */
export async function acknowledgeDissolution(
  familyId: string,
  userId: string
): Promise<FamilyDissolution> {
  try {
    // 1. Get family document
    const familyRef = doc(db, FAMILIES_COLLECTION, familyId)
    const familyDoc = await getDoc(familyRef)

    if (!familyDoc.exists()) {
      throw new DissolutionServiceError('family-not-found', 'Family not found')
    }

    const familyData = familyDoc.data()

    // 2. Verify user is a guardian
    const guardians = (familyData.guardians || []) as FamilyGuardian[]
    const isGuardian = guardians.some((g) => g.uid === userId)

    if (!isGuardian) {
      throw new DissolutionServiceError('not-a-guardian', 'Not a guardian')
    }

    // 3. Verify dissolution exists and is pending
    const dissolution = familyData.dissolution as
      | {
          status: DissolutionStatus
          initiatedBy: string
          initiatedAt: { toDate: () => Date }
          dataHandlingOption: DataHandlingOption
          acknowledgments: Array<{ guardianId: string; acknowledgedAt: { toDate: () => Date } }>
          allAcknowledgedAt: { toDate: () => Date } | null
          scheduledDeletionAt: { toDate: () => Date } | null
          cancelledBy: string | null
          cancelledAt: { toDate: () => Date } | null
        }
      | undefined

    if (!dissolution || dissolution.status !== 'pending_acknowledgment') {
      throw new DissolutionServiceError('not-pending', 'Not pending')
    }

    // 4. Verify user is not the initiator
    if (dissolution.initiatedBy === userId) {
      throw new DissolutionServiceError(
        'cannot-acknowledge-own',
        'Cannot acknowledge own'
      )
    }

    // 5. Verify user hasn't already acknowledged
    const existingAcks = dissolution.acknowledgments || []
    if (existingAcks.some((ack) => ack.guardianId === userId)) {
      throw new DissolutionServiceError(
        'already-acknowledged',
        'Already acknowledged'
      )
    }

    // 6. Add acknowledgment
    const now = new Date()
    const newAcknowledgment = {
      guardianId: userId,
      acknowledgedAt: serverTimestamp(),
    }

    // 7. Check if all guardians have now acknowledged
    const acknowledgedIds = new Set([
      dissolution.initiatedBy, // Initiator implicitly acknowledged
      ...existingAcks.map((ack) => ack.guardianId),
      userId,
    ])

    const allAcknowledged = guardians.every((g) => acknowledgedIds.has(g.uid))

    // 8. Calculate new status and scheduled deletion
    const newStatus: DissolutionStatus = allAcknowledged
      ? 'cooling_period'
      : 'pending_acknowledgment'
    const scheduledDeletionAt = allAcknowledged
      ? calculateScheduledDeletionDate(dissolution.dataHandlingOption, now)
      : null

    // 9. Build update data
    const updateData: Record<string, unknown> = {
      'dissolution.acknowledgments': [
        ...existingAcks.map((ack) => ({
          guardianId: ack.guardianId,
          acknowledgedAt: ack.acknowledgedAt,
        })),
        newAcknowledgment,
      ],
      'dissolution.status': newStatus,
    }

    if (allAcknowledged) {
      updateData['dissolution.allAcknowledgedAt'] = serverTimestamp()
      updateData['dissolution.scheduledDeletionAt'] = scheduledDeletionAt
        ? Timestamp.fromDate(scheduledDeletionAt)
        : null
    }

    // 10. Execute update in batch with audit log
    const batch = writeBatch(db)

    batch.update(familyRef, updateData)

    // Create audit log entry
    const auditRef = doc(
      collection(db, FAMILIES_COLLECTION, familyId, AUDIT_LOG_SUBCOLLECTION)
    )
    batch.set(auditRef, {
      id: auditRef.id,
      action: 'dissolution_acknowledged',
      entityId: familyId,
      entityType: 'family',
      metadata: {
        acknowledgedBy: userId,
        allAcknowledged,
        scheduledDeletionAt: scheduledDeletionAt?.toISOString() || null,
      },
      performedBy: userId,
      performedAt: serverTimestamp(),
    })

    await batch.commit()

    // 11. Return updated dissolution data
    return familyDissolutionSchema.parse({
      status: newStatus,
      initiatedBy: dissolution.initiatedBy,
      initiatedAt: dissolution.initiatedAt.toDate(),
      dataHandlingOption: dissolution.dataHandlingOption,
      acknowledgments: [
        ...existingAcks.map((ack) => ({
          guardianId: ack.guardianId,
          acknowledgedAt: ack.acknowledgedAt.toDate(),
        })),
        {
          guardianId: userId,
          acknowledgedAt: now,
        },
      ],
      allAcknowledgedAt: allAcknowledged ? now : null,
      scheduledDeletionAt,
      cancelledBy: null,
      cancelledAt: null,
    })
  } catch (error) {
    if (error instanceof DissolutionServiceError) {
      const message = getErrorMessage(error.code)
      console.error('[dissolutionService.acknowledgeDissolution]', error)
      throw new Error(message)
    }
    const message = getErrorMessage('acknowledgment-failed')
    console.error('[dissolutionService.acknowledgeDissolution]', error)
    throw new Error(message)
  }
}

/**
 * Cancel dissolution request
 *
 * @param familyId - Family ID
 * @param userId - Guardian cancelling
 * @returns Updated dissolution request (cancelled)
 * @throws DissolutionServiceError on failure
 */
export async function cancelDissolution(
  familyId: string,
  userId: string
): Promise<FamilyDissolution> {
  try {
    // 1. Get family document
    const familyRef = doc(db, FAMILIES_COLLECTION, familyId)
    const familyDoc = await getDoc(familyRef)

    if (!familyDoc.exists()) {
      throw new DissolutionServiceError('family-not-found', 'Family not found')
    }

    const familyData = familyDoc.data()

    // 2. Verify user is a guardian
    const guardians = (familyData.guardians || []) as FamilyGuardian[]
    const isGuardian = guardians.some((g) => g.uid === userId)

    if (!isGuardian) {
      throw new DissolutionServiceError('not-a-guardian', 'Not a guardian')
    }

    // 3. Verify dissolution exists and is cancellable
    const dissolution = familyData.dissolution as
      | {
          status: DissolutionStatus
          initiatedBy: string
          initiatedAt: { toDate: () => Date }
          dataHandlingOption: DataHandlingOption
          acknowledgments: Array<{ guardianId: string; acknowledgedAt: { toDate: () => Date } }>
          allAcknowledgedAt: { toDate: () => Date } | null
          scheduledDeletionAt: { toDate: () => Date } | null
          cancelledBy: string | null
          cancelledAt: { toDate: () => Date } | null
        }
      | undefined

    if (!dissolution) {
      throw new DissolutionServiceError('not-pending', 'Not pending')
    }

    if (!['pending_acknowledgment', 'cooling_period'].includes(dissolution.status)) {
      throw new DissolutionServiceError('cannot-cancel', 'Cannot cancel')
    }

    // 4. Update dissolution to cancelled
    const now = new Date()
    const batch = writeBatch(db)

    batch.update(familyRef, {
      'dissolution.status': 'cancelled',
      'dissolution.cancelledBy': userId,
      'dissolution.cancelledAt': serverTimestamp(),
    })

    // Create audit log entry
    const auditRef = doc(
      collection(db, FAMILIES_COLLECTION, familyId, AUDIT_LOG_SUBCOLLECTION)
    )
    batch.set(auditRef, {
      id: auditRef.id,
      action: 'dissolution_cancelled',
      entityId: familyId,
      entityType: 'family',
      metadata: {
        cancelledBy: userId,
        previousStatus: dissolution.status,
      },
      performedBy: userId,
      performedAt: serverTimestamp(),
    })

    await batch.commit()

    // 5. Return cancelled dissolution data
    return familyDissolutionSchema.parse({
      status: 'cancelled',
      initiatedBy: dissolution.initiatedBy,
      initiatedAt: dissolution.initiatedAt.toDate(),
      dataHandlingOption: dissolution.dataHandlingOption,
      acknowledgments: dissolution.acknowledgments.map((ack) => ({
        guardianId: ack.guardianId,
        acknowledgedAt: ack.acknowledgedAt.toDate(),
      })),
      allAcknowledgedAt: dissolution.allAcknowledgedAt?.toDate() ?? null,
      scheduledDeletionAt: dissolution.scheduledDeletionAt?.toDate() ?? null,
      cancelledBy: userId,
      cancelledAt: now,
    })
  } catch (error) {
    if (error instanceof DissolutionServiceError) {
      const message = getErrorMessage(error.code)
      console.error('[dissolutionService.cancelDissolution]', error)
      throw new Error(message)
    }
    const message = getErrorMessage('cancellation-failed')
    console.error('[dissolutionService.cancelDissolution]', error)
    throw new Error(message)
  }
}

/**
 * Get dissolution status for a family
 *
 * @param familyId - Family ID
 * @returns Dissolution status or null if no dissolution
 */
export async function getDissolutionStatus(
  familyId: string
): Promise<FamilyDissolution | null> {
  try {
    const familyRef = doc(db, FAMILIES_COLLECTION, familyId)
    const familyDoc = await getDoc(familyRef)

    if (!familyDoc.exists()) {
      return null
    }

    const familyData = familyDoc.data()
    const dissolution = familyData.dissolution as
      | {
          status: DissolutionStatus
          initiatedBy: string
          initiatedAt: { toDate: () => Date }
          dataHandlingOption: DataHandlingOption
          acknowledgments: Array<{ guardianId: string; acknowledgedAt: { toDate: () => Date } }>
          allAcknowledgedAt: { toDate: () => Date } | null
          scheduledDeletionAt: { toDate: () => Date } | null
          cancelledBy: string | null
          cancelledAt: { toDate: () => Date } | null
        }
      | undefined

    if (!dissolution) {
      return null
    }

    return familyDissolutionSchema.parse({
      status: dissolution.status,
      initiatedBy: dissolution.initiatedBy,
      initiatedAt: dissolution.initiatedAt.toDate(),
      dataHandlingOption: dissolution.dataHandlingOption,
      acknowledgments: (dissolution.acknowledgments || []).map((ack) => ({
        guardianId: ack.guardianId,
        acknowledgedAt: ack.acknowledgedAt.toDate(),
      })),
      allAcknowledgedAt: dissolution.allAcknowledgedAt?.toDate() ?? null,
      scheduledDeletionAt: dissolution.scheduledDeletionAt?.toDate() ?? null,
      cancelledBy: dissolution.cancelledBy,
      cancelledAt: dissolution.cancelledAt?.toDate() ?? null,
    })
  } catch (error) {
    console.error('[dissolutionService.getDissolutionStatus]', error)
    return null
  }
}
