/**
 * Notification email template.
 *
 * Story 41.6: Notification Delivery Channels - AC2, AC5
 *
 * Features:
 * - Clean, responsive HTML email
 * - Fledgely branding (purple #7c3aed)
 * - Clear call-to-action button
 * - Optional unsubscribe link in footer
 * - Plain text fallback
 */

/**
 * Parameters for building a notification email
 */
export interface NotificationEmailParams {
  title: string
  body: string
  actionUrl?: string
  actionText?: string
  unsubscribeUrl?: string
  fallbackMessage?: string // "You may have missed this notification"
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
 * Build the notification email HTML content.
 *
 * @param params - Email parameters
 * @returns HTML email content
 */
export function buildNotificationEmailHtml(params: NotificationEmailParams): string {
  const safeTitle = escapeHtml(params.title)
  const safeBody = escapeHtml(params.body)
  const safeActionUrl = params.actionUrl ? escapeHtml(params.actionUrl) : null
  const safeActionText = params.actionText ? escapeHtml(params.actionText) : 'View in App'
  const safeUnsubscribeUrl = params.unsubscribeUrl ? escapeHtml(params.unsubscribeUrl) : null
  const safeFallbackMessage = params.fallbackMessage ? escapeHtml(params.fallbackMessage) : null

  const fallbackSection = safeFallbackMessage
    ? `
          <!-- Fallback notice -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <div style="padding: 12px 16px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; font-size: 14px; color: #92400e;">
                  ${safeFallbackMessage}
                </p>
              </div>
            </td>
          </tr>`
    : ''

  const actionSection = safeActionUrl
    ? `
          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 40px 40px; text-align: center;">
              <a href="${safeActionUrl}" style="display: inline-block; padding: 14px 32px; background-color: #7c3aed; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px;">
                ${safeActionText}
              </a>
            </td>
          </tr>`
    : ''

  const unsubscribeSection = safeUnsubscribeUrl
    ? `
              <p style="margin: 12px 0 0 0; font-size: 12px; color: #9ca3af;">
                <a href="${safeUnsubscribeUrl}" style="color: #6b7280; text-decoration: underline;">
                  Unsubscribe from these notifications
                </a>
              </p>`
    : ''

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
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

          ${fallbackSection}

          <!-- Title -->
          <tr>
            <td style="padding: 30px 40px 10px 40px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #1f2937; line-height: 1.3;">
                ${safeTitle}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <p style="margin: 0; font-size: 16px; color: #4b5563; line-height: 1.6;">
                ${safeBody}
              </p>
            </td>
          </tr>

          ${actionSection}

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px 30px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 1.5;">
                This notification was sent by fledgely. If you didn't expect this email, you can safely ignore it.
              </p>
              ${unsubscribeSection}
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
 * Build the notification email plain text content.
 *
 * @param params - Email parameters
 * @returns Plain text email content
 */
export function buildNotificationEmailText(params: NotificationEmailParams): string {
  const lines: string[] = []

  if (params.fallbackMessage) {
    lines.push(`[${params.fallbackMessage}]`)
    lines.push('')
  }

  lines.push(params.title.toUpperCase())
  lines.push('')
  lines.push(params.body)

  if (params.actionUrl) {
    lines.push('')
    lines.push(`${params.actionText || 'View in App'}:`)
    lines.push(params.actionUrl)
  }

  lines.push('')
  lines.push('---')
  lines.push('This notification was sent by fledgely.')

  if (params.unsubscribeUrl) {
    lines.push('')
    lines.push(`Unsubscribe: ${params.unsubscribeUrl}`)
  }

  return lines.join('\n')
}

/**
 * Get subject line for notification type.
 *
 * @param notificationType - Type of notification
 * @param title - Notification title
 * @returns Email subject
 */
export function getNotificationEmailSubject(notificationType: string, title: string): string {
  const prefixes: Record<string, string> = {
    criticalFlags: '[Critical]',
    timeLimitWarnings: '[Time Limit]',
    deviceSyncAlerts: '[Device]',
    loginAlerts: '[Security]',
    flagDigest: '[Digest]',
    extensionRequest: '[Request]',
    agreementChange: '[Agreement]',
  }

  const prefix = prefixes[notificationType] || ''
  return prefix ? `${prefix} ${title}` : title
}
