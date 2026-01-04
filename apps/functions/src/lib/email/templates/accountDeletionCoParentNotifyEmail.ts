/**
 * Co-Parent Account Deletion Notification email template.
 *
 * Story 51.4: Account Deletion Flow - AC4
 *
 * Sent to other parent when account deletion is initiated.
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

export interface CoParentNotifyEmailParams {
  to: string
  requestedByName: string
  coolingOffEndsAt: number
  deletionId: string
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

function buildCoParentNotifyEmailHtml(params: CoParentNotifyEmailParams): string {
  const formattedDate = formatDate(params.coolingOffEndsAt)
  const daysRemaining = getDaysUntilDeletion(params.coolingOffEndsAt)

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Important: Family Fledgely Account Will Be Deleted</title>
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
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #dc2626; line-height: 1.3;">
                Important: Family Account Will Be Deleted
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <p style="margin: 0; font-size: 16px; color: #4b5563; line-height: 1.6;">
                ${params.requestedByName} has requested to delete your family's Fledgely account. This includes all data and user accounts for all family members.
              </p>
            </td>
          </tr>

          <!-- Impact warning -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <div style="padding: 16px; background-color: #fef2f2; border-radius: 8px; border-left: 4px solid #ef4444;">
                <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #991b1b;">
                  What this means for you
                </p>
                <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #991b1b;">
                  <li>Your Fledgely account will be permanently deleted</li>
                  <li>All family data including agreements, screenshots, and settings will be removed</li>
                  <li>You will not be able to recover this data</li>
                </ul>
              </div>
            </td>
          </tr>

          <!-- Countdown info -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <div style="padding: 20px; background-color: #fef3c7; border-radius: 8px; border: 1px solid #fcd34d; text-align: center;">
                <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #92400e;">
                  Deletion scheduled in
                </p>
                <p style="margin: 0; font-size: 32px; font-weight: 700; color: #b45309;">
                  ${daysRemaining} days
                </p>
                <p style="margin: 8px 0 0 0; font-size: 13px; color: #92400e;">
                  Deletion will occur: ${formattedDate}
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #1f2937;">
                Have concerns?
              </p>
              <p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.6;">
                The ${ACCOUNT_DELETION_CONFIG.COOLING_OFF_DAYS}-day cooling off period gives you time to discuss this decision with your co-parent. If you have concerns about this deletion, please contact them directly.
              </p>
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
            <td style="padding: 0 40px 30px 40px;">
              <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                If you believe this request was made in error or without your knowledge, please contact Fledgely support immediately.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 20px 40px 30px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 1.5;">
                This notification was sent because your co-parent initiated an account deletion request.
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

function buildCoParentNotifyEmailText(params: CoParentNotifyEmailParams): string {
  const formattedDate = formatDate(params.coolingOffEndsAt)
  const daysRemaining = getDaysUntilDeletion(params.coolingOffEndsAt)

  return `
IMPORTANT: FAMILY FLEDGELY ACCOUNT WILL BE DELETED

${params.requestedByName} has requested to delete your family's Fledgely account. This includes all data and user accounts for all family members.

WHAT THIS MEANS FOR YOU:
- Your Fledgely account will be permanently deleted
- All family data including agreements, screenshots, and settings will be removed
- You will not be able to recover this data

DELETION SCHEDULED IN: ${daysRemaining} days
Deletion will occur: ${formattedDate}

Reference ID: ${params.deletionId}

HAVE CONCERNS?
The ${ACCOUNT_DELETION_CONFIG.COOLING_OFF_DAYS}-day cooling off period gives you time to discuss this decision with your co-parent. If you have concerns about this deletion, please contact them directly.

If you believe this request was made in error or without your knowledge, please contact Fledgely support immediately.

---
This notification was sent because your co-parent initiated an account deletion request.
`.trim()
}

export async function sendCoParentNotifyEmail(
  params: CoParentNotifyEmailParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { to } = params

  const htmlContent = buildCoParentNotifyEmailHtml(params)
  const textContent = buildCoParentNotifyEmailText(params)
  const subject = 'Important: Family Fledgely account will be deleted'

  const client = getResendClient()

  if (!client) {
    logger.info('[DEV] Co-parent account deletion notify email would be sent', {
      subject,
      deletionId: params.deletionId,
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
      logger.error('Resend API error for co-parent notify email', { error: error.message })
      return { success: false, error: error.message }
    }

    logger.info('Co-parent account deletion notify email sent', { messageId: data?.id })
    return { success: true, messageId: data?.id }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    logger.error('Email service error for co-parent notify', { error: errorMessage })
    return { success: false, error: errorMessage }
  }
}

export function _resetClientForTesting(): void {
  resendClient = null
}
