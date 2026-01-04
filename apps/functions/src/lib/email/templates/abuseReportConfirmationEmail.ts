/**
 * Abuse Report Confirmation email template.
 *
 * Story 51.5: Abuse Reporting - AC4
 *
 * Sent to non-anonymous reporters when their abuse report is submitted.
 * Provides:
 * - Reference number for tracking
 * - 72-hour review timeline
 * - How to check status
 */

import * as logger from 'firebase-functions/logger'
import { Resend } from 'resend'
import {
  ABUSE_REPORT_CONFIG,
  AbuseReportTypeDescriptions,
  type AbuseReportTypeValue,
} from '@fledgely/shared'

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

export interface AbuseReportConfirmationEmailParams {
  to: string
  referenceNumber: string
  reportType: AbuseReportTypeValue
}

function getReportTypeLabel(type: AbuseReportTypeValue): string {
  return AbuseReportTypeDescriptions[type] || 'Other misuse'
}

function buildAbuseReportConfirmationEmailHtml(params: AbuseReportConfirmationEmailParams): string {
  const reportTypeLabel = getReportTypeLabel(params.reportType)

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fledgely Abuse Report Received</title>
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
                We've Received Your Report
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <p style="margin: 0; font-size: 16px; color: #4b5563; line-height: 1.6;">
                Thank you for taking the time to report suspected misuse of Fledgely. We take all reports seriously and will review your submission within ${ABUSE_REPORT_CONFIG.TRIAGE_SLA_HOURS} hours.
              </p>
            </td>
          </tr>

          <!-- Reference Number -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <div style="padding: 20px; background-color: #f0fdf4; border-radius: 8px; border: 1px solid #86efac; text-align: center;">
                <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #166534;">
                  Your Reference Number
                </p>
                <p style="margin: 0; font-size: 24px; font-weight: 700; color: #15803d; font-family: monospace;">
                  ${params.referenceNumber}
                </p>
                <p style="margin: 8px 0 0 0; font-size: 13px; color: #166534;">
                  Please save this number for your records
                </p>
              </div>
            </td>
          </tr>

          <!-- Report Type -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <div style="padding: 16px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                <p style="margin: 0; font-size: 14px; color: #6b7280;">
                  <strong>Report Type:</strong> ${reportTypeLabel}
                </p>
              </div>
            </td>
          </tr>

          <!-- What Happens Next -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #1f2937;">
                What happens next?
              </p>
              <ol style="margin: 0; padding-left: 20px; font-size: 14px; color: #4b5563; line-height: 1.8;">
                <li>Our trust & safety team will review your report within 72 hours</li>
                <li>We may investigate further depending on the nature of the report</li>
                <li>If you requested follow-up, we'll keep you informed of significant updates</li>
                <li>Appropriate action will be taken if misuse is confirmed</li>
              </ol>
            </td>
          </tr>

          <!-- Privacy Note -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <div style="padding: 16px; background-color: #eff6ff; border-radius: 8px; border-left: 4px solid #3b82f6;">
                <p style="margin: 0; font-size: 14px; color: #1e40af; line-height: 1.5;">
                  <strong>Your privacy matters:</strong> Your report is confidential. We will never share your information with the person you're reporting, and all investigations are conducted discreetly.
                </p>
              </div>
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

function buildAbuseReportConfirmationEmailText(params: AbuseReportConfirmationEmailParams): string {
  const reportTypeLabel = getReportTypeLabel(params.reportType)

  return `
FLEDGELY ABUSE REPORT RECEIVED

Thank you for taking the time to report suspected misuse of Fledgely. We take all reports seriously and will review your submission within ${ABUSE_REPORT_CONFIG.TRIAGE_SLA_HOURS} hours.

YOUR REFERENCE NUMBER: ${params.referenceNumber}
Please save this number for your records.

Report Type: ${reportTypeLabel}

WHAT HAPPENS NEXT?
1. Our trust & safety team will review your report within 72 hours
2. We may investigate further depending on the nature of the report
3. If you requested follow-up, we'll keep you informed of significant updates
4. Appropriate action will be taken if misuse is confirmed

YOUR PRIVACY MATTERS
Your report is confidential. We will never share your information with the person you're reporting, and all investigations are conducted discreetly.

---
Thank you for helping keep Fledgely a safe platform for families.
`.trim()
}

export async function sendAbuseReportConfirmationEmail(
  params: AbuseReportConfirmationEmailParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { to } = params

  const htmlContent = buildAbuseReportConfirmationEmailHtml(params)
  const textContent = buildAbuseReportConfirmationEmailText(params)
  const subject = `Fledgely Abuse Report Received - Reference ${params.referenceNumber}`

  const client = getResendClient()

  if (!client) {
    logger.info('[DEV] Abuse report confirmation email would be sent', {
      subject,
      referenceNumber: params.referenceNumber,
      reportType: params.reportType,
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
      logger.error('Resend API error for abuse report confirmation email', {
        error: error.message,
      })
      return { success: false, error: error.message }
    }

    logger.info('Abuse report confirmation email sent successfully', { messageId: data?.id })
    return { success: true, messageId: data?.id }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    logger.error('Email service error for abuse report confirmation', { error: errorMessage })
    return { success: false, error: errorMessage }
  }
}

export function _resetClientForTesting(): void {
  resendClient = null
}
