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
