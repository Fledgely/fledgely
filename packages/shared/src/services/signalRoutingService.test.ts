/**
 * Signal Routing Service Tests - Story 7.5.2 Task 2
 *
 * TDD tests for routing safety signals to external crisis partners.
 * AC1: Signal routes to external crisis partnership
 * AC2: Signal includes appropriate metadata
 * AC3: Signal excludes sensitive data
 * AC6: Jurisdiction-appropriate routing
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  // Service functions
  buildRoutingPayload,
  selectPartnerForJurisdiction,
  routeSignalToPartner,
  getPartnerById,
  getActivePartners,
  getPartnersForJurisdiction,
  updateRoutingResult,
  getRoutingResult,
  getRoutingHistory,
  markRoutingAcknowledged,
  markRoutingFailed,
  // Storage functions (for testing)
  clearAllRoutingData,
  addPartnerToStore,
  getRoutingResultCount,
  getPartnerCount,
} from './signalRoutingService'
import {
  createCrisisPartner,
  ROUTING_STATUS,
  FAMILY_STRUCTURE,
  type CrisisPartner,
  type FamilyStructure,
} from '../contracts/crisisPartner'
import {
  createSafetySignal,
  TRIGGER_METHOD,
  SIGNAL_PLATFORM,
  type SafetySignal,
} from '../contracts/safetySignal'

describe('Signal Routing Service', () => {
  // Create test data
  let testPartnerUS: CrisisPartner
  let testPartnerUK: CrisisPartner
  let testPartnerUSCA: CrisisPartner
  let testSignal: SafetySignal

  beforeEach(() => {
    // Clear all data between tests
    clearAllRoutingData()

    // Create test partners
    testPartnerUS = createCrisisPartner(
      'US Crisis Center',
      'https://us-crisis.example.com/webhook',
      'hashed_key_us',
      ['US'],
      ['crisis_counseling', 'mandatory_reporting'],
      1
    )

    testPartnerUK = createCrisisPartner(
      'UK Crisis Center',
      'https://uk-crisis.example.com/webhook',
      'hashed_key_uk',
      ['UK'],
      ['crisis_counseling'],
      1
    )

    testPartnerUSCA = createCrisisPartner(
      'California Crisis Center',
      'https://ca-crisis.example.com/webhook',
      'hashed_key_ca',
      ['US-CA'],
      ['crisis_counseling', 'safe_adult_notification'],
      0 // Higher priority than US national
    )

    // Add partners to store
    addPartnerToStore(testPartnerUS)
    addPartnerToStore(testPartnerUK)
    addPartnerToStore(testPartnerUSCA)

    // Create test signal
    testSignal = createSafetySignal(
      'child_123',
      'family_456',
      TRIGGER_METHOD.LOGO_TAP,
      SIGNAL_PLATFORM.WEB,
      false,
      'device_789'
    )
  })

  // ============================================
  // buildRoutingPayload Tests (AC2, AC3)
  // ============================================

  describe('buildRoutingPayload', () => {
    it('should build a valid routing payload', () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 12) // 12 years old

      const payload = buildRoutingPayload(
        testSignal,
        birthDate,
        FAMILY_STRUCTURE.TWO_PARENT,
        'US-CA'
      )

      expect(payload.signalId).toBe(testSignal.id)
      expect(payload.childAge).toBe(12)
      expect(payload.familyStructure).toBe('two_parent')
      expect(payload.jurisdiction).toBe('US-CA')
      expect(payload.platform).toBe('web')
      expect(payload.triggerMethod).toBe('logo_tap')
    })

    it('should include deviceId when available', () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 10)

      const payload = buildRoutingPayload(
        testSignal,
        birthDate,
        FAMILY_STRUCTURE.SINGLE_PARENT,
        'UK'
      )

      expect(payload.deviceId).toBe('device_789')
    })

    it('should handle null deviceId', () => {
      const signalNoDevice = createSafetySignal(
        'child_123',
        'family_456',
        TRIGGER_METHOD.KEYBOARD_SHORTCUT,
        SIGNAL_PLATFORM.CHROME_EXTENSION,
        false,
        null
      )

      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 15)

      const payload = buildRoutingPayload(
        signalNoDevice,
        birthDate,
        FAMILY_STRUCTURE.SHARED_CUSTODY,
        'US-NY'
      )

      expect(payload.deviceId).toBeNull()
    })

    it('should NOT include parentInfo in payload', () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 8)

      const payload = buildRoutingPayload(testSignal, birthDate, FAMILY_STRUCTURE.TWO_PARENT, 'US')

      // Verify no parent info exists
      expect((payload as Record<string, unknown>).parentInfo).toBeUndefined()
      expect((payload as Record<string, unknown>).parentName).toBeUndefined()
      expect((payload as Record<string, unknown>).parentEmail).toBeUndefined()
      expect((payload as Record<string, unknown>).parentPhone).toBeUndefined()
    })

    it('should NOT include screenshots in payload', () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 10)

      const payload = buildRoutingPayload(testSignal, birthDate, FAMILY_STRUCTURE.CAREGIVER, 'AU')

      expect((payload as Record<string, unknown>).screenshots).toBeUndefined()
    })

    it('should NOT include activityData in payload', () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 14)

      const payload = buildRoutingPayload(
        testSignal,
        birthDate,
        FAMILY_STRUCTURE.TWO_PARENT,
        'US-CA'
      )

      expect((payload as Record<string, unknown>).activityData).toBeUndefined()
    })

    it('should NOT include browsingHistory in payload', () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 11)

      const payload = buildRoutingPayload(
        testSignal,
        birthDate,
        FAMILY_STRUCTURE.SINGLE_PARENT,
        'UK'
      )

      expect((payload as Record<string, unknown>).browsingHistory).toBeUndefined()
    })

    it('should handle all family structure types', () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 10)

      const structures: FamilyStructure[] = [
        'single_parent',
        'two_parent',
        'shared_custody',
        'caregiver',
      ]

      for (const structure of structures) {
        const payload = buildRoutingPayload(testSignal, birthDate, structure, 'US')
        expect(payload.familyStructure).toBe(structure)
      }
    })

    it('should include signal timestamp', () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 10)

      const payload = buildRoutingPayload(testSignal, birthDate, FAMILY_STRUCTURE.TWO_PARENT, 'US')

      expect(payload.signalTimestamp).toBeInstanceOf(Date)
    })
  })

  // ============================================
  // selectPartnerForJurisdiction Tests (AC6)
  // ============================================

  describe('selectPartnerForJurisdiction', () => {
    it('should select exact jurisdiction match with highest priority', () => {
      const partners = [testPartnerUS, testPartnerUSCA]

      const selected = selectPartnerForJurisdiction('US-CA', partners)

      expect(selected).not.toBeNull()
      expect(selected!.id).toBe(testPartnerUSCA.id)
      expect(selected!.jurisdictions).toContain('US-CA')
    })

    it('should fall back to country match when no state match', () => {
      const partners = [testPartnerUS, testPartnerUSCA]

      const selected = selectPartnerForJurisdiction('US-NY', partners)

      expect(selected).not.toBeNull()
      expect(selected!.id).toBe(testPartnerUS.id)
    })

    it('should return null when no partner covers jurisdiction', () => {
      const partners = [testPartnerUS, testPartnerUSCA]

      const selected = selectPartnerForJurisdiction('UK', partners)

      expect(selected).toBeNull()
    })

    it('should select highest priority partner when multiple match', () => {
      // Create another US partner with lower priority
      const lowPriorityUS = createCrisisPartner(
        'Low Priority US',
        'https://low-priority.example.com/webhook',
        'hashed_key_low',
        ['US'],
        ['crisis_counseling'],
        10 // Lower priority (higher number)
      )

      const partners = [lowPriorityUS, testPartnerUS]

      const selected = selectPartnerForJurisdiction('US', partners)

      expect(selected).not.toBeNull()
      expect(selected!.id).toBe(testPartnerUS.id)
    })

    it('should only select active partners', () => {
      const inactivePartner: CrisisPartner = {
        ...testPartnerUS,
        id: 'inactive_partner',
        active: false,
      }

      const partners = [inactivePartner]

      const selected = selectPartnerForJurisdiction('US', partners)

      expect(selected).toBeNull()
    })

    it('should handle empty partner list', () => {
      const selected = selectPartnerForJurisdiction('US', [])

      expect(selected).toBeNull()
    })

    it('should handle multiple jurisdictions per partner', () => {
      const multiJurisdiction = createCrisisPartner(
        'Multi Region',
        'https://multi.example.com/webhook',
        'hashed_key_multi',
        ['US', 'CA', 'AU'],
        ['crisis_counseling'],
        0
      )

      const partners = [multiJurisdiction]

      expect(selectPartnerForJurisdiction('US', partners)).not.toBeNull()
      expect(selectPartnerForJurisdiction('CA', partners)).not.toBeNull()
      expect(selectPartnerForJurisdiction('AU', partners)).not.toBeNull()
      expect(selectPartnerForJurisdiction('UK', partners)).toBeNull()
    })
  })

  // ============================================
  // Partner Store Tests
  // ============================================

  describe('Partner Store', () => {
    it('should get partner by ID', () => {
      const partner = getPartnerById(testPartnerUS.id)

      expect(partner).not.toBeNull()
      expect(partner!.name).toBe('US Crisis Center')
    })

    it('should return null for non-existent partner', () => {
      const partner = getPartnerById('non_existent')

      expect(partner).toBeNull()
    })

    it('should get all active partners', () => {
      const partners = getActivePartners()

      expect(partners.length).toBe(3)
      expect(partners.every((p) => p.active)).toBe(true)
    })

    it('should get partners for specific jurisdiction', () => {
      const usPartners = getPartnersForJurisdiction('US-CA')

      // Should include both US-CA specific and US national
      expect(usPartners.length).toBeGreaterThanOrEqual(1)
      expect(usPartners.some((p) => p.jurisdictions.includes('US-CA'))).toBe(true)
    })

    it('should count partners correctly', () => {
      expect(getPartnerCount()).toBe(3)
    })
  })

  // ============================================
  // routeSignalToPartner Tests (AC1, AC4, AC6)
  // ============================================

  describe('routeSignalToPartner', () => {
    it('should route signal to appropriate partner', async () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 12)

      const result = await routeSignalToPartner(
        testSignal,
        { birthDate, familyStructure: FAMILY_STRUCTURE.TWO_PARENT },
        'US-CA'
      )

      expect(result.signalId).toBe(testSignal.id)
      expect(result.partnerId).toBe(testPartnerUSCA.id)
      expect(result.status).toBe(ROUTING_STATUS.PENDING)
      expect(result.acknowledged).toBe(false)
    })

    it('should fall back to country partner when no state match', async () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 10)

      const result = await routeSignalToPartner(
        testSignal,
        { birthDate, familyStructure: FAMILY_STRUCTURE.SINGLE_PARENT },
        'US-TX'
      )

      expect(result.partnerId).toBe(testPartnerUS.id)
    })

    it('should throw when no partner available for jurisdiction', async () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 10)

      await expect(
        routeSignalToPartner(
          testSignal,
          { birthDate, familyStructure: FAMILY_STRUCTURE.TWO_PARENT },
          'JP' // Japan - no partner
        )
      ).rejects.toThrow('No partner available for jurisdiction')
    })

    it('should store routing result', async () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 10)

      const result = await routeSignalToPartner(
        testSignal,
        { birthDate, familyStructure: FAMILY_STRUCTURE.TWO_PARENT },
        'UK'
      )

      const stored = getRoutingResult(result.id)
      expect(stored).not.toBeNull()
      expect(stored!.signalId).toBe(testSignal.id)
    })

    it('should handle shared custody family structure', async () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 14)

      const result = await routeSignalToPartner(
        testSignal,
        { birthDate, familyStructure: FAMILY_STRUCTURE.SHARED_CUSTODY },
        'US'
      )

      expect(result).not.toBeNull()
      expect(result.signalId).toBe(testSignal.id)
    })
  })

  // ============================================
  // Routing Result Management Tests
  // ============================================

  describe('Routing Result Management', () => {
    it('should update routing result status', async () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 10)

      const result = await routeSignalToPartner(
        testSignal,
        { birthDate, familyStructure: FAMILY_STRUCTURE.TWO_PARENT },
        'US'
      )

      const updated = updateRoutingResult(result.id, { status: ROUTING_STATUS.SENT })

      expect(updated).not.toBeNull()
      expect(updated!.status).toBe(ROUTING_STATUS.SENT)
    })

    it('should mark routing as acknowledged', async () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 10)

      const result = await routeSignalToPartner(
        testSignal,
        { birthDate, familyStructure: FAMILY_STRUCTURE.TWO_PARENT },
        'US'
      )

      const acknowledged = markRoutingAcknowledged(result.id, 'PARTNER-CASE-123')

      expect(acknowledged).not.toBeNull()
      expect(acknowledged!.status).toBe(ROUTING_STATUS.ACKNOWLEDGED)
      expect(acknowledged!.acknowledged).toBe(true)
      expect(acknowledged!.partnerReferenceId).toBe('PARTNER-CASE-123')
      expect(acknowledged!.acknowledgedAt).not.toBeNull()
    })

    it('should mark routing as failed', async () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 10)

      const result = await routeSignalToPartner(
        testSignal,
        { birthDate, familyStructure: FAMILY_STRUCTURE.TWO_PARENT },
        'US'
      )

      const failed = markRoutingFailed(result.id, 'Connection timeout')

      expect(failed).not.toBeNull()
      expect(failed!.status).toBe(ROUTING_STATUS.FAILED)
      expect(failed!.lastError).toBe('Connection timeout')
      expect(failed!.retryCount).toBe(1)
    })

    it('should increment retry count on multiple failures', async () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 10)

      const result = await routeSignalToPartner(
        testSignal,
        { birthDate, familyStructure: FAMILY_STRUCTURE.TWO_PARENT },
        'US'
      )

      markRoutingFailed(result.id, 'Error 1')
      markRoutingFailed(result.id, 'Error 2')
      const final = markRoutingFailed(result.id, 'Error 3')

      expect(final!.retryCount).toBe(3)
      expect(final!.lastError).toBe('Error 3')
    })

    it('should return null when updating non-existent result', () => {
      const updated = updateRoutingResult('non_existent', { status: ROUTING_STATUS.SENT })

      expect(updated).toBeNull()
    })
  })

  // ============================================
  // Routing History Tests
  // ============================================

  describe('Routing History', () => {
    it('should get routing history for signal', async () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 10)

      await routeSignalToPartner(
        testSignal,
        { birthDate, familyStructure: FAMILY_STRUCTURE.TWO_PARENT },
        'US'
      )

      const history = getRoutingHistory(testSignal.id)

      expect(history.length).toBe(1)
      expect(history[0].signalId).toBe(testSignal.id)
    })

    it('should return empty array for signal with no routing', () => {
      const history = getRoutingHistory('non_existent_signal')

      expect(history).toEqual([])
    })

    it('should include multiple routing attempts', async () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 10)

      // Route same signal twice (simulating retry after failure)
      await routeSignalToPartner(
        testSignal,
        { birthDate, familyStructure: FAMILY_STRUCTURE.TWO_PARENT },
        'US'
      )

      // Modify signal to allow re-routing (normally wouldn't happen)
      const signal2 = { ...testSignal, id: testSignal.id }
      await routeSignalToPartner(
        signal2,
        { birthDate, familyStructure: FAMILY_STRUCTURE.TWO_PARENT },
        'UK'
      )

      const history = getRoutingHistory(testSignal.id)

      expect(history.length).toBe(2)
    })
  })

  // ============================================
  // Data Cleanup Tests
  // ============================================

  describe('Data Cleanup', () => {
    it('should clear all routing data', async () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 10)

      await routeSignalToPartner(
        testSignal,
        { birthDate, familyStructure: FAMILY_STRUCTURE.TWO_PARENT },
        'US'
      )

      clearAllRoutingData()

      expect(getRoutingResultCount()).toBe(0)
      expect(getPartnerCount()).toBe(0)
    })
  })

  // ============================================
  // Edge Cases and Error Handling
  // ============================================

  describe('Edge Cases', () => {
    it('should handle very young child (0 years old)', async () => {
      const birthDate = new Date() // Born today

      const result = await routeSignalToPartner(
        testSignal,
        { birthDate, familyStructure: FAMILY_STRUCTURE.TWO_PARENT },
        'US'
      )

      expect(result).not.toBeNull()
    })

    it('should handle child about to turn 18', async () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 17)
      birthDate.setMonth(birthDate.getMonth() - 11) // Almost 18

      const result = await routeSignalToPartner(
        testSignal,
        { birthDate, familyStructure: FAMILY_STRUCTURE.TWO_PARENT },
        'US'
      )

      expect(result).not.toBeNull()
    })

    it('should handle Android platform', () => {
      const androidSignal = createSafetySignal(
        'child_123',
        'family_456',
        TRIGGER_METHOD.SWIPE_PATTERN,
        SIGNAL_PLATFORM.ANDROID,
        false,
        'android_device'
      )

      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 10)

      const payload = buildRoutingPayload(
        androidSignal,
        birthDate,
        FAMILY_STRUCTURE.TWO_PARENT,
        'US'
      )

      expect(payload.platform).toBe('android')
      expect(payload.triggerMethod).toBe('swipe_pattern')
    })

    it('should handle Chrome extension platform', () => {
      const extensionSignal = createSafetySignal(
        'child_123',
        'family_456',
        TRIGGER_METHOD.KEYBOARD_SHORTCUT,
        SIGNAL_PLATFORM.CHROME_EXTENSION,
        false,
        'extension_device'
      )

      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 10)

      const payload = buildRoutingPayload(
        extensionSignal,
        birthDate,
        FAMILY_STRUCTURE.SINGLE_PARENT,
        'UK'
      )

      expect(payload.platform).toBe('chrome_extension')
      expect(payload.triggerMethod).toBe('keyboard_shortcut')
    })
  })
})
