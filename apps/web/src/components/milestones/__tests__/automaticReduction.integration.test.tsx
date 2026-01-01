/**
 * Automatic Reduction Integration Tests - Story 37.4 Task 4
 *
 * Integration tests for the complete automatic reduction system.
 * Tests all acceptance criteria together.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  AUTOMATIC_REDUCTION_TRUST_THRESHOLD,
  AUTOMATIC_REDUCTION_DURATION_MONTHS,
  isEligibleForAutomaticReduction,
  applyAutomaticReduction,
  requestOverride,
  respondToOverride,
  isOverrideInEffect,
  createGraduationPath,
  updateGraduationProgress,
  pauseGraduationPath,
  regressGraduationPath,
} from '@fledgely/shared'
import { AutomaticReductionNotification } from '../AutomaticReductionNotification'

describe('Automatic Reduction Integration - Story 37.4 Task 4', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-12-15T12:00:00Z'))
  })

  describe('AC1: 95%+ trust for 6 months triggers automatic reduction', () => {
    it('should require 95% trust threshold', () => {
      expect(AUTOMATIC_REDUCTION_TRUST_THRESHOLD).toBe(95)
    })

    it('should require 6 months duration', () => {
      expect(AUTOMATIC_REDUCTION_DURATION_MONTHS).toBe(6)
    })

    it('should be eligible at threshold', () => {
      // 6 months = 180 days
      expect(isEligibleForAutomaticReduction(95, 180)).toBe(true)
    })

    it('should not be eligible below threshold', () => {
      expect(isEligibleForAutomaticReduction(94, 180)).toBe(false)
      expect(isEligibleForAutomaticReduction(95, 150)).toBe(false)
    })
  })

  describe('AC2: Reduction is AUTOMATIC, not optional', () => {
    it('should apply reduction automatically', () => {
      const { result } = applyAutomaticReduction('child-1')

      expect(result.success).toBe(true)
      expect(result.reductionType).toBe('automatic-full')
    })

    it('should set appliedAt timestamp', () => {
      const { config } = applyAutomaticReduction('child-1')

      expect(config.appliedAt).toEqual(new Date('2024-12-15T12:00:00Z'))
    })

    it('should initiate graduation path', () => {
      const { config, graduationPath } = applyAutomaticReduction('child-1')

      expect(config.graduationPathStarted).toBe(true)
      expect(graduationPath.status).toBe('active')
    })
  })

  describe('AC3: Parent notified with maturity message', () => {
    it('should show maturity message in notification', () => {
      const config = applyAutomaticReduction('child-1').config

      render(
        <AutomaticReductionNotification config={config} viewerType="parent" childName="Emma" />
      )

      expect(screen.getByTestId('maturity-message')).toHaveTextContent('demonstrated maturity')
      expect(screen.getByTestId('maturity-message')).toHaveTextContent('reduced monitoring')
    })

    it('should mention 6 months', () => {
      const config = applyAutomaticReduction('child-1').config

      render(
        <AutomaticReductionNotification config={config} viewerType="parent" childName="Emma" />
      )

      expect(screen.getByTestId('maturity-message')).toHaveTextContent('6 months')
    })
  })

  describe('AC4: Parent cannot override without child agreement', () => {
    it('should create pending override that requires child agreement', () => {
      const config = applyAutomaticReduction('child-1').config
      const { config: overrideConfig } = requestOverride(
        'child-1',
        'parent-1',
        'Need temporary adjustment',
        config
      )

      expect(overrideConfig.overrideRequested).toBe(true)
      expect(overrideConfig.overrideAgreedByChild).toBe(false)
      expect(isOverrideInEffect(overrideConfig)).toBe(false)
    })

    it('should only activate override when child agrees', () => {
      const config = applyAutomaticReduction('child-1').config
      const { config: overrideConfig, request } = requestOverride(
        'child-1',
        'parent-1',
        'Need temporary adjustment',
        config
      )

      const { config: agreedConfig } = respondToOverride(overrideConfig, request, true)

      expect(isOverrideInEffect(agreedConfig)).toBe(true)
    })

    it('should not activate override when child rejects', () => {
      const config = applyAutomaticReduction('child-1').config
      const { config: overrideConfig, request } = requestOverride(
        'child-1',
        'parent-1',
        'Need temporary adjustment',
        config
      )

      const { config: rejectedConfig, request: rejectedRequest } = respondToOverride(
        overrideConfig,
        request,
        false
      )

      expect(isOverrideInEffect(rejectedConfig)).toBe(false)
      expect(rejectedRequest.status).toBe('rejected')
    })

    it('should show override request in child notification', () => {
      const config = applyAutomaticReduction('child-1').config
      const { request } = requestOverride(
        'child-1',
        'parent-1',
        'Family vacation needs adjustment',
        config
      )

      render(
        <AutomaticReductionNotification
          config={config}
          overrideRequest={request}
          viewerType="child"
          childName="Emma"
        />
      )

      expect(screen.getByTestId('override-request')).toBeInTheDocument()
      expect(screen.getByTestId('approve-override')).toBeInTheDocument()
      expect(screen.getByTestId('reject-override')).toBeInTheDocument()
    })

    it('should call response callback on button click', () => {
      const onOverrideResponse = vi.fn()
      const config = applyAutomaticReduction('child-1').config
      const { request } = requestOverride(
        'child-1',
        'parent-1',
        'Need temporary adjustment',
        config
      )

      render(
        <AutomaticReductionNotification
          config={config}
          overrideRequest={request}
          viewerType="child"
          childName="Emma"
          onOverrideResponse={onOverrideResponse}
        />
      )

      fireEvent.click(screen.getByTestId('reject-override'))
      expect(onOverrideResponse).toHaveBeenCalledWith(false)
    })
  })

  describe('AC5: Both parties celebrate', () => {
    it('should show celebration for child', () => {
      const config = applyAutomaticReduction('child-1').config

      render(<AutomaticReductionNotification config={config} viewerType="child" childName="Emma" />)

      expect(screen.getByTestId('celebration-banner')).toBeInTheDocument()
      expect(screen.getByTestId('celebration-message')).toHaveTextContent('Congratulations')
      expect(screen.getByTestId('celebration-message')).toHaveTextContent('6 months of trust')
    })

    it('should show celebration for parent', () => {
      const config = applyAutomaticReduction('child-1').config

      render(
        <AutomaticReductionNotification config={config} viewerType="parent" childName="Emma" />
      )

      expect(screen.getByTestId('celebration-banner')).toBeInTheDocument()
      expect(screen.getByTestId('celebration-message')).toHaveTextContent('Celebrating')
      expect(screen.getByTestId('celebration-message')).toHaveTextContent('Emma')
    })

    it('should show 6 months in heading', () => {
      const config = applyAutomaticReduction('child-1').config

      render(<AutomaticReductionNotification config={config} viewerType="child" childName="Emma" />)

      expect(screen.getByTestId('celebration-heading')).toHaveTextContent('6 Months of Trust')
    })
  })

  describe('AC6: Sets expectation of eventual graduation', () => {
    it('should show graduation path', () => {
      const config = applyAutomaticReduction('child-1').config
      const graduationPath = createGraduationPath('child-1', 12)

      render(
        <AutomaticReductionNotification
          config={config}
          graduationPath={graduationPath}
          viewerType="child"
          childName="Emma"
        />
      )

      expect(screen.getByTestId('graduation-path')).toBeInTheDocument()
    })

    it('should mention independence for child', () => {
      const config = applyAutomaticReduction('child-1').config
      const graduationPath = createGraduationPath('child-1', 12)

      render(
        <AutomaticReductionNotification
          config={config}
          graduationPath={graduationPath}
          viewerType="child"
          childName="Emma"
        />
      )

      expect(screen.getByTestId('graduation-message')).toHaveTextContent('independence')
    })

    it('should show graduation status', () => {
      const config = applyAutomaticReduction('child-1').config
      const graduationPath = createGraduationPath('child-1', 12)

      render(
        <AutomaticReductionNotification
          config={config}
          graduationPath={graduationPath}
          viewerType="child"
          childName="Emma"
        />
      )

      expect(screen.getByTestId('graduation-status')).toHaveTextContent('active')
    })
  })

  describe('Complete workflow', () => {
    it('should support full eligibility to graduation flow', () => {
      // 1. Check eligibility
      expect(isEligibleForAutomaticReduction(96, 190)).toBe(true)

      // 2. Apply reduction
      const { config, graduationPath } = applyAutomaticReduction('child-1')
      expect(config.appliedAt).not.toBeNull()
      expect(graduationPath.status).toBe('active')

      // 3. Update progress
      const updatedPath = updateGraduationProgress(graduationPath, 50, 'six-months')
      expect(updatedPath.progressPercent).toBe(50)
      expect(updatedPath.milestonesAchieved).toContain('six-months')
    })

    it('should support override request and child agreement flow', () => {
      // 1. Apply reduction
      const { config } = applyAutomaticReduction('child-1')

      // 2. Parent requests override
      const { config: overrideConfig, request } = requestOverride(
        'child-1',
        'parent-1',
        'Vacation needs temporary adjustment',
        config
      )
      expect(isOverrideInEffect(overrideConfig)).toBe(false)

      // 3. Child agrees
      const { config: agreedConfig } = respondToOverride(overrideConfig, request, true)
      expect(isOverrideInEffect(agreedConfig)).toBe(true)
    })

    it('should support graduation path regression handling', () => {
      const graduationPath = createGraduationPath('child-1')

      // Path pauses
      const paused = pauseGraduationPath(graduationPath)
      expect(paused.status).toBe('paused')

      // Path regresses
      const regressed = regressGraduationPath(graduationPath)
      expect(regressed.status).toBe('regressed')
    })
  })

  describe('Rights messaging', () => {
    it('should show rights reminder for child', () => {
      const config = applyAutomaticReduction('child-1').config

      render(<AutomaticReductionNotification config={config} viewerType="child" childName="Emma" />)

      expect(screen.getByTestId('rights-reminder')).toHaveTextContent('developmental right')
    })

    it('should emphasize child agreement for override', () => {
      const config = applyAutomaticReduction('child-1').config
      const { request } = requestOverride(
        'child-1',
        'parent-1',
        'Need temporary adjustment',
        config
      )

      render(
        <AutomaticReductionNotification
          config={config}
          overrideRequest={request}
          viewerType="child"
          childName="Emma"
        />
      )

      expect(screen.getByTestId('override-rights-note')).toHaveTextContent('your right to decide')
    })
  })
})
