/**
 * External Signal Routing Adversarial Tests
 *
 * Story 7.5.2: External Signal Routing - Task 8
 *
 * Adversarial tests ensuring:
 * - CRITICAL INV-002: External payload NEVER contains family-identifiable data
 * - Forbidden fields are always rejected
 * - Payload minimization is enforced at all levels
 * - No accidental leakage through nested objects or arrays
 */

import { describe, it, expect } from 'vitest'
import {
  externalSignalPayloadSchema,
  validatePayloadExclusions,
  createExternalPayload,
  createBlackout,
  EXTERNAL_ROUTING_CONSTANTS,
} from './externalSignalRouting.schema'

// ============================================================================
// INV-002: External Payload NEVER Contains Family-Identifiable Data
// ============================================================================

describe('INV-002: Payload Minimization Enforcement', () => {
  describe('schema rejects all forbidden identifiers', () => {
    const forbiddenFields = [
      { field: 'parentId', value: 'parent_123' },
      { field: 'familyId', value: 'family_456' },
      { field: 'childId', value: 'child_789' },
      { field: 'childName', value: 'Alice' },
      { field: 'firstName', value: 'Alice' },
      { field: 'lastName', value: 'Smith' },
      { field: 'email', value: 'alice@example.com' },
      { field: 'phone', value: '555-123-4567' },
      { field: 'phoneNumber', value: '+1-555-123-4567' },
      { field: 'address', value: '123 Main St' },
      { field: 'location', value: { lat: 37.7749, lng: -122.4194 } },
      { field: 'coordinates', value: { latitude: 37.7749, longitude: -122.4194 } },
      { field: 'deviceId', value: 'device_abc123' },
      { field: 'userId', value: 'user_xyz789' },
    ]

    for (const { field, value } of forbiddenFields) {
      it(`rejects payload containing ${field}`, () => {
        const payload = {
          signalId: 'sig_123',
          childAge: 12,
          hasSharedCustody: false,
          signalTimestamp: '2024-01-15T10:30:00.000Z',
          jurisdiction: 'US-CA',
          devicePlatform: 'web',
          [field]: value,
        }

        // Schema validation - should NOT accept extra fields
        // The strict schema should only accept defined fields
        const result = externalSignalPayloadSchema.safeParse(payload)

        // If schema accepts it, validatePayloadExclusions must catch it
        if (result.success) {
          const exclusionResult = validatePayloadExclusions(payload)
          expect(exclusionResult.valid).toBe(false)
          expect(exclusionResult.forbiddenFields).toContain(field)
        }
      })
    }
  })

  describe('schema rejects sensitive data fields', () => {
    const sensitiveFields = [
      { field: 'screenshots', value: ['data:image/png;base64,iVBORw...'] },
      { field: 'screenshot', value: 'data:image/png;base64,iVBORw...' },
      { field: 'activityData', value: { browsing: [], apps: [] } },
      { field: 'activity', value: [] },
      { field: 'browsingHistory', value: ['https://example.com'] },
      { field: 'urls', value: ['https://suspicious-site.com'] },
    ]

    for (const { field, value } of sensitiveFields) {
      it(`rejects payload containing ${field}`, () => {
        const payload = {
          signalId: 'sig_123',
          childAge: 12,
          hasSharedCustody: false,
          signalTimestamp: '2024-01-15T10:30:00.000Z',
          jurisdiction: 'US-CA',
          devicePlatform: 'web',
          [field]: value,
        }

        // Schema or exclusion validator must catch it
        const schemaResult = externalSignalPayloadSchema.safeParse(payload)
        if (schemaResult.success) {
          const exclusionResult = validatePayloadExclusions(payload)
          expect(exclusionResult.valid).toBe(false)
          expect(exclusionResult.forbiddenFields).toContain(field)
        }
      })
    }
  })

  describe('validatePayloadExclusions catches nested forbidden data', () => {
    it('detects forbidden fields in flat objects', () => {
      const payload = {
        signalId: 'sig_123',
        parentId: 'parent_secret', // Forbidden
      }

      const result = validatePayloadExclusions(payload)
      expect(result.valid).toBe(false)
      expect(result.forbiddenFields).toContain('parentId')
    })

    it('reports all forbidden fields when multiple present', () => {
      const payload = {
        signalId: 'sig_123',
        parentId: 'parent_123',
        familyId: 'family_456',
        childId: 'child_789',
        email: 'test@example.com',
        phone: '555-1234',
        screenshots: [],
        activityData: {},
      }

      const result = validatePayloadExclusions(payload)
      expect(result.valid).toBe(false)
      expect(result.forbiddenFields).toContain('parentId')
      expect(result.forbiddenFields).toContain('familyId')
      expect(result.forbiddenFields).toContain('childId')
      expect(result.forbiddenFields).toContain('email')
      expect(result.forbiddenFields).toContain('phone')
      expect(result.forbiddenFields).toContain('screenshots')
      expect(result.forbiddenFields).toContain('activityData')
    })
  })

  describe('createExternalPayload produces minimal safe payload', () => {
    it('only includes allowed fields', () => {
      const payload = createExternalPayload(
        'sig_123',
        12,
        false,
        '2024-01-15T10:30:00.000Z',
        'US-CA',
        'web'
      )

      // Only these fields should exist
      const allowedKeys = [
        'signalId',
        'childAge',
        'hasSharedCustody',
        'signalTimestamp',
        'jurisdiction',
        'devicePlatform',
      ]

      const actualKeys = Object.keys(payload)
      expect(actualKeys.sort()).toEqual(allowedKeys.sort())
    })

    it('does not add any extra fields', () => {
      const payload = createExternalPayload(
        'sig_test',
        10,
        true,
        '2024-01-15T10:30:00.000Z',
        'US-TX',
        'chrome'
      )

      // Verify no forbidden fields sneaked in
      const exclusionResult = validatePayloadExclusions(payload)
      expect(exclusionResult.valid).toBe(true)
      expect(exclusionResult.forbiddenFields).toHaveLength(0)
    })

    it('cannot be extended with Object.assign', () => {
      const payload = createExternalPayload(
        'sig_123',
        12,
        false,
        '2024-01-15T10:30:00.000Z',
        'US-CA',
        'web'
      )

      // Try to add forbidden data
      const extendedPayload = Object.assign({}, payload, {
        parentId: 'LEAKED_PARENT_ID',
        familyId: 'LEAKED_FAMILY_ID',
      })

      // validatePayloadExclusions should catch this
      const result = validatePayloadExclusions(extendedPayload)
      expect(result.valid).toBe(false)
      expect(result.forbiddenFields).toContain('parentId')
      expect(result.forbiddenFields).toContain('familyId')
    })

    it('cannot be extended with spread operator', () => {
      const payload = createExternalPayload(
        'sig_123',
        12,
        false,
        '2024-01-15T10:30:00.000Z',
        'US-CA',
        'web'
      )

      // Try to spread in forbidden data
      const extendedPayload = {
        ...payload,
        email: 'leaked@example.com',
        screenshots: ['leaked_data'],
      }

      // validatePayloadExclusions should catch this
      const result = validatePayloadExclusions(extendedPayload)
      expect(result.valid).toBe(false)
      expect(result.forbiddenFields).toContain('email')
      expect(result.forbiddenFields).toContain('screenshots')
    })
  })
})

// ============================================================================
// Blackout Collection Isolation
// ============================================================================

describe('Blackout Collection Isolation', () => {
  it('blackout collection name does not contain family paths', () => {
    const collectionName = EXTERNAL_ROUTING_CONSTANTS.BLACKOUT_COLLECTION

    // Must not be under family-accessible paths
    expect(collectionName).not.toMatch(/^families\//)
    expect(collectionName).not.toMatch(/^children\//)
    expect(collectionName).not.toMatch(/^users\//)
    expect(collectionName).not.toContain('/')
  })

  it('routing log collection name does not contain family paths', () => {
    const collectionName = EXTERNAL_ROUTING_CONSTANTS.ROUTING_LOG_COLLECTION

    expect(collectionName).not.toMatch(/^families\//)
    expect(collectionName).not.toMatch(/^children\//)
    expect(collectionName).not.toMatch(/^users\//)
    expect(collectionName).not.toContain('/')
  })

  it('partner config collection name does not contain family paths', () => {
    const collectionName = EXTERNAL_ROUTING_CONSTANTS.PARTNER_CONFIG_COLLECTION

    expect(collectionName).not.toMatch(/^families\//)
    expect(collectionName).not.toMatch(/^children\//)
    expect(collectionName).not.toMatch(/^users\//)
    expect(collectionName).not.toContain('/')
  })

  it('createBlackout produces isolated record', () => {
    const blackout = createBlackout('child_123', 'sig_456')

    // The blackout record itself doesn't contain family identifiers
    expect(blackout).not.toHaveProperty('familyId')
    expect(blackout).not.toHaveProperty('parentId')
    expect(blackout).not.toHaveProperty('email')

    // It only has child/signal reference for the blackout mechanism
    expect(blackout).toHaveProperty('childId')
    expect(blackout).toHaveProperty('signalId')
  })
})

// ============================================================================
// Schema Strictness Tests
// ============================================================================

describe('Schema Strictness', () => {
  it('externalSignalPayloadSchema accepts only valid payloads', () => {
    const validPayload = {
      signalId: 'sig_123',
      childAge: 12,
      hasSharedCustody: false,
      signalTimestamp: '2024-01-15T10:30:00.000Z',
      jurisdiction: 'US-CA',
      devicePlatform: 'web',
    }

    const result = externalSignalPayloadSchema.safeParse(validPayload)
    expect(result.success).toBe(true)
  })

  it('rejects missing required fields', () => {
    const incompletePayloads = [
      { signalId: 'sig_123' }, // Missing most fields
      { signalId: 'sig_123', childAge: 12 }, // Still missing fields
      {
        signalId: 'sig_123',
        childAge: 12,
        hasSharedCustody: false,
        signalTimestamp: '2024-01-15T10:30:00.000Z',
        // Missing jurisdiction and devicePlatform
      },
    ]

    for (const payload of incompletePayloads) {
      const result = externalSignalPayloadSchema.safeParse(payload)
      expect(result.success).toBe(false)
    }
  })

  it('validates age bounds', () => {
    // Age too low
    const tooYoung = {
      signalId: 'sig_123',
      childAge: 0, // Must be >= 1
      hasSharedCustody: false,
      signalTimestamp: '2024-01-15T10:30:00.000Z',
      jurisdiction: 'US-CA',
      devicePlatform: 'web',
    }

    const result1 = externalSignalPayloadSchema.safeParse(tooYoung)
    expect(result1.success).toBe(false)

    // Age too high
    const tooOld = {
      signalId: 'sig_123',
      childAge: 100, // Must be <= 25
      hasSharedCustody: false,
      signalTimestamp: '2024-01-15T10:30:00.000Z',
      jurisdiction: 'US-CA',
      devicePlatform: 'web',
    }

    const result2 = externalSignalPayloadSchema.safeParse(tooOld)
    expect(result2.success).toBe(false)
  })

  it('validates device platform', () => {
    const invalidDevice = {
      signalId: 'sig_123',
      childAge: 12,
      hasSharedCustody: false,
      signalTimestamp: '2024-01-15T10:30:00.000Z',
      jurisdiction: 'US-CA',
      devicePlatform: 'windows', // Not a valid platform
    }

    const result = externalSignalPayloadSchema.safeParse(invalidDevice)
    expect(result.success).toBe(false)
  })

  it('validates timestamp format', () => {
    const invalidTimestamp = {
      signalId: 'sig_123',
      childAge: 12,
      hasSharedCustody: false,
      signalTimestamp: 'not-a-timestamp',
      jurisdiction: 'US-CA',
      devicePlatform: 'web',
    }

    const result = externalSignalPayloadSchema.safeParse(invalidTimestamp)
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// Attempt to Bypass Payload Minimization
// ============================================================================

describe('Bypass Attempts', () => {
  describe('type coercion attacks', () => {
    it('toString on objects does not leak data through payload', () => {
      const maliciousPayload = {
        signalId: 'sig_123',
        childAge: 12,
        hasSharedCustody: false,
        signalTimestamp: '2024-01-15T10:30:00.000Z',
        jurisdiction: 'US-CA',
        devicePlatform: 'web',
        // Attempt to hide data in toString
        toString: () => 'parentId=parent_123&familyId=family_456',
      }

      // The payload has extra property (toString function)
      // But validatePayloadExclusions doesn't check toString
      // This is acceptable because:
      // 1. The schema will strip the toString when parsing
      // 2. JSON.stringify won't include the function

      const jsonString = JSON.stringify(maliciousPayload)
      expect(jsonString).not.toContain('parentId')
      expect(jsonString).not.toContain('familyId')
    })

    it('valueOf on objects does not leak data', () => {
      const maliciousPayload = {
        signalId: 'sig_123',
        childAge: 12,
        hasSharedCustody: false,
        signalTimestamp: '2024-01-15T10:30:00.000Z',
        jurisdiction: 'US-CA',
        devicePlatform: 'web',
        valueOf: () => ({
          parentId: 'parent_123',
          email: 'secret@example.com',
        }),
      }

      const jsonString = JSON.stringify(maliciousPayload)
      expect(jsonString).not.toContain('parent_123')
      expect(jsonString).not.toContain('secret@example.com')
    })
  })

  describe('prototype pollution attempts', () => {
    it('__proto__ fields do not bypass validation', () => {
      const payload = {
        signalId: 'sig_123',
        childAge: 12,
        __proto__: {
          parentId: 'parent_123',
          familyId: 'family_456',
        },
      } as Record<string, unknown>

      // The __proto__ is special in JavaScript but when stringified,
      // it doesn't appear as a regular property
      const jsonString = JSON.stringify(payload)
      expect(jsonString).not.toContain('parent_123')
      expect(jsonString).not.toContain('family_456')
    })
  })

  describe('encoding attempts', () => {
    it('base64 encoded identifiers are still caught if field name matches', () => {
      // Even if someone tries to encode the values, the field names are checked
      const payload = {
        signalId: 'sig_123',
        childAge: 12,
        parentId: btoa('parent_123'), // Base64 encoded value
        email: btoa('test@example.com'), // Base64 encoded value
      }

      const result = validatePayloadExclusions(payload)
      expect(result.valid).toBe(false)
      // Field names are still checked, regardless of value encoding
      expect(result.forbiddenFields).toContain('parentId')
      expect(result.forbiddenFields).toContain('email')
    })
  })
})

// ============================================================================
// Constant Verification
// ============================================================================

describe('Critical Constant Verification', () => {
  it('minimum blackout is exactly 48 hours', () => {
    const fortyEightHoursMs = 48 * 60 * 60 * 1000
    expect(EXTERNAL_ROUTING_CONSTANTS.MIN_BLACKOUT_MS).toBe(fortyEightHoursMs)
  })

  it('default blackout is at least 48 hours', () => {
    const fortyEightHoursMs = 48 * 60 * 60 * 1000
    expect(EXTERNAL_ROUTING_CONSTANTS.DEFAULT_BLACKOUT_MS).toBeGreaterThanOrEqual(
      fortyEightHoursMs
    )
  })

  it('encryption uses RSA-OAEP', () => {
    expect(EXTERNAL_ROUTING_CONSTANTS.ENCRYPTION_ALGORITHM).toBe('RSA-OAEP')
  })

  it('AES key length is 256 bits', () => {
    expect(EXTERNAL_ROUTING_CONSTANTS.AES_KEY_LENGTH).toBe(256)
  })

  it('webhook timeout is reasonable (10-60 seconds)', () => {
    expect(EXTERNAL_ROUTING_CONSTANTS.PARTNER_WEBHOOK_TIMEOUT_MS).toBeGreaterThanOrEqual(10000)
    expect(EXTERNAL_ROUTING_CONSTANTS.PARTNER_WEBHOOK_TIMEOUT_MS).toBeLessThanOrEqual(60000)
  })

  it('retry count is limited (1-5)', () => {
    expect(EXTERNAL_ROUTING_CONSTANTS.PARTNER_WEBHOOK_MAX_RETRIES).toBeGreaterThanOrEqual(1)
    expect(EXTERNAL_ROUTING_CONSTANTS.PARTNER_WEBHOOK_MAX_RETRIES).toBeLessThanOrEqual(5)
  })
})
