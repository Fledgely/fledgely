'use client'

import {
  doc,
  getDoc,
  writeBatch,
  serverTimestamp,
  arrayRemove,
  collection,
  FieldValue,
  deleteField,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  getSelfRemovalErrorMessage,
  selfRemovalResultSchema,
  SelfRemovalError,
  type SelfRemovalResult,
} from '@fledgely/contracts'
import { createGuardianSelfRemovalAudit } from './sealedAuditService'

/**
 * Self-Removal Service - Firestore operations for guardian self-removal
 *
 * CRITICAL SAFETY FEATURE: This service enables abuse survivors to immediately
 * remove themselves from a shared family account without:
 * - 30-day waiting period (unlike dissolution)
 * - Notification to other family members
 * - Entry in family-visible audit log
 *
 * Story 2.8: Unilateral Self-Removal (Survivor Escape)
 *
 * Follows project guidelines:
 * - Direct Firestore SDK (no abstractions)
 * - Types from Zod schemas
 * - Server timestamps for reliability
 * - Batch operations for atomic updates
 */

/** Collection name for family documents */
const FAMILIES_COLLECTION = 'families'

/** Subcollection name for children */
const CHILDREN_COLLECTION = 'children'

/**
 * Custom error class for self-removal service errors
 */
export class SelfRemovalServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'SelfRemovalServiceError'
  }
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(code: string): string {
  return getSelfRemovalErrorMessage(code)
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
 * Remove current user from family (Survivor Escape)
 *
 * CRITICAL SAFETY PATTERNS:
 * 1. NO notification to other family members
 * 2. NO entry in family audit log
 * 3. IMMEDIATE effect (no waiting period)
 * 4. SEALED audit entry only (for support agent access)
 *
 * @param familyId - Family to remove self from
 * @param userId - User removing themselves
 * @param reauthToken - Fresh re-authentication token
 * @returns Self-removal result including single guardian status
 * @throws SelfRemovalServiceError on failure
 */
export async function removeSelfFromFamily(
  familyId: string,
  userId: string,
  reauthToken: string
): Promise<SelfRemovalResult> {
  try {
    // 1. Get family document
    const familyRef = doc(db, FAMILIES_COLLECTION, familyId)
    const familyDoc = await getDoc(familyRef)

    if (!familyDoc.exists()) {
      throw new SelfRemovalServiceError('family-not-found', 'Family not found')
    }

    const familyData = familyDoc.data()

    // 2. Verify user is a guardian
    const guardians = (familyData.guardians || []) as FamilyGuardian[]
    const userGuardian = guardians.find((g) => g.uid === userId)

    if (!userGuardian) {
      throw new SelfRemovalServiceError('not-a-guardian', 'Not a guardian')
    }

    // 3. Verify re-authentication
    // TODO [TECH-DEBT]: In production, verify token server-side via Firebase Admin SDK
    // See Story 2.6 code review - server-side validation required for production
    if (!reauthToken) {
      throw new SelfRemovalServiceError('reauth-required', 'Re-auth required')
    }

    // 4. Check if single guardian (warning case)
    const isSingleGuardian = guardians.length === 1

    // 5. Execute removal in batch (atomic operation)
    const batch = writeBatch(db)
    const now = new Date()

    // Remove from family guardians array
    batch.update(familyRef, {
      guardians: arrayRemove(userGuardian),
      updatedAt: serverTimestamp(),
    })

    // If single guardian, flag family for support review
    if (isSingleGuardian) {
      batch.update(familyRef, {
        'flags.orphanedByEscape': true,
        'flags.orphanedAt': serverTimestamp(),
        'flags.needsSupportReview': true,
      })
    }

    // 6. Remove from each child's guardian permissions
    const children = (familyData.children || []) as string[]
    for (const childId of children) {
      const childRef = doc(db, FAMILIES_COLLECTION, familyId, CHILDREN_COLLECTION, childId)
      // Remove their permissions from the child
      batch.update(childRef, {
        [`guardianPermissions.${userId}`]: deleteField(),
        updatedAt: serverTimestamp(),
      })
    }

    // 7. DO NOT create any entry in family audit log!
    // DO NOT trigger any notifications!

    // 8. Commit the batch transaction
    await batch.commit()

    // 9. Create SEALED audit entry (NOT regular audit!)
    // This is done AFTER the batch commit to ensure the removal succeeded
    await createGuardianSelfRemovalAudit(userId, familyId, {
      wasOnlyGuardian: isSingleGuardian,
      remainingGuardians: guardians.length - 1,
      childCount: children.length,
    })

    // 10. Return result
    return selfRemovalResultSchema.parse({
      success: true,
      isSingleGuardian,
      familyId,
      removedAt: now,
    })
  } catch (error) {
    if (error instanceof SelfRemovalServiceError) {
      const message = getErrorMessage(error.code)
      console.error('[selfRemovalService.removeSelfFromFamily]', error)
      throw new SelfRemovalError(error.code, message)
    }
    const message = getErrorMessage('removal-failed')
    console.error('[selfRemovalService.removeSelfFromFamily]', error)
    throw new SelfRemovalError('removal-failed', message)
  }
}

/**
 * Check if user can perform self-removal from a family
 *
 * @param familyId - Family ID
 * @param userId - User ID
 * @returns Object with canRemove and reason
 */
export async function canRemoveSelf(
  familyId: string,
  userId: string
): Promise<{ canRemove: boolean; isSingleGuardian: boolean; reason?: string }> {
  try {
    // Get family document
    const familyRef = doc(db, FAMILIES_COLLECTION, familyId)
    const familyDoc = await getDoc(familyRef)

    if (!familyDoc.exists()) {
      return { canRemove: false, isSingleGuardian: false, reason: 'family-not-found' }
    }

    const familyData = familyDoc.data()
    const guardians = (familyData.guardians || []) as FamilyGuardian[]

    // Check if user is a guardian
    const isGuardian = guardians.some((g) => g.uid === userId)
    if (!isGuardian) {
      return { canRemove: false, isSingleGuardian: false, reason: 'not-a-guardian' }
    }

    // Check if single guardian
    const isSingleGuardian = guardians.length === 1

    return {
      canRemove: true,
      isSingleGuardian,
      reason: isSingleGuardian ? 'single-guardian-warning' : undefined,
    }
  } catch (error) {
    console.error('[selfRemovalService.canRemoveSelf]', error)
    return { canRemove: false, isSingleGuardian: false, reason: 'removal-failed' }
  }
}
