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

// Export triggers here as they are implemented
// export { onScreenshotCreated } from './triggers/onScreenshotCreated'

// Export scheduled functions here as they are implemented
// export { calculateTrustScores } from './scheduled/calculateTrustScores'
export { cleanupExpiredScreenshots } from './scheduled'

// Export HTTP functions
export { uploadScreenshot } from './http/sync'
