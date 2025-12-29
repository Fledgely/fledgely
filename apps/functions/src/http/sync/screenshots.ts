/**
 * Screenshot Upload HTTP Endpoint
 * Story 18.1: Firebase Storage Upload Endpoint
 * Story 18.2: Screenshot Metadata in Firestore
 * Story 18.3: Configurable Retention Policy
 *
 * Handles screenshot uploads from Chrome extension to Firebase Storage
 * and creates Firestore metadata documents for efficient querying.
 *
 * Follows Cloud Functions Template pattern:
 * 1. Auth (FIRST) - validate device credentials
 * 2. Validation (SECOND) - validate request body
 * 3. Permission (THIRD) - verify device is registered and active
 * 4. Business logic (LAST) - upload to Firebase Storage + create Firestore metadata
 *
 * Note: Uses device-based authentication since Chrome extensions
 * don't have Firebase Auth SDK. Devices are authenticated via
 * deviceId + familyId lookup in Firestore.
 */

import { onRequest } from 'firebase-functions/v2/https'
import { getStorage } from 'firebase-admin/storage'
import { getFirestore } from 'firebase-admin/firestore'
import { z } from 'zod'
import * as logger from 'firebase-functions/logger'
import {
  generateScreenshotId,
  calculateRetentionExpiry,
  DEFAULT_RETENTION_DAYS,
  RETENTION_DAYS_OPTIONS,
  type RetentionDays,
} from '@fledgely/shared'
import {
  checkQuotaBeforeUpload,
  updateFamilyStorageUsage,
  createStorageWarningAlert,
} from '../../lib/storage'

/**
 * Maximum file size in bytes (5MB)
 * AC2: Validate file size (<5MB)
 */
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

/**
 * Server-side rate limiting configuration
 * Supplements client-side rate limiting (10/min) with server enforcement
 */
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const MAX_UPLOADS_PER_DEVICE_PER_MINUTE = 15 // Slightly higher than client to allow for retries

/**
 * Request body validation schema
 * Matches UploadPayload from extension
 * Exported for testing
 *
 * Story 18.3: Added optional retentionDays parameter
 */
export const uploadRequestSchema = z.object({
  dataUrl: z.string().min(1, 'dataUrl is required'),
  timestamp: z.number().positive('timestamp must be positive'),
  url: z.string().min(1, 'url is required'),
  title: z.string().min(1, 'title is required'),
  deviceId: z.string().min(1, 'deviceId is required'),
  familyId: z.string().min(1, 'familyId is required'),
  childId: z.string().min(1, 'childId is required'),
  queuedAt: z.number().positive('queuedAt must be positive'),
  /**
   * Story 18.3: Optional retention period in days.
   * Must be one of: 7, 30, 90. Defaults to 30 if not provided.
   */
  retentionDays: z
    .number()
    .refine((val): val is RetentionDays => RETENTION_DAYS_OPTIONS.includes(val as RetentionDays), {
      message: 'retentionDays must be 7, 30, or 90',
    })
    .optional(),
})

type UploadRequest = z.infer<typeof uploadRequestSchema>

/**
 * Response structure for upload endpoint
 * Story 18.2: Added screenshotId for Firestore document reference
 */
interface UploadResponse {
  success: boolean
  storagePath?: string
  screenshotId?: string
  error?: string
}

/**
 * Convert base64 data URL to Buffer
 * Handles data:image/jpeg;base64,... format
 * Exported for testing
 */
export function dataUrlToBuffer(dataUrl: string): Buffer {
  // Remove the data URL prefix
  const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '')
  return Buffer.from(base64Data, 'base64')
}

/**
 * Generate storage path following convention:
 * screenshots/{childId}/{YYYY-MM-DD}/{timestamp}.jpg
 * Exported for testing
 */
export function generateStoragePath(childId: string, timestamp: number): string {
  const date = new Date(timestamp)
  const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD
  return `screenshots/${childId}/${dateStr}/${timestamp}.jpg`
}

/**
 * Screenshot upload HTTP endpoint
 * AC1: Store screenshot in Firebase Storage bucket
 * AC2: Validate device credentials, childId ownership, file size
 * AC4: Store metadata with upload
 * AC5: Return success with storage reference
 */
export const uploadScreenshot = onRequest(
  {
    cors: true,
    maxInstances: 50,
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  async (req, res) => {
    // Only allow POST requests
    if (req.method !== 'POST') {
      res.status(405).json({
        success: false,
        error: 'Method not allowed',
      } as UploadResponse)
      return
    }

    // 2. Validation (SECOND) - Validate request body
    const parseResult = uploadRequestSchema.safeParse(req.body)
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map((e) => e.message).join(', ')
      res.status(400).json({
        success: false,
        error: `Invalid request: ${errors}`,
      } as UploadResponse)
      return
    }

    const uploadData: UploadRequest = parseResult.data

    // Validate file size from base64 data
    // Base64 encoding increases size by ~33%, so decoded size is ~75% of encoded
    const estimatedSize = Math.ceil((uploadData.dataUrl.length * 3) / 4)
    if (estimatedSize > MAX_FILE_SIZE_BYTES) {
      res.status(400).json({
        success: false,
        error: `File size exceeds maximum of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`,
      } as UploadResponse)
      return
    }

    // Validate data URL format
    if (!uploadData.dataUrl.startsWith('data:image/jpeg;base64,')) {
      res.status(400).json({
        success: false,
        error: 'Invalid image format. Expected JPEG data URL.',
      } as UploadResponse)
      return
    }

    // 1. Auth (FIRST) - Validate device credentials
    // Device authentication: verify deviceId is registered in the family
    const db = getFirestore()
    const familyRef = db.collection('families').doc(uploadData.familyId)
    const familyDoc = await familyRef.get()

    if (!familyDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'Family not found',
      } as UploadResponse)
      return
    }

    // Look up device by deviceId in the family's devices collection
    const deviceRef = familyRef.collection('devices').doc(uploadData.deviceId)
    const deviceDoc = await deviceRef.get()

    if (!deviceDoc.exists) {
      res.status(401).json({
        success: false,
        error: 'Device not registered',
      } as UploadResponse)
      return
    }

    const deviceData = deviceDoc.data()

    // Verify device is active
    if (deviceData?.status !== 'active') {
      res.status(401).json({
        success: false,
        error: 'Device is not active',
      } as UploadResponse)
      return
    }

    // Server-side rate limiting per device
    const now = Date.now()
    const rateLimitRef = deviceRef.collection('rateLimits').doc('uploads')
    const rateLimitDoc = await rateLimitRef.get()

    if (rateLimitDoc.exists) {
      const rateLimitData = rateLimitDoc.data()
      const windowStart = rateLimitData?.windowStart || 0
      const count = rateLimitData?.count || 0

      // Check if we're still in the same rate limit window
      if (now - windowStart < RATE_LIMIT_WINDOW_MS) {
        if (count >= MAX_UPLOADS_PER_DEVICE_PER_MINUTE) {
          res.status(429).json({
            success: false,
            error: 'Rate limit exceeded. Please wait before uploading more screenshots.',
          } as UploadResponse)
          return
        }
        // Increment count within window
        await rateLimitRef.update({ count: count + 1 })
      } else {
        // Start new window
        await rateLimitRef.set({ windowStart: now, count: 1 })
      }
    } else {
      // First request - create rate limit document
      await rateLimitRef.set({ windowStart: now, count: 1 })
    }

    // 3. Permission (THIRD) - Verify childId ownership
    // The device should be assigned to the child or the child should belong to the family
    const childRef = db.collection('children').doc(uploadData.childId)
    const childDoc = await childRef.get()

    if (!childDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'Child not found',
      } as UploadResponse)
      return
    }

    const childData = childDoc.data()

    // Verify child belongs to the same family
    if (childData?.familyId !== uploadData.familyId) {
      res.status(403).json({
        success: false,
        error: 'Child does not belong to this family',
      } as UploadResponse)
      return
    }

    // Verify device is assigned to this child (if device has childId set)
    if (deviceData?.childId && deviceData.childId !== uploadData.childId) {
      res.status(403).json({
        success: false,
        error: 'Device is not assigned to this child',
      } as UploadResponse)
      return
    }

    // 4. Business logic (LAST) - Upload to Firebase Storage + create Firestore metadata
    // Story 18.2: Two-phase commit - Storage upload then Firestore metadata
    // If Firestore fails, rollback Storage upload

    const storage = getStorage()
    const bucket = storage.bucket()

    // Convert data URL to buffer
    const imageBuffer = dataUrlToBuffer(uploadData.dataUrl)

    // Story 18.8: Check storage quota before upload
    const quotaCheck = await checkQuotaBeforeUpload(uploadData.familyId, imageBuffer.length)
    if (!quotaCheck.allowed) {
      logger.warn('Storage quota exceeded', {
        familyId: uploadData.familyId,
        usageBytes: quotaCheck.usageBytes,
        quotaBytes: quotaCheck.quotaBytes,
        attemptedUploadBytes: imageBuffer.length,
      })
      res.status(507).json({
        success: false,
        error: 'Storage quota exceeded. Please delete old screenshots or upgrade your plan.',
      } as UploadResponse)
      return
    }

    // Generate storage path and screenshot ID
    const storagePath = generateStoragePath(uploadData.childId, uploadData.timestamp)
    const screenshotId = generateScreenshotId(uploadData.timestamp)

    // Create file reference
    const file = bucket.file(storagePath)

    // Phase 1: Upload to Firebase Storage
    try {
      // Upload with metadata
      // Story 18.1 AC4: Store metadata with upload
      await file.save(imageBuffer, {
        contentType: 'image/jpeg',
        metadata: {
          metadata: {
            deviceId: uploadData.deviceId,
            timestamp: new Date(uploadData.timestamp).toISOString(),
            url: uploadData.url,
            title: uploadData.title,
            childId: uploadData.childId,
            uploadedAt: new Date().toISOString(),
            queuedAt: new Date(uploadData.queuedAt).toISOString(),
          },
        },
      })
    } catch (storageError) {
      logger.error('Screenshot storage upload failed', {
        error: storageError,
        childId: uploadData.childId,
        deviceId: uploadData.deviceId,
      })

      res.status(500).json({
        success: false,
        error: 'Failed to upload screenshot to storage',
      } as UploadResponse)
      return
    }

    // Phase 2: Create Firestore metadata document
    // Story 18.2 AC1, AC2, AC4: Create metadata with atomic rollback
    // Story 18.3: Support configurable retention period
    const uploadedAt = Date.now()
    const retentionDays = uploadData.retentionDays ?? DEFAULT_RETENTION_DAYS
    const retentionExpiresAt = calculateRetentionExpiry(uploadedAt, retentionDays)

    const screenshotRef = db
      .collection('children')
      .doc(uploadData.childId)
      .collection('screenshots')
      .doc(screenshotId)

    try {
      await screenshotRef.set({
        // Identity
        screenshotId,
        childId: uploadData.childId,
        familyId: uploadData.familyId,
        deviceId: uploadData.deviceId,

        // Content reference (NOT actual image - Story 18.2 AC2)
        storagePath,
        sizeBytes: imageBuffer.length,

        // Capture context
        timestamp: uploadData.timestamp,
        url: uploadData.url,
        title: uploadData.title,

        // Lifecycle timestamps
        uploadedAt,
        queuedAt: uploadData.queuedAt,
        retentionExpiresAt, // Story 18.2 AC5: Default 30 days, Story 18.3: Configurable
        retentionDays, // Story 18.3: Store the retention period used
      })
    } catch (firestoreError) {
      // Story 18.2 AC4: Rollback storage on Firestore failure
      logger.error('Screenshot Firestore metadata failed, rolling back storage', {
        error: firestoreError,
        childId: uploadData.childId,
        deviceId: uploadData.deviceId,
        screenshotId,
      })

      // Rollback: delete the storage blob
      try {
        await file.delete({ ignoreNotFound: true })
        logger.info('Storage rollback successful', { storagePath })
      } catch (rollbackError) {
        // Log but don't fail - orphaned blob will be cleaned up by retention
        logger.error('Storage rollback failed - orphaned blob', {
          error: rollbackError,
          storagePath,
        })
      }

      res.status(500).json({
        success: false,
        error: 'Failed to save screenshot metadata',
      } as UploadResponse)
      return
    }

    // Story 18.8: Update family storage usage
    try {
      await updateFamilyStorageUsage(uploadData.familyId, imageBuffer.length)

      // Check if we need to create a storage warning alert
      if (quotaCheck.isWarningLevel) {
        await createStorageWarningAlert(
          uploadData.familyId,
          quotaCheck.usageBytes + imageBuffer.length,
          quotaCheck.quotaBytes
        )
      }
    } catch (storageUpdateError) {
      // Log but don't fail the upload - storage tracking is secondary
      logger.error('Failed to update storage usage', {
        familyId: uploadData.familyId,
        errorType: storageUpdateError instanceof Error ? storageUpdateError.name : 'Unknown',
      })
    }

    // Log success (without PII)
    // Story 18.3: Log retention period used
    logger.info('Screenshot uploaded with metadata', {
      storagePath,
      screenshotId,
      childId: uploadData.childId,
      deviceId: uploadData.deviceId,
      sizeBytes: imageBuffer.length,
      retentionDays,
    })

    // Story 18.1 AC5 + Story 18.2: Return success with storage reference AND screenshotId
    res.status(200).json({
      success: true,
      storagePath,
      screenshotId,
    } as UploadResponse)
  }
)
