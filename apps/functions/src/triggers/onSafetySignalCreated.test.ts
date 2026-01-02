/**
 * Safety Signal Created Trigger Tests - Story 7.5.2 Task 3
 *
 * TDD tests for Firestore trigger on signal creation.
 * AC1: Signal routes to external crisis partnership
 * AC4: Signal is encrypted
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  processSafetySignalCreated,
  buildSignalRoutingContext,
  validateSignalForRouting,
  type SignalRoutingContext,
  type SafetySignalData,
  type ChildProfileData,
  type FamilyData,
} from './onSafetySignalCreated'

// Mock firebase admin
vi.mock('firebase-admin', () => ({
  initializeApp: vi.fn(),
  firestore: vi.fn(() => ({
    collection: vi.fn(),
    doc: vi.fn(),
  })),
}))

// Mock logger
vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}))

describe('Safety Signal Created Trigger', () => {
  let mockSignalData: SafetySignalData
  let mockChildProfile: ChildProfileData
  let mockFamilyData: FamilyData

  beforeEach(() => {
    vi.clearAllMocks()

    // Create mock data for each test
    mockSignalData = {
      id: 'sig_123',
      childId: 'child_456',
      familyId: 'family_789',
      triggeredAt: new Date(),
      status: 'pending',
      triggerMethod: 'logo_tap',
      platform: 'web',
      deviceId: 'device_abc',
      offlineQueued: false,
      deliveredAt: null,
    }

    mockChildProfile = {
      birthDate: new Date('2012-06-15'),
      familyStructure: 'two_parent',
    }

    mockFamilyData = {
      jurisdiction: 'US-CA',
    }
  })

  // ============================================
  // validateSignalForRouting Tests
  // ============================================

  describe('validateSignalForRouting', () => {
    it('should validate a valid signal', () => {
      const result = validateSignalForRouting(mockSignalData)

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject signal without childId', () => {
      const invalid = { ...mockSignalData, childId: '' }

      const result = validateSignalForRouting(invalid)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('childId')
    })

    it('should reject signal without familyId', () => {
      const invalid = { ...mockSignalData, familyId: '' }

      const result = validateSignalForRouting(invalid)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('familyId')
    })

    it('should reject signal without triggeredAt', () => {
      const invalid = { ...mockSignalData, triggeredAt: null }

      const result = validateSignalForRouting(invalid as unknown as SafetySignalData)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('triggeredAt')
    })

    it('should accept signal with queued status', () => {
      const queued = { ...mockSignalData, status: 'queued' as const }

      const result = validateSignalForRouting(queued)

      expect(result.valid).toBe(true)
    })

    it('should reject already-routed signal', () => {
      const routed = { ...mockSignalData, status: 'sent' as const }

      const result = validateSignalForRouting(routed)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('already routed')
    })

    it('should reject acknowledged signal', () => {
      const acknowledged = { ...mockSignalData, status: 'acknowledged' as const }

      const result = validateSignalForRouting(acknowledged)

      expect(result.valid).toBe(false)
    })
  })

  // ============================================
  // buildSignalRoutingContext Tests
  // ============================================

  describe('buildSignalRoutingContext', () => {
    it('should build valid routing context', () => {
      const context = buildSignalRoutingContext(mockSignalData, mockChildProfile, mockFamilyData)

      expect(context.signalId).toBe('sig_123')
      expect(context.childId).toBe('child_456')
      expect(context.familyId).toBe('family_789')
      expect(context.jurisdiction).toBe('US-CA')
      expect(context.familyStructure).toBe('two_parent')
      expect(context.platform).toBe('web')
      expect(context.triggerMethod).toBe('logo_tap')
    })

    it('should calculate child age correctly', () => {
      // Child born in 2012, so ~12-13 years old in 2025
      const context = buildSignalRoutingContext(mockSignalData, mockChildProfile, mockFamilyData)

      expect(context.childAge).toBeGreaterThanOrEqual(12)
      expect(context.childAge).toBeLessThanOrEqual(14)
    })

    it('should include deviceId when available', () => {
      const context = buildSignalRoutingContext(mockSignalData, mockChildProfile, mockFamilyData)

      expect(context.deviceId).toBe('device_abc')
    })

    it('should handle null deviceId', () => {
      const noDevice = { ...mockSignalData, deviceId: null }

      const context = buildSignalRoutingContext(noDevice, mockChildProfile, mockFamilyData)

      expect(context.deviceId).toBeNull()
    })

    it('should handle shared custody family structure', () => {
      const sharedCustody = { ...mockChildProfile, familyStructure: 'shared_custody' as const }

      const context = buildSignalRoutingContext(mockSignalData, sharedCustody, mockFamilyData)

      expect(context.familyStructure).toBe('shared_custody')
    })

    it('should NOT include parent information', () => {
      const context = buildSignalRoutingContext(mockSignalData, mockChildProfile, mockFamilyData)

      expect((context as Record<string, unknown>).parentName).toBeUndefined()
      expect((context as Record<string, unknown>).parentEmail).toBeUndefined()
      expect((context as Record<string, unknown>).parentPhone).toBeUndefined()
    })

    it('should NOT include screenshots', () => {
      const context = buildSignalRoutingContext(mockSignalData, mockChildProfile, mockFamilyData)

      expect((context as Record<string, unknown>).screenshots).toBeUndefined()
    })

    it('should NOT include activity data', () => {
      const context = buildSignalRoutingContext(mockSignalData, mockChildProfile, mockFamilyData)

      expect((context as Record<string, unknown>).activityData).toBeUndefined()
      expect((context as Record<string, unknown>).browsingHistory).toBeUndefined()
    })
  })

  // ============================================
  // processSafetySignalCreated Tests
  // ============================================

  describe('processSafetySignalCreated', () => {
    const mockGetChildProfile = vi.fn()
    const mockGetFamilyData = vi.fn()
    const mockQueueRouting = vi.fn()
    const mockUpdateSignalStatus = vi.fn()
    const mockStartBlackout = vi.fn()

    beforeEach(() => {
      mockGetChildProfile.mockResolvedValue(mockChildProfile)
      mockGetFamilyData.mockResolvedValue(mockFamilyData)
      mockQueueRouting.mockResolvedValue({ success: true, routingId: 'route_123' })
      mockUpdateSignalStatus.mockResolvedValue(undefined)
      mockStartBlackout.mockResolvedValue(undefined)
    })

    it('should process a valid signal', async () => {
      const result = await processSafetySignalCreated(mockSignalData, {
        getChildProfile: mockGetChildProfile,
        getFamilyData: mockGetFamilyData,
        queueRouting: mockQueueRouting,
        updateSignalStatus: mockUpdateSignalStatus,
        startBlackout: mockStartBlackout,
      })

      expect(result.success).toBe(true)
      expect(result.routingId).toBe('route_123')
    })

    it('should fetch child profile', async () => {
      await processSafetySignalCreated(mockSignalData, {
        getChildProfile: mockGetChildProfile,
        getFamilyData: mockGetFamilyData,
        queueRouting: mockQueueRouting,
        updateSignalStatus: mockUpdateSignalStatus,
        startBlackout: mockStartBlackout,
      })

      expect(mockGetChildProfile).toHaveBeenCalledWith('child_456')
    })

    it('should fetch family data', async () => {
      await processSafetySignalCreated(mockSignalData, {
        getChildProfile: mockGetChildProfile,
        getFamilyData: mockGetFamilyData,
        queueRouting: mockQueueRouting,
        updateSignalStatus: mockUpdateSignalStatus,
        startBlackout: mockStartBlackout,
      })

      expect(mockGetFamilyData).toHaveBeenCalledWith('family_789')
    })

    it('should queue routing with correct context', async () => {
      await processSafetySignalCreated(mockSignalData, {
        getChildProfile: mockGetChildProfile,
        getFamilyData: mockGetFamilyData,
        queueRouting: mockQueueRouting,
        updateSignalStatus: mockUpdateSignalStatus,
        startBlackout: mockStartBlackout,
      })

      expect(mockQueueRouting).toHaveBeenCalled()
      const context: SignalRoutingContext = mockQueueRouting.mock.calls[0][0]
      expect(context.signalId).toBe('sig_123')
      expect(context.jurisdiction).toBe('US-CA')
    })

    it('should update signal status to sent', async () => {
      await processSafetySignalCreated(mockSignalData, {
        getChildProfile: mockGetChildProfile,
        getFamilyData: mockGetFamilyData,
        queueRouting: mockQueueRouting,
        updateSignalStatus: mockUpdateSignalStatus,
        startBlackout: mockStartBlackout,
      })

      expect(mockUpdateSignalStatus).toHaveBeenCalledWith('sig_123', 'sent')
    })

    it('should start 48-hour blackout period', async () => {
      await processSafetySignalCreated(mockSignalData, {
        getChildProfile: mockGetChildProfile,
        getFamilyData: mockGetFamilyData,
        queueRouting: mockQueueRouting,
        updateSignalStatus: mockUpdateSignalStatus,
        startBlackout: mockStartBlackout,
      })

      expect(mockStartBlackout).toHaveBeenCalledWith('sig_123', 48)
    })

    it('should skip already-routed signals', async () => {
      const routed = { ...mockSignalData, status: 'sent' as const }

      const result = await processSafetySignalCreated(routed, {
        getChildProfile: mockGetChildProfile,
        getFamilyData: mockGetFamilyData,
        queueRouting: mockQueueRouting,
        updateSignalStatus: mockUpdateSignalStatus,
        startBlackout: mockStartBlackout,
      })

      expect(result.success).toBe(false)
      expect(result.skipped).toBe(true)
      expect(mockQueueRouting).not.toHaveBeenCalled()
    })

    it('should handle child profile fetch failure', async () => {
      mockGetChildProfile.mockRejectedValue(new Error('Child not found'))

      const result = await processSafetySignalCreated(mockSignalData, {
        getChildProfile: mockGetChildProfile,
        getFamilyData: mockGetFamilyData,
        queueRouting: mockQueueRouting,
        updateSignalStatus: mockUpdateSignalStatus,
        startBlackout: mockStartBlackout,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Child not found')
    })

    it('should handle family data fetch failure', async () => {
      mockGetFamilyData.mockRejectedValue(new Error('Family not found'))

      const result = await processSafetySignalCreated(mockSignalData, {
        getChildProfile: mockGetChildProfile,
        getFamilyData: mockGetFamilyData,
        queueRouting: mockQueueRouting,
        updateSignalStatus: mockUpdateSignalStatus,
        startBlackout: mockStartBlackout,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Family not found')
    })

    it('should handle routing queue failure', async () => {
      mockQueueRouting.mockResolvedValue({ success: false, error: 'No partner available' })

      const result = await processSafetySignalCreated(mockSignalData, {
        getChildProfile: mockGetChildProfile,
        getFamilyData: mockGetFamilyData,
        queueRouting: mockQueueRouting,
        updateSignalStatus: mockUpdateSignalStatus,
        startBlackout: mockStartBlackout,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('No partner available')
    })
  })
})
