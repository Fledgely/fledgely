/**
 * ContactValidationService - Story 7.5.4 Task 8
 *
 * Service for validating safe adult contact information.
 * AC6: Phone and email support
 *
 * Validates and normalizes phone numbers and email addresses.
 */

// ============================================
// Types
// ============================================

export interface PhoneValidationResult {
  isValid: boolean
  normalized?: string
  countryCode?: string
  areaCode?: string
  error?: string
}

export interface EmailValidationResult {
  isValid: boolean
  normalized?: string
  error?: string
}

export interface ContactValidationResult {
  isValid: boolean
  normalized?: string
  error?: string
}

export interface SafeAdultContactInput {
  phone?: string
  email?: string
}

export interface SafeAdultContactValidationResult {
  isValid: boolean
  normalizedPhone?: string
  normalizedEmail?: string
  preferredMethod?: 'sms' | 'email'
  error?: string
  phoneError?: string
  emailError?: string
}

// ============================================
// Phone Validation Functions
// ============================================

/**
 * Check if a phone number is valid.
 *
 * Accepts various formats:
 * - 5551234567
 * - 555-123-4567
 * - (555) 123-4567
 * - +1 555 123 4567
 * - International formats
 *
 * @param phone - Phone number to validate
 * @returns True if valid
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone || phone.trim().length === 0) {
    return false
  }

  // Strip all formatting characters
  const digits = phone.replace(/[\s\-()+ .]/g, '')

  // Check for letters
  if (!/^\d+$/.test(digits)) {
    return false
  }

  // Must have at least 10 digits (US) or more for international
  if (digits.length < 10) {
    return false
  }

  return true
}

/**
 * Normalize phone number to E.164 format.
 *
 * E.164 format: +[country code][number]
 * Example: +15551234567
 *
 * @param phone - Phone number to normalize
 * @returns Normalized phone or null if invalid
 */
export function normalizePhoneNumber(phone: string): string | null {
  if (!isValidPhoneNumber(phone)) {
    return null
  }

  // Strip all formatting characters
  const digits = phone.replace(/[\s\-()+ .]/g, '')

  // US number (10 digits) - add +1
  if (digits.length === 10) {
    return `+1${digits}`
  }

  // US number with leading 1 (11 digits)
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`
  }

  // International number - just add +
  return `+${digits}`
}

/**
 * Get phone number type (mobile, landline, unknown).
 *
 * Note: This is a simplified implementation.
 * Production would use a library like libphonenumber.
 *
 * @param phone - Phone number to check
 * @returns Phone type
 */
export function getPhoneNumberType(phone: string): 'mobile' | 'landline' | 'unknown' {
  if (!isValidPhoneNumber(phone)) {
    return 'unknown'
  }

  // Simplified: assume all US numbers are mobile
  // In production, use libphonenumber or similar
  return 'mobile'
}

/**
 * Parse a phone number into components.
 *
 * @param phone - Phone number to parse
 * @returns Parsed phone result
 */
export function parsePhoneNumber(phone: string): PhoneValidationResult {
  if (!isValidPhoneNumber(phone)) {
    return {
      isValid: false,
      error: 'Invalid phone number',
    }
  }

  const normalized = normalizePhoneNumber(phone)
  if (!normalized) {
    return {
      isValid: false,
      error: 'Could not normalize phone number',
    }
  }

  // Extract components
  const digits = phone.replace(/[\s\-()+ .]/g, '')
  let countryCode = '1' // Default US
  let areaCode = ''

  if (digits.length === 10) {
    areaCode = digits.substring(0, 3)
  } else if (digits.length === 11 && digits.startsWith('1')) {
    areaCode = digits.substring(1, 4)
  } else if (digits.length > 10) {
    // International - country code varies
    countryCode = digits.substring(0, digits.length - 10)
    areaCode = digits.substring(digits.length - 10, digits.length - 7)
  }

  return {
    isValid: true,
    normalized,
    countryCode,
    areaCode,
  }
}

/**
 * Format a phone number for display.
 *
 * @param phone - Phone number (ideally E.164)
 * @param format - Format type ('national' or 'international')
 * @returns Formatted phone
 */
export function formatPhoneNumber(
  phone: string,
  format: 'national' | 'international' = 'national'
): string {
  if (!isValidPhoneNumber(phone)) {
    return phone // Return original if invalid
  }

  const normalized = normalizePhoneNumber(phone)
  if (!normalized) {
    return phone
  }

  // Extract digits (skip +)
  const digits = normalized.substring(1)

  // US format (11 digits starting with 1)
  if (digits.length === 11 && digits.startsWith('1')) {
    const areaCode = digits.substring(1, 4)
    const exchange = digits.substring(4, 7)
    const subscriber = digits.substring(7)

    if (format === 'international') {
      return `+1 (${areaCode}) ${exchange}-${subscriber}`
    }
    return `(${areaCode}) ${exchange}-${subscriber}`
  }

  // International format - simple formatting
  if (format === 'international') {
    return normalized
  }

  // Default fallback
  return phone
}

// ============================================
// Email Validation Functions
// ============================================

/**
 * Check if an email address is valid.
 *
 * @param email - Email to validate
 * @returns True if valid
 */
export function isValidEmail(email: string): boolean {
  if (!email || email.trim().length === 0) {
    return false
  }

  // Basic email regex
  // - Must have characters before @
  // - Must have characters after @
  // - Must have a dot in the domain
  // - No spaces allowed
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  return emailRegex.test(email.trim())
}

/**
 * Normalize email address.
 *
 * - Lowercase
 * - Trim whitespace
 *
 * @param email - Email to normalize
 * @returns Normalized email or null if invalid
 */
export function normalizeEmail(email: string): string | null {
  if (!isValidEmail(email)) {
    return null
  }

  return email.trim().toLowerCase()
}

// ============================================
// Combined Validation Functions
// ============================================

/**
 * Validate contact input (phone or email).
 *
 * @param value - Contact value
 * @param type - Contact type ('phone' or 'email')
 * @returns Validation result
 */
export function validateContactInput(
  value: string,
  type: 'phone' | 'email'
): ContactValidationResult {
  if (type === 'phone') {
    if (!isValidPhoneNumber(value)) {
      return {
        isValid: false,
        error: 'Please enter a valid phone number',
      }
    }

    return {
      isValid: true,
      normalized: normalizePhoneNumber(value) || undefined,
    }
  }

  // Email
  if (!isValidEmail(value)) {
    return {
      isValid: false,
      error: 'Please enter a valid email address',
    }
  }

  return {
    isValid: true,
    normalized: normalizeEmail(value) || undefined,
  }
}

/**
 * Validate safe adult contact information.
 *
 * AC6: Supports both phone and email.
 * Requires at least one valid contact method.
 *
 * @param input - Contact input
 * @returns Validation result
 */
export function validateSafeAdultContact(
  input: SafeAdultContactInput
): SafeAdultContactValidationResult {
  const { phone, email } = input
  const hasPhone = phone && phone.trim().length > 0
  const hasEmail = email && email.trim().length > 0

  // Require at least one contact method
  if (!hasPhone && !hasEmail) {
    return {
      isValid: false,
      error: 'Please provide at least one contact method (phone or email)',
    }
  }

  const result: SafeAdultContactValidationResult = {
    isValid: true,
  }

  // Validate phone if provided
  if (hasPhone) {
    if (!isValidPhoneNumber(phone!)) {
      result.isValid = false
      result.phoneError = 'Please enter a valid phone number'
    } else {
      result.normalizedPhone = normalizePhoneNumber(phone!) || undefined
    }
  }

  // Validate email if provided
  if (hasEmail) {
    if (!isValidEmail(email!)) {
      result.isValid = false
      result.emailError = 'Please enter a valid email address'
    } else {
      result.normalizedEmail = normalizeEmail(email!) || undefined
    }
  }

  // Determine preferred method
  if (result.isValid) {
    result.preferredMethod = result.normalizedPhone ? 'sms' : 'email'
  }

  return result
}
