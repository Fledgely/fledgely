/**
 * Account Deletion Complete email template.
 *
 * Story 51.4: Account Deletion Flow - AC11
 *
 * Sent when account deletion is complete.
 */

import * as logger from 'firebase-functions/logger'
import { Resend } from 'resend'

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

export interface AccountDeletionCompleteEmailParams {
  to: string
  deletionId: string
}

function buildAccountDeletionCompleteEmailHtml(params: AccountDeletionCompleteEmailParams): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Fledgely Account Has Been Deleted</title>
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
                Your Fledgely Account Has Been Deleted
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <p style="margin: 0; font-size: 16px; color: #4b5563; line-height: 1.6;">
                Your Fledgely account and all associated data have been permanently deleted. This action is complete and irreversible.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <div style="padding: 16px; background-color: #f0fdf4; border-radius: 8px; border: 1px solid #86efac;">
                <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #166534;">
                  What was deleted:
                </p>
                <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #166534;">
                  <li>All family member accounts</li>
                  <li>All child profiles and data</li>
                  <li>All agreements and settings</li>
                  <li>All screenshots and activity logs</li>
                  <li>All flags and audit events</li>
                </ul>
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
                Want to use Fledgely again?
              </p>
              <p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.6;">
                You can create a new Fledgely account at any time using this email address. Your previous data cannot be recovered, but you can start fresh.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                Thank you for using Fledgely. If you have any questions, please contact our support team.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 20px 40px 30px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 1.5;">
                This email confirms the completion of your account deletion request.
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

function buildAccountDeletionCompleteEmailText(params: AccountDeletionCompleteEmailParams): string {
  return `
YOUR FLEDGELY ACCOUNT HAS BEEN DELETED

Your Fledgely account and all associated data have been permanently deleted. This action is complete and irreversible.

WHAT WAS DELETED:
- All family member accounts
- All child profiles and data
- All agreements and settings
- All screenshots and activity logs
- All flags and audit events

Reference ID: ${params.deletionId}

WANT TO USE FLEDGELY AGAIN?
You can create a new Fledgely account at any time using this email address. Your previous data cannot be recovered, but you can start fresh.

Thank you for using Fledgely. If you have any questions, please contact our support team.

---
This email confirms the completion of your account deletion request.
`.trim()
}

export async function sendAccountDeletionCompleteEmail(
  params: AccountDeletionCompleteEmailParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { to } = params

  const htmlContent = buildAccountDeletionCompleteEmailHtml(params)
  const textContent = buildAccountDeletionCompleteEmailText(params)
  const subject = 'Your Fledgely account has been deleted'

  const client = getResendClient()

  if (!client) {
    logger.info('[DEV] Account deletion complete email would be sent', {
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
      logger.error('Resend API error for account deletion complete email', {
        error: error.message,
      })
      return { success: false, error: error.message }
    }

    logger.info('Account deletion complete email sent', { messageId: data?.id })
    return { success: true, messageId: data?.id }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    logger.error('Email service error for account deletion complete', { error: errorMessage })
    return { success: false, error: errorMessage }
  }
}

export function _resetClientForTesting(): void {
  resendClient = null
}
