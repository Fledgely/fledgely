/**
 * Firebase testing utilities.
 *
 * Helpers for setting up Firebase emulators in tests.
 */

import { initializeApp, deleteApp, FirebaseApp } from 'firebase/app'
import {
  getAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  Auth,
  UserCredential,
} from 'firebase/auth'
import {
  getFirestore,
  connectFirestoreEmulator,
  Firestore,
  doc,
  setDoc,
  getDoc,
} from 'firebase/firestore'
import { getStorage, connectStorageEmulator, FirebaseStorage } from 'firebase/storage'

// Emulator ports - must match firebase.json
export const EMULATOR_PORTS = {
  auth: 9099,
  firestore: 8080,
  storage: 9199,
  functions: 5001,
  hosting: 5000,
  ui: 4000,
} as const

// Firebase app configuration for testing
// Uses a test-specific project ID to avoid conflicts with real project
const TEST_PROJECT_ID = 'fledgely-test'

let testApp: FirebaseApp | null = null
let testAuth: Auth | null = null
let testFirestore: Firestore | null = null
let testStorage: FirebaseStorage | null = null

/**
 * Initialize the Firebase test app and connect to emulators.
 * Call this in beforeAll() of your test file.
 */
export function initializeTestApp(): {
  app: FirebaseApp
  auth: Auth
  firestore: Firestore
  storage: FirebaseStorage
} {
  if (testApp) {
    return {
      app: testApp,
      auth: testAuth!,
      firestore: testFirestore!,
      storage: testStorage!,
    }
  }

  testApp = initializeApp({
    projectId: TEST_PROJECT_ID,
    apiKey: 'fake-api-key', // Not used with emulators
    authDomain: `${TEST_PROJECT_ID}.firebaseapp.com`,
  })

  testAuth = getAuth(testApp)
  testFirestore = getFirestore(testApp)
  testStorage = getStorage(testApp)

  // Connect to emulators
  connectAuthEmulator(testAuth, `http://localhost:${EMULATOR_PORTS.auth}`, {
    disableWarnings: true,
  })
  connectFirestoreEmulator(testFirestore, 'localhost', EMULATOR_PORTS.firestore)
  connectStorageEmulator(testStorage, 'localhost', EMULATOR_PORTS.storage)

  return {
    app: testApp,
    auth: testAuth,
    firestore: testFirestore,
    storage: testStorage,
  }
}

/**
 * Clean up the test app. Call this in afterAll() of your test file.
 */
export async function cleanupTestApp(): Promise<void> {
  if (testApp) {
    await deleteApp(testApp)
    testApp = null
    testAuth = null
    testFirestore = null
    testStorage = null
  }
}

/**
 * Clear all documents from Firestore emulator.
 * Call this in afterEach() to ensure test isolation.
 */
export async function clearFirestore(): Promise<void> {
  if (!testFirestore) {
    throw new Error('Test app not initialized. Call initializeTestApp() first.')
  }

  // Use the REST API to clear Firestore
  const response = await fetch(
    `http://localhost:${EMULATOR_PORTS.firestore}/emulator/v1/projects/${TEST_PROJECT_ID}/databases/(default)/documents`,
    { method: 'DELETE' }
  )

  if (!response.ok) {
    throw new Error(`Failed to clear Firestore: ${response.statusText}`)
  }
}

/**
 * Create a test user in the Auth emulator.
 */
export async function createTestUser(email: string, password: string): Promise<UserCredential> {
  if (!testAuth) {
    throw new Error('Test app not initialized. Call initializeTestApp() first.')
  }

  return createUserWithEmailAndPassword(testAuth, email, password)
}

/**
 * Sign in a test user.
 */
export async function signInTestUser(email: string, password: string): Promise<UserCredential> {
  if (!testAuth) {
    throw new Error('Test app not initialized. Call initializeTestApp() first.')
  }

  return signInWithEmailAndPassword(testAuth, email, password)
}

/**
 * Get the test Firestore instance.
 */
export function getTestFirestore(): Firestore {
  if (!testFirestore) {
    throw new Error('Test app not initialized. Call initializeTestApp() first.')
  }
  return testFirestore
}

/**
 * Get the test Auth instance.
 */
export function getTestAuth(): Auth {
  if (!testAuth) {
    throw new Error('Test app not initialized. Call initializeTestApp() first.')
  }
  return testAuth
}

/**
 * Get the test Storage instance.
 */
export function getTestStorage(): FirebaseStorage {
  if (!testStorage) {
    throw new Error('Test app not initialized. Call initializeTestApp() first.')
  }
  return testStorage
}

/**
 * Helper to write a test document to Firestore.
 */
export async function writeTestDocument<T extends Record<string, unknown>>(
  collectionPath: string,
  docId: string,
  data: T
): Promise<void> {
  const db = getTestFirestore()
  await setDoc(doc(db, collectionPath, docId), data)
}

/**
 * Helper to read a test document from Firestore.
 */
export async function readTestDocument<T>(
  collectionPath: string,
  docId: string
): Promise<T | null> {
  const db = getTestFirestore()
  const docSnap = await getDoc(doc(db, collectionPath, docId))
  return docSnap.exists() ? (docSnap.data() as T) : null
}
