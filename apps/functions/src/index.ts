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

// Admin callable functions (Story 0.5.6)
export { disableLocationFeaturesForSafety } from './callable/admin/disableLocationFeaturesForSafety'

// Admin callable functions (Story 0.5.8)
export { getSealedAuditEntries } from './callable/admin/getSealedAuditEntries'

// Admin callable functions (Story 3.6)
export { grantLegalParentAccess } from './callable/admin/grantLegalParentAccess'
export { denyLegalParentPetition } from './callable/admin/denyLegalParentPetition'

// User callable functions (Story 2.8)
export { selfRemoveFromFamily } from './callable/selfRemoveFromFamily'

// Caregiver callable functions (Story 19D.1, 19D.4, 19D.5)
export { sendCaregiverInvitation } from './callable/sendCaregiverInvitation'
export { acceptCaregiverInvitation } from './callable/acceptCaregiverInvitation'
export { grantCaregiverExtension } from './callable/grantCaregiverExtension'
export { revokeCaregiverAccess } from './callable/revokeCaregiverAccess'

// AI Learning callable functions (Story 24.4)
export { getLearningDashboard, resetFamilyLearning } from './callable/learningDashboard'

// Export triggers here as they are implemented
export { onScreenshotCreated } from './triggers/onScreenshotCreated'
export { onDeviceStatusChange } from './triggers/onDeviceStatusChange'
export { onFlagCreated } from './triggers/onFlagCreated' // Story 23.1
export { onFlagAnnotated } from './triggers/onFlagAnnotated' // Story 23.3
export { onFlagCorrected } from './triggers/onFlagCorrected' // Story 24.2

// Export scheduled functions here as they are implemented
// export { calculateTrustScores } from './scheduled/calculateTrustScores'
export {
  cleanupExpiredScreenshots,
  executeExpiredWithdrawals,
  processAIFeedback,
  aggregateGlobalFeedback,
  processAuditFailures,
  analyzeViewingPatternsScheduled,
  sendAccessDigests,
  generateHealthCheckIns,
  sendCheckInReminders,
} from './scheduled'
export { cleanupStealthQueue } from './scheduled/cleanupStealthQueue'
export { checkAnnotationDeadlines } from './scheduled/checkAnnotationDeadlines' // Story 23.3

// Export HTTP functions
export { uploadScreenshot, syncDeviceHealth } from './http/sync'
export { viewScreenshot } from './http/screenshots'
export { familyAuditLog, childAuditLog, exportAuditLog } from './http/audit'
export { getPatternAlerts, dismissPatternAlert } from './http/patterns'
export {
  checkConsentStatus,
  initiateConsentWithdrawal,
  checkWithdrawalStatus,
  cancelConsentWithdrawal,
} from './http/consent'

// Classification HTTP handlers (Story 20.1)
export { processClassification } from './http/classification'

// Notification HTTP handlers (Story 27.6)
export {
  getNotificationPreferencesEndpoint,
  updateNotificationPreferencesEndpoint,
} from './http/notifications'

// Health check-in HTTP handlers (Story 27.5.1, 27.5.3)
export {
  getCheckInSettingsEndpoint,
  updateCheckInSettingsEndpoint,
  getPendingCheckInsEndpoint,
  submitCheckInResponseEndpoint,
  skipCheckInEndpoint,
  getFrictionSummaryEndpoint,
} from './http/health'
