/**
 * External Signal Routing Schema Tests
 *
 * Story 7.5.2: External Signal Routing
 *
 * Tests for external signal routing schemas, including:
 * - Payload minimization (forbidden field rejection)
 * - Partner configuration validation
 * - Blackout management
 * - Routing helper functions
 */

import { describe, it, expect } from 'vitest'
import {
  // Constants
  EXTERNAL_ROUTING_CONSTANTS,
  PARTNER_STATUS_LABELS,
  ROUTING_STATUS_LABELS,
  BLACKOUT_STATUS_LABELS,
  // Schemas
  externalSignalPayloadSchema,
  crisisPartnerConfigSchema,
  partnerRegistrySchema,
  signalRoutingRecordSchema,
  signalBlackoutSchema,
  encryptedSignalPackageSchema,
  partnerWebhookPayloadSchema,
  routeSignalInputSchema,
  // Helper functions
  validatePayloadExclusions,
  getPartnerStatusLabel,
  getRoutingStatusLabel,
  getBlackoutStatusLabel,
  safeParseExternalSignalPayload,
  validateExternalSignalPayload,
  safeParseCrisisPartnerConfig,
  safeParseSignalRoutingRecord,
  safeParseSignalBlackout,
  isBlackoutActive,
  getRemainingBlackoutMs,
  createBlackout,
  createExternalPayload,
  generateSignalRef,
  isPartnerKeyExpiringSoon,
  isPartnerAvailable,
  findPartnerForJurisdiction,
  // Types
  type CrisisPartnerConfig,
  type PartnerRegistry,
  type SignalBlackout,
} from './externalSignalRouting.schema'

// ============================================================================
// Constants Tests
// ============================================================================

describe('External Routing Constants', () => {
  it('has correct blackout duration (48 hours)', () => {
    expect(EXTERNAL_ROUTING_CONSTANTS.MIN_BLACKOUT_MS).toBe(48 * 60 * 60 * 1000)
    expect(EXTERNAL_ROUTING_CONSTANTS.DEFAULT_BLACKOUT_MS).toBe(48 * 60 * 60 * 1000)
  })

  it('has all required collections defined', () => {
    expect(EXTERNAL_ROUTING_CONSTANTS.BLACKOUT_COLLECTION).toBe('signal-blackouts')
    expect(EXTERNAL_ROUTING_CONSTANTS.PARTNER_CONFIG_COLLECTION).toBe('crisis-partners')
    expect(EXTERNAL_ROUTING_CONSTANTS.ROUTING_LOG_COLLECTION).toBe('signal-routing-logs')
  })

  it('has correct encryption settings', () => {
    expect(EXTERNAL_ROUTING_CONSTANTS.ENCRYPTION_ALGORITHM).toBe('RSA-OAEP')
    expect(EXTERNAL_ROUTING_CONSTANTS.AES_KEY_LENGTH).toBe(256)
  })
})

describe('Label Constants', () => {
  it('has partner status labels', () => {
    expect(PARTNER_STATUS_LABELS.active).toBe('Active')
    expect(PARTNER_STATUS_LABELS.inactive).toBe('Inactive')
    expect(PARTNER_STATUS_LABELS.suspended).toBe('Suspended')
  })

  it('has routing status labels', () => {
    expect(ROUTING_STATUS_LABELS.pending).toBe('Pending')
    expect(ROUTING_STATUS_LABELS.sending).toBe('Sending')
    expect(ROUTING_STATUS_LABELS.acknowledged).toBe('Acknowledged')
    expect(ROUTING_STATUS_LABELS.failed).toBe('Failed')
  })

  it('has blackout status labels', () => {
    expect(BLACKOUT_STATUS_LABELS.active).toBe('Active')
    expect(BLACKOUT_STATUS_LABELS.expired).toBe('Expired')
    expect(BLACKOUT_STATUS_LABELS.extended).toBe('Extended')
  })
})

// ============================================================================
// External Signal Payload Tests (Critical - INV-002)
// ============================================================================

describe('ExternalSignalPayload Schema', () => {
  const validPayload = {
    signalId: 'sig_123456789',
    childAge: 12,
    hasSharedCustody: true,
    signalTimestamp: '2024-01-15T10:30:00.000Z',
    jurisdiction: 'US-CA',
    devicePlatform: 'web' as const,
  }

  it('accepts valid payload', () => {
    const result = externalSignalPayloadSchema.safeParse(validPayload)
    expect(result.success).toBe(true)
  })

  it('accepts all valid device platforms', () => {
    const platforms = ['web', 'chrome', 'android', 'ios'] as const
    for (const platform of platforms) {
      const payload = { ...validPayload, devicePlatform: platform }
      const result = externalSignalPayloadSchema.safeParse(payload)
      expect(result.success).toBe(true)
    }
  })

  it('requires signalId', () => {
    const { signalId, ...payload } = validPayload
    const result = externalSignalPayloadSchema.safeParse(payload)
    expect(result.success).toBe(false)
  })

  it('validates childAge range (1-25)', () => {
    // Valid ages
    expect(externalSignalPayloadSchema.safeParse({ ...validPayload, childAge: 1 }).success).toBe(true)
    expect(externalSignalPayloadSchema.safeParse({ ...validPayload, childAge: 25 }).success).toBe(true)

    // Invalid ages
    expect(externalSignalPayloadSchema.safeParse({ ...validPayload, childAge: 0 }).success).toBe(false)
    expect(externalSignalPayloadSchema.safeParse({ ...validPayload, childAge: 26 }).success).toBe(false)
    expect(externalSignalPayloadSchema.safeParse({ ...validPayload, childAge: -1 }).success).toBe(false)
  })

  it('requires boolean for hasSharedCustody', () => {
    expect(externalSignalPayloadSchema.safeParse({ ...validPayload, hasSharedCustody: false }).success).toBe(true)
    expect(externalSignalPayloadSchema.safeParse({ ...validPayload, hasSharedCustody: 'yes' }).success).toBe(false)
  })

  it('validates jurisdiction format', () => {
    // Valid jurisdictions
    expect(externalSignalPayloadSchema.safeParse({ ...validPayload, jurisdiction: 'US' }).success).toBe(true)
    expect(externalSignalPayloadSchema.safeParse({ ...validPayload, jurisdiction: 'US-CA' }).success).toBe(true)
    // US-NATIONAL is 11 chars, which exceeds max(10), so we test a shorter one
    expect(externalSignalPayloadSchema.safeParse({ ...validPayload, jurisdiction: 'US-NAT' }).success).toBe(true)
    expect(externalSignalPayloadSchema.safeParse({ ...validPayload, jurisdiction: 'GB' }).success).toBe(true)

    // Invalid jurisdictions (too short/long)
    expect(externalSignalPayloadSchema.safeParse({ ...validPayload, jurisdiction: 'U' }).success).toBe(false)
    expect(externalSignalPayloadSchema.safeParse({ ...validPayload, jurisdiction: 'US-CALIFORNIA-EXTRA' }).success).toBe(false)
  })
})

// ============================================================================
// Payload Exclusion Validation Tests (Critical Security)
// ============================================================================

describe('validatePayloadExclusions', () => {
  it('passes for valid minimal payload', () => {
    const validData = {
      signalId: 'sig_123',
      childAge: 12,
      hasSharedCustody: true,
    }
    const result = validatePayloadExclusions(validData)
    expect(result.valid).toBe(true)
    expect(result.forbiddenFields).toHaveLength(0)
  })

  it('rejects parentId', () => {
    const result = validatePayloadExclusions({ parentId: 'parent_123' })
    expect(result.valid).toBe(false)
    expect(result.forbiddenFields).toContain('parentId')
  })

  it('rejects familyId', () => {
    const result = validatePayloadExclusions({ familyId: 'family_123' })
    expect(result.valid).toBe(false)
    expect(result.forbiddenFields).toContain('familyId')
  })

  it('rejects childId (we use signalId instead)', () => {
    const result = validatePayloadExclusions({ childId: 'child_123' })
    expect(result.valid).toBe(false)
    expect(result.forbiddenFields).toContain('childId')
  })

  it('rejects name fields', () => {
    const result1 = validatePayloadExclusions({ childName: 'John' })
    expect(result1.valid).toBe(false)
    expect(result1.forbiddenFields).toContain('childName')

    const result2 = validatePayloadExclusions({ firstName: 'John' })
    expect(result2.valid).toBe(false)
    expect(result2.forbiddenFields).toContain('firstName')

    const result3 = validatePayloadExclusions({ lastName: 'Doe' })
    expect(result3.valid).toBe(false)
    expect(result3.forbiddenFields).toContain('lastName')
  })

  it('rejects contact information', () => {
    const result1 = validatePayloadExclusions({ email: 'test@example.com' })
    expect(result1.valid).toBe(false)
    expect(result1.forbiddenFields).toContain('email')

    const result2 = validatePayloadExclusions({ phone: '555-1234' })
    expect(result2.valid).toBe(false)
    expect(result2.forbiddenFields).toContain('phone')

    const result3 = validatePayloadExclusions({ phoneNumber: '555-1234' })
    expect(result3.valid).toBe(false)
    expect(result3.forbiddenFields).toContain('phoneNumber')
  })

  it('rejects screenshot data', () => {
    const result1 = validatePayloadExclusions({ screenshot: 'base64...' })
    expect(result1.valid).toBe(false)
    expect(result1.forbiddenFields).toContain('screenshot')

    const result2 = validatePayloadExclusions({ screenshots: [] })
    expect(result2.valid).toBe(false)
    expect(result2.forbiddenFields).toContain('screenshots')
  })

  it('rejects activity data', () => {
    const result1 = validatePayloadExclusions({ activityData: {} })
    expect(result1.valid).toBe(false)
    expect(result1.forbiddenFields).toContain('activityData')

    const result2 = validatePayloadExclusions({ activity: {} })
    expect(result2.valid).toBe(false)
    expect(result2.forbiddenFields).toContain('activity')

    const result3 = validatePayloadExclusions({ browsingHistory: [] })
    expect(result3.valid).toBe(false)
    expect(result3.forbiddenFields).toContain('browsingHistory')

    const result4 = validatePayloadExclusions({ urls: [] })
    expect(result4.valid).toBe(false)
    expect(result4.forbiddenFields).toContain('urls')
  })

  it('rejects location data (only jurisdiction allowed)', () => {
    const result1 = validatePayloadExclusions({ address: '123 Main St' })
    expect(result1.valid).toBe(false)
    expect(result1.forbiddenFields).toContain('address')

    const result2 = validatePayloadExclusions({ location: { lat: 0, lng: 0 } })
    expect(result2.valid).toBe(false)
    expect(result2.forbiddenFields).toContain('location')

    const result3 = validatePayloadExclusions({ coordinates: [0, 0] })
    expect(result3.valid).toBe(false)
    expect(result3.forbiddenFields).toContain('coordinates')
  })

  it('rejects device identifiers', () => {
    const result = validatePayloadExclusions({ deviceId: 'device_123' })
    expect(result.valid).toBe(false)
    expect(result.forbiddenFields).toContain('deviceId')
  })

  it('rejects user identifiers', () => {
    const result = validatePayloadExclusions({ userId: 'user_123' })
    expect(result.valid).toBe(false)
    expect(result.forbiddenFields).toContain('userId')
  })

  it('reports all forbidden fields when multiple present', () => {
    const result = validatePayloadExclusions({
      parentId: 'parent_123',
      familyId: 'family_123',
      email: 'test@example.com',
      screenshot: 'base64...',
    })
    expect(result.valid).toBe(false)
    expect(result.forbiddenFields).toHaveLength(4)
    expect(result.forbiddenFields).toContain('parentId')
    expect(result.forbiddenFields).toContain('familyId')
    expect(result.forbiddenFields).toContain('email')
    expect(result.forbiddenFields).toContain('screenshot')
  })
})

// ============================================================================
// Crisis Partner Config Tests
// ============================================================================

describe('CrisisPartnerConfig Schema', () => {
  const validPartner: CrisisPartnerConfig = {
    partnerId: 'partner_crisis_line',
    name: 'National Crisis Line',
    description: 'National crisis support service',
    status: 'active',
    webhookUrl: 'https://crisis-partner.org/webhook',
    publicKey: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...'.padEnd(150, 'x'),
    jurisdictions: ['US-CA', 'US-TX', 'US-NY'],
    isFallback: false,
    priority: 1,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    keyExpiresAt: '2025-01-01T00:00:00.000Z',
  }

  it('accepts valid partner config', () => {
    const result = crisisPartnerConfigSchema.safeParse(validPartner)
    expect(result.success).toBe(true)
  })

  it('requires valid webhook URL', () => {
    const result = crisisPartnerConfigSchema.safeParse({
      ...validPartner,
      webhookUrl: 'not-a-url',
    })
    expect(result.success).toBe(false)
  })

  it('requires public key minimum length', () => {
    const result = crisisPartnerConfigSchema.safeParse({
      ...validPartner,
      publicKey: 'short',
    })
    expect(result.success).toBe(false)
  })

  it('validates partner status enum', () => {
    expect(crisisPartnerConfigSchema.safeParse({ ...validPartner, status: 'active' }).success).toBe(true)
    expect(crisisPartnerConfigSchema.safeParse({ ...validPartner, status: 'inactive' }).success).toBe(true)
    expect(crisisPartnerConfigSchema.safeParse({ ...validPartner, status: 'suspended' }).success).toBe(true)
    expect(crisisPartnerConfigSchema.safeParse({ ...validPartner, status: 'invalid' }).success).toBe(false)
  })

  it('accepts null keyExpiresAt', () => {
    const result = crisisPartnerConfigSchema.safeParse({
      ...validPartner,
      keyExpiresAt: null,
    })
    expect(result.success).toBe(true)
  })
})

// ============================================================================
// Signal Blackout Tests
// ============================================================================

describe('SignalBlackout Schema', () => {
  const validBlackout: SignalBlackout = {
    id: 'blackout_123',
    childId: 'child_123',
    signalId: 'sig_123',
    status: 'active',
    startedAt: '2024-01-15T10:00:00.000Z',
    expiresAt: '2024-01-17T10:00:00.000Z',
    extendedAt: null,
    extensionReason: null,
  }

  it('accepts valid blackout', () => {
    const result = signalBlackoutSchema.safeParse(validBlackout)
    expect(result.success).toBe(true)
  })

  it('validates blackout status enum', () => {
    expect(signalBlackoutSchema.safeParse({ ...validBlackout, status: 'active' }).success).toBe(true)
    expect(signalBlackoutSchema.safeParse({ ...validBlackout, status: 'expired' }).success).toBe(true)
    expect(signalBlackoutSchema.safeParse({ ...validBlackout, status: 'extended' }).success).toBe(true)
    expect(signalBlackoutSchema.safeParse({ ...validBlackout, status: 'invalid' }).success).toBe(false)
  })

  it('accepts extension data', () => {
    const result = signalBlackoutSchema.safeParse({
      ...validBlackout,
      status: 'extended',
      extendedAt: '2024-01-17T10:00:00.000Z',
      extensionReason: 'Safety concern ongoing',
    })
    expect(result.success).toBe(true)
  })
})

// ============================================================================
// Helper Function Tests
// ============================================================================

describe('Label Helper Functions', () => {
  it('getPartnerStatusLabel returns correct labels', () => {
    expect(getPartnerStatusLabel('active')).toBe('Active')
    expect(getPartnerStatusLabel('inactive')).toBe('Inactive')
    expect(getPartnerStatusLabel('suspended')).toBe('Suspended')
  })

  it('getRoutingStatusLabel returns correct labels', () => {
    expect(getRoutingStatusLabel('pending')).toBe('Pending')
    expect(getRoutingStatusLabel('encrypting')).toBe('Encrypting')
    expect(getRoutingStatusLabel('sending')).toBe('Sending')
    expect(getRoutingStatusLabel('sent')).toBe('Sent')
    expect(getRoutingStatusLabel('acknowledged')).toBe('Acknowledged')
    expect(getRoutingStatusLabel('failed')).toBe('Failed')
  })

  it('getBlackoutStatusLabel returns correct labels', () => {
    expect(getBlackoutStatusLabel('active')).toBe('Active')
    expect(getBlackoutStatusLabel('expired')).toBe('Expired')
    expect(getBlackoutStatusLabel('extended')).toBe('Extended')
  })
})

describe('Safe Parse Functions', () => {
  it('safeParseExternalSignalPayload returns null for invalid', () => {
    expect(safeParseExternalSignalPayload(null)).toBeNull()
    expect(safeParseExternalSignalPayload({})).toBeNull()
    expect(safeParseExternalSignalPayload({ childAge: 'not a number' })).toBeNull()
  })

  it('safeParseExternalSignalPayload returns data for valid', () => {
    const payload = {
      signalId: 'sig_123',
      childAge: 12,
      hasSharedCustody: true,
      signalTimestamp: '2024-01-15T10:30:00.000Z',
      jurisdiction: 'US-CA',
      devicePlatform: 'web',
    }
    const result = safeParseExternalSignalPayload(payload)
    expect(result).not.toBeNull()
    expect(result?.signalId).toBe('sig_123')
  })

  it('validateExternalSignalPayload throws for invalid', () => {
    expect(() => validateExternalSignalPayload({})).toThrow()
  })
})

describe('isBlackoutActive', () => {
  it('returns true for active blackout with future expiry', () => {
    const blackout: SignalBlackout = {
      id: 'blackout_123',
      childId: 'child_123',
      signalId: 'sig_123',
      status: 'active',
      startedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      extendedAt: null,
      extensionReason: null,
    }
    expect(isBlackoutActive(blackout)).toBe(true)
  })

  it('returns false for expired status', () => {
    const blackout: SignalBlackout = {
      id: 'blackout_123',
      childId: 'child_123',
      signalId: 'sig_123',
      status: 'expired',
      startedAt: '2024-01-15T10:00:00.000Z',
      expiresAt: new Date(Date.now() + 3600000).toISOString(), // Even if expiry in future
      extendedAt: null,
      extensionReason: null,
    }
    expect(isBlackoutActive(blackout)).toBe(false)
  })

  it('returns false for past expiry', () => {
    const blackout: SignalBlackout = {
      id: 'blackout_123',
      childId: 'child_123',
      signalId: 'sig_123',
      status: 'active',
      startedAt: '2024-01-15T10:00:00.000Z',
      expiresAt: '2024-01-15T12:00:00.000Z', // Past
      extendedAt: null,
      extensionReason: null,
    }
    expect(isBlackoutActive(blackout)).toBe(false)
  })
})

describe('getRemainingBlackoutMs', () => {
  it('returns positive value for active blackout', () => {
    const blackout: SignalBlackout = {
      id: 'blackout_123',
      childId: 'child_123',
      signalId: 'sig_123',
      status: 'active',
      startedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      extendedAt: null,
      extensionReason: null,
    }
    const remaining = getRemainingBlackoutMs(blackout)
    expect(remaining).toBeGreaterThan(0)
    expect(remaining).toBeLessThanOrEqual(3600000)
  })

  it('returns 0 for expired blackout', () => {
    const blackout: SignalBlackout = {
      id: 'blackout_123',
      childId: 'child_123',
      signalId: 'sig_123',
      status: 'expired',
      startedAt: '2024-01-15T10:00:00.000Z',
      expiresAt: '2024-01-15T12:00:00.000Z', // Past
      extendedAt: null,
      extensionReason: null,
    }
    expect(getRemainingBlackoutMs(blackout)).toBe(0)
  })
})

describe('createBlackout', () => {
  it('creates blackout with default duration', () => {
    const blackout = createBlackout('child_123', 'sig_123')

    expect(blackout.childId).toBe('child_123')
    expect(blackout.signalId).toBe('sig_123')
    expect(blackout.status).toBe('active')
    expect(blackout.extendedAt).toBeNull()
    expect(blackout.extensionReason).toBeNull()

    // Check duration is approximately 48 hours
    const start = new Date(blackout.startedAt).getTime()
    const expires = new Date(blackout.expiresAt).getTime()
    const duration = expires - start
    expect(duration).toBe(EXTERNAL_ROUTING_CONSTANTS.DEFAULT_BLACKOUT_MS)
  })

  it('creates blackout with custom duration', () => {
    const customDuration = 24 * 60 * 60 * 1000 // 24 hours
    const blackout = createBlackout('child_123', 'sig_123', customDuration)

    const start = new Date(blackout.startedAt).getTime()
    const expires = new Date(blackout.expiresAt).getTime()
    const duration = expires - start
    expect(duration).toBe(customDuration)
  })
})

describe('createExternalPayload', () => {
  it('creates valid payload with all fields', () => {
    const payload = createExternalPayload(
      'sig_123',
      12,
      true,
      '2024-01-15T10:30:00.000Z',
      'US-CA',
      'web'
    )

    expect(payload.signalId).toBe('sig_123')
    expect(payload.childAge).toBe(12)
    expect(payload.hasSharedCustody).toBe(true)
    expect(payload.signalTimestamp).toBe('2024-01-15T10:30:00.000Z')
    expect(payload.jurisdiction).toBe('US-CA')
    expect(payload.devicePlatform).toBe('web')
  })

  it('creates payload that passes schema validation', () => {
    const payload = createExternalPayload(
      'sig_123',
      12,
      true,
      '2024-01-15T10:30:00.000Z',
      'US-CA',
      'web'
    )
    const result = externalSignalPayloadSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })

  it('creates payload that passes exclusion validation', () => {
    const payload = createExternalPayload(
      'sig_123',
      12,
      true,
      '2024-01-15T10:30:00.000Z',
      'US-CA',
      'web'
    )
    const result = validatePayloadExclusions(payload)
    expect(result.valid).toBe(true)
  })
})

describe('generateSignalRef', () => {
  it('generates 12-character reference', () => {
    const ref = generateSignalRef('sig_1234567890123456')
    expect(ref).toHaveLength(12)
  })

  it('uses last 12 characters of signal ID', () => {
    const ref = generateSignalRef('sig_abcdefghijklmnop')
    expect(ref).toBe('efghijklmnop') // Last 12 of 20-char string
  })
})

describe('isPartnerKeyExpiringSoon', () => {
  it('returns false for null keyExpiresAt', () => {
    const partner = {
      partnerId: 'partner_1',
      keyExpiresAt: null,
    } as CrisisPartnerConfig
    expect(isPartnerKeyExpiringSoon(partner)).toBe(false)
  })

  it('returns true for key expiring within warning period', () => {
    const partner = {
      partnerId: 'partner_1',
      keyExpiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days
    } as CrisisPartnerConfig
    expect(isPartnerKeyExpiringSoon(partner, 30)).toBe(true)
  })

  it('returns false for key expiring after warning period', () => {
    const partner = {
      partnerId: 'partner_1',
      keyExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days
    } as CrisisPartnerConfig
    expect(isPartnerKeyExpiringSoon(partner, 30)).toBe(false)
  })
})

describe('isPartnerAvailable', () => {
  const validPartner: CrisisPartnerConfig = {
    partnerId: 'partner_1',
    name: 'Crisis Partner',
    description: null,
    status: 'active',
    webhookUrl: 'https://partner.org/webhook',
    publicKey: 'x'.repeat(150),
    jurisdictions: ['US-CA'],
    isFallback: false,
    priority: 1,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    keyExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
  }

  it('returns true for active partner with valid key', () => {
    expect(isPartnerAvailable(validPartner)).toBe(true)
  })

  it('returns false for inactive partner', () => {
    expect(isPartnerAvailable({ ...validPartner, status: 'inactive' })).toBe(false)
  })

  it('returns false for suspended partner', () => {
    expect(isPartnerAvailable({ ...validPartner, status: 'suspended' })).toBe(false)
  })

  it('returns false for expired key', () => {
    expect(
      isPartnerAvailable({
        ...validPartner,
        keyExpiresAt: '2024-01-01T00:00:00.000Z', // Past
      })
    ).toBe(false)
  })

  it('returns true for null keyExpiresAt (no expiration)', () => {
    expect(isPartnerAvailable({ ...validPartner, keyExpiresAt: null })).toBe(true)
  })
})

describe('findPartnerForJurisdiction', () => {
  const partner1: CrisisPartnerConfig = {
    partnerId: 'ca_partner',
    name: 'California Partner',
    description: null,
    status: 'active',
    webhookUrl: 'https://ca-partner.org/webhook',
    publicKey: 'x'.repeat(150),
    jurisdictions: ['US-CA'],
    isFallback: false,
    priority: 1,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    keyExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
  }

  const partner2: CrisisPartnerConfig = {
    partnerId: 'national_partner',
    name: 'National Partner',
    description: null,
    status: 'active',
    webhookUrl: 'https://national-partner.org/webhook',
    publicKey: 'y'.repeat(150),
    jurisdictions: [],
    isFallback: true,
    priority: 10,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    keyExpiresAt: null,
  }

  const registry: PartnerRegistry = {
    jurisdictionMap: {
      'US-CA': ['ca_partner'],
    },
    fallbackPartners: ['national_partner'],
    lastUpdated: '2024-01-01T00:00:00.000Z',
  }

  const partners = [partner1, partner2]

  it('returns jurisdiction-specific partner when available', () => {
    const result = findPartnerForJurisdiction('US-CA', registry, partners)
    expect(result).not.toBeNull()
    expect(result?.partnerId).toBe('ca_partner')
  })

  it('returns fallback partner for unknown jurisdiction', () => {
    const result = findPartnerForJurisdiction('US-TX', registry, partners)
    expect(result).not.toBeNull()
    expect(result?.partnerId).toBe('national_partner')
  })

  it('skips unavailable jurisdiction-specific partner', () => {
    const inactivePartner1 = { ...partner1, status: 'inactive' as const }
    const result = findPartnerForJurisdiction('US-CA', registry, [inactivePartner1, partner2])
    expect(result).not.toBeNull()
    expect(result?.partnerId).toBe('national_partner')
  })

  it('returns null when no partners available', () => {
    const result = findPartnerForJurisdiction('US-TX', registry, [])
    expect(result).toBeNull()
  })
})
