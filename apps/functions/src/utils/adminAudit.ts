/**
 * Admin Audit Logging System.
 *
 * Story 0.5.3: Support Agent Escape Dashboard
 *
 * CRITICAL SECURITY DESIGN:
 * This audit system is SEPARATE from family audit logs.
 * - Admin actions logged to /adminAuditLogs collection
 * - NO entries in family's auditLogs collection
 * - Read access limited to admin users only
 *
 * Key features:
 * - Logs all safety-team agent actions
 * - Includes agent identity, action, timestamp, metadata
 * - Supports resource tracking for traceability
 */

import { createHash } from 'crypto'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'

const db = getFirestore()

/**
 * Action types for admin audit logging.
 *
 * Story 0.5.3: Support Agent Escape Dashboard
 * Story 0.5.4: Parent Access Severing (added sever_parent_access, get_family_for_severing)
 * Story 0.5.5: Remote Device Unenrollment (added get_devices_for_family, unenroll_devices_for_safety)
 */
export type AdminAuditAction =
  | 'view_ticket_list'
  | 'view_ticket_detail'
  | 'view_document'
  | 'update_ticket_status'
  | 'add_internal_note'
  | 'update_verification'
  | 'escalate_ticket'
  | 'access_denied'
  | 'sever_parent_access' // Story 0.5.4
  | 'get_family_for_severing' // Story 0.5.4
  | 'get_devices_for_family' // Story 0.5.5
  | 'unenroll_devices_for_safety' // Story 0.5.5

/**
 * Resource types for admin audit logging.
 *
 * Story 0.5.3: Support Agent Escape Dashboard
 * Story 0.5.4: Parent Access Severing (added family)
 * Story 0.5.5: Remote Device Unenrollment (added device)
 */
export type AdminAuditResourceType =
  | 'safety_ticket'
  | 'safety_document'
  | 'safety_dashboard'
  | 'family'
  | 'device' // Story 0.5.5

/**
 * Admin audit log entry structure.
 */
export interface AdminAuditLogEntry {
  /** Unique log entry ID */
  id: string
  /** Agent's Firebase UID */
  agentId: string
  /** Agent's email (for easier identification) */
  agentEmail: string | null
  /** Action performed */
  action: AdminAuditAction
  /** Type of resource accessed */
  resourceType: AdminAuditResourceType
  /** ID of the resource (e.g., ticket ID, document ID) */
  resourceId: string | null
  /** When the action occurred */
  timestamp: Timestamp
  /** Additional context about the action */
  metadata: Record<string, unknown>
  /** IP address hash (for security tracking) */
  ipHash: string | null
}

/**
 * Input for creating an admin audit log entry.
 */
export interface CreateAdminAuditInput {
  /** Agent's Firebase UID */
  agentId: string
  /** Agent's email */
  agentEmail: string | null
  /** Action performed */
  action: AdminAuditAction
  /** Type of resource accessed */
  resourceType: AdminAuditResourceType
  /** ID of the resource (optional) */
  resourceId?: string | null
  /** Additional metadata (optional) */
  metadata?: Record<string, unknown>
  /** IP address (will be hashed) */
  ipAddress?: string | null
}

/**
 * Hash an IP address for audit logging.
 * Uses truncated hash to prevent storing/exposing actual IP addresses.
 */
function hashIpForAudit(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').substring(0, 16)
}

/**
 * Log an admin action to the adminAuditLogs collection.
 *
 * CRITICAL: This function ONLY writes to adminAuditLogs.
 * It NEVER writes to any family-scoped audit collection.
 *
 * @param input - The audit log entry data
 * @returns The created log entry ID
 */
export async function logAdminAction(input: CreateAdminAuditInput): Promise<string> {
  const logRef = db.collection('adminAuditLogs').doc()

  const logEntry: Omit<AdminAuditLogEntry, 'id' | 'timestamp'> & {
    id: string
    timestamp: FieldValue
  } = {
    id: logRef.id,
    agentId: input.agentId,
    agentEmail: input.agentEmail,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId || null,
    timestamp: FieldValue.serverTimestamp(),
    metadata: input.metadata || {},
    ipHash: input.ipAddress ? hashIpForAudit(input.ipAddress) : null,
  }

  await logRef.set(logEntry)

  return logRef.id
}

/**
 * Log an unauthorized access attempt.
 *
 * @param userId - The user who attempted access
 * @param userEmail - The user's email
 * @param action - What they tried to do
 * @param ipAddress - Their IP address
 */
export async function logUnauthorizedAccess(
  userId: string,
  userEmail: string | null,
  action: string,
  ipAddress?: string | null
): Promise<void> {
  await logAdminAction({
    agentId: userId,
    agentEmail: userEmail,
    action: 'access_denied',
    resourceType: 'safety_dashboard',
    metadata: { attemptedAction: action },
    ipAddress,
  })
}
