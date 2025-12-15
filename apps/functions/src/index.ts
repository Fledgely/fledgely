import { initializeApp } from 'firebase-admin/app'

// Initialize Firebase Admin SDK
initializeApp()

// Callable Functions - Safety Request (Story 0.5.1)
export { submitSafetyRequest } from './callable/submitSafetyRequest'

// Callable Functions - Safety Documents (Story 0.5.2)
export { uploadSafetyDocument } from './callable/uploadSafetyDocument'
export { deleteSafetyDocument } from './callable/deleteSafetyDocument'
