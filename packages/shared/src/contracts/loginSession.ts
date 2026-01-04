/**
 * Login Session and Device Fingerprint schemas.
 *
 * Story 41.5: New Login Notifications - AC1, AC2, AC6
 *
 * Privacy-preserving device fingerprinting for login tracking:
 * - No exact IP storage (only hashed for change detection)
 * - City-level location only (no exact addresses)
 * - Consistent fingerprint IDs for device recognition
 */

import { z } from 'zod'
import { createHash } from 'crypto'

// ============================================
// Device Types
// ============================================

/** Recognized device types for login sessions */
export const deviceTypeSchema = z.enum(['desktop', 'mobile', 'tablet', 'unknown'])
export type DeviceType = z.infer<typeof deviceTypeSchema>

// ============================================
// Device Fingerprint Schema (AC6)
// ============================================

/**
 * Device fingerprint for login tracking.
 * Privacy-preserving: no exact IP, city-level location only.
 *
 * Stored at: users/{userId}/deviceFingerprints/{fingerprintId}
 */
export const deviceFingerprintSchema = z.object({
  /** Unique fingerprint ID (hash of fingerprint data) */
  id: z.string().min(1),
  /** User agent string from browser */
  userAgent: z.string(),
  /** Parsed device type */
  deviceType: deviceTypeSchema,
  /** Parsed browser name (e.g., "Chrome", "Safari", "Firefox") */
  browser: z.string(),
  /** Parsed OS name (e.g., "Windows", "macOS", "Android", "iOS") */
  os: z.string(),
  /** Approximate location - city/region only, null if unavailable or fleeing mode */
  approximateLocation: z.string().nullable(),
  /** When fingerprint was first seen */
  createdAt: z.number(),
})
export type DeviceFingerprint = z.infer<typeof deviceFingerprintSchema>

// ============================================
// Login Session Schema (AC1)
// ============================================

/**
 * Login session record.
 *
 * Stored at: users/{userId}/sessions/{sessionId}
 */
export const loginSessionSchema = z.object({
  /** Session ID */
  id: z.string().min(1),
  /** User ID who logged in */
  userId: z.string().min(1),
  /** Family ID (for notification routing) */
  familyId: z.string().min(1),
  /** Reference to device fingerprint */
  fingerprintId: z.string().min(1),
  /** Whether this was a new device (triggers notification) */
  isNewDevice: z.boolean(),
  /** Whether device is trusted (no notification) */
  isTrusted: z.boolean(),
  /** Hashed IP for change detection - NOT the actual IP */
  ipHash: z.string(),
  /** When session was created */
  createdAt: z.number(),
  /** Last activity time */
  lastSeenAt: z.number(),
})
export type LoginSession = z.infer<typeof loginSessionSchema>

// ============================================
// Trusted Device Schema (AC2)
// ============================================

/**
 * Trusted device record.
 * Trusted devices do not trigger new login notifications.
 *
 * Stored at: users/{userId}/trustedDevices/{fingerprintId}
 */
export const trustedDeviceSchema = z.object({
  /** Same as fingerprint ID */
  id: z.string().min(1),
  /** User ID */
  userId: z.string().min(1),
  /** Reference to fingerprint */
  fingerprintId: z.string().min(1),
  /** User-customizable device name */
  deviceName: z.string(),
  /** When device was marked as trusted */
  createdAt: z.number(),
})
export type TrustedDevice = z.infer<typeof trustedDeviceSchema>

// ============================================
// Helper Functions
// ============================================

/** Common browser patterns for user agent parsing */
const BROWSER_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /Edg\//, name: 'Edge' },
  { pattern: /OPR\/|Opera\//, name: 'Opera' },
  { pattern: /Chrome\//, name: 'Chrome' },
  { pattern: /Firefox\//, name: 'Firefox' },
  { pattern: /Safari\//, name: 'Safari' },
  { pattern: /MSIE|Trident\//, name: 'Internet Explorer' },
]

/** Common OS patterns for user agent parsing */
const OS_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /Windows NT 10/, name: 'Windows 10' },
  { pattern: /Windows NT 6\.3/, name: 'Windows 8.1' },
  { pattern: /Windows NT 6\.2/, name: 'Windows 8' },
  { pattern: /Windows NT 6\.1/, name: 'Windows 7' },
  { pattern: /Windows/, name: 'Windows' },
  { pattern: /iPhone|iPad|iPod/, name: 'iOS' }, // Must be before macOS
  { pattern: /Mac OS X/, name: 'macOS' },
  { pattern: /CrOS/, name: 'Chrome OS' },
  { pattern: /Android/, name: 'Android' },
  { pattern: /Linux/, name: 'Linux' },
]

/** Device type patterns for user agent parsing */
const DEVICE_TYPE_PATTERNS: Array<{ pattern: RegExp; type: DeviceType }> = [
  { pattern: /iPad/, type: 'tablet' },
  { pattern: /Android.*Mobile/, type: 'mobile' },
  { pattern: /Android/, type: 'tablet' },
  { pattern: /iPhone|iPod/, type: 'mobile' },
  { pattern: /Mobile/, type: 'mobile' },
]

/**
 * Parse user agent string to extract device information.
 */
export function parseUserAgent(userAgent: string): {
  deviceType: DeviceType
  browser: string
  os: string
} {
  // Parse browser
  let browser = 'Unknown'
  for (const { pattern, name } of BROWSER_PATTERNS) {
    if (pattern.test(userAgent)) {
      browser = name
      break
    }
  }

  // Parse OS
  let os = 'Unknown'
  for (const { pattern, name } of OS_PATTERNS) {
    if (pattern.test(userAgent)) {
      os = name
      break
    }
  }

  // Parse device type
  let deviceType: DeviceType = 'desktop'
  for (const { pattern, type } of DEVICE_TYPE_PATTERNS) {
    if (pattern.test(userAgent)) {
      deviceType = type
      break
    }
  }

  return { deviceType, browser, os }
}

/**
 * Generate a consistent fingerprint ID from device characteristics.
 * Privacy-preserving: uses hashing, no raw IP storage.
 */
export function generateFingerprintId(params: { userAgent: string; ipHash: string }): string {
  const { userAgent, ipHash } = params

  // Extract stable parts of user agent (browser + OS)
  const parsed = parseUserAgent(userAgent)
  const stableAgent = `${parsed.browser}|${parsed.os}|${parsed.deviceType}`

  // Create deterministic hash
  const data = `${stableAgent}|${ipHash}`
  return createHash('sha256').update(data).digest('hex').substring(0, 32)
}

/**
 * Hash an IP address for change detection.
 * Privacy-preserving: cannot be reversed to original IP.
 */
export function hashIpAddress(ip: string, salt: string = 'fledgely-login'): string {
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').substring(0, 16)
}

/**
 * Build a device description for display in notifications.
 */
export function buildDeviceDescription(fingerprint: {
  browser: string
  os: string
  deviceType: DeviceType
  approximateLocation?: string | null
}): string {
  const { browser, os, deviceType, approximateLocation } = fingerprint

  // Device name based on type
  let device = ''
  switch (deviceType) {
    case 'mobile':
      device = 'phone'
      break
    case 'tablet':
      device = 'tablet'
      break
    case 'desktop':
      device = 'computer'
      break
    default:
      device = 'device'
  }

  // Build description
  const parts = [`${browser} on ${os} ${device}`]

  if (approximateLocation) {
    parts.push(`near ${approximateLocation}`)
  }

  return parts.join(' ')
}

// ============================================
// Callable Input/Output Schemas
// ============================================

/** Input for tracking a login session */
export const trackLoginSessionInputSchema = z.object({
  /** Family ID */
  familyId: z.string().min(1),
  /** User agent from request */
  userAgent: z.string(),
  /** IP address (will be hashed, not stored directly) */
  ipAddress: z.string(),
  /** Approximate location from IP geolocation (city-level) */
  approximateLocation: z.string().nullable().optional(),
})
export type TrackLoginSessionInput = z.infer<typeof trackLoginSessionInputSchema>

/** Output from tracking a login session */
export const trackLoginSessionOutputSchema = z.object({
  /** Whether the operation succeeded */
  success: z.boolean(),
  /** Created session ID */
  sessionId: z.string(),
  /** Whether this is a new device */
  isNewDevice: z.boolean(),
  /** Whether device is trusted */
  isTrusted: z.boolean(),
  /** Whether notification was sent */
  notificationSent: z.boolean(),
  /** Fingerprint info for reference */
  fingerprint: z.object({
    id: z.string(),
    deviceType: deviceTypeSchema,
    browser: z.string(),
    os: z.string(),
  }),
})
export type TrackLoginSessionOutput = z.infer<typeof trackLoginSessionOutputSchema>

/** Input for adding a trusted device */
export const addTrustedDeviceInputSchema = z.object({
  /** Fingerprint ID to trust */
  fingerprintId: z.string().min(1),
  /** Optional custom device name */
  deviceName: z.string().optional(),
})
export type AddTrustedDeviceInput = z.infer<typeof addTrustedDeviceInputSchema>

/** Input for removing a trusted device */
export const removeTrustedDeviceInputSchema = z.object({
  /** Fingerprint ID to remove */
  fingerprintId: z.string().min(1),
})
export type RemoveTrustedDeviceInput = z.infer<typeof removeTrustedDeviceInputSchema>

/** Output for listing trusted devices */
export const trustedDeviceListOutputSchema = z.object({
  /** List of trusted devices */
  devices: z.array(trustedDeviceSchema),
})
export type TrustedDeviceListOutput = z.infer<typeof trustedDeviceListOutputSchema>
