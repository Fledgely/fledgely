/**
 * Breach Notification email template.
 *
 * Story 51.6: Breach Notification - AC2
 *
 * Sent to affected users when a data breach occurs.
 * Compliant with GDPR Article 34 notification requirements.
 *
 * Includes:
 * - What data was affected
 * - When it occurred
 * - What actions to take
 * - Contact information
 */

import * as logger from 'firebase-functions/logger'
import { Resend } from 'resend'
import { AffectedDataTypeLabels, type AffectedDataTypeValue } from '@fledgely/shared'

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
  process.env.RESEND_FROM_EMAIL || 'Fledgely Security <security@fledgely.com>'

export interface BreachNotificationEmailParams {
  to: string
  incidentTitle: string
  affectedDataTypes: AffectedDataTypeValue[]
  occurredAt: number
  description: string
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

function getAffectedDataList(types: AffectedDataTypeValue[]): string[] {
  return types.map((type) => AffectedDataTypeLabels[type] || type)
}

function buildBreachNotificationEmailHtml(params: BreachNotificationEmailParams): string {
  const affectedDataList = getAffectedDataList(params.affectedDataTypes)
  const occurredAtFormatted = formatDate(params.occurredAt)

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Important Security Notice from Fledgely</title>
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

          <!-- Alert Banner -->
          <tr>
            <td style="padding: 20px 40px;">
              <div style="padding: 16px 20px; background-color: #fef2f2; border-radius: 8px; border-left: 4px solid #dc2626;">
                <p style="margin: 0; font-size: 16px; font-weight: 600; color: #991b1b;">
                  Important Security Notice
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #1f2937; line-height: 1.3;">
                ${params.incidentTitle}
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <p style="margin: 0; font-size: 16px; color: #4b5563; line-height: 1.6;">
                We are writing to inform you of a security incident that may have affected your data. At Fledgely, your security and privacy are our top priorities, and we believe in being transparent when incidents occur.
              </p>
            </td>
          </tr>

          <!-- When It Occurred -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <div style="padding: 16px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">
                  When This Occurred
                </p>
                <p style="margin: 0; font-size: 15px; color: #1f2937;">
                  ${occurredAtFormatted}
                </p>
              </div>
            </td>
          </tr>

          <!-- What Data Was Affected -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: #1f2937;">
                What Data May Have Been Affected
              </p>
              <ul style="margin: 0; padding-left: 20px; font-size: 15px; color: #4b5563; line-height: 1.8;">
                ${affectedDataList.map((item) => `<li>${item}</li>`).join('\n                ')}
              </ul>
            </td>
          </tr>

          <!-- What We're Doing -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: #1f2937;">
                What We're Doing
              </p>
              <ul style="margin: 0; padding-left: 20px; font-size: 15px; color: #4b5563; line-height: 1.8;">
                <li>We have contained the incident and secured affected systems</li>
                <li>We are conducting a thorough investigation</li>
                <li>We have notified relevant regulatory authorities as required</li>
                <li>We are implementing additional security measures</li>
              </ul>
            </td>
          </tr>

          <!-- What You Should Do -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: #1f2937;">
                Recommended Actions
              </p>
              <div style="padding: 16px; background-color: #fef3c7; border-radius: 8px; border: 1px solid #fcd34d;">
                <ol style="margin: 0; padding-left: 20px; font-size: 15px; color: #92400e; line-height: 1.8;">
                  <li>Change your Fledgely password if you haven't recently</li>
                  <li>Review your account for any unusual activity</li>
                  <li>Be cautious of phishing emails claiming to be from Fledgely</li>
                  <li>Contact us if you notice anything suspicious</li>
                </ol>
              </div>
            </td>
          </tr>

          <!-- Contact Information -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <div style="padding: 20px; background-color: #f0fdf4; border-radius: 8px; border: 1px solid #86efac;">
                <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: #166534;">
                  Questions or Concerns?
                </p>
                <p style="margin: 0; font-size: 14px; color: #166534; line-height: 1.6;">
                  If you have any questions about this incident or need assistance, please contact our security team at <a href="mailto:security@fledgely.com" style="color: #15803d; font-weight: 600;">security@fledgely.com</a>
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 20px 40px 30px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; line-height: 1.5;">
                We sincerely apologize for any concern this may cause and remain committed to protecting your data.
              </p>
              <p style="margin: 0; font-size: 13px; color: #9ca3af;">
                The Fledgely Security Team
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

function buildBreachNotificationEmailText(params: BreachNotificationEmailParams): string {
  const affectedDataList = getAffectedDataList(params.affectedDataTypes)
  const occurredAtFormatted = formatDate(params.occurredAt)

  return `
IMPORTANT SECURITY NOTICE FROM FLEDGELY

${params.incidentTitle}

We are writing to inform you of a security incident that may have affected your data. At Fledgely, your security and privacy are our top priorities, and we believe in being transparent when incidents occur.

WHEN THIS OCCURRED
${occurredAtFormatted}

WHAT DATA MAY HAVE BEEN AFFECTED
${affectedDataList.map((item) => `- ${item}`).join('\n')}

WHAT WE'RE DOING
- We have contained the incident and secured affected systems
- We are conducting a thorough investigation
- We have notified relevant regulatory authorities as required
- We are implementing additional security measures

RECOMMENDED ACTIONS
1. Change your Fledgely password if you haven't recently
2. Review your account for any unusual activity
3. Be cautious of phishing emails claiming to be from Fledgely
4. Contact us if you notice anything suspicious

QUESTIONS OR CONCERNS?
If you have any questions about this incident or need assistance, please contact our security team at security@fledgely.com

---
We sincerely apologize for any concern this may cause and remain committed to protecting your data.

The Fledgely Security Team
`.trim()
}

export async function sendBreachNotificationEmail(
  params: BreachNotificationEmailParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { to } = params

  const htmlContent = buildBreachNotificationEmailHtml(params)
  const textContent = buildBreachNotificationEmailText(params)
  const subject = `Important Security Notice: ${params.incidentTitle}`

  const client = getResendClient()

  if (!client) {
    logger.info('[DEV] Breach notification email would be sent', {
      subject,
      incidentTitle: params.incidentTitle,
      affectedDataTypes: params.affectedDataTypes,
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
      logger.error('Resend API error for breach notification email', {
        error: error.message,
      })
      return { success: false, error: error.message }
    }

    logger.info('Breach notification email sent successfully', { messageId: data?.id })
    return { success: true, messageId: data?.id }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    logger.error('Email service error for breach notification', { error: errorMessage })
    return { success: false, error: errorMessage }
  }
}

export function _resetClientForTesting(): void {
  resendClient = null
}
