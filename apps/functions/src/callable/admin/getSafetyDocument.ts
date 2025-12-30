/**
 * Cloud Function for getting safety document signed URL (admin only).
 *
 * Story 0.5.3: Support Agent Escape Dashboard
 *
 * CRITICAL SECURITY DESIGN:
 * - Requires safety-team custom claim
 * - Generates short-lived signed URL (1 hour max)
 * - Logs all document access to admin audit
 * - Documents are NEVER directly accessible to clients
 *
 * Implements acceptance criteria:
 * - AC3: Documents fetched via Admin SDK (not exposed to client)
 * - AC5: Document access logged in admin audit
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { z } from 'zod'
import { requireSafetyTeamRole } from '../../utils/safetyTeamAuth'
import { logAdminAction } from '../../utils/adminAudit'

const db = getFirestore()
const storage = getStorage()

// Input validation schema
const getSafetyDocumentInputSchema = z.object({
  documentId: z.string().min(1),
})

interface GetSafetyDocumentResponse {
  signedUrl: string
  filename: string
  mimeType: string
  expiresAt: string
}

// Signed URL expiration time (1 hour)
const URL_EXPIRATION_MS = 60 * 60 * 1000

/**
 * Get a signed URL for viewing a safety document.
 *
 * Requires safety-team role.
 * Returns a short-lived signed URL for document access.
 */
export const getSafetyDocument = onCall<
  z.infer<typeof getSafetyDocumentInputSchema>,
  Promise<GetSafetyDocumentResponse>
>(
  {
    cors: true,
  },
  async (request) => {
    // 1. Verify safety-team role
    const context = await requireSafetyTeamRole(request, 'view_document')

    // 2. Validate input
    const parseResult = getSafetyDocumentInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Document ID is required')
    }
    const { documentId } = parseResult.data

    // 3. Get document metadata
    const docRef = db.collection('safetyDocuments').doc(documentId)
    const docSnapshot = await docRef.get()

    if (!docSnapshot.exists) {
      throw new HttpsError('not-found', 'Document not found')
    }

    const docData = docSnapshot.data()!
    const storagePath = docData.storagePath

    if (!storagePath) {
      throw new HttpsError('failed-precondition', 'Document has no associated file')
    }

    // 4. Generate signed URL
    const bucket = storage.bucket()
    const file = bucket.file(storagePath)

    // Check if file exists
    const [exists] = await file.exists()
    if (!exists) {
      throw new HttpsError('not-found', 'Document file not found in storage')
    }

    const expiresAt = new Date(Date.now() + URL_EXPIRATION_MS)

    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: expiresAt,
      // Add response headers for inline viewing
      responseDisposition: `inline; filename="${docData.originalFilename || 'document'}"`,
      responseType: docData.mimeType || 'application/octet-stream',
    })

    // 5. Log document access
    await logAdminAction({
      agentId: context.agentId,
      agentEmail: context.agentEmail,
      action: 'view_document',
      resourceType: 'safety_document',
      resourceId: documentId,
      metadata: {
        ticketId: docData.ticketId,
        filename: docData.originalFilename,
      },
      ipAddress: context.ipAddress,
    })

    return {
      signedUrl,
      filename: docData.originalFilename || 'document',
      mimeType: docData.mimeType || 'application/octet-stream',
      expiresAt: expiresAt.toISOString(),
    }
  }
)
