import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  EXTERNAL_ROUTING_CONSTANTS,
  routeSignalInputSchema,
  validatePayloadExclusions,
} from '@fledgely/contracts'

/**
 * routeSafetySignal Cloud Function Tests
 *
 * Story 7.5.2: External Signal Routing - Task 5
 *
 * Note: The core routing logic is tested in SignalRoutingService tests.
 * These tests focus on:
 * 1. Input validation via schema
 * 2. Collection name isolation
 * 3. Payload exclusion validation (INV-002)
 */

// ============================================================================
// Input Schema Tests
// ============================================================================

describe('routeSignalInputSchema Validation', () => {
  it('accepts valid input', () => {
    const validInput = {
      signalId: 'sig_test_123',
      childId: 'child_test_123',
      triggeredAt: '2024-01-15T10:30:00.000Z',
      deviceType: 'web',
      jurisdiction: 'US-CA',
    }

    const result = routeSignalInputSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('rejects empty signalId', () => {
    const invalidInput = {
      signalId: '',
      childId: 'child_test_123',
      triggeredAt: '2024-01-15T10:30:00.000Z',
      deviceType: 'web',
      jurisdiction: 'US-CA',
    }

    const result = routeSignalInputSchema.safeParse(invalidInput)
    expect(result.success).toBe(false)
  })

  it('rejects empty childId', () => {
    const invalidInput = {
      signalId: 'sig_test_123',
      childId: '',
      triggeredAt: '2024-01-15T10:30:00.000Z',
      deviceType: 'web',
      jurisdiction: 'US-CA',
    }

    const result = routeSignalInputSchema.safeParse(invalidInput)
    expect(result.success).toBe(false)
  })

  it('accepts valid device types', () => {
    // Device types from signalDeviceTypeSchema: 'web', 'chrome', 'android', 'ios'
    const deviceTypes = ['web', 'chrome', 'android', 'ios']

    for (const deviceType of deviceTypes) {
      const input = {
        signalId: 'sig_test_123',
        childId: 'child_test_123',
        triggeredAt: '2024-01-15T10:30:00.000Z',
        deviceType,
        jurisdiction: 'US-CA',
      }

      const result = routeSignalInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    }
  })

  it('accepts null jurisdiction (uses default)', () => {
    const input = {
      signalId: 'sig_test_123',
      childId: 'child_test_123',
      triggeredAt: '2024-01-15T10:30:00.000Z',
      deviceType: 'web',
      jurisdiction: null,
    }

    const result = routeSignalInputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })
})

// ============================================================================
// Collection Name Tests (Isolation Requirement)
// ============================================================================

describe('routeSafetySignal Collection Names', () => {
  it('uses isolated routing log collection', () => {
    expect(EXTERNAL_ROUTING_CONSTANTS.ROUTING_LOG_COLLECTION).toBe('signal-routing-logs')
  })

  it('uses isolated blackout collection', () => {
    expect(EXTERNAL_ROUTING_CONSTANTS.BLACKOUT_COLLECTION).toBe('signal-blackouts')
  })

  it('uses isolated partner config collection', () => {
    expect(EXTERNAL_ROUTING_CONSTANTS.PARTNER_CONFIG_COLLECTION).toBe('crisis-partners')
  })

  it('routing log collection is not family-accessible', () => {
    // Collection name should not start with 'children/' or 'families/'
    expect(EXTERNAL_ROUTING_CONSTANTS.ROUTING_LOG_COLLECTION).not.toMatch(/^children\//)
    expect(EXTERNAL_ROUTING_CONSTANTS.ROUTING_LOG_COLLECTION).not.toMatch(/^families\//)
  })

  it('blackout collection is not family-accessible', () => {
    expect(EXTERNAL_ROUTING_CONSTANTS.BLACKOUT_COLLECTION).not.toMatch(/^children\//)
    expect(EXTERNAL_ROUTING_CONSTANTS.BLACKOUT_COLLECTION).not.toMatch(/^families\//)
  })
})

// ============================================================================
// Payload Exclusion Tests (INV-002)
// ============================================================================

describe('Payload Security (INV-002)', () => {
  describe('validatePayloadExclusions', () => {
    it('rejects payload with parentId', () => {
      const payload = {
        signalId: 'sig_123',
        childAge: 12,
        parentId: 'parent_123',
      }

      const result = validatePayloadExclusions(payload)
      expect(result.valid).toBe(false)
      expect(result.forbiddenFields).toContain('parentId')
    })

    it('rejects payload with familyId', () => {
      const payload = {
        signalId: 'sig_123',
        childAge: 12,
        familyId: 'family_123',
      }

      const result = validatePayloadExclusions(payload)
      expect(result.valid).toBe(false)
      expect(result.forbiddenFields).toContain('familyId')
    })

    it('rejects payload with childId', () => {
      const payload = {
        signalId: 'sig_123',
        childAge: 12,
        childId: 'child_123',
      }

      const result = validatePayloadExclusions(payload)
      expect(result.valid).toBe(false)
      expect(result.forbiddenFields).toContain('childId')
    })

    it('rejects payload with screenshots', () => {
      const payload = {
        signalId: 'sig_123',
        childAge: 12,
        screenshots: ['data:image/png;base64,...'],
      }

      const result = validatePayloadExclusions(payload)
      expect(result.valid).toBe(false)
      expect(result.forbiddenFields).toContain('screenshots')
    })

    it('rejects payload with email', () => {
      const payload = {
        signalId: 'sig_123',
        childAge: 12,
        email: 'test@example.com',
      }

      const result = validatePayloadExclusions(payload)
      expect(result.valid).toBe(false)
      expect(result.forbiddenFields).toContain('email')
    })

    it('rejects payload with phone', () => {
      const payload = {
        signalId: 'sig_123',
        childAge: 12,
        phone: '555-123-4567',
      }

      const result = validatePayloadExclusions(payload)
      expect(result.valid).toBe(false)
      expect(result.forbiddenFields).toContain('phone')
    })

    it('rejects payload with activityData', () => {
      const payload = {
        signalId: 'sig_123',
        childAge: 12,
        activityData: { browsing: [] },
      }

      const result = validatePayloadExclusions(payload)
      expect(result.valid).toBe(false)
      expect(result.forbiddenFields).toContain('activityData')
    })

    it('accepts valid minimal payload', () => {
      const payload = {
        signalId: 'sig_123',
        childAge: 12,
        hasSharedCustody: false,
        signalTimestamp: '2024-01-15T10:30:00.000Z',
        jurisdiction: 'US-CA',
        devicePlatform: 'web',
      }

      const result = validatePayloadExclusions(payload)
      expect(result.valid).toBe(true)
      expect(result.forbiddenFields).toHaveLength(0)
    })

    it('reports multiple forbidden fields', () => {
      const payload = {
        signalId: 'sig_123',
        childAge: 12,
        parentId: 'parent_123',
        familyId: 'family_123',
        childId: 'child_123',
        email: 'test@example.com',
      }

      const result = validatePayloadExclusions(payload)
      expect(result.valid).toBe(false)
      expect(result.forbiddenFields.length).toBeGreaterThanOrEqual(4)
    })
  })
})

// ============================================================================
// Constants Tests
// ============================================================================

describe('External Routing Constants', () => {
  it('default blackout is 48 hours', () => {
    expect(EXTERNAL_ROUTING_CONSTANTS.DEFAULT_BLACKOUT_MS).toBe(48 * 60 * 60 * 1000)
  })

  it('minimum blackout is 48 hours', () => {
    expect(EXTERNAL_ROUTING_CONSTANTS.MIN_BLACKOUT_MS).toBe(48 * 60 * 60 * 1000)
  })

  it('webhook timeout is reasonable', () => {
    expect(EXTERNAL_ROUTING_CONSTANTS.PARTNER_WEBHOOK_TIMEOUT_MS).toBeGreaterThanOrEqual(10000)
    expect(EXTERNAL_ROUTING_CONSTANTS.PARTNER_WEBHOOK_TIMEOUT_MS).toBeLessThanOrEqual(60000)
  })

  it('has retry configuration', () => {
    expect(EXTERNAL_ROUTING_CONSTANTS.PARTNER_WEBHOOK_MAX_RETRIES).toBeGreaterThanOrEqual(1)
    expect(EXTERNAL_ROUTING_CONSTANTS.PARTNER_WEBHOOK_MAX_RETRIES).toBeLessThanOrEqual(5)
  })

  it('uses RSA-OAEP encryption algorithm', () => {
    expect(EXTERNAL_ROUTING_CONSTANTS.ENCRYPTION_ALGORITHM).toBe('RSA-OAEP')
  })

  it('uses 256-bit AES keys', () => {
    expect(EXTERNAL_ROUTING_CONSTANTS.AES_KEY_LENGTH).toBe(256)
  })
})
