/**
 * Cloud Function for deleting safety request documentation.
 *
 * Story 0.5.2: Safety Request Documentation Upload - AC6
 *
 * CRITICAL SAFETY DESIGN:
 * This function allows victims to delete their uploaded documents.
 * Deletion is immediate and permanent.
 *
 * Key protections:
 * - Only document uploader can delete (matched by userId)
 * - NO audit log entries created
 * - NO notifications sent to family members
 * - Supports support agent deletion (via admin SDK calls)
 *
 * Implements acceptance criteria:
 * - AC6: Victim can delete their uploaded documents at any time
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { z } from 'zod'

const db = getFirestore()
const storage = getStorage()

// Input validation schema
const safetyDocumentDeleteInputSchema = z.object({
  documentId: z.string().min(1),
})

// Response type
interface DeleteSafetyDocumentResponse {
  success: boolean
  message: string
}

/**
 * Delete a safety document.
 *
 * This function allows:
 * - Document uploader (matched by userId) to delete their documents
 * - Unauthenticated users can delete documents they uploaded (matched by lack of userId)
 *
 * CRITICAL: This function intentionally does NOT:
 * - Create audit log entries
 * - Send notifications to family members
 * - Check family membership (documents are isolated from family data)
 */
export const deleteSafetyDocument = onCall<
  z.infer<typeof safetyDocumentDeleteInputSchema>,
  Promise<DeleteSafetyDocumentResponse>
>(
  {
    cors: true,
    // Allow unauthenticated requests (victims may not be logged in)
  },
  async (request) => {
    // 1. Validation
    const parseResult = safetyDocumentDeleteInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid request')
    }
    const { documentId } = parseResult.data

    // 2. Get document metadata
    const docRef = db.collection('safetyDocuments').doc(documentId)
    const docSnapshot = await docRef.get()

    if (!docSnapshot.exists) {
      // Return generic error to prevent document enumeration
      throw new HttpsError('not-found', 'Unable to process request')
    }

    const docData = docSnapshot.data()
    if (!docData) {
      throw new HttpsError('not-found', 'Unable to process request')
    }

    // 3. Authorization check
    // Allow deletion if:
    // - User is logged in AND matches the uploader userId
    // - Document was uploaded anonymously (userId is null) AND user is not logged in
    // This prevents logged-in users from deleting anonymous uploads
    const requestUserId = request.auth?.uid || null
    const documentUserId = docData.userId || null

    if (requestUserId !== documentUserId) {
      throw new HttpsError('permission-denied', 'Unable to process request')
    }

    // 4. Check for legal hold
    if (docData.legalHold) {
      // Documents under legal hold cannot be deleted
      // Return neutral message to avoid revealing legal status
      throw new HttpsError(
        'failed-precondition',
        'This document cannot be deleted at this time. Please contact support.'
      )
    }

    // 5. Delete from Firebase Storage
    const storagePath = docData.storagePath
    if (storagePath) {
      const bucket = storage.bucket()
      const file = bucket.file(storagePath)

      try {
        await file.delete()
      } catch (error) {
        // Log but continue - file may already be deleted
        console.error('Storage deletion failed:', error)
      }
    }

    // 6. Delete metadata from Firestore
    try {
      await docRef.delete()
    } catch (error) {
      console.error('Firestore deletion failed:', error)
      throw new HttpsError('internal', 'Unable to complete deletion')
    }

    // CRITICAL: NO audit log entry
    // CRITICAL: NO notification to family members

    // 7. Return neutral success message
    return {
      success: true,
      message: 'File deleted successfully.',
    }
  }
)
