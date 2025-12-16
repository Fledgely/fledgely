/**
 * Crisis Schema Tests
 *
 * Story 7.2: Crisis Visit Zero-Data-Path - Task 7
 *
 * Tests for Zod schema validation of crisis protection types.
 */

import { describe, it, expect } from 'vitest'
import {
  crisisCheckResultSchema,
  crisisProtectionStatusSchema,
  monitoringActionSchema,
  blockingDecisionSchema,
  crisisGuardConfigSchema,
  allowlistCacheStatusSchema,
  crisisAllowlistResponseSchema,
  crisisAllowlistErrorSchema,
  type CrisisCheckResult,
  type CrisisProtectionStatus,
  type MonitoringAction,
  type BlockingDecision,
  type CrisisGuardConfig,
  type AllowlistCacheStatus,
  type CrisisAllowlistResponse,
  type CrisisAllowlistError,
} from './crisis.schema'

describe('Crisis Schema Validation', () => {
  describe('crisisCheckResultSchema', () => {
    it('validates valid crisis check result', () => {
      const validResult: CrisisCheckResult = {
        isCrisisUrl: true,
        url: 'https://988lifeline.org',
        checkDurationMs: 5,
      }

      const result = crisisCheckResultSchema.safeParse(validResult)
      expect(result.success).toBe(true)
    })

    it('validates result without optional checkDurationMs', () => {
      const validResult = {
        isCrisisUrl: false,
        url: 'https://google.com',
      }

      const result = crisisCheckResultSchema.safeParse(validResult)
      expect(result.success).toBe(true)
    })

    it('rejects invalid crisis check result', () => {
      const invalidResult = {
        isCrisisUrl: 'yes', // Should be boolean
        url: 'https://988lifeline.org',
      }

      const result = crisisCheckResultSchema.safeParse(invalidResult)
      expect(result.success).toBe(false)
    })

    it('rejects result without required url', () => {
      const invalidResult = {
        isCrisisUrl: true,
      }

      const result = crisisCheckResultSchema.safeParse(invalidResult)
      expect(result.success).toBe(false)
    })
  })

  describe('crisisProtectionStatusSchema', () => {
    it('validates valid protection status', () => {
      const validStatus: CrisisProtectionStatus = {
        isActive: true,
        currentUrl: 'https://988lifeline.org',
        activatedAt: new Date(),
      }

      const result = crisisProtectionStatusSchema.safeParse(validStatus)
      expect(result.success).toBe(true)
    })

    it('validates status with only required fields', () => {
      const validStatus = {
        isActive: false,
      }

      const result = crisisProtectionStatusSchema.safeParse(validStatus)
      expect(result.success).toBe(true)
    })

    it('rejects invalid protection status', () => {
      const invalidStatus = {
        isActive: 'true', // Should be boolean
      }

      const result = crisisProtectionStatusSchema.safeParse(invalidStatus)
      expect(result.success).toBe(false)
    })
  })

  describe('monitoringActionSchema', () => {
    it('validates all valid monitoring actions', () => {
      const validActions: MonitoringAction[] = [
        'screenshot',
        'url_logging',
        'time_tracking',
        'notification',
        'analytics',
        'all',
      ]

      for (const action of validActions) {
        const result = monitoringActionSchema.safeParse(action)
        expect(result.success).toBe(true)
      }
    })

    it('rejects invalid monitoring action', () => {
      const result = monitoringActionSchema.safeParse('invalid_action')
      expect(result.success).toBe(false)
    })
  })

  describe('blockingDecisionSchema', () => {
    it('validates valid blocking decision', () => {
      const validDecision: BlockingDecision = {
        action: 'screenshot',
        blocked: true,
        reason: 'Crisis URL detected',
        triggerUrl: 'https://988lifeline.org',
      }

      const result = blockingDecisionSchema.safeParse(validDecision)
      expect(result.success).toBe(true)
    })

    it('validates decision with only required fields', () => {
      const validDecision = {
        action: 'analytics',
        blocked: false,
      }

      const result = blockingDecisionSchema.safeParse(validDecision)
      expect(result.success).toBe(true)
    })

    it('rejects decision with invalid action', () => {
      const invalidDecision = {
        action: 'invalid',
        blocked: true,
      }

      const result = blockingDecisionSchema.safeParse(invalidDecision)
      expect(result.success).toBe(false)
    })
  })

  describe('crisisGuardConfigSchema', () => {
    it('validates valid guard config', () => {
      const validConfig: CrisisGuardConfig = {
        enabled: true,
        useBundledFallback: true,
        networkTimeoutMs: 5000,
        cacheTtlMs: 86400000,
      }

      const result = crisisGuardConfigSchema.safeParse(validConfig)
      expect(result.success).toBe(true)
    })

    it('applies default values when not provided', () => {
      const minimalConfig = {}

      const result = crisisGuardConfigSchema.safeParse(minimalConfig)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.enabled).toBe(true)
        expect(result.data.useBundledFallback).toBe(true)
        expect(result.data.networkTimeoutMs).toBe(5000)
        expect(result.data.cacheTtlMs).toBe(86400000)
      }
    })

    it('rejects invalid timeout value', () => {
      const invalidConfig = {
        networkTimeoutMs: 'fast', // Should be number
      }

      const result = crisisGuardConfigSchema.safeParse(invalidConfig)
      expect(result.success).toBe(false)
    })
  })

  describe('allowlistCacheStatusSchema', () => {
    it('validates valid cache status', () => {
      const validStatus: AllowlistCacheStatus = {
        isValid: true,
        ageMs: 3600000,
        version: '1.0.0',
        source: 'cache',
      }

      const result = allowlistCacheStatusSchema.safeParse(validStatus)
      expect(result.success).toBe(true)
    })

    it('validates cache status with null values', () => {
      const validStatus = {
        isValid: false,
        ageMs: null,
        version: null,
        source: 'bundled',
      }

      const result = allowlistCacheStatusSchema.safeParse(validStatus)
      expect(result.success).toBe(true)
    })

    it('validates all valid source types', () => {
      const sources = ['network', 'cache', 'bundled']

      for (const source of sources) {
        const result = allowlistCacheStatusSchema.safeParse({
          isValid: true,
          ageMs: null,
          version: null,
          source,
        })
        expect(result.success).toBe(true)
      }
    })

    it('rejects invalid source type', () => {
      const invalidStatus = {
        isValid: true,
        ageMs: null,
        version: null,
        source: 'memory',
      }

      const result = allowlistCacheStatusSchema.safeParse(invalidStatus)
      expect(result.success).toBe(false)
    })
  })

  describe('crisisAllowlistResponseSchema', () => {
    it('validates valid allowlist response', () => {
      const validResponse: CrisisAllowlistResponse = {
        version: '1.0.0',
        lastUpdated: '2025-12-16T00:00:00Z',
        entries: [
          {
            id: 'us-988',
            domain: '988lifeline.org',
            category: 'suicide',
            aliases: ['suicidepreventionlifeline.org'],
            wildcardPatterns: ['*.988lifeline.org'],
            name: '988 Suicide & Crisis Lifeline',
            description: 'National suicide prevention hotline',
            region: 'us',
            contactMethods: ['call', 'text', 'chat'],
          },
        ],
      }

      const result = crisisAllowlistResponseSchema.safeParse(validResponse)
      expect(result.success).toBe(true)
    })

    it('validates response with empty entries', () => {
      const validResponse = {
        version: '1.0.0',
        lastUpdated: '2025-12-16T00:00:00Z',
        entries: [],
      }

      const result = crisisAllowlistResponseSchema.safeParse(validResponse)
      expect(result.success).toBe(true)
    })

    it('rejects response with missing required fields', () => {
      const invalidResponse = {
        version: '1.0.0',
        // Missing lastUpdated and entries
      }

      const result = crisisAllowlistResponseSchema.safeParse(invalidResponse)
      expect(result.success).toBe(false)
    })

    it('rejects response with invalid entry', () => {
      const invalidResponse = {
        version: '1.0.0',
        lastUpdated: '2025-12-16T00:00:00Z',
        entries: [
          {
            id: 'us-988',
            // Missing required fields
          },
        ],
      }

      const result = crisisAllowlistResponseSchema.safeParse(invalidResponse)
      expect(result.success).toBe(false)
    })
  })

  describe('crisisAllowlistErrorSchema', () => {
    it('validates valid error response', () => {
      const validError: CrisisAllowlistError = {
        error: 'Too many requests',
        message: 'Please wait before requesting the allowlist again',
        retryAfter: 60,
      }

      const result = crisisAllowlistErrorSchema.safeParse(validError)
      expect(result.success).toBe(true)
    })

    it('validates error without optional retryAfter', () => {
      const validError = {
        error: 'Internal server error',
        message: 'Failed to fetch crisis allowlist',
      }

      const result = crisisAllowlistErrorSchema.safeParse(validError)
      expect(result.success).toBe(true)
    })

    it('rejects error with missing required fields', () => {
      const invalidError = {
        error: 'Error',
        // Missing message
      }

      const result = crisisAllowlistErrorSchema.safeParse(invalidError)
      expect(result.success).toBe(false)
    })
  })
})

describe('Type Inference', () => {
  it('correctly infers CrisisCheckResult type', () => {
    const result: CrisisCheckResult = {
      isCrisisUrl: true,
      url: 'https://988lifeline.org',
    }

    // Type check - if this compiles, the type inference is correct
    expect(result.isCrisisUrl).toBe(true)
    expect(result.url).toBe('https://988lifeline.org')
  })

  it('correctly infers MonitoringAction type', () => {
    const action: MonitoringAction = 'screenshot'

    // Type check
    expect(action).toBe('screenshot')
  })
})
