/**
 * AutomaticReduction Data Model Tests - Story 37.4 Task 1
 *
 * Tests for automatic monitoring reduction data model.
 * AC1: 95%+ trust for 6 months triggers automatic reduction
 * AC2: Reduction is AUTOMATIC, not optional
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  AUTOMATIC_REDUCTION_TRUST_THRESHOLD,
  AUTOMATIC_REDUCTION_DURATION_MONTHS,
  AUTOMATIC_REDUCTION_DURATION_DAYS,
  automaticReductionConfigSchema,
  overrideRequestSchema,
  reductionResultSchema,
  graduationPathSchema,
  createDefaultAutomaticReductionConfig,
  createOverrideRequest,
  createReductionResult,
  createGraduationPath,
  daysToMonths,
  isOverrideActive,
  getParentNotificationMessage,
  getCelebrationMessage,
  getGraduationPathMessage,
  getOverrideExplanation,
} from './automaticReduction'

describe('AutomaticReduction Data Model - Story 37.4 Task 1', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-12-15T12:00:00Z'))
  })

  describe('Constants', () => {
    it('should require 95% trust threshold', () => {
      expect(AUTOMATIC_REDUCTION_TRUST_THRESHOLD).toBe(95)
    })

    it('should require 6 months duration', () => {
      expect(AUTOMATIC_REDUCTION_DURATION_MONTHS).toBe(6)
    })

    it('should calculate 180 days equivalent', () => {
      expect(AUTOMATIC_REDUCTION_DURATION_DAYS).toBe(180)
    })
  })

  describe('AutomaticReductionConfig Schema', () => {
    it('should validate default config', () => {
      const config = {
        childId: 'child-1',
        eligibleAt: null,
        appliedAt: null,
        overrideRequested: false,
        overrideAgreedByChild: false,
        graduationPathStarted: false,
        expectedGraduationDate: null,
      }

      const result = automaticReductionConfigSchema.safeParse(config)
      expect(result.success).toBe(true)
    })

    it('should validate config with dates', () => {
      const config = {
        childId: 'child-1',
        eligibleAt: new Date('2024-06-15'),
        appliedAt: new Date('2024-06-16'),
        overrideRequested: false,
        overrideAgreedByChild: false,
        graduationPathStarted: true,
        expectedGraduationDate: new Date('2025-06-15'),
      }

      const result = automaticReductionConfigSchema.safeParse(config)
      expect(result.success).toBe(true)
    })

    it('should validate config with override', () => {
      const config = {
        childId: 'child-1',
        eligibleAt: new Date(),
        appliedAt: null,
        overrideRequested: true,
        overrideAgreedByChild: true,
        overrideReason: 'Family vacation - temporary override needed',
        graduationPathStarted: false,
        expectedGraduationDate: null,
      }

      const result = automaticReductionConfigSchema.safeParse(config)
      expect(result.success).toBe(true)
    })

    it('should reject empty childId', () => {
      const config = {
        childId: '',
        eligibleAt: null,
        appliedAt: null,
        overrideRequested: false,
        overrideAgreedByChild: false,
        graduationPathStarted: false,
        expectedGraduationDate: null,
      }

      const result = automaticReductionConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
    })
  })

  describe('OverrideRequest Schema', () => {
    it('should validate pending request', () => {
      const request = {
        childId: 'child-1',
        requestedBy: 'parent-1',
        reason: 'Concerned about recent behavior changes',
        requestedAt: new Date(),
        status: 'pending',
        respondedAt: null,
      }

      const result = overrideRequestSchema.safeParse(request)
      expect(result.success).toBe(true)
    })

    it('should validate approved request with response', () => {
      const request = {
        childId: 'child-1',
        requestedBy: 'parent-1',
        reason: 'Temporary adjustment needed for school project',
        requestedAt: new Date('2024-12-14'),
        status: 'approved',
        respondedAt: new Date('2024-12-15'),
        childResponse: 'I understand, this is okay for the project',
      }

      const result = overrideRequestSchema.safeParse(request)
      expect(result.success).toBe(true)
    })

    it('should require minimum 10 char reason', () => {
      const request = {
        childId: 'child-1',
        requestedBy: 'parent-1',
        reason: 'Short', // Too short
        requestedAt: new Date(),
        status: 'pending',
        respondedAt: null,
      }

      const result = overrideRequestSchema.safeParse(request)
      expect(result.success).toBe(false)
    })

    it('should validate all status types', () => {
      const statuses = ['pending', 'approved', 'rejected', 'withdrawn']

      for (const status of statuses) {
        const request = {
          childId: 'child-1',
          requestedBy: 'parent-1',
          reason: 'Valid reason that is long enough',
          requestedAt: new Date(),
          status,
          respondedAt: status !== 'pending' ? new Date() : null,
        }

        const result = overrideRequestSchema.safeParse(request)
        expect(result.success).toBe(true)
      }
    })
  })

  describe('ReductionResult Schema', () => {
    it('should validate successful automatic reduction', () => {
      const result = {
        childId: 'child-1',
        success: true,
        reductionType: 'automatic-full',
        appliedAt: new Date(),
        message: 'Automatic reduction applied per FR37A',
        graduationPathInitiated: true,
      }

      const parsed = reductionResultSchema.safeParse(result)
      expect(parsed.success).toBe(true)
    })

    it('should validate override-approved reduction', () => {
      const result = {
        childId: 'child-1',
        success: true,
        reductionType: 'override-approved',
        appliedAt: new Date(),
        message: 'Reduction applied with child-approved override',
        graduationPathInitiated: false,
      }

      const parsed = reductionResultSchema.safeParse(result)
      expect(parsed.success).toBe(true)
    })
  })

  describe('GraduationPath Schema', () => {
    it('should validate active graduation path', () => {
      const path = {
        childId: 'child-1',
        startedAt: new Date(),
        progressPercent: 25,
        expectedGraduationDate: new Date('2025-12-15'),
        milestonesAchieved: ['automatic-reduction-applied'],
        status: 'active',
      }

      const result = graduationPathSchema.safeParse(path)
      expect(result.success).toBe(true)
    })

    it('should validate all status types', () => {
      const statuses = ['active', 'paused', 'completed', 'regressed']

      for (const status of statuses) {
        const path = {
          childId: 'child-1',
          startedAt: new Date(),
          progressPercent: 50,
          expectedGraduationDate: new Date('2025-12-15'),
          milestonesAchieved: [],
          status,
        }

        const result = graduationPathSchema.safeParse(path)
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid progress', () => {
      const path = {
        childId: 'child-1',
        startedAt: new Date(),
        progressPercent: 150, // Invalid
        expectedGraduationDate: new Date('2025-12-15'),
        milestonesAchieved: [],
        status: 'active',
      }

      const result = graduationPathSchema.safeParse(path)
      expect(result.success).toBe(false)
    })
  })

  describe('createDefaultAutomaticReductionConfig', () => {
    it('should create config with null dates', () => {
      const config = createDefaultAutomaticReductionConfig('child-1')

      expect(config.childId).toBe('child-1')
      expect(config.eligibleAt).toBeNull()
      expect(config.appliedAt).toBeNull()
    })

    it('should create config with no override', () => {
      const config = createDefaultAutomaticReductionConfig('child-1')

      expect(config.overrideRequested).toBe(false)
      expect(config.overrideAgreedByChild).toBe(false)
    })

    it('should create config with no graduation path', () => {
      const config = createDefaultAutomaticReductionConfig('child-1')

      expect(config.graduationPathStarted).toBe(false)
      expect(config.expectedGraduationDate).toBeNull()
    })
  })

  describe('createOverrideRequest', () => {
    it('should create pending request', () => {
      const request = createOverrideRequest('child-1', 'parent-1', 'Need temporary adjustment')

      expect(request.childId).toBe('child-1')
      expect(request.requestedBy).toBe('parent-1')
      expect(request.status).toBe('pending')
      expect(request.respondedAt).toBeNull()
    })

    it('should set current timestamp', () => {
      const request = createOverrideRequest('child-1', 'parent-1', 'Reason here')

      expect(request.requestedAt).toEqual(new Date('2024-12-15T12:00:00Z'))
    })
  })

  describe('createReductionResult', () => {
    it('should create successful result', () => {
      const result = createReductionResult(
        'child-1',
        'automatic-full',
        true,
        'Reduction applied',
        true
      )

      expect(result.childId).toBe('child-1')
      expect(result.success).toBe(true)
      expect(result.reductionType).toBe('automatic-full')
      expect(result.graduationPathInitiated).toBe(true)
    })

    it('should default graduation path to false', () => {
      const result = createReductionResult('child-1', 'override-approved', true, 'Applied')

      expect(result.graduationPathInitiated).toBe(false)
    })
  })

  describe('createGraduationPath', () => {
    it('should create path with 12 month default', () => {
      const path = createGraduationPath('child-1')

      expect(path.childId).toBe('child-1')
      expect(path.status).toBe('active')
      expect(path.progressPercent).toBe(0)

      // Expected graduation 12 months from now
      const expectedDate = new Date('2025-12-15T12:00:00Z')
      expect(path.expectedGraduationDate.getMonth()).toBe(expectedDate.getMonth())
    })

    it('should create path with custom duration', () => {
      const path = createGraduationPath('child-1', 6)

      const expectedDate = new Date('2025-06-15T12:00:00Z')
      expect(path.expectedGraduationDate.getMonth()).toBe(expectedDate.getMonth())
    })

    it('should include initial milestone', () => {
      const path = createGraduationPath('child-1')

      expect(path.milestonesAchieved).toContain('automatic-reduction-applied')
    })
  })

  describe('daysToMonths', () => {
    it('should convert days to months', () => {
      expect(daysToMonths(30)).toBe(1)
      expect(daysToMonths(60)).toBe(2)
      expect(daysToMonths(180)).toBe(6)
    })

    it('should floor partial months', () => {
      expect(daysToMonths(45)).toBe(1)
      expect(daysToMonths(89)).toBe(2)
    })
  })

  describe('isOverrideActive', () => {
    it('should return true when both flags set', () => {
      const config = createDefaultAutomaticReductionConfig('child-1')
      config.overrideRequested = true
      config.overrideAgreedByChild = true

      expect(isOverrideActive(config)).toBe(true)
    })

    it('should return false when only parent requested', () => {
      const config = createDefaultAutomaticReductionConfig('child-1')
      config.overrideRequested = true
      config.overrideAgreedByChild = false

      expect(isOverrideActive(config)).toBe(false)
    })

    it('should return false when neither set', () => {
      const config = createDefaultAutomaticReductionConfig('child-1')

      expect(isOverrideActive(config)).toBe(false)
    })
  })

  describe('getParentNotificationMessage (AC3)', () => {
    it('should include child name', () => {
      const message = getParentNotificationMessage('Emma')

      expect(message).toContain('Emma')
    })

    it('should mention demonstrated maturity', () => {
      const message = getParentNotificationMessage('Emma')

      expect(message).toContain('demonstrated maturity')
    })

    it('should mention reduced monitoring', () => {
      const message = getParentNotificationMessage('Emma')

      expect(message).toContain('reduced monitoring')
    })

    it('should mention 6 months', () => {
      const message = getParentNotificationMessage('Emma')

      expect(message).toContain('6 months')
    })
  })

  describe('getCelebrationMessage (AC5)', () => {
    it('should show celebration for child', () => {
      const message = getCelebrationMessage('Emma', 'child')

      expect(message).toContain('Congratulations')
      expect(message).toContain('6 months of trust')
    })

    it('should show celebration for parent', () => {
      const message = getCelebrationMessage('Emma', 'parent')

      expect(message).toContain('Celebrating')
      expect(message).toContain('Emma')
      expect(message).toContain('6 months')
    })

    it('should mention independence for child', () => {
      const message = getCelebrationMessage('Emma', 'child')

      expect(message).toContain('independence')
    })
  })

  describe('getGraduationPathMessage (AC6)', () => {
    it('should show months remaining for child', () => {
      const futureDate = new Date('2025-06-15')
      const message = getGraduationPathMessage(futureDate, 'child')

      expect(message).toContain('path to full independence')
      expect(message).toMatch(/\d+ months/)
    })

    it('should show months remaining for parent', () => {
      const futureDate = new Date('2025-12-15')
      const message = getGraduationPathMessage(futureDate, 'parent')

      expect(message).toContain('graduation path')
      expect(message).toMatch(/\d+ months/)
    })
  })

  describe('getOverrideExplanation (AC4)', () => {
    it('should explain child agreement requirement', () => {
      const explanation = getOverrideExplanation()

      expect(explanation).toContain('child agreement')
    })

    it('should mention developmental rights', () => {
      const explanation = getOverrideExplanation()

      expect(explanation).toContain('developmental rights')
    })
  })
})
