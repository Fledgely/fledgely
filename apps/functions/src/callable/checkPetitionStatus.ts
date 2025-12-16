import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import {
  checkPetitionStatusInputSchema,
  getPetitionStatusLabel,
} from '@fledgely/contracts'

/**
 * Callable Cloud Function: checkPetitionStatus
 *
 * Story 3.6: Legal Parent Petition for Access - Task 4
 *
 * Allows petitioners to check the status of their submitted petition
 * using their reference number and email for verification.
 *
 * CRITICAL SECURITY REQUIREMENTS:
 * 1. NEVER return internal notes (support-only)
 * 2. NEVER return support agent IDs (updatedBy field)
 * 3. NEVER return target family ID
 * 4. NEVER return assignedTo field
 * 5. Only return public-facing information
 * 6. Verify both reference number AND email match
 */
export const checkPetitionStatus = onCall(
  {
    // No authentication required - petitioners check via reference number + email
    enforceAppCheck: false,
  },
  async (request) => {
    const db = getFirestore()

    // Validate input
    const parseResult = checkPetitionStatusInputSchema.safeParse(request.data)

    if (!parseResult.success) {
      throw new HttpsError(
        'invalid-argument',
        'Invalid input data',
        parseResult.error.flatten()
      )
    }

    const { referenceNumber, petitionerEmail } = parseResult.data

    // Query by BOTH reference number AND email for security
    // This prevents enumeration attacks
    const querySnapshot = await db
      .collection('legalPetitions')
      .where('referenceNumber', '==', referenceNumber)
      .where('petitionerEmail', '==', petitionerEmail)
      .get()

    if (querySnapshot.empty) {
      // Return not found - don't reveal whether reference exists
      // This prevents information leakage about valid reference numbers
      return {
        found: false,
        errorCode: 'petition-not-found',
        message: 'No petition found with the provided reference number and email combination.',
      }
    }

    const petitionDoc = querySnapshot.docs[0]
    const petition = petitionDoc.data()

    // Extract public support messages from status history notes
    // CRITICAL: Only extract the 'note' field, NOT 'updatedBy' or other internal fields
    const supportMessages: string[] = []
    if (petition.statusHistory && Array.isArray(petition.statusHistory)) {
      for (const entry of petition.statusHistory) {
        if (entry.note && typeof entry.note === 'string') {
          supportMessages.push(entry.note)
        }
      }
    }

    // Return ONLY public-facing information
    // CRITICAL: Never include internal notes, agent IDs, family IDs, or assignedTo
    return {
      found: true,
      status: petition.status,
      statusLabel: getPetitionStatusLabel(petition.status),
      submittedAt: petition.submittedAt?.toDate?.()?.toISOString() || null,
      lastUpdatedAt: petition.updatedAt?.toDate?.()?.toISOString() || null,
      supportMessages,
      // Deliberately NOT including:
      // - internalNotes (support-only)
      // - assignedTo (support-only)
      // - targetFamilyId (sensitive)
      // - statusHistory full entries (contains updatedBy)
    }
  }
)
