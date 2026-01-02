/**
 * Safe Adult Contracts - Story 7.5.4 Task 1
 *
 * Data models for safe adult designation feature.
 * AC1: Safe adult notification option
 * AC3: Pre-configured safe adult
 * AC4: Safe adult data isolation
 * AC6: Phone and email support
 *
 * CRITICAL SAFETY:
 * - Safe adult data stored with SEPARATE encryption key (not family key)
 * - No parent-accessible references to safe adult data
 * - Messages do NOT mention fledgely or monitoring
 */

import { z } from 'zod'

// ============================================
// Constants
// ============================================

/**
 * Contact methods for safe adult notification.
 */
export const SAFE_ADULT_CONTACT_METHOD = {
  SMS: 'sms',
  EMAIL: 'email',
} as const

/**
 * Delivery status for safe adult notifications.
 */
export const NOTIFICATION_DELIVERY_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  FAILED: 'failed',
} as const

/**
 * Default values for safe adult designations.
 */
export const SAFE_ADULT_DEFAULTS = {
  PREFERRED_METHOD: 'sms' as const,
  MAX_DISPLAY_NAME_LENGTH: 50,
  DEFAULT_DISPLAY_NAME: 'Trusted Adult',
} as const

// ============================================
// Zod Schemas
// ============================================

/**
 * Contact method schema.
 */
export const contactMethodSchema = z.enum(['sms', 'email'])

/**
 * Delivery status schema.
 */
export const deliveryStatusSchema = z.enum(['pending', 'sent', 'delivered', 'failed'])

/**
 * E.164 phone number regex pattern.
 * Format: +[country code][number] (e.g., +15551234567)
 */
const E164_REGEX = /^\+[1-9]\d{1,14}$/

/**
 * Safe adult designation schema.
 *
 * Stores encrypted contact information for a child's trusted adult.
 * Data is isolated from family access using separate encryption.
 */
export const safeAdultDesignationSchema = z.object({
  id: z.string().min(1),
  childId: z.string().min(1),
  // Contact information - at least one required
  phoneNumber: z.string().regex(E164_REGEX).nullable(),
  email: z.string().email().nullable(),
  // Preferred contact method
  preferredMethod: contactMethodSchema,
  // Display name for child's reference (NOT sent in message)
  displayName: z.string().min(1).max(100),
  // Timestamps
  createdAt: z.date(),
  updatedAt: z.date(),
  // Configuration type
  isPreConfigured: z.boolean(),
  // Encryption metadata (NOT the key itself)
  encryptionKeyId: z.string().min(1),
})

/**
 * Safe adult notification schema.
 *
 * Tracks notification delivery to safe adults.
 * Messages do NOT mention fledgely or monitoring.
 */
export const safeAdultNotificationSchema = z.object({
  id: z.string().min(1),
  designationId: z.string().min(1),
  signalId: z.string().min(1),
  childName: z.string().min(1), // First name only for privacy
  sentAt: z.date(),
  deliveryStatus: deliveryStatusSchema,
  deliveredAt: z.date().nullable(),
  failureReason: z.string().nullable(),
  retryCount: z.number().int().min(0),
})

/**
 * Contact input schema for validation.
 * Treats empty strings as "not provided".
 */
export const safeAdultContactInputSchema = z
  .object({
    phone: z.string().optional(),
    email: z.string().optional(),
  })
  .refine(
    (data) => {
      const hasPhone = data.phone && data.phone.trim().length > 0
      const hasEmail = data.email && data.email.trim().length > 0
      return hasPhone || hasEmail
    },
    {
      message: 'At least one contact method (phone or email) is required',
    }
  )

// ============================================
// Types
// ============================================

export type ContactMethod = z.infer<typeof contactMethodSchema>
export type DeliveryStatus = z.infer<typeof deliveryStatusSchema>
export type SafeAdultDesignation = z.infer<typeof safeAdultDesignationSchema>
export type SafeAdultNotification = z.infer<typeof safeAdultNotificationSchema>
export type SafeAdultContactInput = z.infer<typeof safeAdultContactInputSchema>

// ============================================
// ID Generation Functions
// ============================================

/**
 * Generate a cryptographically secure safe adult designation ID.
 * Uses crypto.randomUUID() to prevent prediction/enumeration attacks.
 */
export function generateSafeAdultId(): string {
  return `sa_${crypto.randomUUID()}`
}

/**
 * Generate a cryptographically secure notification ID.
 * Uses crypto.randomUUID() to prevent prediction/enumeration attacks.
 */
export function generateNotificationId(): string {
  return `notif_${crypto.randomUUID()}`
}

/**
 * Generate a cryptographically secure encryption key ID.
 * Uses crypto.randomUUID() to prevent prediction/enumeration attacks.
 */
export function generateEncryptionKeyId(): string {
  return `sakey_${crypto.randomUUID()}`
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create a safe adult designation.
 *
 * @param childId - The child's ID
 * @param phoneNumber - Phone number in E.164 format (or null)
 * @param email - Email address (or null)
 * @param displayName - Display name for child's reference
 * @param isPreConfigured - Whether this is pre-configured (vs signal-time)
 * @param preferredMethod - Preferred contact method (defaults to 'sms')
 * @returns New safe adult designation
 */
export function createSafeAdultDesignation(
  childId: string,
  phoneNumber: string | null,
  email: string | null,
  displayName: string,
  isPreConfigured: boolean,
  preferredMethod: ContactMethod = SAFE_ADULT_DEFAULTS.PREFERRED_METHOD
): SafeAdultDesignation {
  const now = new Date()

  return {
    id: generateSafeAdultId(),
    childId,
    phoneNumber,
    email,
    preferredMethod,
    displayName,
    createdAt: now,
    updatedAt: now,
    isPreConfigured,
    encryptionKeyId: generateEncryptionKeyId(),
  }
}

/**
 * Create a safe adult notification record.
 *
 * @param designationId - The safe adult designation ID
 * @param signalId - The safety signal ID
 * @param childName - Child's first name (for message)
 * @returns New notification record
 */
export function createSafeAdultNotification(
  designationId: string,
  signalId: string,
  childName: string
): SafeAdultNotification {
  return {
    id: generateNotificationId(),
    designationId,
    signalId,
    childName,
    sentAt: new Date(),
    deliveryStatus: 'pending',
    deliveredAt: null,
    failureReason: null,
    retryCount: 0,
  }
}

/**
 * Create a pre-configured safe adult designation.
 *
 * AC3: Pre-configured safe adult before any crisis.
 *
 * @param childId - The child's ID
 * @param contact - Contact information (phone and/or email)
 * @param displayName - Display name
 * @returns Pre-configured designation
 */
export function createPreConfiguredSafeAdult(
  childId: string,
  contact: { phone?: string; email?: string },
  displayName: string
): SafeAdultDesignation {
  const phoneNumber = contact.phone || null
  const email = contact.email || null

  // Determine preferred method based on what's provided
  let preferredMethod: ContactMethod = SAFE_ADULT_DEFAULTS.PREFERRED_METHOD
  if (phoneNumber) {
    preferredMethod = 'sms'
  } else if (email) {
    preferredMethod = 'email'
  }

  return createSafeAdultDesignation(childId, phoneNumber, email, displayName, true, preferredMethod)
}

/**
 * Create a signal-time safe adult designation.
 *
 * AC1: Designate during signal processing.
 *
 * @param childId - The child's ID
 * @param contact - Contact information (phone and/or email)
 * @param displayName - Optional display name (defaults to 'Trusted Adult')
 * @returns Signal-time designation
 */
export function createSignalTimeSafeAdult(
  childId: string,
  contact: { phone?: string; email?: string },
  displayName: string = SAFE_ADULT_DEFAULTS.DEFAULT_DISPLAY_NAME
): SafeAdultDesignation {
  const phoneNumber = contact.phone || null
  const email = contact.email || null

  // Determine preferred method based on what's provided
  let preferredMethod: ContactMethod = SAFE_ADULT_DEFAULTS.PREFERRED_METHOD
  if (phoneNumber) {
    preferredMethod = 'sms'
  } else if (email) {
    preferredMethod = 'email'
  }

  return createSafeAdultDesignation(
    childId,
    phoneNumber,
    email,
    displayName,
    false,
    preferredMethod
  )
}

// ============================================
// Validation Functions
// ============================================

/**
 * Validate a safe adult designation object.
 * Throws on invalid input.
 *
 * @param data - Data to validate
 * @returns Validated designation
 * @throws ZodError if validation fails
 */
export function validateSafeAdultDesignation(data: unknown): SafeAdultDesignation {
  return safeAdultDesignationSchema.parse(data)
}

/**
 * Validate a safe adult notification object.
 * Throws on invalid input.
 *
 * @param data - Data to validate
 * @returns Validated notification
 * @throws ZodError if validation fails
 */
export function validateSafeAdultNotification(data: unknown): SafeAdultNotification {
  return safeAdultNotificationSchema.parse(data)
}

/**
 * Contact validation result.
 */
export interface ContactValidationResult {
  valid: boolean
  hasPhone?: boolean
  hasEmail?: boolean
  error?: string
}

/**
 * Validate contact input.
 *
 * @param data - Contact input to validate
 * @returns Validation result with hasPhone and hasEmail flags
 */
export function validateContactInput(data: unknown): ContactValidationResult {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid input' }
  }

  const input = data as { phone?: string; email?: string }
  const hasPhone = !!(input.phone && input.phone.trim().length > 0)
  const hasEmail = !!(input.email && input.email.trim().length > 0)

  if (!hasPhone && !hasEmail) {
    return { valid: false, error: 'At least one contact method is required' }
  }

  return { valid: true, hasPhone, hasEmail }
}

// ============================================
// Type Guards
// ============================================

/**
 * Check if data is a valid SafeAdultDesignation.
 */
export function isSafeAdultDesignation(data: unknown): data is SafeAdultDesignation {
  return safeAdultDesignationSchema.safeParse(data).success
}

/**
 * Check if data is a valid SafeAdultNotification.
 */
export function isSafeAdultNotification(data: unknown): data is SafeAdultNotification {
  return safeAdultNotificationSchema.safeParse(data).success
}

/**
 * Check if designation has phone contact.
 */
export function hasPhoneContact(designation: SafeAdultDesignation): boolean {
  return designation.phoneNumber !== null && designation.phoneNumber.length > 0
}

/**
 * Check if designation has email contact.
 */
export function hasEmailContact(designation: SafeAdultDesignation): boolean {
  return designation.email !== null && designation.email.length > 0
}

/**
 * Check if designation has at least one valid contact.
 */
export function hasValidContact(designation: SafeAdultDesignation): boolean {
  return hasPhoneContact(designation) || hasEmailContact(designation)
}
