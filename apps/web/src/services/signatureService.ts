'use client'

import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
  runTransaction,
  writeBatch,
  getDocs,
  query,
  where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  type AgreementSignature,
  type SigningStatus,
  canChildSign,
  canParentSign,
  canCoParentSign,
  getNextSigningStatus,
  getNextVersionNumber,
  type AgreementStatus,
} from '@fledgely/contracts'

/**
 * Signature Service
 *
 * Story 6.1: Child Digital Signature Ceremony - Task 7
 *
 * Handles digital signature recording for agreements.
 * Manages signature storage, status updates, and audit logging.
 *
 * Features:
 * - Task 7.2: recordChildSignature and recordParentSignature functions
 * - Task 7.3: Store signature with timestamp in Firestore
 * - Task 7.4: Update agreement status to reflect signature
 * - Task 7.5: Create audit log entry for signature action
 * - Task 7.6: Event emission for notifications (via audit log)
 */

/**
 * Parameters for recording a signature
 */
export interface RecordSignatureParams {
  /** Family ID */
  familyId: string
  /** Agreement ID */
  agreementId: string
  /** The signature data */
  signature: AgreementSignature
}

/**
 * Parameters for getting agreement signing status
 */
export interface GetSigningStatusParams {
  /** Family ID */
  familyId: string
  /** Agreement ID */
  agreementId: string
}

/**
 * Agreement signing status result
 */
export interface SigningStatusResult {
  /** Current signing status */
  signingStatus: SigningStatus
  /** Signatures object */
  signatures: {
    parent: AgreementSignature | null
    coParent: AgreementSignature | null
    child: AgreementSignature | null
  }
}

/**
 * Audit log action types for signature events
 */
type SignatureAuditAction =
  | 'parent_signed'
  | 'co_parent_signed'
  | 'child_signed'
  | 'agreement_activated'

/**
 * Extended parameters for recording a signature with custody context
 */
export interface RecordSignatureParamsWithCustody extends RecordSignatureParams {
  /** Whether this is a shared custody agreement */
  isSharedCustody?: boolean
}

/**
 * Custom error for signature service operations
 */
export class SignatureServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'SignatureServiceError'
  }
}

/**
 * Create an audit log entry for a signature action
 */
async function createAuditLogEntry(
  familyId: string,
  agreementId: string,
  action: SignatureAuditAction,
  signature: AgreementSignature
): Promise<void> {
  const auditRef = collection(
    db,
    'families',
    familyId,
    'agreements',
    agreementId,
    'audit-log'
  )

  await addDoc(auditRef, {
    action,
    agreementId,
    signatureType: signature.signature.type,
    signedBy: signature.signature.signedBy,
    timestamp: serverTimestamp(),
    metadata: {
      signatureId: signature.signature.id,
      consentCheckboxChecked: signature.consentCheckboxChecked,
      commitmentsReviewed: signature.commitmentsReviewed,
    },
  })
}

/**
 * Story 6.3 Task 3.3: Get all existing version numbers for a family's agreements
 */
async function getExistingVersions(familyId: string): Promise<string[]> {
  const agreementsRef = collection(db, 'families', familyId, 'agreements')
  const snapshot = await getDocs(agreementsRef)

  const versions: string[] = []
  snapshot.docs.forEach((doc) => {
    const data = doc.data()
    if (data.version) {
      versions.push(data.version)
    }
  })

  return versions
}

/**
 * Story 6.3 Task 3.3: Find the currently active agreement for a family (if any)
 */
async function findActiveAgreement(
  familyId: string,
  excludeAgreementId?: string
): Promise<{ id: string } | null> {
  const agreementsRef = collection(db, 'families', familyId, 'agreements')
  const q = query(agreementsRef, where('status', '==', 'active'))
  const snapshot = await getDocs(q)

  if (snapshot.empty) {
    return null
  }

  // Find first active agreement that isn't the one being activated
  for (const doc of snapshot.docs) {
    if (doc.id !== excludeAgreementId) {
      return { id: doc.id }
    }
  }

  return null
}

/**
 * Record a child's signature on an agreement
 *
 * Task 7.2: Implements recordChildSignature(agreementId, signature)
 *
 * Enforces parent-first signing order (AC: 7) - child cannot sign
 * before parent to prevent coercion pressure.
 *
 * Uses Firestore transaction for atomicity to prevent race conditions
 * when multiple users attempt to sign simultaneously.
 *
 * @param params - Family ID, agreement ID, and signature data
 * @throws SignatureServiceError if validation fails
 */
export async function recordChildSignature(
  params: RecordSignatureParams
): Promise<void> {
  const { familyId, agreementId, signature } = params
  const docRef = doc(db, 'families', familyId, 'agreements', agreementId)

  // Use transaction for atomic read-validate-write
  const newStatus = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(docRef)

    if (!snapshot.exists()) {
      throw new SignatureServiceError(
        'not-found',
        'Agreement not found'
      )
    }

    const data = snapshot.data()
    const currentStatus = (data?.signingStatus as SigningStatus) || 'pending'
    const signatures = data?.signatures || { parent: null, child: null }

    // Enforce parent-first signing order (AC: 7) - validated inside transaction
    if (!canChildSign(currentStatus)) {
      if (currentStatus === 'pending') {
        throw new SignatureServiceError(
          'invalid-state',
          'Parent must sign first before child can sign'
        )
      }
      if (signatures.child) {
        throw new SignatureServiceError(
          'already-signed',
          'Child has already signed this agreement'
        )
      }
    }

    // Calculate new status
    const calculatedNewStatus = getNextSigningStatus(currentStatus, 'child')

    // Story 6.3 Task 3.3: If agreement will be complete, assign version and activate
    let versionNumber: string | undefined
    if (calculatedNewStatus === 'complete') {
      // Get existing versions to calculate next version
      const existingVersions = await getExistingVersions(familyId)
      versionNumber = getNextVersionNumber(existingVersions)

      // Story 6.3 AC 7: Archive previous active agreement if exists
      const existingActive = await findActiveAgreement(familyId, agreementId)
      if (existingActive) {
        const oldDocRef = doc(
          db,
          'families',
          familyId,
          'agreements',
          existingActive.id
        )
        transaction.update(oldDocRef, {
          status: 'superseded' as AgreementStatus,
          archivedAt: serverTimestamp(),
          archiveReason: 'new_version',
          supersededBy: agreementId,
        })
      }
    }

    // Task 7.3 & 7.4: Update agreement with signature and status atomically
    // Story 6.3 AC 1, 2, 3: Set status to active, assign version, record activatedAt
    transaction.update(docRef, {
      'signatures.child': signature,
      signingStatus: calculatedNewStatus,
      ...(calculatedNewStatus === 'complete' && {
        activatedAt: serverTimestamp(),
        status: 'active' as AgreementStatus,
        version: versionNumber,
      }),
    })

    return calculatedNewStatus
  })

  // Task 7.5: Create audit log entries using batch write for efficiency
  const batch = writeBatch(db)
  const auditRef = doc(
    collection(db, 'families', familyId, 'agreements', agreementId, 'audit-log')
  )

  batch.set(auditRef, {
    action: 'child_signed' as SignatureAuditAction,
    agreementId,
    signatureType: signature.signature.type,
    signedBy: signature.signature.signedBy,
    timestamp: serverTimestamp(),
    metadata: {
      signatureId: signature.signature.id,
      consentCheckboxChecked: signature.consentCheckboxChecked,
      commitmentsReviewed: signature.commitmentsReviewed,
    },
  })

  // If agreement is now complete, add activation audit entry in same batch
  if (newStatus === 'complete') {
    const activationRef = doc(
      collection(db, 'families', familyId, 'agreements', agreementId, 'audit-log')
    )
    batch.set(activationRef, {
      action: 'agreement_activated' as SignatureAuditAction,
      agreementId,
      timestamp: serverTimestamp(),
      metadata: {
        activatedBy: 'child_signature',
      },
    })
  }

  await batch.commit()
}

/**
 * Record a parent's signature on an agreement
 *
 * Task 7.2: Parent variant of signature recording
 *
 * Parent typically signs first in the signing order to demonstrate
 * commitment before child signs (prevents coercion).
 *
 * For shared custody agreements, uses different status transitions.
 *
 * Uses Firestore transaction for atomicity to prevent race conditions.
 *
 * @param params - Family ID, agreement ID, signature data, and custody context
 * @throws SignatureServiceError if validation fails
 */
export async function recordParentSignature(
  params: RecordSignatureParamsWithCustody
): Promise<void> {
  const { familyId, agreementId, signature, isSharedCustody = false } = params
  const docRef = doc(db, 'families', familyId, 'agreements', agreementId)

  // Use transaction for atomic read-validate-write
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(docRef)

    if (!snapshot.exists()) {
      throw new SignatureServiceError(
        'not-found',
        'Agreement not found'
      )
    }

    const data = snapshot.data()
    const currentStatus = (data?.signingStatus as SigningStatus) || 'pending'
    const signatures = data?.signatures || { parent: null, coParent: null, child: null }

    // Check if parent can sign - validated inside transaction
    if (!canParentSign(currentStatus)) {
      if (signatures.parent) {
        throw new SignatureServiceError(
          'already-signed',
          'Parent has already signed this agreement'
        )
      }
    }

    // Calculate new status with shared custody consideration
    const newStatus = getNextSigningStatus(currentStatus, 'parent', isSharedCustody)

    // Update agreement with signature and status atomically
    transaction.update(docRef, {
      'signatures.parent': signature,
      signingStatus: newStatus,
    })
  })

  // Create audit log entry
  await createAuditLogEntry(familyId, agreementId, 'parent_signed', signature)
}

/**
 * Record a co-parent's signature on a shared custody agreement
 *
 * Story 6.2 Task 5: Shared custody dual signing
 *
 * In shared custody situations, both parents must sign before the child.
 * Co-parent signs after the first parent has signed.
 *
 * Uses Firestore transaction for atomicity to prevent race conditions.
 *
 * @param params - Family ID, agreement ID, and signature data
 * @throws SignatureServiceError if validation fails
 */
export async function recordCoParentSignature(
  params: RecordSignatureParams
): Promise<void> {
  const { familyId, agreementId, signature } = params
  const docRef = doc(db, 'families', familyId, 'agreements', agreementId)

  // Use transaction for atomic read-validate-write
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(docRef)

    if (!snapshot.exists()) {
      throw new SignatureServiceError(
        'not-found',
        'Agreement not found'
      )
    }

    const data = snapshot.data()
    const currentStatus = (data?.signingStatus as SigningStatus) || 'pending'
    const signatures = data?.signatures || { parent: null, coParent: null, child: null }

    // Check if co-parent can sign - validated inside transaction
    if (!canCoParentSign(currentStatus)) {
      if (currentStatus === 'pending') {
        throw new SignatureServiceError(
          'invalid-state',
          'First parent must sign before co-parent can sign'
        )
      }
      if (signatures.coParent) {
        throw new SignatureServiceError(
          'already-signed',
          'Co-parent has already signed this agreement'
        )
      }
      throw new SignatureServiceError(
        'invalid-state',
        'Cannot sign at this time'
      )
    }

    // Calculate new status - co-parent signing always goes to both_parents_signed
    const newStatus = getNextSigningStatus(currentStatus, 'co-parent')

    // Update agreement with co-parent signature and status atomically
    transaction.update(docRef, {
      'signatures.coParent': signature,
      signingStatus: newStatus,
    })
  })

  // Create audit log entry
  await createAuditLogEntry(familyId, agreementId, 'co_parent_signed', signature)
}

/**
 * Get the current signing status of an agreement
 *
 * @param params - Family ID and agreement ID
 * @returns Current signing status and signatures
 * @throws SignatureServiceError if agreement not found
 */
export async function getAgreementSigningStatus(
  params: GetSigningStatusParams
): Promise<SigningStatusResult> {
  const { familyId, agreementId } = params

  const docRef = doc(db, 'families', familyId, 'agreements', agreementId)
  const snapshot = await getDoc(docRef)

  if (!snapshot.exists()) {
    throw new SignatureServiceError(
      'not-found',
      'Agreement not found'
    )
  }

  const data = snapshot.data()

  return {
    signingStatus: (data?.signingStatus as SigningStatus) || 'pending',
    signatures: data?.signatures || { parent: null, coParent: null, child: null },
  }
}

export type { AgreementSignature, SigningStatus }
