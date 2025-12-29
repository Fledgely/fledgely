/**
 * TOTP Utilities for Parent Dashboard
 * Story 13.2: Parent Emergency Code Display
 *
 * Implements RFC 6238 TOTP algorithm using native Web Crypto API.
 * Ported from extension's totp-utils.ts for web dashboard use.
 *
 * Requirements:
 * - AC2: TOTP code generation from stored secret
 * - AC3: Countdown timer calculation
 * - AC4: Auto-refresh support
 */

/**
 * TOTP configuration constants
 * These match RFC 6238 defaults and are compatible with authenticator apps
 */
export const TOTP_DIGITS = 6
export const TOTP_PERIOD_SECONDS = 30
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
  // Create a copy of the key and message to ensure we have a proper ArrayBuffer
  const keyBuffer = new Uint8Array(key).buffer
  const messageBuffer = new Uint8Array(message).buffer

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: TOTP_ALGORITHM },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageBuffer)
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
 * Story 13.2 Task 1.2: Implements RFC 6238 TOTP algorithm
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
 * Get remaining seconds until current TOTP code expires
 * Story 13.2 Task 1.3: Countdown timer support
 *
 * @param timestamp - Unix timestamp in milliseconds (defaults to now)
 * @returns Seconds remaining (1-30)
 */
export function getTotpRemainingSeconds(timestamp: number = Date.now()): number {
  const seconds = Math.floor(timestamp / 1000)
  const remaining = TOTP_PERIOD_SECONDS - (seconds % TOTP_PERIOD_SECONDS)
  return remaining
}
