import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { z } from 'zod'

/**
 * Input schema for getting a legal petition
 */
const getLegalPetitionInputSchema = z.object({
  petitionId: z.string().min(1),
})

/**
 * Callable Cloud Function: getLegalPetition
 *
 * Story 3.6: Legal Parent Petition for Access - Task 10
 *
 * Gets full details of a legal petition for support team review.
 *
 * CRITICAL SECURITY REQUIREMENTS:
 * 1. ONLY callable by safety-team role
 * 2. Returns full petition details including internal notes
 * 3. Documents may include signed URLs for viewing
 */
export const getLegalPetition = onCall(
  {
    enforceAppCheck: false,
  },
  async (request) => {
    const db = getFirestore()

    // Require authentication
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    const callerId = request.auth.uid

    // Verify caller has safety-team role
    const adminRoleDoc = await db.doc(`adminRoles/${callerId}`).get()
    if (!adminRoleDoc.exists) {
      throw new HttpsError(
        'permission-denied',
        'You do not have permission to view legal petitions'
      )
    }

    const adminRoleData = adminRoleDoc.data()
    const roles = adminRoleData?.roles || []
    if (!roles.includes('safety-team') && !roles.includes('admin')) {
      throw new HttpsError(
        'permission-denied',
        'Only safety team members can view legal petitions'
      )
    }

    // Validate input
    const parseResult = getLegalPetitionInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError(
        'invalid-argument',
        'Invalid input data',
        parseResult.error.flatten()
      )
    }

    const { petitionId } = parseResult.data

    try {
      const petitionDoc = await db.doc(`legalPetitions/${petitionId}`).get()

      if (!petitionDoc.exists) {
        throw new HttpsError('not-found', 'Petition not found')
      }

      const data = petitionDoc.data()!

      // Return full petition details
      const petition = {
        id: petitionDoc.id,
        referenceNumber: data.referenceNumber,
        petitionerName: data.petitionerName,
        petitionerEmail: data.petitionerEmail,
        petitionerPhone: data.petitionerPhone || null,
        childName: data.childName,
        childDOB: data.childDOB,
        claimedRelationship: data.claimedRelationship,
        message: data.message,
        status: data.status,
        submittedAt: data.submittedAt,
        updatedAt: data.updatedAt,
        documents: (data.documents || []).map(
          (doc: {
            id: string
            fileName: string
            fileType: string
            storagePath: string
            uploadedAt: Date
            sizeBytes: number
          }) => ({
            id: doc.id,
            fileName: doc.fileName,
            fileType: doc.fileType,
            storagePath: doc.storagePath,
            uploadedAt: doc.uploadedAt,
            sizeBytes: doc.sizeBytes,
            // Note: In production, generate signed URLs for document access
            signedUrl: null,
          })
        ),
        targetFamilyId: data.targetFamilyId || null,
        assignedTo: data.assignedTo || null,
        internalNotes: data.internalNotes || [],
        statusHistory: data.statusHistory || [],
        supportMessageToUser: data.supportMessageToUser || null,
      }

      return {
        success: true,
        petition,
      }
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error
      }
      console.error('Error getting legal petition:', error)
      throw new HttpsError(
        'internal',
        'Failed to get petition details. Please try again.'
      )
    }
  }
)
