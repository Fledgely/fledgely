import { initializeApp, getApps } from 'firebase/app'
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getStorage, connectStorageEmulator } from 'firebase/storage'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Validate required Firebase config - critical for safety feature to function
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error(
    'Firebase configuration missing. Ensure NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_PROJECT_ID are set.'
  )
}

// Initialize Firebase only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

// Initialize services
export const functions = getFunctions(app)
export const db = getFirestore(app)
export const auth = getAuth(app)
export const storage = getStorage(app)

// Track emulator connection state to avoid duplicate connections
const emulatorsConnected = { functions: false, firestore: false, auth: false, storage: false }

// Connect to emulators in development
if (process.env.NODE_ENV === 'development') {
  if (typeof window !== 'undefined') {
    // Only connect emulators in browser context
    const emulatorHost = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST || 'localhost'

    if (!emulatorsConnected.functions) {
      connectFunctionsEmulator(functions, emulatorHost, 5001)
      emulatorsConnected.functions = true
    }
    if (!emulatorsConnected.firestore) {
      connectFirestoreEmulator(db, emulatorHost, 8080)
      emulatorsConnected.firestore = true
    }
    if (!emulatorsConnected.auth) {
      connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true })
      emulatorsConnected.auth = true
    }
    if (!emulatorsConnected.storage) {
      connectStorageEmulator(storage, emulatorHost, 9199)
      emulatorsConnected.storage = true
    }
  }
}

export default app
