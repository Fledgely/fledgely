/**
 * Tests for Location Abuse Alert Component
 *
 * Story 40.6: Location Feature Abuse Prevention
 * - AC4: Bilateral parent alerts
 * - AC5: Conflict resolution resources
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LocationAbuseAlert, type LocationAbuseAlertData } from '../LocationAbuseAlert'

describe('LocationAbuseAlert', () => {
  const baseAlert: LocationAbuseAlertData = {
    id: 'alert-123',
    patternType: 'asymmetric_checks',
    sentAt: new Date('2026-01-03'),
    acknowledged: false,
    resourcesViewed: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders alert container', () => {
      render(<LocationAbuseAlert alert={baseAlert} />)

      expect(screen.getByTestId('location-abuse-alert')).toBeInTheDocument()
    })

    it('displays alert title', () => {
      render(<LocationAbuseAlert alert={baseAlert} />)

      expect(screen.getByText('Location Check Pattern Detected')).toBeInTheDocument()
    })

    it('displays alert summary', () => {
      render(<LocationAbuseAlert alert={baseAlert} />)

      expect(
        screen.getByText(/imbalance in how often location features are being used/i)
      ).toBeInTheDocument()
    })

    it('displays acknowledge button when not acknowledged', () => {
      render(<LocationAbuseAlert alert={baseAlert} />)

      expect(screen.getByTestId('acknowledge-button')).toBeInTheDocument()
      expect(screen.getByText('I understand')).toBeInTheDocument()
    })

    it('displays acknowledged badge when acknowledged', () => {
      const acknowledgedAlert = { ...baseAlert, acknowledged: true }
      render(<LocationAbuseAlert alert={acknowledgedAlert} />)

      expect(screen.getByTestId('acknowledged-badge')).toBeInTheDocument()
      expect(screen.getByText('Acknowledged')).toBeInTheDocument()
      expect(screen.queryByTestId('acknowledge-button')).not.toBeInTheDocument()
    })

    it('displays view resources button', () => {
      render(<LocationAbuseAlert alert={baseAlert} />)

      expect(screen.getByTestId('view-resources-button')).toBeInTheDocument()
      expect(screen.getByText('View Resources')).toBeInTheDocument()
    })

    it('displays timestamp', () => {
      render(<LocationAbuseAlert alert={baseAlert} />)

      expect(screen.getByTestId('alert-timestamp')).toBeInTheDocument()
      expect(screen.getByText(/Detected on/i)).toBeInTheDocument()
    })
  })

  describe('Pattern Types', () => {
    it('displays asymmetric checks message', () => {
      render(<LocationAbuseAlert alert={baseAlert} />)

      expect(screen.getByText('Location Check Pattern Detected')).toBeInTheDocument()
    })

    it('displays frequent rule changes message', () => {
      const alert = { ...baseAlert, patternType: 'frequent_rule_changes' as const }
      render(<LocationAbuseAlert alert={alert} />)

      expect(screen.getByText('Frequent Rule Changes Detected')).toBeInTheDocument()
    })

    it('displays cross-custody restriction message', () => {
      const alert = { ...baseAlert, patternType: 'cross_custody_restriction' as const }
      render(<LocationAbuseAlert alert={alert} />)

      expect(screen.getByText('Cross-Custody Rule Pattern Detected')).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('calls onAcknowledge when acknowledge button clicked', () => {
      const onAcknowledge = vi.fn()
      render(<LocationAbuseAlert alert={baseAlert} onAcknowledge={onAcknowledge} />)

      fireEvent.click(screen.getByTestId('acknowledge-button'))

      expect(onAcknowledge).toHaveBeenCalledWith('alert-123')
    })

    it('does not call onAcknowledge when already acknowledged', () => {
      const onAcknowledge = vi.fn()
      const acknowledgedAlert = { ...baseAlert, acknowledged: true }
      render(<LocationAbuseAlert alert={acknowledgedAlert} onAcknowledge={onAcknowledge} />)

      // Button should not exist when acknowledged
      expect(screen.queryByTestId('acknowledge-button')).not.toBeInTheDocument()
    })

    it('calls onViewResources when view resources button clicked', () => {
      const onViewResources = vi.fn()
      render(<LocationAbuseAlert alert={baseAlert} onViewResources={onViewResources} />)

      fireEvent.click(screen.getByTestId('view-resources-button'))

      expect(onViewResources).toHaveBeenCalledWith('alert-123')
    })

    it('disables buttons when loading', () => {
      render(<LocationAbuseAlert alert={baseAlert} isLoading={true} />)

      expect(screen.getByTestId('acknowledge-button')).toBeDisabled()
      expect(screen.getByTestId('view-resources-button')).toBeDisabled()
    })

    it('shows loading text when acknowledging', () => {
      render(<LocationAbuseAlert alert={baseAlert} isLoading={true} />)

      expect(screen.getByText('Acknowledging...')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has role="alert"', () => {
      render(<LocationAbuseAlert alert={baseAlert} />)

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('has aria-labelledby on alert container', () => {
      render(<LocationAbuseAlert alert={baseAlert} />)

      const container = screen.getByTestId('location-abuse-alert')
      expect(container).toHaveAttribute('aria-labelledby', 'alert-title-alert-123')
    })

    it('buttons have aria-labels', () => {
      render(<LocationAbuseAlert alert={baseAlert} />)

      expect(screen.getByLabelText('Acknowledge this alert')).toBeInTheDocument()
      expect(screen.getByLabelText('View conflict resolution resources')).toBeInTheDocument()
    })

    it('icon has aria-hidden', () => {
      render(<LocationAbuseAlert alert={baseAlert} />)

      const container = screen.getByTestId('location-abuse-alert')
      const icon = container.querySelector('[aria-hidden="true"]')
      expect(icon).toBeInTheDocument()
    })
  })

  describe('Touch targets', () => {
    it('buttons meet 44x44px minimum', () => {
      render(<LocationAbuseAlert alert={baseAlert} />)

      const acknowledgeButton = screen.getByTestId('acknowledge-button')
      const resourcesButton = screen.getByTestId('view-resources-button')

      // Check that minimum dimensions are set in styles
      expect(acknowledgeButton).toHaveStyle({ minHeight: '44px', minWidth: '44px' })
      expect(resourcesButton).toHaveStyle({ minHeight: '44px', minWidth: '44px' })
    })
  })

  describe('Neutral messaging', () => {
    it('does not contain blaming language in asymmetric checks', () => {
      render(<LocationAbuseAlert alert={baseAlert} />)

      const container = screen.getByTestId('location-abuse-alert')
      const text = container.textContent?.toLowerCase() || ''

      expect(text).not.toContain('fault')
      expect(text).not.toContain('blame')
      expect(text).not.toContain('abuser')
      expect(text).not.toContain('guilty')
    })

    it('does not contain blaming language in frequent changes', () => {
      const alert = { ...baseAlert, patternType: 'frequent_rule_changes' as const }
      render(<LocationAbuseAlert alert={alert} />)

      const container = screen.getByTestId('location-abuse-alert')
      const text = container.textContent?.toLowerCase() || ''

      expect(text).not.toContain('fault')
      expect(text).not.toContain('blame')
    })

    it('does not contain blaming language in cross-custody', () => {
      const alert = { ...baseAlert, patternType: 'cross_custody_restriction' as const }
      render(<LocationAbuseAlert alert={alert} />)

      const container = screen.getByTestId('location-abuse-alert')
      const text = container.textContent?.toLowerCase() || ''

      expect(text).not.toContain('fault')
      expect(text).not.toContain('blame')
    })
  })
})
