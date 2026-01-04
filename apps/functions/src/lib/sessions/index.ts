/**
 * Session utilities barrel export
 */

// Story 41.5: Login session tracking
export {
  trackLoginSession,
  getTrustedDevices,
  markDeviceAsTrusted,
  removeTrustedDevice,
  getUserSessions,
  getSession,
  revokeSession,
  updateSessionLastSeen,
} from './loginSessionTracker'
export type { TrackLoginSessionParams, TrackLoginSessionResult } from './loginSessionTracker'
