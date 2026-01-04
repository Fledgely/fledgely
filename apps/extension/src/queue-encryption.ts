/**
 * Queue Encryption Service - Story 46.1
 *
 * AES-256-GCM encryption for offline queue data.
 * Uses Web Crypto API with key derived from deviceId.
 *
 * AC4: Encryption at Rest
 * - Queue encrypted using Web Crypto API
 * - Encryption key derived from device credentials
 */

// Encryption constants
const SALT = 'fledgely-queue-salt-v1'
const ITERATIONS = 100000
const KEY_LENGTH = 256
const ALGORITHM = 'AES-GCM'
const IV_LENGTH = 12 // 96 bits for GCM

// Cached encryption key (memory only, not persisted)
let cachedKey: CryptoKey | null = null
let cachedDeviceId: string | null = null

/**
 * Derive an AES-GCM encryption key from deviceId using PBKDF2.
 * The key is cached in memory for performance.
 *
 * @param deviceId The device identifier used as key material
 * @returns CryptoKey for AES-GCM encryption/decryption
 */
export async function deriveKey(deviceId: string): Promise<CryptoKey> {
  // Return cached key if deviceId matches
  if (cachedKey && cachedDeviceId === deviceId) {
    return cachedKey
  }

  const encoder = new TextEncoder()

  // Import deviceId as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(deviceId),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  // Derive AES-GCM key using PBKDF2
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(SALT),
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false, // Not extractable
    ['encrypt', 'decrypt']
  )

  // Cache the key
  cachedKey = derivedKey
  cachedDeviceId = deviceId

  return derivedKey
}

/**
 * Generate a random initialization vector (IV) for AES-GCM.
 * Each encryption must use a unique IV.
 *
 * @returns 12-byte Uint8Array IV
 */
export function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH))
}

/**
 * Encrypt data using AES-256-GCM.
 *
 * @param data The string data to encrypt (e.g., base64 screenshot)
 * @param deviceId Device ID for key derivation
 * @returns Object containing encrypted data and IV
 */
export async function encryptData(
  data: string,
  deviceId: string
): Promise<{ encryptedData: ArrayBuffer; iv: Uint8Array }> {
  const key = await deriveKey(deviceId)
  const iv = generateIV()
  const encoder = new TextEncoder()

  const encryptedData = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv,
    },
    key,
    encoder.encode(data)
  )

  return { encryptedData, iv }
}

/**
 * Decrypt data using AES-256-GCM.
 *
 * @param encryptedData The encrypted ArrayBuffer
 * @param iv The initialization vector used during encryption
 * @param deviceId Device ID for key derivation
 * @returns Decrypted string
 */
export async function decryptData(
  encryptedData: ArrayBuffer,
  iv: Uint8Array,
  deviceId: string
): Promise<string> {
  const key = await deriveKey(deviceId)
  const decoder = new TextDecoder()

  const decryptedData = await crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv,
    },
    key,
    encryptedData
  )

  return decoder.decode(decryptedData)
}

/**
 * Encrypt a screenshot capture object for queue storage.
 *
 * @param capture The capture object to encrypt
 * @param deviceId Device ID for key derivation
 * @returns Encrypted data and IV for storage
 */
export async function encryptScreenshotCapture(
  capture: {
    dataUrl: string
    timestamp: number
    url: string
    title: string
    captureTimeMs: number
  },
  deviceId: string
): Promise<{ encryptedData: ArrayBuffer; iv: Uint8Array }> {
  const serialized = JSON.stringify(capture)
  return encryptData(serialized, deviceId)
}

/**
 * Decrypt a screenshot capture object from queue storage.
 *
 * @param encryptedData The encrypted ArrayBuffer
 * @param iv The initialization vector
 * @param deviceId Device ID for key derivation
 * @returns Decrypted capture object
 */
export async function decryptScreenshotCapture(
  encryptedData: ArrayBuffer,
  iv: Uint8Array,
  deviceId: string
): Promise<{
  dataUrl: string
  timestamp: number
  url: string
  title: string
  captureTimeMs: number
}> {
  const serialized = await decryptData(encryptedData, iv, deviceId)
  return JSON.parse(serialized)
}

/**
 * Clear the cached encryption key.
 * Called on extension restart or device ID change.
 */
export function clearKeyCache(): void {
  cachedKey = null
  cachedDeviceId = null
}

/**
 * Check if encryption key is cached for a device.
 *
 * @param deviceId Device ID to check
 * @returns True if key is cached for this device
 */
export function isKeyCached(deviceId: string): boolean {
  return cachedKey !== null && cachedDeviceId === deviceId
}
