import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore'
import { createHash } from 'crypto'

/**
 * Legal Petition Notification Types
 * Story 3.6: Legal Parent Petition for Access - Task 12
 */
export type LegalPetitionNotificationType =
  | 'legal-parent-access-granted'
  | 'court-ordered-parent-added'
  | 'petition-status-update'

/**
 * Email queue item for legal petition notifications
 */
export interface LegalPetitionEmailQueueItem {
  type: LegalPetitionNotificationType
  recipient: string
  petitionId: string
  petitionerName?: string
  childName?: string
  familyId?: string
  status?: string
  supportMessage?: string
  additionalData?: Record<string, unknown>
  createdAt: Timestamp
  status_email: 'pending' | 'processing' | 'sent' | 'failed'
  attempts: number
  maxAttempts: number
  nextAttemptAt?: Timestamp
  lastAttemptAt?: Timestamp
  sentAt?: Timestamp
  error?: string
}

/**
 * Maximum retry attempts for notifications
 */
export const MAX_NOTIFICATION_ATTEMPTS = 3

/**
 * Generate neutral subject line for legal petition notifications
 * CRITICAL: Subject lines should be neutral and not reveal purpose to protect privacy
 */
export function generateSubject(type: LegalPetitionNotificationType): string {
  switch (type) {
    case 'legal-parent-access-granted':
      return 'Your access request has been processed'
    case 'court-ordered-parent-added':
      return 'Important family account update'
    case 'petition-status-update':
      return 'Update on your request'
    default:
      return 'Fledgely notification'
  }
}

/**
 * Escape HTML special characters for safe embedding
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
 * Generate HTML email content for LEGAL_PARENT_ACCESS_GRANTED
 * Sent to new parent when their petition is verified and access granted
 */
export function generateAccessGrantedHtml(
  petitionerName: string,
  childName: string
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .content { padding: 20px 0; }
    .highlight { background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888; }
  </style>
</head>
<body>
  <div class="header">
    <h2 style="margin: 0; color: #1e40af;">Access Request Approved</h2>
  </div>

  <div class="content">
    <p>Dear ${escapeHtml(petitionerName)},</p>

    <p>Your legal petition for access has been reviewed and approved. You now have access to monitor ${escapeHtml(childName)}'s account on Fledgely.</p>

    <div class="highlight">
      <strong>What's Next:</strong>
      <ul>
        <li>Log in to your Fledgely account to access monitoring features</li>
        <li>Review the family settings to understand your access permissions</li>
        <li>Contact support if you have any questions</li>
      </ul>
    </div>

    <p>As a guardian, you have equal access to monitoring features as other family guardians.</p>
  </div>

  <div class="footer">
    <p>If you did not submit a petition request, please contact our support team immediately.</p>
    <p>This email was sent by Fledgely Family Safety.</p>
  </div>
</body>
</html>`
}

/**
 * Generate plain text content for LEGAL_PARENT_ACCESS_GRANTED
 */
export function generateAccessGrantedText(
  petitionerName: string,
  childName: string
): string {
  return `ACCESS REQUEST APPROVED

Dear ${petitionerName},

Your legal petition for access has been reviewed and approved. You now have access to monitor ${childName}'s account on Fledgely.

WHAT'S NEXT:
- Log in to your Fledgely account to access monitoring features
- Review the family settings to understand your access permissions
- Contact support if you have any questions

As a guardian, you have equal access to monitoring features as other family guardians.

---

If you did not submit a petition request, please contact our support team immediately.

This email was sent by Fledgely Family Safety.`
}

/**
 * Generate HTML email content for COURT_ORDERED_PARENT_ADDED
 * Sent to existing guardians when a court-ordered parent is added
 */
export function generateCourtOrderedParentAddedHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .content { padding: 20px 0; }
    .info-box { background: #f3f4f6; border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888; }
  </style>
</head>
<body>
  <div class="header">
    <h2 style="margin: 0; color: #92400e;">Important Family Account Update</h2>
  </div>

  <div class="content">
    <p>A parent with verified court documentation has been granted access to your family's Fledgely account.</p>

    <div class="info-box">
      <p><strong>What This Means:</strong></p>
      <ul>
        <li>A legal parent has submitted court-verified documentation</li>
        <li>After review by our support team, access has been granted</li>
        <li>This was a legal process, not an invitation you sent</li>
        <li>You can view all family guardians in your family settings</li>
      </ul>
    </div>

    <p>The new guardian has equal access to monitoring features. This access cannot be revoked through the app as it was granted through a legal process.</p>

    <p>If you believe this is an error, please contact our support team with any relevant documentation.</p>
  </div>

  <div class="footer">
    <p>This email was sent by Fledgely Family Safety.</p>
  </div>
</body>
</html>`
}

/**
 * Generate plain text content for COURT_ORDERED_PARENT_ADDED
 */
export function generateCourtOrderedParentAddedText(): string {
  return `IMPORTANT FAMILY ACCOUNT UPDATE

A parent with verified court documentation has been granted access to your family's Fledgely account.

WHAT THIS MEANS:
- A legal parent has submitted court-verified documentation
- After review by our support team, access has been granted
- This was a legal process, not an invitation you sent
- You can view all family guardians in your family settings

The new guardian has equal access to monitoring features. This access cannot be revoked through the app as it was granted through a legal process.

If you believe this is an error, please contact our support team with any relevant documentation.

---

This email was sent by Fledgely Family Safety.`
}

/**
 * Generate HTML email content for PETITION_STATUS_UPDATE
 * Sent to petitioner when their petition status changes
 */
export function generatePetitionStatusUpdateHtml(
  petitionerName: string,
  status: string,
  supportMessage?: string
): string {
  const statusMessages: Record<string, { title: string; message: string; color: string }> = {
    'pending': {
      title: 'Petition Received',
      message: 'Your petition has been received and is awaiting review by our support team.',
      color: '#f59e0b',
    },
    'under-review': {
      title: 'Under Review',
      message: 'Your petition is currently being reviewed by our support team. We will contact you if we need additional information.',
      color: '#3b82f6',
    },
    'verified': {
      title: 'Petition Approved',
      message: 'Your petition has been verified and approved. You should receive separate notification about your access being granted.',
      color: '#10b981',
    },
    'denied': {
      title: 'Petition Denied',
      message: 'After review, we were unable to verify your petition. Please see the message below for more information.',
      color: '#ef4444',
    },
  }

  const statusInfo = statusMessages[status] || {
    title: 'Status Update',
    message: 'Your petition status has been updated.',
    color: '#6b7280',
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${statusInfo.color}20; border-left: 4px solid ${statusInfo.color}; padding: 20px; margin-bottom: 20px; }
    .content { padding: 20px 0; }
    .message-box { background: #f9fafb; border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888; }
  </style>
</head>
<body>
  <div class="header">
    <h2 style="margin: 0; color: ${statusInfo.color};">${escapeHtml(statusInfo.title)}</h2>
  </div>

  <div class="content">
    <p>Dear ${escapeHtml(petitionerName)},</p>

    <p>${escapeHtml(statusInfo.message)}</p>

    ${supportMessage ? `
    <div class="message-box">
      <p><strong>Message from Support:</strong></p>
      <p>${escapeHtml(supportMessage)}</p>
    </div>
    ` : ''}

    ${status === 'denied' ? `
    <p>You may submit a new petition with additional documentation if you believe you have valid legal standing. Required documentation typically includes:</p>
    <ul>
      <li>Court custody order</li>
      <li>Birth certificate</li>
      <li>Legal guardian documentation</li>
    </ul>
    ` : ''}

    <p>If you have questions about your petition, you can check the status anytime using your reference number and email address.</p>
  </div>

  <div class="footer">
    <p>This email was sent by Fledgely Family Safety.</p>
  </div>
</body>
</html>`
}

/**
 * Generate plain text content for PETITION_STATUS_UPDATE
 */
export function generatePetitionStatusUpdateText(
  petitionerName: string,
  status: string,
  supportMessage?: string
): string {
  const statusMessages: Record<string, { title: string; message: string }> = {
    'pending': {
      title: 'PETITION RECEIVED',
      message: 'Your petition has been received and is awaiting review by our support team.',
    },
    'under-review': {
      title: 'UNDER REVIEW',
      message: 'Your petition is currently being reviewed by our support team. We will contact you if we need additional information.',
    },
    'verified': {
      title: 'PETITION APPROVED',
      message: 'Your petition has been verified and approved. You should receive separate notification about your access being granted.',
    },
    'denied': {
      title: 'PETITION DENIED',
      message: 'After review, we were unable to verify your petition. Please see the message below for more information.',
    },
  }

  const statusInfo = statusMessages[status] || {
    title: 'STATUS UPDATE',
    message: 'Your petition status has been updated.',
  }

  let text = `${statusInfo.title}

Dear ${petitionerName},

${statusInfo.message}
`

  if (supportMessage) {
    text += `
MESSAGE FROM SUPPORT:
${supportMessage}
`
  }

  if (status === 'denied') {
    text += `
You may submit a new petition with additional documentation if you believe you have valid legal standing. Required documentation typically includes:
- Court custody order
- Birth certificate
- Legal guardian documentation
`
  }

  text += `
If you have questions about your petition, you can check the status anytime using your reference number and email address.

---

This email was sent by Fledgely Family Safety.`

  return text
}

/**
 * Queue a notification email for a legal petition
 * CRITICAL: Notifications go to safe contact info only (not family-visible channels)
 */
export async function queueLegalPetitionNotification(
  type: LegalPetitionNotificationType,
  recipientEmail: string,
  data: {
    petitionId: string
    petitionerName?: string
    childName?: string
    familyId?: string
    status?: string
    supportMessage?: string
    additionalData?: Record<string, unknown>
  }
): Promise<string> {
  const db = getFirestore()
  const now = Timestamp.now()

  const queueItem = {
    type,
    recipient: recipientEmail,
    petitionId: data.petitionId,
    petitionerName: data.petitionerName || null,
    childName: data.childName || null,
    familyId: data.familyId || null,
    status: data.status || null,
    supportMessage: data.supportMessage || null,
    additionalData: data.additionalData || null,
    createdAt: now,
    status_email: 'pending',
    attempts: 0,
    maxAttempts: MAX_NOTIFICATION_ATTEMPTS,
    nextAttemptAt: now,
  }

  const docRef = await db.collection('legalPetitionNotificationQueue').add(queueItem)
  return docRef.id
}

/**
 * Send notification to new parent when access is granted
 */
export async function notifyNewParentAccessGranted(
  recipientEmail: string,
  petitionId: string,
  petitionerName: string,
  childName: string
): Promise<string> {
  return queueLegalPetitionNotification('legal-parent-access-granted', recipientEmail, {
    petitionId,
    petitionerName,
    childName,
  })
}

/**
 * Send notification to existing guardians when court-ordered parent is added
 */
export async function notifyExistingGuardiansCourtOrderedParent(
  guardianEmails: string[],
  petitionId: string,
  familyId: string
): Promise<string[]> {
  const queueIds: string[] = []

  for (const email of guardianEmails) {
    const queueId = await queueLegalPetitionNotification('court-ordered-parent-added', email, {
      petitionId,
      familyId,
    })
    queueIds.push(queueId)
  }

  return queueIds
}

/**
 * Send petition status update notification to petitioner
 */
export async function notifyPetitionerStatusUpdate(
  recipientEmail: string,
  petitionId: string,
  petitionerName: string,
  status: string,
  supportMessage?: string
): Promise<string> {
  return queueLegalPetitionNotification('petition-status-update', recipientEmail, {
    petitionId,
    petitionerName,
    status,
    supportMessage,
  })
}

/**
 * Generate integrity hash for audit logging
 */
export function generateIntegrityHash(data: Record<string, unknown>): string {
  const sortedJson = JSON.stringify(data, Object.keys(data).sort())
  return createHash('sha256').update(sortedJson).digest('hex')
}
