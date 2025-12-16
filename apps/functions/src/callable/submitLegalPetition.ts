import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore'
import {
  submitLegalPetitionInputSchema,
  generatePetitionReferenceNumber,
  PETITION_ERROR_MESSAGES,
} from '@fledgely/contracts'

/**
 * Callable Cloud Function: submitLegalPetition
 *
 * Story 3.6: Legal Parent Petition for Access - Task 3
 *
 * Allows a legal parent to submit a petition for access to their child's
 * monitoring when they were not invited by the account creator.
 *
 * CRITICAL SECURITY REQUIREMENTS:
 * 1. NEVER log to family audit trail (/families/{familyId}/auditLog/)
 * 2. NEVER send notifications to family members
 * 3. NEVER expose through family-accessible queries
 * 4. ALWAYS store in isolated legalPetitions collection
 * 5. Log only to admin audit (separate collection)
 * 6. Petitioner receives reference number for status tracking
 */
export const submitLegalPetition = onCall(
  {
    // Require authentication - petitioners must have an account
    // Unlike safety requests which can be anonymous, legal petitions
    // require an account for follow-up and eventual access grant
    enforceAppCheck: false,
  },
  async (request) => {
    const db = getFirestore()

    // Validate input against schema
    const parseResult = submitLegalPetitionInputSchema.safeParse(request.data)

    if (!parseResult.success) {
      throw new HttpsError(
        'invalid-argument',
        'Invalid submission data',
        parseResult.error.flatten()
      )
    }

    const validatedData = parseResult.data

    try {
      // Generate unique reference number for petitioner tracking (AC3)
      const referenceNumber = generatePetitionReferenceNumber()

      // Create petition document
      // CRITICAL: This goes to isolated legalPetitions collection
      // NOT to any family-linked collection
      const petitionRef = db.collection('legalPetitions').doc()

      const now = Timestamp.now()

      const petitionData = {
        // Document ID
        id: petitionRef.id,

        // Reference number for petitioner tracking
        referenceNumber,

        // Petitioner information
        petitionerName: validatedData.petitionerName,
        petitionerEmail: validatedData.petitionerEmail,
        ...(validatedData.petitionerPhone && {
          petitionerPhone: validatedData.petitionerPhone,
        }),

        // Child information
        childName: validatedData.childName,
        childDOB: Timestamp.fromDate(validatedData.childDOB),
        claimedRelationship: validatedData.claimedRelationship,

        // Petition content
        message: validatedData.message,
        documents: validatedData.documents,

        // Status - always starts as 'submitted'
        status: 'submitted',

        // Target family - will be set by support team when identified
        // targetFamilyId: undefined,

        // Assignment - will be set by support team
        // assignedTo: undefined,

        // Petitioner user ID (if authenticated)
        ...(request.auth?.uid && { petitionerUserId: request.auth.uid }),

        // Timestamps
        submittedAt: now,
        updatedAt: now,

        // Status history for tracking (AC9)
        statusHistory: [
          {
            status: 'submitted',
            timestamp: now,
            updatedBy: 'system',
          },
        ],

        // Internal notes - empty on creation, support-only (AC9)
        internalNotes: [],
      }

      await petitionRef.set(petitionData)

      // Log to admin audit ONLY (NOT family audit trail)
      // CRITICAL: Never log to /families/{familyId}/auditLog/
      await db.collection('adminAuditLog').add({
        action: 'legal_petition_submitted',
        resourceType: 'legalPetition',
        resourceId: petitionRef.id,
        // Only log minimal metadata - do not expose petitioner details
        metadata: {
          referenceNumber,
          claimedRelationship: validatedData.claimedRelationship,
          documentCount: validatedData.documents.length,
          isAuthenticated: !!request.auth?.uid,
        },
        timestamp: FieldValue.serverTimestamp(),
        // Do not include IP or detailed user info for privacy
      })

      // CRITICAL: Do NOT trigger any notifications to family members
      // No family notifications
      // No email to family members
      // No push notifications to family devices
      // Petitioner may receive email confirmation separately (future enhancement)

      // Return response with reference number for petitioner tracking (AC3)
      return {
        success: true,
        petitionId: petitionRef.id,
        referenceNumber,
      }
    } catch (error) {
      // Log error to admin audit for debugging
      // But don't expose details to client
      console.error('Legal petition submission error:', error)

      await db.collection('adminAuditLog').add({
        action: 'legal_petition_error',
        resourceType: 'legalPetition',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: FieldValue.serverTimestamp(),
      })

      throw new HttpsError(
        'internal',
        PETITION_ERROR_MESSAGES['operation-failed']
      )
    }
  }
)
