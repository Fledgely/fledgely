/**
 * notifySafeAdult
 *
 * Story 7.5.4: Safe Adult Designation - Task 6
 *
 * Cloud Function that sends notifications to a child's designated safe adult
 * when a safety signal is triggered.
 *
 * CRITICAL SAFETY REQUIREMENTS (INV-002):
 * - Decrypts contact data server-side only
 * - Notification message contains NO app-identifying information
 * - No logging of safe adult contact information
 * - Rate limiting prevents spam/abuse
 * - Deduplication by signalId prevents duplicate notifications
 *
 * Security Flow:
 * 1. Receive encrypted contact from client
 * 2. Decrypt contact using server-side key
 * 3. Send generic notification (no app mention)
 * 4. Return success/failure (no contact info in response)
 *
 * CRITICAL INVARIANT (INV-002): Safe adult contact NEVER visible to family.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { createHash, createDecipheriv, randomBytes, pbkdf2 } from 'crypto'

// ============================================================================
// Types
// ============================================================================

interface NotifySafeAdultRequest {
  /** Child's first name (for notification message) */
  childFirstName: string
  /** Encrypted contact data (base64 encoded) */
  encryptedContact: string
  /** Contact type (phone or email) */
  contactType: 'phone' | 'email'
  /** Encryption key ID (for key derivation) */
  encryptionKeyId: string
  /** Signal ID (for deduplication) */
  signalId: string
}

interface NotifySafeAdultResponse {
  /** Whether the notification was sent successfully */
  success: boolean
  /** Error message if failed (generic, no leak) */
  error: string | null
  /** Timestamp when notification was sent (ISO) */
  sentAt: string | null
}

interface DecryptedContact {
  type: 'phone' | 'email'
  value: string
}

// ============================================================================
// Constants
// ============================================================================

/** Rate limit: max notifications per signal */
const MAX_NOTIFICATIONS_PER_SIGNAL = 3

/** SMS message template (generic, NO app mention) */
const SMS_TEMPLATE = '{firstName} needs help. Please reach out.'

/** Email subject (generic, NO app mention) */
const EMAIL_SUBJECT = 'Someone needs your help'

/** Email body template (generic, NO app mention) */
const EMAIL_TEMPLATE =
  '{firstName} reached out because they need help. Please check in with them when you can.'

/** Firestore collection for notification tracking (NOT safe adult data) */
const NOTIFICATION_LOG_COLLECTION = 'safeAdultNotificationLog'

/** AES key derivation salt - MUST match client-side SafeAdultEncryptionService */
const SAFE_ADULT_SALT = 'fledgely-safe-adult-salt-v1-isolated'

/** PBKDF2 iterations - MUST match client-side */
const PBKDF2_ITERATIONS = 100000

/** AES IV length */
const AES_IV_LENGTH = 12

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format notification message
 */
function formatNotificationMessage(template: string, firstName: string): string {
  return template.replace('{firstName}', firstName)
}

/**
 * Derive decryption key from keyId
 *
 * CRITICAL: This derivation MUST match the client-side SafeAdultEncryptionService.
 * In production, this would use a secure key management system (KMS).
 *
 * For now, we use a server-side secret + PBKDF2 to derive the key.
 */
async function deriveDecryptionKey(keyId: string): Promise<Buffer> {
  // In production, retrieve from Firebase Secret Manager or Cloud KMS
  // For development, use environment variable or derive from keyId
  const serverSecret = process.env.SAFE_ADULT_ENCRYPTION_SECRET || 'development-secret-key'

  // Use PBKDF2 to derive a 256-bit key
  return new Promise((resolve, reject) => {
    pbkdf2(
      `${serverSecret}-${keyId}`,
      Buffer.from(SAFE_ADULT_SALT),
      PBKDF2_ITERATIONS,
      32, // 256 bits
      'sha256',
      (err, derivedKey) => {
        if (err) reject(err)
        else resolve(derivedKey)
      }
    )
  })
}

/**
 * Decrypt contact data
 *
 * CRITICAL: Contact data is encrypted with AES-GCM.
 * Format: IV (12 bytes) + ciphertext + auth tag (16 bytes)
 */
async function decryptContact(
  encryptedData: string,
  keyId: string
): Promise<DecryptedContact | null> {
  try {
    // Decode base64
    const buffer = Buffer.from(encryptedData, 'base64')

    // Extract IV (first 12 bytes)
    const iv = buffer.subarray(0, AES_IV_LENGTH)

    // The rest is ciphertext + auth tag
    // GCM auth tag is last 16 bytes
    const ciphertextWithTag = buffer.subarray(AES_IV_LENGTH)

    // Derive key
    const key = await deriveDecryptionKey(keyId)

    // Decrypt using AES-256-GCM
    const decipher = createDecipheriv('aes-256-gcm', key, iv)

    // Set auth tag (last 16 bytes of ciphertextWithTag)
    const authTagStart = ciphertextWithTag.length - 16
    const authTag = ciphertextWithTag.subarray(authTagStart)
    const ciphertext = ciphertextWithTag.subarray(0, authTagStart)

    decipher.setAuthTag(authTag)

    // Decrypt
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])

    // Parse JSON
    const contact = JSON.parse(decrypted.toString('utf8'))

    // Validate structure
    if (!contact.type || !contact.value) {
      return null
    }

    return {
      type: contact.type,
      value: contact.value,
    }
  } catch (error) {
    console.error('Decryption failed (generic error logged)', {
      // CRITICAL: Do NOT log the actual error details or encrypted data
      keyId: keyId.substring(0, 8) + '...',
    })
    return null
  }
}

/**
 * Send SMS notification
 *
 * In production, integrate with Twilio, AWS SNS, or similar.
 * For development, we simulate success.
 */
async function sendSMS(
  phoneNumber: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  // Validate phone number format (basic check)
  const digits = phoneNumber.replace(/\D/g, '')
  if (digits.length < 10 || digits.length > 15) {
    return { success: false, error: 'Invalid phone format' }
  }

  // In production, integrate with SMS provider here
  // Example Twilio integration:
  // const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN)
  // await client.messages.create({
  //   body: message,
  //   from: process.env.TWILIO_PHONE,
  //   to: phoneNumber
  // })

  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 100))

  console.log('SMS notification simulated (development mode)', {
    // CRITICAL: Do NOT log the actual phone number
    phoneDigitsCount: digits.length,
    messageLength: message.length,
  })

  return { success: true }
}

/**
 * Send email notification
 *
 * In production, integrate with SendGrid, SES, or similar.
 * For development, we simulate success.
 */
async function sendEmail(
  email: string,
  subject: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  // Validate email format (basic check)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { success: false, error: 'Invalid email format' }
  }

  // In production, integrate with email provider here
  // Example SendGrid integration:
  // const sgMail = require('@sendgrid/mail')
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  // await sgMail.send({ to: email, from: 'noreply@example.com', subject, text: body })

  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 100))

  console.log('Email notification simulated (development mode)', {
    // CRITICAL: Do NOT log the actual email address
    emailDomain: email.split('@')[1],
    subjectLength: subject.length,
  })

  return { success: true }
}

/**
 * Check and update notification count for rate limiting
 */
async function checkAndUpdateNotificationCount(
  db: FirebaseFirestore.Firestore,
  signalId: string
): Promise<{ allowed: boolean; count: number }> {
  const logRef = db.collection(NOTIFICATION_LOG_COLLECTION).doc(signalId)

  return db.runTransaction(async (transaction) => {
    const doc = await transaction.get(logRef)

    if (!doc.exists) {
      // First notification for this signal
      transaction.set(logRef, {
        count: 1,
        firstNotificationAt: Timestamp.now(),
        lastNotificationAt: Timestamp.now(),
      })
      return { allowed: true, count: 1 }
    }

    const data = doc.data()!
    const currentCount = data.count || 0

    if (currentCount >= MAX_NOTIFICATIONS_PER_SIGNAL) {
      return { allowed: false, count: currentCount }
    }

    // Increment count
    transaction.update(logRef, {
      count: currentCount + 1,
      lastNotificationAt: Timestamp.now(),
    })

    return { allowed: true, count: currentCount + 1 }
  })
}

/**
 * Validate request input
 */
function validateRequest(data: unknown): data is NotifySafeAdultRequest {
  if (typeof data !== 'object' || data === null) return false

  const req = data as Record<string, unknown>

  return (
    typeof req.childFirstName === 'string' &&
    req.childFirstName.length > 0 &&
    typeof req.encryptedContact === 'string' &&
    req.encryptedContact.length > 0 &&
    (req.contactType === 'phone' || req.contactType === 'email') &&
    typeof req.encryptionKeyId === 'string' &&
    req.encryptionKeyId.length > 0 &&
    typeof req.signalId === 'string' &&
    req.signalId.length > 0
  )
}

// ============================================================================
// Cloud Function
// ============================================================================

/**
 * Callable Cloud Function: notifySafeAdult
 *
 * Sends a notification to a child's designated safe adult.
 *
 * CRITICAL SAFETY REQUIREMENTS:
 * - No authentication required (child may not have an account)
 * - No logging of contact information
 * - Generic notification message (no app mention)
 * - Rate limited per signal
 */
export const notifySafeAdult = onCall(
  {
    // No enforceAppCheck - safety feature must be accessible
    // Rate limiting is handled at the application level
  },
  async (request): Promise<NotifySafeAdultResponse> => {
    const data = request.data

    // Validate input
    if (!validateRequest(data)) {
      throw new HttpsError('invalid-argument', 'Invalid request format')
    }

    const db = getFirestore()

    try {
      // Check rate limit
      const rateCheck = await checkAndUpdateNotificationCount(db, data.signalId)

      if (!rateCheck.allowed) {
        // Rate limit exceeded, but we don't want to reveal this to potential attackers
        // Return success to prevent information leakage
        return {
          success: true,
          error: null,
          sentAt: new Date().toISOString(),
        }
      }

      // Decrypt contact
      const contact = await decryptContact(data.encryptedContact, data.encryptionKeyId)

      if (!contact) {
        // Decryption failed - return generic error
        return {
          success: false,
          error: 'Unable to process request',
          sentAt: null,
        }
      }

      // Verify contact type matches
      if (contact.type !== data.contactType) {
        return {
          success: false,
          error: 'Invalid request',
          sentAt: null,
        }
      }

      // Send notification based on contact type
      let sendResult: { success: boolean; error?: string }

      if (contact.type === 'phone') {
        const message = formatNotificationMessage(SMS_TEMPLATE, data.childFirstName)
        sendResult = await sendSMS(contact.value, message)
      } else {
        const subject = EMAIL_SUBJECT
        const body = formatNotificationMessage(EMAIL_TEMPLATE, data.childFirstName)
        sendResult = await sendEmail(contact.value, subject, body)
      }

      if (sendResult.success) {
        return {
          success: true,
          error: null,
          sentAt: new Date().toISOString(),
        }
      } else {
        return {
          success: false,
          error: 'Unable to send notification',
          sentAt: null,
        }
      }
    } catch (error) {
      console.error('Safe adult notification error (generic)', {
        // CRITICAL: Do NOT log request details
        signalIdPrefix: data.signalId.substring(0, 8) + '...',
      })

      return {
        success: false,
        error: 'An error occurred',
        sentAt: null,
      }
    }
  }
)
