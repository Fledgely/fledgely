import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { deleteSafetyDocumentInputSchema } from '@fledgely/contracts'

/**
 * Callable Cloud Function: deleteSafetyDocument
 *
 * CRITICAL: This is a life-safety feature for victims escaping abuse.
 *
 * Security invariants that MUST be maintained:
 * 1. NEVER log to family audit trail (/children/{childId}/auditLog/)
 * 2. NEVER send notifications to family members
 * 3. Allow original submitter to delete their own documents
 * 4. Log only to admin audit (separate collection)
 * 5. Deletion should be immediate and complete
 */
export const deleteSafetyDocument = onCall(
  {
    // Allow unauthenticated calls - victims may not be logged in
    // but anonymous users can only delete if they have the requestId and documentId
    enforceAppCheck: false,
  },
  async (request) => {
    const db = getFirestore()
    const storage = getStorage()

    // Validate input against schema
    const parseResult = deleteSafetyDocumentInputSchema.safeParse(request.data)

    if (!parseResult.success) {
      throw new HttpsError(
        'invalid-argument',
        'Invalid deletion request',
        parseResult.error.flatten()
      )
    }

    const { requestId, documentId } = parseResult.data

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
      const documents = safetyRequestData?.documents || []

      // Find the document to delete
      const documentToDelete = documents.find(
        (doc: { id: string }) => doc.id === documentId
      )

      if (!documentToDelete) {
        throw new HttpsError(
          'not-found',
          'Document not found'
        )
      }

      // Verify caller has permission to delete
      // - Original submitter of the safety request can delete
      // - Anonymous submitters can delete if they have the correct IDs (security through obscurity for anonymous)
      const requestSubmittedBy = safetyRequestData?.submittedBy
      const callerUid = request.auth?.uid

      // If the request was submitted by an authenticated user,
      // only that user or safety team can delete
      if (requestSubmittedBy && callerUid && requestSubmittedBy !== callerUid) {
        // Check if caller is safety team
        const adminRoleDoc = await db.collection('adminRoles').doc(callerUid).get()
        const roles = adminRoleDoc.data()?.roles || []
        const isSafetyTeam = roles.includes('safety-team') || roles.includes('admin')

        if (!isSafetyTeam) {
          throw new HttpsError(
            'permission-denied',
            'You do not have permission to delete this document'
          )
        }
      }

      // Delete file from Firebase Storage
      const storagePath = documentToDelete.storagePath
      if (storagePath) {
        const bucket = storage.bucket()
        const file = bucket.file(storagePath)

        try {
          await file.delete()
        } catch (storageError) {
          // If file doesn't exist in storage, continue with Firestore cleanup
          console.warn('Storage file may already be deleted:', storageError)
        }
      }

      // Remove document from safety request
      // Filter out the deleted document
      const updatedDocuments = documents.filter(
        (doc: { id: string }) => doc.id !== documentId
      )

      await safetyRequestRef.update({
        documents: updatedDocuments,
      })

      // Log to admin audit ONLY (NOT family audit trail)
      // CRITICAL: Never log to /children/{childId}/auditLog/
      await db.collection('adminAuditLog').add({
        action: 'safety_document_deleted',
        resourceType: 'safetyDocument',
        resourceId: documentId,
        parentResourceId: requestId,
        metadata: {
          deletedBy: callerUid || 'anonymous',
          fileName: documentToDelete.fileName,
        },
        timestamp: FieldValue.serverTimestamp(),
      })

      // CRITICAL: Do NOT trigger any notifications
      // No family notifications
      // No email to family members
      // No push notifications to family devices

      // Return success confirmation
      return { success: true }
    } catch (error) {
      // Handle known error types
      if (error instanceof HttpsError) {
        throw error
      }

      // Log error to admin audit for debugging
      console.error('Safety document deletion error:', error)

      await db.collection('adminAuditLog').add({
        action: 'safety_document_deletion_error',
        resourceType: 'safetyDocument',
        resourceId: documentId,
        parentResourceId: requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: FieldValue.serverTimestamp(),
      })

      throw new HttpsError(
        'internal',
        'Unable to delete document. Please try again or contact support directly.'
      )
    }
  }
)
