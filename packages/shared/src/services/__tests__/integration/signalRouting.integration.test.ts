/**
 * Signal Routing Integration Tests - Story 7.5.2
 *
 * End-to-end integration tests for external signal routing.
 * Tests the complete flow from signal creation to partner delivery.
 *
 * AC1: Signal routes to external crisis partnership
 * AC2: Signal includes appropriate metadata
 * AC3: Signal excludes sensitive data
 * AC4: Signal is encrypted in transit
 * AC5: No family notification for 48 hours
 * AC6: Jurisdiction-appropriate routing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createCrisisPartner,
  createSignalRoutingPayload,
  signalRoutingPayloadSchema,
  type BlackoutRecord,
} from '../../../contracts/crisisPartner'
import {
  selectPartnerForJurisdiction,
  addPartnerToStore,
  clearAllRoutingData,
  getActivePartners,
} from '../../signalRoutingService'
import {
  startBlackoutPeriod,
  isSignalInBlackout,
  getBlackoutStatus,
  extendBlackoutPeriod,
  DEFAULT_BLACKOUT_HOURS,
  type BlackoutStore,
} from '../../signalBlackoutService'

describe('Signal Routing Integration - Story 7.5.2', () => {
  let blackoutStore: Map<string, BlackoutRecord>

  // Create mock blackout store
  const createBlackoutStore = (): BlackoutStore => ({
    get: vi.fn(async (id) => blackoutStore.get(id) || null),
    set: vi.fn(async (id, record) => {
      blackoutStore.set(id, record)
    }),
    delete: vi.fn(async (id) => {
      blackoutStore.delete(id)
    }),
    getAll: vi.fn(async () => Array.from(blackoutStore.values())),
    getBySignalId: vi.fn(async (signalId) => {
      const records = Array.from(blackoutStore.values())
      return records.find((r) => r.signalId === signalId) || null
    }),
  })

  beforeEach(() => {
    vi.clearAllMocks()
    blackoutStore = new Map()
    clearAllRoutingData()
  })

  // ============================================
  // AC1: Signal Routes to External Partnership
  // ============================================

  describe('AC1: Signal Routes to External Partnership', () => {
    it('should route signal to correct partner for jurisdiction', async () => {
      // Setup: Create US partner
      const usPartner = createCrisisPartner(
        'US Crisis Center',
        'https://us-crisis.example.com/webhook',
        'us_api_key_hash',
        ['US', 'US-CA', 'US-NY'],
        ['crisis_counseling'],
        0
      )

      await addPartnerToStore(usPartner)

      // Create signal payload
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 12)

      // Create signal payload (tests payload creation works)
      createSignalRoutingPayload(
        'sig_test_001',
        birthDate,
        'two_parent',
        'US-CA',
        'web',
        'logo_tap',
        'device_123'
      )

      // Find partner
      const partners = getActivePartners()
      const partner = selectPartnerForJurisdiction('US-CA', partners)

      expect(partner).toBeDefined()
      expect(partner!.id).toBe(usPartner.id)
    })

    it('should route signal to country partner when state not available', async () => {
      // Setup: Create US partner (no US-TX specifically)
      const usPartner = createCrisisPartner(
        'US National Crisis Center',
        'https://us-national.example.com/webhook',
        'us_national_key_hash',
        ['US'],
        ['crisis_counseling'],
        0
      )

      await addPartnerToStore(usPartner)

      // Signal from Texas should match US partner
      const partners = getActivePartners()
      const partner = selectPartnerForJurisdiction('US-TX', partners)

      expect(partner).toBeDefined()
      expect(partner!.jurisdictions).toContain('US')
    })

    it('should select highest priority partner when multiple match', async () => {
      // Setup: Create two US partners with different priorities
      const lowPriorityPartner = createCrisisPartner(
        'General US Partner',
        'https://general.example.com/webhook',
        'general_key',
        ['US'],
        ['crisis_counseling'],
        10 // Lower priority (higher number)
      )

      const highPriorityPartner = createCrisisPartner(
        'Priority US Partner',
        'https://priority.example.com/webhook',
        'priority_key',
        ['US'],
        ['crisis_counseling'],
        1 // Higher priority (lower number)
      )

      await addPartnerToStore(lowPriorityPartner)
      await addPartnerToStore(highPriorityPartner)

      const partners = getActivePartners()
      const partner = selectPartnerForJurisdiction('US', partners)

      expect(partner).toBeDefined()
      expect(partner!.priority).toBe(1)
    })
  })

  // ============================================
  // AC2: Signal Includes Appropriate Metadata
  // ============================================

  describe('AC2: Signal Includes Appropriate Metadata', () => {
    it('should include child age calculated from birthdate', () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 14)

      const payload = createSignalRoutingPayload(
        'sig_age_test',
        birthDate,
        'single_parent',
        'US',
        'web',
        'logo_tap',
        null
      )

      expect(payload.childAge).toBe(14)
      // Note: birthDate is NOT in payload (privacy)
    })

    it('should include family structure', () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 10)

      const payload = createSignalRoutingPayload(
        'sig_structure_test',
        birthDate,
        'shared_custody',
        'UK',
        'chrome_extension',
        'keyboard_shortcut',
        'device_abc'
      )

      expect(payload.familyStructure).toBe('shared_custody')
    })

    it('should include jurisdiction', () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 8)

      const payload = createSignalRoutingPayload(
        'sig_jurisdiction_test',
        birthDate,
        'two_parent',
        'AU-NSW',
        'android',
        'swipe_pattern',
        null
      )

      expect(payload.jurisdiction).toBe('AU-NSW')
    })

    it('should include trigger method', () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 12)

      const payload = createSignalRoutingPayload(
        'sig_trigger_test',
        birthDate,
        'caregiver',
        'CA',
        'web',
        'keyboard_shortcut',
        'device_xyz'
      )

      expect(payload.triggerMethod).toBe('keyboard_shortcut')
    })

    it('should include platform', () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 16)

      const payload = createSignalRoutingPayload(
        'sig_platform_test',
        birthDate,
        'two_parent',
        'US',
        'chrome_extension',
        'logo_tap',
        null
      )

      expect(payload.platform).toBe('chrome_extension')
    })
  })

  // ============================================
  // AC3: Signal Excludes Sensitive Data
  // ============================================

  describe('AC3: Signal Excludes Sensitive Data', () => {
    it('should NOT include parent contact information', () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 12)

      const payload = createSignalRoutingPayload(
        'sig_no_parent',
        birthDate,
        'two_parent',
        'US',
        'web',
        'logo_tap',
        null
      )

      const payloadKeys = Object.keys(payload)

      expect(payloadKeys).not.toContain('parentEmail')
      expect(payloadKeys).not.toContain('parentPhone')
      expect(payloadKeys).not.toContain('parentName')
      expect(payloadKeys).not.toContain('guardianEmail')
      expect(payloadKeys).not.toContain('guardianPhone')
    })

    it('should NOT include screenshots or activity data', () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 12)

      const payload = createSignalRoutingPayload(
        'sig_no_screenshots',
        birthDate,
        'two_parent',
        'US',
        'web',
        'logo_tap',
        null
      )

      const payloadKeys = Object.keys(payload)

      expect(payloadKeys).not.toContain('screenshots')
      expect(payloadKeys).not.toContain('activityLogs')
      expect(payloadKeys).not.toContain('browsingHistory')
    })

    it('should NOT include exact birthdate (only age)', () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 12)

      const payload = createSignalRoutingPayload(
        'sig_no_birthdate',
        birthDate,
        'two_parent',
        'US',
        'web',
        'logo_tap',
        null
      )

      const payloadKeys = Object.keys(payload)

      expect(payloadKeys).not.toContain('birthDate')
      expect(payloadKeys).not.toContain('dateOfBirth')
      expect(payloadKeys).toContain('childAge')
    })

    it('should NOT include sibling information', () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 12)

      const payload = createSignalRoutingPayload(
        'sig_no_siblings',
        birthDate,
        'two_parent',
        'US',
        'web',
        'logo_tap',
        null
      )

      const payloadKeys = Object.keys(payload)

      expect(payloadKeys).not.toContain('siblings')
      expect(payloadKeys).not.toContain('otherChildren')
      expect(payloadKeys).not.toContain('familyMembers')
    })

    it('should NOT include location data', () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 12)

      const payload = createSignalRoutingPayload(
        'sig_no_location',
        birthDate,
        'two_parent',
        'US-CA',
        'web',
        'logo_tap',
        null
      )

      const payloadKeys = Object.keys(payload)

      expect(payloadKeys).not.toContain('latitude')
      expect(payloadKeys).not.toContain('longitude')
      expect(payloadKeys).not.toContain('geoLocation')
      expect(payloadKeys).not.toContain('address')
      // jurisdiction is allowed (state level, not precise)
      expect(payloadKeys).toContain('jurisdiction')
    })

    it('should use strict schema that rejects extra fields', () => {
      // Attempt to add extra sensitive data
      expect(() => {
        const badPayload = {
          signalId: 'sig_bad',
          childAge: 12,
          signalTimestamp: new Date(),
          familyStructure: 'two_parent' as const,
          jurisdiction: 'US',
          platform: 'web' as const,
          triggerMethod: 'logo_tap' as const,
          deviceId: null,
          // Extra field that should be rejected
          parentEmail: 'parent@example.com',
        }

        // This should throw because of .strict() in schema
        signalRoutingPayloadSchema.parse(badPayload)
      }).toThrow()
    })
  })

  // ============================================
  // AC5: No Family Notification for 48 Hours
  // ============================================

  describe('AC5: No Family Notification for 48 Hours', () => {
    it('should create 48-hour blackout on signal routing', async () => {
      const store = createBlackoutStore()
      const signalId = 'sig_blackout_test'

      const blackout = await startBlackoutPeriod(signalId, store)

      expect(blackout.signalId).toBe(signalId)
      expect(blackout.active).toBe(true)

      const durationMs = blackout.expiresAt.getTime() - blackout.startedAt.getTime()
      const durationHours = durationMs / (1000 * 60 * 60)

      expect(durationHours).toBeCloseTo(DEFAULT_BLACKOUT_HOURS, 1)
    })

    it('should report signal as in blackout during period', async () => {
      const store = createBlackoutStore()
      const signalId = 'sig_in_blackout'

      await startBlackoutPeriod(signalId, store)

      const inBlackout = await isSignalInBlackout(signalId, store)

      expect(inBlackout).toBe(true)
    })

    it('should allow partner to extend blackout', async () => {
      const store = createBlackoutStore()
      const signalId = 'sig_extend_blackout'
      const partnerId = 'partner_crisis_center'

      await startBlackoutPeriod(signalId, store)

      const extended = await extendBlackoutPeriod(
        signalId,
        24, // Additional 24 hours
        partnerId,
        store
      )

      expect(extended.extendedBy).toBe(partnerId)

      const status = await getBlackoutStatus(signalId, store)
      expect(status.remainingHours).toBeGreaterThan(DEFAULT_BLACKOUT_HOURS)
    })

    it('should reject blackout extension without partner authorization', async () => {
      const store = createBlackoutStore()
      const signalId = 'sig_no_auth_extend'

      await startBlackoutPeriod(signalId, store)

      await expect(extendBlackoutPeriod(signalId, 24, '', store)).rejects.toThrow(
        'Partner authorization required'
      )
    })
  })

  // ============================================
  // AC6: Jurisdiction-Appropriate Routing
  // ============================================

  describe('AC6: Jurisdiction-Appropriate Routing', () => {
    it('should route US-CA signal to California partner', async () => {
      const caPartner = createCrisisPartner(
        'California Crisis Center',
        'https://ca-crisis.example.com/webhook',
        'ca_key_hash',
        ['US-CA'],
        ['crisis_counseling'],
        0
      )

      await addPartnerToStore(caPartner)

      const partners = getActivePartners()
      const partner = selectPartnerForJurisdiction('US-CA', partners)

      expect(partner).toBeDefined()
      expect(partner!.name).toBe('California Crisis Center')
    })

    it('should route UK signal to UK partner', async () => {
      const ukPartner = createCrisisPartner(
        'UK Childline',
        'https://uk-childline.example.com/webhook',
        'uk_key_hash',
        ['UK'],
        ['crisis_counseling'],
        0
      )

      await addPartnerToStore(ukPartner)

      const partners = getActivePartners()
      const partner = selectPartnerForJurisdiction('UK', partners)

      expect(partner).toBeDefined()
      expect(partner!.name).toBe('UK Childline')
    })

    it('should prefer state-specific partner over national partner', async () => {
      const nationalPartner = createCrisisPartner(
        'US National',
        'https://us-national.example.com/webhook',
        'us_national_key',
        ['US'],
        ['crisis_counseling'],
        5 // Lower priority for fallback
      )

      const statePartner = createCrisisPartner(
        'Texas Crisis Center',
        'https://texas-crisis.example.com/webhook',
        'tx_key',
        ['US-TX'],
        ['crisis_counseling'],
        0 // Higher priority for specific state
      )

      await addPartnerToStore(nationalPartner)
      await addPartnerToStore(statePartner)

      const partners = getActivePartners()
      const partner = selectPartnerForJurisdiction('US-TX', partners)

      expect(partner).toBeDefined()
      expect(partner!.name).toBe('Texas Crisis Center')
    })

    it('should return null for jurisdiction with no partners', async () => {
      // No partners registered
      const partners = getActivePartners()
      const partner = selectPartnerForJurisdiction('ZZ', partners)

      expect(partner).toBeNull()
    })
  })

  // ============================================
  // End-to-End Flow Tests
  // ============================================

  describe('End-to-End Signal Routing Flow', () => {
    it('should complete full routing flow for new signal', async () => {
      // 1. Setup partner
      const partner = createCrisisPartner(
        'Test Crisis Center',
        'https://test-crisis.example.com/webhook',
        'test_key_hash',
        ['US'],
        ['crisis_counseling'],
        0
      )
      await addPartnerToStore(partner)

      // 2. Create signal payload
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 12)

      const payload = createSignalRoutingPayload(
        'sig_e2e_test',
        birthDate,
        'two_parent',
        'US',
        'web',
        'logo_tap',
        'device_e2e'
      )

      // 3. Verify payload structure
      expect(payload.signalId).toBe('sig_e2e_test')
      expect(payload.childAge).toBe(12)
      expect(payload.jurisdiction).toBe('US')

      // 4. Find partner
      const partners = getActivePartners()
      const selectedPartner = selectPartnerForJurisdiction('US', partners)
      expect(selectedPartner).toBeDefined()

      // 5. Start blackout (would happen in trigger function)
      const blackoutStore = createBlackoutStore()
      const blackout = await startBlackoutPeriod('sig_e2e_test', blackoutStore)
      expect(blackout.active).toBe(true)

      // 6. Verify blackout status
      const inBlackout = await isSignalInBlackout('sig_e2e_test', blackoutStore)
      expect(inBlackout).toBe(true)
    })

    it('should handle multiple signals from same child', async () => {
      const partner = createCrisisPartner(
        'Multi-Signal Partner',
        'https://multi.example.com/webhook',
        'multi_key',
        ['US'],
        ['crisis_counseling'],
        0
      )
      await addPartnerToStore(partner)

      const blackoutStore = createBlackoutStore()
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 11)

      // First signal - create payload and start blackout
      createSignalRoutingPayload(
        'sig_multi_1',
        birthDate,
        'single_parent',
        'US',
        'web',
        'logo_tap',
        'device_1'
      )
      await startBlackoutPeriod('sig_multi_1', blackoutStore)

      // Second signal (different ID) - create payload and start blackout
      createSignalRoutingPayload(
        'sig_multi_2',
        birthDate,
        'single_parent',
        'US',
        'chrome_extension',
        'keyboard_shortcut',
        'device_2'
      )
      await startBlackoutPeriod('sig_multi_2', blackoutStore)

      // Both should be in blackout
      expect(await isSignalInBlackout('sig_multi_1', blackoutStore)).toBe(true)
      expect(await isSignalInBlackout('sig_multi_2', blackoutStore)).toBe(true)
    })
  })
})
