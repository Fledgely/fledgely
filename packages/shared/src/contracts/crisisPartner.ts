/**
 * Crisis Partner Contracts - Story 7.5.2 Task 1
 *
 * Data models for external crisis partner routing.
 * AC1: Signal routes to external crisis partnership
 * AC2: Signal includes appropriate metadata
 * AC3: Signal excludes sensitive data
 * AC6: Jurisdiction-appropriate routing
 *
 * CRITICAL SAFETY: Signals go to EXTERNAL crisis partners, NOT fledgely support.
 * NEVER include: screenshots, activity data, parent contact info, browsing history.
 */

import { z } from 'zod'
import { signalPlatformSchema, triggerMethodSchema } from './safetySignal'

// ============================================
// Constants
// ============================================

/** Partner capability values */
export const PARTNER_CAPABILITY = {
  /** Provides crisis counseling services */
  CRISIS_COUNSELING: 'crisis_counseling',
  /** Handles mandatory reporting requirements */
  MANDATORY_REPORTING: 'mandatory_reporting',
  /** Notifies safe adults (not parents) */
  SAFE_ADULT_NOTIFICATION: 'safe_adult_notification',
  /** Coordinates with law enforcement */
  LAW_ENFORCEMENT_COORDINATION: 'law_enforcement_coordination',
} as const

/** Family structure values */
export const FAMILY_STRUCTURE = {
  /** Single parent household */
  SINGLE_PARENT: 'single_parent',
  /** Two parent household */
  TWO_PARENT: 'two_parent',
  /** Shared custody arrangement */
  SHARED_CUSTODY: 'shared_custody',
  /** Caregiver (not parent) household */
  CAREGIVER: 'caregiver',
} as const

/** Routing status values */
export const ROUTING_STATUS = {
  /** Signal queued for routing */
  PENDING: 'pending',
  /** Signal sent to partner */
  SENT: 'sent',
  /** Partner acknowledged receipt */
  ACKNOWLEDGED: 'acknowledged',
  /** Routing failed after retries */
  FAILED: 'failed',
} as const

// ============================================
// Zod Schemas
// ============================================

/** Partner capability schema */
export const partnerCapabilitySchema = z.enum([
  PARTNER_CAPABILITY.CRISIS_COUNSELING,
  PARTNER_CAPABILITY.MANDATORY_REPORTING,
  PARTNER_CAPABILITY.SAFE_ADULT_NOTIFICATION,
  PARTNER_CAPABILITY.LAW_ENFORCEMENT_COORDINATION,
])

/** Family structure schema */
export const familyStructureSchema = z.enum([
  FAMILY_STRUCTURE.SINGLE_PARENT,
  FAMILY_STRUCTURE.TWO_PARENT,
  FAMILY_STRUCTURE.SHARED_CUSTODY,
  FAMILY_STRUCTURE.CAREGIVER,
])

/** Routing status schema */
export const routingStatusSchema = z.enum([
  ROUTING_STATUS.PENDING,
  ROUTING_STATUS.SENT,
  ROUTING_STATUS.ACKNOWLEDGED,
  ROUTING_STATUS.FAILED,
])

/**
 * Crisis Partner Schema
 *
 * External organization that receives and handles safety signals.
 */
export const crisisPartnerSchema = z.object({
  /** Unique partner ID */
  id: z.string().min(1),

  /** Partner organization name */
  name: z.string().min(1),

  /** Partner webhook URL (must be HTTPS) */
  webhookUrl: z.string().url().startsWith('https://'),

  /** Hashed API key for authentication */
  apiKeyHash: z.string().min(1),

  /** Whether partner is active */
  active: z.boolean(),

  /** List of supported jurisdictions (e.g., ['US', 'US-CA', 'UK']) */
  jurisdictions: z.array(z.string().min(1)).min(1),

  /** Priority for jurisdiction fallback ordering (lower = higher priority) */
  priority: z.number().int().min(0),

  /** Partner capabilities */
  capabilities: z.array(partnerCapabilitySchema).min(1),

  /** When partner was created */
  createdAt: z.date(),

  /** When partner was last updated */
  updatedAt: z.date(),
})

/**
 * Signal Routing Payload Schema
 *
 * Data sent to external crisis partner.
 *
 * CRITICAL: This schema intentionally EXCLUDES sensitive data:
 * - NO parent names, emails, phone numbers
 * - NO screenshots or activity data
 * - NO browsing history
 * - NO sibling information
 * - NO location data
 * - NO family financial information
 */
export const signalRoutingPayloadSchema = z
  .object({
    /** Unique signal reference ID */
    signalId: z.string().min(1),

    /** Child's age at time of signal (NOT birthdate) */
    childAge: z.number().int().min(0).max(17),

    /** When the signal was triggered */
    signalTimestamp: z.date(),

    /** Family structure (shared custody flag important for crisis response) */
    familyStructure: familyStructureSchema,

    /** Jurisdiction for routing (e.g., 'US-CA' or 'UK') */
    jurisdiction: z.string().min(1),

    /** Platform where signal was triggered */
    platform: signalPlatformSchema,

    /** How the signal was triggered */
    triggerMethod: triggerMethodSchema,

    /** Device ID (anonymized, for deduplication) */
    deviceId: z.string().nullable(),
  })
  .strict() // Ensures no extra fields are allowed

/**
 * Signal Routing Result Schema
 *
 * Records the result of routing a signal to a partner.
 */
export const signalRoutingResultSchema = z.object({
  /** Unique result ID */
  id: z.string().min(1),

  /** Signal that was routed */
  signalId: z.string().min(1),

  /** Partner that received the signal */
  partnerId: z.string().min(1),

  /** When the signal was routed */
  routedAt: z.date(),

  /** Current routing status */
  status: routingStatusSchema,

  /** Whether partner acknowledged */
  acknowledged: z.boolean(),

  /** When partner acknowledged */
  acknowledgedAt: z.date().nullable(),

  /** Partner's case/ticket ID */
  partnerReferenceId: z.string().nullable(),

  /** Number of retry attempts */
  retryCount: z.number().int().min(0),

  /** Last error message if failed */
  lastError: z.string().nullable(),
})

/**
 * Blackout Record Schema
 *
 * Tracks family notification blackout period for a signal.
 * AC5: No family notification for 48 hours.
 */
export const blackoutRecordSchema = z.object({
  /** Unique blackout ID */
  id: z.string().min(1),

  /** Signal this blackout is for */
  signalId: z.string().min(1),

  /** When blackout started */
  startedAt: z.date(),

  /** When blackout expires */
  expiresAt: z.date(),

  /** Partner ID if extended */
  extendedBy: z.string().nullable(),

  /** Whether blackout is currently active */
  active: z.boolean(),
})

// ============================================
// Types
// ============================================

export type PartnerCapability = z.infer<typeof partnerCapabilitySchema>
export type FamilyStructure = z.infer<typeof familyStructureSchema>
export type RoutingStatus = z.infer<typeof routingStatusSchema>
export type CrisisPartner = z.infer<typeof crisisPartnerSchema>
export type SignalRoutingPayload = z.infer<typeof signalRoutingPayloadSchema>
export type SignalRoutingResult = z.infer<typeof signalRoutingResultSchema>
export type BlackoutRecord = z.infer<typeof blackoutRecordSchema>

// ============================================
// ID Generators
// ============================================

/**
 * Generate a unique partner ID.
 */
export function generatePartnerId(): string {
  return `partner_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Generate a unique routing result ID.
 */
export function generateRoutingResultId(): string {
  return `route_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Generate a unique blackout ID.
 */
export function generateBlackoutId(): string {
  return `blackout_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create a new crisis partner.
 *
 * @param name - Partner organization name
 * @param webhookUrl - HTTPS webhook URL
 * @param apiKeyHash - Hashed API key
 * @param jurisdictions - Supported jurisdictions
 * @param capabilities - Partner capabilities
 * @param priority - Priority for routing (default 0)
 * @returns New CrisisPartner
 */
export function createCrisisPartner(
  name: string,
  webhookUrl: string,
  apiKeyHash: string,
  jurisdictions: string[],
  capabilities: PartnerCapability[],
  priority: number = 0
): CrisisPartner {
  const now = new Date()

  const partner: CrisisPartner = {
    id: generatePartnerId(),
    name,
    webhookUrl,
    apiKeyHash,
    active: true,
    jurisdictions,
    priority,
    capabilities,
    createdAt: now,
    updatedAt: now,
  }

  return crisisPartnerSchema.parse(partner)
}

/**
 * Create a signal routing payload.
 *
 * AC2: Signal includes appropriate metadata.
 * AC3: Signal excludes sensitive data.
 *
 * @param signalId - Signal ID
 * @param childBirthDate - Child's birth date (used to calculate age)
 * @param familyStructure - Family structure
 * @param jurisdiction - Family jurisdiction
 * @param platform - Platform where triggered
 * @param triggerMethod - How triggered
 * @param deviceId - Device ID or null
 * @returns SignalRoutingPayload
 */
export function createSignalRoutingPayload(
  signalId: string,
  childBirthDate: Date,
  familyStructure: FamilyStructure,
  jurisdiction: string,
  platform: 'web' | 'chrome_extension' | 'android',
  triggerMethod: 'logo_tap' | 'keyboard_shortcut' | 'swipe_pattern',
  deviceId: string | null
): SignalRoutingPayload {
  const payload: SignalRoutingPayload = {
    signalId,
    childAge: calculateChildAge(childBirthDate),
    signalTimestamp: new Date(),
    familyStructure,
    jurisdiction,
    platform,
    triggerMethod,
    deviceId,
  }

  return signalRoutingPayloadSchema.parse(payload)
}

/**
 * Create a signal routing result.
 *
 * @param signalId - Signal that was routed
 * @param partnerId - Partner that received it
 * @returns SignalRoutingResult
 */
export function createSignalRoutingResult(
  signalId: string,
  partnerId: string
): SignalRoutingResult {
  const result: SignalRoutingResult = {
    id: generateRoutingResultId(),
    signalId,
    partnerId,
    routedAt: new Date(),
    status: ROUTING_STATUS.PENDING,
    acknowledged: false,
    acknowledgedAt: null,
    partnerReferenceId: null,
    retryCount: 0,
    lastError: null,
  }

  return signalRoutingResultSchema.parse(result)
}

/**
 * Create a blackout record.
 *
 * AC5: No family notification for minimum 48 hours.
 *
 * @param signalId - Signal ID
 * @param durationHours - Blackout duration (default 48 hours)
 * @returns BlackoutRecord
 */
export function createBlackoutRecord(signalId: string, durationHours: number = 48): BlackoutRecord {
  const startedAt = new Date()
  const expiresAt = new Date(startedAt.getTime() + durationHours * 60 * 60 * 1000)

  const record: BlackoutRecord = {
    id: generateBlackoutId(),
    signalId,
    startedAt,
    expiresAt,
    extendedBy: null,
    active: true,
  }

  return blackoutRecordSchema.parse(record)
}

// ============================================
// Validation Functions
// ============================================

/**
 * Validate a crisis partner.
 */
export function validateCrisisPartner(data: unknown): CrisisPartner {
  return crisisPartnerSchema.parse(data)
}

/**
 * Validate a signal routing payload.
 */
export function validateSignalRoutingPayload(data: unknown): SignalRoutingPayload {
  return signalRoutingPayloadSchema.parse(data)
}

/**
 * Validate a signal routing result.
 */
export function validateSignalRoutingResult(data: unknown): SignalRoutingResult {
  return signalRoutingResultSchema.parse(data)
}

/**
 * Check if data is a valid crisis partner.
 */
export function isCrisisPartner(data: unknown): data is CrisisPartner {
  return crisisPartnerSchema.safeParse(data).success
}

/**
 * Check if data is a valid signal routing payload.
 */
export function isSignalRoutingPayload(data: unknown): data is SignalRoutingPayload {
  return signalRoutingPayloadSchema.safeParse(data).success
}

// ============================================
// Utility Functions
// ============================================

/**
 * Calculate child's age from birth date.
 *
 * @param birthDate - Child's birth date
 * @returns Age in years
 */
export function calculateChildAge(birthDate: Date): number {
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }

  return age
}

/**
 * Validate jurisdiction format.
 *
 * Valid formats:
 * - Country code: 'US', 'UK', 'CA', 'AU'
 * - Country-state: 'US-CA', 'US-NY', 'AU-NSW'
 *
 * @param jurisdiction - Jurisdiction string
 * @returns True if valid format
 */
export function isValidJurisdiction(jurisdiction: string): boolean {
  // Country code: exactly 2 uppercase letters
  const countryPattern = /^[A-Z]{2}$/
  // Country-state: 2 uppercase letters, hyphen, 2-3 uppercase letters
  const statePattern = /^[A-Z]{2}-[A-Z]{2,3}$/

  return countryPattern.test(jurisdiction) || statePattern.test(jurisdiction)
}

/**
 * Check if a partner supports a jurisdiction.
 *
 * A partner supports a jurisdiction if:
 * - Exact match (partner has 'US-CA', signal is 'US-CA')
 * - Country match (partner has 'US', signal is 'US-CA')
 *
 * @param partner - Crisis partner
 * @param jurisdiction - Jurisdiction to check
 * @returns True if partner supports jurisdiction
 */
export function partnerSupportsJurisdiction(partner: CrisisPartner, jurisdiction: string): boolean {
  // Check for exact match
  if (partner.jurisdictions.includes(jurisdiction)) {
    return true
  }

  // Check for country match (e.g., 'US' matches 'US-CA')
  const countryCode = jurisdiction.split('-')[0]
  if (partner.jurisdictions.includes(countryCode)) {
    return true
  }

  return false
}
