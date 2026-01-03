/**
 * Tests for LocationOptInCard Component.
 *
 * Story 40.1: Location-Based Rule Opt-In
 * - AC1: Explicit Dual-Guardian Opt-In
 * - AC2: Clear Privacy Explanation
 * - AC4: Default Disabled
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LocationOptInCard, type LocationOptInCardProps } from './LocationOptInCard'

describe('LocationOptInCard', () => {
  const defaultProps: LocationOptInCardProps = {
    status: 'disabled',
    currentUserUid: 'user-123',
    onRequestEnable: vi.fn(),
    onDisable: vi.fn(),
    onShowPrivacyInfo: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders the card with title', () => {
      render(<LocationOptInCard {...defaultProps} />)
      expect(screen.getByText('Location-Based Rules')).toBeTruthy()
    })

    it('renders with data-testid', () => {
      render(<LocationOptInCard {...defaultProps} />)
      expect(screen.getByTestId('location-opt-in-card')).toBeTruthy()
    })
  })

  describe('Disabled Status (AC4: Default Disabled)', () => {
    it('shows disabled status badge', () => {
      render(<LocationOptInCard {...defaultProps} status="disabled" />)
      expect(screen.getByTestId('status-badge').textContent).toContain('Disabled')
    })

    it('shows enable button when disabled', () => {
      render(<LocationOptInCard {...defaultProps} status="disabled" />)
      expect(screen.getByTestId('enable-button')).toBeTruthy()
    })

    it('calls onRequestEnable when enable button clicked', () => {
      const onRequestEnable = vi.fn()
      render(
        <LocationOptInCard {...defaultProps} status="disabled" onRequestEnable={onRequestEnable} />
      )

      fireEvent.click(screen.getByTestId('enable-button'))
      expect(onRequestEnable).toHaveBeenCalledTimes(1)
    })

    it('shows description explaining location features', () => {
      render(<LocationOptInCard {...defaultProps} status="disabled" />)
      expect(screen.getByText(/Enable location features/)).toBeTruthy()
    })
  })

  describe('Pending Status (AC1: Dual-Guardian Opt-In)', () => {
    const pendingProps = {
      ...defaultProps,
      status: 'pending' as const,
      pendingRequest: {
        requestedByUid: 'other-user',
        requestedByName: 'Jane',
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      },
      onApprove: vi.fn(),
    }

    it('shows pending status badge', () => {
      render(<LocationOptInCard {...pendingProps} />)
      expect(screen.getByTestId('status-badge').textContent).toContain('Pending')
    })

    it('shows pending info message', () => {
      render(<LocationOptInCard {...pendingProps} />)
      expect(screen.getByTestId('pending-info')).toBeTruthy()
    })

    it('shows requester name in pending message', () => {
      render(<LocationOptInCard {...pendingProps} />)
      expect(screen.getByText(/Jane wants to enable/)).toBeTruthy()
    })

    it('shows approve button for non-requester', () => {
      render(<LocationOptInCard {...pendingProps} />)
      expect(screen.getByTestId('approve-button')).toBeTruthy()
    })

    it('calls onApprove when approve button clicked', () => {
      render(<LocationOptInCard {...pendingProps} />)
      fireEvent.click(screen.getByTestId('approve-button'))
      expect(pendingProps.onApprove).toHaveBeenCalledTimes(1)
    })

    it('hides approve button for requester', () => {
      render(
        <LocationOptInCard
          {...pendingProps}
          currentUserUid="other-user" // Same as requester
        />
      )
      expect(screen.queryByTestId('approve-button')).toBeNull()
    })

    it('shows waiting message for requester', () => {
      render(
        <LocationOptInCard
          {...pendingProps}
          currentUserUid="other-user" // Same as requester
        />
      )
      expect(screen.getByText(/Waiting for another guardian/)).toBeTruthy()
    })
  })

  describe('Enabled Status', () => {
    const enabledProps = {
      ...defaultProps,
      status: 'enabled' as const,
    }

    it('shows enabled status badge', () => {
      render(<LocationOptInCard {...enabledProps} />)
      expect(screen.getByTestId('status-badge').textContent).toContain('Enabled')
    })

    it('shows disable button when enabled', () => {
      render(<LocationOptInCard {...enabledProps} />)
      expect(screen.getByTestId('disable-button')).toBeTruthy()
    })

    it('requires confirmation to disable', () => {
      const onDisable = vi.fn()
      render(<LocationOptInCard {...enabledProps} onDisable={onDisable} />)

      // First click shows confirmation
      fireEvent.click(screen.getByTestId('disable-button'))
      expect(onDisable).not.toHaveBeenCalled()
      expect(screen.getByText('Confirm Disable')).toBeTruthy()

      // Second click actually disables
      fireEvent.click(screen.getByTestId('disable-button'))
      expect(onDisable).toHaveBeenCalledTimes(1)
    })
  })

  describe('Privacy Link (AC2)', () => {
    it('shows privacy info link', () => {
      render(<LocationOptInCard {...defaultProps} />)
      expect(screen.getByTestId('privacy-link')).toBeTruthy()
    })

    it('calls onShowPrivacyInfo when privacy link clicked', () => {
      const onShowPrivacyInfo = vi.fn()
      render(<LocationOptInCard {...defaultProps} onShowPrivacyInfo={onShowPrivacyInfo} />)

      fireEvent.click(screen.getByTestId('privacy-link'))
      expect(onShowPrivacyInfo).toHaveBeenCalledTimes(1)
    })
  })

  describe('Loading State', () => {
    it('disables enable button when loading', () => {
      render(<LocationOptInCard {...defaultProps} status="disabled" loading={true} />)
      expect(screen.getByTestId('enable-button')).toBeDisabled()
    })

    it('shows loading text on button', () => {
      render(<LocationOptInCard {...defaultProps} status="disabled" loading={true} />)
      expect(screen.getByText('Processing...')).toBeTruthy()
    })
  })

  describe('Error State', () => {
    it('displays error message', () => {
      render(<LocationOptInCard {...defaultProps} error="Something went wrong" />)
      expect(screen.getByTestId('error-message')).toBeTruthy()
      expect(screen.getByText('Something went wrong')).toBeTruthy()
    })

    it('has role=alert for error', () => {
      render(<LocationOptInCard {...defaultProps} error="Error" />)
      expect(screen.getByRole('alert')).toBeTruthy()
    })
  })
})
