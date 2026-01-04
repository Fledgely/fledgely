/**
 * Data Export Ready email template.
 *
 * Story 51.1: Data Export Request - AC5
 *
 * Features:
 * - Clean, responsive HTML email
 * - Fledgely branding (purple #7c3aed)
 * - Clear download button
 * - File size and expiry warning
 * - Plain text fallback
 */

import * as logger from 'firebase-functions/logger'
import { Resend } from 'resend'

// Resend client singleton
let resendClient: Resend | null = null

const getResendClient = (): Resend | null => {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return null
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey)
  }
  return resendClient
}

// Default sender email (read at runtime)
const getFromEmail = (): string =>
  process.env.RESEND_FROM_EMAIL || 'fledgely <notifications@fledgely.com>'

/**
 * Parameters for sending a data export ready email
 */
export interface DataExportReadyEmailParams {
  to: string
  downloadUrl: string
  fileSize: number
  expiresAt: number
}

/**
 * Format file size for display.
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} bytes`
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  } else {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }
}

/**
 * Format expiry date for display.
 */
function formatExpiryDate(timestamp: number): string {
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

/**
 * Calculate days until expiry.
 */
function getDaysUntilExpiry(expiresAt: number): number {
  const now = Date.now()
  const diff = expiresAt - now
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/**
 * Escape HTML special characters to prevent XSS.
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Build the data export ready email HTML content.
 */
function buildDataExportReadyEmailHtml(params: DataExportReadyEmailParams): string {
  const safeDownloadUrl = escapeHtml(params.downloadUrl)
  const formattedSize = formatFileSize(params.fileSize)
  const formattedExpiry = formatExpiryDate(params.expiresAt)
  const daysUntilExpiry = getDaysUntilExpiry(params.expiresAt)

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Fledgely Data Export is Ready</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header with logo -->
          <tr>
            <td style="padding: 30px 40px 20px 40px; text-align: center; border-bottom: 1px solid #e5e7eb;">
              <span style="font-size: 24px; font-weight: 700; color: #7c3aed;">fledgely</span>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding: 30px 40px 10px 40px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #1f2937; line-height: 1.3;">
                Your Data Export is Ready
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <p style="margin: 0; font-size: 16px; color: #4b5563; line-height: 1.6;">
                Your family data export has been generated and is ready for download. This export includes all your family profiles, agreements, screenshots, flags, activity logs, and settings.
              </p>
            </td>
          </tr>

          <!-- File info -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <div style="padding: 16px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">
                  <strong>File size:</strong> ${formattedSize}
                </p>
                <p style="margin: 0; font-size: 14px; color: #6b7280;">
                  <strong>Download available until:</strong> ${formattedExpiry}
                </p>
              </div>
            </td>
          </tr>

          <!-- Warning banner -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <div style="padding: 12px 16px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; font-size: 14px; color: #92400e;">
                  ⚠️ This download link will expire in ${daysUntilExpiry} days. After that, you'll need to request a new export.
                </p>
              </div>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 40px 40px; text-align: center;">
              <a href="${safeDownloadUrl}" style="display: inline-block; padding: 14px 32px; background-color: #7c3aed; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px;">
                Download Your Data
              </a>
            </td>
          </tr>

          <!-- Security note -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                <strong>Security note:</strong> This export contains sensitive family data. Please store it securely and handle according to your data protection preferences.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px 30px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 1.5;">
                This notification was sent by fledgely in response to your data export request. This is a GDPR-compliant data portability export.
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

/**
 * Build the data export ready email plain text content.
 */
function buildDataExportReadyEmailText(params: DataExportReadyEmailParams): string {
  const formattedSize = formatFileSize(params.fileSize)
  const formattedExpiry = formatExpiryDate(params.expiresAt)
  const daysUntilExpiry = getDaysUntilExpiry(params.expiresAt)

  const lines: string[] = []

  lines.push('YOUR FLEDGELY DATA EXPORT IS READY')
  lines.push('')
  lines.push(
    'Your family data export has been generated and is ready for download. This export includes all your family profiles, agreements, screenshots, flags, activity logs, and settings.'
  )
  lines.push('')
  lines.push(`File size: ${formattedSize}`)
  lines.push(`Download available until: ${formattedExpiry}`)
  lines.push('')
  lines.push(
    `WARNING: This download link will expire in ${daysUntilExpiry} days. After that, you'll need to request a new export.`
  )
  lines.push('')
  lines.push('Download Your Data:')
  lines.push(params.downloadUrl)
  lines.push('')
  lines.push(
    'SECURITY NOTE: This export contains sensitive family data. Please store it securely and handle according to your data protection preferences.'
  )
  lines.push('')
  lines.push('---')
  lines.push(
    'This notification was sent by fledgely in response to your data export request. This is a GDPR-compliant data portability export.'
  )

  return lines.join('\n')
}

/**
 * Send a data export ready email.
 *
 * @param params - Email parameters
 */
export async function sendDataExportReadyEmail(
  params: DataExportReadyEmailParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { to } = params

  const htmlContent = buildDataExportReadyEmailHtml(params)
  const textContent = buildDataExportReadyEmailText(params)
  const subject = 'Your Fledgely data export is ready'

  // Get Resend client
  const client = getResendClient()

  // Console fallback for development/testing
  // SECURITY: Do not log email addresses (PII)
  if (!client) {
    logger.info('[DEV] Data export ready email would be sent', {
      subject,
      fileSize: params.fileSize,
      expiresAt: params.expiresAt,
    })

    // Simulate success in dev
    return {
      success: true,
      messageId: `dev-${Date.now()}`,
    }
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
      // SECURITY: Do not log email addresses (PII)
      logger.error('Resend API error for data export email', { error: error.message })
      return {
        success: false,
        error: error.message,
      }
    }

    // SECURITY: Do not log email addresses (PII)
    logger.info('Data export ready email sent successfully', {
      messageId: data?.id,
    })

    return {
      success: true,
      messageId: data?.id,
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    // SECURITY: Do not log email addresses (PII)
    logger.error('Email service error for data export', { error: errorMessage })

    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Reset client for testing
 */
export function _resetClientForTesting(): void {
  resendClient = null
}
