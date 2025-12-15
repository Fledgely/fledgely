import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore'
import { createHash } from 'crypto'
import {
  EmailQueueItem,
  generateResourceEmail,
  updateEmailQueueStatus,
  scheduleEmailRetry,
  MAX_RETRY_ATTEMPTS,
  generateIntegrityHash,
} from '../utils/emailService'

/**
 * Simulated email sending function
 * In production, this would integrate with SendGrid, SES, or similar
 *
 * For now, we simulate success/failure based on email format
 */
async function sendEmail(
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
  // For development/testing, we simulate success
  // Example SendGrid integration:
  // const sgMail = require('@sendgrid/mail')
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  // await sgMail.send({ to, from: 'support@example.com', subject, html, text })

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
 * Process newly created email queue items
 */
export const processEmailQueueOnCreate = onDocumentCreated(
  'emailQueue/{queueId}',
  async (event) => {
    const db = getFirestore()
    const queueId = event.params.queueId
    const data = event.data?.data() as EmailQueueItem | undefined

    if (!data) {
      console.error('No data in email queue document')
      return
    }

    // Only process pending items
    if (data.status !== 'pending') {
      return
    }

    // Only process resource-referral type
    if (data.type !== 'resource-referral') {
      return
    }

    await processEmailQueueItem(db, queueId, data)
  }
)

/**
 * Process updated email queue items (for retries)
 */
export const processEmailQueueOnUpdate = onDocumentUpdated(
  'emailQueue/{queueId}',
  async (event) => {
    const db = getFirestore()
    const queueId = event.params.queueId
    const before = event.data?.before.data() as EmailQueueItem | undefined
    const after = event.data?.after.data() as EmailQueueItem | undefined

    if (!before || !after) {
      return
    }

    // Only process if status changed to pending (retry case)
    if (before.status !== 'pending' && after.status === 'pending') {
      // Check if it's time to retry
      const now = Timestamp.now()
      if (after.nextAttemptAt && after.nextAttemptAt <= now) {
        await processEmailQueueItem(db, queueId, after)
      }
    }
  }
)

/**
 * Process a single email queue item
 */
async function processEmailQueueItem(
  db: FirebaseFirestore.Firestore,
  queueId: string,
  data: EmailQueueItem
): Promise<void> {
  const docRef = db.collection('emailQueue').doc(queueId)

  try {
    // Mark as processing
    await docRef.update({
      status: 'processing',
      lastAttemptAt: Timestamp.now(),
    })

    // Generate email content
    const emailContent = await generateResourceEmail(data.usedSafeContact)

    // Send email
    const result = await sendEmail(
      data.recipient,
      emailContent.subject,
      emailContent.html,
      emailContent.text
    )

    if (result.success) {
      // Success - update status
      await docRef.update({
        status: 'sent',
        sentAt: Timestamp.now(),
        lastAttemptAt: Timestamp.now(),
        attempts: (data.attempts || 0) + 1,
      })

      // Update safety request if applicable
      if (data.safetyRequestId && !data.safetyRequestId.startsWith('self-')) {
        const safetyRef = db.collection('safetyRequests').doc(data.safetyRequestId)
        const safetyDoc = await safetyRef.get()
        if (safetyDoc.exists) {
          await safetyRef.update({
            resourceReferralStatus: 'sent',
            resourceReferralSentAt: Timestamp.now(),
          })
        }
      }

      // Log success to sealed audit
      await logEmailDelivery(db, queueId, data, 'success', result.messageId)
    } else {
      // Failure - check if we should retry
      const newAttemptCount = (data.attempts || 0) + 1

      if (newAttemptCount >= MAX_RETRY_ATTEMPTS) {
        // Max retries reached
        await docRef.update({
          status: 'failed',
          attempts: newAttemptCount,
          lastAttemptAt: Timestamp.now(),
          error: result.error || 'Unknown error',
        })

        // Update safety request if applicable
        if (data.safetyRequestId && !data.safetyRequestId.startsWith('self-')) {
          const safetyRef = db.collection('safetyRequests').doc(data.safetyRequestId)
          const safetyDoc = await safetyRef.get()
          if (safetyDoc.exists) {
            await safetyRef.update({
              resourceReferralStatus: 'failed',
            })
          }
        }

        // Log failure to sealed audit
        await logEmailDelivery(db, queueId, data, 'failed', undefined, result.error)
      } else {
        // Schedule retry with exponential backoff
        await scheduleEmailRetry(queueId)
      }
    }
  } catch (error) {
    console.error('Email processing error', {
      queueId,
      error: error instanceof Error ? error.message : 'Unknown',
    })

    // Schedule retry if possible
    const newAttemptCount = (data.attempts || 0) + 1
    if (newAttemptCount < MAX_RETRY_ATTEMPTS) {
      await scheduleEmailRetry(queueId)
    } else {
      await docRef.update({
        status: 'failed',
        attempts: newAttemptCount,
        lastAttemptAt: Timestamp.now(),
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      await logEmailDelivery(
        db,
        queueId,
        data,
        'failed',
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }
}

/**
 * Log email delivery status to sealed admin audit
 */
async function logEmailDelivery(
  db: FirebaseFirestore.Firestore,
  queueId: string,
  data: EmailQueueItem,
  status: 'success' | 'failed',
  messageId?: string,
  error?: string
): Promise<void> {
  const auditData: Record<string, unknown> = {
    action: `resource-email-${status}`,
    resourceType: 'emailQueue',
    resourceId: queueId,
    safetyRequestId: data.safetyRequestId,
    // Redact recipient email for privacy
    recipientRedacted: data.recipient.substring(0, 3) + '***',
    usedSafeContact: data.usedSafeContact,
    attempts: data.attempts,
    timestamp: FieldValue.serverTimestamp(),
    sealed: true,
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
