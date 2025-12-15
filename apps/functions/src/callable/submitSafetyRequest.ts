import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore'
import { safetyRequestInputSchema } from '@fledgely/contracts'

/**
 * Callable Cloud Function: submitSafetyRequest
 *
 * CRITICAL: This is a life-safety feature for victims escaping abuse.
 *
 * Security invariants that MUST be maintained:
 * 1. NEVER log to family audit trail (/children/{childId}/auditLog/)
 * 2. NEVER send notifications to family members
 * 3. NEVER expose through family-accessible queries
 * 4. ALWAYS store in isolated safetyRequests collection
 * 5. Log only to admin audit (separate collection)
 */
export const submitSafetyRequest = onCall(
  {
    // Allow unauthenticated calls - victims may not be logged in
    // or may be using someone else's device
    enforceAppCheck: false,
  },
  async (request) => {
    const db = getFirestore()

    // Validate input against schema
    const parseResult = safetyRequestInputSchema.safeParse(request.data)

    if (!parseResult.success) {
      throw new HttpsError(
        'invalid-argument',
        'Invalid submission data',
        parseResult.error.flatten()
      )
    }

    const validatedData = parseResult.data

    try {
      // Create safety request document
      // CRITICAL: This goes to isolated safetyRequests collection
      // NOT to any family-linked collection
      const safetyRequestRef = db.collection('safetyRequests').doc()

      const safetyRequestData = {
        message: validatedData.message,
        // Only include optional fields if they have values
        ...(validatedData.safeEmail &&
          validatedData.safeEmail.trim() !== '' && {
            safeEmail: validatedData.safeEmail,
          }),
        ...(validatedData.safePhone &&
          validatedData.safePhone.trim() !== '' && {
            safePhone: validatedData.safePhone,
          }),
        // Include user ID only if authenticated (allow anonymous)
        ...(request.auth?.uid && { submittedBy: request.auth.uid }),
        submittedAt: Timestamp.now(),
        source: validatedData.source,
        status: 'pending',
      }

      await safetyRequestRef.set(safetyRequestData)

      // Log to admin audit ONLY (NOT family audit trail)
      // CRITICAL: Never log to /children/{childId}/auditLog/
      await db.collection('adminAuditLog').add({
        action: 'safety_request_submitted',
        resourceType: 'safetyRequest',
        resourceId: safetyRequestRef.id,
        // Only log that a request was submitted, not the content
        // to minimize exposure even in admin logs
        metadata: {
          source: validatedData.source,
          hasEmail: !!validatedData.safeEmail,
          hasPhone: !!validatedData.safePhone,
          isAuthenticated: !!request.auth?.uid,
        },
        timestamp: FieldValue.serverTimestamp(),
        // Do not include IP or detailed user info for victim protection
      })

      // CRITICAL: Do NOT trigger any notifications
      // No family notifications
      // No email to family members
      // No push notifications to family devices

      // Return response with requestId for document uploads
      // The requestId is needed to attach documents to this request
      return { success: true, requestId: safetyRequestRef.id }
    } catch (error) {
      // Log error to admin audit for debugging
      // But don't expose details to client
      console.error('Safety request submission error:', error)

      await db.collection('adminAuditLog').add({
        action: 'safety_request_error',
        resourceType: 'safetyRequest',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: FieldValue.serverTimestamp(),
      })

      throw new HttpsError(
        'internal',
        'Unable to process your request. Please try again or contact support directly.'
      )
    }
  }
)
