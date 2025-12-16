'use client'

import { doc, serverTimestamp, collection, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  getSelfRemovalErrorMessage,
  sealedAuditEntrySchema,
  type SealedAuditAction,
  type SealedAuditEntry,
  type CreateSealedAuditInput,
} from '@fledgely/contracts'

/**
 * Sealed Audit Service - Firestore operations for sealed audit entries
 *
 * CRITICAL SAFETY FEATURE: Sealed audits are stored in a separate collection
 * that is NOT visible to family members. Only support agents (Epic 0.5) can
 * access these records.
 *
 * This service creates audit entries for sensitive actions like:
 * - Guardian self-removal (survivor escape)
 * - Safety escape initiated
 *
 * Story 2.8: Unilateral Self-Removal (Survivor Escape)
 *
 * Follows project guidelines:
 * - Direct Firestore SDK (no abstractions)
 * - Types from Zod schemas
 * - Server timestamps for reliability
 */

/** Collection name for sealed audit entries */
const SEALED_AUDITS_COLLECTION = 'sealed_audits'

/**
 * Custom error class for sealed audit service errors
 */
export class SealedAuditServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'SealedAuditServiceError'
  }
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(code: string): string {
  return getSelfRemovalErrorMessage(code)
}

/**
 * Create a sealed audit entry
 *
 * CRITICAL: This function creates an entry in the sealed_audits collection,
 * which is NOT visible to family members. The Firestore security rules
 * ensure only support agents can read these entries.
 *
 * @param input - Sealed audit entry data
 * @returns Created sealed audit entry
 * @throws SealedAuditServiceError on failure
 */
export async function createSealedAuditEntry(
  input: CreateSealedAuditInput
): Promise<SealedAuditEntry> {
  try {
    // Validate required fields
    if (!input.userId) {
      throw new SealedAuditServiceError('removal-failed', 'User ID is required')
    }

    if (!input.familyId) {
      throw new SealedAuditServiceError('removal-failed', 'Family ID is required')
    }

    // Generate unique document ID
    const docRef = doc(collection(db, SEALED_AUDITS_COLLECTION))

    // Build audit entry data
    const auditData = {
      id: docRef.id,
      action: input.action,
      userId: input.userId,
      familyId: input.familyId,
      performedAt: serverTimestamp(),
      metadata: input.metadata || {},
    }

    // Write to sealed_audits collection
    await setDoc(docRef, auditData)

    // Return optimistic sealed audit entry
    const now = new Date()
    return sealedAuditEntrySchema.parse({
      id: docRef.id,
      action: input.action,
      userId: input.userId,
      familyId: input.familyId,
      performedAt: now,
      metadata: input.metadata,
    })
  } catch (error) {
    if (error instanceof SealedAuditServiceError) {
      console.error('[sealedAuditService.createSealedAuditEntry]', error)
      throw new Error(getErrorMessage(error.code))
    }
    console.error('[sealedAuditService.createSealedAuditEntry]', error)
    throw new Error(getErrorMessage('removal-failed'))
  }
}

/**
 * Create a guardian self-removal audit entry
 *
 * Convenience function for the most common sealed audit action.
 *
 * @param userId - User who removed themselves
 * @param familyId - Family they removed themselves from
 * @param metadata - Additional context (e.g., wasOnlyGuardian)
 * @returns Created sealed audit entry
 */
export async function createGuardianSelfRemovalAudit(
  userId: string,
  familyId: string,
  metadata?: Record<string, unknown>
): Promise<SealedAuditEntry> {
  return createSealedAuditEntry({
    action: 'guardian_self_removed' as SealedAuditAction,
    userId,
    familyId,
    metadata,
  })
}

/**
 * Create a safety escape audit entry
 *
 * Used when a safety escape is initiated via Epic 0.5 support agent.
 *
 * @param userId - User who initiated or benefited from safety escape
 * @param familyId - Family involved
 * @param metadata - Additional context
 * @returns Created sealed audit entry
 */
export async function createSafetyEscapeAudit(
  userId: string,
  familyId: string,
  metadata?: Record<string, unknown>
): Promise<SealedAuditEntry> {
  return createSealedAuditEntry({
    action: 'safety_escape_initiated' as SealedAuditAction,
    userId,
    familyId,
    metadata,
  })
}
