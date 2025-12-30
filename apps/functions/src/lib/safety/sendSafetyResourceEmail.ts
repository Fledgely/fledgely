/**
 * Safety Resource Email Service
 *
 * Story 0.5.9: Domestic Abuse Resource Referral
 *
 * CRITICAL SAFETY DESIGN:
 * - Sends resource email to SAFE contact address (not account email)
 * - NO fledgely branding in email content
 * - Neutral subject line for victim safety
 * - Logs only to adminAuditLogs (NOT family audit)
 * - Email failure does NOT fail parent severing operation
 *
 * This service is called immediately after successful escape completion
 * to provide victims with immediate access to safety resources.
 */

import { getFirestore, Firestore } from 'firebase-admin/firestore'
import { Resend } from 'resend'
import { createHash } from 'crypto'
import { logAdminAction } from '../../utils/adminAudit'
import {
  generateSafetyResourceEmailHtml,
  generateSafetyResourceEmailText,
  SAFETY_RESOURCE_EMAIL_SUBJECT,
} from '../../templates/safetyResourceEmail'

// Lazy initialization to support mocking in tests
let db: Firestore | null = null
function getDb(): Firestore {
  if (!db) {
    db = getFirestore()
  }
  return db
}

/**
 * Reset the database instance (for testing only).
 * @internal
 */
export function _resetDbForTesting(): void {
  db = null
}

/**
 * Result of sending a safety resource email.
 */
export interface SendSafetyResourceEmailResult {
  /** Whether the email was sent successfully */
  success: boolean
  /** Email ID from Resend (if successful) */
  messageId?: string
  /** Error message (if failed) */
  error?: string
  /** Whether the email was skipped (e.g., no safe email provided) */
  skipped?: boolean
  /** Reason for skipping (if skipped) */
  skipReason?: string
}

/**
 * Parameters for sending a safety resource email.
 */
export interface SendSafetyResourceEmailParams {
  /** Safety ticket ID to retrieve safe contact email */
  ticketId: string
  /** Agent ID performing the action (for audit logging) */
  agentId: string
  /** Agent email (for audit logging) */
  agentEmail: string | null
  /** IP address (for audit logging) */
  ipAddress?: string | null
}

/**
 * Hash an email address for audit logging.
 * Uses truncated SHA-256 to prevent storing actual email addresses.
 */
function hashEmailForAudit(email: string): string {
  return createHash('sha256').update(email.toLowerCase()).digest('hex').substring(0, 16)
}

/**
 * Get the Resend client instance.
 */
function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is not configured')
  }
  return new Resend(apiKey)
}

/**
 * Get the sender email address.
 * Uses a neutral sender name to avoid identifying the source.
 */
function getSenderEmail(): string {
  // Use a neutral sender name instead of "fledgely"
  return process.env.SAFETY_RESOURCE_FROM_EMAIL || 'Support <noreply@fledgely.com>'
}

/**
 * Send safety resource email to the victim's safe contact address.
 *
 * CRITICAL: This function:
 * - Retrieves safe email from the safety ticket (NOT account email)
 * - Sends resource email with NO fledgely branding
 * - Logs only to adminAuditLogs (NOT family audit)
 * - Returns gracefully on failure (never throws)
 *
 * @param params - Parameters including ticketId and agent info
 * @returns Result indicating success, failure, or skip
 */
export async function sendSafetyResourceEmail(
  params: SendSafetyResourceEmailParams
): Promise<SendSafetyResourceEmailResult> {
  const { ticketId, agentId, agentEmail, ipAddress } = params

  try {
    // 1. Retrieve ticket to get safe contact email
    const ticketDoc = await getDb().collection('safetyTickets').doc(ticketId).get()

    if (!ticketDoc.exists) {
      // Log the failure
      await logAdminAction({
        agentId,
        agentEmail,
        action: 'send_safety_resource_email',
        resourceType: 'safety_resource_email',
        resourceId: ticketId,
        metadata: {
          status: 'failed',
          error: 'Ticket not found',
        },
        ipAddress,
      })

      return {
        success: false,
        error: 'Safety ticket not found',
      }
    }

    const ticketData = ticketDoc.data()
    const safeContactInfo = ticketData?.safeContactInfo

    // 2. Check if safe email exists (treat empty string as missing)
    const safeEmail = safeContactInfo?.email?.trim()

    if (!safeEmail) {
      // Skip sending - no safe email provided
      // Log for admin review
      await logAdminAction({
        agentId,
        agentEmail,
        action: 'send_safety_resource_email',
        resourceType: 'safety_resource_email',
        resourceId: ticketId,
        metadata: {
          status: 'skipped',
          reason: 'No safe contact email provided',
        },
        ipAddress,
      })

      return {
        success: false,
        skipped: true,
        skipReason: 'No safe contact email provided in ticket',
      }
    }

    // 3. Generate email content
    const htmlContent = generateSafetyResourceEmailHtml()
    const textContent = generateSafetyResourceEmailText()

    // 4. Send email via Resend
    const resend = getResendClient()
    const { data, error } = await resend.emails.send({
      from: getSenderEmail(),
      to: safeEmail,
      subject: SAFETY_RESOURCE_EMAIL_SUBJECT,
      html: htmlContent,
      text: textContent,
    })

    if (error) {
      // Log the failure
      await logAdminAction({
        agentId,
        agentEmail,
        action: 'send_safety_resource_email',
        resourceType: 'safety_resource_email',
        resourceId: ticketId,
        metadata: {
          status: 'failed',
          error: error.message || 'Resend API error',
          recipientHash: hashEmailForAudit(safeEmail),
        },
        ipAddress,
      })

      return {
        success: false,
        error: 'Failed to send safety resource email',
      }
    }

    // 5. Log success
    await logAdminAction({
      agentId,
      agentEmail,
      action: 'send_safety_resource_email',
      resourceType: 'safety_resource_email',
      resourceId: ticketId,
      metadata: {
        status: 'sent',
        messageId: data?.id,
        recipientHash: hashEmailForAudit(safeEmail),
      },
      ipAddress,
    })

    return {
      success: true,
      messageId: data?.id,
    }
  } catch (err) {
    // Log unexpected error
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'

    try {
      await logAdminAction({
        agentId,
        agentEmail,
        action: 'send_safety_resource_email',
        resourceType: 'safety_resource_email',
        resourceId: ticketId,
        metadata: {
          status: 'failed',
          error: errorMessage,
        },
        ipAddress,
      })
    } catch (logError) {
      // Silently fail audit logging - don't break the flow
      console.error('Failed to log safety resource email error:', logError)
    }

    return {
      success: false,
      error: errorMessage,
    }
  }
}
