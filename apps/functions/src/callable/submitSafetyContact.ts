/**
 * Cloud Function for submitting safety contact requests.
 *
 * Story 0.5.1: Secure Safety Contact Channel
 *
 * CRITICAL SAFETY DESIGN:
 * This function handles submissions from potential domestic abuse victims.
 * The primary design goal is INVISIBILITY to abusers.
 *
 * Key protections:
 * - NO audit log entries created (unlike normal operations)
 * - NO notifications sent to family members
 * - familyId is intentionally NOT populated
 * - Data stored in isolated /safetyTickets collection
 * - Rate limiting to prevent abuse while allowing legitimate requests
 * - Works for both authenticated and unauthenticated users
 *
 * Implements acceptance criteria:
 * - AC3: Form does NOT log to family audit trail
 * - AC5: Submission creates ticket in safety queue
 * - AC6: Form submission encrypted at rest and in transit
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { createHash } from 'crypto'
import { z } from 'zod'

const db = getFirestore()

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const RATE_LIMIT_MAX = 5 // Max 5 submissions per hour per IP

// Input validation schema - duplicated from contracts for Cloud Functions
// (Cloud Functions can't currently use workspace packages directly)
const safeContactInfoSchema = z
  .object({
    phone: z.string().nullable(),
    email: z.string().email().nullable(),
    preferredMethod: z.enum(['phone', 'email', 'either']).nullable(),
    safeTimeToContact: z.string().max(200).nullable(),
  })
  .nullable()

const safetyContactUrgencySchema = z.enum(['when_you_can', 'soon', 'urgent'])

const safetyContactInputSchema = z.object({
  message: z.string().min(1).max(5000),
  safeContactInfo: safeContactInfoSchema,
  urgency: safetyContactUrgencySchema.default('when_you_can'),
})

// Response type
interface SubmitSafetyContactResponse {
  success: boolean
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
 * Check rate limiting for safety contact submissions.
 * Returns true if the request is allowed, false if rate limited.
 */
async function checkRateLimit(ipHash: string): Promise<boolean> {
  const rateLimitRef = db.collection('safetyRateLimits').doc(ipHash)
  const now = Date.now()
  const windowStart = now - RATE_LIMIT_WINDOW_MS

  try {
    const doc = await rateLimitRef.get()

    if (!doc.exists) {
      // First request from this IP
      await rateLimitRef.set({
        submissions: [Timestamp.fromMillis(now)],
        lastSubmission: FieldValue.serverTimestamp(),
      })
      return true
    }

    const data = doc.data()
    if (!data) return true

    // Filter submissions within the current window
    const submissions: Timestamp[] = data.submissions || []
    const recentSubmissions = submissions.filter((ts: Timestamp) => ts.toMillis() > windowStart)

    if (recentSubmissions.length >= RATE_LIMIT_MAX) {
      return false // Rate limited
    }

    // Add new submission timestamp
    await rateLimitRef.update({
      submissions: [...recentSubmissions, Timestamp.fromMillis(now)],
      lastSubmission: FieldValue.serverTimestamp(),
    })

    return true
  } catch (error) {
    // On error, allow the request (fail open for safety)
    console.error('Rate limit check failed:', error)
    return true
  }
}

/**
 * Submit a safety contact request.
 *
 * This function can be called by:
 * - Authenticated users (logged in)
 * - Unauthenticated users (from login page)
 *
 * CRITICAL: This function intentionally does NOT:
 * - Create audit log entries
 * - Send notifications to family members
 * - Look up or store familyId
 */
export const submitSafetyContact = onCall<
  z.infer<typeof safetyContactInputSchema>,
  Promise<SubmitSafetyContactResponse>
>(
  {
    cors: true,
    // Allow unauthenticated requests (AC1: accessible from login screen)
  },
  async (request) => {
    // 1. Validation (no auth required - AC1)
    const parseResult = safetyContactInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Please provide a valid message')
    }
    const { message, safeContactInfo, urgency } = parseResult.data

    // 2. Rate limiting by hashed IP
    const rawIp = request.rawRequest?.ip || 'unknown'
    const ipHash = hashIp(rawIp)

    const isAllowed = await checkRateLimit(ipHash)
    if (!isAllowed) {
      throw new HttpsError(
        'resource-exhausted',
        'Please wait before submitting again. Your request will be processed shortly.'
      )
    }

    // 3. Get user context if logged in (for support team identification only)
    // CRITICAL: Do NOT look up familyId - prevents data linkage
    const userId = request.auth?.uid || null
    const userEmail = request.auth?.token?.email || null

    // 4. Create ticket in isolated collection
    // CRITICAL: This collection is separate from all family data
    const ticketRef = db.collection('safetyTickets').doc()
    const ticketData = {
      id: ticketRef.id,
      message,
      safeContactInfo,
      urgency,
      userId,
      userEmail,
      familyId: null, // CRITICAL: Intentionally NOT populated for data isolation
      createdAt: FieldValue.serverTimestamp(),
      ipHash,
      userAgent: request.rawRequest?.headers?.['user-agent'] || null,
      status: 'pending',
      assignedTo: null,
    }

    await ticketRef.set(ticketData)

    // CRITICAL: NO audit log entry (AC3)
    // CRITICAL: NO notification to family members (AC3)

    // 5. Return neutral success message
    // Message is intentionally generic and calming
    return {
      success: true,
      message:
        'Your message has been received. We will contact you using the information provided.',
    }
  }
)
