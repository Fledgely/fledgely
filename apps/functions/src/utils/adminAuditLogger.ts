import { getFirestore, FieldValue } from 'firebase-admin/firestore'

/**
 * Admin Audit Logger - Utility for logging admin-level events
 *
 * Story 3A.6: Co-Parent Removal Prevention
 *
 * CRITICAL: Admin audit entries are NOT visible to family members.
 * Only admin/support team can read these entries. They are used to
 * detect potential abuse patterns (e.g., repeated removal attempts).
 */

/**
 * Action types for blocked operations
 */
export type BlockedAuditAction =
  | 'guardian_removal_blocked'
  | 'role_change_blocked'
  | 'permission_change_blocked'

/**
 * Map from blocked operation to audit action
 */
const BLOCKED_OPERATION_TO_AUDIT_ACTION: Record<
  'guardian_removal' | 'role_downgrade' | 'permission_downgrade',
  BlockedAuditAction
> = {
  guardian_removal: 'guardian_removal_blocked',
  role_downgrade: 'role_change_blocked',
  permission_downgrade: 'permission_change_blocked',
}

/**
 * Data for logging a blocked guardian operation attempt
 */
export interface BlockedAttemptAuditData {
  /** Guardian who attempted the action */
  attemptedBy: string
  /** Guardian they tried to affect */
  targetGuardian: string
  /** Child ID */
  childId: string
  /** Family ID */
  familyId: string
  /** Custody type that triggered protection */
  custodyType: 'shared' | 'complex'
  /** Type of operation that was blocked */
  blockedOperation: 'guardian_removal' | 'role_downgrade' | 'permission_downgrade'
  /** Current role (for role changes) */
  currentRole?: string
  /** Requested role (for role changes) */
  requestedRole?: string
  /** Current permissions (for permission changes) */
  currentPermissions?: string
  /** Requested permissions (for permission changes) */
  requestedPermissions?: string
}

/**
 * Log a blocked guardian operation attempt to admin audit log.
 *
 * This is for abuse signal detection - NOT visible to family members.
 * Only admin/support team can read these entries via Firestore.
 *
 * @param data - The blocked attempt data to log
 * @returns Promise that resolves when the audit entry is written
 */
export async function logBlockedAttemptToAdminAudit(
  data: BlockedAttemptAuditData
): Promise<void> {
  const db = getFirestore()
  const auditId = db.collection('adminAuditLog').doc().id

  await db.collection('adminAuditLog').doc(auditId).set({
    id: auditId,
    action: BLOCKED_OPERATION_TO_AUDIT_ACTION[data.blockedOperation],
    triggeredBy: data.attemptedBy,
    familyId: data.familyId,
    childId: data.childId,
    occurredAt: FieldValue.serverTimestamp(),
    metadata: {
      targetGuardian: data.targetGuardian,
      custodyType: data.custodyType,
      blockedOperation: data.blockedOperation,
      ...(data.currentRole && { currentRole: data.currentRole }),
      ...(data.requestedRole && { requestedRole: data.requestedRole }),
      ...(data.currentPermissions && { currentPermissions: data.currentPermissions }),
      ...(data.requestedPermissions && { requestedPermissions: data.requestedPermissions }),
    },
  })
}
