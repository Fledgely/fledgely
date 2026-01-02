/**
 * Crisis Partner Contracts Tests - Story 7.5.2 Task 1
 *
 * TDD tests for crisis partner data models.
 * AC1: Signal routes to external crisis partnership
 * AC6: Jurisdiction-appropriate routing
 */

import { describe, it, expect } from 'vitest'
import {
  // Constants
  PARTNER_CAPABILITY,
  FAMILY_STRUCTURE,
  ROUTING_STATUS,
  // Schemas
  crisisPartnerSchema,
  signalRoutingPayloadSchema,
  signalRoutingResultSchema,
  blackoutRecordSchema,
  // Types
  type CrisisPartner,
  type SignalRoutingPayload,
  type SignalRoutingResult,
  type BlackoutRecord,
  // Factory functions
  createCrisisPartner,
  createSignalRoutingPayload,
  createSignalRoutingResult,
  createBlackoutRecord,
  generatePartnerId,
  generateRoutingResultId,
  generateBlackoutId,
  // Validation functions
  validateCrisisPartner,
  validateSignalRoutingPayload,
  validateSignalRoutingResult,
  isCrisisPartner,
  isSignalRoutingPayload,
  // Utility functions
  calculateChildAge,
  isValidJurisdiction,
  partnerSupportsJurisdiction,
} from './crisisPartner'

describe('Crisis Partner Contracts', () => {
  // ============================================
  // Constants Tests
  // ============================================

  describe('PARTNER_CAPABILITY', () => {
    it('should define crisis_counseling capability', () => {
      expect(PARTNER_CAPABILITY.CRISIS_COUNSELING).toBe('crisis_counseling')
    })

    it('should define mandatory_reporting capability', () => {
      expect(PARTNER_CAPABILITY.MANDATORY_REPORTING).toBe('mandatory_reporting')
    })

    it('should define safe_adult_notification capability', () => {
      expect(PARTNER_CAPABILITY.SAFE_ADULT_NOTIFICATION).toBe('safe_adult_notification')
    })

    it('should define law_enforcement_coordination capability', () => {
      expect(PARTNER_CAPABILITY.LAW_ENFORCEMENT_COORDINATION).toBe('law_enforcement_coordination')
    })
  })

  describe('FAMILY_STRUCTURE', () => {
    it('should define single_parent structure', () => {
      expect(FAMILY_STRUCTURE.SINGLE_PARENT).toBe('single_parent')
    })

    it('should define two_parent structure', () => {
      expect(FAMILY_STRUCTURE.TWO_PARENT).toBe('two_parent')
    })

    it('should define shared_custody structure', () => {
      expect(FAMILY_STRUCTURE.SHARED_CUSTODY).toBe('shared_custody')
    })

    it('should define caregiver structure', () => {
      expect(FAMILY_STRUCTURE.CAREGIVER).toBe('caregiver')
    })
  })

  describe('ROUTING_STATUS', () => {
    it('should define pending status', () => {
      expect(ROUTING_STATUS.PENDING).toBe('pending')
    })

    it('should define sent status', () => {
      expect(ROUTING_STATUS.SENT).toBe('sent')
    })

    it('should define acknowledged status', () => {
      expect(ROUTING_STATUS.ACKNOWLEDGED).toBe('acknowledged')
    })

    it('should define failed status', () => {
      expect(ROUTING_STATUS.FAILED).toBe('failed')
    })
  })

  // ============================================
  // Schema Tests - CrisisPartner
  // ============================================

  describe('crisisPartnerSchema', () => {
    const validPartner: CrisisPartner = {
      id: 'partner_123',
      name: 'Crisis Helpline',
      webhookUrl: 'https://crisis.example.com/webhook',
      apiKeyHash: 'hashed_api_key_abc123',
      active: true,
      jurisdictions: ['US', 'US-CA', 'UK'],
      priority: 1,
      capabilities: ['crisis_counseling', 'mandatory_reporting'],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it('should validate a valid crisis partner', () => {
      const result = crisisPartnerSchema.safeParse(validPartner)
      expect(result.success).toBe(true)
    })

    it('should require id', () => {
      const invalid = { ...validPartner, id: '' }
      const result = crisisPartnerSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should require name', () => {
      const invalid = { ...validPartner, name: '' }
      const result = crisisPartnerSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should require valid webhookUrl', () => {
      const invalid = { ...validPartner, webhookUrl: 'not-a-url' }
      const result = crisisPartnerSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should require HTTPS webhookUrl', () => {
      const invalid = { ...validPartner, webhookUrl: 'http://insecure.example.com' }
      const result = crisisPartnerSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should require apiKeyHash', () => {
      const invalid = { ...validPartner, apiKeyHash: '' }
      const result = crisisPartnerSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should require at least one jurisdiction', () => {
      const invalid = { ...validPartner, jurisdictions: [] }
      const result = crisisPartnerSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should require priority to be positive', () => {
      const invalid = { ...validPartner, priority: -1 }
      const result = crisisPartnerSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should allow priority of 0', () => {
      const valid = { ...validPartner, priority: 0 }
      const result = crisisPartnerSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('should require at least one capability', () => {
      const invalid = { ...validPartner, capabilities: [] }
      const result = crisisPartnerSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should validate capability values', () => {
      const invalid = { ...validPartner, capabilities: ['invalid_capability'] }
      const result = crisisPartnerSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })
  })

  // ============================================
  // Schema Tests - SignalRoutingPayload
  // ============================================

  describe('signalRoutingPayloadSchema', () => {
    const validPayload: SignalRoutingPayload = {
      signalId: 'sig_123',
      childAge: 12,
      signalTimestamp: new Date(),
      familyStructure: 'two_parent',
      jurisdiction: 'US-CA',
      platform: 'web',
      triggerMethod: 'logo_tap',
      deviceId: 'device_abc',
    }

    it('should validate a valid routing payload', () => {
      const result = signalRoutingPayloadSchema.safeParse(validPayload)
      expect(result.success).toBe(true)
    })

    it('should require signalId', () => {
      const invalid = { ...validPayload, signalId: '' }
      const result = signalRoutingPayloadSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should require childAge to be positive', () => {
      const invalid = { ...validPayload, childAge: -1 }
      const result = signalRoutingPayloadSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should require childAge to be reasonable (under 18)', () => {
      const invalid = { ...validPayload, childAge: 50 }
      const result = signalRoutingPayloadSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should allow deviceId to be null', () => {
      const valid = { ...validPayload, deviceId: null }
      const result = signalRoutingPayloadSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('should validate familyStructure values', () => {
      const invalid = { ...validPayload, familyStructure: 'invalid_structure' }
      const result = signalRoutingPayloadSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should validate platform values', () => {
      const invalid = { ...validPayload, platform: 'invalid_platform' }
      const result = signalRoutingPayloadSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should validate triggerMethod values', () => {
      const invalid = { ...validPayload, triggerMethod: 'invalid_method' }
      const result = signalRoutingPayloadSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should REJECT payloads with parentInfo (sensitive data protection)', () => {
      const withParentInfo = { ...validPayload, parentInfo: { name: 'John' } }
      const result = signalRoutingPayloadSchema.safeParse(withParentInfo)
      // Strict schema rejects extra fields for security
      expect(result.success).toBe(false)
    })

    it('should REJECT payloads with screenshots (sensitive data protection)', () => {
      const withScreenshots = { ...validPayload, screenshots: ['base64data'] }
      const result = signalRoutingPayloadSchema.safeParse(withScreenshots)
      expect(result.success).toBe(false)
    })

    it('should REJECT payloads with activityData (sensitive data protection)', () => {
      const withActivity = { ...validPayload, activityData: { browsing: [] } }
      const result = signalRoutingPayloadSchema.safeParse(withActivity)
      expect(result.success).toBe(false)
    })

    it('should REJECT payloads with browsingHistory (sensitive data protection)', () => {
      const withHistory = { ...validPayload, browsingHistory: ['https://example.com'] }
      const result = signalRoutingPayloadSchema.safeParse(withHistory)
      expect(result.success).toBe(false)
    })
  })

  // ============================================
  // Schema Tests - SignalRoutingResult
  // ============================================

  describe('signalRoutingResultSchema', () => {
    const validResult: SignalRoutingResult = {
      id: 'result_123',
      signalId: 'sig_123',
      partnerId: 'partner_456',
      routedAt: new Date(),
      status: 'sent',
      acknowledged: false,
      acknowledgedAt: null,
      partnerReferenceId: null,
      retryCount: 0,
      lastError: null,
    }

    it('should validate a valid routing result', () => {
      const result = signalRoutingResultSchema.safeParse(validResult)
      expect(result.success).toBe(true)
    })

    it('should require signalId', () => {
      const invalid = { ...validResult, signalId: '' }
      const result = signalRoutingResultSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should require partnerId', () => {
      const invalid = { ...validResult, partnerId: '' }
      const result = signalRoutingResultSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should allow acknowledged result with acknowledgedAt', () => {
      const acknowledged = {
        ...validResult,
        status: 'acknowledged' as const,
        acknowledged: true,
        acknowledgedAt: new Date(),
        partnerReferenceId: 'CASE-12345',
      }
      const result = signalRoutingResultSchema.safeParse(acknowledged)
      expect(result.success).toBe(true)
    })

    it('should validate status values', () => {
      const invalid = { ...validResult, status: 'invalid_status' }
      const result = signalRoutingResultSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should require retryCount to be non-negative', () => {
      const invalid = { ...validResult, retryCount: -1 }
      const result = signalRoutingResultSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })
  })

  // ============================================
  // Schema Tests - BlackoutRecord
  // ============================================

  describe('blackoutRecordSchema', () => {
    const validBlackout: BlackoutRecord = {
      id: 'blackout_123',
      signalId: 'sig_123',
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      extendedBy: null,
      active: true,
    }

    it('should validate a valid blackout record', () => {
      const result = blackoutRecordSchema.safeParse(validBlackout)
      expect(result.success).toBe(true)
    })

    it('should require signalId', () => {
      const invalid = { ...validBlackout, signalId: '' }
      const result = blackoutRecordSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should allow extendedBy to be a partner ID', () => {
      const extended = { ...validBlackout, extendedBy: 'partner_123' }
      const result = blackoutRecordSchema.safeParse(extended)
      expect(result.success).toBe(true)
    })
  })

  // ============================================
  // Factory Function Tests
  // ============================================

  describe('generatePartnerId', () => {
    it('should generate unique IDs', () => {
      const id1 = generatePartnerId()
      const id2 = generatePartnerId()
      expect(id1).not.toBe(id2)
    })

    it('should start with partner_ prefix', () => {
      const id = generatePartnerId()
      expect(id.startsWith('partner_')).toBe(true)
    })
  })

  describe('generateRoutingResultId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateRoutingResultId()
      const id2 = generateRoutingResultId()
      expect(id1).not.toBe(id2)
    })

    it('should start with route_ prefix', () => {
      const id = generateRoutingResultId()
      expect(id.startsWith('route_')).toBe(true)
    })
  })

  describe('generateBlackoutId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateBlackoutId()
      const id2 = generateBlackoutId()
      expect(id1).not.toBe(id2)
    })

    it('should start with blackout_ prefix', () => {
      const id = generateBlackoutId()
      expect(id.startsWith('blackout_')).toBe(true)
    })
  })

  describe('createCrisisPartner', () => {
    it('should create a valid crisis partner', () => {
      const partner = createCrisisPartner(
        'Crisis Center',
        'https://crisis.example.com/webhook',
        'hashed_key_123',
        ['US', 'US-CA'],
        ['crisis_counseling']
      )

      expect(partner.name).toBe('Crisis Center')
      expect(partner.webhookUrl).toBe('https://crisis.example.com/webhook')
      expect(partner.jurisdictions).toEqual(['US', 'US-CA'])
      expect(partner.capabilities).toEqual(['crisis_counseling'])
      expect(partner.active).toBe(true)
      expect(partner.priority).toBe(0)
    })

    it('should set custom priority', () => {
      const partner = createCrisisPartner(
        'Crisis Center',
        'https://crisis.example.com/webhook',
        'hashed_key_123',
        ['US'],
        ['crisis_counseling'],
        5
      )

      expect(partner.priority).toBe(5)
    })

    it('should set createdAt and updatedAt timestamps', () => {
      const before = new Date()
      const partner = createCrisisPartner(
        'Crisis Center',
        'https://crisis.example.com/webhook',
        'hashed_key_123',
        ['US'],
        ['crisis_counseling']
      )
      const after = new Date()

      expect(partner.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(partner.createdAt.getTime()).toBeLessThanOrEqual(after.getTime())
      expect(partner.updatedAt.getTime()).toBe(partner.createdAt.getTime())
    })
  })

  describe('createSignalRoutingPayload', () => {
    it('should create a valid routing payload', () => {
      const birthDate = new Date('2012-06-15')
      const payload = createSignalRoutingPayload(
        'sig_123',
        birthDate,
        'two_parent',
        'US-CA',
        'web',
        'logo_tap',
        'device_abc'
      )

      expect(payload.signalId).toBe('sig_123')
      expect(payload.familyStructure).toBe('two_parent')
      expect(payload.jurisdiction).toBe('US-CA')
      expect(payload.platform).toBe('web')
      expect(payload.triggerMethod).toBe('logo_tap')
      expect(payload.deviceId).toBe('device_abc')
    })

    it('should calculate child age correctly', () => {
      // Child born 10 years ago
      const tenYearsAgo = new Date()
      tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10)

      const payload = createSignalRoutingPayload(
        'sig_123',
        tenYearsAgo,
        'two_parent',
        'US-CA',
        'web',
        'logo_tap',
        null
      )

      expect(payload.childAge).toBe(10)
    })

    it('should allow null deviceId', () => {
      const birthDate = new Date('2012-06-15')
      const payload = createSignalRoutingPayload(
        'sig_123',
        birthDate,
        'single_parent',
        'UK',
        'chrome_extension',
        'keyboard_shortcut',
        null
      )

      expect(payload.deviceId).toBeNull()
    })
  })

  describe('createSignalRoutingResult', () => {
    it('should create a valid routing result', () => {
      const result = createSignalRoutingResult('sig_123', 'partner_456')

      expect(result.signalId).toBe('sig_123')
      expect(result.partnerId).toBe('partner_456')
      expect(result.status).toBe('pending')
      expect(result.acknowledged).toBe(false)
      expect(result.acknowledgedAt).toBeNull()
      expect(result.partnerReferenceId).toBeNull()
      expect(result.retryCount).toBe(0)
    })

    it('should set routedAt timestamp', () => {
      const before = new Date()
      const result = createSignalRoutingResult('sig_123', 'partner_456')
      const after = new Date()

      expect(result.routedAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(result.routedAt.getTime()).toBeLessThanOrEqual(after.getTime())
    })
  })

  describe('createBlackoutRecord', () => {
    it('should create a valid blackout record with default 48 hours', () => {
      const result = createBlackoutRecord('sig_123')

      expect(result.signalId).toBe('sig_123')
      expect(result.active).toBe(true)
      expect(result.extendedBy).toBeNull()
    })

    it('should set expiry 48 hours from start by default', () => {
      const result = createBlackoutRecord('sig_123')

      const expectedExpiry = new Date(result.startedAt.getTime() + 48 * 60 * 60 * 1000)
      expect(Math.abs(result.expiresAt.getTime() - expectedExpiry.getTime())).toBeLessThan(1000)
    })

    it('should allow custom duration', () => {
      const result = createBlackoutRecord('sig_123', 72)

      const expectedExpiry = new Date(result.startedAt.getTime() + 72 * 60 * 60 * 1000)
      expect(Math.abs(result.expiresAt.getTime() - expectedExpiry.getTime())).toBeLessThan(1000)
    })
  })

  // ============================================
  // Validation Function Tests
  // ============================================

  describe('validateCrisisPartner', () => {
    it('should return valid partner unchanged', () => {
      const partner = createCrisisPartner(
        'Crisis Center',
        'https://crisis.example.com/webhook',
        'hashed_key_123',
        ['US'],
        ['crisis_counseling']
      )

      const validated = validateCrisisPartner(partner)
      expect(validated).toEqual(partner)
    })

    it('should throw on invalid partner', () => {
      expect(() => validateCrisisPartner({ invalid: true })).toThrow()
    })
  })

  describe('validateSignalRoutingPayload', () => {
    it('should return valid payload unchanged', () => {
      const birthDate = new Date('2012-06-15')
      const payload = createSignalRoutingPayload(
        'sig_123',
        birthDate,
        'two_parent',
        'US-CA',
        'web',
        'logo_tap',
        null
      )

      const validated = validateSignalRoutingPayload(payload)
      expect(validated).toEqual(payload)
    })

    it('should throw on invalid payload', () => {
      expect(() => validateSignalRoutingPayload({ invalid: true })).toThrow()
    })
  })

  describe('validateSignalRoutingResult', () => {
    it('should return valid result unchanged', () => {
      const result = createSignalRoutingResult('sig_123', 'partner_456')

      const validated = validateSignalRoutingResult(result)
      expect(validated).toEqual(result)
    })

    it('should throw on invalid result', () => {
      expect(() => validateSignalRoutingResult({ invalid: true })).toThrow()
    })
  })

  describe('isCrisisPartner', () => {
    it('should return true for valid partner', () => {
      const partner = createCrisisPartner(
        'Crisis Center',
        'https://crisis.example.com/webhook',
        'hashed_key_123',
        ['US'],
        ['crisis_counseling']
      )

      expect(isCrisisPartner(partner)).toBe(true)
    })

    it('should return false for invalid data', () => {
      expect(isCrisisPartner({ invalid: true })).toBe(false)
      expect(isCrisisPartner(null)).toBe(false)
      expect(isCrisisPartner('string')).toBe(false)
    })
  })

  describe('isSignalRoutingPayload', () => {
    it('should return true for valid payload', () => {
      const birthDate = new Date('2012-06-15')
      const payload = createSignalRoutingPayload(
        'sig_123',
        birthDate,
        'two_parent',
        'US-CA',
        'web',
        'logo_tap',
        null
      )

      expect(isSignalRoutingPayload(payload)).toBe(true)
    })

    it('should return false for invalid data', () => {
      expect(isSignalRoutingPayload({ invalid: true })).toBe(false)
    })
  })

  // ============================================
  // Utility Function Tests
  // ============================================

  describe('calculateChildAge', () => {
    it('should calculate age correctly', () => {
      const tenYearsAgo = new Date()
      tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10)

      expect(calculateChildAge(tenYearsAgo)).toBe(10)
    })

    it('should account for birthday not yet passed this year', () => {
      const birthday = new Date()
      birthday.setFullYear(birthday.getFullYear() - 10)
      birthday.setMonth(birthday.getMonth() + 1) // Birthday is next month

      expect(calculateChildAge(birthday)).toBe(9)
    })

    it('should account for birthday already passed this year', () => {
      const birthday = new Date()
      birthday.setFullYear(birthday.getFullYear() - 10)
      birthday.setMonth(birthday.getMonth() - 1) // Birthday was last month

      expect(calculateChildAge(birthday)).toBe(10)
    })
  })

  describe('isValidJurisdiction', () => {
    it('should validate country codes', () => {
      expect(isValidJurisdiction('US')).toBe(true)
      expect(isValidJurisdiction('UK')).toBe(true)
      expect(isValidJurisdiction('CA')).toBe(true)
      expect(isValidJurisdiction('AU')).toBe(true)
    })

    it('should validate country-state codes', () => {
      expect(isValidJurisdiction('US-CA')).toBe(true)
      expect(isValidJurisdiction('US-NY')).toBe(true)
      expect(isValidJurisdiction('AU-NSW')).toBe(true)
    })

    it('should reject invalid formats', () => {
      expect(isValidJurisdiction('')).toBe(false)
      expect(isValidJurisdiction('A')).toBe(false)
      expect(isValidJurisdiction('USA')).toBe(false)
      expect(isValidJurisdiction('US-')).toBe(false)
      expect(isValidJurisdiction('-CA')).toBe(false)
    })
  })

  describe('partnerSupportsJurisdiction', () => {
    it('should match exact jurisdiction', () => {
      const partner = createCrisisPartner(
        'Crisis Center',
        'https://crisis.example.com/webhook',
        'hashed_key_123',
        ['US-CA'],
        ['crisis_counseling']
      )

      expect(partnerSupportsJurisdiction(partner, 'US-CA')).toBe(true)
    })

    it('should match country when partner covers country', () => {
      const partner = createCrisisPartner(
        'Crisis Center',
        'https://crisis.example.com/webhook',
        'hashed_key_123',
        ['US'],
        ['crisis_counseling']
      )

      expect(partnerSupportsJurisdiction(partner, 'US-CA')).toBe(true)
      expect(partnerSupportsJurisdiction(partner, 'US-NY')).toBe(true)
    })

    it('should not match different country', () => {
      const partner = createCrisisPartner(
        'Crisis Center',
        'https://crisis.example.com/webhook',
        'hashed_key_123',
        ['US'],
        ['crisis_counseling']
      )

      expect(partnerSupportsJurisdiction(partner, 'UK')).toBe(false)
    })

    it('should handle multiple jurisdictions', () => {
      const partner = createCrisisPartner(
        'Crisis Center',
        'https://crisis.example.com/webhook',
        'hashed_key_123',
        ['US', 'UK', 'AU-NSW'],
        ['crisis_counseling']
      )

      expect(partnerSupportsJurisdiction(partner, 'US-CA')).toBe(true)
      expect(partnerSupportsJurisdiction(partner, 'UK')).toBe(true)
      expect(partnerSupportsJurisdiction(partner, 'AU-NSW')).toBe(true)
      expect(partnerSupportsJurisdiction(partner, 'AU-VIC')).toBe(false)
    })
  })
})
