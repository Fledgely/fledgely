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
  ESCALATION_TYPE,
  REPORTING_PROTOCOL,
  LEGAL_REQUEST_TYPE,
  LEGAL_REQUEST_STATUS,
  // Schemas
  crisisPartnerSchema,
  signalRoutingPayloadSchema,
  signalRoutingResultSchema,
  blackoutRecordSchema,
  jurisdictionCoverageSchema,
  mandatoryReportingCapabilitySchema,
  signalEscalationSchema,
  legalRequestSchema,
  enhancedSignalRoutingPayloadSchema,
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
  generateEscalationId,
  generateLegalRequestId,
  createSignalEscalation,
  createLegalRequest,
  createEnhancedSignalRoutingPayload,
  createJurisdictionCoverage,
  createMandatoryReportingCapability,
  // Validation functions
  validateCrisisPartner,
  validateSignalRoutingPayload,
  validateSignalRoutingResult,
  isCrisisPartner,
  isSignalRoutingPayload,
  validateSignalEscalation,
  validateLegalRequest,
  isSignalEscalation,
  isLegalRequest,
  // Utility functions
  calculateChildAge,
  isValidJurisdiction,
  partnerSupportsJurisdiction,
  partnerSupportsMandatoryReporting,
  getMandatoryReportingPartners,
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

  // ============================================
  // Story 7.5.5: Mandatory Reporter Pathway Tests
  // ============================================

  describe('ESCALATION_TYPE (Story 7.5.5)', () => {
    it('should define assessment type', () => {
      expect(ESCALATION_TYPE.ASSESSMENT).toBe('assessment')
    })

    it('should define mandatory_report type', () => {
      expect(ESCALATION_TYPE.MANDATORY_REPORT).toBe('mandatory_report')
    })

    it('should define law_enforcement_referral type', () => {
      expect(ESCALATION_TYPE.LAW_ENFORCEMENT_REFERRAL).toBe('law_enforcement_referral')
    })
  })

  describe('REPORTING_PROTOCOL (Story 7.5.5)', () => {
    it('should define partner_direct protocol', () => {
      expect(REPORTING_PROTOCOL.PARTNER_DIRECT).toBe('partner_direct')
    })

    it('should define partner_coordinated protocol', () => {
      expect(REPORTING_PROTOCOL.PARTNER_COORDINATED).toBe('partner_coordinated')
    })
  })

  describe('LEGAL_REQUEST_TYPE (Story 7.5.5)', () => {
    it('should define subpoena type', () => {
      expect(LEGAL_REQUEST_TYPE.SUBPOENA).toBe('subpoena')
    })

    it('should define warrant type', () => {
      expect(LEGAL_REQUEST_TYPE.WARRANT).toBe('warrant')
    })

    it('should define court_order type', () => {
      expect(LEGAL_REQUEST_TYPE.COURT_ORDER).toBe('court_order')
    })

    it('should define emergency_disclosure type', () => {
      expect(LEGAL_REQUEST_TYPE.EMERGENCY_DISCLOSURE).toBe('emergency_disclosure')
    })
  })

  describe('LEGAL_REQUEST_STATUS (Story 7.5.5)', () => {
    it('should define pending_legal_review status', () => {
      expect(LEGAL_REQUEST_STATUS.PENDING_LEGAL_REVIEW).toBe('pending_legal_review')
    })

    it('should define approved status', () => {
      expect(LEGAL_REQUEST_STATUS.APPROVED).toBe('approved')
    })

    it('should define denied status', () => {
      expect(LEGAL_REQUEST_STATUS.DENIED).toBe('denied')
    })

    it('should define fulfilled status', () => {
      expect(LEGAL_REQUEST_STATUS.FULFILLED).toBe('fulfilled')
    })
  })

  // ============================================
  // JurisdictionCoverage Tests (Story 7.5.5 Task 1)
  // ============================================

  describe('jurisdictionCoverageSchema (Story 7.5.5)', () => {
    const validCoverage = {
      jurisdictionCode: 'US-CA',
      mandatoryReporterCategories: ['healthcare', 'social_work', 'counseling'],
      reportingAgency: 'DCFS',
      reportingHotline: '+18005221313',
    }

    it('should validate a valid jurisdiction coverage', () => {
      const result = jurisdictionCoverageSchema.safeParse(validCoverage)
      expect(result.success).toBe(true)
    })

    it('should require jurisdictionCode', () => {
      const invalid = { ...validCoverage, jurisdictionCode: '' }
      const result = jurisdictionCoverageSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should require at least one mandatoryReporterCategory', () => {
      const invalid = { ...validCoverage, mandatoryReporterCategories: [] }
      const result = jurisdictionCoverageSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should require reportingAgency', () => {
      const invalid = { ...validCoverage, reportingAgency: '' }
      const result = jurisdictionCoverageSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should allow null reportingHotline', () => {
      const valid = { ...validCoverage, reportingHotline: null }
      const result = jurisdictionCoverageSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })
  })

  // ============================================
  // MandatoryReportingCapability Tests (Story 7.5.5 Task 1)
  // ============================================

  describe('mandatoryReportingCapabilitySchema (Story 7.5.5)', () => {
    const validCapability = {
      partnerId: 'partner_123',
      supportedJurisdictions: [
        {
          jurisdictionCode: 'US-CA',
          mandatoryReporterCategories: ['healthcare', 'counseling'],
          reportingAgency: 'DCFS',
          reportingHotline: '+18005221313',
        },
      ],
      reportingProtocol: 'partner_direct' as const,
      requiresExtendedBlackout: false,
      averageResponseTimeHours: 24,
    }

    it('should validate a valid mandatory reporting capability', () => {
      const result = mandatoryReportingCapabilitySchema.safeParse(validCapability)
      expect(result.success).toBe(true)
    })

    it('should require partnerId', () => {
      const invalid = { ...validCapability, partnerId: '' }
      const result = mandatoryReportingCapabilitySchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should require at least one supported jurisdiction', () => {
      const invalid = { ...validCapability, supportedJurisdictions: [] }
      const result = mandatoryReportingCapabilitySchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should validate reportingProtocol values', () => {
      const invalid = { ...validCapability, reportingProtocol: 'invalid_protocol' }
      const result = mandatoryReportingCapabilitySchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should allow partner_coordinated protocol', () => {
      const coordinated = { ...validCapability, reportingProtocol: 'partner_coordinated' as const }
      const result = mandatoryReportingCapabilitySchema.safeParse(coordinated)
      expect(result.success).toBe(true)
    })

    it('should allow null averageResponseTimeHours', () => {
      const valid = { ...validCapability, averageResponseTimeHours: null }
      const result = mandatoryReportingCapabilitySchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('should require positive averageResponseTimeHours when provided', () => {
      const invalid = { ...validCapability, averageResponseTimeHours: -5 }
      const result = mandatoryReportingCapabilitySchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })
  })

  // ============================================
  // SignalEscalation Tests (Story 7.5.5 Task 1)
  // ============================================

  describe('signalEscalationSchema (Story 7.5.5)', () => {
    const validEscalation = {
      id: 'esc_123',
      signalId: 'sig_456',
      partnerId: 'partner_789',
      escalationType: 'assessment' as const,
      escalatedAt: new Date(),
      jurisdiction: 'US-CA',
      sealed: false,
      sealedAt: null,
    }

    it('should validate a valid signal escalation', () => {
      const result = signalEscalationSchema.safeParse(validEscalation)
      expect(result.success).toBe(true)
    })

    it('should require signalId', () => {
      const invalid = { ...validEscalation, signalId: '' }
      const result = signalEscalationSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should require partnerId', () => {
      const invalid = { ...validEscalation, partnerId: '' }
      const result = signalEscalationSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should validate escalationType values', () => {
      const invalid = { ...validEscalation, escalationType: 'invalid_type' }
      const result = signalEscalationSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should allow mandatory_report escalationType', () => {
      const mandatory = { ...validEscalation, escalationType: 'mandatory_report' as const }
      const result = signalEscalationSchema.safeParse(mandatory)
      expect(result.success).toBe(true)
    })

    it('should allow law_enforcement_referral escalationType', () => {
      const lawEnforcement = {
        ...validEscalation,
        escalationType: 'law_enforcement_referral' as const,
      }
      const result = signalEscalationSchema.safeParse(lawEnforcement)
      expect(result.success).toBe(true)
    })

    it('should require jurisdiction', () => {
      const invalid = { ...validEscalation, jurisdiction: '' }
      const result = signalEscalationSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should allow sealed to be true with sealedAt', () => {
      const sealed = { ...validEscalation, sealed: true, sealedAt: new Date() }
      const result = signalEscalationSchema.safeParse(sealed)
      expect(result.success).toBe(true)
    })
  })

  // ============================================
  // LegalRequest Tests (Story 7.5.5 Task 1)
  // ============================================

  describe('legalRequestSchema (Story 7.5.5)', () => {
    const validRequest = {
      id: 'legal_123',
      requestType: 'subpoena' as const,
      requestingAgency: 'County District Attorney',
      jurisdiction: 'US-CA',
      documentReference: 'CASE-2024-12345',
      receivedAt: new Date(),
      signalIds: ['sig_456', 'sig_789'],
      status: 'pending_legal_review' as const,
      fulfilledAt: null,
      fulfilledBy: null,
    }

    it('should validate a valid legal request', () => {
      const result = legalRequestSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
    })

    it('should require requestType', () => {
      const invalid = { ...validRequest, requestType: 'invalid_type' }
      const result = legalRequestSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should allow all valid request types', () => {
      const types = ['subpoena', 'warrant', 'court_order', 'emergency_disclosure'] as const
      types.forEach((type) => {
        const valid = { ...validRequest, requestType: type }
        const result = legalRequestSchema.safeParse(valid)
        expect(result.success).toBe(true)
      })
    })

    it('should require requestingAgency', () => {
      const invalid = { ...validRequest, requestingAgency: '' }
      const result = legalRequestSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should require documentReference', () => {
      const invalid = { ...validRequest, documentReference: '' }
      const result = legalRequestSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should require at least one signalId', () => {
      const invalid = { ...validRequest, signalIds: [] }
      const result = legalRequestSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should validate status values', () => {
      const invalid = { ...validRequest, status: 'invalid_status' }
      const result = legalRequestSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should allow fulfilled request with fulfilledAt and fulfilledBy', () => {
      const fulfilled = {
        ...validRequest,
        status: 'fulfilled' as const,
        fulfilledAt: new Date(),
        fulfilledBy: 'admin_user_123',
      }
      const result = legalRequestSchema.safeParse(fulfilled)
      expect(result.success).toBe(true)
    })
  })

  // ============================================
  // EnhancedSignalRoutingPayload Tests (Story 7.5.5 Task 1)
  // ============================================

  describe('enhancedSignalRoutingPayloadSchema (Story 7.5.5)', () => {
    const validEnhancedPayload = {
      signalId: 'sig_123',
      childAge: 12,
      signalTimestamp: new Date(),
      familyStructure: 'two_parent' as const,
      jurisdiction: 'US-CA',
      platform: 'web' as const,
      triggerMethod: 'logo_tap' as const,
      deviceId: 'device_abc',
      jurisdictionDetails: {
        code: 'US-CA',
        country: 'US',
        stateProvince: 'CA',
        hasMandatoryReporting: true,
        mandatoryReporterCategories: ['healthcare', 'counseling'],
      },
      requestedCapabilities: ['crisis_counseling', 'mandatory_reporting'] as const,
    }

    it('should validate a valid enhanced routing payload', () => {
      const result = enhancedSignalRoutingPayloadSchema.safeParse(validEnhancedPayload)
      expect(result.success).toBe(true)
    })

    it('should require jurisdictionDetails', () => {
      const { jurisdictionDetails: _jurisdictionDetails, ...withoutDetails } = validEnhancedPayload
      const result = enhancedSignalRoutingPayloadSchema.safeParse(withoutDetails)
      expect(result.success).toBe(false)
    })

    it('should require jurisdictionDetails.code', () => {
      const invalid = {
        ...validEnhancedPayload,
        jurisdictionDetails: { ...validEnhancedPayload.jurisdictionDetails, code: '' },
      }
      const result = enhancedSignalRoutingPayloadSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should require jurisdictionDetails.country', () => {
      const invalid = {
        ...validEnhancedPayload,
        jurisdictionDetails: { ...validEnhancedPayload.jurisdictionDetails, country: '' },
      }
      const result = enhancedSignalRoutingPayloadSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should allow null stateProvince', () => {
      const valid = {
        ...validEnhancedPayload,
        jurisdictionDetails: { ...validEnhancedPayload.jurisdictionDetails, stateProvince: null },
      }
      const result = enhancedSignalRoutingPayloadSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('should require requestedCapabilities', () => {
      const { requestedCapabilities: _requestedCapabilities, ...withoutCapabilities } =
        validEnhancedPayload
      const result = enhancedSignalRoutingPayloadSchema.safeParse(withoutCapabilities)
      expect(result.success).toBe(false)
    })

    it('should allow empty mandatoryReporterCategories when no mandatory reporting', () => {
      const valid = {
        ...validEnhancedPayload,
        jurisdictionDetails: {
          ...validEnhancedPayload.jurisdictionDetails,
          hasMandatoryReporting: false,
          mandatoryReporterCategories: [],
        },
      }
      const result = enhancedSignalRoutingPayloadSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })
  })

  // ============================================
  // Factory Function Tests (Story 7.5.5)
  // ============================================

  describe('generateEscalationId (Story 7.5.5)', () => {
    it('should generate unique IDs', () => {
      const id1 = generateEscalationId()
      const id2 = generateEscalationId()
      expect(id1).not.toBe(id2)
    })

    it('should start with esc_ prefix', () => {
      const id = generateEscalationId()
      expect(id.startsWith('esc_')).toBe(true)
    })
  })

  describe('generateLegalRequestId (Story 7.5.5)', () => {
    it('should generate unique IDs', () => {
      const id1 = generateLegalRequestId()
      const id2 = generateLegalRequestId()
      expect(id1).not.toBe(id2)
    })

    it('should start with legal_ prefix', () => {
      const id = generateLegalRequestId()
      expect(id.startsWith('legal_')).toBe(true)
    })
  })

  describe('createSignalEscalation (Story 7.5.5)', () => {
    it('should create a valid signal escalation', () => {
      const escalation = createSignalEscalation('sig_123', 'partner_456', 'assessment', 'US-CA')

      expect(escalation.signalId).toBe('sig_123')
      expect(escalation.partnerId).toBe('partner_456')
      expect(escalation.escalationType).toBe('assessment')
      expect(escalation.jurisdiction).toBe('US-CA')
      expect(escalation.sealed).toBe(false)
      expect(escalation.sealedAt).toBeNull()
    })

    it('should set escalatedAt timestamp', () => {
      const before = new Date()
      const escalation = createSignalEscalation('sig_123', 'partner_456', 'mandatory_report', 'UK')
      const after = new Date()

      expect(escalation.escalatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(escalation.escalatedAt.getTime()).toBeLessThanOrEqual(after.getTime())
    })

    it('should generate unique id', () => {
      const esc1 = createSignalEscalation('sig_123', 'partner_456', 'assessment', 'US-CA')
      const esc2 = createSignalEscalation('sig_123', 'partner_456', 'assessment', 'US-CA')
      expect(esc1.id).not.toBe(esc2.id)
    })
  })

  describe('createLegalRequest (Story 7.5.5)', () => {
    it('should create a valid legal request', () => {
      const request = createLegalRequest('subpoena', 'County DA', 'US-CA', 'CASE-12345', [
        'sig_123',
        'sig_456',
      ])

      expect(request.requestType).toBe('subpoena')
      expect(request.requestingAgency).toBe('County DA')
      expect(request.jurisdiction).toBe('US-CA')
      expect(request.documentReference).toBe('CASE-12345')
      expect(request.signalIds).toEqual(['sig_123', 'sig_456'])
      expect(request.status).toBe('pending_legal_review')
      expect(request.fulfilledAt).toBeNull()
      expect(request.fulfilledBy).toBeNull()
    })

    it('should set receivedAt timestamp', () => {
      const before = new Date()
      const request = createLegalRequest('warrant', 'FBI', 'US', 'WARRANT-789', ['sig_100'])
      const after = new Date()

      expect(request.receivedAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(request.receivedAt.getTime()).toBeLessThanOrEqual(after.getTime())
    })

    it('should generate unique id', () => {
      const req1 = createLegalRequest('subpoena', 'DA', 'US', 'CASE-1', ['sig_1'])
      const req2 = createLegalRequest('subpoena', 'DA', 'US', 'CASE-1', ['sig_1'])
      expect(req1.id).not.toBe(req2.id)
    })
  })

  describe('createEnhancedSignalRoutingPayload (Story 7.5.5)', () => {
    it('should create a valid enhanced routing payload', () => {
      const birthDate = new Date('2012-06-15')
      const payload = createEnhancedSignalRoutingPayload(
        'sig_123',
        birthDate,
        'two_parent',
        'US-CA',
        'web',
        'logo_tap',
        'device_abc',
        {
          code: 'US-CA',
          country: 'US',
          stateProvince: 'CA',
          hasMandatoryReporting: true,
          mandatoryReporterCategories: ['healthcare', 'counseling'],
        },
        ['crisis_counseling', 'mandatory_reporting']
      )

      expect(payload.signalId).toBe('sig_123')
      expect(payload.familyStructure).toBe('two_parent')
      expect(payload.jurisdictionDetails.code).toBe('US-CA')
      expect(payload.jurisdictionDetails.hasMandatoryReporting).toBe(true)
      expect(payload.requestedCapabilities).toEqual(['crisis_counseling', 'mandatory_reporting'])
    })

    it('should calculate child age correctly', () => {
      const tenYearsAgo = new Date()
      tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10)

      const payload = createEnhancedSignalRoutingPayload(
        'sig_123',
        tenYearsAgo,
        'single_parent',
        'UK',
        'chrome_extension',
        'keyboard_shortcut',
        null,
        {
          code: 'UK',
          country: 'UK',
          stateProvince: null,
          hasMandatoryReporting: true,
          mandatoryReporterCategories: ['healthcare'],
        },
        ['crisis_counseling']
      )

      expect(payload.childAge).toBe(10)
    })
  })

  describe('createJurisdictionCoverage (Story 7.5.5)', () => {
    it('should create valid jurisdiction coverage', () => {
      const coverage = createJurisdictionCoverage(
        'US-CA',
        ['healthcare', 'social_work'],
        'DCFS',
        '+18005221313'
      )

      expect(coverage.jurisdictionCode).toBe('US-CA')
      expect(coverage.mandatoryReporterCategories).toEqual(['healthcare', 'social_work'])
      expect(coverage.reportingAgency).toBe('DCFS')
      expect(coverage.reportingHotline).toBe('+18005221313')
    })

    it('should allow null hotline', () => {
      const coverage = createJurisdictionCoverage('UK', ['healthcare'], 'NSPCC', null)

      expect(coverage.reportingHotline).toBeNull()
    })
  })

  describe('createMandatoryReportingCapability (Story 7.5.5)', () => {
    it('should create valid mandatory reporting capability', () => {
      const coverages = [createJurisdictionCoverage('US-CA', ['healthcare'], 'DCFS', null)]
      const capability = createMandatoryReportingCapability(
        'partner_123',
        coverages,
        'partner_direct',
        false,
        24
      )

      expect(capability.partnerId).toBe('partner_123')
      expect(capability.supportedJurisdictions).toEqual(coverages)
      expect(capability.reportingProtocol).toBe('partner_direct')
      expect(capability.requiresExtendedBlackout).toBe(false)
      expect(capability.averageResponseTimeHours).toBe(24)
    })

    it('should allow null averageResponseTimeHours', () => {
      const coverages = [createJurisdictionCoverage('UK', ['healthcare'], 'NSPCC', null)]
      const capability = createMandatoryReportingCapability(
        'partner_456',
        coverages,
        'partner_coordinated',
        true,
        null
      )

      expect(capability.averageResponseTimeHours).toBeNull()
    })
  })

  // ============================================
  // Validation Function Tests (Story 7.5.5)
  // ============================================

  describe('validateSignalEscalation (Story 7.5.5)', () => {
    it('should return valid escalation unchanged', () => {
      const escalation = createSignalEscalation('sig_123', 'partner_456', 'assessment', 'US-CA')
      const validated = validateSignalEscalation(escalation)
      expect(validated).toEqual(escalation)
    })

    it('should throw on invalid escalation', () => {
      expect(() => validateSignalEscalation({ invalid: true })).toThrow()
    })
  })

  describe('validateLegalRequest (Story 7.5.5)', () => {
    it('should return valid legal request unchanged', () => {
      const request = createLegalRequest('subpoena', 'DA', 'US', 'CASE-1', ['sig_1'])
      const validated = validateLegalRequest(request)
      expect(validated).toEqual(request)
    })

    it('should throw on invalid legal request', () => {
      expect(() => validateLegalRequest({ invalid: true })).toThrow()
    })
  })

  describe('isSignalEscalation (Story 7.5.5)', () => {
    it('should return true for valid escalation', () => {
      const escalation = createSignalEscalation('sig_123', 'partner_456', 'assessment', 'US-CA')
      expect(isSignalEscalation(escalation)).toBe(true)
    })

    it('should return false for invalid data', () => {
      expect(isSignalEscalation({ invalid: true })).toBe(false)
      expect(isSignalEscalation(null)).toBe(false)
    })
  })

  describe('isLegalRequest (Story 7.5.5)', () => {
    it('should return true for valid legal request', () => {
      const request = createLegalRequest('subpoena', 'DA', 'US', 'CASE-1', ['sig_1'])
      expect(isLegalRequest(request)).toBe(true)
    })

    it('should return false for invalid data', () => {
      expect(isLegalRequest({ invalid: true })).toBe(false)
      expect(isLegalRequest(null)).toBe(false)
    })
  })

  // ============================================
  // Utility Function Tests (Story 7.5.5)
  // ============================================

  describe('partnerSupportsMandatoryReporting (Story 7.5.5)', () => {
    it('should return true if partner has mandatory_reporting capability', () => {
      const partner = createCrisisPartner(
        'Crisis Center',
        'https://crisis.example.com/webhook',
        'hashed_key_123',
        ['US-CA'],
        ['crisis_counseling', 'mandatory_reporting']
      )

      expect(partnerSupportsMandatoryReporting(partner)).toBe(true)
    })

    it('should return false if partner lacks mandatory_reporting capability', () => {
      const partner = createCrisisPartner(
        'Crisis Center',
        'https://crisis.example.com/webhook',
        'hashed_key_123',
        ['US-CA'],
        ['crisis_counseling']
      )

      expect(partnerSupportsMandatoryReporting(partner)).toBe(false)
    })
  })

  describe('getMandatoryReportingPartners (Story 7.5.5)', () => {
    it('should filter partners with mandatory_reporting capability', () => {
      const partner1 = createCrisisPartner(
        'Crisis Center 1',
        'https://crisis1.example.com/webhook',
        'key1',
        ['US'],
        ['crisis_counseling', 'mandatory_reporting']
      )

      const partner2 = createCrisisPartner(
        'Crisis Center 2',
        'https://crisis2.example.com/webhook',
        'key2',
        ['US'],
        ['crisis_counseling']
      )

      const partner3 = createCrisisPartner(
        'Crisis Center 3',
        'https://crisis3.example.com/webhook',
        'key3',
        ['UK'],
        ['mandatory_reporting']
      )

      const partners = [partner1, partner2, partner3]
      const mandatoryPartners = getMandatoryReportingPartners(partners)

      expect(mandatoryPartners).toHaveLength(2)
      expect(mandatoryPartners.map((p) => p.name)).toContain('Crisis Center 1')
      expect(mandatoryPartners.map((p) => p.name)).toContain('Crisis Center 3')
      expect(mandatoryPartners.map((p) => p.name)).not.toContain('Crisis Center 2')
    })

    it('should return empty array when no partners have mandatory_reporting', () => {
      const partner = createCrisisPartner(
        'Crisis Center',
        'https://crisis.example.com/webhook',
        'key',
        ['US'],
        ['crisis_counseling']
      )

      expect(getMandatoryReportingPartners([partner])).toEqual([])
    })
  })
})
