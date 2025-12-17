/**
 * CrisisPartnerAdapter Tests
 *
 * Story 7.5.2: External Signal Routing - Task 3
 *
 * Tests for crisis partner adapters including webhook delivery and mock adapter.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  WebhookPartnerAdapter,
  MockPartnerAdapter,
  createWebhookAdapter,
  createMockAdapter,
  getPartnerAdapter,
  createMockEncryptionService,
  type WebhookAdapterConfig,
} from '../CrisisPartnerAdapter'
import {
  type ExternalSignalPayload,
  type CrisisPartnerConfig,
} from '@fledgely/contracts'

// ============================================================================
// Test Fixtures
// ============================================================================

const mockPayload: ExternalSignalPayload = {
  signalId: 'sig_test_123456789012345',  // Long enough for signalRef to be different
  childAge: 12,
  hasSharedCustody: true,
  signalTimestamp: '2024-01-15T10:30:00.000Z',
  jurisdiction: 'US-CA',
  devicePlatform: 'web',
}

const mockPartner: CrisisPartnerConfig = {
  partnerId: 'test_partner',
  name: 'Test Crisis Partner',
  description: 'Test partner',
  status: 'active',
  webhookUrl: 'https://test-partner.example.com/webhook',
  publicKey: 'MOCK_PUBLIC_KEY_' + 'x'.repeat(150),
  jurisdictions: ['US-CA'],
  isFallback: false,
  priority: 1,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  keyExpiresAt: null,
}

// ============================================================================
// Mock Encryption Service Tests
// ============================================================================

describe('createMockEncryptionService', () => {
  it('creates encrypted package with required fields', async () => {
    const encryptionService = createMockEncryptionService()
    const result = await encryptionService.encryptForPartner(mockPayload, mockPartner)

    expect(result.encryptedKey).toBeDefined()
    expect(result.encryptedKey.length).toBeGreaterThanOrEqual(100)
    expect(result.encryptedPayload).toBeDefined()
    expect(result.iv).toBeDefined()
    expect(result.keyAlgorithm).toBe('RSA-OAEP')
    expect(result.payloadAlgorithm).toBe('AES-GCM')
    expect(result.partnerId).toBe(mockPartner.partnerId)
    expect(result.publicKeyHash).toHaveLength(64)
  })

  it('encodes payload in base64', async () => {
    const encryptionService = createMockEncryptionService()
    const result = await encryptionService.encryptForPartner(mockPayload, mockPartner)

    // Should be valid base64
    expect(() => atob(result.encryptedPayload)).not.toThrow()
  })
})

// ============================================================================
// WebhookPartnerAdapter Tests
// ============================================================================

describe('WebhookPartnerAdapter', () => {
  let adapter: WebhookPartnerAdapter
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
  })

  const createAdapter = (overrides?: Partial<WebhookAdapterConfig>): WebhookPartnerAdapter => {
    return new WebhookPartnerAdapter({
      instanceId: 'test_instance',
      maxRetries: 3,
      retryDelayMs: 10, // Short delay for tests
      timeoutMs: 5000,
      fetchImpl: mockFetch,
      ...overrides,
    })
  }

  describe('send', () => {
    it('sends encrypted payload to partner webhook', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ received: true, reference: 'partner_ref_123' }),
      })

      adapter = createAdapter()
      const result = await adapter.send(mockPayload, mockPartner)

      expect(result.success).toBe(true)
      expect(result.reference).toBe('partner_ref_123')
      expect(mockFetch).toHaveBeenCalledOnce()

      // Verify webhook URL
      expect(mockFetch).toHaveBeenCalledWith(
        mockPartner.webhookUrl,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Fledgely-Version': '1.0',
            'X-Fledgely-Instance': 'test_instance',
          }),
        })
      )
    })

    it('includes encrypted package in request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ received: true }),
      })

      adapter = createAdapter()
      await adapter.send(mockPayload, mockPartner)

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1].body)

      expect(body.version).toBe('1.0')
      expect(body.instanceId).toBe('test_instance')
      expect(body.package).toBeDefined()
      expect(body.package.encryptedPayload).toBeDefined()
      expect(body.package.keyAlgorithm).toBe('RSA-OAEP')
      expect(body.deliveredAt).toBeDefined()
      expect(body.signalRef).toBeDefined()
    })

    it('returns success result with response time', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ received: true }),
      })

      adapter = createAdapter()
      const result = await adapter.send(mockPayload, mockPartner)

      expect(result.success).toBe(true)
      expect(result.responseTimeMs).toBeGreaterThanOrEqual(0)
      expect(result.attempts).toBe(1)
      expect(result.error).toBeNull()
    })

    it('retries on server error', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Server error'))
        .mockRejectedValueOnce(new Error('Server error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ received: true }),
        })

      adapter = createAdapter()
      const result = await adapter.send(mockPayload, mockPartner)

      expect(result.success).toBe(true)
      expect(result.attempts).toBe(3)
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('returns failure after max retries', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      adapter = createAdapter({ maxRetries: 2, retryDelayMs: 1 })
      const result = await adapter.send(mockPayload, mockPartner)

      expect(result.success).toBe(false)
      expect(result.attempts).toBe(2)
      expect(result.error).toBe('Network error')
    })

    it('does not retry on client error (4xx)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
      })

      adapter = createAdapter()
      const result = await adapter.send(mockPayload, mockPartner)

      expect(result.success).toBe(false)
      expect(mockFetch).toHaveBeenCalledTimes(1) // No retries
    })

    it('handles partner rejection response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          received: false,
          error: 'Invalid signal format',
        }),
      })

      adapter = createAdapter()
      const result = await adapter.send(mockPayload, mockPartner)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid signal format')
    })
  })

  describe('healthCheck', () => {
    it('returns true for successful HEAD request', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })

      adapter = createAdapter()
      const result = await adapter.healthCheck(mockPartner)

      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        mockPartner.webhookUrl,
        expect.objectContaining({ method: 'HEAD' })
      )
    })

    it('returns false for failed HEAD request', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 503 })

      adapter = createAdapter()
      const result = await adapter.healthCheck(mockPartner)

      expect(result).toBe(false)
    })

    it('returns false on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      adapter = createAdapter()
      const result = await adapter.healthCheck(mockPartner)

      expect(result).toBe(false)
    })
  })
})

// ============================================================================
// MockPartnerAdapter Tests
// ============================================================================

describe('MockPartnerAdapter', () => {
  let adapter: MockPartnerAdapter

  beforeEach(() => {
    adapter = new MockPartnerAdapter()
  })

  describe('send', () => {
    it('returns success by default', async () => {
      const result = await adapter.send(mockPayload, mockPartner)

      expect(result.success).toBe(true)
      expect(result.reference).toContain('mock_ref_')
      expect(result.statusCode).toBe(200)
      expect(result.error).toBeNull()
    })

    it('records deliveries', async () => {
      await adapter.send(mockPayload, mockPartner)

      const deliveries = adapter.getDeliveries()
      expect(deliveries).toHaveLength(1)
      expect(deliveries[0].payload).toEqual(mockPayload)
      expect(deliveries[0].partner).toEqual(mockPartner)
    })

    it('can be configured to fail', async () => {
      adapter.setFailure(true, 'Partner unavailable')

      const result = await adapter.send(mockPayload, mockPartner)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Partner unavailable')
      expect(result.statusCode).toBe(500)
    })

    it('clears deliveries', async () => {
      await adapter.send(mockPayload, mockPartner)
      expect(adapter.getDeliveries()).toHaveLength(1)

      adapter.clearDeliveries()
      expect(adapter.getDeliveries()).toHaveLength(0)
    })

    it('respects configured delay', async () => {
      adapter.setDeliveryDelay(50)

      const startTime = Date.now()
      await adapter.send(mockPayload, mockPartner)
      const duration = Date.now() - startTime

      expect(duration).toBeGreaterThanOrEqual(45) // Allow small variance
    })
  })

  describe('healthCheck', () => {
    it('returns true by default', async () => {
      const result = await adapter.healthCheck(mockPartner)
      expect(result).toBe(true)
    })

    it('returns false when configured to fail', async () => {
      adapter.setFailure(true)
      const result = await adapter.healthCheck(mockPartner)
      expect(result).toBe(false)
    })
  })
})

// ============================================================================
// Factory Function Tests
// ============================================================================

describe('createWebhookAdapter', () => {
  it('creates WebhookPartnerAdapter', () => {
    const adapter = createWebhookAdapter({
      instanceId: 'test_instance',
    })

    expect(adapter).toBeInstanceOf(WebhookPartnerAdapter)
    expect(adapter.adapterId).toBe('webhook')
  })
})

describe('createMockAdapter', () => {
  it('creates MockPartnerAdapter', () => {
    const adapter = createMockAdapter()

    expect(adapter).toBeInstanceOf(MockPartnerAdapter)
    expect(adapter.adapterId).toBe('mock')
  })
})

describe('getPartnerAdapter', () => {
  it('returns webhook adapter with config', () => {
    const adapter = getPartnerAdapter('webhook', { instanceId: 'test' })
    expect(adapter.adapterId).toBe('webhook')
  })

  it('returns mock adapter without config', () => {
    const adapter = getPartnerAdapter('mock')
    expect(adapter.adapterId).toBe('mock')
  })

  it('throws for webhook adapter without config', () => {
    expect(() => getPartnerAdapter('webhook')).toThrow('WebhookAdapterConfig required')
  })

  it('throws for unknown adapter type', () => {
    expect(() => getPartnerAdapter('unknown' as any)).toThrow('Unknown adapter type')
  })
})

// ============================================================================
// Payload Security Tests (INV-002)
// ============================================================================

describe('Payload Security', () => {
  it('sends only minimal payload fields', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ received: true }),
    })

    const adapter = new WebhookPartnerAdapter({
      instanceId: 'test',
      fetchImpl: mockFetch,
    })

    await adapter.send(mockPayload, mockPartner)

    // Get the encrypted package from the request body
    const callArgs = mockFetch.mock.calls[0]
    const body = JSON.parse(callArgs[1].body)

    // Payload is encrypted, so we can't check the raw contents
    // But we verify the structure is correct
    expect(body.package.encryptedPayload).toBeDefined()
    expect(body.package.keyAlgorithm).toBe('RSA-OAEP')
    expect(body.package.payloadAlgorithm).toBe('AES-GCM')

    // signalRef should be shortened, not the full signalId
    expect(body.signalRef).not.toBe(mockPayload.signalId)
    expect(body.signalRef.length).toBeLessThanOrEqual(12)
  })

  it('does not expose raw payload in request', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ received: true }),
    })

    const adapter = new WebhookPartnerAdapter({
      instanceId: 'test',
      fetchImpl: mockFetch,
    })

    await adapter.send(mockPayload, mockPartner)

    const callArgs = mockFetch.mock.calls[0]
    const bodyString = callArgs[1].body

    // Raw payload fields should not appear in request body
    // (they should be encrypted)
    expect(bodyString).not.toContain('"childAge":12')
    expect(bodyString).not.toContain('"jurisdiction":"US-CA"')
  })
})
