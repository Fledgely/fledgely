/**
 * Audit Services Index
 *
 * Story 27.1: Audit Event Capture
 *
 * Exports audit-related services for use throughout the functions app.
 */

export {
  createAuditEvent,
  createAuditEventNonBlocking,
  extractDeviceContext,
  hashIpAddress,
  retryDeadLetterEntries,
  cleanupDeadLetterEntries,
  _resetDbForTesting,
} from './auditEventService'

export {
  getAuditLogForFamily,
  hasOnlyFamilyAccess,
  getFamilyMembersForFilter,
  type AuditLogFilters,
  type AuditLogPagination,
  type AuditLogQueryResult,
  type EnrichedAuditEvent,
} from './auditQueryService'

export {
  getChildAuditLog,
  type ChildFriendlyAuditEvent,
  type ChildAuditLogResult,
} from './childAuditQueryService'
