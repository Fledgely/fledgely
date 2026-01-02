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
// Story 7.5.5: Mandatory Reporter Pathway Constants
// ============================================

/** Escalation type values (Story 7.5.5) */
export const ESCALATION_TYPE = {
  /** Partner is assessing the situation */
  ASSESSMENT: 'assessment',
  /** Partner made mandatory report */
  MANDATORY_REPORT: 'mandatory_report',
  /** Partner referred to law enforcement */
  LAW_ENFORCEMENT_REFERRAL: 'law_enforcement_referral',
} as const

/** Reporting protocol values (Story 7.5.5) */
export const REPORTING_PROTOCOL = {
  /** Partner reports directly to authorities */
  PARTNER_DIRECT: 'partner_direct',
  /** Partner coordinates with other agencies */
  PARTNER_COORDINATED: 'partner_coordinated',
} as const

/** Legal request type values (Story 7.5.5) */
export const LEGAL_REQUEST_TYPE = {
  /** Subpoena for records */
  SUBPOENA: 'subpoena',
  /** Search warrant */
  WARRANT: 'warrant',
  /** Court order for records */
  COURT_ORDER: 'court_order',
  /** Emergency disclosure request */
  EMERGENCY_DISCLOSURE: 'emergency_disclosure',
} as const

/** Legal request status values (Story 7.5.5) */
export const LEGAL_REQUEST_STATUS = {
  /** Awaiting legal team review */
  PENDING_LEGAL_REVIEW: 'pending_legal_review',
  /** Request approved by legal */
  APPROVED: 'approved',
  /** Request denied by legal */
  DENIED: 'denied',
  /** Request fulfilled and data provided */
  FULFILLED: 'fulfilled',
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

// ============================================
// Story 7.5.5: Mandatory Reporter Pathway Schemas
// ============================================

/** Escalation type schema (Story 7.5.5) */
export const escalationTypeSchema = z.enum([
  ESCALATION_TYPE.ASSESSMENT,
  ESCALATION_TYPE.MANDATORY_REPORT,
  ESCALATION_TYPE.LAW_ENFORCEMENT_REFERRAL,
])

/** Reporting protocol schema (Story 7.5.5) */
export const reportingProtocolSchema = z.enum([
  REPORTING_PROTOCOL.PARTNER_DIRECT,
  REPORTING_PROTOCOL.PARTNER_COORDINATED,
])

/** Legal request type schema (Story 7.5.5) */
export const legalRequestTypeSchema = z.enum([
  LEGAL_REQUEST_TYPE.SUBPOENA,
  LEGAL_REQUEST_TYPE.WARRANT,
  LEGAL_REQUEST_TYPE.COURT_ORDER,
  LEGAL_REQUEST_TYPE.EMERGENCY_DISCLOSURE,
])

/** Legal request status schema (Story 7.5.5) */
export const legalRequestStatusSchema = z.enum([
  LEGAL_REQUEST_STATUS.PENDING_LEGAL_REVIEW,
  LEGAL_REQUEST_STATUS.APPROVED,
  LEGAL_REQUEST_STATUS.DENIED,
  LEGAL_REQUEST_STATUS.FULFILLED,
])

/**
 * Jurisdiction Coverage Schema (Story 7.5.5)
 *
 * Details about mandatory reporting in a specific jurisdiction.
 */
export const jurisdictionCoverageSchema = z.object({
  /** Jurisdiction code (e.g., 'US-CA', 'US-TX', 'UK', 'AU-NSW') */
  jurisdictionCode: z.string().min(1),

  /** Categories of mandatory reporters (e.g., 'healthcare', 'social_work', 'counseling') */
  mandatoryReporterCategories: z.array(z.string().min(1)).min(1),

  /** Reporting agency name (e.g., 'CPS', 'DCFS', 'Child First') */
  reportingAgency: z.string().min(1),

  /** Reporting hotline for partner reference only */
  reportingHotline: z.string().nullable(),
})

/**
 * Mandatory Reporting Capability Schema (Story 7.5.5)
 *
 * Extended metadata for partners with mandatory_reporting capability.
 */
export const mandatoryReportingCapabilitySchema = z.object({
  /** Partner ID */
  partnerId: z.string().min(1),

  /** Jurisdictions this partner can handle mandatory reports for */
  supportedJurisdictions: z.array(jurisdictionCoverageSchema).min(1),

  /** How the partner handles mandatory reporting */
  reportingProtocol: reportingProtocolSchema,

  /** Whether partner requires extended blackout period */
  requiresExtendedBlackout: z.boolean(),

  /** Average response time in hours (null if unknown) */
  averageResponseTimeHours: z.number().positive().nullable(),
})

/**
 * Signal Escalation Schema (Story 7.5.5)
 *
 * Tracks when a signal is escalated by a crisis partner.
 * CRITICAL: This is stored in isolated collection, NOT family-visible.
 */
export const signalEscalationSchema = z.object({
  /** Unique escalation ID */
  id: z.string().min(1),

  /** Signal that was escalated */
  signalId: z.string().min(1),

  /** Partner that escalated */
  partnerId: z.string().min(1),

  /** Type of escalation */
  escalationType: escalationTypeSchema,

  /** When escalation occurred */
  escalatedAt: z.date(),

  /** Jurisdiction for the escalation */
  jurisdiction: z.string().min(1),

  /** Whether this escalation is sealed from family access */
  sealed: z.boolean(),

  /** When sealing occurred (null if not sealed) */
  sealedAt: z.date().nullable(),
  // NEVER includes: outcome, report details, family contact
})

/**
 * Legal Request Schema (Story 7.5.5)
 *
 * Tracks law enforcement requests for signal data.
 * AC5: Requires human review, never automated.
 */
export const legalRequestSchema = z.object({
  /** Unique request ID */
  id: z.string().min(1),

  /** Type of legal request */
  requestType: legalRequestTypeSchema,

  /** Agency making the request */
  requestingAgency: z.string().min(1),

  /** Jurisdiction of the request */
  jurisdiction: z.string().min(1),

  /** Reference to physical legal document */
  documentReference: z.string().min(1),

  /** When request was received */
  receivedAt: z.date(),

  /** Signal IDs requested */
  signalIds: z.array(z.string().min(1)).min(1),

  /** Current request status */
  status: legalRequestStatusSchema,

  /** When request was fulfilled (null if not fulfilled) */
  fulfilledAt: z.date().nullable(),

  /** Admin user who fulfilled the request (null if not fulfilled) */
  fulfilledBy: z.string().nullable(),
})

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

/**
 * Jurisdiction Details Schema (Story 7.5.5)
 *
 * Enhanced jurisdiction info for routing payloads.
 */
export const jurisdictionDetailsSchema = z.object({
  /** Jurisdiction code (e.g., 'US-CA') */
  code: z.string().min(1),

  /** Country code (e.g., 'US') */
  country: z.string().min(1),

  /** State/province code (e.g., 'CA') or null for country-level */
  stateProvince: z.string().nullable(),

  /** Whether jurisdiction has mandatory reporting requirements */
  hasMandatoryReporting: z.boolean(),

  /** Categories of mandatory reporters in this jurisdiction */
  mandatoryReporterCategories: z.array(z.string()),
})

/**
 * Enhanced Signal Routing Payload Schema (Story 7.5.5)
 *
 * Extended routing payload with jurisdiction details and capability hints.
 */
export const enhancedSignalRoutingPayloadSchema = signalRoutingPayloadSchema
  .omit({ deviceId: true })
  .extend({
    /** Device ID (anonymized, for deduplication) */
    deviceId: z.string().nullable(),

    /** Detailed jurisdiction information */
    jurisdictionDetails: jurisdictionDetailsSchema,

    /** Capabilities requested/preferred for this signal */
    requestedCapabilities: z.array(partnerCapabilitySchema),
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

// Story 7.5.5 Types
export type EscalationType = z.infer<typeof escalationTypeSchema>
export type ReportingProtocol = z.infer<typeof reportingProtocolSchema>
export type LegalRequestType = z.infer<typeof legalRequestTypeSchema>
export type LegalRequestStatus = z.infer<typeof legalRequestStatusSchema>
export type JurisdictionCoverage = z.infer<typeof jurisdictionCoverageSchema>
export type MandatoryReportingCapability = z.infer<typeof mandatoryReportingCapabilitySchema>
export type SignalEscalation = z.infer<typeof signalEscalationSchema>
export type LegalRequest = z.infer<typeof legalRequestSchema>
export type JurisdictionDetails = z.infer<typeof jurisdictionDetailsSchema>
export type EnhancedSignalRoutingPayload = z.infer<typeof enhancedSignalRoutingPayloadSchema>

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

/**
 * Generate a unique escalation ID (Story 7.5.5).
 */
export function generateEscalationId(): string {
  return `esc_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Generate a unique legal request ID (Story 7.5.5).
 */
export function generateLegalRequestId(): string {
  return `legal_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
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
// Story 7.5.5 Factory Functions
// ============================================

/**
 * Create a jurisdiction coverage (Story 7.5.5).
 *
 * @param jurisdictionCode - Jurisdiction code (e.g., 'US-CA')
 * @param mandatoryReporterCategories - Categories of mandatory reporters
 * @param reportingAgency - Name of reporting agency
 * @param reportingHotline - Optional hotline number
 * @returns JurisdictionCoverage
 */
export function createJurisdictionCoverage(
  jurisdictionCode: string,
  mandatoryReporterCategories: string[],
  reportingAgency: string,
  reportingHotline: string | null
): JurisdictionCoverage {
  const coverage: JurisdictionCoverage = {
    jurisdictionCode,
    mandatoryReporterCategories,
    reportingAgency,
    reportingHotline,
  }

  return jurisdictionCoverageSchema.parse(coverage)
}

/**
 * Create a mandatory reporting capability (Story 7.5.5).
 *
 * @param partnerId - Partner ID
 * @param supportedJurisdictions - Jurisdictions the partner supports
 * @param reportingProtocol - How partner handles reporting
 * @param requiresExtendedBlackout - Whether extended blackout needed
 * @param averageResponseTimeHours - Average response time or null
 * @returns MandatoryReportingCapability
 */
export function createMandatoryReportingCapability(
  partnerId: string,
  supportedJurisdictions: JurisdictionCoverage[],
  reportingProtocol: ReportingProtocol,
  requiresExtendedBlackout: boolean,
  averageResponseTimeHours: number | null
): MandatoryReportingCapability {
  const capability: MandatoryReportingCapability = {
    partnerId,
    supportedJurisdictions,
    reportingProtocol,
    requiresExtendedBlackout,
    averageResponseTimeHours,
  }

  return mandatoryReportingCapabilitySchema.parse(capability)
}

/**
 * Create a signal escalation (Story 7.5.5).
 *
 * @param signalId - Signal being escalated
 * @param partnerId - Partner doing the escalation
 * @param escalationType - Type of escalation
 * @param jurisdiction - Jurisdiction for escalation
 * @returns SignalEscalation
 */
export function createSignalEscalation(
  signalId: string,
  partnerId: string,
  escalationType: EscalationType,
  jurisdiction: string
): SignalEscalation {
  const escalation: SignalEscalation = {
    id: generateEscalationId(),
    signalId,
    partnerId,
    escalationType,
    escalatedAt: new Date(),
    jurisdiction,
    sealed: false,
    sealedAt: null,
  }

  return signalEscalationSchema.parse(escalation)
}

/**
 * Create a legal request (Story 7.5.5).
 *
 * AC5: Legal requests require human review, never automated.
 *
 * @param requestType - Type of legal request
 * @param requestingAgency - Agency making the request
 * @param jurisdiction - Jurisdiction of request
 * @param documentReference - Reference to physical document
 * @param signalIds - Signal IDs being requested
 * @returns LegalRequest
 */
export function createLegalRequest(
  requestType: LegalRequestType,
  requestingAgency: string,
  jurisdiction: string,
  documentReference: string,
  signalIds: string[]
): LegalRequest {
  const request: LegalRequest = {
    id: generateLegalRequestId(),
    requestType,
    requestingAgency,
    jurisdiction,
    documentReference,
    receivedAt: new Date(),
    signalIds,
    status: LEGAL_REQUEST_STATUS.PENDING_LEGAL_REVIEW,
    fulfilledAt: null,
    fulfilledBy: null,
  }

  return legalRequestSchema.parse(request)
}

/**
 * Create an enhanced signal routing payload with jurisdiction details (Story 7.5.5).
 *
 * @param signalId - Signal ID
 * @param childBirthDate - Child's birth date
 * @param familyStructure - Family structure
 * @param jurisdiction - Jurisdiction code
 * @param platform - Platform where triggered
 * @param triggerMethod - How triggered
 * @param deviceId - Device ID or null
 * @param jurisdictionDetails - Detailed jurisdiction info
 * @param requestedCapabilities - Capabilities requested
 * @returns EnhancedSignalRoutingPayload
 */
export function createEnhancedSignalRoutingPayload(
  signalId: string,
  childBirthDate: Date,
  familyStructure: FamilyStructure,
  jurisdiction: string,
  platform: 'web' | 'chrome_extension' | 'android',
  triggerMethod: 'logo_tap' | 'keyboard_shortcut' | 'swipe_pattern',
  deviceId: string | null,
  jurisdictionDetails: JurisdictionDetails,
  requestedCapabilities: PartnerCapability[]
): EnhancedSignalRoutingPayload {
  const payload: EnhancedSignalRoutingPayload = {
    signalId,
    childAge: calculateChildAge(childBirthDate),
    signalTimestamp: new Date(),
    familyStructure,
    jurisdiction,
    platform,
    triggerMethod,
    deviceId,
    jurisdictionDetails,
    requestedCapabilities,
  }

  return enhancedSignalRoutingPayloadSchema.parse(payload)
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
// Story 7.5.5 Validation Functions
// ============================================

/**
 * Validate a signal escalation (Story 7.5.5).
 */
export function validateSignalEscalation(data: unknown): SignalEscalation {
  return signalEscalationSchema.parse(data)
}

/**
 * Validate a legal request (Story 7.5.5).
 */
export function validateLegalRequest(data: unknown): LegalRequest {
  return legalRequestSchema.parse(data)
}

/**
 * Check if data is a valid signal escalation (Story 7.5.5).
 */
export function isSignalEscalation(data: unknown): data is SignalEscalation {
  return signalEscalationSchema.safeParse(data).success
}

/**
 * Check if data is a valid legal request (Story 7.5.5).
 */
export function isLegalRequest(data: unknown): data is LegalRequest {
  return legalRequestSchema.safeParse(data).success
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

// ============================================
// Story 7.5.5 Utility Functions
// ============================================

/**
 * Check if a partner supports mandatory reporting (Story 7.5.5).
 *
 * @param partner - Crisis partner
 * @returns True if partner has mandatory_reporting capability
 */
export function partnerSupportsMandatoryReporting(partner: CrisisPartner): boolean {
  return partner.capabilities.includes(PARTNER_CAPABILITY.MANDATORY_REPORTING)
}

/**
 * Get partners with mandatory reporting capability (Story 7.5.5).
 *
 * @param partners - Array of crisis partners
 * @returns Filtered array of partners with mandatory_reporting capability
 */
export function getMandatoryReportingPartners(partners: CrisisPartner[]): CrisisPartner[] {
  return partners.filter((partner) => partnerSupportsMandatoryReporting(partner))
}
