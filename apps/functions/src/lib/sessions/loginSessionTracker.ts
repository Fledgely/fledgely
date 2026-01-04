/**
 * Login Session Tracking Service
 *
 * Story 41.5: New Login Notifications - AC1, AC2, AC6
 *
 * Features:
 * - Track login sessions with device fingerprinting
 * - Detect new vs known devices
 * - Manage trusted devices
 */

import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import {
  parseUserAgent,
  generateFingerprintId,
  hashIpAddress,
  type DeviceFingerprint,
  type LoginSession,
  type TrustedDevice,
  type DeviceType,
} from '@fledgely/shared'

// Lazy Firestore initialization
let db: FirebaseFirestore.Firestore | null = null
function getDb(): FirebaseFirestore.Firestore {
  if (!db) {
    db = getFirestore()
  }
  return db
}

/** Reset Firestore instance for testing */
export function _resetDbForTesting(): void {
  db = null
}

// ============================================
// Types
// ============================================

/** Parameters for tracking a login session */
export interface TrackLoginSessionParams {
  /** User ID who logged in */
  userId: string
  /** User's family ID */
  familyId: string
  /** User agent from request */
  userAgent: string
  /** IP address (will be hashed) */
  ipAddress: string
  /** Approximate location from IP geolocation */
  approximateLocation?: string | null
}

/** Result of tracking a login session */
export interface TrackLoginSessionResult {
  /** Created session ID */
  sessionId: string
  /** Whether this is a new device */
  isNewDevice: boolean
  /** Whether device is trusted */
  isTrusted: boolean
  /** Fingerprint ID */
  fingerprintId: string
  /** Device fingerprint details */
  fingerprint: DeviceFingerprint
}

// ============================================
// Fingerprint Management
// ============================================

/**
 * Get or create a device fingerprint for the user.
 */
async function getOrCreateFingerprint(
  userId: string,
  userAgent: string,
  ipHash: string,
  approximateLocation: string | null
): Promise<{ fingerprint: DeviceFingerprint; isNew: boolean }> {
  const fingerprintId = generateFingerprintId({ userAgent, ipHash })
  const fingerprintRef = getDb()
    .collection('users')
    .doc(userId)
    .collection('deviceFingerprints')
    .doc(fingerprintId)

  const existingDoc = await fingerprintRef.get()

  if (existingDoc.exists) {
    // Return existing fingerprint
    const data = existingDoc.data() as DeviceFingerprint
    return { fingerprint: data, isNew: false }
  }

  // Create new fingerprint
  const parsed = parseUserAgent(userAgent)
  const fingerprint: DeviceFingerprint = {
    id: fingerprintId,
    userAgent,
    deviceType: parsed.deviceType as DeviceType,
    browser: parsed.browser,
    os: parsed.os,
    approximateLocation,
    createdAt: Date.now(),
  }

  await fingerprintRef.set(fingerprint)

  logger.info('Created new device fingerprint', {
    userId,
    fingerprintId,
    deviceType: fingerprint.deviceType,
    browser: fingerprint.browser,
  })

  return { fingerprint, isNew: true }
}

// ============================================
// Trusted Device Management
// ============================================

/**
 * Check if a device fingerprint is trusted.
 */
async function isDeviceTrusted(userId: string, fingerprintId: string): Promise<boolean> {
  const trustedRef = getDb()
    .collection('users')
    .doc(userId)
    .collection('trustedDevices')
    .doc(fingerprintId)

  const doc = await trustedRef.get()
  return doc.exists
}

/**
 * Get all trusted devices for a user.
 */
export async function getTrustedDevices(userId: string): Promise<TrustedDevice[]> {
  const trustedRef = getDb().collection('users').doc(userId).collection('trustedDevices')

  const snapshot = await trustedRef.get()

  return snapshot.docs.map((doc) => doc.data() as TrustedDevice)
}

/**
 * Mark a device as trusted (AC2).
 */
export async function markDeviceAsTrusted(
  userId: string,
  fingerprintId: string,
  deviceName?: string
): Promise<TrustedDevice> {
  // Verify fingerprint exists
  const fingerprintRef = getDb()
    .collection('users')
    .doc(userId)
    .collection('deviceFingerprints')
    .doc(fingerprintId)

  const fpDoc = await fingerprintRef.get()
  if (!fpDoc.exists) {
    throw new Error(`Fingerprint ${fingerprintId} not found for user ${userId}`)
  }

  const fingerprint = fpDoc.data() as DeviceFingerprint

  // Create trusted device record
  const trustedDevice: TrustedDevice = {
    id: fingerprintId,
    userId,
    fingerprintId,
    deviceName: deviceName || `${fingerprint.browser} on ${fingerprint.os}`,
    createdAt: Date.now(),
  }

  const trustedRef = getDb()
    .collection('users')
    .doc(userId)
    .collection('trustedDevices')
    .doc(fingerprintId)

  await trustedRef.set(trustedDevice)

  logger.info('Marked device as trusted', {
    userId,
    fingerprintId,
    deviceName: trustedDevice.deviceName,
  })

  return trustedDevice
}

/**
 * Remove a device from trusted list.
 */
export async function removeTrustedDevice(userId: string, fingerprintId: string): Promise<void> {
  const trustedRef = getDb()
    .collection('users')
    .doc(userId)
    .collection('trustedDevices')
    .doc(fingerprintId)

  await trustedRef.delete()

  logger.info('Removed trusted device', { userId, fingerprintId })
}

// ============================================
// Session Tracking
// ============================================

/**
 * Track a login session (AC1, AC6).
 *
 * Creates or updates device fingerprint, creates session record,
 * and determines if this is a new device.
 */
export async function trackLoginSession(
  params: TrackLoginSessionParams
): Promise<TrackLoginSessionResult> {
  const { userId, familyId, userAgent, ipAddress, approximateLocation } = params

  // Hash the IP address (privacy-preserving)
  const ipHash = hashIpAddress(ipAddress)

  // Get or create fingerprint
  const { fingerprint, isNew } = await getOrCreateFingerprint(
    userId,
    userAgent,
    ipHash,
    approximateLocation ?? null
  )

  // Check if device is trusted
  const isTrusted = await isDeviceTrusted(userId, fingerprint.id)

  // Create session record
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  const now = Date.now()

  const session: LoginSession = {
    id: sessionId,
    userId,
    familyId,
    fingerprintId: fingerprint.id,
    isNewDevice: isNew,
    isTrusted,
    ipHash,
    createdAt: now,
    lastSeenAt: now,
  }

  const sessionRef = getDb().collection('users').doc(userId).collection('sessions').doc(sessionId)

  await sessionRef.set(session)

  logger.info('Tracked login session', {
    userId,
    sessionId,
    isNewDevice: isNew,
    isTrusted,
    fingerprintId: fingerprint.id,
  })

  return {
    sessionId,
    isNewDevice: isNew,
    isTrusted,
    fingerprintId: fingerprint.id,
    fingerprint,
  }
}

/**
 * Update session last seen time.
 */
export async function updateSessionLastSeen(userId: string, sessionId: string): Promise<void> {
  const sessionRef = getDb().collection('users').doc(userId).collection('sessions').doc(sessionId)

  await sessionRef.update({ lastSeenAt: Date.now() })
}

/**
 * Get active sessions for a user.
 */
export async function getUserSessions(userId: string): Promise<LoginSession[]> {
  const sessionsRef = getDb()
    .collection('users')
    .doc(userId)
    .collection('sessions')
    .orderBy('lastSeenAt', 'desc')
    .limit(20)

  const snapshot = await sessionsRef.get()

  return snapshot.docs.map((doc) => doc.data() as LoginSession)
}

/**
 * Get a specific session by ID.
 */
export async function getSession(userId: string, sessionId: string): Promise<LoginSession | null> {
  const sessionRef = getDb().collection('users').doc(userId).collection('sessions').doc(sessionId)

  const doc = await sessionRef.get()

  if (!doc.exists) {
    return null
  }

  return doc.data() as LoginSession
}

/**
 * Revoke (delete) a session.
 */
export async function revokeSession(userId: string, sessionId: string): Promise<void> {
  const sessionRef = getDb().collection('users').doc(userId).collection('sessions').doc(sessionId)

  await sessionRef.delete()

  logger.info('Revoked session', { userId, sessionId })
}
