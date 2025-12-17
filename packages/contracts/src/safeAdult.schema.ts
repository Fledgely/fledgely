/**
 * Safe Adult Schema
 *
 * Story 7.5.4: Safe Adult Designation
 *
 * Defines schemas for safe adult contact designation.
 * Allows children to optionally designate a trusted adult who
 * can be notified when they trigger a safety signal.
 *
 * CRITICAL INVARIANT (INV-002): Safety signals NEVER visible to family.
 * - Safe adult contacts stored in isolated collection (NOT under /families)
 * - Uses device-derived encryption key, NOT family key
 * - No Firestore Security Rule allows family member read access
 * - Notification message contains NO app-identifying information
 */

import { z } from 'zod'

// ============================================================================
// Constants
// ============================================================================

/**
 * Safe adult system constants
 */
export const SAFE_ADULT_CONSTANTS = {
  /** Collection name for safe adult designations (isolated from family data) */
  COLLECTION: 'safe-adult-designations',

  /** Minimum phone number length (digits only) */
  MIN_PHONE_DIGITS: 10,
  /** Maximum phone number length (digits only) */
  MAX_PHONE_DIGITS: 15,

  /** Maximum safe adult notifications per signal */
  MAX_NOTIFICATIONS_PER_SIGNAL: 3,

  /** Contact masking settings */
  MASK_CHARACTER: '*',
  VISIBLE_DIGITS: 4,

  /** SMS message template (generic, no app mention) */
  SMS_TEMPLATE: '{firstName} needs help. Please reach out.',
  /** Email subject (generic, no app mention) */
  EMAIL_SUBJECT: 'Someone needs your help',
  /** Email body template (generic, no app mention) */
  EMAIL_TEMPLATE:
    '{firstName} reached out because they need help. Please check in with them when you can.',
} as const

/**
 * Contact type labels
 */
export const CONTACT_TYPE_LABELS = {
  phone: 'Phone Number',
  email: 'Email Address',
} as const

/**
 * Child-friendly validation error messages (6th-grade reading level)
 */
export const VALIDATION_ERROR_MESSAGES = {
  phone: {
    empty: 'Please enter a phone number.',
    tooShort: "That phone number is too short. Try adding the area code.",
    tooLong: "That phone number is too long. Check if there's an extra digit.",
    invalidFormat: "That doesn't look like a phone number. Try again?",
  },
  email: {
    empty: 'Please enter an email address.',
    invalidFormat: "That doesn't look like an email address. Try again?",
    missingAt: 'Email addresses need an @ symbol.',
    missingDomain: 'Email addresses need a domain like gmail.com.',
  },
} as const

// ============================================================================
// Contact Type Schema
// ============================================================================

/**
 * Contact type - phone or email
 */
export const contactTypeSchema = z.enum(['phone', 'email'])

export type ContactType = z.infer<typeof contactTypeSchema>

// ============================================================================
// Phone Validation
// ============================================================================

/**
 * Extract digits from a phone number string
 */
export function extractPhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '')
}

/**
 * Validate phone number format
 * Returns null if valid, error message if invalid
 */
export function validatePhoneNumber(phone: string): string | null {
  if (!phone || phone.trim().length === 0) {
    return VALIDATION_ERROR_MESSAGES.phone.empty
  }

  const digits = extractPhoneDigits(phone)

  if (digits.length < SAFE_ADULT_CONSTANTS.MIN_PHONE_DIGITS) {
    return VALIDATION_ERROR_MESSAGES.phone.tooShort
  }

  if (digits.length > SAFE_ADULT_CONSTANTS.MAX_PHONE_DIGITS) {
    return VALIDATION_ERROR_MESSAGES.phone.tooLong
  }

  // Basic format check - should have at least 10 digits
  if (!/^\d{10,15}$/.test(digits)) {
    return VALIDATION_ERROR_MESSAGES.phone.invalidFormat
  }

  return null // Valid
}

/**
 * Check if phone number is valid
 */
export function isValidPhoneNumber(phone: string): boolean {
  return validatePhoneNumber(phone) === null
}

/**
 * Zod schema for phone number with validation
 */
export const phoneNumberSchema = z.string().refine(isValidPhoneNumber, {
  message: VALIDATION_ERROR_MESSAGES.phone.invalidFormat,
})

// ============================================================================
// Email Validation
// ============================================================================

/**
 * Basic email regex pattern
 * Intentionally permissive to avoid false negatives for valid emails
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Validate email format
 * Returns null if valid, error message if invalid
 */
export function validateEmailAddress(email: string): string | null {
  if (!email || email.trim().length === 0) {
    return VALIDATION_ERROR_MESSAGES.email.empty
  }

  const trimmed = email.trim()

  if (!trimmed.includes('@')) {
    return VALIDATION_ERROR_MESSAGES.email.missingAt
  }

  const atIndex = trimmed.indexOf('@')
  const domain = trimmed.substring(atIndex + 1)

  if (!domain || !domain.includes('.')) {
    return VALIDATION_ERROR_MESSAGES.email.missingDomain
  }

  if (!EMAIL_PATTERN.test(trimmed)) {
    return VALIDATION_ERROR_MESSAGES.email.invalidFormat
  }

  return null // Valid
}

/**
 * Check if email is valid
 */
export function isValidEmailAddress(email: string): boolean {
  return validateEmailAddress(email) === null
}

/**
 * Zod schema for email with validation
 */
export const emailAddressSchema = z.string().refine(isValidEmailAddress, {
  message: VALIDATION_ERROR_MESSAGES.email.invalidFormat,
})

// ============================================================================
// Contact Validation (Phone or Email)
// ============================================================================

/**
 * Validate a contact (phone or email)
 * Returns null if valid, error message if invalid
 */
export function validateContact(type: ContactType, value: string): string | null {
  if (type === 'phone') {
    return validatePhoneNumber(value)
  } else {
    return validateEmailAddress(value)
  }
}

/**
 * Check if a contact is valid
 */
export function isValidContact(type: ContactType, value: string): boolean {
  return validateContact(type, value) === null
}

// ============================================================================
// Contact Masking (for privacy display)
// ============================================================================

/**
 * Mask a phone number for display (e.g., "***-***-1234")
 */
export function maskPhoneNumber(phone: string): string {
  const digits = extractPhoneDigits(phone)
  if (digits.length === 0) return ''

  const visible = digits.slice(-SAFE_ADULT_CONSTANTS.VISIBLE_DIGITS)
  const masked = SAFE_ADULT_CONSTANTS.MASK_CHARACTER.repeat(3)

  return `${masked}-${masked}-${visible}`
}

/**
 * Mask an email address for display (e.g., "j***@gmail.com")
 */
export function maskEmailAddress(email: string): string {
  if (!email || !email.includes('@')) return ''

  const [localPart, domain] = email.split('@')
  if (!localPart || !domain) return ''

  const firstChar = localPart[0] || ''
  const maskedLocal = firstChar + SAFE_ADULT_CONSTANTS.MASK_CHARACTER.repeat(3)

  return `${maskedLocal}@${domain}`
}

/**
 * Mask a contact for display
 */
export function maskContact(type: ContactType, value: string): string {
  if (type === 'phone') {
    return maskPhoneNumber(value)
  } else {
    return maskEmailAddress(value)
  }
}

// ============================================================================
// Safe Adult Contact Schema
// ============================================================================

/**
 * Safe adult contact - the contact information for notification
 *
 * CRITICAL: The 'value' field should be encrypted before storage
 */
export const safeAdultContactSchema = z.object({
  /** Contact type (phone or email) */
  type: contactTypeSchema,
  /** Contact value (phone number or email address) - may be encrypted */
  value: z.string().min(1),
  /** When the contact was validated (ISO timestamp) */
  validatedAt: z.string(),
})

export type SafeAdultContact = z.infer<typeof safeAdultContactSchema>

/**
 * Safe adult contact input - for creating/updating a contact
 */
export const safeAdultContactInputSchema = z.object({
  /** Contact type (phone or email) */
  type: contactTypeSchema,
  /** Contact value (phone number or email address) - plaintext for validation */
  value: z.string().min(1),
})

export type SafeAdultContactInput = z.infer<typeof safeAdultContactInputSchema>

// ============================================================================
// Safe Adult Designation Schema
// ============================================================================

/**
 * Safe adult designation - stored encrypted in isolated collection
 *
 * CRITICAL: This document is stored in /safe-adult-designations/{childId}
 * NOT under /families or any family-accessible path.
 */
export const safeAdultDesignationSchema = z.object({
  /** Child ID (the designator) */
  childId: z.string().min(1),
  /** Child's first name (for notification message only) */
  childFirstName: z.string().min(1),
  /** The safe adult contact (encrypted) */
  contact: safeAdultContactSchema,
  /** When the designation was encrypted (ISO timestamp) */
  encryptedAt: z.string(),
  /** Device key identifier used for encryption */
  encryptionKeyId: z.string().min(1),
  /** When the designation was created (ISO timestamp) */
  createdAt: z.string(),
  /** When the designation was last updated (ISO timestamp) */
  updatedAt: z.string(),
})

export type SafeAdultDesignation = z.infer<typeof safeAdultDesignationSchema>

/**
 * Safe adult designation input - for creating a new designation
 */
export const safeAdultDesignationInputSchema = z.object({
  /** Child ID (the designator) */
  childId: z.string().min(1),
  /** Child's first name (for notification message only) */
  childFirstName: z.string().min(1),
  /** The safe adult contact (plaintext for encryption) */
  contact: safeAdultContactInputSchema,
})

export type SafeAdultDesignationInput = z.infer<typeof safeAdultDesignationInputSchema>

// ============================================================================
// Notification Schemas
// ============================================================================

/**
 * Safe adult notification request - sent to Cloud Function
 *
 * CRITICAL: Contains only minimal information needed for notification
 * - Child first name (for message personalization)
 * - Encrypted contact (decrypted server-side)
 * - NO: family ID, last name, device info, location, app name
 */
export const safeAdultNotificationRequestSchema = z.object({
  /** Child's first name (for notification message) */
  childFirstName: z.string().min(1),
  /** Encrypted contact data (base64 encoded) */
  encryptedContact: z.string().min(1),
  /** Contact type (phone or email) - needed for routing */
  contactType: contactTypeSchema,
  /** Encryption key ID (for decryption) */
  encryptionKeyId: z.string().min(1),
  /** Signal ID (for deduplication and rate limiting) */
  signalId: z.string().min(1),
})

export type SafeAdultNotificationRequest = z.infer<typeof safeAdultNotificationRequestSchema>

/**
 * Safe adult notification response - from Cloud Function
 */
export const safeAdultNotificationResponseSchema = z.object({
  /** Whether the notification was sent successfully */
  success: z.boolean(),
  /** Error message if failed (generic, no leak) */
  error: z.string().nullable(),
  /** Timestamp when notification was sent (ISO) */
  sentAt: z.string().nullable(),
})

export type SafeAdultNotificationResponse = z.infer<typeof safeAdultNotificationResponseSchema>

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get contact type label
 */
export function getContactTypeLabel(type: ContactType): string {
  return CONTACT_TYPE_LABELS[type]
}

/**
 * Format notification message
 */
export function formatNotificationMessage(
  template: string,
  firstName: string
): string {
  return template.replace('{firstName}', firstName)
}

/**
 * Get SMS notification message
 */
export function getSmsNotificationMessage(firstName: string): string {
  return formatNotificationMessage(SAFE_ADULT_CONSTANTS.SMS_TEMPLATE, firstName)
}

/**
 * Get email notification subject
 */
export function getEmailNotificationSubject(): string {
  return SAFE_ADULT_CONSTANTS.EMAIL_SUBJECT
}

/**
 * Get email notification body
 */
export function getEmailNotificationBody(firstName: string): string {
  return formatNotificationMessage(SAFE_ADULT_CONSTANTS.EMAIL_TEMPLATE, firstName)
}

/**
 * Safely parse safe adult contact
 */
export function safeParseSafeAdultContact(input: unknown): SafeAdultContact | null {
  const result = safeAdultContactSchema.safeParse(input)
  return result.success ? result.data : null
}

/**
 * Safely parse safe adult designation
 */
export function safeParseSafeAdultDesignation(input: unknown): SafeAdultDesignation | null {
  const result = safeAdultDesignationSchema.safeParse(input)
  return result.success ? result.data : null
}

/**
 * Safely parse safe adult notification request
 */
export function safeParseSafeAdultNotificationRequest(
  input: unknown
): SafeAdultNotificationRequest | null {
  const result = safeAdultNotificationRequestSchema.safeParse(input)
  return result.success ? result.data : null
}

/**
 * Create a safe adult contact input
 */
export function createSafeAdultContactInput(
  type: ContactType,
  value: string
): SafeAdultContactInput | null {
  const error = validateContact(type, value)
  if (error) {
    return null
  }
  return { type, value }
}

/**
 * Normalize phone number (extract digits only)
 */
export function normalizePhoneNumber(phone: string): string {
  return extractPhoneDigits(phone)
}

/**
 * Normalize email (lowercase, trim)
 */
export function normalizeEmailAddress(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Normalize contact value
 */
export function normalizeContact(type: ContactType, value: string): string {
  if (type === 'phone') {
    return normalizePhoneNumber(value)
  } else {
    return normalizeEmailAddress(value)
  }
}
