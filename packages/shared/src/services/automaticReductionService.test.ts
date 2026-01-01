/**
 * AutomaticReductionService Tests - Story 37.4 Task 2
 *
 * Tests for automatic monitoring reduction lifecycle.
 * AC1: 95%+ trust for 6 months triggers automatic reduction
 * AC2: Reduction is AUTOMATIC, not optional
 * AC4: Parent cannot override without child agreement
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  isEligibleForAutomaticReduction,
  getMonthsUntilEligible,
  getEligibilityProgress,
  applyAutomaticReduction,
  shouldApplyReduction,
  requestOverride,
  respondToOverride,
  withdrawOverride,
  isOverrideInEffect,
  updateGraduationProgress,
  pauseGraduationPath,
  resumeGraduationPath,
  regressGraduationPath,
  getReductionStatusMessage,
  getOverrideStatusMessage,
  getEligibilityMessage,
} from './automaticReductionService'
import {
  AUTOMATIC_REDUCTION_TRUST_THRESHOLD,
  AUTOMATIC_REDUCTION_DURATION_MONTHS,
  createDefaultAutomaticReductionConfig,
  createOverrideRequest,
  createGraduationPath,
  type AutomaticReductionConfig,
} from '../contracts/automaticReduction'

describe('AutomaticReductionService - Story 37.4 Task 2', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-12-15T12:00:00Z'))
  })

  describe('isEligibleForAutomaticReduction (AC1)', () => {
    it('should return true at 95% for 6 months', () => {
      // 6 months = 180 days
      expect(isEligibleForAutomaticReduction(95, 180)).toBe(true)
    })

    it('should return true when exceeding thresholds', () => {
      expect(isEligibleForAutomaticReduction(100, 210)).toBe(true)
    })

    it('should return false below 95%', () => {
      expect(isEligibleForAutomaticReduction(94, 180)).toBe(false)
      expect(isEligibleForAutomaticReduction(90, 365)).toBe(false)
    })

    it('should return false below 6 months', () => {
      expect(isEligibleForAutomaticReduction(95, 150)).toBe(false) // 5 months
      expect(isEligibleForAutomaticReduction(100, 60)).toBe(false) // 2 months
    })

    it('should use configured thresholds', () => {
      expect(AUTOMATIC_REDUCTION_TRUST_THRESHOLD).toBe(95)
      expect(AUTOMATIC_REDUCTION_DURATION_MONTHS).toBe(6)
    })
  })

  describe('getMonthsUntilEligible', () => {
    it('should return 0 when eligible', () => {
      expect(getMonthsUntilEligible(95, 180)).toBe(0)
      expect(getMonthsUntilEligible(100, 200)).toBe(0)
    })

    it('should return remaining months', () => {
      expect(getMonthsUntilEligible(95, 90)).toBe(3) // 3 months, need 3 more
      expect(getMonthsUntilEligible(95, 30)).toBe(5) // 1 month, need 5 more
    })

    it('should return -1 when trust too low', () => {
      expect(getMonthsUntilEligible(90, 180)).toBe(-1)
      expect(getMonthsUntilEligible(80, 365)).toBe(-1)
    })
  })

  describe('getEligibilityProgress', () => {
    it('should return 100 when eligible', () => {
      expect(getEligibilityProgress(95, 180)).toBe(100)
      expect(getEligibilityProgress(100, 365)).toBe(100)
    })

    it('should return 0 when trust too low', () => {
      expect(getEligibilityProgress(90, 180)).toBe(0)
    })

    it('should return percentage when in progress', () => {
      expect(getEligibilityProgress(95, 90)).toBe(50) // 90/180 = 50%
      expect(getEligibilityProgress(95, 45)).toBe(25) // 45/180 = 25%
    })
  })

  describe('applyAutomaticReduction (AC2)', () => {
    it('should apply reduction automatically', () => {
      const { config, result, graduationPath } = applyAutomaticReduction('child-1')

      expect(config.appliedAt).not.toBeNull()
      expect(result.success).toBe(true)
      expect(result.reductionType).toBe('automatic-full')
      expect(graduationPath).toBeDefined()
    })

    it('should initiate graduation path', () => {
      const { config, result, graduationPath } = applyAutomaticReduction('child-1')

      expect(config.graduationPathStarted).toBe(true)
      expect(result.graduationPathInitiated).toBe(true)
      expect(graduationPath.status).toBe('active')
    })

    it('should handle already reduced config', () => {
      const existingConfig: AutomaticReductionConfig = {
        ...createDefaultAutomaticReductionConfig('child-1'),
        appliedAt: new Date('2024-06-15'),
        graduationPathStarted: true,
      }

      const { result } = applyAutomaticReduction('child-1', existingConfig)

      expect(result.reductionType).toBe('already-reduced')
    })

    it('should set expected graduation date', () => {
      const { config } = applyAutomaticReduction('child-1')

      expect(config.expectedGraduationDate).not.toBeNull()
      // Should be approximately 1 year from now
      const yearFromNow = new Date('2025-12-15')
      expect(config.expectedGraduationDate?.getFullYear()).toBe(yearFromNow.getFullYear())
    })
  })

  describe('shouldApplyReduction', () => {
    it('should return true for new config', () => {
      const config = createDefaultAutomaticReductionConfig('child-1')

      expect(shouldApplyReduction(config)).toBe(true)
    })

    it('should return false if already applied', () => {
      const config: AutomaticReductionConfig = {
        ...createDefaultAutomaticReductionConfig('child-1'),
        appliedAt: new Date(),
      }

      expect(shouldApplyReduction(config)).toBe(false)
    })

    it('should return false if override requested', () => {
      const config: AutomaticReductionConfig = {
        ...createDefaultAutomaticReductionConfig('child-1'),
        overrideRequested: true,
      }

      expect(shouldApplyReduction(config)).toBe(false)
    })
  })

  describe('requestOverride (AC4)', () => {
    it('should create pending override request', () => {
      const existingConfig = createDefaultAutomaticReductionConfig('child-1')

      const { config, request } = requestOverride(
        'child-1',
        'parent-1',
        'Need temporary adjustment for vacation',
        existingConfig
      )

      expect(config.overrideRequested).toBe(true)
      expect(config.overrideAgreedByChild).toBe(false)
      expect(request.status).toBe('pending')
    })

    it('should store override reason', () => {
      const existingConfig = createDefaultAutomaticReductionConfig('child-1')

      const { config } = requestOverride(
        'child-1',
        'parent-1',
        'Specific reason here',
        existingConfig
      )

      expect(config.overrideReason).toBe('Specific reason here')
    })
  })

  describe('respondToOverride (AC4)', () => {
    const setupOverride = () => {
      const existingConfig = createDefaultAutomaticReductionConfig('child-1')
      const { config, request } = requestOverride(
        'child-1',
        'parent-1',
        'Valid reason for override',
        existingConfig
      )
      return { config, request }
    }

    it('should allow child to approve override', () => {
      const { config, request } = setupOverride()

      const { config: updatedConfig, request: updatedRequest } = respondToOverride(
        config,
        request,
        true,
        'I understand, this is okay'
      )

      expect(updatedConfig.overrideAgreedByChild).toBe(true)
      expect(updatedRequest.status).toBe('approved')
      expect(updatedRequest.childResponse).toBe('I understand, this is okay')
    })

    it('should allow child to reject override (AC4)', () => {
      const { config, request } = setupOverride()

      const { config: updatedConfig, request: updatedRequest } = respondToOverride(
        config,
        request,
        false,
        'I prefer to keep my reduced monitoring'
      )

      expect(updatedConfig.overrideAgreedByChild).toBe(false)
      expect(updatedRequest.status).toBe('rejected')
    })

    it('should set responded timestamp', () => {
      const { config, request } = setupOverride()

      const { request: updatedRequest } = respondToOverride(config, request, true)

      expect(updatedRequest.respondedAt).toEqual(new Date('2024-12-15T12:00:00Z'))
    })
  })

  describe('withdrawOverride', () => {
    it('should withdraw pending override', () => {
      const existingConfig = createDefaultAutomaticReductionConfig('child-1')
      const { config, request } = requestOverride(
        'child-1',
        'parent-1',
        'Reason for override request',
        existingConfig
      )

      const { config: updatedConfig, request: updatedRequest } = withdrawOverride(config, request)

      expect(updatedConfig.overrideRequested).toBe(false)
      expect(updatedConfig.overrideReason).toBeUndefined()
      expect(updatedRequest.status).toBe('withdrawn')
    })
  })

  describe('isOverrideInEffect', () => {
    it('should return true when both flags set', () => {
      const config: AutomaticReductionConfig = {
        ...createDefaultAutomaticReductionConfig('child-1'),
        overrideRequested: true,
        overrideAgreedByChild: true,
      }

      expect(isOverrideInEffect(config)).toBe(true)
    })

    it('should return false without child agreement (AC4)', () => {
      const config: AutomaticReductionConfig = {
        ...createDefaultAutomaticReductionConfig('child-1'),
        overrideRequested: true,
        overrideAgreedByChild: false,
      }

      expect(isOverrideInEffect(config)).toBe(false)
    })
  })

  describe('Graduation Path Functions', () => {
    describe('updateGraduationProgress', () => {
      it('should update progress', () => {
        const path = createGraduationPath('child-1')

        const updated = updateGraduationProgress(path, 50)

        expect(updated.progressPercent).toBe(50)
      })

      it('should add milestone', () => {
        const path = createGraduationPath('child-1')

        const updated = updateGraduationProgress(path, 25, 'first-month-complete')

        expect(updated.milestonesAchieved).toContain('first-month-complete')
      })

      it('should mark completed at 100%', () => {
        const path = createGraduationPath('child-1')

        const updated = updateGraduationProgress(path, 100)

        expect(updated.status).toBe('completed')
      })

      it('should clamp progress to 0-100', () => {
        const path = createGraduationPath('child-1')

        expect(updateGraduationProgress(path, 150).progressPercent).toBe(100)
        expect(updateGraduationProgress(path, -10).progressPercent).toBe(0)
      })
    })

    describe('pauseGraduationPath', () => {
      it('should pause path', () => {
        const path = createGraduationPath('child-1')

        const paused = pauseGraduationPath(path)

        expect(paused.status).toBe('paused')
      })
    })

    describe('resumeGraduationPath', () => {
      it('should resume path', () => {
        const path = pauseGraduationPath(createGraduationPath('child-1'))

        const resumed = resumeGraduationPath(path)

        expect(resumed.status).toBe('active')
      })
    })

    describe('regressGraduationPath', () => {
      it('should mark path as regressed', () => {
        const path = createGraduationPath('child-1')

        const regressed = regressGraduationPath(path)

        expect(regressed.status).toBe('regressed')
      })
    })
  })

  describe('Status Messages', () => {
    describe('getReductionStatusMessage', () => {
      it('should show not applied for child', () => {
        const config = createDefaultAutomaticReductionConfig('child-1')

        const message = getReductionStatusMessage(config, 'Emma', 'child')

        expect(message).toContain('not yet been applied')
      })

      it('should show active status', () => {
        const config: AutomaticReductionConfig = {
          ...createDefaultAutomaticReductionConfig('child-1'),
          appliedAt: new Date(),
        }

        const message = getReductionStatusMessage(config, 'Emma', 'child')

        expect(message).toContain('active')
        expect(message).toContain('privacy')
      })

      it('should show override status', () => {
        const config: AutomaticReductionConfig = {
          ...createDefaultAutomaticReductionConfig('child-1'),
          appliedAt: new Date(),
          overrideRequested: true,
          overrideAgreedByChild: true,
        }

        const message = getReductionStatusMessage(config, 'Emma', 'child')

        expect(message).toContain('paused')
        expect(message).toContain('mutual agreement')
      })
    })

    describe('getOverrideStatusMessage', () => {
      it('should show pending for child', () => {
        const request = createOverrideRequest('child-1', 'parent-1', 'Valid reason here')

        const message = getOverrideStatusMessage(request, 'child')

        expect(message).toContain('agreement is needed')
      })

      it('should show pending for parent', () => {
        const request = createOverrideRequest('child-1', 'parent-1', 'Valid reason here')

        const message = getOverrideStatusMessage(request, 'parent')

        expect(message).toContain("pending your child's agreement")
      })
    })

    describe('getEligibilityMessage', () => {
      it('should prompt for higher trust', () => {
        const message = getEligibilityMessage(90, 180, 'Emma', 'child')

        expect(message).toContain('Reach')
        expect(message).toContain('95%')
      })

      it('should show qualified message', () => {
        const message = getEligibilityMessage(95, 180, 'Emma', 'child')

        expect(message).toContain('qualify')
      })

      it('should show months remaining', () => {
        const message = getEligibilityMessage(95, 90, 'Emma', 'child')

        expect(message).toContain('3 more months')
      })
    })
  })
})
