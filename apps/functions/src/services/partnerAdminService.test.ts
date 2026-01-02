/**
 * Partner Admin Service Tests - Story 7.5.2 Task 7
 *
 * TDD tests for administrative management of crisis partners.
 * Only accessible by system administrators.
 *
 * Operations:
 * - Add new crisis partner
 * - Update partner configuration
 * - Deactivate/reactivate partner
 * - List and search partners
 * - Rotate API keys
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  addPartner,
  updatePartner,
  deactivatePartner,
  reactivatePartner,
  rotateApiKey,
  getPartnerDetails,
  listPartners,
  searchPartnersByJurisdiction,
  getPartnerHealthSummary,
  validatePartnerWebhook,
  type PartnerStore,
  type AdminContext,
  type PartnerHealthSummary as _PartnerHealthSummary,
} from './partnerAdminService'
import type { CrisisPartner, PartnerCapability as _PartnerCapability } from '@fledgely/shared'

describe('Partner Admin Service', () => {
  let mockStore: PartnerStore
  let adminContext: AdminContext

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock store
    mockStore = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      getAll: vi.fn(),
      getByJurisdiction: vi.fn(),
    }

    // Admin context with system admin privileges
    adminContext = {
      adminId: 'admin_123',
      role: 'system_admin',
      timestamp: new Date(),
    }
  })

  // ============================================
  // addPartner Tests
  // ============================================

  describe('addPartner', () => {
    it('should add a new partner with valid data', async () => {
      mockStore.set.mockResolvedValue(undefined)

      const partner = await addPartner(
        {
          name: 'Crisis Center A',
          webhookUrl: 'https://crisis.example.com/webhook',
          jurisdictions: ['US', 'US-CA'],
          capabilities: ['crisis_counseling'],
          priority: 0,
        },
        adminContext,
        mockStore
      )

      expect(partner.id).toMatch(/^partner_/)
      expect(partner.name).toBe('Crisis Center A')
      expect(partner.active).toBe(true)
      expect(mockStore.set).toHaveBeenCalled()
    })

    it('should generate a secure API key hash', async () => {
      mockStore.set.mockResolvedValue(undefined)

      const { partner, plainApiKey } = await addPartner(
        {
          name: 'Crisis Center B',
          webhookUrl: 'https://crisis.example.com/webhook',
          jurisdictions: ['US'],
          capabilities: ['crisis_counseling'],
          priority: 0,
        },
        adminContext,
        mockStore,
        { returnApiKey: true }
      )

      expect(plainApiKey).toBeDefined()
      expect(plainApiKey!.length).toBeGreaterThan(20)
      expect(partner.apiKeyHash).not.toBe(plainApiKey)
    })

    it('should reject non-HTTPS webhook URL', async () => {
      await expect(
        addPartner(
          {
            name: 'Bad Partner',
            webhookUrl: 'http://insecure.example.com/webhook',
            jurisdictions: ['US'],
            capabilities: ['crisis_counseling'],
            priority: 0,
          },
          adminContext,
          mockStore
        )
      ).rejects.toThrow('HTTPS')
    })

    it('should reject empty jurisdictions', async () => {
      await expect(
        addPartner(
          {
            name: 'No Jurisdictions',
            webhookUrl: 'https://crisis.example.com/webhook',
            jurisdictions: [],
            capabilities: ['crisis_counseling'],
            priority: 0,
          },
          adminContext,
          mockStore
        )
      ).rejects.toThrow('jurisdiction')
    })

    it('should reject empty capabilities', async () => {
      await expect(
        addPartner(
          {
            name: 'No Capabilities',
            webhookUrl: 'https://crisis.example.com/webhook',
            jurisdictions: ['US'],
            capabilities: [],
            priority: 0,
          },
          adminContext,
          mockStore
        )
      ).rejects.toThrow('capability')
    })

    it('should require system_admin role', async () => {
      const nonAdmin: AdminContext = {
        adminId: 'user_123',
        role: 'support',
        timestamp: new Date(),
      }

      await expect(
        addPartner(
          {
            name: 'Test',
            webhookUrl: 'https://crisis.example.com/webhook',
            jurisdictions: ['US'],
            capabilities: ['crisis_counseling'],
            priority: 0,
          },
          nonAdmin,
          mockStore
        )
      ).rejects.toThrow('Unauthorized')
    })
  })

  // ============================================
  // updatePartner Tests
  // ============================================

  describe('updatePartner', () => {
    const existingPartner: CrisisPartner = {
      id: 'partner_existing',
      name: 'Existing Partner',
      webhookUrl: 'https://crisis.example.com/webhook',
      apiKeyHash: 'hash_123',
      active: true,
      jurisdictions: ['US'],
      priority: 0,
      capabilities: ['crisis_counseling'],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it('should update partner name', async () => {
      mockStore.get.mockResolvedValue(existingPartner)
      mockStore.set.mockResolvedValue(undefined)

      const updated = await updatePartner(
        'partner_existing',
        { name: 'New Name' },
        adminContext,
        mockStore
      )

      expect(updated.name).toBe('New Name')
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
        existingPartner.updatedAt.getTime()
      )
    })

    it('should update partner jurisdictions', async () => {
      mockStore.get.mockResolvedValue(existingPartner)
      mockStore.set.mockResolvedValue(undefined)

      const updated = await updatePartner(
        'partner_existing',
        { jurisdictions: ['US', 'UK'] },
        adminContext,
        mockStore
      )

      expect(updated.jurisdictions).toEqual(['US', 'UK'])
    })

    it('should update partner capabilities', async () => {
      mockStore.get.mockResolvedValue(existingPartner)
      mockStore.set.mockResolvedValue(undefined)

      const updated = await updatePartner(
        'partner_existing',
        { capabilities: ['crisis_counseling', 'mandatory_reporting'] },
        adminContext,
        mockStore
      )

      expect(updated.capabilities).toEqual(['crisis_counseling', 'mandatory_reporting'])
    })

    it('should reject non-existent partner', async () => {
      mockStore.get.mockResolvedValue(null)

      await expect(
        updatePartner('partner_404', { name: 'New Name' }, adminContext, mockStore)
      ).rejects.toThrow('not found')
    })

    it('should validate new webhook URL', async () => {
      mockStore.get.mockResolvedValue(existingPartner)

      await expect(
        updatePartner(
          'partner_existing',
          { webhookUrl: 'http://insecure.example.com' },
          adminContext,
          mockStore
        )
      ).rejects.toThrow('HTTPS')
    })
  })

  // ============================================
  // deactivatePartner Tests
  // ============================================

  describe('deactivatePartner', () => {
    const activePartner: CrisisPartner = {
      id: 'partner_active',
      name: 'Active Partner',
      webhookUrl: 'https://crisis.example.com/webhook',
      apiKeyHash: 'hash_123',
      active: true,
      jurisdictions: ['US'],
      priority: 0,
      capabilities: ['crisis_counseling'],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it('should deactivate an active partner', async () => {
      mockStore.get.mockResolvedValue(activePartner)
      mockStore.set.mockResolvedValue(undefined)

      const deactivated = await deactivatePartner(
        'partner_active',
        'Scheduled maintenance',
        adminContext,
        mockStore
      )

      expect(deactivated.active).toBe(false)
    })

    it('should require a reason for deactivation', async () => {
      mockStore.get.mockResolvedValue(activePartner)

      await expect(
        deactivatePartner('partner_active', '', adminContext, mockStore)
      ).rejects.toThrow('reason')
    })

    it('should reject non-existent partner', async () => {
      mockStore.get.mockResolvedValue(null)

      await expect(
        deactivatePartner('partner_404', 'Reason', adminContext, mockStore)
      ).rejects.toThrow('not found')
    })
  })

  // ============================================
  // reactivatePartner Tests
  // ============================================

  describe('reactivatePartner', () => {
    const inactivePartner: CrisisPartner = {
      id: 'partner_inactive',
      name: 'Inactive Partner',
      webhookUrl: 'https://crisis.example.com/webhook',
      apiKeyHash: 'hash_123',
      active: false,
      jurisdictions: ['US'],
      priority: 0,
      capabilities: ['crisis_counseling'],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it('should reactivate an inactive partner', async () => {
      mockStore.get.mockResolvedValue(inactivePartner)
      mockStore.set.mockResolvedValue(undefined)

      const reactivated = await reactivatePartner('partner_inactive', adminContext, mockStore)

      expect(reactivated.active).toBe(true)
    })

    it('should reject already active partner', async () => {
      const activePartner = { ...inactivePartner, active: true }
      mockStore.get.mockResolvedValue(activePartner)

      await expect(reactivatePartner('partner_inactive', adminContext, mockStore)).rejects.toThrow(
        'already active'
      )
    })
  })

  // ============================================
  // rotateApiKey Tests
  // ============================================

  describe('rotateApiKey', () => {
    const existingPartner: CrisisPartner = {
      id: 'partner_key',
      name: 'Key Partner',
      webhookUrl: 'https://crisis.example.com/webhook',
      apiKeyHash: 'old_hash_123',
      active: true,
      jurisdictions: ['US'],
      priority: 0,
      capabilities: ['crisis_counseling'],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it('should generate new API key', async () => {
      mockStore.get.mockResolvedValue(existingPartner)
      mockStore.set.mockResolvedValue(undefined)

      const { partner, newApiKey } = await rotateApiKey('partner_key', adminContext, mockStore)

      expect(newApiKey).toBeDefined()
      expect(newApiKey.length).toBeGreaterThan(20)
      expect(partner.apiKeyHash).not.toBe(existingPartner.apiKeyHash)
    })

    it('should reject non-existent partner', async () => {
      mockStore.get.mockResolvedValue(null)

      await expect(rotateApiKey('partner_404', adminContext, mockStore)).rejects.toThrow(
        'not found'
      )
    })
  })

  // ============================================
  // getPartnerDetails Tests
  // ============================================

  describe('getPartnerDetails', () => {
    const partner: CrisisPartner = {
      id: 'partner_detail',
      name: 'Detail Partner',
      webhookUrl: 'https://crisis.example.com/webhook',
      apiKeyHash: 'hash_123',
      active: true,
      jurisdictions: ['US', 'UK'],
      priority: 1,
      capabilities: ['crisis_counseling'],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it('should return partner details', async () => {
      mockStore.get.mockResolvedValue(partner)

      const details = await getPartnerDetails('partner_detail', adminContext, mockStore)

      expect(details.id).toBe('partner_detail')
      expect(details.name).toBe('Detail Partner')
    })

    it('should NOT include plain API key', async () => {
      mockStore.get.mockResolvedValue(partner)

      const details = await getPartnerDetails('partner_detail', adminContext, mockStore)

      expect(details.apiKeyHash).toBeDefined()
      expect((details as Record<string, unknown>).plainApiKey).toBeUndefined()
    })

    it('should reject non-existent partner', async () => {
      mockStore.get.mockResolvedValue(null)

      await expect(getPartnerDetails('partner_404', adminContext, mockStore)).rejects.toThrow(
        'not found'
      )
    })
  })

  // ============================================
  // listPartners Tests
  // ============================================

  describe('listPartners', () => {
    const partners: CrisisPartner[] = [
      {
        id: 'partner_1',
        name: 'Partner A',
        webhookUrl: 'https://a.example.com/webhook',
        apiKeyHash: 'hash_a',
        active: true,
        jurisdictions: ['US'],
        priority: 0,
        capabilities: ['crisis_counseling'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'partner_2',
        name: 'Partner B',
        webhookUrl: 'https://b.example.com/webhook',
        apiKeyHash: 'hash_b',
        active: false,
        jurisdictions: ['UK'],
        priority: 1,
        capabilities: ['mandatory_reporting'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    it('should list all partners', async () => {
      mockStore.getAll.mockResolvedValue(partners)

      const list = await listPartners(adminContext, mockStore)

      expect(list).toHaveLength(2)
    })

    it('should filter by active status', async () => {
      mockStore.getAll.mockResolvedValue(partners)

      const activeOnly = await listPartners(adminContext, mockStore, { activeOnly: true })

      expect(activeOnly).toHaveLength(1)
      expect(activeOnly[0].name).toBe('Partner A')
    })

    it('should sort by priority', async () => {
      mockStore.getAll.mockResolvedValue(partners)

      const sorted = await listPartners(adminContext, mockStore, { sortBy: 'priority' })

      expect(sorted[0].priority).toBe(0)
    })
  })

  // ============================================
  // searchPartnersByJurisdiction Tests
  // ============================================

  describe('searchPartnersByJurisdiction', () => {
    const partners: CrisisPartner[] = [
      {
        id: 'partner_us',
        name: 'US Partner',
        webhookUrl: 'https://us.example.com/webhook',
        apiKeyHash: 'hash_us',
        active: true,
        jurisdictions: ['US', 'US-CA'],
        priority: 0,
        capabilities: ['crisis_counseling'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'partner_uk',
        name: 'UK Partner',
        webhookUrl: 'https://uk.example.com/webhook',
        apiKeyHash: 'hash_uk',
        active: true,
        jurisdictions: ['UK'],
        priority: 0,
        capabilities: ['crisis_counseling'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    it('should find partners by jurisdiction', async () => {
      mockStore.getByJurisdiction.mockResolvedValue([partners[0]])

      const result = await searchPartnersByJurisdiction('US', adminContext, mockStore)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('US Partner')
    })

    it('should find partners by state jurisdiction', async () => {
      mockStore.getByJurisdiction.mockResolvedValue([partners[0]])

      const result = await searchPartnersByJurisdiction('US-CA', adminContext, mockStore)

      expect(result).toHaveLength(1)
    })

    it('should return empty for no matches', async () => {
      mockStore.getByJurisdiction.mockResolvedValue([])

      const result = await searchPartnersByJurisdiction('AU', adminContext, mockStore)

      expect(result).toHaveLength(0)
    })
  })

  // ============================================
  // getPartnerHealthSummary Tests
  // ============================================

  describe('getPartnerHealthSummary', () => {
    const partner: CrisisPartner = {
      id: 'partner_health',
      name: 'Health Partner',
      webhookUrl: 'https://health.example.com/webhook',
      apiKeyHash: 'hash_health',
      active: true,
      jurisdictions: ['US'],
      priority: 0,
      capabilities: ['crisis_counseling'],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it('should return health summary for partner', async () => {
      mockStore.get.mockResolvedValue(partner)

      const healthCheck = vi.fn().mockResolvedValue({
        healthy: true,
        responseTimeMs: 150,
      })

      const summary = await getPartnerHealthSummary(
        'partner_health',
        adminContext,
        mockStore,
        healthCheck
      )

      expect(summary.partnerId).toBe('partner_health')
      expect(summary.healthy).toBe(true)
      expect(summary.responseTimeMs).toBe(150)
    })

    it('should handle unhealthy partner', async () => {
      mockStore.get.mockResolvedValue(partner)

      const healthCheck = vi.fn().mockResolvedValue({
        healthy: false,
        error: 'Connection refused',
      })

      const summary = await getPartnerHealthSummary(
        'partner_health',
        adminContext,
        mockStore,
        healthCheck
      )

      expect(summary.healthy).toBe(false)
      expect(summary.error).toBe('Connection refused')
    })
  })

  // ============================================
  // validatePartnerWebhook Tests
  // ============================================

  describe('validatePartnerWebhook', () => {
    it('should validate HTTPS URL', async () => {
      const result = await validatePartnerWebhook('https://crisis.example.com/webhook')

      expect(result.valid).toBe(true)
    })

    it('should reject HTTP URL', async () => {
      const result = await validatePartnerWebhook('http://crisis.example.com/webhook')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('HTTPS')
    })

    it('should reject invalid URL', async () => {
      const result = await validatePartnerWebhook('not-a-url')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid')
    })

    it('should reject localhost in production', async () => {
      const result = await validatePartnerWebhook('https://localhost/webhook', {
        allowLocalhost: false,
      })

      expect(result.valid).toBe(false)
      expect(result.error).toContain('localhost')
    })

    it('should allow localhost in development', async () => {
      const result = await validatePartnerWebhook('https://localhost/webhook', {
        allowLocalhost: true,
      })

      expect(result.valid).toBe(true)
    })
  })
})
