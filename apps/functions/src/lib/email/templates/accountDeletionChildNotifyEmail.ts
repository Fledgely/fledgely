/**
 * Child Account Deletion Notification email template.
 *
 * Story 51.4: Account Deletion Flow - AC5
 *
 * Sent to parent's email on behalf of child when account deletion is initiated.
 * Uses age-appropriate language to inform children their family is leaving the service.
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

export interface ChildNotifyEmailParams {
  to: string // Parent's email (on behalf of child)
  childName: string
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
  })
}

function buildChildNotifyEmailHtml(params: ChildNotifyEmailParams): string {
  const formattedDate = formatDate(params.coolingOffEndsAt)

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Family Leaving Fledgely</title>
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
                Hi ${params.childName}!
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 10px 40px 20px 40px;">
              <p style="margin: 0; font-size: 16px; color: #4b5563; line-height: 1.6;">
                Your family has decided to stop using Fledgely. This means your Fledgely account will be closing soon.
              </p>
            </td>
          </tr>

          <!-- Info box -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <div style="padding: 20px; background-color: #f0f9ff; border-radius: 12px; border: 1px solid #bae6fd;">
                <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: #0369a1;">
                  What's happening?
                </p>
                <p style="margin: 0; font-size: 14px; color: #0c4a6e; line-height: 1.6;">
                  Your parent has chosen to close the family's Fledgely account. This will happen on <strong>${formattedDate}</strong>.
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.6;">
                You don't need to do anything. If you have questions about this, please talk to your parent.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                Thank you for being part of the Fledgely family!
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 20px 40px 30px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.5;">
                This message was sent to inform ${params.childName} about the family account closure.
                <br />
                Reference: ${params.deletionId}
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

function buildChildNotifyEmailText(params: ChildNotifyEmailParams): string {
  const formattedDate = formatDate(params.coolingOffEndsAt)

  return `
Hi ${params.childName}!

Your family has decided to stop using Fledgely. This means your Fledgely account will be closing soon.

WHAT'S HAPPENING?
Your parent has chosen to close the family's Fledgely account. This will happen on ${formattedDate}.

You don't need to do anything. If you have questions about this, please talk to your parent.

Thank you for being part of the Fledgely family!

---
This message was sent to inform ${params.childName} about the family account closure.
Reference: ${params.deletionId}
`.trim()
}

export async function sendChildAccountDeletionNotifyEmail(
  params: ChildNotifyEmailParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { to } = params

  const htmlContent = buildChildNotifyEmailHtml(params)
  const textContent = buildChildNotifyEmailText(params)
  const subject = `Family Leaving Fledgely - Information for ${params.childName}`

  const client = getResendClient()

  if (!client) {
    logger.info('[DEV] Child account deletion notify email would be sent', {
      subject,
      childName: params.childName,
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
      logger.error('Resend API error for child notify email', { error: error.message })
      return { success: false, error: error.message }
    }

    logger.info('Child account deletion notify email sent', {
      messageId: data?.id,
      childName: params.childName,
    })
    return { success: true, messageId: data?.id }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    logger.error('Email service error for child notify', { error: errorMessage })
    return { success: false, error: errorMessage }
  }
}

export function _resetClientForTesting(): void {
  resendClient = null
}
