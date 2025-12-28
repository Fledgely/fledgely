/**
 * Firebase initialization for web app.
 *
 * Uses environment variables for configuration.
 * Connects to emulators in development mode.
 * Lazy initialization to support Next.js static generation.
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, GoogleAuthProvider, Auth } from 'firebase/auth'

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
let googleProvider: GoogleAuthProvider | undefined
let emulatorConnected = false

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
    !emulatorConnected &&
    typeof window !== 'undefined' &&
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_USE_EMULATORS === 'true'
  ) {
    connectAuthEmulator(auth, 'http://localhost:9099', {
      disableWarnings: true,
    })
    emulatorConnected = true
  }

  return auth
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
export { getFirebaseApp, getFirebaseAuth, getGoogleProvider }
