/**
 * Guardian Removal Prevention Service - Story 3A.6
 *
 * Prevents co-parent removal in shared custody families.
 * Provides messaging about alternatives (dissolution, self-removal, court order).
 *
 * CRITICAL: The backend (Firestore security rules) already blocks guardian removal.
 * This service provides the client-side UX and audit logging.
 */

import { doc, getDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { familySchema, type Family } from '@fledgely/shared/contracts'
import { getFirestoreDb, getFunctionsInstance } from '../lib/firebase'

/**
 * Removal check result with reason and alternatives.
 */
export interface RemovalCheckResult {
  /** Whether removal is allowed */
  allowed: boolean
  /** Reason for blocking (if not allowed) */
  reason: string | null
  /** Number of guardians in the family */
  guardianCount: number
}

/**
 * Structured message for blocked removal attempts.
 */
export interface RemovalBlockedMessage {
  /** Main title */
  title: string
  /** Explanation of why removal is blocked */
  explanation: string
  /** Alternative options available */
  options: {
    /** Family dissolution (mutual agreement) */
    dissolution: {
      title: string
      description: string
    }
    /** Self-removal option */
    selfRemoval: {
      title: string
      description: string
    }
    /** Court order path */
    courtOrder: {
      title: string
      description: string
      contactEmail: string
    }
  }
}

/**
 * Input for logging a guardian removal attempt.
 */
export interface LogRemovalAttemptInput {
  familyId: string
  attemptedByUid: string
  targetUid: string
  targetEmail?: string
}

// Helper to check if value is a Timestamp-like object
function isTimestampLike(value: unknown): value is { toDate: () => Date } {
  return value != null && typeof (value as { toDate?: unknown }).toDate === 'function'
}

// Convert Firestore Timestamp to Date
function convertFamilyTimestamps(data: Record<string, unknown>): Record<string, unknown> {
  const result = { ...data }
  if (isTimestampLike(result.createdAt)) {
    result.createdAt = result.createdAt.toDate()
  }
  if (isTimestampLike(result.updatedAt)) {
    result.updatedAt = result.updatedAt.toDate()
  }
  if (Array.isArray(result.guardians)) {
    result.guardians = result.guardians.map((g: Record<string, unknown>) => ({
      ...g,
      addedAt: isTimestampLike(g.addedAt) ? g.addedAt.toDate() : g.addedAt,
    }))
  }
  return result
}

/**
 * Check if a guardian can be removed from a family.
 *
 * @param familyId - The family ID
 * @param targetUid - The UID of the guardian to remove
 * @returns RemovalCheckResult with allowed status and reason
 */
export async function canRemoveGuardian(
  familyId: string,
  targetUid: string
): Promise<RemovalCheckResult> {
  const db = getFirestoreDb()
  const familyRef = doc(db, 'families', familyId)
  const familyDoc = await getDoc(familyRef)

  if (!familyDoc.exists()) {
    return {
      allowed: false,
      reason: 'Family not found',
      guardianCount: 0,
    }
  }

  const data = familyDoc.data()
  const convertedData = convertFamilyTimestamps(data)
  const family = familySchema.parse(convertedData) as Family

  const guardianCount = family.guardians.length

  // Check if target is actually a guardian
  const isTargetGuardian = family.guardians.some((g) => g.uid === targetUid)
  if (!isTargetGuardian) {
    return {
      allowed: false,
      reason: 'Target user is not a guardian of this family',
      guardianCount,
    }
  }

  // Multi-guardian families: removal is blocked
  if (guardianCount > 1) {
    return {
      allowed: false,
      reason:
        'Guardian removal is not allowed in shared custody families. ' +
        'Both parents have equal, immutable access to protect parental rights.',
      guardianCount,
    }
  }

  // Single guardian: cannot remove (would orphan family)
  return {
    allowed: false,
    reason: 'Cannot remove the only guardian. Use family dissolution instead.',
    guardianCount,
  }
}

/**
 * Check if a guardian can be downgraded to caregiver role.
 *
 * @param familyId - The family ID
 * @param targetUid - The UID of the guardian to downgrade
 * @returns RemovalCheckResult with allowed status and reason
 */
export async function canDowngradeToCaregiver(
  familyId: string,
  targetUid: string
): Promise<RemovalCheckResult> {
  const db = getFirestoreDb()
  const familyRef = doc(db, 'families', familyId)
  const familyDoc = await getDoc(familyRef)

  if (!familyDoc.exists()) {
    return {
      allowed: false,
      reason: 'Family not found',
      guardianCount: 0,
    }
  }

  const data = familyDoc.data()
  const convertedData = convertFamilyTimestamps(data)
  const family = familySchema.parse(convertedData) as Family

  const guardianCount = family.guardians.length

  // Check if target is actually a guardian
  const isTargetGuardian = family.guardians.some((g) => g.uid === targetUid)
  if (!isTargetGuardian) {
    return {
      allowed: false,
      reason: 'Target user is not a guardian of this family',
      guardianCount,
    }
  }

  // Multi-guardian families: downgrade is blocked (prevents access reduction)
  if (guardianCount > 1) {
    return {
      allowed: false,
      reason:
        'Guardian role cannot be downgraded in shared custody families. ' +
        'Both parents maintain full guardian access to protect parental rights.',
      guardianCount,
    }
  }

  // Single guardian: cannot downgrade (would leave no guardians)
  return {
    allowed: false,
    reason: 'Cannot downgrade the only guardian. Family requires at least one guardian.',
    guardianCount,
  }
}

/**
 * Get the structured message shown when guardian removal is blocked.
 *
 * @returns RemovalBlockedMessage with all sections
 */
export function getRemovalBlockedMessage(): RemovalBlockedMessage {
  return {
    title: 'Guardian Removal Not Available',
    explanation:
      'In shared custody families, neither parent can remove the other ' +
      "from accessing family monitoring. This protects both parents' " +
      'right to monitor their children.',
    options: {
      dissolution: {
        title: 'Family Dissolution (mutual agreement)',
        description:
          'If both parents agree to end the family account, you can ' +
          'initiate family dissolution from settings. Both guardians ' +
          'must acknowledge before dissolution proceeds.',
      },
      selfRemoval: {
        title: 'Self-Removal',
        description:
          'If you wish to leave this family, you can remove yourself ' +
          'at any time. The family and other guardian will remain.',
      },
      courtOrder: {
        title: 'Court Order (forced removal)',
        description:
          'If you have a court order changing custody arrangements, ' +
          'contact our safety team. Verified legal documentation can ' +
          'result in forced access changes. This is the only path to ' +
          'remove a legal parent without their consent.',
        contactEmail: 'safety@fledgely.app',
      },
    },
  }
}

/**
 * Log a guardian removal attempt to admin audit.
 *
 * SECURITY: This logs to admin audit only (not family audit) to detect
 * potential abuse patterns without alerting the family.
 *
 * @param input - The removal attempt details
 */
export async function logGuardianRemovalAttempt(input: LogRemovalAttemptInput): Promise<void> {
  const functions = getFunctionsInstance()
  const logAttempt = httpsCallable(functions, 'logGuardianRemovalAttempt')

  await logAttempt({
    familyId: input.familyId,
    attemptedByUid: input.attemptedByUid,
    targetUid: input.targetUid,
    targetEmail: input.targetEmail || null,
  })
}

/**
 * Check if a family requires mutual dissolution (has multiple guardians).
 *
 * @param familyId - The family ID
 * @returns true if family has multiple guardians
 */
export async function requiresMutualDissolution(familyId: string): Promise<boolean> {
  const db = getFirestoreDb()
  const familyRef = doc(db, 'families', familyId)
  const familyDoc = await getDoc(familyRef)

  if (!familyDoc.exists()) {
    return false
  }

  const data = familyDoc.data()
  const convertedData = convertFamilyTimestamps(data)
  const family = familySchema.parse(convertedData) as Family

  return family.guardians.length > 1
}

/**
 * Get the guardian count for a family.
 *
 * @param familyId - The family ID
 * @returns The number of guardians, or 0 if family not found
 */
export async function getGuardianCount(familyId: string): Promise<number> {
  const db = getFirestoreDb()
  const familyRef = doc(db, 'families', familyId)
  const familyDoc = await getDoc(familyRef)

  if (!familyDoc.exists()) {
    return 0
  }

  const data = familyDoc.data()
  const convertedData = convertFamilyTimestamps(data)
  const family = familySchema.parse(convertedData) as Family

  return family.guardians.length
}
