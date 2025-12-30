/**
 * Cloud Function for submitting safety contact requests.
 *
 * Story 0.5.1: Secure Safety Contact Channel
 * Story 3.6: Legal Parent Petition for Access
 *
 * CRITICAL SAFETY DESIGN:
 * This function handles submissions from potential domestic abuse victims
 * AND legal parent petitions for access.
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
 * - Story 3.6 AC1: Petition type creates ticket with type='legal_parent_petition'
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { createHash } from 'crypto'
import { z } from 'zod'

const db = getFirestore()

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const RATE_LIMIT_MAX = 5 // Max 5 submissions per hour per IP

// Story 3.6: SLA configuration
const PETITION_SLA_BUSINESS_DAYS = 5

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

// Story 3.6: Safety ticket type schema
const safetyTicketTypeSchema = z.enum(['safety_request', 'legal_parent_petition'])

// Story 3.6: Legal parent petition info schema
const legalParentPetitionInfoSchema = z
  .object({
    childName: z.string().min(1).max(100),
    childBirthdate: z.string().nullable(),
    relationshipClaim: z.enum(['biological_parent', 'adoptive_parent', 'legal_guardian']),
    existingParentEmail: z.string().email().nullable(),
    courtOrderReference: z.string().max(200).nullable(),
  })
  .nullable()

const safetyContactInputSchema = z.object({
  // Story 3.6: Ticket type - defaults to safety_request
  type: safetyTicketTypeSchema.default('safety_request'),
  message: z.string().min(1).max(5000),
  safeContactInfo: safeContactInfoSchema,
  urgency: safetyContactUrgencySchema.default('when_you_can'),
  // Story 3.6: Legal parent petition specific fields
  petitionInfo: legalParentPetitionInfoSchema,
})

/**
 * Calculate SLA deadline in business days from a start date.
 *
 * Story 3.6: Legal Parent Petition for Access - AC7
 * Excludes weekends (Saturday and Sunday).
 */
function calculateBusinessDayDeadline(startDate: Date, businessDays: number): Date {
  const result = new Date(startDate)
  let daysAdded = 0

  while (daysAdded < businessDays) {
    result.setDate(result.getDate() + 1)
    const dayOfWeek = result.getDay()
    // Skip Saturday (6) and Sunday (0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++
    }
  }

  return result
}

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
    const { type, message, safeContactInfo, urgency, petitionInfo } = parseResult.data

    // Story 3.6: Validate petition-specific requirements
    if (type === 'legal_parent_petition') {
      if (!petitionInfo) {
        throw new HttpsError('invalid-argument', 'Legal parent petitions require child information')
      }
      if (!safeContactInfo?.email) {
        throw new HttpsError('invalid-argument', 'Legal parent petitions require a contact email')
      }
    }

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

    // 4. Calculate SLA deadline for petitions (Story 3.6 AC7)
    const now = new Date()
    const slaDeadline =
      type === 'legal_parent_petition'
        ? Timestamp.fromDate(calculateBusinessDayDeadline(now, PETITION_SLA_BUSINESS_DAYS))
        : null

    // 5. Create ticket in isolated collection
    // CRITICAL: This collection is separate from all family data
    const ticketRef = db.collection('safetyTickets').doc()
    const ticketData = {
      id: ticketRef.id,
      type, // Story 3.6: Ticket type
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
      // Story 3.6: Verification tracking (starts empty, agent updates)
      verification: null,
      // Story 3.6: Petition-specific fields
      petitionInfo: petitionInfo || null,
      slaDeadline,
      denialReason: null,
      deniedAt: null,
      deniedByAgentId: null,
      grantedAt: null,
      grantedByAgentId: null,
      grantedFamilyId: null,
    }

    await ticketRef.set(ticketData)

    // CRITICAL: NO audit log entry (AC3)
    // CRITICAL: NO notification to family members (AC3)

    // 6. Return neutral success message
    // Message is intentionally generic and calming
    const responseMessage =
      type === 'legal_parent_petition'
        ? 'Your petition has been received. We will review it and contact you at the email provided.'
        : 'Your message has been received. We will contact you using the information provided.'

    return {
      success: true,
      message: responseMessage,
    }
  }
)
