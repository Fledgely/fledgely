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

/** Request expiry time in milliseconds (10 minutes) */
const REQUEST_EXPIRY_MS = 10 * 60 * 1000

/** Batch size for expiry processing to avoid timeouts */
const EXPIRY_BATCH_SIZE = 100

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
}

interface AssignDeviceResponse {
  success: boolean
  message: string
}

/**
 * Device document structure
 * Stored in /families/{familyId}/devices/{deviceId}
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
 *
 * AC1: Creates device document in /families/{familyId}/devices
 * AC2: Stores deviceId, type, enrolledAt, enrolledBy
 * AC3: Returns deviceId for extension to store
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
        return {
          deviceId: requestData.registeredDeviceId as string,
          alreadyRegistered: true,
        }
      }

      // Generate unique device ID
      const deviceRef = db.collection('families').doc(familyId).collection('devices').doc()
      const deviceId = deviceRef.id
      const now = Timestamp.now()

      // Create device document
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
      }

      transaction.set(deviceRef, device)

      // Update enrollment request to record device registration
      transaction.update(requestRef, {
        registeredDeviceId: deviceId,
        registeredAt: FieldValue.serverTimestamp(),
      })

      return { deviceId, alreadyRegistered: false }
    })

    logger.info('Device registered', {
      deviceId: result.deviceId,
      familyId,
      requestId,
      alreadyRegistered: result.alreadyRegistered,
    })

    res.status(200).json({
      result: {
        success: true,
        deviceId: result.deviceId,
        message: result.alreadyRegistered
          ? 'Device already registered'
          : 'Device registered successfully',
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
