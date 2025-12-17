/**
 * SignalRoutingService Tests
 *
 * Story 7.5.2: External Signal Routing - Task 2
 *
 * Tests for signal routing to external crisis partners.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  SignalRoutingService,
  getSignalRoutingService,
  resetSignalRoutingService,
  type SignalRoutingDependencies,
} from '../SignalRoutingService'
import {
  type CrisisPartnerConfig,
  type PartnerRegistry,
  type RouteSignalInput,
  type ExternalSignalPayload,
  EXTERNAL_ROUTING_CONSTANTS,
} from '@fledgely/contracts'

// ============================================================================
// Test Fixtures
// ============================================================================

const mockPartner: CrisisPartnerConfig = {
  partnerId: 'test_partner',
  name: 'Test Crisis Partner',
  description: 'Test partner for unit tests',
  status: 'active',
  webhookUrl: 'https://test-partner.example.com/webhook',
  publicKey: 'MOCK_PUBLIC_KEY_' + 'x'.repeat(150),
  jurisdictions: ['US-CA', 'US-TX'],
  isFallback: false,
  priority: 1,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  keyExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
}

const mockFallbackPartner: CrisisPartnerConfig = {
  ...mockPartner,
  partnerId: 'national_partner',
  name: 'National Crisis Partner',
  jurisdictions: [],
  isFallback: true,
  priority: 100,
}

const mockRegistry: PartnerRegistry = {
  jurisdictionMap: {
    'US-CA': ['test_partner'],
    'US-TX': ['test_partner'],
  },
  fallbackPartners: ['national_partner'],
  lastUpdated: '2024-01-01T00:00:00.000Z',
}

const mockInput: RouteSignalInput = {
  signalId: 'sig_test_123',
  childId: 'child_test_123',
  triggeredAt: '2024-01-15T10:30:00.000Z',
  deviceType: 'web',
  jurisdiction: 'US-CA',
}

// ============================================================================
// Test Helpers
// ============================================================================

function createMockDependencies(): SignalRoutingDependencies {
  return {
    getChildAge: vi.fn().mockResolvedValue(12),
    hasSharedCustody: vi.fn().mockResolvedValue(false),
    getPartnerConfig: vi.fn().mockResolvedValue(mockPartner),
    getPartnerRegistry: vi.fn().mockResolvedValue(mockRegistry),
    getAllPartners: vi.fn().mockResolvedValue([mockPartner, mockFallbackPartner]),
    saveRoutingRecord: vi.fn().mockResolvedValue(undefined),
    updateRoutingRecord: vi.fn().mockResolvedValue(undefined),
    saveBlackout: vi.fn().mockResolvedValue(undefined),
    isBlackoutActive: vi.fn().mockResolvedValue(false),
    sendToPartner: vi.fn().mockResolvedValue({ success: true, reference: 'ref_123' }),
    generateId: vi.fn().mockReturnValue('routing_test_123'),
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('SignalRoutingService', () => {
  let service: SignalRoutingService
  let mockDeps: SignalRoutingDependencies

  beforeEach(() => {
    vi.clearAllMocks()
    resetSignalRoutingService()
    mockDeps = createMockDependencies()
    service = new SignalRoutingService(mockDeps)
  })

  describe('routeSignal', () => {
    it('routes signal successfully to jurisdiction-specific partner', async () => {
      const response = await service.routeSignal(mockInput)

      expect(response.success).toBe(true)
      expect(response.partnerId).toBe('test_partner')
      expect(response.usedFallback).toBe(false)
      expect(response.error).toBeNull()
    })

    it('creates routing record on start', async () => {
      await service.routeSignal(mockInput)

      expect(mockDeps.saveRoutingRecord).toHaveBeenCalledOnce()
      expect(mockDeps.saveRoutingRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          signalId: mockInput.signalId,
          status: 'pending',
        })
      )
    })

    it('updates routing record with partner info', async () => {
      await service.routeSignal(mockInput)

      expect(mockDeps.updateRoutingRecord).toHaveBeenCalledWith(
        'routing_test_123',
        expect.objectContaining({
          partnerId: 'test_partner',
          status: 'encrypting',
        })
      )
    })

    it('updates routing record on success', async () => {
      await service.routeSignal(mockInput)

      expect(mockDeps.updateRoutingRecord).toHaveBeenCalledWith(
        'routing_test_123',
        expect.objectContaining({
          status: 'sent',
          partnerReference: 'ref_123',
        })
      )
    })

    it('starts 48-hour blackout on success', async () => {
      await service.routeSignal(mockInput)

      expect(mockDeps.saveBlackout).toHaveBeenCalledOnce()
      expect(mockDeps.saveBlackout).toHaveBeenCalledWith(
        expect.objectContaining({
          childId: mockInput.childId,
          signalId: mockInput.signalId,
          status: 'active',
        })
      )
    })

    it('uses fallback partner when jurisdiction partner unavailable', async () => {
      const inputWithUnknownJurisdiction: RouteSignalInput = {
        ...mockInput,
        jurisdiction: 'US-NY', // Not in registry
      }

      const response = await service.routeSignal(inputWithUnknownJurisdiction)

      expect(response.success).toBe(true)
      expect(response.partnerId).toBe('national_partner')
      expect(response.usedFallback).toBe(true)
    })

    it('returns error when no partner available', async () => {
      vi.mocked(mockDeps.getAllPartners).mockResolvedValue([])

      const response = await service.routeSignal(mockInput)

      expect(response.success).toBe(false)
      expect(response.error).toContain('No available partner')
    })

    it('returns error when child age unavailable', async () => {
      vi.mocked(mockDeps.getChildAge).mockResolvedValue(null)

      const response = await service.routeSignal(mockInput)

      expect(response.success).toBe(false)
      expect(response.error).toContain('Could not determine child age')
    })

    it('handles send failure gracefully', async () => {
      vi.mocked(mockDeps.sendToPartner).mockResolvedValue({
        success: false,
        error: 'Partner unavailable',
      })

      const response = await service.routeSignal(mockInput)

      expect(response.success).toBe(false)
      expect(response.error).toBe('Partner unavailable')
      expect(mockDeps.updateRoutingRecord).toHaveBeenCalledWith(
        'routing_test_123',
        expect.objectContaining({
          status: 'failed',
          lastError: 'Partner unavailable',
        })
      )
    })

    it('does not start blackout on routing failure', async () => {
      vi.mocked(mockDeps.sendToPartner).mockResolvedValue({
        success: false,
        error: 'Partner unavailable',
      })

      await service.routeSignal(mockInput)

      expect(mockDeps.saveBlackout).not.toHaveBeenCalled()
    })
  })

  describe('Payload Minimization (INV-002)', () => {
    it('sends payload with correct minimal fields', async () => {
      await service.routeSignal(mockInput)

      expect(mockDeps.sendToPartner).toHaveBeenCalledWith(
        'test_partner',
        expect.objectContaining({
          signalId: mockInput.signalId,
          childAge: 12,
          hasSharedCustody: false,
          signalTimestamp: mockInput.triggeredAt,
          jurisdiction: mockInput.jurisdiction,
          devicePlatform: mockInput.deviceType,
        })
      )
    })

    it('includes shared custody flag correctly', async () => {
      vi.mocked(mockDeps.hasSharedCustody).mockResolvedValue(true)

      await service.routeSignal(mockInput)

      expect(mockDeps.sendToPartner).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          hasSharedCustody: true,
        })
      )
    })

    it('sends age from child profile', async () => {
      vi.mocked(mockDeps.getChildAge).mockResolvedValue(15)

      await service.routeSignal(mockInput)

      expect(mockDeps.sendToPartner).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          childAge: 15,
        })
      )
    })

    it('payload does not contain parentId', async () => {
      await service.routeSignal(mockInput)

      const sentPayload = vi.mocked(mockDeps.sendToPartner).mock.calls[0][1] as ExternalSignalPayload
      expect('parentId' in sentPayload).toBe(false)
    })

    it('payload does not contain familyId', async () => {
      await service.routeSignal(mockInput)

      const sentPayload = vi.mocked(mockDeps.sendToPartner).mock.calls[0][1] as ExternalSignalPayload
      expect('familyId' in sentPayload).toBe(false)
    })

    it('payload does not contain childId (uses signalId instead)', async () => {
      await service.routeSignal(mockInput)

      const sentPayload = vi.mocked(mockDeps.sendToPartner).mock.calls[0][1] as ExternalSignalPayload
      expect('childId' in sentPayload).toBe(false)
      expect(sentPayload.signalId).toBe(mockInput.signalId)
    })

    it('payload does not contain screenshots', async () => {
      await service.routeSignal(mockInput)

      const sentPayload = vi.mocked(mockDeps.sendToPartner).mock.calls[0][1] as ExternalSignalPayload
      expect('screenshots' in sentPayload).toBe(false)
      expect('screenshot' in sentPayload).toBe(false)
    })

    it('payload does not contain activity data', async () => {
      await service.routeSignal(mockInput)

      const sentPayload = vi.mocked(mockDeps.sendToPartner).mock.calls[0][1] as ExternalSignalPayload
      expect('activityData' in sentPayload).toBe(false)
      expect('activity' in sentPayload).toBe(false)
      expect('browsingHistory' in sentPayload).toBe(false)
    })
  })

  describe('Jurisdiction Routing', () => {
    it('routes to correct partner for US-CA', async () => {
      const response = await service.routeSignal({
        ...mockInput,
        jurisdiction: 'US-CA',
      })

      expect(response.partnerId).toBe('test_partner')
      expect(response.usedFallback).toBe(false)
    })

    it('routes to correct partner for US-TX', async () => {
      const response = await service.routeSignal({
        ...mockInput,
        jurisdiction: 'US-TX',
      })

      expect(response.partnerId).toBe('test_partner')
      expect(response.usedFallback).toBe(false)
    })

    it('falls back to national partner for unknown jurisdiction', async () => {
      const response = await service.routeSignal({
        ...mockInput,
        jurisdiction: 'UK',
      })

      expect(response.partnerId).toBe('national_partner')
      expect(response.usedFallback).toBe(true)
    })

    it('uses default jurisdiction when not provided', async () => {
      const response = await service.routeSignal({
        ...mockInput,
        jurisdiction: null,
      })

      expect(response.success).toBe(true)
      expect(mockDeps.sendToPartner).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          jurisdiction: EXTERNAL_ROUTING_CONSTANTS.DEFAULT_JURISDICTION,
        })
      )
    })
  })

  describe('isNotificationBlocked', () => {
    it('returns false when no active blackout', async () => {
      vi.mocked(mockDeps.isBlackoutActive).mockResolvedValue(false)

      const blocked = await service.isNotificationBlocked('child_123')

      expect(blocked).toBe(false)
    })

    it('returns true when blackout is active', async () => {
      vi.mocked(mockDeps.isBlackoutActive).mockResolvedValue(true)

      const blocked = await service.isNotificationBlocked('child_123')

      expect(blocked).toBe(true)
    })
  })

  describe('detectJurisdiction', () => {
    it('returns provided jurisdiction when available', async () => {
      const jurisdiction = await service.detectJurisdiction('child_123', 'US-CA')

      expect(jurisdiction).toBe('US-CA')
    })

    it('returns default jurisdiction when not provided', async () => {
      const jurisdiction = await service.detectJurisdiction('child_123', null)

      expect(jurisdiction).toBe(EXTERNAL_ROUTING_CONSTANTS.DEFAULT_JURISDICTION)
    })
  })
})

describe('getSignalRoutingService', () => {
  beforeEach(() => {
    resetSignalRoutingService()
  })

  it('returns singleton instance', () => {
    const instance1 = getSignalRoutingService()
    const instance2 = getSignalRoutingService()

    expect(instance1).toBe(instance2)
  })

  it('returns new instance after reset', () => {
    const instance1 = getSignalRoutingService()
    resetSignalRoutingService()
    const instance2 = getSignalRoutingService()

    expect(instance1).not.toBe(instance2)
  })
})

describe('Blackout Duration', () => {
  let service: SignalRoutingService
  let mockDeps: SignalRoutingDependencies

  beforeEach(() => {
    mockDeps = createMockDependencies()
    service = new SignalRoutingService(mockDeps)
  })

  it('creates blackout with 48-hour duration', async () => {
    await service.routeSignal(mockInput)

    const savedBlackout = vi.mocked(mockDeps.saveBlackout).mock.calls[0][0]
    const startedAt = new Date(savedBlackout.startedAt).getTime()
    const expiresAt = new Date(savedBlackout.expiresAt).getTime()
    const duration = expiresAt - startedAt

    expect(duration).toBe(EXTERNAL_ROUTING_CONSTANTS.DEFAULT_BLACKOUT_MS)
    expect(duration).toBe(48 * 60 * 60 * 1000) // 48 hours in ms
  })
})
