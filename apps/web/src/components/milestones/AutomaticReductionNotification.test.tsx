/**
 * AutomaticReductionNotification Component Tests - Story 37.4 Task 3
 *
 * Tests for automatic reduction notification components.
 * AC3: Parent notified: "Your child's demonstrated maturity means reduced monitoring"
 * AC4: Parent cannot override without child agreement
 * AC5: Both parties celebrate: "6 months of trust - monitoring reducing"
 * AC6: Sets expectation of eventual graduation
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AutomaticReductionNotification } from './AutomaticReductionNotification'
import type { AutomaticReductionConfig, OverrideRequest, GraduationPath } from '@fledgely/shared'

describe('AutomaticReductionNotification - Story 37.4 Task 3', () => {
  const createConfig = (
    overrides: Partial<AutomaticReductionConfig> = {}
  ): AutomaticReductionConfig => ({
    childId: 'child-1',
    eligibleAt: null,
    appliedAt: null,
    overrideRequested: false,
    overrideAgreedByChild: false,
    graduationPathStarted: false,
    expectedGraduationDate: null,
    ...overrides,
  })

  const createAppliedConfig = (): AutomaticReductionConfig =>
    createConfig({
      appliedAt: new Date('2024-12-15'),
      eligibleAt: new Date('2024-06-15'),
      graduationPathStarted: true,
      expectedGraduationDate: new Date('2025-12-15'),
    })

  const createOverrideRequest = (overrides: Partial<OverrideRequest> = {}): OverrideRequest => ({
    childId: 'child-1',
    requestedBy: 'parent-1',
    reason: 'Need temporary adjustment for family vacation',
    requestedAt: new Date('2024-12-14'),
    status: 'pending',
    respondedAt: null,
    ...overrides,
  })

  const createGraduationPath = (overrides: Partial<GraduationPath> = {}): GraduationPath => ({
    childId: 'child-1',
    startedAt: new Date('2024-12-15'),
    progressPercent: 25,
    expectedGraduationDate: new Date('2025-12-15'),
    milestonesAchieved: ['automatic-reduction-applied'],
    status: 'active',
    ...overrides,
  })

  describe('AC3: Parent notification', () => {
    it('should show maturity message for parent', () => {
      render(
        <AutomaticReductionNotification
          config={createAppliedConfig()}
          viewerType="parent"
          childName="Emma"
        />
      )

      const message = screen.getByTestId('maturity-message')
      expect(message).toHaveTextContent('demonstrated maturity')
      expect(message).toHaveTextContent('reduced monitoring')
      expect(message).toHaveTextContent('Emma')
    })

    it('should mention 6 months in parent notification', () => {
      render(
        <AutomaticReductionNotification
          config={createAppliedConfig()}
          viewerType="parent"
          childName="Emma"
        />
      )

      expect(screen.getByTestId('maturity-message')).toHaveTextContent('6 months')
    })

    it('should not show parent notification for child view', () => {
      render(
        <AutomaticReductionNotification
          config={createAppliedConfig()}
          viewerType="child"
          childName="Emma"
        />
      )

      expect(screen.queryByTestId('parent-notification')).not.toBeInTheDocument()
    })
  })

  describe('AC4: Override requires child agreement', () => {
    it('should show override request to child', () => {
      const overrideRequest = createOverrideRequest()

      render(
        <AutomaticReductionNotification
          config={createAppliedConfig()}
          overrideRequest={overrideRequest}
          viewerType="child"
          childName="Emma"
        />
      )

      expect(screen.getByTestId('override-request')).toBeInTheDocument()
    })

    it('should show override reason', () => {
      const overrideRequest = createOverrideRequest({
        reason: 'Family vacation needs temporary adjustment',
      })

      render(
        <AutomaticReductionNotification
          config={createAppliedConfig()}
          overrideRequest={overrideRequest}
          viewerType="child"
          childName="Emma"
        />
      )

      expect(screen.getByTestId('override-reason')).toHaveTextContent(
        'Family vacation needs temporary adjustment'
      )
    })

    it('should have approve and reject buttons', () => {
      const overrideRequest = createOverrideRequest()

      render(
        <AutomaticReductionNotification
          config={createAppliedConfig()}
          overrideRequest={overrideRequest}
          viewerType="child"
          childName="Emma"
        />
      )

      expect(screen.getByTestId('approve-override')).toBeInTheDocument()
      expect(screen.getByTestId('reject-override')).toBeInTheDocument()
    })

    it('should call callback on approve', () => {
      const onOverrideResponse = vi.fn()
      const overrideRequest = createOverrideRequest()

      render(
        <AutomaticReductionNotification
          config={createAppliedConfig()}
          overrideRequest={overrideRequest}
          viewerType="child"
          childName="Emma"
          onOverrideResponse={onOverrideResponse}
        />
      )

      fireEvent.click(screen.getByTestId('approve-override'))

      expect(onOverrideResponse).toHaveBeenCalledWith(true)
    })

    it('should call callback on reject', () => {
      const onOverrideResponse = vi.fn()
      const overrideRequest = createOverrideRequest()

      render(
        <AutomaticReductionNotification
          config={createAppliedConfig()}
          overrideRequest={overrideRequest}
          viewerType="child"
          childName="Emma"
          onOverrideResponse={onOverrideResponse}
        />
      )

      fireEvent.click(screen.getByTestId('reject-override'))

      expect(onOverrideResponse).toHaveBeenCalledWith(false)
    })

    it('should show rights note', () => {
      const overrideRequest = createOverrideRequest()

      render(
        <AutomaticReductionNotification
          config={createAppliedConfig()}
          overrideRequest={overrideRequest}
          viewerType="child"
          childName="Emma"
        />
      )

      expect(screen.getByTestId('override-rights-note')).toHaveTextContent('your right to decide')
    })

    it('should not show override request to parent', () => {
      const overrideRequest = createOverrideRequest()

      render(
        <AutomaticReductionNotification
          config={createAppliedConfig()}
          overrideRequest={overrideRequest}
          viewerType="parent"
          childName="Emma"
        />
      )

      expect(screen.queryByTestId('override-request')).not.toBeInTheDocument()
    })
  })

  describe('AC5: Celebration message', () => {
    it('should show celebration banner when applied', () => {
      render(
        <AutomaticReductionNotification
          config={createAppliedConfig()}
          viewerType="child"
          childName="Emma"
        />
      )

      expect(screen.getByTestId('celebration-banner')).toBeInTheDocument()
    })

    it('should show celebration icon', () => {
      render(
        <AutomaticReductionNotification
          config={createAppliedConfig()}
          viewerType="child"
          childName="Emma"
        />
      )

      expect(screen.getByTestId('celebration-icon')).toHaveTextContent('🎉')
    })

    it('should show 6 months celebration heading', () => {
      render(
        <AutomaticReductionNotification
          config={createAppliedConfig()}
          viewerType="child"
          childName="Emma"
        />
      )

      expect(screen.getByTestId('celebration-heading')).toHaveTextContent('6 Months of Trust')
    })

    it('should show child celebration message', () => {
      render(
        <AutomaticReductionNotification
          config={createAppliedConfig()}
          viewerType="child"
          childName="Emma"
        />
      )

      expect(screen.getByTestId('celebration-message')).toHaveTextContent('Congratulations')
      expect(screen.getByTestId('celebration-message')).toHaveTextContent('independence')
    })

    it('should show parent celebration message', () => {
      render(
        <AutomaticReductionNotification
          config={createAppliedConfig()}
          viewerType="parent"
          childName="Emma"
        />
      )

      expect(screen.getByTestId('celebration-message')).toHaveTextContent('Celebrating')
      expect(screen.getByTestId('celebration-message')).toHaveTextContent('Emma')
    })
  })

  describe('AC6: Graduation path', () => {
    it('should show graduation path when available', () => {
      const graduationPath = createGraduationPath()

      render(
        <AutomaticReductionNotification
          config={createAppliedConfig()}
          graduationPath={graduationPath}
          viewerType="child"
          childName="Emma"
        />
      )

      expect(screen.getByTestId('graduation-path')).toBeInTheDocument()
    })

    it('should show graduation progress', () => {
      const graduationPath = createGraduationPath({ progressPercent: 50 })

      render(
        <AutomaticReductionNotification
          config={createAppliedConfig()}
          graduationPath={graduationPath}
          viewerType="child"
          childName="Emma"
        />
      )

      expect(screen.getByTestId('graduation-progress')).toHaveAttribute('aria-valuenow', '50')
    })

    it('should show child graduation message', () => {
      const graduationPath = createGraduationPath()

      render(
        <AutomaticReductionNotification
          config={createAppliedConfig()}
          graduationPath={graduationPath}
          viewerType="child"
          childName="Emma"
        />
      )

      expect(screen.getByTestId('graduation-message')).toHaveTextContent(
        'path to full independence'
      )
    })

    it('should show parent graduation message', () => {
      const graduationPath = createGraduationPath()

      render(
        <AutomaticReductionNotification
          config={createAppliedConfig()}
          graduationPath={graduationPath}
          viewerType="parent"
          childName="Emma"
        />
      )

      expect(screen.getByTestId('graduation-message')).toHaveTextContent('graduation path')
    })

    it('should show graduation status', () => {
      const graduationPath = createGraduationPath({ status: 'active' })

      render(
        <AutomaticReductionNotification
          config={createAppliedConfig()}
          graduationPath={graduationPath}
          viewerType="child"
          childName="Emma"
        />
      )

      expect(screen.getByTestId('graduation-status')).toHaveTextContent('active')
    })
  })

  describe('Pending status', () => {
    it('should show pending status when not applied', () => {
      render(
        <AutomaticReductionNotification
          config={createConfig()}
          viewerType="child"
          childName="Emma"
        />
      )

      expect(screen.getByTestId('pending-status')).toBeInTheDocument()
      expect(screen.getByTestId('pending-status')).toHaveTextContent('not yet')
    })

    it('should not show celebration when not applied', () => {
      render(
        <AutomaticReductionNotification
          config={createConfig()}
          viewerType="child"
          childName="Emma"
        />
      )

      expect(screen.queryByTestId('celebration-banner')).not.toBeInTheDocument()
    })
  })

  describe('Override result', () => {
    it('should show approved override result', () => {
      const overrideRequest = createOverrideRequest({
        status: 'approved',
        respondedAt: new Date(),
      })

      render(
        <AutomaticReductionNotification
          config={createAppliedConfig()}
          overrideRequest={overrideRequest}
          viewerType="child"
          childName="Emma"
        />
      )

      expect(screen.getByTestId('override-result')).toHaveTextContent('mutually agreed')
    })

    it('should show rejected override result for child', () => {
      const overrideRequest = createOverrideRequest({
        status: 'rejected',
        respondedAt: new Date(),
      })

      render(
        <AutomaticReductionNotification
          config={createAppliedConfig()}
          overrideRequest={overrideRequest}
          viewerType="child"
          childName="Emma"
        />
      )

      expect(screen.getByTestId('override-result')).toHaveTextContent('You declined')
    })
  })

  describe('Rights reminder', () => {
    it('should show rights reminder for child', () => {
      render(
        <AutomaticReductionNotification
          config={createAppliedConfig()}
          viewerType="child"
          childName="Emma"
        />
      )

      expect(screen.getByTestId('rights-reminder')).toHaveTextContent('developmental right')
    })

    it('should not show rights reminder for parent', () => {
      render(
        <AutomaticReductionNotification
          config={createAppliedConfig()}
          viewerType="parent"
          childName="Emma"
        />
      )

      expect(screen.queryByTestId('rights-reminder')).not.toBeInTheDocument()
    })
  })

  describe('Data attributes', () => {
    it('should set applied data attribute when true', () => {
      render(
        <AutomaticReductionNotification
          config={createAppliedConfig()}
          viewerType="child"
          childName="Emma"
        />
      )

      expect(screen.getByTestId('automatic-reduction-notification')).toHaveAttribute(
        'data-applied',
        'true'
      )
    })

    it('should set applied data attribute when false', () => {
      render(
        <AutomaticReductionNotification
          config={createConfig()}
          viewerType="child"
          childName="Emma"
        />
      )

      expect(screen.getByTestId('automatic-reduction-notification')).toHaveAttribute(
        'data-applied',
        'false'
      )
    })
  })

  describe('Accessibility', () => {
    it('should have aria-label', () => {
      render(
        <AutomaticReductionNotification
          config={createAppliedConfig()}
          viewerType="child"
          childName="Emma"
        />
      )

      expect(screen.getByTestId('automatic-reduction-notification')).toHaveAttribute('aria-label')
    })

    it('should have progress bar accessibility attributes', () => {
      const graduationPath = createGraduationPath({ progressPercent: 25 })

      render(
        <AutomaticReductionNotification
          config={createAppliedConfig()}
          graduationPath={graduationPath}
          viewerType="child"
          childName="Emma"
        />
      )

      const progressBar = screen.getByTestId('graduation-progress')
      expect(progressBar).toHaveAttribute('role', 'progressbar')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
    })
  })
})
