/**
 * Tests for UpgradeToMonitoringBanner Component
 *
 * Story 5.6: Agreement-Only Mode Selection - Task 6.6
 *
 * Tests for the upgrade path component that allows families
 * to upgrade from Agreement Only to Full monitoring mode.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { UpgradeToMonitoringBanner } from '../UpgradeToMonitoringBanner'

describe('UpgradeToMonitoringBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('default (full) banner', () => {
    it('renders the banner with title', () => {
      render(<UpgradeToMonitoringBanner />)

      expect(screen.getByText('Ready to Add Monitoring?')).toBeInTheDocument()
    })

    it('renders description text', () => {
      render(<UpgradeToMonitoringBanner />)

      expect(
        screen.getByText(/You can upgrade your agreement to include device monitoring anytime/)
      ).toBeInTheDocument()
    })

    it('renders upgrade button', () => {
      render(<UpgradeToMonitoringBanner />)

      expect(screen.getByText('Upgrade to Full Agreement')).toBeInTheDocument()
    })

    it('calls onUpgrade when upgrade button is clicked', () => {
      const onUpgrade = vi.fn()
      render(<UpgradeToMonitoringBanner onUpgrade={onUpgrade} />)

      fireEvent.click(screen.getByText('Upgrade to Full Agreement'))
      expect(onUpgrade).toHaveBeenCalledTimes(1)
    })

    it('shows dismiss button when onDismiss is provided', () => {
      const onDismiss = vi.fn()
      render(<UpgradeToMonitoringBanner onDismiss={onDismiss} />)

      expect(screen.getByText('Maybe Later')).toBeInTheDocument()
    })

    it('calls onDismiss when dismiss button is clicked', () => {
      const onDismiss = vi.fn()
      render(<UpgradeToMonitoringBanner onDismiss={onDismiss} />)

      fireEvent.click(screen.getByText('Maybe Later'))
      expect(onDismiss).toHaveBeenCalledTimes(1)
    })

    it('hides dismiss button when onDismiss is not provided', () => {
      render(<UpgradeToMonitoringBanner />)

      expect(screen.queryByText('Maybe Later')).not.toBeInTheDocument()
    })

    it('shows loading state when isUpgrading is true', () => {
      render(<UpgradeToMonitoringBanner isUpgrading={true} />)

      expect(screen.getByText('Upgrading...')).toBeInTheDocument()
    })

    it('disables upgrade button when isUpgrading is true', () => {
      render(<UpgradeToMonitoringBanner isUpgrading={true} />)

      const button = screen.getByRole('button', { name: /upgrading/i })
      expect(button).toBeDisabled()
    })
  })

  describe('details expansion', () => {
    it('shows "What gets added?" toggle', () => {
      render(<UpgradeToMonitoringBanner />)

      expect(screen.getByText('What gets added?')).toBeInTheDocument()
    })

    it('expands details when toggle is clicked', () => {
      render(<UpgradeToMonitoringBanner />)

      fireEvent.click(screen.getByText('What gets added?'))

      // Should show the feature list after expansion
      expect(screen.getByText('Device monitoring')).toBeInTheDocument()
    })

    it('shows preservation message when expanded', () => {
      render(<UpgradeToMonitoringBanner />)

      fireEvent.click(screen.getByText('What gets added?'))

      expect(
        screen.getByText(/All your existing rules and agreements stay the same/)
      ).toBeInTheDocument()
    })

    it('collapses details when toggle is clicked again', () => {
      render(<UpgradeToMonitoringBanner />)

      const toggle = screen.getByText('What gets added?')
      fireEvent.click(toggle)
      fireEvent.click(toggle)

      expect(screen.queryByText('Device monitoring')).not.toBeInTheDocument()
    })
  })

  describe('compact banner', () => {
    it('renders compact version when compact prop is true', () => {
      render(<UpgradeToMonitoringBanner compact={true} />)

      expect(screen.getByTestId('upgrade-banner-compact')).toBeInTheDocument()
    })

    it('shows simplified text in compact mode', () => {
      render(<UpgradeToMonitoringBanner compact={true} />)

      expect(screen.getByText('Want to add device monitoring?')).toBeInTheDocument()
    })

    it('shows "Learn More" button in compact mode', () => {
      render(<UpgradeToMonitoringBanner compact={true} />)

      expect(screen.getByText('Learn More')).toBeInTheDocument()
    })

    it('calls onUpgrade when Learn More is clicked in compact mode', () => {
      const onUpgrade = vi.fn()
      render(<UpgradeToMonitoringBanner compact={true} onUpgrade={onUpgrade} />)

      fireEvent.click(screen.getByText('Learn More'))
      expect(onUpgrade).toHaveBeenCalledTimes(1)
    })
  })

  describe('accessibility', () => {
    it('has proper region role', () => {
      render(<UpgradeToMonitoringBanner />)

      expect(screen.getByRole('region')).toBeInTheDocument()
    })

    it('has aria-labelledby for the title', () => {
      render(<UpgradeToMonitoringBanner />)

      const region = screen.getByRole('region')
      expect(region).toHaveAttribute('aria-labelledby', 'upgrade-banner-title')
    })

    it('has aria-expanded on details toggle', () => {
      render(<UpgradeToMonitoringBanner />)

      const toggle = screen.getByText('What gets added?')
      expect(toggle).toHaveAttribute('aria-expanded', 'false')

      fireEvent.click(toggle)
      expect(toggle).toHaveAttribute('aria-expanded', 'true')
    })

    it('has aria-controls linking to details section', () => {
      render(<UpgradeToMonitoringBanner />)

      const toggle = screen.getByText('What gets added?')
      expect(toggle).toHaveAttribute('aria-controls', 'upgrade-details')
    })

    it('has accessible dismiss button', () => {
      render(<UpgradeToMonitoringBanner onDismiss={vi.fn()} />)

      expect(screen.getByLabelText('Dismiss upgrade banner')).toBeInTheDocument()
    })

    it('has describedby for upgrade button', () => {
      render(<UpgradeToMonitoringBanner />)

      const upgradeButton = screen.getByText('Upgrade to Full Agreement')
      expect(upgradeButton).toHaveAttribute('aria-describedby', 'upgrade-description')
    })
  })

  describe('styling', () => {
    it('applies custom className', () => {
      render(<UpgradeToMonitoringBanner className="custom-class" />)

      const region = screen.getByRole('region')
      expect(region.className).toContain('custom-class')
    })

    it('has data-testid on main banner', () => {
      render(<UpgradeToMonitoringBanner />)

      expect(screen.getByTestId('upgrade-banner')).toBeInTheDocument()
    })
  })
})
