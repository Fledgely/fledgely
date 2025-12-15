import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { createHash } from 'crypto'
import { z } from 'zod'

/**
 * Input schema for unenrolling a single device
 */
export const unenrollDeviceInputSchema = z.object({
  /** Safety request ID that authorized this unenrollment */
  requestId: z.string().min(1),
  /** Device ID to unenroll */
  deviceId: z.string().min(1),
  /** Family ID the device belongs to */
  familyId: z.string().min(1),
  /** Child ID the device is assigned to */
  childId: z.string().min(1),
  /** Reason for unenrollment (for compliance audit) - minimum 20 chars */
  reason: z
    .string()
    .min(20, 'Reason must be at least 20 characters for compliance documentation')
    .max(5000),
})

/**
 * Input schema for bulk unenrollment
 */
export const unenrollDevicesInputSchema = z.object({
  /** Safety request ID that authorized this unenrollment */
  requestId: z.string().min(1),
  /** Array of devices to unenroll */
  devices: z.array(
    z.object({
      deviceId: z.string().min(1),
      familyId: z.string().min(1),
      childId: z.string().min(1),
    })
  ).min(1).max(50), // Limit to 50 devices per batch
  /** Reason for unenrollment (for compliance audit) - minimum 20 chars */
  reason: z
    .string()
    .min(20, 'Reason must be at least 20 characters for compliance documentation')
    .max(5000),
})

/**
 * Device status enum
 */
export const DeviceStatus = {
  ACTIVE: 'active',
  OFFLINE: 'offline',
  UNENROLLED: 'unenrolled',
} as const

/**
 * Device command types
 */
export const DeviceCommandType = {
  UNENROLL: 'unenroll',
  SYNC_CONFIG: 'sync-config',
  CLEAR_CACHE: 'clear-cache',
} as const

/**
 * Device command source
 */
export const DeviceCommandSource = {
  SAFETY_REQUEST: 'safety-request',
  ADMIN: 'admin',
  SYSTEM: 'system',
} as const

/**
 * Device command schema for Zod validation
 */
export const deviceCommandSchema = z.object({
  deviceId: z.string().min(1),
  command: z.enum(['unenroll', 'sync-config', 'clear-cache']),
  issuedAt: z.any(), // Timestamp
  executedAt: z.any().optional(), // Timestamp
  expiresAt: z.any(), // Timestamp - TTL: issuedAt + 7 days
  source: z.enum(['safety-request', 'admin', 'system']),
  safetyRequestId: z.string().optional(),
  sealed: z.boolean(),
})

/**
 * Generate an integrity hash for audit entry
 * Used for tamper detection on sealed entries
 */
function generateIntegrityHash(data: Record<string, unknown>): string {
  const sortedJson = JSON.stringify(data, Object.keys(data).sort())
  return createHash('sha256').update(sortedJson).digest('hex')
}

/**
 * Calculate TTL expiration date (7 days from now)
 */
function calculateCommandExpiration(issuedAt: Timestamp): Timestamp {
  const expirationDate = new Date(issuedAt.toDate().getTime() + 7 * 24 * 60 * 60 * 1000)
  return Timestamp.fromDate(expirationDate)
}

/**
 * Callable Cloud Function: unenrollDevice
 *
 * CRITICAL: This function remotely unenrolls a device from monitoring.
 * This is a LIFE-SAFETY feature used to protect abuse victims.
 *
 * Security invariants:
 * 1. Caller MUST have safety-team role
 * 2. Safety request MUST exist and be verified
 * 3. Device MUST belong to specified family/child
 * 4. Unenrollment is logged to SEALED admin audit only
 * 5. NO notifications are sent to ANY party
 * 6. NO family audit trail entry is created
 * 7. Device command is queued for offline devices
 */
export const unenrollDevice = onCall(
  {
    enforceAppCheck: true,
  },
  async (request) => {
    const db = getFirestore()

    // Require authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    const callerUid = request.auth.uid
    const callerClaims = request.auth.token

    // CRITICAL: Verify caller has safety-team role
    // Admin role alone is NOT sufficient for this life-safety operation
    if (!callerClaims.isSafetyTeam) {
      throw new HttpsError(
        'permission-denied',
        'Safety team access required. This operation requires explicit safety-team role.'
      )
    }

    // Validate input
    const parseResult = unenrollDeviceInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError(
        'invalid-argument',
        'Invalid input',
        parseResult.error.flatten()
      )
    }

    const { requestId, deviceId, familyId, childId, reason } = parseResult.data

    try {
      // Step 1: Verify safety request exists and is properly verified
      const safetyRequestRef = db.collection('safetyRequests').doc(requestId)
      const safetyRequestDoc = await safetyRequestRef.get()

      if (!safetyRequestDoc.exists) {
        throw new HttpsError('not-found', 'Safety request not found')
      }

      const safetyRequestData = safetyRequestDoc.data()!

      // Verify request is in a state that allows unenrollment (resolved or in-progress)
      if (safetyRequestData.status === 'pending') {
        throw new HttpsError(
          'failed-precondition',
          'Safety request must be reviewed before unenrollment can proceed'
        )
      }

      // Check if verification checklist has minimum requirements
      const verification = safetyRequestData.verificationChecklist || {}
      const hasMinimumVerification =
        verification.accountOwnershipVerified === true ||
        verification.idMatched === true

      if (!hasMinimumVerification) {
        throw new HttpsError(
          'failed-precondition',
          'Identity verification required before unenrollment'
        )
      }

      // Step 2: Check if device exists and belongs to the family/child
      const deviceRef = db.collection('devices').doc(deviceId)
      const deviceDoc = await deviceRef.get()

      if (!deviceDoc.exists) {
        throw new HttpsError('not-found', 'Device not found')
      }

      const deviceData = deviceDoc.data()!

      // Verify device belongs to specified family
      if (deviceData.familyId !== familyId) {
        throw new HttpsError(
          'invalid-argument',
          'Device does not belong to specified family'
        )
      }

      // Verify device belongs to specified child
      if (deviceData.childId !== childId) {
        throw new HttpsError(
          'invalid-argument',
          'Device does not belong to specified child'
        )
      }

      // Check if already unenrolled
      if (deviceData.status === DeviceStatus.UNENROLLED) {
        throw new HttpsError(
          'failed-precondition',
          'Device has already been unenrolled'
        )
      }

      // Step 3: Execute the unenrollment
      const unenrollmentTimestamp = Timestamp.now()
      const expiresAt = calculateCommandExpiration(unenrollmentTimestamp)

      // Update device status
      await deviceRef.update({
        status: DeviceStatus.UNENROLLED,
        unenrolledAt: unenrollmentTimestamp,
        unenrolledBy: callerUid,
        unenrollmentSource: DeviceCommandSource.SAFETY_REQUEST,
        // CRITICAL: Do NOT store reason in device doc - goes to sealed audit only
      })

      // Step 4: Create unenrollment command for device to pick up
      // This enables offline devices to receive the command when they reconnect
      const commandData = {
        deviceId,
        command: DeviceCommandType.UNENROLL,
        issuedAt: unenrollmentTimestamp,
        expiresAt,
        source: DeviceCommandSource.SAFETY_REQUEST,
        safetyRequestId: requestId,
        sealed: true, // Command details not visible in standard queries
      }

      await db.collection('deviceCommands').add(commandData)

      // Step 5: Log to SEALED admin audit
      // CRITICAL: This entry is sealed for compliance-only access
      const auditData = {
        action: 'device-unenrollment',
        resourceType: 'device',
        resourceId: deviceId,
        performedBy: callerUid,
        affectedChildId: childId,
        familyId: familyId,
        safetyRequestId: requestId,
        reason: reason,
        deviceType: deviceData.platform || 'unknown',
        timestamp: FieldValue.serverTimestamp(),
        sealed: true, // CRITICAL: Marks as compliance-only
      }

      // Generate integrity hash before adding server timestamp
      const hashData = {
        ...auditData,
        timestamp: unenrollmentTimestamp.toDate().toISOString(),
      }
      const integrityHash = generateIntegrityHash(hashData)

      await db.collection('adminAuditLog').add({
        ...auditData,
        integrityHash,
      })

      // CRITICAL: Do NOT trigger any notifications
      // CRITICAL: Do NOT log to family audit trail
      // CRITICAL: Do NOT send emails

      return {
        success: true,
        unenrolled: true,
        deviceId,
        familyId,
        childId,
        unenrolledAt: unenrollmentTimestamp.toDate().toISOString(),
        // Do NOT include reason in response for security
      }
    } catch (error) {
      // CRITICAL: Do not log sensitive details to standard logs
      const errorId = createHash('sha256')
        .update(`${Date.now()}-${callerUid}`)
        .digest('hex')
        .slice(0, 16)

      console.error('Device unenrollment failed', {
        errorId,
        errorType: error instanceof HttpsError ? error.code : 'internal',
        // Do NOT log: requestId, deviceId, familyId, childId, reason
      })

      if (error instanceof HttpsError) {
        throw error
      }

      // Log full error details to sealed audit (compliance-only access)
      await db.collection('adminAuditLog').add({
        action: 'device_unenrollment_error',
        resourceType: 'device',
        resourceId: deviceId,
        performedBy: callerUid,
        safetyRequestId: requestId,
        errorId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: FieldValue.serverTimestamp(),
        sealed: true,
      })

      throw new HttpsError('internal', `Failed to unenroll device. Error ID: ${errorId}`)
    }
  }
)

/**
 * Callable Cloud Function: unenrollDevices (Bulk)
 *
 * CRITICAL: This function remotely unenrolls multiple devices from monitoring.
 * This is a LIFE-SAFETY feature used to protect abuse victims.
 *
 * Uses Firestore batch writes for atomic operation.
 */
export const unenrollDevices = onCall(
  {
    enforceAppCheck: true,
  },
  async (request) => {
    const db = getFirestore()

    // Require authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    const callerUid = request.auth.uid
    const callerClaims = request.auth.token

    // CRITICAL: Verify caller has safety-team role
    if (!callerClaims.isSafetyTeam) {
      throw new HttpsError(
        'permission-denied',
        'Safety team access required. This operation requires explicit safety-team role.'
      )
    }

    // Validate input
    const parseResult = unenrollDevicesInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError(
        'invalid-argument',
        'Invalid input',
        parseResult.error.flatten()
      )
    }

    const { requestId, devices, reason } = parseResult.data

    try {
      // Step 1: Verify safety request exists and is properly verified
      const safetyRequestRef = db.collection('safetyRequests').doc(requestId)
      const safetyRequestDoc = await safetyRequestRef.get()

      if (!safetyRequestDoc.exists) {
        throw new HttpsError('not-found', 'Safety request not found')
      }

      const safetyRequestData = safetyRequestDoc.data()!

      if (safetyRequestData.status === 'pending') {
        throw new HttpsError(
          'failed-precondition',
          'Safety request must be reviewed before unenrollment can proceed'
        )
      }

      const verification = safetyRequestData.verificationChecklist || {}
      const hasMinimumVerification =
        verification.accountOwnershipVerified === true ||
        verification.idMatched === true

      if (!hasMinimumVerification) {
        throw new HttpsError(
          'failed-precondition',
          'Identity verification required before unenrollment'
        )
      }

      // Step 2: Process each device
      const unenrollmentTimestamp = Timestamp.now()
      const expiresAt = calculateCommandExpiration(unenrollmentTimestamp)
      const results: Array<{
        deviceId: string
        success: boolean
        error?: string
      }> = []

      // Use batch for atomic operations
      const batch = db.batch()
      const deviceInfos: Array<{ deviceId: string; platform: string; childId: string; familyId: string }> = []

      for (const device of devices) {
        const { deviceId, familyId, childId } = device

        try {
          const deviceRef = db.collection('devices').doc(deviceId)
          const deviceDoc = await deviceRef.get()

          if (!deviceDoc.exists) {
            results.push({ deviceId, success: false, error: 'Device not found' })
            continue
          }

          const deviceData = deviceDoc.data()!

          if (deviceData.familyId !== familyId) {
            results.push({ deviceId, success: false, error: 'Device does not belong to specified family' })
            continue
          }

          if (deviceData.childId !== childId) {
            results.push({ deviceId, success: false, error: 'Device does not belong to specified child' })
            continue
          }

          if (deviceData.status === DeviceStatus.UNENROLLED) {
            results.push({ deviceId, success: false, error: 'Device already unenrolled' })
            continue
          }

          // Add to batch
          batch.update(deviceRef, {
            status: DeviceStatus.UNENROLLED,
            unenrolledAt: unenrollmentTimestamp,
            unenrolledBy: callerUid,
            unenrollmentSource: DeviceCommandSource.SAFETY_REQUEST,
          })

          // Create command
          const commandRef = db.collection('deviceCommands').doc()
          batch.set(commandRef, {
            deviceId,
            command: DeviceCommandType.UNENROLL,
            issuedAt: unenrollmentTimestamp,
            expiresAt,
            source: DeviceCommandSource.SAFETY_REQUEST,
            safetyRequestId: requestId,
            sealed: true,
          })

          deviceInfos.push({
            deviceId,
            platform: deviceData.platform || 'unknown',
            childId,
            familyId,
          })
          results.push({ deviceId, success: true })
        } catch (err) {
          results.push({
            deviceId,
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          })
        }
      }

      // Commit batch
      if (deviceInfos.length > 0) {
        await batch.commit()
      }

      // Step 3: Log single sealed audit entry for bulk operation
      const successfulDevices = deviceInfos.map((d) => d.deviceId)
      const auditData = {
        action: 'device-unenrollment-bulk',
        resourceType: 'device',
        resourceId: successfulDevices.join(','),
        performedBy: callerUid,
        deviceCount: successfulDevices.length,
        deviceIds: successfulDevices,
        familyIds: [...new Set(deviceInfos.map((d) => d.familyId))],
        childIds: [...new Set(deviceInfos.map((d) => d.childId))],
        safetyRequestId: requestId,
        reason: reason,
        timestamp: FieldValue.serverTimestamp(),
        sealed: true,
      }

      const hashData = {
        ...auditData,
        timestamp: unenrollmentTimestamp.toDate().toISOString(),
      }
      const integrityHash = generateIntegrityHash(hashData)

      await db.collection('adminAuditLog').add({
        ...auditData,
        integrityHash,
      })

      // CRITICAL: Do NOT trigger any notifications
      // CRITICAL: Do NOT log to family audit trail

      return {
        success: successfulDevices.length > 0,
        totalRequested: devices.length,
        totalUnenrolled: successfulDevices.length,
        results,
        unenrolledAt: unenrollmentTimestamp.toDate().toISOString(),
      }
    } catch (error) {
      const errorId = createHash('sha256')
        .update(`${Date.now()}-${callerUid}`)
        .digest('hex')
        .slice(0, 16)

      console.error('Bulk device unenrollment failed', {
        errorId,
        errorType: error instanceof HttpsError ? error.code : 'internal',
      })

      if (error instanceof HttpsError) {
        throw error
      }

      await db.collection('adminAuditLog').add({
        action: 'device_unenrollment_bulk_error',
        resourceType: 'device',
        performedBy: callerUid,
        safetyRequestId: requestId,
        errorId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: FieldValue.serverTimestamp(),
        sealed: true,
      })

      throw new HttpsError('internal', `Failed to unenroll devices. Error ID: ${errorId}`)
    }
  }
)
