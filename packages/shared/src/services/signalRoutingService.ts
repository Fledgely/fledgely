/**
 * Signal Routing Service - Story 7.5.2 Task 2
 *
 * Service for routing safety signals to external crisis partners.
 * AC1: Signal routes to external crisis partnership
 * AC2: Signal includes appropriate metadata
 * AC3: Signal excludes sensitive data
 * AC6: Jurisdiction-appropriate routing
 *
 * CRITICAL SAFETY: Signals go to EXTERNAL crisis partners, NOT fledgely support.
 * NEVER include: screenshots, activity data, parent contact info, browsing history.
 */

import {
  type CrisisPartner,
  type FamilyStructure,
  type PartnerCapability,
  type SignalRoutingPayload,
  type SignalRoutingResult,
  type EnhancedSignalRoutingPayload,
  createSignalRoutingPayload,
  createSignalRoutingResult,
  createEnhancedSignalRoutingPayload,
  partnerSupportsJurisdiction,
  ROUTING_STATUS,
} from '../contracts/crisisPartner'
import { type SafetySignal } from '../contracts/safetySignal'
import { jurisdictionHasMandatoryReporting } from './jurisdictionService'

// ============================================
// In-Memory Storage (would be Firestore in production)
// ============================================

const partnerStore: CrisisPartner[] = []
const routingResultStore: SignalRoutingResult[] = []

// ============================================
// Partner Store Functions
// ============================================

/**
 * Add a partner to the store (for testing/initialization).
 */
export function addPartnerToStore(partner: CrisisPartner): void {
  partnerStore.push(partner)
}

/**
 * Get a partner by ID.
 */
export function getPartnerById(partnerId: string): CrisisPartner | null {
  return partnerStore.find((p) => p.id === partnerId) || null
}

/**
 * Get all active partners.
 */
export function getActivePartners(): CrisisPartner[] {
  return partnerStore.filter((p) => p.active)
}

/**
 * Get partners that support a specific jurisdiction.
 */
export function getPartnersForJurisdiction(jurisdiction: string): CrisisPartner[] {
  return partnerStore.filter((p) => p.active && partnerSupportsJurisdiction(p, jurisdiction))
}

/**
 * Get partner count (for testing).
 */
export function getPartnerCount(): number {
  return partnerStore.length
}

// ============================================
// Routing Payload Functions (AC2, AC3)
// ============================================

/**
 * Build a routing payload for sending to a crisis partner.
 *
 * AC2: Includes appropriate metadata (age, timestamp, family structure, jurisdiction).
 * AC3: EXCLUDES sensitive data (NO parent info, screenshots, activity data, browsing history).
 *
 * @param signal - The safety signal to route
 * @param childBirthDate - Child's birth date (used to calculate age, NOT included in payload)
 * @param familyStructure - Family structure (shared custody flag important for crisis response)
 * @param jurisdiction - Jurisdiction for routing
 * @returns SignalRoutingPayload with ONLY safe data
 */
export function buildRoutingPayload(
  signal: SafetySignal,
  childBirthDate: Date,
  familyStructure: FamilyStructure,
  jurisdiction: string
): SignalRoutingPayload {
  // Use the factory function which enforces strict schema validation
  // This ensures NO extra fields are included
  return createSignalRoutingPayload(
    signal.id,
    childBirthDate,
    familyStructure,
    jurisdiction,
    signal.platform,
    signal.triggerMethod,
    signal.deviceId
  )
}

/**
 * Build an enhanced routing payload with jurisdiction details.
 *
 * Story 7.5.5 Task 6: Extended routing with jurisdiction info for mandatory reporting.
 *
 * AC1: Includes jurisdiction details for mandatory reporting decisions.
 * AC2: Includes appropriate metadata (age, timestamp, family structure, jurisdiction).
 * AC3: EXCLUDES sensitive data (NO parent info, screenshots, activity data, browsing history).
 *
 * @param signal - The safety signal to route
 * @param childBirthDate - Child's birth date (used to calculate age, NOT included in payload)
 * @param familyStructure - Family structure (shared custody flag important for crisis response)
 * @param jurisdiction - Jurisdiction for routing (e.g., 'US-CA', 'UK')
 * @param requestedCapabilities - Capabilities the partner should have
 * @returns EnhancedSignalRoutingPayload with jurisdiction details and capabilities
 */
export function buildEnhancedRoutingPayload(
  signal: SafetySignal,
  childBirthDate: Date,
  familyStructure: FamilyStructure,
  jurisdiction: string,
  requestedCapabilities: PartnerCapability[]
): EnhancedSignalRoutingPayload {
  // Parse jurisdiction into country and state
  const parts = jurisdiction.split('-')
  const country = parts[0]
  const stateProvince = parts.length > 1 ? parts[1] : null

  // Determine mandatory reporting status
  const hasMandatoryReporting = jurisdictionHasMandatoryReporting(jurisdiction)

  // Get mandatory reporter categories for the jurisdiction
  // In a real implementation, this would come from a jurisdiction database
  const mandatoryReporterCategories = hasMandatoryReporting
    ? ['healthcare', 'social_work', 'counseling', 'education']
    : []

  // Use the enhanced factory function which enforces strict schema validation
  return createEnhancedSignalRoutingPayload(
    signal.id,
    childBirthDate,
    familyStructure,
    jurisdiction,
    signal.platform,
    signal.triggerMethod,
    signal.deviceId,
    {
      code: jurisdiction,
      country,
      stateProvince,
      hasMandatoryReporting,
      mandatoryReporterCategories,
    },
    requestedCapabilities
  )
}

// ============================================
// Partner Selection Functions (AC6)
// ============================================

/**
 * Select the best partner for a jurisdiction.
 *
 * AC6: Jurisdiction-appropriate routing.
 *
 * Selection priority:
 * 1. Exact jurisdiction match (e.g., 'US-CA' for California)
 * 2. Country match (e.g., 'US' for any US state)
 * 3. Higher priority (lower priority number) wins ties
 *
 * @param jurisdiction - Target jurisdiction
 * @param partners - Available partners
 * @returns Best matching partner or null
 */
export function selectPartnerForJurisdiction(
  jurisdiction: string,
  partners: CrisisPartner[]
): CrisisPartner | null {
  // Filter to active partners that support the jurisdiction
  const matching = partners.filter((p) => p.active && partnerSupportsJurisdiction(p, jurisdiction))

  if (matching.length === 0) {
    return null
  }

  // Sort by:
  // 1. Exact match (jurisdiction in partner's list) preferred
  // 2. Priority (lower number = higher priority)
  const sorted = matching.sort((a, b) => {
    const aExact = a.jurisdictions.includes(jurisdiction) ? 0 : 1
    const bExact = b.jurisdictions.includes(jurisdiction) ? 0 : 1

    if (aExact !== bExact) {
      return aExact - bExact
    }

    return a.priority - b.priority
  })

  return sorted[0]
}

// ============================================
// Routing Result Functions
// ============================================

/**
 * Store a routing result.
 */
function storeRoutingResult(result: SignalRoutingResult): void {
  routingResultStore.push(result)
}

/**
 * Get a routing result by ID.
 */
export function getRoutingResult(resultId: string): SignalRoutingResult | null {
  return routingResultStore.find((r) => r.id === resultId) || null
}

/**
 * Get routing history for a signal.
 *
 * @param signalId - Signal ID
 * @returns Array of routing results for this signal
 */
export function getRoutingHistory(signalId: string): SignalRoutingResult[] {
  return routingResultStore.filter((r) => r.signalId === signalId)
}

/**
 * Update a routing result.
 *
 * @param resultId - Result ID
 * @param updates - Fields to update
 * @returns Updated result or null if not found
 */
export function updateRoutingResult(
  resultId: string,
  updates: Partial<SignalRoutingResult>
): SignalRoutingResult | null {
  const index = routingResultStore.findIndex((r) => r.id === resultId)

  if (index === -1) {
    return null
  }

  const current = routingResultStore[index]
  const updated = { ...current, ...updates }
  routingResultStore[index] = updated

  return updated
}

/**
 * Mark a routing result as acknowledged.
 *
 * @param resultId - Result ID
 * @param partnerReferenceId - Partner's case/ticket ID
 * @returns Updated result or null
 */
export function markRoutingAcknowledged(
  resultId: string,
  partnerReferenceId: string
): SignalRoutingResult | null {
  return updateRoutingResult(resultId, {
    status: ROUTING_STATUS.ACKNOWLEDGED,
    acknowledged: true,
    acknowledgedAt: new Date(),
    partnerReferenceId,
  })
}

/**
 * Mark a routing result as failed.
 *
 * @param resultId - Result ID
 * @param errorMessage - Error message
 * @returns Updated result or null
 */
export function markRoutingFailed(
  resultId: string,
  errorMessage: string
): SignalRoutingResult | null {
  const current = getRoutingResult(resultId)
  if (!current) {
    return null
  }

  return updateRoutingResult(resultId, {
    status: ROUTING_STATUS.FAILED,
    lastError: errorMessage,
    retryCount: current.retryCount + 1,
  })
}

/**
 * Get routing result count (for testing).
 */
export function getRoutingResultCount(): number {
  return routingResultStore.length
}

// ============================================
// Main Routing Function (AC1, AC4, AC6)
// ============================================

/**
 * Route a safety signal to the appropriate crisis partner.
 *
 * AC1: Signal routes to external crisis partnership (NOT fledgely support).
 * AC4: Signal is encrypted (handled by webhook layer - Story 7.5.2 Task 4).
 * AC6: Jurisdiction-appropriate routing.
 *
 * @param signal - The safety signal to route
 * @param childProfile - Child profile with birth date and family structure
 * @param familyJurisdiction - Family's jurisdiction (e.g., 'US-CA', 'UK')
 * @returns SignalRoutingResult with routing details
 * @throws Error if no partner available for jurisdiction
 */
export async function routeSignalToPartner(
  signal: SafetySignal,
  childProfile: { birthDate: Date; familyStructure: FamilyStructure },
  familyJurisdiction: string
): Promise<SignalRoutingResult> {
  // 1. Select best partner for jurisdiction
  const partners = getActivePartners()
  const partner = selectPartnerForJurisdiction(familyJurisdiction, partners)

  if (!partner) {
    throw new Error(`No partner available for jurisdiction: ${familyJurisdiction}`)
  }

  // 2. Build routing payload (NO sensitive data)
  const _payload = buildRoutingPayload(
    signal,
    childProfile.birthDate,
    childProfile.familyStructure,
    familyJurisdiction
  )

  // 3. Create routing result (actual webhook sending is Task 4)
  const result = createSignalRoutingResult(signal.id, partner.id)

  // 4. Store result
  storeRoutingResult(result)

  // Note: Actual webhook sending with encryption is handled by:
  // - Task 4: Partner Webhook Integration
  // - Task 5: Signal Payload Encryption
  // This function prepares and stores the routing intent.

  return result
}

// ============================================
// Testing Utilities
// ============================================

/**
 * Clear all routing data (for testing).
 */
export function clearAllRoutingData(): void {
  partnerStore.length = 0
  routingResultStore.length = 0
}
