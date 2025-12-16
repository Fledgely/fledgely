import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore'
import { createHash } from 'crypto'
import {
  LegalPetitionNotificationType,
  generateSubject,
  generateAccessGrantedHtml,
  generateAccessGrantedText,
  generateCourtOrderedParentAddedHtml,
  generateCourtOrderedParentAddedText,
  generatePetitionStatusUpdateHtml,
  generatePetitionStatusUpdateText,
  MAX_NOTIFICATION_ATTEMPTS,
  generateIntegrityHash,
} from '../utils/legalPetitionNotifications'

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
 * Simulated email sending function
 * In production, integrate with SendGrid, SES, or similar
 */
async function sendNotificationEmail(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(to)) {
    return { success: false, error: 'Invalid email format' }
  }

  // In production, integrate with email provider here
  // Example SendGrid integration:
  // const sgMail = require('@sendgrid/mail')
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  // await sgMail.send({ to, from: 'support@fledgely.com', subject, html, text })

  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 100))

  // Generate pseudo message ID
  const messageId = createHash('sha256')
    .update(`${to}-${Date.now()}`)
    .digest('hex')
    .slice(0, 24)

  return { success: true, messageId }
}

/**
 * Generate email content based on notification type
 */
function generateEmailContent(
  type: LegalPetitionNotificationType,
  data: {
    petitionerName?: string
    childName?: string
    status?: string
    supportMessage?: string
  }
): { subject: string; html: string; text: string } {
  const subject = generateSubject(type)

  switch (type) {
    case 'legal-parent-access-granted':
      return {
        subject,
        html: generateAccessGrantedHtml(
          data.petitionerName || 'Parent',
          data.childName || 'your child'
        ),
        text: generateAccessGrantedText(
          data.petitionerName || 'Parent',
          data.childName || 'your child'
        ),
      }

    case 'court-ordered-parent-added':
      return {
        subject,
        html: generateCourtOrderedParentAddedHtml(),
        text: generateCourtOrderedParentAddedText(),
      }

    case 'petition-status-update':
      return {
        subject,
        html: generatePetitionStatusUpdateHtml(
          data.petitionerName || 'Petitioner',
          data.status || 'pending',
          data.supportMessage
        ),
        text: generatePetitionStatusUpdateText(
          data.petitionerName || 'Petitioner',
          data.status || 'pending',
          data.supportMessage
        ),
      }

    default:
      throw new Error(`Unknown notification type: ${type}`)
  }
}

/**
 * Calculate next retry time based on attempt number
 */
function calculateNextRetryTime(attemptNumber: number): Timestamp {
  const delayIndex = Math.min(attemptNumber, RETRY_DELAYS_MS.length - 1)
  const delayMs = RETRY_DELAYS_MS[delayIndex]
  return Timestamp.fromMillis(Date.now() + delayMs)
}

/**
 * Log notification delivery to admin audit
 */
async function logNotificationDelivery(
  db: FirebaseFirestore.Firestore,
  queueId: string,
  type: LegalPetitionNotificationType,
  petitionId: string,
  status: 'success' | 'failed',
  messageId?: string,
  error?: string
): Promise<void> {
  const auditData: Record<string, unknown> = {
    action: `legal-petition-notification-${status}`,
    resourceType: 'legalPetitionNotificationQueue',
    resourceId: queueId,
    notificationType: type,
    petitionId,
    timestamp: FieldValue.serverTimestamp(),
    sealed: false,
  }

  if (messageId) {
    auditData.messageId = messageId
  }

  if (error) {
    auditData.error = error
  }

  const hashData = {
    ...auditData,
    timestamp: Timestamp.now().toDate().toISOString(),
  }
  const integrityHash = generateIntegrityHash(hashData)

  await db.collection('adminAuditLog').add({
    ...auditData,
    integrityHash,
  })
}

/**
 * Process a single notification queue item
 */
async function processNotificationQueueItem(
  db: FirebaseFirestore.Firestore,
  queueId: string,
  data: {
    type: LegalPetitionNotificationType
    recipient: string
    petitionId: string
    petitionerName?: string
    childName?: string
    status?: string
    supportMessage?: string
    attempts: number
  }
): Promise<void> {
  const docRef = db.collection('legalPetitionNotificationQueue').doc(queueId)

  try {
    // Mark as processing
    await docRef.update({
      status_email: 'processing',
      lastAttemptAt: Timestamp.now(),
    })

    // Generate email content
    const emailContent = generateEmailContent(data.type, {
      petitionerName: data.petitionerName,
      childName: data.childName,
      status: data.status,
      supportMessage: data.supportMessage,
    })

    // Send email
    const result = await sendNotificationEmail(
      data.recipient,
      emailContent.subject,
      emailContent.html,
      emailContent.text
    )

    if (result.success) {
      // Success - update status
      await docRef.update({
        status_email: 'sent',
        sentAt: Timestamp.now(),
        lastAttemptAt: Timestamp.now(),
        attempts: (data.attempts || 0) + 1,
      })

      // Log success
      await logNotificationDelivery(
        db,
        queueId,
        data.type,
        data.petitionId,
        'success',
        result.messageId
      )
    } else {
      // Failure - check if we should retry
      const newAttemptCount = (data.attempts || 0) + 1

      if (newAttemptCount >= MAX_NOTIFICATION_ATTEMPTS) {
        // Max retries reached
        await docRef.update({
          status_email: 'failed',
          attempts: newAttemptCount,
          lastAttemptAt: Timestamp.now(),
          error: result.error || 'Unknown error',
        })

        // Log failure
        await logNotificationDelivery(
          db,
          queueId,
          data.type,
          data.petitionId,
          'failed',
          undefined,
          result.error
        )
      } else {
        // Schedule retry with exponential backoff
        await docRef.update({
          status_email: 'pending',
          attempts: newAttemptCount,
          lastAttemptAt: Timestamp.now(),
          nextAttemptAt: calculateNextRetryTime(newAttemptCount),
          error: result.error || 'Unknown error',
        })
      }
    }
  } catch (error) {
    console.error('Notification processing error', {
      queueId,
      error: error instanceof Error ? error.message : 'Unknown',
    })

    // Schedule retry if possible
    const newAttemptCount = (data.attempts || 0) + 1
    if (newAttemptCount < MAX_NOTIFICATION_ATTEMPTS) {
      await docRef.update({
        status_email: 'pending',
        attempts: newAttemptCount,
        lastAttemptAt: Timestamp.now(),
        nextAttemptAt: calculateNextRetryTime(newAttemptCount),
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    } else {
      await docRef.update({
        status_email: 'failed',
        attempts: newAttemptCount,
        lastAttemptAt: Timestamp.now(),
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      await logNotificationDelivery(
        db,
        queueId,
        data.type,
        data.petitionId,
        'failed',
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }
}

/**
 * Process newly created legal petition notification queue items
 */
export const processLegalPetitionNotificationOnCreate = onDocumentCreated(
  'legalPetitionNotificationQueue/{queueId}',
  async (event) => {
    const db = getFirestore()
    const queueId = event.params.queueId
    const data = event.data?.data()

    if (!data) {
      console.error('No data in notification queue document')
      return
    }

    // Only process pending items
    if (data.status_email !== 'pending') {
      return
    }

    await processNotificationQueueItem(db, queueId, {
      type: data.type as LegalPetitionNotificationType,
      recipient: data.recipient,
      petitionId: data.petitionId,
      petitionerName: data.petitionerName,
      childName: data.childName,
      status: data.status,
      supportMessage: data.supportMessage,
      attempts: data.attempts || 0,
    })
  }
)

/**
 * Process updated legal petition notification queue items (for retries)
 */
export const processLegalPetitionNotificationOnUpdate = onDocumentUpdated(
  'legalPetitionNotificationQueue/{queueId}',
  async (event) => {
    const db = getFirestore()
    const queueId = event.params.queueId
    const before = event.data?.before.data()
    const after = event.data?.after.data()

    if (!before || !after) {
      return
    }

    // Only process if status changed to pending (retry case)
    if (before.status_email !== 'pending' && after.status_email === 'pending') {
      // Check if it's time to retry
      const now = Timestamp.now()
      if (after.nextAttemptAt && after.nextAttemptAt <= now) {
        await processNotificationQueueItem(db, queueId, {
          type: after.type as LegalPetitionNotificationType,
          recipient: after.recipient,
          petitionId: after.petitionId,
          petitionerName: after.petitionerName,
          childName: after.childName,
          status: after.status,
          supportMessage: after.supportMessage,
          attempts: after.attempts || 0,
        })
      }
    }
  }
)
