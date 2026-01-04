/**
 * Account Deletion Requested email template.
 *
 * Story 51.4: Account Deletion Flow - AC7
 *
 * Sent when an account deletion request is created, confirming:
 * - Request received
 * - Cooling off period
 * - Impact on family members
 * - How to cancel
 */

import * as logger from 'firebase-functions/logger'
import { Resend } from 'resend'
import { ACCOUNT_DELETION_CONFIG } from '@fledgely/shared'

let resendClient: Resend | null = null

const getResendClient = (): Resend | null => {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  if (!resendClient) {
    resendClient = new Resend(apiKey)
  }
  return resendClient
}

const getFromEmail = (): string =>
  process.env.RESEND_FROM_EMAIL || 'fledgely <notifications@fledgely.com>'

export interface AccountDeletionRequestedEmailParams {
  to: string
  deletionId: string
  coolingOffEndsAt: number
  affectedUserCount: number
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function getDaysUntilDeletion(coolingOffEndsAt: number): number {
  const now = Date.now()
  const diff = coolingOffEndsAt - now
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function buildAccountDeletionRequestedEmailHtml(
  params: AccountDeletionRequestedEmailParams
): string {
  const formattedDate = formatDate(params.coolingOffEndsAt)
  const daysRemaining = getDaysUntilDeletion(params.coolingOffEndsAt)

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fledgely Account Deletion Request Received</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 30px 40px 20px 40px; text-align: center; border-bottom: 1px solid #e5e7eb;">
              <span style="font-size: 24px; font-weight: 700; color: #7c3aed;">fledgely</span>
            </td>
          </tr>

          <tr>
            <td style="padding: 30px 40px 10px 40px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #1f2937; line-height: 1.3;">
                Account Deletion Request Received
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <p style="margin: 0; font-size: 16px; color: #4b5563; line-height: 1.6;">
                We've received your request to delete your entire Fledgely account. This will permanently delete all data AND all associated user accounts after a ${ACCOUNT_DELETION_CONFIG.COOLING_OFF_DAYS}-day cooling off period.
              </p>
            </td>
          </tr>

          <!-- Impact warning -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <div style="padding: 16px; background-color: #fef2f2; border-radius: 8px; border-left: 4px solid #ef4444;">
                <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #991b1b;">
                  This affects all family members
                </p>
                <p style="margin: 0; font-size: 14px; color: #991b1b;">
                  ${params.affectedUserCount} account${params.affectedUserCount !== 1 ? 's' : ''} will be permanently deleted including all guardians and any linked child profiles.
                </p>
              </div>
            </td>
          </tr>

          <!-- Countdown info -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <div style="padding: 20px; background-color: #fef3c7; border-radius: 8px; border: 1px solid #fcd34d; text-align: center;">
                <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #92400e;">
                  Time remaining to cancel
                </p>
                <p style="margin: 0; font-size: 32px; font-weight: 700; color: #b45309;">
                  ${daysRemaining} days
                </p>
                <p style="margin: 8px 0 0 0; font-size: 13px; color: #92400e;">
                  Deletion scheduled for: ${formattedDate}
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <div style="padding: 16px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                <p style="margin: 0; font-size: 14px; color: #6b7280;">
                  <strong>Reference ID:</strong> ${params.deletionId}
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #1f2937;">
                Changed your mind?
              </p>
              <p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.6;">
                You can cancel this account deletion request at any time during the cooling off period by going to:
              </p>
              <p style="margin: 12px 0 0 0; font-size: 14px; color: #4b5563;">
                <strong>Settings &rarr; Data & Privacy &rarr; Cancel Account Deletion</strong>
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                <strong>Didn't request this?</strong> If you did not request account deletion, please sign into your Fledgely account immediately and cancel this request.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 20px 40px 30px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 1.5;">
                Family members have been notified about this pending account deletion.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim()
}

function buildAccountDeletionRequestedEmailText(
  params: AccountDeletionRequestedEmailParams
): string {
  const formattedDate = formatDate(params.coolingOffEndsAt)
  const daysRemaining = getDaysUntilDeletion(params.coolingOffEndsAt)

  return `
FLEDGELY ACCOUNT DELETION REQUEST RECEIVED

We've received your request to delete your entire Fledgely account. This will permanently delete all data AND all associated user accounts after a ${ACCOUNT_DELETION_CONFIG.COOLING_OFF_DAYS}-day cooling off period.

THIS AFFECTS ALL FAMILY MEMBERS
${params.affectedUserCount} account(s) will be permanently deleted including all guardians and any linked child profiles.

TIME REMAINING TO CANCEL: ${daysRemaining} days
Deletion scheduled for: ${formattedDate}

Reference ID: ${params.deletionId}

CHANGED YOUR MIND?
You can cancel this account deletion request at any time during the cooling off period by going to:
Settings -> Data & Privacy -> Cancel Account Deletion

DIDN'T REQUEST THIS?
If you did not request account deletion, please sign into your Fledgely account immediately and cancel this request.

---
Family members have been notified about this pending account deletion.
`.trim()
}

export async function sendAccountDeletionRequestedEmail(
  params: AccountDeletionRequestedEmailParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { to } = params

  const htmlContent = buildAccountDeletionRequestedEmailHtml(params)
  const textContent = buildAccountDeletionRequestedEmailText(params)
  const subject = 'Your Fledgely account deletion request has been received'

  const client = getResendClient()

  if (!client) {
    logger.info('[DEV] Account deletion requested email would be sent', {
      subject,
      deletionId: params.deletionId,
      affectedUserCount: params.affectedUserCount,
    })
    return { success: true, messageId: `dev-${Date.now()}` }
  }

  try {
    const { data, error } = await client.emails.send({
      from: getFromEmail(),
      to,
      subject,
      html: htmlContent,
      text: textContent,
    })

    if (error) {
      logger.error('Resend API error for account deletion requested email', {
        error: error.message,
      })
      return { success: false, error: error.message }
    }

    logger.info('Account deletion requested email sent successfully', { messageId: data?.id })
    return { success: true, messageId: data?.id }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    logger.error('Email service error for account deletion requested', { error: errorMessage })
    return { success: false, error: errorMessage }
  }
}

export function _resetClientForTesting(): void {
  resendClient = null
}
