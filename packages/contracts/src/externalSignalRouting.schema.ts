/**
 * External Signal Routing Schema
 *
 * Story 7.5.2: External Signal Routing
 *
 * Defines schemas for routing safety signals to external crisis partners.
 * Signals are encrypted and sent to jurisdiction-appropriate resources.
 *
 * CRITICAL INVARIANT (INV-002): Safety signals NEVER visible to family.
 * - External payload contains minimal information
 * - No family identifiers that could allow tracing
 * - Partner receives only what's needed to help child
 */

import { z } from 'zod'
import { signalDeviceTypeSchema, type SignalDeviceType } from './safetySignal.schema'

// ============================================================================
// Constants
// ============================================================================

/**
 * External signal routing constants
 */
export const EXTERNAL_ROUTING_CONSTANTS = {
  /** Minimum blackout period in milliseconds (48 hours) */
  MIN_BLACKOUT_MS: 48 * 60 * 60 * 1000,
  /** Default blackout period in milliseconds (48 hours) */
  DEFAULT_BLACKOUT_MS: 48 * 60 * 60 * 1000,
  /** Maximum partner webhook timeout (ms) */
  PARTNER_WEBHOOK_TIMEOUT_MS: 30000,
  /** Partner webhook retry attempts */
  PARTNER_WEBHOOK_MAX_RETRIES: 3,
  /** Partner acknowledgment timeout (ms) */
  PARTNER_ACK_TIMEOUT_MS: 5000,
  /** Collection name for blackout records */
  BLACKOUT_COLLECTION: 'signal-blackouts',
  /** Collection name for partner configurations */
  PARTNER_CONFIG_COLLECTION: 'crisis-partners',
  /** Collection name for routing logs (isolated) */
  ROUTING_LOG_COLLECTION: 'signal-routing-logs',
  /** Default jurisdiction for unknown locations */
  DEFAULT_JURISDICTION: 'US-NATIONAL',
  /** Encryption algorithm for partner delivery */
  ENCRYPTION_ALGORITHM: 'RSA-OAEP',
  /** AES key length for payload encryption */
  AES_KEY_LENGTH: 256,
} as const

/**
 * Partner status labels
 */
export const PARTNER_STATUS_LABELS = {
  active: 'Active',
  inactive: 'Inactive',
  suspended: 'Suspended',
} as const

/**
 * Routing status labels
 */
export const ROUTING_STATUS_LABELS = {
  pending: 'Pending',
  encrypting: 'Encrypting',
  sending: 'Sending',
  sent: 'Sent',
  acknowledged: 'Acknowledged',
  failed: 'Failed',
} as const

/**
 * Blackout status labels
 */
export const BLACKOUT_STATUS_LABELS = {
  active: 'Active',
  expired: 'Expired',
  extended: 'Extended',
} as const

// ============================================================================
// External Signal Payload (Minimal Information)
// ============================================================================

/**
 * External signal payload - MINIMAL information for crisis partner
 *
 * CRITICAL: This schema explicitly EXCLUDES sensitive family data.
 * Never add: parentId, familyId, childName, email, phone, screenshots, activityData
 */
export const externalSignalPayloadSchema = z.object({
  /** Signal identifier (for deduplication) */
  signalId: z.string().min(1),

  /** Child's age in years (anonymized - no birthdate) */
  childAge: z.number().int().min(1).max(25),

  /** Whether child has shared custody arrangement */
  hasSharedCustody: z.boolean(),

  /** ISO timestamp when signal was triggered */
  signalTimestamp: z.string().datetime(),

  /** Jurisdiction code for routing (e.g., 'US-CA', 'US-TX', 'GB') */
  jurisdiction: z.string().min(2).max(10),

  /** Device platform where signal originated */
  devicePlatform: signalDeviceTypeSchema,
})

export type ExternalSignalPayload = z.infer<typeof externalSignalPayloadSchema>

/**
 * Validate that payload does NOT contain forbidden fields
 *
 * SECURITY: This function ensures we never accidentally include sensitive data
 */
export function validatePayloadExclusions(data: Record<string, unknown>): {
  valid: boolean
  forbiddenFields: string[]
} {
  const forbiddenFields = [
    'parentId',
    'familyId',
    'childId', // We use signalId instead
    'childName',
    'firstName',
    'lastName',
    'email',
    'phone',
    'phoneNumber',
    'screenshot',
    'screenshots',
    'activityData',
    'activity',
    'browsingHistory',
    'urls',
    'address',
    'location', // Only jurisdiction code is allowed
    'coordinates',
    'deviceId', // Only platform type is allowed
    'userId',
  ]

  const found = forbiddenFields.filter((field) => field in data)

  return {
    valid: found.length === 0,
    forbiddenFields: found,
  }
}

// ============================================================================
// Partner Configuration Schemas
// ============================================================================

/**
 * Partner status
 */
export const partnerStatusSchema = z.enum(['active', 'inactive', 'suspended'])

export type PartnerStatus = z.infer<typeof partnerStatusSchema>

/**
 * Crisis partner configuration
 */
export const crisisPartnerConfigSchema = z.object({
  /** Partner identifier */
  partnerId: z.string().min(1),

  /** Partner display name */
  name: z.string().min(1).max(200),

  /** Partner description */
  description: z.string().max(1000).nullable(),

  /** Partner status */
  status: partnerStatusSchema,

  /** Webhook URL for signal delivery */
  webhookUrl: z.string().url(),

  /** RSA public key for payload encryption (PEM format) */
  publicKey: z.string().min(100), // PEM keys are long

  /** Jurisdictions this partner handles */
  jurisdictions: z.array(z.string().min(2).max(10)),

  /** Whether this is a fallback (national) partner */
  isFallback: z.boolean(),

  /** Partner priority (lower = higher priority) */
  priority: z.number().int().min(0).max(100),

  /** ISO timestamp when partner was added */
  createdAt: z.string().datetime(),

  /** ISO timestamp when partner was last updated */
  updatedAt: z.string().datetime(),

  /** ISO timestamp when public key expires */
  keyExpiresAt: z.string().datetime().nullable(),
})

export type CrisisPartnerConfig = z.infer<typeof crisisPartnerConfigSchema>

/**
 * Partner registry for jurisdiction routing
 */
export const partnerRegistrySchema = z.object({
  /** Map of jurisdiction code to partner IDs */
  jurisdictionMap: z.record(z.string(), z.array(z.string())),

  /** Fallback partner IDs (national resources) */
  fallbackPartners: z.array(z.string()),

  /** ISO timestamp when registry was last updated */
  lastUpdated: z.string().datetime(),
})

export type PartnerRegistry = z.infer<typeof partnerRegistrySchema>

// ============================================================================
// Routing Status Schemas
// ============================================================================

/**
 * Routing status
 */
export const routingStatusSchema = z.enum([
  'pending', // Signal queued for routing
  'encrypting', // Payload being encrypted
  'sending', // Sending to partner
  'sent', // Sent to partner, awaiting ack
  'acknowledged', // Partner acknowledged receipt
  'failed', // Routing permanently failed
])

export type RoutingStatus = z.infer<typeof routingStatusSchema>

/**
 * Signal routing record (stored in isolated collection)
 */
export const signalRoutingRecordSchema = z.object({
  /** Routing record ID */
  id: z.string().min(1),

  /** Original signal ID */
  signalId: z.string().min(1),

  /** Partner ID signal was routed to */
  partnerId: z.string().min(1),

  /** Routing status */
  status: routingStatusSchema,

  /** Jurisdiction used for routing */
  jurisdiction: z.string().min(2).max(10),

  /** Whether fallback partner was used */
  usedFallback: z.boolean(),

  /** ISO timestamp when routing started */
  startedAt: z.string().datetime(),

  /** ISO timestamp when sent to partner */
  sentAt: z.string().datetime().nullable(),

  /** ISO timestamp when partner acknowledged */
  acknowledgedAt: z.string().datetime().nullable(),

  /** Partner's acknowledgment reference (if provided) */
  partnerReference: z.string().nullable(),

  /** Number of delivery attempts */
  attempts: z.number().int().min(0),

  /** Last error message (if any) */
  lastError: z.string().nullable(),
})

export type SignalRoutingRecord = z.infer<typeof signalRoutingRecordSchema>

// ============================================================================
// Blackout Schemas
// ============================================================================

/**
 * Blackout status
 */
export const blackoutStatusSchema = z.enum(['active', 'expired', 'extended'])

export type BlackoutStatus = z.infer<typeof blackoutStatusSchema>

/**
 * Signal blackout record
 *
 * Stored in isolated collection, prevents any family notification
 * for the specified duration after a safety signal.
 */
export const signalBlackoutSchema = z.object({
  /** Blackout record ID */
  id: z.string().min(1),

  /** Child ID this blackout applies to */
  childId: z.string().min(1),

  /** Signal ID that triggered blackout */
  signalId: z.string().min(1),

  /** Current blackout status */
  status: blackoutStatusSchema,

  /** ISO timestamp when blackout started */
  startedAt: z.string().datetime(),

  /** ISO timestamp when blackout expires */
  expiresAt: z.string().datetime(),

  /** ISO timestamp if blackout was extended */
  extendedAt: z.string().datetime().nullable(),

  /** Reason for extension (if extended) */
  extensionReason: z.string().max(500).nullable(),
})

export type SignalBlackout = z.infer<typeof signalBlackoutSchema>

/**
 * Input for checking if notifications are blocked
 */
export const checkBlackoutInputSchema = z.object({
  /** Child ID to check */
  childId: z.string().min(1),

  /** Type of notification being attempted */
  notificationType: z.string().min(1),
})

export type CheckBlackoutInput = z.infer<typeof checkBlackoutInputSchema>

/**
 * Response for blackout check
 */
export const checkBlackoutResponseSchema = z.object({
  /** Whether notifications are blocked */
  isBlocked: z.boolean(),

  /** ISO timestamp when blackout expires (if blocked) */
  expiresAt: z.string().datetime().nullable(),

  /** Remaining time in milliseconds (if blocked) */
  remainingMs: z.number().int().nullable(),
})

export type CheckBlackoutResponse = z.infer<typeof checkBlackoutResponseSchema>

// ============================================================================
// Encrypted Delivery Schemas
// ============================================================================

/**
 * Encrypted signal package for partner delivery
 */
export const encryptedSignalPackageSchema = z.object({
  /** Encrypted AES key (RSA-OAEP encrypted) - base64 encoded */
  encryptedKey: z.string().min(100),

  /** Encrypted payload (AES-GCM encrypted) - base64 encoded */
  encryptedPayload: z.string().min(10),

  /** Initialization vector for AES-GCM - base64 encoded */
  iv: z.string().length(16), // 12 bytes = 16 base64 chars

  /** Algorithm used for key encryption */
  keyAlgorithm: z.literal('RSA-OAEP'),

  /** Algorithm used for payload encryption */
  payloadAlgorithm: z.literal('AES-GCM'),

  /** Partner ID this package is encrypted for */
  partnerId: z.string().min(1),

  /** SHA-256 hash of partner's public key (for verification) */
  publicKeyHash: z.string().length(64), // hex encoded SHA-256
})

export type EncryptedSignalPackage = z.infer<typeof encryptedSignalPackageSchema>

/**
 * Partner webhook delivery payload
 */
export const partnerWebhookPayloadSchema = z.object({
  /** Schema version for forward compatibility */
  version: z.literal('1.0'),

  /** Fledgely instance identifier */
  instanceId: z.string().min(1),

  /** Encrypted signal package */
  package: encryptedSignalPackageSchema,

  /** ISO timestamp of delivery */
  deliveredAt: z.string().datetime(),

  /** Signal reference (not the full signal ID) */
  signalRef: z.string().min(8).max(16),
})

export type PartnerWebhookPayload = z.infer<typeof partnerWebhookPayloadSchema>

/**
 * Expected partner webhook response
 */
export const partnerWebhookResponseSchema = z.object({
  /** Whether partner received the signal */
  received: z.boolean(),

  /** Partner's reference number for this signal */
  reference: z.string().nullable(),

  /** Any error message from partner */
  error: z.string().nullable(),
})

export type PartnerWebhookResponse = z.infer<typeof partnerWebhookResponseSchema>

// ============================================================================
// Routing Service Input/Output Schemas
// ============================================================================

/**
 * Input for routing a signal to external partner
 */
export const routeSignalInputSchema = z.object({
  /** Signal ID to route */
  signalId: z.string().min(1),

  /** Child ID (for age lookup) */
  childId: z.string().min(1),

  /** ISO timestamp when signal was triggered */
  triggeredAt: z.string().datetime(),

  /** Device type where signal originated */
  deviceType: signalDeviceTypeSchema,

  /** Jurisdiction for routing (detected or provided) */
  jurisdiction: z.string().min(2).max(10).nullable(),
})

export type RouteSignalInput = z.infer<typeof routeSignalInputSchema>

/**
 * Response from signal routing
 */
export const routeSignalResponseSchema = z.object({
  /** Whether routing was successful */
  success: z.boolean(),

  /** Routing record ID */
  routingId: z.string().nullable(),

  /** Partner ID signal was routed to */
  partnerId: z.string().nullable(),

  /** Whether fallback partner was used */
  usedFallback: z.boolean(),

  /** Error message if routing failed */
  error: z.string().nullable(),
})

export type RouteSignalResponse = z.infer<typeof routeSignalResponseSchema>

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get partner status label
 */
export function getPartnerStatusLabel(status: PartnerStatus): string {
  return PARTNER_STATUS_LABELS[status]
}

/**
 * Get routing status label
 */
export function getRoutingStatusLabel(status: RoutingStatus): string {
  return ROUTING_STATUS_LABELS[status]
}

/**
 * Get blackout status label
 */
export function getBlackoutStatusLabel(status: BlackoutStatus): string {
  return BLACKOUT_STATUS_LABELS[status]
}

/**
 * Safe parse external signal payload
 */
export function safeParseExternalSignalPayload(input: unknown): ExternalSignalPayload | null {
  const result = externalSignalPayloadSchema.safeParse(input)
  return result.success ? result.data : null
}

/**
 * Validate external signal payload
 */
export function validateExternalSignalPayload(input: unknown): ExternalSignalPayload {
  return externalSignalPayloadSchema.parse(input)
}

/**
 * Safe parse crisis partner config
 */
export function safeParseCrisisPartnerConfig(input: unknown): CrisisPartnerConfig | null {
  const result = crisisPartnerConfigSchema.safeParse(input)
  return result.success ? result.data : null
}

/**
 * Safe parse signal routing record
 */
export function safeParseSignalRoutingRecord(input: unknown): SignalRoutingRecord | null {
  const result = signalRoutingRecordSchema.safeParse(input)
  return result.success ? result.data : null
}

/**
 * Safe parse signal blackout
 */
export function safeParseSignalBlackout(input: unknown): SignalBlackout | null {
  const result = signalBlackoutSchema.safeParse(input)
  return result.success ? result.data : null
}

/**
 * Check if blackout is currently active
 */
export function isBlackoutActive(blackout: SignalBlackout): boolean {
  if (blackout.status === 'expired') return false
  return new Date(blackout.expiresAt) > new Date()
}

/**
 * Calculate remaining blackout time in milliseconds
 */
export function getRemainingBlackoutMs(blackout: SignalBlackout): number {
  const expiresAt = new Date(blackout.expiresAt).getTime()
  const now = Date.now()
  return Math.max(0, expiresAt - now)
}

/**
 * Create a new blackout record
 */
export function createBlackout(
  childId: string,
  signalId: string,
  durationMs: number = EXTERNAL_ROUTING_CONSTANTS.DEFAULT_BLACKOUT_MS
): Omit<SignalBlackout, 'id'> {
  const now = new Date()
  return {
    childId,
    signalId,
    status: 'active',
    startedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + durationMs).toISOString(),
    extendedAt: null,
    extensionReason: null,
  }
}

/**
 * Create external signal payload from child data
 *
 * CRITICAL: This function enforces payload minimization
 */
export function createExternalPayload(
  signalId: string,
  childAge: number,
  hasSharedCustody: boolean,
  signalTimestamp: string,
  jurisdiction: string,
  devicePlatform: SignalDeviceType
): ExternalSignalPayload {
  return {
    signalId,
    childAge,
    hasSharedCustody,
    signalTimestamp,
    jurisdiction,
    devicePlatform,
  }
}

/**
 * Generate a short signal reference (not the full ID)
 */
export function generateSignalRef(signalId: string): string {
  // Use last 12 characters of signal ID as reference
  return signalId.slice(-12)
}

/**
 * Check if partner's public key is expired or expiring soon
 */
export function isPartnerKeyExpiringSoon(partner: CrisisPartnerConfig, daysWarning: number = 30): boolean {
  if (!partner.keyExpiresAt) return false
  const expiresAt = new Date(partner.keyExpiresAt)
  const warningDate = new Date()
  warningDate.setDate(warningDate.getDate() + daysWarning)
  return expiresAt <= warningDate
}

/**
 * Check if partner is available for routing
 */
export function isPartnerAvailable(partner: CrisisPartnerConfig): boolean {
  if (partner.status !== 'active') return false
  if (partner.keyExpiresAt && new Date(partner.keyExpiresAt) <= new Date()) return false
  return true
}

/**
 * Find best partner for jurisdiction
 */
export function findPartnerForJurisdiction(
  jurisdiction: string,
  registry: PartnerRegistry,
  partners: CrisisPartnerConfig[]
): CrisisPartnerConfig | null {
  // First try jurisdiction-specific partners
  const jurisdictionPartnerIds = registry.jurisdictionMap[jurisdiction] || []

  for (const partnerId of jurisdictionPartnerIds) {
    const partner = partners.find((p) => p.partnerId === partnerId)
    if (partner && isPartnerAvailable(partner)) {
      return partner
    }
  }

  // Fall back to national partners
  for (const partnerId of registry.fallbackPartners) {
    const partner = partners.find((p) => p.partnerId === partnerId)
    if (partner && isPartnerAvailable(partner)) {
      return partner
    }
  }

  return null
}
