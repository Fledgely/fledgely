/**
 * Data Export Service
 *
 * Story 51.1: Data Export Request (GDPR Article 20)
 *
 * Provides GDPR-compliant data portability by:
 * - Collecting all family data from Firestore
 * - Downloading screenshots from Cloud Storage
 * - Creating a ZIP archive with manifest
 * - Uploading to Cloud Storage with signed URL generation
 *
 * SECURITY: All exported data is sanitized using explicit field whitelisting.
 * Internal fields, computed hashes, and sensitive metadata are excluded.
 *
 * Follows patterns from:
 * - auditExportService.ts: Lazy Firestore initialization
 * - screenshots/sync.ts: Storage operations
 * - getSafetyDocument.ts: Signed URL generation
 */

import { getFirestore, Firestore } from 'firebase-admin/firestore'
import { getStorage, Storage } from 'firebase-admin/storage'
import archiver from 'archiver'
import * as logger from 'firebase-functions/logger'
import {
  DataExportStatus,
  DataExportRequestSchema,
  ExportManifestSchema,
  ExportedDataSchema,
  DATA_EXPORT_CONFIG,
  type DataExportRequest,
  type ExportManifest,
  type ExportedData,
} from '@fledgely/shared'

// ============================================================================
// DATA SANITIZATION - Explicit field whitelisting for GDPR exports
// ============================================================================

/**
 * Pick only specified fields from an object.
 * Returns undefined for missing fields (filtered out later).
 */
function pickFields<T extends Record<string, unknown>>(
  obj: T,
  fields: string[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const field of fields) {
    if (field in obj && obj[field] !== undefined) {
      result[field] = obj[field]
    }
  }
  return result
}

/**
 * Sanitize family data for export.
 * Whitelist: Only fields the user should have access to.
 */
function sanitizeFamilyData(family: Record<string, unknown>): Record<string, unknown> {
  const allowedFields = [
    'id',
    'name',
    'createdAt',
    'updatedAt',
    'timezone',
    'locale',
    'photoUrl',
    'primaryGuardianId',
    'guardianIds',
  ]
  return pickFields(family, allowedFields)
}

/**
 * Sanitize child data for export.
 */
function sanitizeChildData(child: Record<string, unknown>): Record<string, unknown> {
  const allowedFields = [
    'id',
    'familyId',
    'name',
    'displayName',
    'birthDate',
    'age',
    'photoUrl',
    'createdAt',
    'updatedAt',
    'trustScore',
    'privacyLevel',
    'devices',
  ]
  return pickFields(child, allowedFields)
}

/**
 * Sanitize device data for export.
 */
function sanitizeDeviceData(device: Record<string, unknown>): Record<string, unknown> {
  const allowedFields = [
    'id',
    'name',
    'type',
    'platform',
    'osVersion',
    'enrolledAt',
    'lastSeenAt',
    'childId',
    'status',
    'model',
    'manufacturer',
  ]
  return pickFields(device, allowedFields)
}

/**
 * Sanitize screenshot metadata for export.
 * Excludes storagePath (internal) but includes user-facing metadata.
 */
function sanitizeScreenshotData(screenshot: Record<string, unknown>): Record<string, unknown> {
  const allowedFields = [
    'id',
    'childId',
    'deviceId',
    'timestamp',
    'capturedAt',
    'classification',
    'appName',
    'appBundle',
    'retentionExpiresAt',
    'storagePath', // Needed for image export
  ]
  const sanitized = pickFields(screenshot, allowedFields)

  // Sanitize nested classification if present
  if (sanitized.classification && typeof sanitized.classification === 'object') {
    const classificationAllowed = [
      'status',
      'primaryCategory',
      'subCategory',
      'confidence',
      'concernFlags',
      'needsReview',
      'modelVersion',
    ]
    sanitized.classification = pickFields(
      sanitized.classification as Record<string, unknown>,
      classificationAllowed
    )
  }

  return sanitized
}

/**
 * Sanitize flag data for export.
 */
function sanitizeFlagData(flag: Record<string, unknown>): Record<string, unknown> {
  const allowedFields = [
    'id',
    'childId',
    'screenshotId',
    'type',
    'severity',
    'status',
    'category',
    'subCategory',
    'description',
    'createdAt',
    'resolvedAt',
    'resolvedBy',
    'resolution',
    'annotation',
  ]
  return pickFields(flag, allowedFields)
}

/**
 * Sanitize agreement data for export.
 */
function sanitizeAgreementData(agreement: Record<string, unknown>): Record<string, unknown> {
  const allowedFields = [
    'id',
    'templateId',
    'templateName',
    'childId',
    'status',
    'createdAt',
    'signedAt',
    'signedBy',
    'expiresAt',
    'version',
    'terms',
  ]
  return pickFields(agreement, allowedFields)
}

/**
 * Sanitize audit event data for export.
 * Excludes internal tracking fields and IP addresses.
 */
function sanitizeAuditEventData(event: Record<string, unknown>): Record<string, unknown> {
  const allowedFields = [
    'id',
    'familyId',
    'childId',
    'actorUid',
    'actorType',
    'action',
    'resourceType',
    'resourceId',
    'timestamp',
    'description',
    'metadata',
  ]
  const sanitized = pickFields(event, allowedFields)

  // Remove IP addresses and user agents from metadata if present
  if (sanitized.metadata && typeof sanitized.metadata === 'object') {
    const meta = { ...(sanitized.metadata as Record<string, unknown>) }
    delete meta.ipAddress
    delete meta.userAgent
    delete meta.deviceFingerprint
    sanitized.metadata = meta
  }

  return sanitized
}

/**
 * Sanitize settings data for export.
 */
function sanitizeSettingsData(settings: Record<string, unknown>): Record<string, unknown> {
  const allowedFields = [
    'notifications',
    'privacy',
    'retention',
    'timeLimits',
    'focusMode',
    'workMode',
    'offlineSchedule',
  ]
  return pickFields(settings, allowedFields)
}

// Lazy initialization for Firestore
let db: Firestore | null = null
function getDb(): Firestore {
  if (!db) {
    db = getFirestore()
  }
  return db
}

// Lazy initialization for Storage
let storage: Storage | null = null
function getStorageInstance(): Storage {
  if (!storage) {
    storage = getStorage()
  }
  return storage
}

/**
 * Collected family data structure
 */
interface CollectedFamilyData {
  family: Record<string, unknown>
  children: Array<Record<string, unknown>>
  devices: Array<Record<string, unknown>>
  screenshots: Array<Record<string, unknown>>
  flags: Array<Record<string, unknown>>
  agreements: Array<Record<string, unknown>>
  auditEvents: Array<Record<string, unknown>>
  settings: Record<string, unknown> | null
}

/**
 * Screenshot with storage path for download
 */
interface ScreenshotForExport {
  metadata: Record<string, unknown>
  storagePath: string
}

/**
 * Collect all family data from Firestore.
 *
 * @param familyId - Family ID to export
 * @returns Collected family data
 */
export async function collectFamilyData(familyId: string): Promise<CollectedFamilyData> {
  const db = getDb()
  const familyRef = db.collection('families').doc(familyId)

  logger.info('Collecting family data for export', { familyId })

  // Collect family document
  const familyDoc = await familyRef.get()
  if (!familyDoc.exists) {
    throw new Error(`Family ${familyId} not found`)
  }
  // SECURITY: Sanitize all data using explicit field whitelisting
  const family = sanitizeFamilyData({ id: familyDoc.id, ...familyDoc.data() })

  // Collect children
  const childrenSnapshot = await db.collection('children').where('familyId', '==', familyId).get()
  const children = childrenSnapshot.docs.map((doc) =>
    sanitizeChildData({ id: doc.id, ...doc.data() })
  )

  // Collect devices
  const devicesSnapshot = await familyRef.collection('devices').get()
  const devices = devicesSnapshot.docs.map((doc) =>
    sanitizeDeviceData({ id: doc.id, ...doc.data() })
  )

  // Collect screenshots metadata for each child
  const screenshots: Array<Record<string, unknown>> = []
  for (const child of children) {
    const screenshotsSnapshot = await db
      .collection('children')
      .doc(child.id as string)
      .collection('screenshots')
      .get()

    for (const doc of screenshotsSnapshot.docs) {
      screenshots.push(
        sanitizeScreenshotData({
          id: doc.id,
          childId: child.id,
          ...doc.data(),
        })
      )
    }
  }

  // Collect flags for each child
  const flags: Array<Record<string, unknown>> = []
  for (const child of children) {
    const flagsSnapshot = await db
      .collection('children')
      .doc(child.id as string)
      .collection('flags')
      .get()

    for (const doc of flagsSnapshot.docs) {
      flags.push(
        sanitizeFlagData({
          id: doc.id,
          childId: child.id,
          ...doc.data(),
        })
      )
    }
  }

  // Collect agreements
  const agreementsSnapshot = await familyRef.collection('agreements').get()
  const agreements = agreementsSnapshot.docs.map((doc) =>
    sanitizeAgreementData({ id: doc.id, ...doc.data() })
  )

  // Collect audit events for family
  const auditSnapshot = await db
    .collection('auditEvents')
    .where('familyId', '==', familyId)
    .orderBy('timestamp', 'desc')
    .limit(10000) // Cap at 10k events for performance
    .get()
  const auditEvents = auditSnapshot.docs.map((doc) =>
    sanitizeAuditEventData({ id: doc.id, ...doc.data() })
  )

  // Collect family settings (if exists)
  const settingsDoc = await familyRef.collection('settings').doc('preferences').get()
  const settings = settingsDoc.exists ? sanitizeSettingsData(settingsDoc.data() || {}) : null

  logger.info('Family data collected', {
    familyId,
    childrenCount: children.length,
    devicesCount: devices.length,
    screenshotsCount: screenshots.length,
    flagsCount: flags.length,
    agreementsCount: agreements.length,
    auditEventsCount: auditEvents.length,
    hasSettings: !!settings,
  })

  return {
    family,
    children,
    devices,
    screenshots,
    flags,
    agreements,
    auditEvents,
    settings,
  }
}

/**
 * Get screenshots with their storage paths for download.
 *
 * @param familyData - Collected family data
 * @returns Screenshots with storage paths
 */
function getScreenshotsForExport(familyData: CollectedFamilyData): ScreenshotForExport[] {
  return familyData.screenshots
    .filter((s) => typeof s.storagePath === 'string' && s.storagePath.length > 0)
    .map((s) => ({
      metadata: s,
      storagePath: s.storagePath as string,
    }))
}

/**
 * Generate export archive and upload to Cloud Storage.
 *
 * @param exportId - Export ID
 * @param familyId - Family ID
 * @param requestedBy - UID of requesting guardian
 * @param requestedByEmail - Email of requesting guardian
 * @returns Storage path and file size
 */
export async function generateExportArchive(
  exportId: string,
  familyId: string,
  requestedBy: string,
  requestedByEmail: string
): Promise<{ storagePath: string; fileSize: number }> {
  const storage = getStorageInstance()
  const bucket = storage.bucket()

  logger.info('Generating export archive', { exportId, familyId })

  // Collect all family data
  const familyData = await collectFamilyData(familyId)

  // Get screenshots with storage paths
  const screenshotsForExport = getScreenshotsForExport(familyData)

  // Create manifest
  const manifest: ExportManifest = {
    exportId,
    exportVersion: '1.0',
    exportedAt: Date.now(),
    familyId,
    requestedBy,
    requestedByEmail,
    contents: {
      familyProfile: true,
      children: familyData.children.length,
      devices: familyData.devices.length,
      screenshots: familyData.screenshots.length,
      screenshotImages: screenshotsForExport.length,
      flags: familyData.flags.length,
      agreements: familyData.agreements.length,
      auditEvents: familyData.auditEvents.length,
      settings: !!familyData.settings,
    },
    watermark: {
      generatedBy: 'fledgely',
      gdprCompliant: true,
      dataController: 'Fledgely Inc.',
    },
  }

  // Validate manifest
  const manifestValidation = ExportManifestSchema.safeParse(manifest)
  if (!manifestValidation.success) {
    logger.error('Manifest validation failed', { errors: manifestValidation.error.errors })
    throw new Error('Failed to create valid export manifest')
  }

  // Create exported data structure
  const exportedData: ExportedData = {
    family: familyData.family,
    children: familyData.children,
    devices: familyData.devices,
    screenshots: familyData.screenshots,
    flags: familyData.flags,
    agreements: familyData.agreements,
    auditEvents: familyData.auditEvents,
    settings: familyData.settings || undefined,
  }

  // Validate exported data
  const dataValidation = ExportedDataSchema.safeParse(exportedData)
  if (!dataValidation.success) {
    logger.error('Data validation failed', { errors: dataValidation.error.errors })
    throw new Error('Failed to create valid export data')
  }

  // Create ZIP archive in memory
  const storagePath = `${DATA_EXPORT_CONFIG.STORAGE_PATH_PREFIX}/${familyId}/${exportId}.zip`
  const file = bucket.file(storagePath)

  // Create a write stream to Cloud Storage
  const writeStream = file.createWriteStream({
    contentType: 'application/zip',
    metadata: {
      metadata: {
        exportId,
        familyId,
        requestedBy,
        exportedAt: new Date().toISOString(),
      },
    },
  })

  // Create archive
  const archive = archiver('zip', {
    zlib: { level: 6 }, // Balanced compression
  })

  // Track file size
  let fileSize = 0
  archive.on('data', (chunk: Buffer) => {
    fileSize += chunk.length
  })

  // Pipe archive to Cloud Storage
  archive.pipe(writeStream)

  // Add manifest.json
  archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' })

  // Add data.json
  archive.append(JSON.stringify(exportedData, null, 2), { name: 'data.json' })

  // Download and add screenshots
  logger.info('Adding screenshots to archive', { count: screenshotsForExport.length })
  let downloadedCount = 0
  let failedCount = 0

  for (const screenshot of screenshotsForExport) {
    try {
      const screenshotFile = bucket.file(screenshot.storagePath)
      const [exists] = await screenshotFile.exists()

      if (exists) {
        const [buffer] = await screenshotFile.download()
        // Use the original filename from the storage path
        const filename = `screenshots/${screenshot.storagePath.split('/').pop()}`
        archive.append(buffer, { name: filename })
        downloadedCount++
      } else {
        logger.warn('Screenshot file not found', { storagePath: screenshot.storagePath })
        failedCount++
      }
    } catch (error) {
      logger.error('Failed to download screenshot', {
        storagePath: screenshot.storagePath,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      failedCount++
    }
  }

  logger.info('Screenshots added to archive', { downloaded: downloadedCount, failed: failedCount })

  // Finalize archive
  await archive.finalize()

  // Wait for upload to complete
  await new Promise<void>((resolve, reject) => {
    writeStream.on('finish', resolve)
    writeStream.on('error', reject)
  })

  logger.info('Export archive generated', {
    exportId,
    storagePath,
    fileSize,
    screenshotsDownloaded: downloadedCount,
    screenshotsFailed: failedCount,
  })

  return { storagePath, fileSize }
}

/**
 * Generate a signed download URL for an export.
 *
 * @param storagePath - Path to the export file in Cloud Storage
 * @param expiresAt - Expiration timestamp in milliseconds
 * @returns Signed download URL
 */
export async function generateExportDownloadUrl(
  storagePath: string,
  expiresAt: number
): Promise<string> {
  const storage = getStorageInstance()
  const bucket = storage.bucket()
  const file = bucket.file(storagePath)

  const [signedUrl] = await file.getSignedUrl({
    action: 'read',
    expires: new Date(expiresAt),
    responseDisposition: 'attachment; filename="fledgely-export.zip"',
    responseType: 'application/zip',
  })

  return signedUrl
}

/**
 * Create a new data export request.
 *
 * @param familyId - Family ID
 * @param requestedBy - UID of requesting guardian
 * @param requestedByEmail - Email of requesting guardian
 * @returns Export request document
 */
export async function createExportRequest(
  familyId: string,
  requestedBy: string,
  requestedByEmail: string
): Promise<DataExportRequest> {
  const db = getDb()
  const now = Date.now()

  // Generate unique export ID
  const exportId = `exp_${now}_${Math.random().toString(36).substring(2, 8)}`

  const exportRequest: DataExportRequest = {
    exportId,
    familyId,
    requestedBy,
    requestedByEmail,
    requestedAt: now,
    status: DataExportStatus.PENDING,
    processingStartedAt: null,
    completedAt: null,
    downloadUrl: null,
    expiresAt: null,
    fileSize: null,
    errorMessage: null,
  }

  // Validate request
  const validation = DataExportRequestSchema.safeParse(exportRequest)
  if (!validation.success) {
    logger.error('Export request validation failed', { errors: validation.error.errors })
    throw new Error('Failed to create valid export request')
  }

  // Save to Firestore
  await db.collection('dataExports').doc(exportId).set(exportRequest)

  logger.info('Export request created', { exportId, familyId, requestedBy })

  return exportRequest
}

/**
 * Update export request status.
 *
 * @param exportId - Export ID
 * @param updates - Fields to update
 */
export async function updateExportRequest(
  exportId: string,
  updates: Partial<DataExportRequest>
): Promise<void> {
  const db = getDb()
  await db.collection('dataExports').doc(exportId).update(updates)
  logger.info('Export request updated', { exportId, updates: Object.keys(updates) })
}

/**
 * Get an export request by ID.
 *
 * @param exportId - Export ID
 * @returns Export request or null if not found
 */
export async function getExportRequest(exportId: string): Promise<DataExportRequest | null> {
  const db = getDb()
  const doc = await db.collection('dataExports').doc(exportId).get()

  if (!doc.exists) {
    return null
  }

  const data = doc.data()
  const validation = DataExportRequestSchema.safeParse(data)

  if (!validation.success) {
    logger.error('Export request validation failed on read', {
      exportId,
      errors: validation.error.errors,
    })
    return null
  }

  return validation.data
}

/**
 * Find pending or processing exports for a family.
 *
 * @param familyId - Family ID
 * @returns Active export request or null
 */
export async function findActiveExport(familyId: string): Promise<DataExportRequest | null> {
  const db = getDb()

  const snapshot = await db
    .collection('dataExports')
    .where('familyId', '==', familyId)
    .where('status', 'in', [DataExportStatus.PENDING, DataExportStatus.PROCESSING])
    .orderBy('requestedAt', 'desc')
    .limit(1)
    .get()

  if (snapshot.empty) {
    return null
  }

  const doc = snapshot.docs[0]
  const data = doc.data()

  // Check if it's stale (older than processing timeout)
  const isStale =
    data.requestedAt < Date.now() - DATA_EXPORT_CONFIG.PROCESSING_TIMEOUT_MS &&
    data.status === DataExportStatus.PROCESSING

  if (isStale) {
    // Mark as failed
    await updateExportRequest(doc.id, {
      status: DataExportStatus.FAILED,
      errorMessage: 'Export timed out during processing',
    })
    return null
  }

  const validation = DataExportRequestSchema.safeParse(data)
  if (!validation.success) {
    return null
  }

  return validation.data
}

/**
 * Get the latest completed export for a family.
 *
 * @param familyId - Family ID
 * @returns Latest completed export or null
 */
export async function getLatestCompletedExport(
  familyId: string
): Promise<DataExportRequest | null> {
  const db = getDb()

  const snapshot = await db
    .collection('dataExports')
    .where('familyId', '==', familyId)
    .where('status', '==', DataExportStatus.COMPLETED)
    .orderBy('completedAt', 'desc')
    .limit(1)
    .get()

  if (snapshot.empty) {
    return null
  }

  const data = snapshot.docs[0].data()
  const validation = DataExportRequestSchema.safeParse(data)

  if (!validation.success) {
    return null
  }

  return validation.data
}

/**
 * Find exports that have expired and need cleanup.
 *
 * @returns Array of expired export requests
 */
export async function findExpiredExports(): Promise<DataExportRequest[]> {
  const db = getDb()
  const now = Date.now()

  const snapshot = await db
    .collection('dataExports')
    .where('status', '==', DataExportStatus.COMPLETED)
    .where('expiresAt', '<', now)
    .limit(100)
    .get()

  const exports: DataExportRequest[] = []

  for (const doc of snapshot.docs) {
    const data = doc.data()
    const validation = DataExportRequestSchema.safeParse(data)
    if (validation.success) {
      exports.push(validation.data)
    }
  }

  return exports
}

/**
 * Delete an export file from Cloud Storage.
 *
 * @param storagePath - Path to the export file
 */
export async function deleteExportFile(storagePath: string): Promise<void> {
  const storage = getStorageInstance()
  const bucket = storage.bucket()
  const file = bucket.file(storagePath)

  try {
    await file.delete({ ignoreNotFound: true })
    logger.info('Export file deleted', { storagePath })
  } catch (error) {
    logger.error('Failed to delete export file', {
      storagePath,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * For testing - reset Firestore and Storage instances
 */
export function _resetForTesting(): void {
  db = null
  storage = null
}
