/**
 * Cloud Functions for Device Enrollment
 * Story 12.3: Device-to-Device Enrollment Approval
 * Story 12.4: Device Registration in Firestore
 * Story 12.5: Child Assignment to Device
 *
 * Follows the Cloud Functions Template pattern:
 * 1. Auth (FIRST)
 * 2. Validation (SECOND)
 * 3. Permission (THIRD)
 * 4. Business logic via service (LAST)
 *
 * Story 12.3 acceptance criteria:
 * - AC1: Enrollment request submission
 * - AC2: Parent notification (via Firestore real-time)
 * - AC4: Approval expiry (10 minutes)
 * - AC5: Rejection handling
 * - AC6: Approval success
 *
 * Story 12.4 acceptance criteria:
 * - AC1: Device document creation
 * - AC2: Device document data
 * - AC3: Device credentials returned
 *
 * Story 12.5 acceptance criteria:
 * - AC3: Assignment updates device document with childId
 * - AC4: Assignment change audited
 */

import { onCall, HttpsError, onRequest } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { z } from 'zod'
import { verifyAuth } from '../shared/auth'
import * as logger from 'firebase-functions/logger'
import * as crypto from 'crypto'

/** Request expiry time in milliseconds (10 minutes) */
const REQUEST_EXPIRY_MS = 10 * 60 * 1000

/** Batch size for expiry processing to avoid timeouts */
const EXPIRY_BATCH_SIZE = 100

/** TOTP secret size in bytes (256-bit / 32 bytes for strong security) */
const TOTP_SECRET_BYTES = 32

/**
 * Base32 character set per RFC 4648
 */
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/**
 * Encode bytes to Base32 string (RFC 4648)
 * Used for TOTP secrets to ensure RFC 6238 compatibility
 *
 * @param buffer - Buffer to encode
 * @returns Base32 encoded string
 */
function encodeBase32(buffer: Buffer): string {
  let result = ''
  let bits = 0
  let value = 0

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i]
    bits += 8

    while (bits >= 5) {
      result += BASE32_ALPHABET[(value >>> (bits - 5)) & 0x1f]
      bits -= 5
    }
  }

  // Handle remaining bits
  if (bits > 0) {
    result += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f]
  }

  return result
}

/**
 * Generate a cryptographically secure TOTP secret
 * Uses Node.js crypto.randomBytes for 256-bit entropy
 *
 * Story 13.1: AC1, AC5
 * - Generates 32-byte (256-bit) random secret
 * - Returns Base32 encoded for RFC 6238 compatibility
 * - Never logs the secret value
 *
 * @returns Base32 encoded TOTP secret
 */
function generateTotpSecret(): string {
  const secretBytes = crypto.randomBytes(TOTP_SECRET_BYTES)
  return encodeBase32(secretBytes)
}

/**
 * Enrollment request document structure
 * Stored in /families/{familyId}/enrollmentRequests/{requestId}
 */
export interface EnrollmentRequest {
  id: string
  familyId: string
  token: string
  deviceInfo: {
    type: 'chromebook'
    platform: string
    userAgent: string
  }
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  createdAt: Timestamp
  expiresAt: Timestamp
  approvedBy?: string
  approvedAt?: Timestamp
  rejectedBy?: string
  rejectedAt?: Timestamp
  registeredDeviceId?: string // Story 12.4: Set after device registration
  registeredAt?: Timestamp // Story 12.4: When device was registered
}

// Input validation schemas
const submitEnrollmentRequestSchema = z.object({
  familyId: z.string().min(1),
  token: z.string().min(1),
  deviceInfo: z.object({
    type: z.literal('chromebook'),
    platform: z.string().min(1),
    userAgent: z.string().min(1),
  }),
})

const approveEnrollmentSchema = z.object({
  familyId: z.string().min(1),
  requestId: z.string().min(1),
})

const rejectEnrollmentSchema = z.object({
  familyId: z.string().min(1),
  requestId: z.string().min(1),
})

const registerDeviceSchema = z.object({
  familyId: z.string().min(1),
  requestId: z.string().min(1),
})

const assignDeviceToChildSchema = z.object({
  familyId: z.string().min(1),
  deviceId: z.string().min(1),
  childId: z.string().nullable(), // null to unassign
})

// Response types
interface SubmitEnrollmentResponse {
  success: boolean
  requestId: string
  message: string
}

interface ApproveEnrollmentResponse {
  success: boolean
  message: string
}

interface RejectEnrollmentResponse {
  success: boolean
  message: string
}

interface GetEnrollmentStatusResponse {
  id: string
  familyId: string
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  createdAt: number
  expiresAt: number
  approvedBy?: string
  approvedAt?: number
  rejectedBy?: string
  rejectedAt?: number
}

interface RegisterDeviceResponse {
  success: boolean
  deviceId: string
  message: string
  // Story 13.1: Include TOTP secret in response (one-time transmission)
  totpSecret?: string // Only included on first registration, not on idempotent calls
}

interface AssignDeviceResponse {
  success: boolean
  message: string
}

/**
 * Device document structure
 * Stored in /families/{familyId}/devices/{deviceId}
 * Story 13.1: Added TOTP fields for offline unlock
 */
export interface Device {
  deviceId: string
  type: 'chromebook' | 'android'
  enrolledAt: Timestamp
  enrolledBy: string
  childId: string | null
  name: string
  lastSeen: Timestamp
  status: 'active' | 'offline' | 'unenrolled'
  metadata: {
    platform: string
    userAgent: string
    enrollmentRequestId: string
  }
  // Story 13.1: TOTP fields for offline emergency unlock
  totpSecret: string // Base32 encoded, 32 bytes (256-bit)
  totpCreatedAt: Timestamp
  totpAlgorithm: 'SHA1' // RFC 6238 default
  totpDigits: 6 // Standard 6-digit codes
  totpPeriod: 30 // 30-second window
}

/**
 * Submit an enrollment request from the extension.
 * Called after QR code is scanned and validated locally.
 *
 * AC1: Creates enrollment request document with 10-minute expiry
 * AC2: Request appears in Firestore for dashboard to listen to
 */
export const submitEnrollmentRequest = onCall<
  z.infer<typeof submitEnrollmentRequestSchema>,
  Promise<SubmitEnrollmentResponse>
>(async (request) => {
  // Note: This function does NOT require auth - it's called by unenrolled extension
  // The security is based on the enrollment token validation

  // 2. Validation (SECOND)
  const parseResult = submitEnrollmentRequestSchema.safeParse(request.data)
  if (!parseResult.success) {
    throw new HttpsError('invalid-argument', 'Invalid enrollment request data')
  }
  const { familyId, token, deviceInfo } = parseResult.data

  // 3. Validate enrollment token
  const db = getFirestore()
  const tokensRef = db.collection('families').doc(familyId).collection('enrollmentTokens')
  const tokenQuery = tokensRef.where('token', '==', token).where('status', '==', 'active')
  const tokenSnapshot = await tokenQuery.get()

  if (tokenSnapshot.empty) {
    throw new HttpsError('not-found', 'Invalid or expired enrollment token')
  }

  const tokenDoc = tokenSnapshot.docs[0]
  const tokenData = tokenDoc.data()

  // Check token expiry
  const expiresAt = tokenData.expiresAt?.toMillis?.() || tokenData.expiresAt
  if (Date.now() > expiresAt) {
    // Mark token as expired
    await tokenDoc.ref.update({ status: 'expired' })
    throw new HttpsError('failed-precondition', 'Enrollment token has expired')
  }

  // 4. Business logic - create enrollment request
  const now = Date.now()
  const requestRef = db.collection('families').doc(familyId).collection('enrollmentRequests').doc()

  const enrollmentRequest: Omit<EnrollmentRequest, 'id'> = {
    familyId,
    token,
    deviceInfo,
    status: 'pending',
    createdAt: Timestamp.fromMillis(now),
    expiresAt: Timestamp.fromMillis(now + REQUEST_EXPIRY_MS),
  }

  await requestRef.set(enrollmentRequest)

  logger.info('Enrollment request created', { requestId: requestRef.id, familyId })

  return {
    success: true,
    requestId: requestRef.id,
    message: 'Enrollment request submitted. Waiting for parent approval.',
  }
})

/**
 * Get enrollment request status.
 * Called by extension to poll for approval status.
 *
 * AC4, AC5, AC6: Returns current status for extension to react to
 */
export const getEnrollmentRequestStatus = onRequest({ cors: true }, async (req, res) => {
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({ error: { code: 'method-not-allowed', message: 'Method not allowed' } })
    return
  }

  const { familyId, requestId } = req.query

  // Validate parameters
  if (!familyId || typeof familyId !== 'string' || !requestId || typeof requestId !== 'string') {
    res.status(400).json({
      error: { code: 'invalid-argument', message: 'familyId and requestId are required' },
    })
    return
  }

  const db = getFirestore()
  const requestRef = db
    .collection('families')
    .doc(familyId)
    .collection('enrollmentRequests')
    .doc(requestId)
  const requestDoc = await requestRef.get()

  if (!requestDoc.exists) {
    res.status(404).json({
      error: { code: 'not-found', message: 'Enrollment request not found' },
    })
    return
  }

  const data = requestDoc.data() as EnrollmentRequest

  // Convert Timestamps to milliseconds for JSON response
  const response: GetEnrollmentStatusResponse = {
    id: requestDoc.id,
    familyId: data.familyId,
    status: data.status,
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : data.createdAt.toMillis(),
    expiresAt: typeof data.expiresAt === 'number' ? data.expiresAt : data.expiresAt.toMillis(),
    approvedBy: data.approvedBy,
    approvedAt:
      data.approvedAt && typeof data.approvedAt !== 'number'
        ? data.approvedAt.toMillis()
        : data.approvedAt,
    rejectedBy: data.rejectedBy,
    rejectedAt:
      data.rejectedAt && typeof data.rejectedAt !== 'number'
        ? data.rejectedAt.toMillis()
        : data.rejectedAt,
  }

  res.status(200).json({ result: response })
})

/**
 * Approve an enrollment request from the dashboard.
 *
 * AC6: Updates request status and marks token as used
 */
export const approveEnrollment = onCall<
  z.infer<typeof approveEnrollmentSchema>,
  Promise<ApproveEnrollmentResponse>
>(async (request) => {
  // 1. Auth (FIRST)
  const user = verifyAuth(request.auth)

  // 2. Validation (SECOND)
  const parseResult = approveEnrollmentSchema.safeParse(request.data)
  if (!parseResult.success) {
    throw new HttpsError('invalid-argument', 'Invalid approval request')
  }
  const { familyId, requestId } = parseResult.data

  // 3. Permission - verify user is a parent of this family
  const db = getFirestore()
  const familyRef = db.collection('families').doc(familyId)
  const familyDoc = await familyRef.get()

  if (!familyDoc.exists) {
    throw new HttpsError('not-found', 'Family not found')
  }

  const familyData = familyDoc.data()
  const isParent = familyData?.parents?.includes(user.uid) || familyData?.createdBy === user.uid

  if (!isParent) {
    throw new HttpsError('permission-denied', 'Only family parents can approve enrollments')
  }

  // 4. Business logic - approve enrollment request
  const requestRef = familyRef.collection('enrollmentRequests').doc(requestId)
  const requestDoc = await requestRef.get()

  if (!requestDoc.exists) {
    throw new HttpsError('not-found', 'Enrollment request not found')
  }

  const requestData = requestDoc.data() as EnrollmentRequest

  if (requestData.status !== 'pending') {
    throw new HttpsError(
      'failed-precondition',
      `Request is no longer pending (status: ${requestData.status})`
    )
  }

  // Check if request has expired
  const expiresAtMs =
    typeof requestData.expiresAt === 'number'
      ? requestData.expiresAt
      : requestData.expiresAt.toMillis()
  if (Date.now() > expiresAtMs) {
    await requestRef.update({ status: 'expired' })
    throw new HttpsError('failed-precondition', 'Enrollment request has expired')
  }

  // Update request status to approved
  await requestRef.update({
    status: 'approved',
    approvedBy: user.uid,
    approvedAt: FieldValue.serverTimestamp(),
  })

  // Mark the enrollment token as used
  const tokensRef = familyRef.collection('enrollmentTokens')
  const tokenQuery = tokensRef.where('token', '==', requestData.token)
  const tokenSnapshot = await tokenQuery.get()

  if (!tokenSnapshot.empty) {
    await tokenSnapshot.docs[0].ref.update({ status: 'used' })
  }

  logger.info('Enrollment approved', { requestId, familyId, approvedBy: user.uid })

  return {
    success: true,
    message: 'Device enrollment approved',
  }
})

/**
 * Reject an enrollment request from the dashboard.
 *
 * AC5: Updates request status to rejected
 */
export const rejectEnrollment = onCall<
  z.infer<typeof rejectEnrollmentSchema>,
  Promise<RejectEnrollmentResponse>
>(async (request) => {
  // 1. Auth (FIRST)
  const user = verifyAuth(request.auth)

  // 2. Validation (SECOND)
  const parseResult = rejectEnrollmentSchema.safeParse(request.data)
  if (!parseResult.success) {
    throw new HttpsError('invalid-argument', 'Invalid rejection request')
  }
  const { familyId, requestId } = parseResult.data

  // 3. Permission - verify user is a parent of this family
  const db = getFirestore()
  const familyRef = db.collection('families').doc(familyId)
  const familyDoc = await familyRef.get()

  if (!familyDoc.exists) {
    throw new HttpsError('not-found', 'Family not found')
  }

  const familyData = familyDoc.data()
  const isParent = familyData?.parents?.includes(user.uid) || familyData?.createdBy === user.uid

  if (!isParent) {
    throw new HttpsError('permission-denied', 'Only family parents can reject enrollments')
  }

  // 4. Business logic - reject enrollment request
  const requestRef = familyRef.collection('enrollmentRequests').doc(requestId)
  const requestDoc = await requestRef.get()

  if (!requestDoc.exists) {
    throw new HttpsError('not-found', 'Enrollment request not found')
  }

  const requestData = requestDoc.data() as EnrollmentRequest

  if (requestData.status !== 'pending') {
    throw new HttpsError(
      'failed-precondition',
      `Request is no longer pending (status: ${requestData.status})`
    )
  }

  // Update request status to rejected
  await requestRef.update({
    status: 'rejected',
    rejectedBy: user.uid,
    rejectedAt: FieldValue.serverTimestamp(),
  })

  logger.info('Enrollment rejected', { requestId, familyId, rejectedBy: user.uid })

  return {
    success: true,
    message: 'Device enrollment rejected',
  }
})

/**
 * Register a device after enrollment approval.
 * Called by the extension after detecting approval status.
 * Story 12.4: Device Registration in Firestore
 * Story 13.1: TOTP Secret Generation at Enrollment
 *
 * AC1: Creates device document in /families/{familyId}/devices
 * AC2: Stores deviceId, type, enrolledAt, enrolledBy
 * AC3: Returns deviceId for extension to store
 * Story 13.1 AC1: Generates TOTP secret for offline unlock
 * Story 13.1 AC3: Stores TOTP secret in Firestore
 * Story 13.1 AC5: Returns TOTP secret in response (one-time)
 */
export const registerDevice = onRequest({ cors: true }, async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: { code: 'method-not-allowed', message: 'Method not allowed' } })
    return
  }

  // Validate input
  const parseResult = registerDeviceSchema.safeParse(req.body)
  if (!parseResult.success) {
    res.status(400).json({
      error: { code: 'invalid-argument', message: 'familyId and requestId are required' },
    })
    return
  }
  const { familyId, requestId } = parseResult.data

  const db = getFirestore()

  // Use transaction to prevent race conditions (idempotency)
  try {
    const result = await db.runTransaction(async (transaction) => {
      // Get the enrollment request to verify it's approved
      const requestRef = db
        .collection('families')
        .doc(familyId)
        .collection('enrollmentRequests')
        .doc(requestId)
      const requestDoc = await transaction.get(requestRef)

      if (!requestDoc.exists) {
        throw { status: 404, code: 'not-found', message: 'Enrollment request not found' }
      }

      const requestData = requestDoc.data() as EnrollmentRequest

      // Verify request is approved
      if (requestData.status !== 'approved') {
        throw {
          status: 400,
          code: 'failed-precondition',
          message: `Cannot register device - request status is ${requestData.status}`,
        }
      }

      // Check if device was already registered (recorded in request doc)
      if (requestData.registeredDeviceId) {
        // Device already registered - return existing deviceId
        // Note: totpSecret is NOT returned on subsequent calls (one-time only)
        return {
          deviceId: requestData.registeredDeviceId as string,
          alreadyRegistered: true,
          totpSecret: undefined, // Security: never return secret on idempotent calls
        }
      }

      // Generate unique device ID
      const deviceRef = db.collection('families').doc(familyId).collection('devices').doc()
      const deviceId = deviceRef.id
      const now = Timestamp.now()

      // Story 13.1: Generate TOTP secret for offline emergency unlock
      // Uses crypto.randomBytes for 256-bit entropy, encoded as Base32
      const totpSecret = generateTotpSecret()

      // Create device document with TOTP fields
      const device: Device = {
        deviceId,
        type: requestData.deviceInfo.type,
        enrolledAt: now,
        enrolledBy: requestData.approvedBy || '',
        childId: null, // Initially unassigned (Story 12.5 handles assignment)
        name: `${requestData.deviceInfo.type === 'chromebook' ? 'Chromebook' : 'Device'} ${deviceId.substring(0, 6)}`,
        lastSeen: now,
        status: 'active',
        metadata: {
          platform: requestData.deviceInfo.platform,
          userAgent: requestData.deviceInfo.userAgent,
          enrollmentRequestId: requestId,
        },
        // Story 13.1: TOTP fields for offline emergency unlock
        totpSecret, // Base32 encoded, 32 bytes (256-bit)
        totpCreatedAt: now,
        totpAlgorithm: 'SHA1', // RFC 6238 default
        totpDigits: 6, // Standard 6-digit codes
        totpPeriod: 30, // 30-second window
      }

      transaction.set(deviceRef, device)

      // Update enrollment request to record device registration
      transaction.update(requestRef, {
        registeredDeviceId: deviceId,
        registeredAt: FieldValue.serverTimestamp(),
      })

      // Return deviceId and totpSecret (one-time transmission)
      return { deviceId, alreadyRegistered: false, totpSecret }
    })

    // Story 13.1 AC5: Log registration without exposing secret
    // Note: totpSecret is intentionally NOT logged for security
    logger.info('Device registered', {
      deviceId: result.deviceId,
      familyId,
      requestId,
      alreadyRegistered: result.alreadyRegistered,
      hasTotpSecret: !!result.totpSecret, // Log presence, not value
    })

    res.status(200).json({
      result: {
        success: true,
        deviceId: result.deviceId,
        message: result.alreadyRegistered
          ? 'Device already registered'
          : 'Device registered successfully',
        // Story 13.1: Include TOTP secret only on first registration
        totpSecret: result.totpSecret,
      } as RegisterDeviceResponse,
    })
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string; message?: string }
    if (err.status) {
      res.status(err.status).json({ error: { code: err.code, message: err.message } })
    } else {
      logger.error('Device registration failed', { error, familyId, requestId })
      res.status(500).json({
        error: { code: 'internal', message: 'Device registration failed' },
      })
    }
  }
})

/**
 * Assign a device to a child (or unassign by passing null).
 * Story 12.5: Child Assignment to Device
 *
 * AC3: Updates device document with childId
 * AC4: Creates audit log entry for assignment
 * AC5: Supports reassignment (changing childId)
 */
export const assignDeviceToChild = onCall<
  z.infer<typeof assignDeviceToChildSchema>,
  Promise<AssignDeviceResponse>
>(async (request) => {
  // 1. Auth (FIRST)
  const user = verifyAuth(request.auth)

  // 2. Validation (SECOND)
  const parseResult = assignDeviceToChildSchema.safeParse(request.data)
  if (!parseResult.success) {
    throw new HttpsError('invalid-argument', 'Invalid assignment request')
  }
  const { familyId, deviceId, childId } = parseResult.data

  // 3. Permission - verify user is a parent of this family
  const db = getFirestore()
  const familyRef = db.collection('families').doc(familyId)
  const familyDoc = await familyRef.get()

  if (!familyDoc.exists) {
    throw new HttpsError('not-found', 'Family not found')
  }

  const familyData = familyDoc.data()
  const isParent = familyData?.parents?.includes(user.uid) || familyData?.createdBy === user.uid

  if (!isParent) {
    throw new HttpsError('permission-denied', 'Only family parents can assign devices to children')
  }

  // 4. Verify child belongs to same family (if assigning)
  if (childId) {
    const childRef = db.collection('children').doc(childId)
    const childDoc = await childRef.get()

    if (!childDoc.exists) {
      throw new HttpsError('not-found', 'Child not found')
    }

    const childData = childDoc.data()
    if (childData?.familyId !== familyId) {
      throw new HttpsError('permission-denied', 'Child does not belong to this family')
    }
  }

  // 5. Get device and verify it exists
  const deviceRef = familyRef.collection('devices').doc(deviceId)
  const deviceDoc = await deviceRef.get()

  if (!deviceDoc.exists) {
    throw new HttpsError('not-found', 'Device not found')
  }

  const deviceData = deviceDoc.data() as Device
  const previousChildId = deviceData.childId

  // Skip if assignment hasn't changed
  if (previousChildId === childId) {
    return {
      success: true,
      message: 'Device assignment unchanged',
    }
  }

  // 6. Update device with new childId
  await deviceRef.update({
    childId,
    assignedAt: childId ? FieldValue.serverTimestamp() : null,
    assignedBy: childId ? user.uid : null,
  })

  // 7. Create audit log entry (AC4)
  const auditRef = db.collection('auditLogs').doc()
  await auditRef.set({
    type: 'device_assignment',
    familyId,
    deviceId,
    childId,
    previousChildId,
    performedBy: user.uid,
    timestamp: FieldValue.serverTimestamp(),
  })

  logger.info('Device assignment updated', {
    deviceId,
    familyId,
    childId,
    previousChildId,
    assignedBy: user.uid,
  })

  return {
    success: true,
    message: childId ? 'Device assigned to child' : 'Device unassigned',
  }
})

// Story 12.6: Device removal schema
const removeDeviceSchema = z.object({
  familyId: z.string().min(1),
  deviceId: z.string().min(1),
})

interface VerifyDeviceEnrollmentResponse {
  valid: boolean
  status: 'active' | 'revoked' | 'not_found'
  familyId?: string
  deviceId?: string
  childId?: string | null
}

interface RemoveDeviceResponse {
  success: boolean
  message: string
}

/**
 * Verify a device's enrollment status.
 * Called by extension on startup to validate enrollment is still valid.
 * Story 12.6: Enrollment State Persistence
 *
 * AC4: Server-side verification of enrollment
 * AC5: Returns status for extension to handle invalid state
 */
export const verifyDeviceEnrollment = onRequest({ cors: true }, async (req, res) => {
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({ error: { code: 'method-not-allowed', message: 'Method not allowed' } })
    return
  }

  const { familyId, deviceId } = req.query

  // Validate parameters
  if (!familyId || typeof familyId !== 'string' || !deviceId || typeof deviceId !== 'string') {
    res.status(400).json({
      error: { code: 'invalid-argument', message: 'familyId and deviceId are required' },
    })
    return
  }

  const db = getFirestore()
  const deviceRef = db.collection('families').doc(familyId).collection('devices').doc(deviceId)
  const deviceDoc = await deviceRef.get()

  if (!deviceDoc.exists) {
    // Device not found - could have been removed
    res.status(200).json({
      result: {
        valid: false,
        status: 'not_found',
        familyId,
        deviceId,
      } as VerifyDeviceEnrollmentResponse,
    })
    return
  }

  const deviceData = deviceDoc.data() as Device

  // Check if device is unenrolled/revoked
  if (deviceData.status === 'unenrolled') {
    res.status(200).json({
      result: {
        valid: false,
        status: 'revoked',
        familyId,
        deviceId,
      } as VerifyDeviceEnrollmentResponse,
    })
    return
  }

  // Update lastSeen timestamp
  await deviceRef.update({
    lastSeen: FieldValue.serverTimestamp(),
  })

  // Device is valid
  res.status(200).json({
    result: {
      valid: true,
      status: 'active',
      familyId,
      deviceId,
      childId: deviceData.childId,
    } as VerifyDeviceEnrollmentResponse,
  })
})

/**
 * Remove a device from the family.
 * Called by parent from dashboard.
 * Story 12.6: Enrollment State Persistence
 *
 * AC6: Explicit device removal clears enrollment
 */
export const removeDevice = onCall<
  z.infer<typeof removeDeviceSchema>,
  Promise<RemoveDeviceResponse>
>(async (request) => {
  // 1. Auth (FIRST)
  const user = verifyAuth(request.auth)

  // 2. Validation (SECOND)
  const parseResult = removeDeviceSchema.safeParse(request.data)
  if (!parseResult.success) {
    throw new HttpsError('invalid-argument', 'Invalid removal request')
  }
  const { familyId, deviceId } = parseResult.data

  // 3. Permission - verify user is a parent of this family
  const db = getFirestore()
  const familyRef = db.collection('families').doc(familyId)
  const familyDoc = await familyRef.get()

  if (!familyDoc.exists) {
    throw new HttpsError('not-found', 'Family not found')
  }

  const familyData = familyDoc.data()
  const isParent = familyData?.parents?.includes(user.uid) || familyData?.createdBy === user.uid

  if (!isParent) {
    throw new HttpsError('permission-denied', 'Only family parents can remove devices')
  }

  // 4. Get device and verify it exists
  const deviceRef = familyRef.collection('devices').doc(deviceId)
  const deviceDoc = await deviceRef.get()

  if (!deviceDoc.exists) {
    throw new HttpsError('not-found', 'Device not found')
  }

  const deviceData = deviceDoc.data() as Device

  // 5. Mark device as unenrolled (soft delete to preserve audit trail)
  await deviceRef.update({
    status: 'unenrolled',
    unenrolledAt: FieldValue.serverTimestamp(),
    unenrolledBy: user.uid,
  })

  // 6. Create audit log entry
  const auditRef = db.collection('auditLogs').doc()
  await auditRef.set({
    type: 'device_removal',
    familyId,
    deviceId,
    childId: deviceData.childId,
    performedBy: user.uid,
    timestamp: FieldValue.serverTimestamp(),
  })

  logger.info('Device removed', {
    deviceId,
    familyId,
    removedBy: user.uid,
  })

  return {
    success: true,
    message: 'Device has been removed',
  }
})

/**
 * Scheduled function to expire old enrollment requests.
 * Runs every minute to ensure timely expiry.
 * Uses batched processing for scalability.
 *
 * AC4: Automatically expire requests after 10 minutes
 */
export const expireEnrollmentRequests = onSchedule('every 1 minutes', async () => {
  const db = getFirestore()
  const now = Timestamp.now()

  // Use collection group query for better scalability
  const expiredQuery = db
    .collectionGroup('enrollmentRequests')
    .where('status', '==', 'pending')
    .where('expiresAt', '<=', now)
    .limit(EXPIRY_BATCH_SIZE)

  const expiredSnapshot = await expiredQuery.get()

  if (expiredSnapshot.empty) {
    return
  }

  // Batch update expired requests
  const batch = db.batch()
  let expiredCount = 0

  for (const doc of expiredSnapshot.docs) {
    batch.update(doc.ref, { status: 'expired' })
    expiredCount++
  }

  await batch.commit()

  if (expiredCount > 0) {
    logger.info(`Expired ${expiredCount} enrollment request(s)`)
  }
})
