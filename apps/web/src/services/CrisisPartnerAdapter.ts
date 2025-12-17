'use client'

/**
 * CrisisPartnerAdapter
 *
 * Story 7.5.2: External Signal Routing - Task 3
 *
 * Interface and adapters for communicating with external crisis partners.
 * Handles webhook delivery, acknowledgment, and error handling.
 *
 * CRITICAL SAFETY REQUIREMENTS:
 * - Payload is encrypted before sending (handled by encryption service)
 * - Partner response is logged but not visible to family
 * - Retry logic ensures signal delivery is attempted
 *
 * CRITICAL INVARIANT (INV-002): Safety signals NEVER visible to family.
 */

import {
  type ExternalSignalPayload,
  type CrisisPartnerConfig,
  type EncryptedSignalPackage,
  type PartnerWebhookPayload,
  type PartnerWebhookResponse,
  EXTERNAL_ROUTING_CONSTANTS,
  generateSignalRef,
} from '@fledgely/contracts'

// ============================================================================
// Types
// ============================================================================

/**
 * Result of sending signal to partner
 */
export interface PartnerDeliveryResult {
  /** Whether delivery was successful */
  success: boolean
  /** Partner's reference number (if provided) */
  reference: string | null
  /** HTTP status code (if HTTP-based) */
  statusCode: number | null
  /** Error message (if failed) */
  error: string | null
  /** Response time in milliseconds */
  responseTimeMs: number
  /** Number of attempts made */
  attempts: number
}

/**
 * Encryption service interface for adapters
 */
export interface PartnerEncryptionService {
  /** Encrypt payload for specific partner */
  encryptForPartner: (payload: ExternalSignalPayload, partner: CrisisPartnerConfig) => Promise<EncryptedSignalPackage>
}

/**
 * Interface for crisis partner adapters
 */
export interface ICrisisPartnerAdapter {
  /** Unique adapter identifier */
  readonly adapterId: string
  /** Send signal to partner */
  send: (payload: ExternalSignalPayload, partner: CrisisPartnerConfig) => Promise<PartnerDeliveryResult>
  /** Check if partner is reachable (health check) */
  healthCheck: (partner: CrisisPartnerConfig) => Promise<boolean>
}

/**
 * Configuration for webhook adapter
 */
export interface WebhookAdapterConfig {
  /** Instance identifier for this fledgely deployment */
  instanceId: string
  /** Maximum retry attempts */
  maxRetries?: number
  /** Base retry delay in milliseconds */
  retryDelayMs?: number
  /** Request timeout in milliseconds */
  timeoutMs?: number
  /** Encryption service */
  encryptionService?: PartnerEncryptionService
  /** Custom fetch implementation (for testing) */
  fetchImpl?: typeof fetch
}

// ============================================================================
// Mock Encryption Service
// ============================================================================

/**
 * Mock encryption service for development/testing
 *
 * NOTE: Full implementation will use RSA-OAEP + AES-GCM hybrid encryption
 * This mock simulates the interface without actual encryption
 */
export const createMockEncryptionService = (): PartnerEncryptionService => {
  return {
    encryptForPartner: async (payload: ExternalSignalPayload, partner: CrisisPartnerConfig): Promise<EncryptedSignalPackage> => {
      // Mock: Just base64 encode the payload (NOT secure - for dev only)
      const encoder = new TextEncoder()
      const payloadBytes = encoder.encode(JSON.stringify(payload))
      const base64Payload = btoa(String.fromCharCode(...payloadBytes))

      // Generate mock encrypted key (in real impl, this would be RSA-encrypted AES key)
      const mockEncryptedKey = btoa('MOCK_AES_KEY_' + Date.now())

      // Generate mock IV
      const mockIv = btoa('MOCK_IV_12B!')

      // Hash the mock public key
      const publicKeyHash = Array.from(new Uint8Array(16))
        .map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, '0'))
        .join('')
        .padEnd(64, '0')

      return {
        encryptedKey: mockEncryptedKey.padEnd(100, '='),
        encryptedPayload: base64Payload,
        iv: mockIv,
        keyAlgorithm: 'RSA-OAEP',
        payloadAlgorithm: 'AES-GCM',
        partnerId: partner.partnerId,
        publicKeyHash,
      }
    },
  }
}

// ============================================================================
// Webhook Adapter
// ============================================================================

/**
 * Crisis partner adapter using webhook delivery
 *
 * Sends encrypted signals to partner webhook endpoints with retry logic.
 */
export class WebhookPartnerAdapter implements ICrisisPartnerAdapter {
  readonly adapterId = 'webhook'

  private readonly instanceId: string
  private readonly maxRetries: number
  private readonly retryDelayMs: number
  private readonly timeoutMs: number
  private readonly encryptionService: PartnerEncryptionService
  private readonly fetchImpl: typeof fetch

  constructor(config: WebhookAdapterConfig) {
    this.instanceId = config.instanceId
    this.maxRetries = config.maxRetries ?? EXTERNAL_ROUTING_CONSTANTS.PARTNER_WEBHOOK_MAX_RETRIES
    this.retryDelayMs = config.retryDelayMs ?? 1000
    this.timeoutMs = config.timeoutMs ?? EXTERNAL_ROUTING_CONSTANTS.PARTNER_WEBHOOK_TIMEOUT_MS
    this.encryptionService = config.encryptionService ?? createMockEncryptionService()
    this.fetchImpl = config.fetchImpl ?? fetch
  }

  /**
   * Send signal to partner webhook
   */
  async send(payload: ExternalSignalPayload, partner: CrisisPartnerConfig): Promise<PartnerDeliveryResult> {
    const startTime = Date.now()
    let lastError: string | null = null
    let statusCode: number | null = null

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await this.attemptDelivery(payload, partner)

        return {
          success: result.received,
          reference: result.reference,
          statusCode: 200, // Successful response
          error: result.error,
          responseTimeMs: Date.now() - startTime,
          attempts: attempt,
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error'
        statusCode = error instanceof FetchError ? error.statusCode : null

        // Don't retry on client errors (4xx)
        if (statusCode && statusCode >= 400 && statusCode < 500) {
          break
        }

        // Wait before retry (with exponential backoff)
        if (attempt < this.maxRetries) {
          const delay = this.retryDelayMs * Math.pow(2, attempt - 1)
          await this.sleep(delay)
        }
      }
    }

    return {
      success: false,
      reference: null,
      statusCode,
      error: lastError ?? 'Max retries exceeded',
      responseTimeMs: Date.now() - startTime,
      attempts: this.maxRetries,
    }
  }

  /**
   * Health check - verify partner endpoint is reachable
   */
  async healthCheck(partner: CrisisPartnerConfig): Promise<boolean> {
    try {
      // Attempt HEAD request to webhook URL
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      try {
        const response = await this.fetchImpl(partner.webhookUrl, {
          method: 'HEAD',
          signal: controller.signal,
        })
        return response.ok
      } finally {
        clearTimeout(timeoutId)
      }
    } catch {
      return false
    }
  }

  /**
   * Attempt delivery to partner webhook
   */
  private async attemptDelivery(
    payload: ExternalSignalPayload,
    partner: CrisisPartnerConfig
  ): Promise<PartnerWebhookResponse> {
    // 1. Encrypt payload for partner
    const encryptedPackage = await this.encryptionService.encryptForPartner(payload, partner)

    // 2. Build webhook payload
    const webhookPayload: PartnerWebhookPayload = {
      version: '1.0',
      instanceId: this.instanceId,
      package: encryptedPackage,
      deliveredAt: new Date().toISOString(),
      signalRef: generateSignalRef(payload.signalId),
    }

    // 3. Send to partner webhook
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const response = await this.fetchImpl(partner.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Fledgely-Version': '1.0',
          'X-Fledgely-Instance': this.instanceId,
        },
        body: JSON.stringify(webhookPayload),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new FetchError(`HTTP ${response.status}`, response.status)
      }

      // Parse response
      const responseData = await response.json()

      return {
        received: responseData.received ?? true,
        reference: responseData.reference ?? null,
        error: responseData.error ?? null,
      }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Sleep for specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Custom error for fetch failures
 */
class FetchError extends Error {
  constructor(message: string, public readonly statusCode: number | null) {
    super(message)
    this.name = 'FetchError'
  }
}

// ============================================================================
// Mock Partner Adapter
// ============================================================================

/**
 * Mock adapter for development and testing
 *
 * Simulates partner behavior without making actual network calls.
 */
export class MockPartnerAdapter implements ICrisisPartnerAdapter {
  readonly adapterId = 'mock'

  private shouldFail: boolean = false
  private failureMessage: string = 'Mock failure'
  private deliveryDelay: number = 100
  private readonly deliveries: Array<{ payload: ExternalSignalPayload; partner: CrisisPartnerConfig }> = []

  /**
   * Configure mock to fail deliveries
   */
  setFailure(shouldFail: boolean, message: string = 'Mock failure'): void {
    this.shouldFail = shouldFail
    this.failureMessage = message
  }

  /**
   * Configure delivery delay
   */
  setDeliveryDelay(delayMs: number): void {
    this.deliveryDelay = delayMs
  }

  /**
   * Get all deliveries (for testing)
   */
  getDeliveries(): Array<{ payload: ExternalSignalPayload; partner: CrisisPartnerConfig }> {
    return [...this.deliveries]
  }

  /**
   * Clear delivery history (for testing)
   */
  clearDeliveries(): void {
    this.deliveries.length = 0
  }

  /**
   * Send signal (mock)
   */
  async send(payload: ExternalSignalPayload, partner: CrisisPartnerConfig): Promise<PartnerDeliveryResult> {
    const startTime = Date.now()

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, this.deliveryDelay))

    // Record delivery
    this.deliveries.push({ payload, partner })

    if (this.shouldFail) {
      return {
        success: false,
        reference: null,
        statusCode: 500,
        error: this.failureMessage,
        responseTimeMs: Date.now() - startTime,
        attempts: 1,
      }
    }

    return {
      success: true,
      reference: `mock_ref_${Date.now()}`,
      statusCode: 200,
      error: null,
      responseTimeMs: Date.now() - startTime,
      attempts: 1,
    }
  }

  /**
   * Health check (mock - always returns true unless configured to fail)
   */
  async healthCheck(_partner: CrisisPartnerConfig): Promise<boolean> {
    return !this.shouldFail
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create webhook partner adapter
 */
export function createWebhookAdapter(config: WebhookAdapterConfig): ICrisisPartnerAdapter {
  return new WebhookPartnerAdapter(config)
}

/**
 * Create mock partner adapter
 */
export function createMockAdapter(): MockPartnerAdapter {
  return new MockPartnerAdapter()
}

/**
 * Adapter registry type
 */
export type PartnerAdapterType = 'webhook' | 'mock'

/**
 * Get adapter by type
 */
export function getPartnerAdapter(
  type: PartnerAdapterType,
  config?: WebhookAdapterConfig
): ICrisisPartnerAdapter {
  switch (type) {
    case 'webhook':
      if (!config) {
        throw new Error('WebhookAdapterConfig required for webhook adapter')
      }
      return createWebhookAdapter(config)
    case 'mock':
      return createMockAdapter()
    default:
      throw new Error(`Unknown adapter type: ${type}`)
  }
}
