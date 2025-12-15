import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { z } from 'zod'

/**
 * Input schema for getting a safety request
 */
const getSafetyRequestInputSchema = z.object({
  /** Request ID to retrieve */
  requestId: z.string().min(1),
  /** Whether to include signed URLs for documents */
  includeDocumentUrls: z.boolean().default(true),
})

/**
 * Callable Cloud Function: getSafetyRequest
 *
 * CRITICAL: This function exposes full safety request data including documents.
 * Only safety-team members can access this data.
 *
 * Security invariants:
 * 1. Caller MUST have safety-team role
 * 2. Document access via time-limited signed URLs only
 * 3. All access is logged to adminAuditLog
 * 4. Documents are NOT exposed through any family query
 */
export const getSafetyRequest = onCall(
  {
    enforceAppCheck: true,
  },
  async (request) => {
    const db = getFirestore()
    const storage = getStorage()

    // Require authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    const callerUid = request.auth.uid
    const callerClaims = request.auth.token

    // Verify caller is safety-team
    if (!callerClaims.isSafetyTeam && !callerClaims.isAdmin) {
      throw new HttpsError(
        'permission-denied',
        'Safety team access required'
      )
    }

    // Validate input
    const parseResult = getSafetyRequestInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError(
        'invalid-argument',
        'Invalid input',
        parseResult.error.flatten()
      )
    }

    const { requestId, includeDocumentUrls } = parseResult.data

    try {
      // Get the safety request
      const requestDoc = await db
        .collection('safetyRequests')
        .doc(requestId)
        .get()

      if (!requestDoc.exists) {
        throw new HttpsError('not-found', 'Safety request not found')
      }

      const requestData = requestDoc.data()!

      // Generate signed URLs for documents if requested
      let documentsWithUrls = requestData.documents || []
      if (includeDocumentUrls && documentsWithUrls.length > 0) {
        const bucket = storage.bucket()

        documentsWithUrls = await Promise.all(
          documentsWithUrls.map(
            async (doc: {
              id: string
              fileName: string
              fileType: string
              storagePath: string
              uploadedAt: unknown
              sizeBytes: number
            }) => {
              try {
                const file = bucket.file(doc.storagePath)

                // Generate signed URL valid for 15 minutes
                const [signedUrl] = await file.getSignedUrl({
                  action: 'read',
                  expires: Date.now() + 15 * 60 * 1000, // 15 minutes
                })

                return {
                  ...doc,
                  signedUrl,
                  urlExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
                }
              } catch (error) {
                console.error(
                  `Failed to generate signed URL for ${doc.storagePath}:`,
                  error
                )
                return {
                  ...doc,
                  signedUrl: null,
                  urlError: 'Failed to generate access URL',
                }
              }
            }
          )
        )
      }

      // Log access to admin audit
      await db.collection('adminAuditLog').add({
        action: 'safety_request_viewed',
        resourceType: 'safetyRequest',
        resourceId: requestId,
        performedBy: callerUid,
        metadata: {
          documentCount: documentsWithUrls.length,
          includeDocumentUrls,
        },
        timestamp: FieldValue.serverTimestamp(),
      })

      return {
        success: true,
        request: {
          id: requestDoc.id,
          message: requestData.message,
          safeEmail: requestData.safeEmail || null,
          safePhone: requestData.safePhone || null,
          submittedBy: requestData.submittedBy || null,
          submittedAt: requestData.submittedAt,
          source: requestData.source,
          status: requestData.status,
          assignedTo: requestData.assignedTo || null,
          documents: documentsWithUrls,
          verificationChecklist: requestData.verificationChecklist || {
            phoneVerified: false,
            idMatched: false,
            accountOwnershipVerified: false,
            safeContactConfirmed: false,
          },
          adminNotes: requestData.adminNotes || [],
          escalation: requestData.escalation || {
            isEscalated: false,
          },
          retentionPolicy: requestData.retentionPolicy || null,
        },
      }
    } catch (error) {
      console.error('Error getting safety request:', error)

      if (error instanceof HttpsError) {
        throw error
      }

      // Log error
      await db.collection('adminAuditLog').add({
        action: 'safety_request_view_error',
        resourceType: 'safetyRequest',
        resourceId: requestId,
        performedBy: callerUid,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: FieldValue.serverTimestamp(),
      })

      throw new HttpsError('internal', 'Failed to retrieve safety request')
    }
  }
)
