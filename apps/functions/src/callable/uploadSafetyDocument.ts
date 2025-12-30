/**
 * Cloud Function for uploading safety request documentation.
 *
 * Story 0.5.2: Safety Request Documentation Upload
 *
 * CRITICAL SAFETY DESIGN:
 * This function handles document uploads from potential domestic abuse victims.
 * The primary design goal is INVISIBILITY to abusers.
 *
 * Key protections:
 * - NO audit log entries created (unlike normal operations)
 * - NO notifications sent to family members
 * - Documents stored in isolated /safetyDocuments storage path
 * - Firestore metadata in isolated /safetyDocuments collection
 * - Rate limiting to prevent abuse while allowing legitimate requests
 * - Works for both authenticated and unauthenticated users
 *
 * Implements acceptance criteria:
 * - AC2: Encrypted isolated storage
 * - AC3: File size limits (25MB per file)
 * - AC4: Upload confirmation without family notification
 * - AC5: Document retention compliance (7 years default)
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { createHash, randomUUID } from 'crypto'
import { z } from 'zod'

const db = getFirestore()
const storage = getStorage()

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const RATE_LIMIT_MAX = 20 // Max 20 uploads per hour per IP

// File size limits
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024 // 25MB per file
const MAX_TOTAL_SIZE_BYTES = 100 * 1024 * 1024 // 100MB total per ticket

// Retention period: 7 years default
const RETENTION_YEARS = 7

// Input validation schema - duplicated from contracts for Cloud Functions
// (Cloud Functions can't currently use workspace packages directly)
const safetyDocumentMimeTypeSchema = z.enum([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

const safetyDocumentUploadInputSchema = z.object({
  ticketId: z.string().min(1),
  filename: z.string().min(1).max(255),
  fileData: z.string(), // Base64 encoded
  mimeType: safetyDocumentMimeTypeSchema,
})

// Response type
interface UploadSafetyDocumentResponse {
  success: boolean
  documentId?: string
  message: string
}

/**
 * Hash an IP address for rate limiting.
 * Uses SHA-256 to prevent storing/exposing actual IP addresses.
 */
function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').substring(0, 16)
}

/**
 * Sanitize filename for storage.
 * Removes special characters that could cause issues in storage paths.
 */
function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 100)
}

/**
 * Check rate limiting for safety document uploads.
 * Returns true if the request is allowed, false if rate limited.
 */
async function checkRateLimit(ipHash: string): Promise<boolean> {
  const rateLimitRef = db.collection('safetyDocumentRateLimits').doc(ipHash)
  const now = Date.now()
  const windowStart = now - RATE_LIMIT_WINDOW_MS

  try {
    const doc = await rateLimitRef.get()

    if (!doc.exists) {
      // First request from this IP
      await rateLimitRef.set({
        uploads: [Timestamp.fromMillis(now)],
        lastUpload: FieldValue.serverTimestamp(),
      })
      return true
    }

    const data = doc.data()
    if (!data) return true

    // Filter uploads within the current window
    const uploads: Timestamp[] = data.uploads || []
    const recentUploads = uploads.filter((ts: Timestamp) => ts.toMillis() > windowStart)

    if (recentUploads.length >= RATE_LIMIT_MAX) {
      return false // Rate limited
    }

    // Add new upload timestamp
    await rateLimitRef.update({
      uploads: [...recentUploads, Timestamp.fromMillis(now)],
      lastUpload: FieldValue.serverTimestamp(),
    })

    return true
  } catch (error) {
    // On error, allow the request (fail open for safety)
    console.error('Rate limit check failed:', error)
    return true
  }
}

/**
 * Check total upload size for a ticket.
 * Returns total size in bytes of all documents uploaded to this ticket.
 */
async function getTotalUploadSize(ticketId: string): Promise<number> {
  const docsSnapshot = await db
    .collection('safetyDocuments')
    .where('ticketId', '==', ticketId)
    .get()

  let totalSize = 0
  docsSnapshot.forEach((doc) => {
    const data = doc.data()
    totalSize += data.sizeBytes || 0
  })

  return totalSize
}

/**
 * Upload a safety document.
 *
 * This function can be called by:
 * - Authenticated users (logged in)
 * - Unauthenticated users (from login page safety form)
 *
 * CRITICAL: This function intentionally does NOT:
 * - Create audit log entries
 * - Send notifications to family members
 * - Link documents to family data
 */
export const uploadSafetyDocument = onCall<
  z.infer<typeof safetyDocumentUploadInputSchema>,
  Promise<UploadSafetyDocumentResponse>
>(
  {
    cors: true,
    // Allow unauthenticated requests (AC1: accessible from login screen)
  },
  async (request) => {
    // 1. Validation (no auth required)
    const parseResult = safetyDocumentUploadInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid file data')
    }
    const { ticketId, filename, fileData, mimeType } = parseResult.data

    // 2. Rate limiting by hashed IP
    const rawIp = request.rawRequest?.ip || 'unknown'
    const ipHash = hashIp(rawIp)

    const isAllowed = await checkRateLimit(ipHash)
    if (!isAllowed) {
      throw new HttpsError(
        'resource-exhausted',
        'Please wait before uploading more files. Your files will be processed shortly.'
      )
    }

    // 3. Verify ticket exists (but don't require ownership)
    // Note: We don't verify ownership because victims may not be logged in
    // and we don't want to leak ticket existence to attackers
    const ticketRef = db.collection('safetyTickets').doc(ticketId)
    const ticket = await ticketRef.get()
    if (!ticket.exists) {
      // Return generic error to prevent ticket enumeration
      throw new HttpsError('invalid-argument', 'Unable to process request')
    }

    // 4. Decode and validate file
    let fileBuffer: Buffer
    try {
      fileBuffer = Buffer.from(fileData, 'base64')
    } catch {
      throw new HttpsError('invalid-argument', 'Invalid file format')
    }

    // 5. Validate file size
    if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
      throw new HttpsError(
        'invalid-argument',
        `File exceeds maximum size of ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`
      )
    }

    // 6. Check total upload size for ticket
    const currentTotalSize = await getTotalUploadSize(ticketId)
    if (currentTotalSize + fileBuffer.length > MAX_TOTAL_SIZE_BYTES) {
      throw new HttpsError(
        'invalid-argument',
        `Total upload size would exceed ${MAX_TOTAL_SIZE_BYTES / 1024 / 1024}MB limit`
      )
    }

    // 7. Generate secure storage path with UUID (prevents enumeration)
    const fileId = randomUUID()
    const sanitizedFilename = sanitizeFilename(filename)
    const storagePath = `safetyDocuments/${ticketId}/${fileId}_${sanitizedFilename}`

    // 8. Upload to Firebase Storage (Admin SDK bypasses client rules)
    const bucket = storage.bucket()
    const file = bucket.file(storagePath)

    try {
      await file.save(fileBuffer, {
        contentType: mimeType,
        metadata: {
          customMetadata: {
            ticketId,
            originalFilename: filename,
            uploadedAt: new Date().toISOString(),
          },
        },
      })
    } catch (error) {
      console.error('Storage upload failed:', error)
      throw new HttpsError('internal', 'Unable to save file')
    }

    // 9. Store metadata in Firestore
    const docRef = db.collection('safetyDocuments').doc()
    const retentionDate = new Date()
    retentionDate.setFullYear(retentionDate.getFullYear() + RETENTION_YEARS)

    const documentData = {
      id: docRef.id,
      ticketId,
      filename: `${fileId}_${sanitizedFilename}`,
      originalFilename: filename,
      mimeType,
      sizeBytes: fileBuffer.length,
      storagePath,
      uploadedAt: FieldValue.serverTimestamp(),
      retentionUntil: Timestamp.fromDate(retentionDate),
      legalHold: false,
      markedForDeletion: false,
      userId: request.auth?.uid || null,
    }

    try {
      await docRef.set(documentData)
    } catch (error) {
      // Clean up storage on Firestore failure
      try {
        await file.delete()
      } catch {
        // Ignore cleanup errors
      }
      console.error('Firestore write failed:', error)
      throw new HttpsError('internal', 'Unable to save file metadata')
    }

    // CRITICAL: NO audit log entry
    // CRITICAL: NO notification to family members

    // 10. Return neutral success message
    return {
      success: true,
      documentId: docRef.id,
      message: 'File uploaded successfully.',
    }
  }
)
