import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { createHash } from 'crypto'
import { z } from 'zod'
import { DeviceCommandType, DeviceCommandSource } from './unenrollDevice'

/**
 * Firestore batch operation limits
 */
const FIRESTORE_BATCH_LIMIT = 500
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const FIRESTORE_IN_QUERY_LIMIT = 10 // Reserved for future use

/**
 * Input schema for disabling location features
 */
export const disableLocationFeaturesInputSchema = z.object({
  /** Safety request ID that authorized this disable */
  requestId: z.string().min(1),
  /** Family ID containing the target users */
  familyId: z.string().min(1),
  /** User IDs to disable location features for */
  targetUserIds: z.array(z.string().min(1)).min(1),
  /** Reason for disable (for compliance audit) - minimum 20 chars */
  reason: z
    .string()
    .min(20, 'Reason must be at least 20 characters for compliance documentation')
    .max(5000),
})

/**
 * Location settings schema
 */
export interface LocationSettings {
  locationRulesEnabled: boolean         // FR139
  locationWorkModeEnabled: boolean      // FR145
  locationAlertsEnabled: boolean        // FR160
  // Safety override fields
  disabledBySafetyRequest?: boolean     // If true, locked from re-enable
  safetyDisabledAt?: Timestamp
  safetyDisabledBy?: string             // Admin agent ID
  safetyRequestId?: string              // Reference to safety request
}

// DeviceCommandType and DeviceCommandSource imported from unenrollDevice.ts
// to avoid duplication and ensure consistency

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
 * Helper to chunk array into smaller arrays
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize))
  }
  return chunks
}

/**
 * Delete pending location-related notifications for affected users
 * Commits deletions immediately to prevent race condition with delivery
 * Returns count of deleted notifications
 */
async function deletePendingLocationNotifications(
  db: FirebaseFirestore.Firestore,
  targetUserIds: string[],
  familyId: string
): Promise<number> {
  // Location-related notification types to delete
  // Note: Firestore 'in' query limited to 10 items, but we have 6 types so this is fine
  const locationNotificationTypes = [
    'location-arrived',
    'location-departed',
    'location-alert',
    'location-rule-triggered',
    'work-mode-location',
    'new-location-detected',
  ]

  let deletedCount = 0
  const docsToDelete: FirebaseFirestore.DocumentReference[] = []

  // Query pending notifications for affected users
  for (const userId of targetUserIds) {
    const notificationsQuery = db
      .collection('notificationQueue')
      .where('targetUserId', '==', userId)
      .where('familyId', '==', familyId)
      .where('status', '==', 'pending')
      .where('type', 'in', locationNotificationTypes)

    const pendingNotifications = await notificationsQuery.get()

    for (const notificationDoc of pendingNotifications.docs) {
      docsToDelete.push(notificationDoc.ref)
    }
  }

  // CRITICAL: Commit notification deletions immediately to prevent race condition
  // with notification delivery. Chunk to respect batch limits.
  if (docsToDelete.length > 0) {
    const chunks = chunkArray(docsToDelete, FIRESTORE_BATCH_LIMIT)
    for (const chunk of chunks) {
      const deleteBatch = db.batch()
      for (const docRef of chunk) {
        deleteBatch.delete(docRef)
      }
      await deleteBatch.commit()
      deletedCount += chunk.length
    }
  }

  return deletedCount
}

/**
 * Create device commands to disable location on all user devices
 * Returns count of commands created
 */
async function createLocationDisableCommands(
  db: FirebaseFirestore.Firestore,
  targetUserIds: string[],
  familyId: string,
  requestId: string,
  timestamp: Timestamp
): Promise<number> {
  const expiresAt = calculateCommandExpiration(timestamp)
  const commandsToCreate: { deviceId: string }[] = []

  for (const userId of targetUserIds) {
    // Find all devices for this user
    const devicesQuery = db
      .collection('devices')
      .where('childId', '==', userId)
      .where('familyId', '==', familyId)
      .where('status', '!=', 'unenrolled')

    const devices = await devicesQuery.get()

    for (const deviceDoc of devices.docs) {
      commandsToCreate.push({ deviceId: deviceDoc.id })
    }
  }

  // Chunk commands to respect batch limits
  let commandCount = 0
  if (commandsToCreate.length > 0) {
    const chunks = chunkArray(commandsToCreate, FIRESTORE_BATCH_LIMIT)
    for (const chunk of chunks) {
      const commandBatch = db.batch()
      for (const cmd of chunk) {
        const commandRef = db.collection('deviceCommands').doc()
        commandBatch.set(commandRef, {
          deviceId: cmd.deviceId,
          command: DeviceCommandType.DISABLE_LOCATION,
          issuedAt: timestamp,
          expiresAt,
          source: DeviceCommandSource.SAFETY_REQUEST,
          safetyRequestId: requestId,
          sealed: true,
        })
      }
      await commandBatch.commit()
      commandCount += chunk.length
    }
  }

  return commandCount
}

/**
 * Redact historical location data for affected users
 * Preserves timestamps but nullifies location details
 * Returns count of redacted entries
 */
async function redactLocationHistory(
  db: FirebaseFirestore.Firestore,
  targetUserIds: string[],
  familyId: string
): Promise<number> {
  const docsToRedact: FirebaseFirestore.DocumentReference[] = []

  for (const userId of targetUserIds) {
    // Query location history for this user
    // Note: Cannot combine '!=' with other inequality, so we filter sealed after
    const locationHistoryQuery = db
      .collection('families')
      .doc(familyId)
      .collection('locationHistory')
      .where('childId', '==', userId)

    const historyDocs = await locationHistoryQuery.get()

    for (const historyDoc of historyDocs.docs) {
      // Skip already sealed entries
      const data = historyDoc.data()
      if (data.sealed === true) {
        continue
      }
      docsToRedact.push(historyDoc.ref)
    }
  }

  // Chunk redactions to respect batch limits
  let redactedCount = 0
  if (docsToRedact.length > 0) {
    const chunks = chunkArray(docsToRedact, FIRESTORE_BATCH_LIMIT)
    for (const chunk of chunks) {
      const redactBatch = db.batch()
      for (const docRef of chunk) {
        // Redact location data while preserving timestamp for continuity
        redactBatch.update(docRef, {
          location: null,
          locationName: null,
          event: null,
          address: null,
          coordinates: null,
          sealed: true,
        })
      }
      await redactBatch.commit()
      redactedCount += chunk.length
    }
  }

  return redactedCount
}

/**
 * Callable Cloud Function: disableLocationFeatures
 *
 * CRITICAL: This function disables all location-revealing features.
 * This is a LIFE-SAFETY feature used to protect abuse victims.
 *
 * Security invariants:
 * 1. Caller MUST have safety-team role
 * 2. Safety request MUST exist and be verified
 * 3. Target users MUST belong to specified family
 * 4. Operation is logged to SEALED admin audit only
 * 5. NO notifications are sent to ANY party
 * 6. NO family audit trail entry is created
 * 7. Historical location data is redacted without visible gaps
 * 8. Pending location notifications are deleted before delivery
 */
export const disableLocationFeatures = onCall(
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
    const parseResult = disableLocationFeaturesInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError(
        'invalid-argument',
        'Invalid input',
        parseResult.error.flatten()
      )
    }

    const { requestId, familyId, targetUserIds, reason } = parseResult.data

    try {
      // Step 1: Verify safety request exists and is properly verified
      const safetyRequestRef = db.collection('safetyRequests').doc(requestId)
      const safetyRequestDoc = await safetyRequestRef.get()

      if (!safetyRequestDoc.exists) {
        throw new HttpsError('not-found', 'Safety request not found')
      }

      const safetyRequestData = safetyRequestDoc.data()!

      // Verify request is in a state that allows this operation
      if (safetyRequestData.status === 'pending') {
        throw new HttpsError(
          'failed-precondition',
          'Safety request must be reviewed before location disable can proceed'
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
          'Identity verification required before location disable'
        )
      }

      // CRITICAL: Verify safety request is for the specified family
      // Prevents cross-family attacks using mismatched requestId/familyId
      if (safetyRequestData.familyId && safetyRequestData.familyId !== familyId) {
        throw new HttpsError(
          'invalid-argument',
          'Safety request does not match the specified family'
        )
      }

      // Step 2: Verify family exists
      const familyRef = db.collection('families').doc(familyId)
      const familyDoc = await familyRef.get()

      if (!familyDoc.exists) {
        throw new HttpsError('not-found', 'Family not found')
      }

      // Step 3: Verify all target users belong to the family
      for (const userId of targetUserIds) {
        const userRef = db.collection('users').doc(userId)
        const userDoc = await userRef.get()

        if (!userDoc.exists) {
          throw new HttpsError('not-found', `User ${userId} not found`)
        }

        const userData = userDoc.data()!

        // Check if user is member of the family (as child or guardian)
        const isFamilyMember =
          userData.familyId === familyId ||
          (userData.familyIds && userData.familyIds.includes(familyId))

        if (!isFamilyMember) {
          throw new HttpsError(
            'invalid-argument',
            `User ${userId} does not belong to specified family`
          )
        }
      }

      // Step 4: Execute the location feature disable
      // Order of operations is CRITICAL for safety:
      // 1. Delete pending notifications FIRST (prevent delivery race)
      // 2. Create device commands (stop future collection)
      // 3. Update location settings (disable features)
      // 4. Redact historical data (clean up past data)
      const disableTimestamp = Timestamp.now()

      // 4a: Delete pending location notifications FIRST
      // CRITICAL: Must happen before any other operation to prevent delivery race
      const deletedNotificationCount = await deletePendingLocationNotifications(
        db,
        targetUserIds,
        familyId
      )

      // 4b: Create device commands for location disable
      const deviceCommandCount = await createLocationDisableCommands(
        db,
        targetUserIds,
        familyId,
        requestId,
        disableTimestamp
      )

      // 4c: Update location settings for each target user
      // Chunk to respect batch limits
      const settingsChunks = chunkArray(targetUserIds, FIRESTORE_BATCH_LIMIT)
      for (const chunk of settingsChunks) {
        const settingsBatch = db.batch()
        for (const userId of chunk) {
          const locationSettingsRef = db
            .collection('users')
            .doc(userId)
            .collection('settings')
            .doc('location')

          settingsBatch.set(
            locationSettingsRef,
            {
              locationRulesEnabled: false,        // FR139 disabled
              locationWorkModeEnabled: false,     // FR145 disabled
              locationAlertsEnabled: false,       // FR160 disabled
              disabledBySafetyRequest: true,      // Locked from re-enable
              safetyDisabledAt: disableTimestamp,
              safetyDisabledBy: callerUid,
              safetyRequestId: requestId,
            },
            { merge: true }
          )
        }
        await settingsBatch.commit()
      }

      // 4d: Redact historical location data
      const redactedHistoryCount = await redactLocationHistory(
        db,
        targetUserIds,
        familyId
      )

      // Step 5: Log to SEALED admin audit
      // CRITICAL: This entry is sealed for compliance-only access
      const auditData = {
        action: 'location-features-disable',
        resourceType: 'location-settings',
        resourceId: familyId,
        performedBy: callerUid,
        affectedUserIds: targetUserIds,
        familyId: familyId,
        safetyRequestId: requestId,
        reason: reason,
        deletedNotificationCount,
        deviceCommandCount,
        redactedHistoryCount,
        timestamp: FieldValue.serverTimestamp(),
        sealed: true, // CRITICAL: Marks as compliance-only
      }

      // Generate integrity hash before adding server timestamp
      const hashData = {
        ...auditData,
        timestamp: disableTimestamp.toDate().toISOString(),
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
        disabled: true,
        familyId,
        affectedUserIds: targetUserIds,
        disabledAt: disableTimestamp.toDate().toISOString(),
        deletedNotificationCount,
        deviceCommandCount,
        redactedHistoryCount,
        // Do NOT include reason in response for security
      }
    } catch (error) {
      // CRITICAL: Do not log sensitive details to standard logs
      const errorId = createHash('sha256')
        .update(`${Date.now()}-${callerUid}`)
        .digest('hex')
        .slice(0, 16)

      console.error('Location features disable failed', {
        errorId,
        errorType: error instanceof HttpsError ? error.code : 'internal',
        // Do NOT log: requestId, familyId, targetUserIds, reason
      })

      if (error instanceof HttpsError) {
        throw error
      }

      // Log full error details to sealed audit (compliance-only access)
      await db.collection('adminAuditLog').add({
        action: 'location_features_disable_error',
        resourceType: 'location-settings',
        resourceId: familyId,
        performedBy: callerUid,
        safetyRequestId: requestId,
        errorId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: FieldValue.serverTimestamp(),
        sealed: true,
      })

      throw new HttpsError('internal', `Failed to disable location features. Error ID: ${errorId}`)
    }
  }
)
