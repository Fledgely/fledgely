/**
 * TOTP Utilities for Offline Emergency Unlock
 * Story 13.1: TOTP Secret Generation at Enrollment
 *
 * Implements RFC 6238 TOTP algorithm using native Web Crypto API.
 * No external libraries to keep extension bundle size small.
 *
 * Requirements:
 * - AC4: RFC 6238 compliant TOTP generation
 * - AC4: Compatible with authenticator apps (6-digit, 30-second, SHA-1)
 * - Task 4.1: Create totp-utils.ts module
 * - Task 4.2: Implement generateTotpCode()
 * - Task 4.3: Implement verifyTotpCode()
 * - Task 4.4: Support time drift tolerance (1 period before/after)
 * - Task 4.5: Use native Web Crypto API
 */

/**
 * TOTP configuration constants
 * These match RFC 6238 defaults and are compatible with authenticator apps
 */
const TOTP_DIGITS = 6
const TOTP_PERIOD_SECONDS = 30
const TOTP_ALGORITHM = 'SHA-1'

/**
 * Base32 character set per RFC 4648
 */
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/**
 * Decode a Base32 string to Uint8Array
 * RFC 4648 Base32 decoding
 *
 * @param encoded - Base32 encoded string
 * @returns Decoded bytes as Uint8Array
 */
export function base32Decode(encoded: string): Uint8Array {
  // Remove any padding and convert to uppercase
  const input = encoded.replace(/=+$/, '').toUpperCase()

  // Calculate output length
  const outputLength = Math.floor((input.length * 5) / 8)
  const output = new Uint8Array(outputLength)

  let bits = 0
  let value = 0
  let outputIndex = 0

  for (let i = 0; i < input.length; i++) {
    const charIndex = BASE32_ALPHABET.indexOf(input[i])
    if (charIndex === -1) {
      throw new Error(`Invalid Base32 character: ${input[i]}`)
    }

    value = (value << 5) | charIndex
    bits += 5

    if (bits >= 8) {
      bits -= 8
      output[outputIndex++] = (value >>> bits) & 0xff
    }
  }

  return output
}

/**
 * Get the current TOTP time counter
 * Counter = floor(Unix timestamp / period)
 *
 * @param timestamp - Unix timestamp in milliseconds (defaults to now)
 * @returns Time counter value
 */
export function getTotpCounter(timestamp: number = Date.now()): number {
  return Math.floor(timestamp / 1000 / TOTP_PERIOD_SECONDS)
}

/**
 * Convert counter to 8-byte big-endian buffer
 *
 * @param counter - Time counter value
 * @returns 8-byte Uint8Array in big-endian format
 */
function counterToBytes(counter: number): Uint8Array {
  const buffer = new Uint8Array(8)
  // JavaScript numbers can safely represent integers up to 2^53-1
  // We need to handle this as two 32-bit values for big-endian representation
  let remaining = counter
  for (let i = 7; i >= 0; i--) {
    buffer[i] = remaining & 0xff
    remaining = Math.floor(remaining / 256)
  }
  return buffer
}

/**
 * Compute HMAC-SHA1 using Web Crypto API
 *
 * @param key - Secret key as Uint8Array
 * @param message - Message to sign as Uint8Array
 * @returns HMAC signature as Uint8Array
 */
async function hmacSha1(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: TOTP_ALGORITHM },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, message)
  return new Uint8Array(signature)
}

/**
 * Dynamic truncation per RFC 4226 Section 5.4
 * Extracts a 31-bit value from HMAC output
 *
 * @param hmac - HMAC output (20 bytes for SHA-1)
 * @returns Truncated value
 */
function dynamicTruncate(hmac: Uint8Array): number {
  // Get offset from last nibble
  const offset = hmac[hmac.length - 1] & 0x0f

  // Extract 4 bytes starting at offset and mask to 31 bits
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)

  return binary
}

/**
 * Generate a TOTP code from a secret
 * Story 13.1 Task 4.2: Implements RFC 6238 TOTP algorithm
 *
 * @param secret - Base32 encoded TOTP secret
 * @param timestamp - Unix timestamp in milliseconds (defaults to now)
 * @returns 6-digit TOTP code as string
 * @throws Error if secret is invalid or crypto operation fails
 */
export async function generateTotpCode(
  secret: string,
  timestamp: number = Date.now()
): Promise<string> {
  // Decode Base32 secret to bytes
  const key = base32Decode(secret)

  // Get time counter
  const counter = getTotpCounter(timestamp)

  // Convert counter to 8-byte buffer (big-endian)
  const counterBytes = counterToBytes(counter)

  // Compute HMAC-SHA1
  const hmac = await hmacSha1(key, counterBytes)

  // Dynamic truncation
  const truncated = dynamicTruncate(hmac)

  // Generate 6-digit code
  const code = truncated % Math.pow(10, TOTP_DIGITS)

  // Pad with leading zeros if necessary
  return code.toString().padStart(TOTP_DIGITS, '0')
}

/**
 * Verify a TOTP code against a secret
 * Story 13.1 Task 4.3: Implements verification with time drift tolerance
 *
 * @param secret - Base32 encoded TOTP secret
 * @param code - 6-digit code to verify
 * @param windowSize - Number of periods to check before/after (default: 1)
 * @param timestamp - Unix timestamp in milliseconds (defaults to now)
 * @returns true if code is valid within the time window
 */
export async function verifyTotpCode(
  secret: string,
  code: string,
  windowSize: number = 1,
  timestamp: number = Date.now()
): Promise<boolean> {
  // Normalize code (remove spaces, ensure 6 digits)
  const normalizedCode = code.replace(/\s/g, '').padStart(TOTP_DIGITS, '0')

  // Validate code format
  if (!/^\d{6}$/.test(normalizedCode)) {
    return false
  }

  // Story 13.1 Task 4.4: Check current and adjacent time windows
  // This handles clock drift between devices (up to +/- windowSize * 30 seconds)
  for (let offset = -windowSize; offset <= windowSize; offset++) {
    const windowTimestamp = timestamp + offset * TOTP_PERIOD_SECONDS * 1000
    const expectedCode = await generateTotpCode(secret, windowTimestamp)

    if (expectedCode === normalizedCode) {
      return true
    }
  }

  return false
}

/**
 * Get remaining seconds until current TOTP code expires
 *
 * @param timestamp - Unix timestamp in milliseconds (defaults to now)
 * @returns Seconds remaining (0-29)
 */
export function getTotpRemainingSeconds(timestamp: number = Date.now()): number {
  const seconds = Math.floor(timestamp / 1000)
  return TOTP_PERIOD_SECONDS - (seconds % TOTP_PERIOD_SECONDS)
}

/**
 * Generate a TOTP URI for QR code generation
 * Format: otpauth://totp/LABEL?secret=SECRET&issuer=ISSUER&algorithm=SHA1&digits=6&period=30
 *
 * This is useful for allowing parents to add the secret to an authenticator app
 * as a backup method for code generation.
 *
 * @param secret - Base32 encoded TOTP secret
 * @param deviceName - Name of the device (used as label)
 * @param issuer - Issuer name (default: "Fledgely")
 * @returns otpauth:// URI string
 */
export function generateTotpUri(
  secret: string,
  deviceName: string,
  issuer: string = 'Fledgely'
): string {
  const label = encodeURIComponent(`${issuer}:${deviceName}`)
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: TOTP_DIGITS.toString(),
    period: TOTP_PERIOD_SECONDS.toString(),
  })

  return `otpauth://totp/${label}?${params.toString()}`
}

// Export constants for testing
export { TOTP_DIGITS, TOTP_PERIOD_SECONDS, TOTP_ALGORITHM }
