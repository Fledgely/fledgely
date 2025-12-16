'use client'

import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  serverTimestamp,
  runTransaction,
  type DocumentData,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  type AgreementStatus,
  type ArchiveReason,
  isSigningComplete,
  getNextVersionNumber,
} from '@fledgely/contracts'

/**
 * Agreement Activation Service
 *
 * Story 6.3: Agreement Activation - Task 2, 7
 *
 * Handles agreement lifecycle management including:
 * - Activation when all signatures complete
 * - Version number assignment
 * - Previous agreement archiving
 * - Agreement history retrieval
 */

// ============================================
// TYPES
// ============================================

/**
 * Parameters for activating an agreement
 */
export interface ActivateAgreementParams {
  /** Family ID */
  familyId: string
  /** Agreement ID to activate */
  agreementId: string
}

/**
 * Parameters for archiving an agreement
 */
export interface ArchiveAgreementParams {
  /** Family ID */
  familyId: string
  /** Agreement ID to archive */
  agreementId: string
  /** Reason for archiving */
  reason: ArchiveReason
  /** ID of agreement that supersedes this one (optional) */
  supersededBy?: string
}

/**
 * Agreement data returned from queries
 */
export interface AgreementData {
  /** Agreement ID */
  id: string
  /** Agreement lifecycle status */
  status: AgreementStatus
  /** Version number */
  version: string
  /** When agreement was activated */
  activatedAt?: string
  /** When agreement was archived */
  archivedAt?: string
  /** Reason for archiving */
  archiveReason?: ArchiveReason
  /** ID of agreement that superseded this one */
  supersededBy?: string
}

/**
 * Audit log action types for agreement lifecycle events
 */
type AgreementAuditAction =
  | 'agreement_activated'
  | 'agreement_archived'
  | 'agreement_superseded'

/**
 * Custom error for agreement activation service operations
 */
export class AgreementActivationError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'AgreementActivationError'
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create an audit log entry for an agreement lifecycle action
 */
async function createAuditLogEntry(
  familyId: string,
  agreementId: string,
  action: AgreementAuditAction,
  metadata?: Record<string, unknown>
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
    timestamp: serverTimestamp(),
    metadata: metadata ?? {},
  })
}

/**
 * Get all existing version numbers for a family's agreements
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
 * Get the currently active agreement for a family (if any)
 */
async function findActiveAgreement(
  familyId: string
): Promise<{ id: string; data: DocumentData } | null> {
  const agreementsRef = collection(db, 'families', familyId, 'agreements')
  const q = query(agreementsRef, where('status', '==', 'active'))
  const snapshot = await getDocs(q)

  if (snapshot.empty) {
    return null
  }

  const doc = snapshot.docs[0]
  return { id: doc.id, data: doc.data() }
}

// ============================================
// MAIN SERVICE FUNCTIONS
// ============================================

/**
 * Activate an agreement when all signatures are complete
 *
 * Task 2.1-2.6: Agreement activation with version numbering and archiving
 *
 * @param params - Family ID and agreement ID
 * @throws AgreementActivationError if validation fails
 */
export async function activateAgreement(
  params: ActivateAgreementParams
): Promise<void> {
  const { familyId, agreementId } = params
  const docRef = doc(db, 'families', familyId, 'agreements', agreementId)

  // Use transaction for atomic read-validate-write
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(docRef)

    if (!snapshot.exists()) {
      throw new AgreementActivationError('not-found', 'Agreement not found')
    }

    const data = snapshot.data()
    const currentStatus = data?.status as AgreementStatus | undefined
    const signingStatus = data?.signingStatus as string | undefined

    // Validate agreement can be activated
    if (currentStatus === 'active') {
      throw new AgreementActivationError(
        'already-active',
        'Agreement is already active'
      )
    }

    // Task 2.2: Validate all signatures are present
    if (!isSigningComplete(signingStatus || '')) {
      throw new AgreementActivationError(
        'signatures-incomplete',
        'All signatures are not complete. Cannot activate agreement.'
      )
    }

    // Check for existing active agreement to archive
    const existingActive = await findActiveAgreement(familyId)
    if (existingActive && existingActive.id !== agreementId) {
      // Task 2.5: Archive the previous active agreement
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
        archiveReason: 'new_version' as ArchiveReason,
        supersededBy: agreementId,
      })
    }

    // Task 2.3: Get existing versions and calculate next version number
    const existingVersions = await getExistingVersions(familyId)
    const newVersion = getNextVersionNumber(existingVersions)

    // Task 2.4: Activate the agreement
    transaction.update(docRef, {
      status: 'active' as AgreementStatus,
      version: newVersion,
      activatedAt: serverTimestamp(),
    })
  })

  // Task 2.6: Create audit log entry
  await createAuditLogEntry(familyId, agreementId, 'agreement_activated', {
    activatedBy: 'signature_completion',
  })
}

/**
 * Archive an agreement
 *
 * Task 7.1-7.5: Agreement archiving with reason tracking
 *
 * @param params - Family ID, agreement ID, reason, and optional superseding agreement
 * @throws AgreementActivationError if validation fails
 */
export async function archiveAgreement(
  params: ArchiveAgreementParams
): Promise<void> {
  const { familyId, agreementId, reason, supersededBy } = params
  const docRef = doc(db, 'families', familyId, 'agreements', agreementId)

  // Get current agreement state
  const snapshot = await getDoc(docRef)

  if (!snapshot.exists()) {
    throw new AgreementActivationError('not-found', 'Agreement not found')
  }

  const data = snapshot.data()
  const currentStatus = data?.status as AgreementStatus | undefined

  // Validate agreement can be archived
  if (currentStatus === 'archived' || currentStatus === 'superseded') {
    throw new AgreementActivationError(
      'already-archived',
      'Agreement is already archived'
    )
  }

  // Task 7.2: Determine final status based on reason
  const newStatus: AgreementStatus =
    reason === 'new_version' ? 'superseded' : 'archived'

  // Task 7.3: Update with archive timestamp and reason
  await updateDoc(docRef, {
    status: newStatus,
    archivedAt: serverTimestamp(),
    archiveReason: reason,
    ...(supersededBy && { supersededBy }),
  })

  // Create audit log entry
  await createAuditLogEntry(
    familyId,
    agreementId,
    reason === 'new_version' ? 'agreement_superseded' : 'agreement_archived',
    {
      reason,
      supersededBy,
    }
  )
}

/**
 * Get the active agreement for a family
 *
 * Task 7.5: Filter out archived agreements when getting active
 *
 * @param familyId - Family ID
 * @returns Active agreement data or null if none
 */
export async function getActiveAgreement(
  familyId: string
): Promise<AgreementData | null> {
  const agreementsRef = collection(db, 'families', familyId, 'agreements')
  const q = query(agreementsRef, where('status', '==', 'active'))
  const snapshot = await getDocs(q)

  if (snapshot.empty) {
    return null
  }

  const doc = snapshot.docs[0]
  const data = doc.data()

  return {
    id: doc.id,
    status: data.status as AgreementStatus,
    version: data.version,
    activatedAt: data.activatedAt,
    archivedAt: data.archivedAt,
    archiveReason: data.archiveReason,
    supersededBy: data.supersededBy,
  }
}

/**
 * Get agreement history for a family (including archived)
 *
 * Task 7.6: View past agreements
 *
 * @param familyId - Family ID
 * @returns Array of agreements ordered by activation date (newest first)
 */
export async function getAgreementHistory(
  familyId: string
): Promise<AgreementData[]> {
  const agreementsRef = collection(db, 'families', familyId, 'agreements')
  const q = query(agreementsRef, orderBy('activatedAt', 'desc'))
  const snapshot = await getDocs(q)

  if (snapshot.empty) {
    return []
  }

  return snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      status: data.status as AgreementStatus,
      version: data.version,
      activatedAt: data.activatedAt,
      archivedAt: data.archivedAt,
      archiveReason: data.archiveReason,
      supersededBy: data.supersededBy,
    }
  })
}

export type { AgreementStatus, ArchiveReason }
