/**
 * Firebase initialization for web app.
 *
 * Uses environment variables for configuration.
 * Connects to emulators in development mode.
 * Lazy initialization to support Next.js static generation.
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, GoogleAuthProvider, Auth } from 'firebase/auth'
import {
  getFirestore as getFirestoreSDK,
  connectFirestoreEmulator,
  Firestore,
} from 'firebase/firestore'
import {
  getFunctions as getFunctionsSDK,
  connectFunctionsEmulator,
  Functions,
} from 'firebase/functions'

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Singleton instances (lazily initialized)
let app: FirebaseApp | undefined
let auth: Auth | undefined
let firestore: Firestore | undefined
let functions: Functions | undefined
let googleProvider: GoogleAuthProvider | undefined
let authEmulatorConnected = false
let firestoreEmulatorConnected = false
let functionsEmulatorConnected = false

/**
 * Get Firebase app instance. Initializes lazily on first call.
 */
function getFirebaseApp(): FirebaseApp {
  if (app) return app

  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig)
  } else {
    app = getApps()[0]
  }

  return app
}

/**
 * Get Firebase Auth instance. Initializes lazily on first call.
 */
function getFirebaseAuth(): Auth {
  if (auth) return auth

  auth = getAuth(getFirebaseApp())

  // Connect to emulators in development (only once)
  if (
    !authEmulatorConnected &&
    typeof window !== 'undefined' &&
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_USE_EMULATORS === 'true'
  ) {
    connectAuthEmulator(auth, 'http://localhost:9099', {
      disableWarnings: true,
    })
    authEmulatorConnected = true
  }

  return auth
}

/**
 * Get Firestore instance. Initializes lazily on first call.
 */
function getFirestoreDb(): Firestore {
  if (firestore) return firestore

  firestore = getFirestoreSDK(getFirebaseApp())

  // Connect to emulators in development (only once)
  if (
    !firestoreEmulatorConnected &&
    typeof window !== 'undefined' &&
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_USE_EMULATORS === 'true'
  ) {
    connectFirestoreEmulator(firestore, 'localhost', 8080)
    firestoreEmulatorConnected = true
  }

  return firestore
}

/**
 * Get Firebase Functions instance. Initializes lazily on first call.
 */
function getFirebaseFunctions(): Functions {
  if (functions) return functions

  functions = getFunctionsSDK(getFirebaseApp())

  // Connect to emulators in development (only once)
  if (
    !functionsEmulatorConnected &&
    typeof window !== 'undefined' &&
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_USE_EMULATORS === 'true'
  ) {
    connectFunctionsEmulator(functions, 'localhost', 5001)
    functionsEmulatorConnected = true
  }

  return functions
}

/**
 * Get Google Auth Provider instance.
 */
function getGoogleProvider(): GoogleAuthProvider {
  if (googleProvider) return googleProvider
  googleProvider = new GoogleAuthProvider()
  return googleProvider
}

// Export getter functions for lazy initialization
export { getFirebaseApp, getFirebaseAuth, getFirestoreDb, getFirebaseFunctions, getGoogleProvider }

// Alias for backwards compatibility and clearer naming
export const getFunctionsInstance = getFirebaseFunctions
