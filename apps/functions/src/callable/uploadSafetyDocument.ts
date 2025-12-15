import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import {
  uploadSafetyDocumentInputSchema,
  MAX_DOCUMENTS_PER_REQUEST,
  MAX_FILE_SIZE_BYTES,
  isAllowedFileType,
  calculateRetentionExpiration,
  DEFAULT_RETENTION_YEARS,
} from '@fledgely/contracts'
import { randomUUID } from 'crypto'

/**
 * Callable Cloud Function: uploadSafetyDocument
 *
 * CRITICAL: This is a life-safety feature for victims escaping abuse.
 *
 * Security invariants that MUST be maintained:
 * 1. NEVER log to family audit trail (/children/{childId}/auditLog/)
 * 2. NEVER send notifications to family members
 * 3. NEVER expose through family-accessible queries
 * 4. ALWAYS store in isolated safetyDocuments/ storage path
 * 5. Log only to admin audit (separate collection)
 * 6. Document paths must NEVER be guessable or enumerable by family
 */
export const uploadSafetyDocument = onCall(
  {
    // Allow unauthenticated calls - victims may not be logged in
    // or may be using someone else's device
    enforceAppCheck: false,
    // Increase timeout and memory for file uploads
    timeoutSeconds: 120,
    memory: '512MiB',
  },
  async (request) => {
    const db = getFirestore()
    const storage = getStorage()

    // Validate input against schema
    const parseResult = uploadSafetyDocumentInputSchema.safeParse(request.data)

    if (!parseResult.success) {
      throw new HttpsError(
        'invalid-argument',
        'Invalid upload data',
        parseResult.error.flatten()
      )
    }

    const validatedData = parseResult.data
    const { requestId, fileName, fileType, sizeBytes, fileContent } = validatedData

    // Additional file type validation using helper
    if (!isAllowedFileType(fileType)) {
      throw new HttpsError(
        'invalid-argument',
        'File type not allowed. Please upload PDF, images, or Word documents.'
      )
    }

    // Additional file size validation
    if (sizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new HttpsError(
        'invalid-argument',
        'File too large. Maximum file size is 25MB.'
      )
    }

    try {
      // Verify the safety request exists
      const safetyRequestRef = db.collection('safetyRequests').doc(requestId)
      const safetyRequestDoc = await safetyRequestRef.get()

      if (!safetyRequestDoc.exists) {
        throw new HttpsError(
          'not-found',
          'Safety request not found'
        )
      }

      const safetyRequestData = safetyRequestDoc.data()

      // Check document count limit
      const existingDocuments = safetyRequestData?.documents || []
      if (existingDocuments.length >= MAX_DOCUMENTS_PER_REQUEST) {
        throw new HttpsError(
          'resource-exhausted',
          `Maximum ${MAX_DOCUMENTS_PER_REQUEST} documents allowed per request`
        )
      }

      // Generate unique document ID
      const documentId = randomUUID()

      // Generate secure storage path
      // Format: safetyDocuments/{requestId}/{uuid}_{sanitizedFileName}
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storagePath = `safetyDocuments/${requestId}/${documentId}_${sanitizedFileName}`

      // Decode base64 content
      const fileBuffer = Buffer.from(fileContent, 'base64')

      // Verify actual file size matches declared size (within tolerance)
      if (Math.abs(fileBuffer.length - sizeBytes) > 1024) {
        throw new HttpsError(
          'invalid-argument',
          'File size mismatch'
        )
      }

      // Upload to Firebase Storage
      const bucket = storage.bucket()
      const file = bucket.file(storagePath)

      await file.save(fileBuffer, {
        metadata: {
          contentType: fileType,
          metadata: {
            // Custom metadata for security rules
            submittedBy: request.auth?.uid || 'anonymous',
            originalName: fileName,
            requestId: requestId,
            uploadedAt: new Date().toISOString(),
          },
        },
      })

      // Create document metadata
      const documentMetadata = {
        id: documentId,
        fileName: fileName,
        fileType: fileType,
        storagePath: storagePath,
        uploadedAt: Timestamp.now(),
        sizeBytes: fileBuffer.length,
      }

      // Update safety request with new document
      // Also set retention policy if not already set
      const updateData: Record<string, unknown> = {
        documents: FieldValue.arrayUnion(documentMetadata),
      }

      // Set retention policy on first document upload if not already set
      if (!safetyRequestData?.retentionPolicy) {
        updateData.retentionPolicy = {
          years: DEFAULT_RETENTION_YEARS,
          expiresAt: Timestamp.fromDate(calculateRetentionExpiration()),
        }
      }

      await safetyRequestRef.update(updateData)

      // Log to admin audit ONLY (NOT family audit trail)
      // CRITICAL: Never log to /children/{childId}/auditLog/
      await db.collection('adminAuditLog').add({
        action: 'safety_document_uploaded',
        resourceType: 'safetyDocument',
        resourceId: documentId,
        parentResourceId: requestId,
        // Only log metadata, not content
        metadata: {
          fileName: fileName,
          fileType: fileType,
          sizeBytes: fileBuffer.length,
          isAuthenticated: !!request.auth?.uid,
        },
        timestamp: FieldValue.serverTimestamp(),
        // Do not include IP or detailed user info for victim protection
      })

      // CRITICAL: Do NOT trigger any notifications
      // No family notifications
      // No email to family members
      // No push notifications to family devices

      // Return minimal response to avoid revealing information
      return {
        success: true,
        documentId: documentId,
      }
    } catch (error) {
      // Handle known error types
      if (error instanceof HttpsError) {
        throw error
      }

      // Log error to admin audit for debugging
      // But don't expose details to client
      console.error('Safety document upload error:', error)

      await db.collection('adminAuditLog').add({
        action: 'safety_document_upload_error',
        resourceType: 'safetyDocument',
        parentResourceId: requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: FieldValue.serverTimestamp(),
      })

      throw new HttpsError(
        'internal',
        'Unable to upload document. Please try again or contact support directly.'
      )
    }
  }
)
