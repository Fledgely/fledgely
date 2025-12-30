/**
 * Fledgely Cloud Functions
 *
 * This file exports all Cloud Functions for the Fledgely application.
 * Functions are organized by type:
 * - http/ - HTTP-triggered functions
 * - callable/ - Callable functions (via Firebase SDK)
 * - triggers/ - Firestore and Auth triggers
 * - scheduled/ - Cron-based scheduled functions
 */

import { initializeApp } from 'firebase-admin/app'

// Initialize Firebase Admin SDK
initializeApp()

// Export callable functions here as they are implemented
export { sendInvitation } from './callable/sendInvitation'
export { acceptInvitation } from './callable/acceptInvitation'
export { submitSafetyContact } from './callable/submitSafetyContact'
export { uploadSafetyDocument } from './callable/uploadSafetyDocument'
export { deleteSafetyDocument } from './callable/deleteSafetyDocument'
export {
  submitEnrollmentRequest,
  getEnrollmentRequestStatus,
  approveEnrollment,
  rejectEnrollment,
  registerDevice,
  assignDeviceToChild,
  verifyDeviceEnrollment,
  removeDevice,
  expireEnrollmentRequests,
} from './callable/enrollment'
// export { flagContent } from './callable/flagContent'

// Admin callable functions (Story 0.5.3)
export { getSafetyTickets } from './callable/admin/getSafetyTickets'
export { getSafetyTicketDetail } from './callable/admin/getSafetyTicketDetail'
export { getSafetyDocument } from './callable/admin/getSafetyDocument'
export { updateSafetyTicket } from './callable/admin/updateSafetyTicket'

// Admin callable functions (Story 0.5.4)
export { severParentAccess } from './callable/admin/severParentAccess'
export { getFamilyForSevering } from './callable/admin/getFamilyForSevering'

// Admin callable functions (Story 0.5.5)
export { getDevicesForFamily } from './callable/admin/getDevicesForFamily'
export { unenrollDevicesForSafety } from './callable/admin/unenrollDevicesForSafety'

// Export triggers here as they are implemented
// export { onScreenshotCreated } from './triggers/onScreenshotCreated'

// Export scheduled functions here as they are implemented
// export { calculateTrustScores } from './scheduled/calculateTrustScores'
export { cleanupExpiredScreenshots } from './scheduled'

// Export HTTP functions
export { uploadScreenshot, syncDeviceHealth } from './http/sync'
export { viewScreenshot } from './http/screenshots'
