'use client'

/**
 * SignalRoutingService
 *
 * Story 7.5.2: External Signal Routing - Task 2
 *
 * Routes safety signals to external crisis partners based on jurisdiction.
 * Handles partner selection, payload preparation, and routing status tracking.
 *
 * CRITICAL SAFETY REQUIREMENTS:
 * - Payload contains ONLY minimal information (no family identifiers)
 * - Signals are encrypted before delivery
 * - No notification goes to family during blackout period
 * - All routing is logged in isolated collection (not family-accessible)
 *
 * CRITICAL INVARIANT (INV-002): Safety signals NEVER visible to family.
 */

import {
  type ExternalSignalPayload,
  type CrisisPartnerConfig,
  type PartnerRegistry,
  type SignalRoutingRecord,
  type SignalBlackout,
  type RouteSignalInput,
  type RouteSignalResponse,
  type RoutingStatus,
  type SignalDeviceType,
  EXTERNAL_ROUTING_CONSTANTS,
  createExternalPayload,
  createBlackout,
  validatePayloadExclusions,
  findPartnerForJurisdiction,
  isPartnerAvailable,
  generateSignalRef,
} from '@fledgely/contracts'

// ============================================================================
// Types
// ============================================================================

/**
 * Service dependencies (for testing)
 */
export interface SignalRoutingDependencies {
  /** Get child's age from profile */
  getChildAge: (childId: string) => Promise<number | null>
  /** Check if child has shared custody */
  hasSharedCustody: (childId: string) => Promise<boolean>
  /** Get partner configuration */
  getPartnerConfig: (partnerId: string) => Promise<CrisisPartnerConfig | null>
  /** Get partner registry */
  getPartnerRegistry: () => Promise<PartnerRegistry>
  /** Get all active partners */
  getAllPartners: () => Promise<CrisisPartnerConfig[]>
  /** Save routing record */
  saveRoutingRecord: (record: SignalRoutingRecord) => Promise<void>
  /** Update routing record */
  updateRoutingRecord: (recordId: string, updates: Partial<SignalRoutingRecord>) => Promise<void>
  /** Save blackout record */
  saveBlackout: (blackout: SignalBlackout) => Promise<void>
  /** Check if blackout is active for child */
  isBlackoutActive: (childId: string) => Promise<boolean>
  /** Send encrypted payload to partner */
  sendToPartner: (partnerId: string, payload: ExternalSignalPayload) => Promise<{ success: boolean; reference?: string; error?: string }>
  /** Generate unique IDs */
  generateId: () => string
}

/**
 * Routing context with all gathered information
 */
interface RoutingContext {
  input: RouteSignalInput
  childAge: number
  hasSharedCustody: boolean
  jurisdiction: string
  partner: CrisisPartnerConfig
  usedFallback: boolean
}

// ============================================================================
// Default Dependencies
// ============================================================================

/**
 * Create default dependencies using Firebase/Firestore
 *
 * NOTE: Full implementation will connect to Firestore and Cloud Functions
 * This provides the interface and mock behavior for development/testing
 */
const createDefaultDependencies = (): SignalRoutingDependencies => {
  return {
    getChildAge: async (_childId: string) => {
      // TODO: Connect to Firestore children collection
      // For now, return a default age for testing
      console.warn('SignalRoutingService: getChildAge not fully implemented')
      return 12
    },

    hasSharedCustody: async (_childId: string) => {
      // TODO: Connect to Firestore custody declarations
      console.warn('SignalRoutingService: hasSharedCustody not fully implemented')
      return false
    },

    getPartnerConfig: async (_partnerId: string) => {
      // TODO: Connect to Firestore crisis-partners collection
      console.warn('SignalRoutingService: getPartnerConfig not fully implemented')
      return null
    },

    getPartnerRegistry: async () => {
      // TODO: Connect to Firestore for partner registry
      console.warn('SignalRoutingService: getPartnerRegistry not fully implemented')
      return {
        jurisdictionMap: {},
        fallbackPartners: ['default_national_partner'],
        lastUpdated: new Date().toISOString(),
      }
    },

    getAllPartners: async () => {
      // TODO: Connect to Firestore crisis-partners collection
      console.warn('SignalRoutingService: getAllPartners not fully implemented')
      // Return a mock fallback partner for development
      return [{
        partnerId: 'default_national_partner',
        name: 'National Crisis Line (Mock)',
        description: 'Mock partner for development',
        status: 'active',
        webhookUrl: 'https://mock-crisis-partner.example.com/webhook',
        publicKey: 'MOCK_PUBLIC_KEY_' + 'x'.repeat(150),
        jurisdictions: [],
        isFallback: true,
        priority: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        keyExpiresAt: null,
      }]
    },

    saveRoutingRecord: async (_record: SignalRoutingRecord) => {
      // TODO: Save to Firestore signal-routing-logs collection
      console.warn('SignalRoutingService: saveRoutingRecord not fully implemented')
    },

    updateRoutingRecord: async (_recordId: string, _updates: Partial<SignalRoutingRecord>) => {
      // TODO: Update in Firestore
      console.warn('SignalRoutingService: updateRoutingRecord not fully implemented')
    },

    saveBlackout: async (_blackout: SignalBlackout) => {
      // TODO: Save to Firestore signal-blackouts collection
      console.warn('SignalRoutingService: saveBlackout not fully implemented')
    },

    isBlackoutActive: async (_childId: string) => {
      // TODO: Check Firestore signal-blackouts collection
      console.warn('SignalRoutingService: isBlackoutActive not fully implemented')
      return false
    },

    sendToPartner: async (_partnerId: string, _payload: ExternalSignalPayload) => {
      // TODO: Call Cloud Function to send encrypted payload
      console.warn('SignalRoutingService: sendToPartner not fully implemented')
      return { success: true, reference: `mock_ref_${Date.now()}` }
    },

    generateId: () => {
      return `routing_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    },
  }
}

// ============================================================================
// SignalRoutingService
// ============================================================================

/**
 * Service for routing safety signals to external crisis partners
 *
 * @example
 * ```ts
 * const routingService = new SignalRoutingService()
 *
 * // Route a signal
 * const response = await routingService.routeSignal({
 *   signalId: 'sig_123',
 *   childId: 'child_123',
 *   triggeredAt: new Date().toISOString(),
 *   deviceType: 'web',
 *   jurisdiction: 'US-CA',
 * })
 * ```
 */
export class SignalRoutingService {
  private readonly deps: SignalRoutingDependencies

  constructor(dependencies?: Partial<SignalRoutingDependencies>) {
    this.deps = {
      ...createDefaultDependencies(),
      ...dependencies,
    }
  }

  /**
   * Route a safety signal to an external crisis partner
   *
   * CRITICAL: This method enforces payload minimization and starts blackout
   */
  async routeSignal(input: RouteSignalInput): Promise<RouteSignalResponse> {
    const routingId = this.deps.generateId()
    const startedAt = new Date().toISOString()

    try {
      // 1. Create initial routing record
      const routingRecord = this.createInitialRoutingRecord(routingId, input, startedAt)
      await this.deps.saveRoutingRecord(routingRecord)

      // 2. Gather routing context
      const context = await this.gatherRoutingContext(input)

      // 3. Build minimal external payload
      const payload = this.buildExternalPayload(input, context)

      // 4. Validate payload doesn't contain forbidden fields
      this.validatePayload(payload)

      // 5. Update routing record with partner info
      await this.deps.updateRoutingRecord(routingId, {
        partnerId: context.partner.partnerId,
        usedFallback: context.usedFallback,
        status: 'encrypting',
      })

      // 6. Send to partner (encryption happens in Cloud Function)
      const sendResult = await this.deps.sendToPartner(context.partner.partnerId, payload)

      if (sendResult.success) {
        // 7. Update routing record with success
        await this.deps.updateRoutingRecord(routingId, {
          status: 'sent',
          sentAt: new Date().toISOString(),
          partnerReference: sendResult.reference ?? null,
        })

        // 8. Start 48-hour blackout period
        await this.startBlackout(input.childId, input.signalId)

        return {
          success: true,
          routingId,
          partnerId: context.partner.partnerId,
          usedFallback: context.usedFallback,
          error: null,
        }
      } else {
        // Update routing record with failure
        await this.deps.updateRoutingRecord(routingId, {
          status: 'failed',
          lastError: sendResult.error ?? 'Unknown error',
          attempts: 1,
        })

        return {
          success: false,
          routingId,
          partnerId: context.partner.partnerId,
          usedFallback: context.usedFallback,
          error: sendResult.error ?? 'Failed to send signal to partner',
        }
      }
    } catch (error) {
      // Update routing record with error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await this.deps.updateRoutingRecord(routingId, {
        status: 'failed',
        lastError: errorMessage,
      }).catch(() => {
        // Ignore update errors - signal may still be processable
      })

      return {
        success: false,
        routingId,
        partnerId: null,
        usedFallback: false,
        error: errorMessage,
      }
    }
  }

  /**
   * Check if notifications are blocked for a child (blackout active)
   */
  async isNotificationBlocked(childId: string): Promise<boolean> {
    return this.deps.isBlackoutActive(childId)
  }

  /**
   * Get jurisdiction from input or detect from child's profile
   */
  async detectJurisdiction(childId: string, providedJurisdiction: string | null): Promise<string> {
    // Use provided jurisdiction if available
    if (providedJurisdiction) {
      return providedJurisdiction
    }

    // TODO: Detect from child's profile, device location, or IP geolocation
    // For now, return default
    return EXTERNAL_ROUTING_CONSTANTS.DEFAULT_JURISDICTION
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Create initial routing record
   */
  private createInitialRoutingRecord(
    id: string,
    input: RouteSignalInput,
    startedAt: string
  ): SignalRoutingRecord {
    return {
      id,
      signalId: input.signalId,
      partnerId: '', // Will be updated when partner is selected
      status: 'pending',
      jurisdiction: input.jurisdiction ?? EXTERNAL_ROUTING_CONSTANTS.DEFAULT_JURISDICTION,
      usedFallback: false,
      startedAt,
      sentAt: null,
      acknowledgedAt: null,
      partnerReference: null,
      attempts: 0,
      lastError: null,
    }
  }

  /**
   * Gather all context needed for routing
   */
  private async gatherRoutingContext(input: RouteSignalInput): Promise<RoutingContext> {
    // Get child's age
    const childAge = await this.deps.getChildAge(input.childId)
    if (childAge === null) {
      throw new Error('Could not determine child age')
    }

    // Check custody status
    const hasSharedCustody = await this.deps.hasSharedCustody(input.childId)

    // Detect jurisdiction
    const jurisdiction = await this.detectJurisdiction(input.childId, input.jurisdiction)

    // Find partner for jurisdiction
    const registry = await this.deps.getPartnerRegistry()
    const partners = await this.deps.getAllPartners()
    const partner = findPartnerForJurisdiction(jurisdiction, registry, partners)

    if (!partner) {
      throw new Error(`No available partner for jurisdiction: ${jurisdiction}`)
    }

    // Check if we're using fallback
    const jurisdictionPartnerIds = registry.jurisdictionMap[jurisdiction] || []
    const usedFallback = !jurisdictionPartnerIds.includes(partner.partnerId)

    return {
      input,
      childAge,
      hasSharedCustody,
      jurisdiction,
      partner,
      usedFallback,
    }
  }

  /**
   * Build minimal external payload
   *
   * CRITICAL: Only includes fields allowed by ExternalSignalPayload schema
   */
  private buildExternalPayload(
    input: RouteSignalInput,
    context: RoutingContext
  ): ExternalSignalPayload {
    return createExternalPayload(
      input.signalId,
      context.childAge,
      context.hasSharedCustody,
      input.triggeredAt,
      context.jurisdiction,
      input.deviceType
    )
  }

  /**
   * Validate payload doesn't contain forbidden fields
   *
   * SECURITY: Defense in depth - validates even after createExternalPayload
   */
  private validatePayload(payload: ExternalSignalPayload): void {
    const result = validatePayloadExclusions(payload as Record<string, unknown>)
    if (!result.valid) {
      throw new Error(`Payload contains forbidden fields: ${result.forbiddenFields.join(', ')}`)
    }
  }

  /**
   * Start 48-hour notification blackout for child
   */
  private async startBlackout(childId: string, signalId: string): Promise<void> {
    const blackout = {
      ...createBlackout(childId, signalId),
      id: this.deps.generateId(),
    }
    await this.deps.saveBlackout(blackout)
  }
}

// ============================================================================
// Factory Function
// ============================================================================

let instance: SignalRoutingService | null = null

/**
 * Get the singleton routing service instance
 */
export function getSignalRoutingService(
  dependencies?: Partial<SignalRoutingDependencies>
): SignalRoutingService {
  if (!instance) {
    instance = new SignalRoutingService(dependencies)
  }
  return instance
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetSignalRoutingService(): void {
  instance = null
}
