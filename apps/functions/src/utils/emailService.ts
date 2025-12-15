import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore'
import { createHash } from 'crypto'
import { getActiveResources, getResourcesByType, EscapeResource } from './resourceService'

/**
 * Email queue item status
 */
export type EmailQueueStatus = 'pending' | 'processing' | 'sent' | 'failed'

/**
 * Email queue item schema
 */
export interface EmailQueueItem {
  id?: string
  type: 'resource-referral'
  recipient: string
  safetyRequestId: string
  status: EmailQueueStatus
  attempts: number
  maxAttempts: number
  lastAttemptAt?: Timestamp
  nextAttemptAt?: Timestamp
  sentAt?: Timestamp
  error?: string
  usedSafeContact: boolean
  createdAt: Timestamp
}

/**
 * Generated email content
 */
export interface EmailContent {
  subject: string
  html: string
  text: string
}

/**
 * Exponential backoff delays in milliseconds
 * Attempts: 1 -> wait 1min, 2 -> wait 5min, 3 -> wait 15min
 */
const RETRY_DELAYS_MS = [
  1 * 60 * 1000,   // 1 minute
  5 * 60 * 1000,   // 5 minutes
  15 * 60 * 1000,  // 15 minutes
]

/**
 * Maximum retry attempts
 */
export const MAX_RETRY_ATTEMPTS = 3

/**
 * Generate a neutral subject line that doesn't reveal purpose
 */
export function generateSubject(): string {
  return 'Resources you requested'
}

/**
 * Format a phone number for display
 */
function formatPhoneForDisplay(phone: string): string {
  return phone
}

/**
 * Generate plain text email content
 */
export function generatePlainTextContent(
  resources: EscapeResource[],
  usedSafeContact: boolean
): string {
  const lines: string[] = []

  // Add safety warning if using account email
  if (!usedSafeContact) {
    lines.push('IMPORTANT SAFETY NOTE')
    lines.push('This email was sent to your account email. If someone else has access to this email, consider using a private device or creating a new email account for sensitive communications.')
    lines.push('')
    lines.push('---')
    lines.push('')
  }

  lines.push('Here are the resources you requested:')
  lines.push('')

  // Group resources by type
  const byType = groupResourcesByType(resources)

  // Hotlines
  if (byType.hotline.length > 0) {
    lines.push('CRISIS HOTLINES (24/7)')
    for (const resource of byType.hotline) {
      lines.push(`  ${resource.name}: ${formatPhoneForDisplay(resource.value)}`)
      lines.push(`  ${resource.description}`)
      lines.push('')
    }
  }

  // Text lines
  if (byType['text-line'].length > 0) {
    lines.push('TEXT SUPPORT')
    for (const resource of byType['text-line']) {
      lines.push(`  ${resource.name}: ${resource.value}`)
      lines.push(`  ${resource.description}`)
      lines.push('')
    }
  }

  // Websites and guides
  const webResources = [...byType.website, ...byType.guide]
  if (webResources.length > 0) {
    lines.push('ONLINE RESOURCES')
    for (const resource of webResources) {
      lines.push(`  ${resource.name}`)
      lines.push(`  ${resource.value}`)
      lines.push(`  ${resource.description}`)
      lines.push('')
    }
  }

  // Legal aid
  if (byType['legal-aid'].length > 0) {
    lines.push('LEGAL ASSISTANCE')
    for (const resource of byType['legal-aid']) {
      lines.push(`  ${resource.name}`)
      lines.push(`  ${resource.value}`)
      lines.push(`  ${resource.description}`)
      lines.push('')
    }
  }

  lines.push('---')
  lines.push('')
  lines.push('If this email was sent in error, you can safely ignore it.')
  lines.push('')
  lines.push('You are not alone. Help is available.')

  return lines.join('\n')
}

/**
 * Generate HTML email content
 */
export function generateHtmlContent(
  resources: EscapeResource[],
  usedSafeContact: boolean
): string {
  const byType = groupResourcesByType(resources)

  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
    .section { margin-bottom: 25px; }
    .section-title { font-size: 16px; font-weight: 600; color: #444; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
    .resource { margin-bottom: 15px; }
    .resource-name { font-weight: 500; color: #222; }
    .resource-value { font-size: 18px; color: #0066cc; font-weight: 600; }
    .resource-desc { font-size: 14px; color: #666; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888; }
    .support { font-style: italic; color: #666; }
  </style>
</head>
<body>`

  // Safety warning if using account email
  if (!usedSafeContact) {
    html += `
  <div class="warning">
    <strong>Important Safety Note:</strong> This email was sent to your account email. If someone else has access to this email, consider using a private device or creating a new email account for sensitive communications.
  </div>`
  }

  html += `
  <p>Here are the resources you requested:</p>`

  // Hotlines
  if (byType.hotline.length > 0) {
    html += `
  <div class="section">
    <div class="section-title">Crisis Hotlines (24/7)</div>`
    for (const resource of byType.hotline) {
      html += `
    <div class="resource">
      <div class="resource-name">${escapeHtml(resource.name)}</div>
      <div class="resource-value">${escapeHtml(formatPhoneForDisplay(resource.value))}</div>
      <div class="resource-desc">${escapeHtml(resource.description)}</div>
    </div>`
    }
    html += `
  </div>`
  }

  // Text lines
  if (byType['text-line'].length > 0) {
    html += `
  <div class="section">
    <div class="section-title">Text Support</div>`
    for (const resource of byType['text-line']) {
      html += `
    <div class="resource">
      <div class="resource-name">${escapeHtml(resource.name)}</div>
      <div class="resource-value">${escapeHtml(resource.value)}</div>
      <div class="resource-desc">${escapeHtml(resource.description)}</div>
    </div>`
    }
    html += `
  </div>`
  }

  // Websites and guides
  const webResources = [...byType.website, ...byType.guide]
  if (webResources.length > 0) {
    html += `
  <div class="section">
    <div class="section-title">Online Resources</div>`
    for (const resource of webResources) {
      html += `
    <div class="resource">
      <div class="resource-name">${escapeHtml(resource.name)}</div>
      <div class="resource-value"><a href="${sanitizeUrl(resource.value)}">${escapeHtml(resource.value)}</a></div>
      <div class="resource-desc">${escapeHtml(resource.description)}</div>
    </div>`
    }
    html += `
  </div>`
  }

  // Legal aid
  if (byType['legal-aid'].length > 0) {
    html += `
  <div class="section">
    <div class="section-title">Legal Assistance</div>`
    for (const resource of byType['legal-aid']) {
      html += `
    <div class="resource">
      <div class="resource-name">${escapeHtml(resource.name)}</div>
      <div class="resource-value"><a href="${sanitizeUrl(resource.value)}">${escapeHtml(resource.value)}</a></div>
      <div class="resource-desc">${escapeHtml(resource.description)}</div>
    </div>`
    }
    html += `
  </div>`
  }

  html += `
  <div class="footer">
    <p>If this email was sent in error, you can safely ignore it.</p>
    <p class="support">You are not alone. Help is available.</p>
  </div>
</body>
</html>`

  return html
}

/**
 * Group resources by type for display
 */
function groupResourcesByType(resources: EscapeResource[]): Record<string, EscapeResource[]> {
  const grouped: Record<string, EscapeResource[]> = {
    'hotline': [],
    'text-line': [],
    'website': [],
    'guide': [],
    'legal-aid': [],
  }

  for (const resource of resources) {
    if (grouped[resource.type]) {
      grouped[resource.type].push(resource)
    }
  }

  return grouped
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Validate and sanitize URL for safe href embedding
 * Only allows http: and https: protocols to prevent javascript: injection
 */
function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url)
    // Only allow http and https protocols
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return url
    }
    // Invalid protocol - return escaped text only
    return '#'
  } catch {
    // Invalid URL - return safe fallback
    return '#'
  }
}

/**
 * Generate complete email content
 */
export async function generateResourceEmail(
  usedSafeContact: boolean
): Promise<EmailContent> {
  const resources = await getActiveResources()

  return {
    subject: generateSubject(),
    html: generateHtmlContent(resources, usedSafeContact),
    text: generatePlainTextContent(resources, usedSafeContact),
  }
}

/**
 * Queue a resource referral email for sending
 */
export async function queueResourceReferralEmail(
  safetyRequestId: string,
  recipientEmail: string,
  usedSafeContact: boolean
): Promise<string> {
  const db = getFirestore()
  const now = Timestamp.now()

  const queueItem: Omit<EmailQueueItem, 'id'> = {
    type: 'resource-referral',
    recipient: recipientEmail,
    safetyRequestId,
    status: 'pending',
    attempts: 0,
    maxAttempts: MAX_RETRY_ATTEMPTS,
    nextAttemptAt: now,
    usedSafeContact,
    createdAt: now,
  }

  const docRef = await db.collection('emailQueue').add(queueItem)
  return docRef.id
}

/**
 * Calculate next retry time based on attempt number
 */
export function calculateNextRetryTime(attemptNumber: number): Timestamp {
  const delayIndex = Math.min(attemptNumber, RETRY_DELAYS_MS.length - 1)
  const delayMs = RETRY_DELAYS_MS[delayIndex]
  return Timestamp.fromMillis(Date.now() + delayMs)
}

/**
 * Update email queue item status
 */
export async function updateEmailQueueStatus(
  queueId: string,
  status: EmailQueueStatus,
  error?: string
): Promise<void> {
  const db = getFirestore()
  const now = Timestamp.now()

  const updateData: Record<string, unknown> = {
    status,
    lastAttemptAt: now,
  }

  if (status === 'sent') {
    updateData.sentAt = now
  }

  if (error) {
    updateData.error = error
  }

  await db.collection('emailQueue').doc(queueId).update(updateData)
}

/**
 * Increment attempt and schedule retry
 */
export async function scheduleEmailRetry(queueId: string): Promise<void> {
  const db = getFirestore()
  const docRef = db.collection('emailQueue').doc(queueId)
  const doc = await docRef.get()

  if (!doc.exists) {
    throw new Error('Email queue item not found')
  }

  const data = doc.data() as EmailQueueItem
  const newAttemptCount = data.attempts + 1

  if (newAttemptCount >= data.maxAttempts) {
    // Max retries reached - mark as failed
    await docRef.update({
      status: 'failed',
      attempts: newAttemptCount,
      lastAttemptAt: Timestamp.now(),
    })
  } else {
    // Schedule retry
    await docRef.update({
      status: 'pending',
      attempts: newAttemptCount,
      lastAttemptAt: Timestamp.now(),
      nextAttemptAt: calculateNextRetryTime(newAttemptCount),
    })
  }
}

/**
 * Check if a resource referral was already sent for a safety request
 */
export async function hasReferralBeenSent(safetyRequestId: string): Promise<boolean> {
  const db = getFirestore()

  // Check email queue for existing referral
  const snapshot = await db
    .collection('emailQueue')
    .where('safetyRequestId', '==', safetyRequestId)
    .where('type', '==', 'resource-referral')
    .limit(1)
    .get()

  return !snapshot.empty
}

/**
 * Generate integrity hash for audit logging
 */
export function generateIntegrityHash(data: Record<string, unknown>): string {
  const sortedJson = JSON.stringify(data, Object.keys(data).sort())
  return createHash('sha256').update(sortedJson).digest('hex')
}
