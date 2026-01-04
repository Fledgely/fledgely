/**
 * Abuse Report Update email template.
 *
 * Story 51.5: Abuse Reporting - AC6
 *
 * Sent to reporters who opted for follow-up when:
 * - Report status changes
 * - Investigation outcome is determined
 */

import * as logger from 'firebase-functions/logger'
import { Resend } from 'resend'
import { AbuseReportStatus, type AbuseReportStatusValue } from '@fledgely/shared'

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

export interface AbuseReportUpdateEmailParams {
  to: string
  referenceNumber: string
  status: AbuseReportStatusValue
  updateMessage?: string
}

function getStatusDescription(status: AbuseReportStatusValue): {
  title: string
  description: string
  color: string
  bgColor: string
  borderColor: string
} {
  switch (status) {
    case AbuseReportStatus.TRIAGING:
      return {
        title: 'Under Review',
        description:
          'Your report is being reviewed by our trust & safety team. We will investigate and take appropriate action.',
        color: '#1e40af',
        bgColor: '#eff6ff',
        borderColor: '#3b82f6',
      }
    case AbuseReportStatus.INVESTIGATING:
      return {
        title: 'Investigation in Progress',
        description:
          'We are actively investigating your report. This may take some time to complete thoroughly.',
        color: '#92400e',
        bgColor: '#fef3c7',
        borderColor: '#fcd34d',
      }
    case AbuseReportStatus.RESOLVED:
      return {
        title: 'Report Resolved',
        description:
          'Our investigation is complete and appropriate action has been taken. Thank you for helping keep Fledgely safe.',
        color: '#166534',
        bgColor: '#f0fdf4',
        borderColor: '#86efac',
      }
    case AbuseReportStatus.DISMISSED:
      return {
        title: 'Report Closed',
        description:
          'After review, we were unable to take action on this report. This may be because we could not verify the concern or it did not constitute a policy violation.',
        color: '#6b7280',
        bgColor: '#f9fafb',
        borderColor: '#d1d5db',
      }
    default:
      return {
        title: 'Status Update',
        description: 'There has been an update to your report.',
        color: '#6b7280',
        bgColor: '#f9fafb',
        borderColor: '#d1d5db',
      }
  }
}

function buildAbuseReportUpdateEmailHtml(params: AbuseReportUpdateEmailParams): string {
  const statusInfo = getStatusDescription(params.status)

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fledgely Abuse Report Update</title>
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
                Update on Your Report
              </h1>
            </td>
          </tr>

          <!-- Reference Number -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                Reference: <strong style="font-family: monospace;">${params.referenceNumber}</strong>
              </p>
            </td>
          </tr>

          <!-- Status Update -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <div style="padding: 20px; background-color: ${statusInfo.bgColor}; border-radius: 8px; border-left: 4px solid ${statusInfo.borderColor};">
                <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: ${statusInfo.color};">
                  ${statusInfo.title}
                </p>
                <p style="margin: 0; font-size: 14px; color: ${statusInfo.color}; line-height: 1.5;">
                  ${statusInfo.description}
                </p>
              </div>
            </td>
          </tr>

          ${
            params.updateMessage
              ? `
          <!-- Additional Message -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <div style="padding: 16px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1f2937;">
                  Additional Information:
                </p>
                <p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.5;">
                  ${params.updateMessage}
                </p>
              </div>
            </td>
          </tr>
          `
              : ''
          }

          <!-- Privacy Note -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                For privacy and safety reasons, we may not be able to share specific details about the actions taken as a result of your report.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 20px 40px 30px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 1.5;">
                Thank you for helping keep Fledgely a safe platform for families.
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

function buildAbuseReportUpdateEmailText(params: AbuseReportUpdateEmailParams): string {
  const statusInfo = getStatusDescription(params.status)

  let text = `
FLEDGELY ABUSE REPORT UPDATE

Reference: ${params.referenceNumber}

STATUS: ${statusInfo.title}
${statusInfo.description}
`

  if (params.updateMessage) {
    text += `
ADDITIONAL INFORMATION:
${params.updateMessage}
`
  }

  text += `
For privacy and safety reasons, we may not be able to share specific details about the actions taken as a result of your report.

---
Thank you for helping keep Fledgely a safe platform for families.
`

  return text.trim()
}

export async function sendAbuseReportUpdateEmail(
  params: AbuseReportUpdateEmailParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { to } = params

  const htmlContent = buildAbuseReportUpdateEmailHtml(params)
  const textContent = buildAbuseReportUpdateEmailText(params)
  const subject = `Update on Your Fledgely Report - ${params.referenceNumber}`

  const client = getResendClient()

  if (!client) {
    logger.info('[DEV] Abuse report update email would be sent', {
      subject,
      referenceNumber: params.referenceNumber,
      status: params.status,
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
      logger.error('Resend API error for abuse report update email', {
        error: error.message,
      })
      return { success: false, error: error.message }
    }

    logger.info('Abuse report update email sent successfully', { messageId: data?.id })
    return { success: true, messageId: data?.id }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    logger.error('Email service error for abuse report update', { error: errorMessage })
    return { success: false, error: errorMessage }
  }
}

export function _resetClientForTesting(): void {
  resendClient = null
}
