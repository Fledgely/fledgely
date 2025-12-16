import { initializeApp } from 'firebase-admin/app'

// Initialize Firebase Admin SDK
initializeApp()

// Callable Functions - Safety Request (Story 0.5.1)
export { submitSafetyRequest } from './callable/submitSafetyRequest'

// Callable Functions - Safety Documents (Story 0.5.2)
export { uploadSafetyDocument } from './callable/uploadSafetyDocument'
export { deleteSafetyDocument } from './callable/deleteSafetyDocument'

// Callable Functions - Admin Dashboard (Story 0.5.3)
export { setAdminClaims } from './callable/setAdminClaims'
export { listSafetyRequests } from './callable/listSafetyRequests'
export { getSafetyRequest } from './callable/getSafetyRequest'
export { updateSafetyRequest } from './callable/updateSafetyRequest'

// Callable Functions - Parent Access Severing (Story 0.5.4)
export { severParentAccess } from './callable/severParentAccess'

// Callable Functions - Device Unenrollment (Story 0.5.5)
export { unenrollDevice, unenrollDevices } from './callable/unenrollDevice'

// Callable Functions - Location Feature Disable (Story 0.5.6)
export { disableLocationFeatures } from './callable/disableLocationFeatures'

// Callable Functions - Notification Stealth (Story 0.5.7)
export { activateNotificationStealth } from './callable/activateNotificationStealth'

// Scheduled Functions - Stealth Queue Cleanup (Story 0.5.7)
export { cleanupExpiredStealthQueues } from './scheduled/cleanupExpiredStealthQueues'

// Callable Functions - Audit Trail Sealing (Story 0.5.8)
export { getSealedAuditEntries } from './callable/getSealedAuditEntries'
export { sealEscapeAuditEntries } from './callable/sealEscapeAuditEntries'
export { unsealAuditEntries } from './callable/unsealAuditEntries'

// Callable Functions - Domestic Abuse Resource Referral (Story 0.5.9)
export { triggerResourceReferral } from './callable/triggerResourceReferral'
export { getResourceReferralContent } from './callable/getResourceReferralContent'
export { requestResourceEmail } from './callable/requestResourceEmail'

// Triggers - Email Queue Processing (Story 0.5.9)
export { processEmailQueueOnCreate, processEmailQueueOnUpdate } from './triggers/processEmailQueue'

// Scheduled Functions - Resource Staleness Check (Story 0.5.9)
export { checkResourceStaleness } from './scheduled/checkResourceStaleness'

// Callable Functions - Legal Petition (Story 3.6)
export { submitLegalPetition } from './callable/submitLegalPetition'
export { checkPetitionStatus } from './callable/checkPetitionStatus'
export { addCourtOrderedParent } from './callable/addCourtOrderedParent'

// Callable Functions - Legal Petition Admin Dashboard (Story 3.6)
export { listLegalPetitions } from './callable/listLegalPetitions'
export { getLegalPetition } from './callable/getLegalPetition'
export { updateLegalPetition } from './callable/updateLegalPetition'

// Triggers - Legal Petition Notification Queue Processing (Story 3.6)
export {
  processLegalPetitionNotificationOnCreate,
  processLegalPetitionNotificationOnUpdate,
} from './triggers/processLegalPetitionNotifications'

// Callable Functions - Data Symmetry (Story 3A.1)
export { logDataView, getViewAuditLog } from './callable/logDataView'

// Callable Functions - Safety Settings Proposal (Story 3A.2)
export { proposeSafetySettingChange } from './callable/proposeSafetySettingChange'
export { respondToSafetyProposal, disputeSafetyProposal } from './callable/respondToSafetyProposal'

// Callable Functions - Cooling Period Cancellation (Story 3A.4)
export { cancelCoolingPeriod } from './callable/cancelCoolingPeriod'

// Scheduled Functions - Safety Settings Proposal Expiry (Story 3A.2)
export { expireStaleProposals } from './scheduled/expireStaleProposals'

// Scheduled Functions - Cooling Period Completion (Story 3A.4)
export { completeCoolingPeriods } from './scheduled/completeCoolingPeriods'

// Callable Functions - Agreement Change Proposal (Story 3A.3)
export { proposeAgreementChange } from './callable/proposeAgreementChange'
export { respondToAgreementProposal } from './callable/respondToAgreementProposal'
export { signAgreementChange } from './callable/signAgreementChange'

// Scheduled Functions - Agreement Change Proposal Expiry (Story 3A.3)
export { expireStaleAgreementProposals } from './scheduled/expireStaleAgreementProposals'

// Triggers - Screenshot Viewing Rate Alert (Story 3A.5)
export { onScreenshotViewLogged } from './triggers/onScreenshotViewLogged'

// Callable Functions - Guardian Removal Prevention (Story 3A.6)
export { attemptGuardianRemoval } from './callable/attemptGuardianRemoval'
export { attemptGuardianRoleChange } from './callable/attemptGuardianRoleChange'
export { attemptGuardianPermissionChange } from './callable/attemptGuardianPermissionChange'

// Callable Functions - Template Library (Story 4.1)
export {
  getTemplateLibrary,
  getTemplatesByAgeGroupFn,
  searchTemplatesFn,
} from './callable/getTemplateLibrary'
