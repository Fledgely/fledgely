/**
 * NotificationOnlyModeIndicator Component Tests - Story 37.3 Task 4
 *
 * Tests for notification-only mode indicator.
 * AC4: Time limits still enforced if configured
 * AC5: Child sees "You're in notification-only mode - we trust you"
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NotificationOnlyModeIndicator } from './NotificationOnlyModeIndicator'
import type { NotificationOnlyConfig, DailySummary } from '@fledgely/shared'

describe('NotificationOnlyModeIndicator - Story 37.3 Task 4', () => {
  const createConfig = (
    overrides: Partial<NotificationOnlyConfig> = {}
  ): NotificationOnlyConfig => ({
    childId: 'child-1',
    enabled: false,
    enabledAt: null,
    qualifiedAt: null,
    dailySummaryEnabled: true,
    timeLimitsStillEnforced: true,
    ...overrides,
  })

  const createActiveConfig = (): NotificationOnlyConfig =>
    createConfig({
      enabled: true,
      enabledAt: new Date('2024-12-01'),
      qualifiedAt: new Date('2024-11-01'),
    })

  const createSummary = (overrides: Partial<DailySummary> = {}): DailySummary => ({
    childId: 'child-1',
    date: new Date(),
    totalUsageMinutes: 180,
    topApps: [{ appName: 'YouTube', usageMinutes: 60 }],
    concerningPatterns: [],
    timeLimitsReached: false,
    status: 'normal',
    ...overrides,
  })

  describe('AC5: Child message', () => {
    it('should show exact AC5 message for child in mode', () => {
      render(
        <NotificationOnlyModeIndicator
          config={createActiveConfig()}
          viewerType="child"
          childName="Emma"
        />
      )

      // AC5: Child sees "You're in notification-only mode - we trust you"
      expect(screen.getByTestId('status-message')).toHaveTextContent(
        "You're in notification-only mode - we trust you"
      )
    })

    it('should show standard monitoring when mode inactive', () => {
      render(
        <NotificationOnlyModeIndicator
          config={createConfig()}
          viewerType="child"
          childName="Emma"
        />
      )

      expect(screen.getByTestId('status-message')).toHaveTextContent(
        'Standard monitoring is active'
      )
    })
  })

  describe('AC4: Time limits', () => {
    it('should show time limits active when enforced', () => {
      render(
        <NotificationOnlyModeIndicator
          config={createActiveConfig()}
          viewerType="child"
          childName="Emma"
        />
      )

      expect(screen.getByTestId('time-limits-status')).toHaveTextContent(
        'Time limits are still active'
      )
    })

    it('should show time limits inactive when not enforced', () => {
      const config = createActiveConfig()
      config.timeLimitsStillEnforced = false

      render(<NotificationOnlyModeIndicator config={config} viewerType="child" childName="Emma" />)

      expect(screen.getByTestId('time-limits-status')).toHaveTextContent(
        'Time limits are not active'
      )
    })

    it('should not show time limits when mode inactive', () => {
      render(
        <NotificationOnlyModeIndicator
          config={createConfig()}
          viewerType="child"
          childName="Emma"
        />
      )

      expect(screen.queryByTestId('time-limits-status')).not.toBeInTheDocument()
    })
  })

  describe('Mode icon', () => {
    it('should show graduation icon when active', () => {
      render(
        <NotificationOnlyModeIndicator
          config={createActiveConfig()}
          viewerType="child"
          childName="Emma"
        />
      )

      expect(screen.getByTestId('mode-icon')).toHaveTextContent('🎓')
    })

    it('should show monitoring icon when inactive', () => {
      render(
        <NotificationOnlyModeIndicator
          config={createConfig()}
          viewerType="child"
          childName="Emma"
        />
      )

      expect(screen.getByTestId('mode-icon')).toHaveTextContent('📊')
    })
  })

  describe('Near-graduation badge', () => {
    it('should show near-graduation badge when active', () => {
      render(
        <NotificationOnlyModeIndicator
          config={createActiveConfig()}
          viewerType="child"
          childName="Emma"
        />
      )

      expect(screen.getByTestId('near-graduation-badge')).toHaveTextContent('Near Graduation')
    })

    it('should not show badge when inactive', () => {
      render(
        <NotificationOnlyModeIndicator
          config={createConfig()}
          viewerType="child"
          childName="Emma"
        />
      )

      expect(screen.queryByTestId('near-graduation-badge')).not.toBeInTheDocument()
    })
  })

  describe('Parent view', () => {
    it('should show child name in parent message', () => {
      render(
        <NotificationOnlyModeIndicator
          config={createActiveConfig()}
          viewerType="parent"
          childName="Emma"
        />
      )

      expect(screen.getByTestId('status-message')).toHaveTextContent('Emma')
      expect(screen.getByTestId('status-message')).toHaveTextContent('notification-only mode')
    })

    it('should show daily summary preview', () => {
      render(
        <NotificationOnlyModeIndicator
          config={createActiveConfig()}
          viewerType="parent"
          childName="Emma"
          latestSummary={createSummary()}
        />
      )

      expect(screen.getByTestId('summary-preview')).toBeInTheDocument()
      expect(screen.getByTestId('usage-summary')).toHaveTextContent('3 hours')
    })

    it('should show no concerns when summary is clean', () => {
      render(
        <NotificationOnlyModeIndicator
          config={createActiveConfig()}
          viewerType="parent"
          childName="Emma"
          latestSummary={createSummary()}
        />
      )

      expect(screen.getByTestId('no-concerns')).toHaveTextContent('No concerning patterns')
    })

    it('should show concern count when patterns exist', () => {
      const summary = createSummary({
        concerningPatterns: [
          {
            type: 'excessive-usage',
            description: 'High usage',
            severity: 'medium',
            detectedAt: new Date(),
          },
        ],
        status: 'attention-needed',
      })

      render(
        <NotificationOnlyModeIndicator
          config={createActiveConfig()}
          viewerType="parent"
          childName="Emma"
          latestSummary={summary}
        />
      )

      expect(screen.getByTestId('has-concerns')).toHaveTextContent('1 patterns to review')
    })

    it('should show daily summary settings', () => {
      render(
        <NotificationOnlyModeIndicator
          config={createActiveConfig()}
          viewerType="parent"
          childName="Emma"
        />
      )

      expect(screen.getByTestId('settings-info')).toHaveTextContent('Daily summaries: Enabled')
    })
  })

  describe('Child view privacy message', () => {
    it('should show privacy message when active', () => {
      render(
        <NotificationOnlyModeIndicator
          config={createActiveConfig()}
          viewerType="child"
          childName="Emma"
        />
      )

      expect(screen.getByTestId('privacy-message')).toBeInTheDocument()
      expect(screen.getByTestId('privacy-message')).toHaveTextContent('Screenshots are paused')
    })

    it('should not show privacy message when inactive', () => {
      render(
        <NotificationOnlyModeIndicator
          config={createConfig()}
          viewerType="child"
          childName="Emma"
        />
      )

      expect(screen.queryByTestId('privacy-message')).not.toBeInTheDocument()
    })
  })

  describe('Qualification progress', () => {
    it('should show progress bar when not active', () => {
      render(
        <NotificationOnlyModeIndicator
          config={createConfig()}
          viewerType="child"
          childName="Emma"
          qualificationProgress={50}
          daysUntilQualification={15}
        />
      )

      expect(screen.getByTestId('qualification-progress')).toBeInTheDocument()
      expect(screen.getByTestId('progress-bar')).toHaveAttribute('aria-valuenow', '50')
    })

    it('should show days until qualification', () => {
      render(
        <NotificationOnlyModeIndicator
          config={createConfig()}
          viewerType="child"
          childName="Emma"
          qualificationProgress={50}
          daysUntilQualification={15}
        />
      )

      expect(screen.getByTestId('qualification-message')).toHaveTextContent(
        '15 days until you qualify'
      )
    })

    it('should show qualified message at 100%', () => {
      render(
        <NotificationOnlyModeIndicator
          config={createConfig()}
          viewerType="child"
          childName="Emma"
          qualificationProgress={100}
          daysUntilQualification={0}
        />
      )

      expect(screen.getByTestId('qualification-message')).toHaveTextContent('You qualify')
    })

    it('should show score needed message when score too low', () => {
      render(
        <NotificationOnlyModeIndicator
          config={createConfig()}
          viewerType="child"
          childName="Emma"
          qualificationProgress={0}
          daysUntilQualification={-1}
        />
      )

      expect(screen.getByTestId('qualification-message')).toHaveTextContent('Reach 95% trust')
    })

    it('should not show progress when active', () => {
      render(
        <NotificationOnlyModeIndicator
          config={createActiveConfig()}
          viewerType="child"
          childName="Emma"
          qualificationProgress={100}
        />
      )

      expect(screen.queryByTestId('qualification-progress')).not.toBeInTheDocument()
    })
  })

  describe('Data attributes', () => {
    it('should set active data attribute when mode is on', () => {
      render(
        <NotificationOnlyModeIndicator
          config={createActiveConfig()}
          viewerType="child"
          childName="Emma"
        />
      )

      expect(screen.getByTestId('notification-only-indicator')).toHaveAttribute(
        'data-active',
        'true'
      )
    })

    it('should set inactive data attribute when mode is off', () => {
      render(
        <NotificationOnlyModeIndicator
          config={createConfig()}
          viewerType="child"
          childName="Emma"
        />
      )

      expect(screen.getByTestId('notification-only-indicator')).toHaveAttribute(
        'data-active',
        'false'
      )
    })
  })

  describe('Accessibility', () => {
    it('should have aria-label', () => {
      render(
        <NotificationOnlyModeIndicator
          config={createActiveConfig()}
          viewerType="child"
          childName="Emma"
        />
      )

      expect(screen.getByTestId('notification-only-indicator')).toHaveAttribute('aria-label')
    })

    it('should have progress bar accessibility attributes', () => {
      render(
        <NotificationOnlyModeIndicator
          config={createConfig()}
          viewerType="child"
          childName="Emma"
          qualificationProgress={50}
        />
      )

      const progressBar = screen.getByTestId('progress-bar')
      expect(progressBar).toHaveAttribute('role', 'progressbar')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
    })
  })
})
