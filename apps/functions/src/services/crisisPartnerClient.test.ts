/**
 * Crisis Partner Client Tests - Story 7.5.2 Task 4
 *
 * TDD tests for HTTP client that sends signals to partner webhooks.
 * AC1: Signal routes to external crisis partnership
 * AC4: Signal is encrypted in transit (TLS 1.3)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  sendSignalToPartner,
  checkPartnerHealth,
  handlePartnerCallback,
  buildSignedRequest,
  calculateBackoff,
  validateWebhookUrl,
  type WebhookResponse as _WebhookResponse,
  type HealthCheckResult as _HealthCheckResult,
  type SignedRequestData as _SignedRequestData,
  MAX_RETRIES,
  TIMEOUT_MS,
  MIN_TLS_VERSION,
} from './crisisPartnerClient'
import {
  createCrisisPartner,
  createSignalRoutingPayload,
  type CrisisPartner,
  type SignalRoutingPayload,
} from '@fledgely/shared'

// Mock node-fetch
vi.mock('node-fetch', () => ({
  default: vi.fn(),
}))

describe('Crisis Partner Client', () => {
  let testPartner: CrisisPartner
  let testPayload: SignalRoutingPayload

  beforeEach(() => {
    vi.clearAllMocks()

    testPartner = createCrisisPartner(
      'Test Crisis Center',
      'https://crisis.example.com/webhook',
      'hashed_api_key_123',
      ['US', 'US-CA'],
      ['crisis_counseling'],
      0
    )

    const birthDate = new Date()
    birthDate.setFullYear(birthDate.getFullYear() - 12)

    testPayload = createSignalRoutingPayload(
      'sig_123',
      birthDate,
      'two_parent',
      'US-CA',
      'web',
      'logo_tap',
      'device_abc'
    )
  })

  // ============================================
  // Constants Tests
  // ============================================

  describe('Constants', () => {
    it('should have max retries of 3', () => {
      expect(MAX_RETRIES).toBe(3)
    })

    it('should have timeout of 30 seconds', () => {
      expect(TIMEOUT_MS).toBe(30000)
    })

    it('should require TLS 1.3', () => {
      expect(MIN_TLS_VERSION).toBe('TLSv1.3')
    })
  })

  // ============================================
  // validateWebhookUrl Tests
  // ============================================

  describe('validateWebhookUrl', () => {
    it('should accept valid HTTPS URL', () => {
      const result = validateWebhookUrl('https://crisis.example.com/webhook')

      expect(result.valid).toBe(true)
    })

    it('should reject HTTP URL', () => {
      const result = validateWebhookUrl('http://crisis.example.com/webhook')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('HTTPS')
    })

    it('should reject invalid URL', () => {
      const result = validateWebhookUrl('not-a-url')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid URL')
    })

    it('should reject empty URL', () => {
      const result = validateWebhookUrl('')

      expect(result.valid).toBe(false)
    })

    it('should accept URL with path', () => {
      const result = validateWebhookUrl('https://crisis.example.com/api/v1/signals')

      expect(result.valid).toBe(true)
    })

    it('should accept URL with port', () => {
      const result = validateWebhookUrl('https://crisis.example.com:8443/webhook')

      expect(result.valid).toBe(true)
    })
  })

  // ============================================
  // buildSignedRequest Tests
  // ============================================

  describe('buildSignedRequest', () => {
    it('should build request with signature header', () => {
      const request = buildSignedRequest(testPayload, testPartner.apiKeyHash)

      expect(request.headers['X-Fledgely-Signature']).toBeDefined()
      expect(request.headers['X-Fledgely-Signature'].length).toBeGreaterThan(0)
    })

    it('should include timestamp header', () => {
      const request = buildSignedRequest(testPayload, testPartner.apiKeyHash)

      expect(request.headers['X-Fledgely-Timestamp']).toBeDefined()
    })

    it('should set Content-Type to application/json', () => {
      const request = buildSignedRequest(testPayload, testPartner.apiKeyHash)

      expect(request.headers['Content-Type']).toBe('application/json')
    })

    it('should include encrypted body', () => {
      const request = buildSignedRequest(testPayload, testPartner.apiKeyHash)

      expect(request.body).toBeDefined()
      expect(typeof request.body).toBe('string')
    })

    it('should NOT include plaintext payload in request', () => {
      const request = buildSignedRequest(testPayload, testPartner.apiKeyHash)

      // Body should be encrypted, not contain raw signal ID
      // In practice, body would be encrypted; here we check it's not raw JSON
      expect(request.body).not.toContain('"signalId"')
    })

    it('should generate different signatures for different payloads', () => {
      const payload2: SignalRoutingPayload = { ...testPayload, signalId: 'sig_456' }

      const request1 = buildSignedRequest(testPayload, testPartner.apiKeyHash)
      const request2 = buildSignedRequest(payload2, testPartner.apiKeyHash)

      expect(request1.headers['X-Fledgely-Signature']).not.toBe(
        request2.headers['X-Fledgely-Signature']
      )
    })
  })

  // ============================================
  // calculateBackoff Tests
  // ============================================

  describe('calculateBackoff', () => {
    it('should return approximately 1 second for first retry', () => {
      const backoff = calculateBackoff(1)
      // Base is 1000ms, jitter ±50% gives range 500-1500ms
      expect(backoff).toBeGreaterThanOrEqual(500)
      expect(backoff).toBeLessThanOrEqual(1500)
    })

    it('should return approximately 2 seconds for second retry', () => {
      const backoff = calculateBackoff(2)
      // Base is 2000ms, jitter ±50% gives range 1000-3000ms
      expect(backoff).toBeGreaterThanOrEqual(1000)
      expect(backoff).toBeLessThanOrEqual(3000)
    })

    it('should return approximately 4 seconds for third retry', () => {
      const backoff = calculateBackoff(3)
      // Base is 4000ms, jitter ±50% gives range 2000-6000ms
      expect(backoff).toBeGreaterThanOrEqual(2000)
      expect(backoff).toBeLessThanOrEqual(6000)
    })

    it('should cap at maximum backoff', () => {
      const backoff = calculateBackoff(10)

      expect(backoff).toBeLessThanOrEqual(30000) // Max 30 seconds
    })

    it('should add jitter', () => {
      // Run multiple times to verify jitter
      const backoffs = Array.from({ length: 10 }, () => calculateBackoff(1))
      const uniqueValues = new Set(backoffs)

      // Should have some variation due to jitter
      expect(uniqueValues.size).toBeGreaterThan(1)
    })
  })

  // ============================================
  // sendSignalToPartner Tests
  // ============================================

  describe('sendSignalToPartner', () => {
    it('should return success for 200 response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ received: true, referenceId: 'CASE-123' }),
      })

      const result = await sendSignalToPartner(testPartner, testPayload, mockFetch)

      expect(result.success).toBe(true)
      expect(result.partnerRefId).toBe('CASE-123')
    })

    it('should return success for 202 (Accepted) response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 202,
        json: async () => ({ queued: true }),
      })

      const result = await sendSignalToPartner(testPartner, testPayload, mockFetch)

      expect(result.success).toBe(true)
    })

    it('should retry on 5xx error', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Internal Server Error' })
        .mockResolvedValueOnce({ ok: false, status: 503, statusText: 'Service Unavailable' })
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ received: true }) })

      const result = await sendSignalToPartner(testPartner, testPayload, mockFetch)

      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(result.success).toBe(true)
    })

    it('should NOT retry on 4xx error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      })

      const result = await sendSignalToPartner(testPartner, testPayload, mockFetch)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(result.success).toBe(false)
    })

    it('should fail after max retries', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      const result = await sendSignalToPartner(testPartner, testPayload, mockFetch)

      expect(mockFetch).toHaveBeenCalledTimes(MAX_RETRIES)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Max retries')
    })

    it('should handle network error', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const result = await sendSignalToPartner(testPartner, testPayload, mockFetch)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Network error')
    })

    it('should handle timeout', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('timeout'))

      const result = await sendSignalToPartner(testPartner, testPayload, mockFetch)

      expect(result.success).toBe(false)
      expect(result.error).toContain('timeout')
    })

    it('should validate webhook URL before sending', async () => {
      const invalidPartner: CrisisPartner = {
        ...testPartner,
        webhookUrl: 'http://insecure.example.com',
      }

      const mockFetch = vi.fn()

      const result = await sendSignalToPartner(invalidPartner, testPayload, mockFetch)

      expect(result.success).toBe(false)
      expect(result.error).toContain('HTTPS')
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should NOT log payload contents', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ received: true }),
      })

      await sendSignalToPartner(testPartner, testPayload, mockFetch)

      // Verify no calls contain the payload data
      for (const call of consoleSpy.mock.calls) {
        const logContent = JSON.stringify(call)
        expect(logContent).not.toContain(testPayload.signalId)
        expect(logContent).not.toContain('childAge')
      }

      consoleSpy.mockRestore()
    })
  })

  // ============================================
  // checkPartnerHealth Tests
  // ============================================

  describe('checkPartnerHealth', () => {
    it('should return healthy for 200 response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      })

      const result = await checkPartnerHealth(testPartner, mockFetch)

      expect(result.healthy).toBe(true)
    })

    it('should return unhealthy for error response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      })

      const result = await checkPartnerHealth(testPartner, mockFetch)

      expect(result.healthy).toBe(false)
    })

    it('should return unhealthy for network error', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Connection refused'))

      const result = await checkPartnerHealth(testPartner, mockFetch)

      expect(result.healthy).toBe(false)
      expect(result.error).toContain('Connection refused')
    })

    it('should include response time', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      })

      const result = await checkPartnerHealth(testPartner, mockFetch)

      expect(result.responseTimeMs).toBeDefined()
      expect(result.responseTimeMs).toBeGreaterThanOrEqual(0)
    })

    it('should use HEAD request for health check', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      })

      await checkPartnerHealth(testPartner, mockFetch)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'HEAD' })
      )
    })
  })

  // ============================================
  // handlePartnerCallback Tests
  // ============================================

  describe('handlePartnerCallback', () => {
    it('should acknowledge signal receipt', async () => {
      const mockUpdateFn = vi.fn()

      const result = await handlePartnerCallback(
        'sig_123',
        'CASE-456',
        { status: 'received', timestamp: new Date().toISOString() },
        mockUpdateFn
      )

      expect(result.success).toBe(true)
      expect(mockUpdateFn).toHaveBeenCalledWith('sig_123', {
        status: 'acknowledged',
        partnerRefId: 'CASE-456',
      })
    })

    it('should handle intervention_started status', async () => {
      const mockUpdateFn = vi.fn()

      const result = await handlePartnerCallback(
        'sig_123',
        'CASE-456',
        { status: 'intervention_started' },
        mockUpdateFn
      )

      expect(result.success).toBe(true)
    })

    it('should reject invalid callback data', async () => {
      const mockUpdateFn = vi.fn()

      const result = await handlePartnerCallback('sig_123', 'CASE-456', null, mockUpdateFn)

      expect(result.success).toBe(false)
      expect(mockUpdateFn).not.toHaveBeenCalled()
    })

    it('should handle update failure', async () => {
      const mockUpdateFn = vi.fn().mockRejectedValue(new Error('Database error'))

      const result = await handlePartnerCallback(
        'sig_123',
        'CASE-456',
        { status: 'received' },
        mockUpdateFn
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Database error')
    })
  })
})
