/**
 * RequestAgreementReviewButton Tests - Story 34.5.3 Task 4
 *
 * Tests for the agreement review request button.
 * AC1: Request Agreement Review Button
 * AC4: Rate Limiting (60-Day Cooldown)
 * AC5: Invitation, Not Demand
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RequestAgreementReviewButton } from './RequestAgreementReviewButton'
import type { CooldownStatus } from '@fledgely/shared/contracts/agreementReviewRequest'

// ============================================
// Mock Hook
// ============================================

const mockSubmitRequest = vi.fn()

const mockCooldownStatus: CooldownStatus = {
  canRequest: true,
  lastRequestAt: null,
  nextAvailableAt: null,
  daysRemaining: 0,
}

vi.mock('../../hooks/useReviewRequestCooldown', () => ({
  useReviewRequestCooldown: () => ({
    cooldownStatus: mockCooldownStatus,
    loading: false,
    error: null,
    canRequest: mockCooldownStatus.canRequest,
    daysRemaining: mockCooldownStatus.daysRemaining,
    submitRequest: mockSubmitRequest,
    isSubmitting: false,
  }),
}))

describe('RequestAgreementReviewButton - Story 34.5.3', () => {
  const defaultProps = {
    familyId: 'family-123',
    childId: 'child-456',
    childName: 'Alex',
    agreementId: 'agreement-789',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockCooldownStatus.canRequest = true
    mockCooldownStatus.daysRemaining = 0
    mockCooldownStatus.lastRequestAt = null
    mockCooldownStatus.nextAvailableAt = null
  })

  // ============================================
  // Render Tests
  // ============================================

  describe('rendering', () => {
    it('should render the button', () => {
      render(<RequestAgreementReviewButton {...defaultProps} />)
      expect(screen.getByTestId('request-review-button')).toBeInTheDocument()
    })

    it('should display invitation-style text (AC5)', () => {
      render(<RequestAgreementReviewButton {...defaultProps} />)

      // Button should use inviting language
      const buttonText = screen.getByTestId('request-review-button').textContent
      expect(buttonText?.toLowerCase()).toContain('request')
      expect(buttonText?.toLowerCase()).toContain('review')
    })

    it('should have supportive tooltip (AC1)', () => {
      render(<RequestAgreementReviewButton {...defaultProps} />)

      const button = screen.getByTestId('request-review-button')
      expect(button.getAttribute('title')?.toLowerCase()).toContain('invite')
    })

    it('should be styled invitingly, not aggressively (AC1)', () => {
      render(<RequestAgreementReviewButton {...defaultProps} />)

      const button = screen.getByTestId('request-review-button')
      // Should not have aggressive colors (e.g., bright red)
      const style = button.style
      expect(style.background).not.toContain('red')
    })
  })

  // ============================================
  // Button States Tests
  // ============================================

  describe('button states', () => {
    it('should be enabled when canRequest is true', () => {
      render(<RequestAgreementReviewButton {...defaultProps} />)

      const button = screen.getByTestId('request-review-button')
      expect(button).not.toBeDisabled()
    })

    it('should show appropriate text when available', () => {
      render(<RequestAgreementReviewButton {...defaultProps} />)

      expect(screen.getByText(/Request Agreement Review/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // Click Handler Tests
  // ============================================

  describe('click handling', () => {
    it('should call submitRequest when clicked', async () => {
      mockSubmitRequest.mockResolvedValueOnce({})

      render(<RequestAgreementReviewButton {...defaultProps} />)

      const button = screen.getByTestId('request-review-button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockSubmitRequest).toHaveBeenCalled()
      })
    })

    it('should call onRequestSubmitted callback after successful submission', async () => {
      const onRequestSubmitted = vi.fn()
      mockSubmitRequest.mockResolvedValueOnce({})

      render(
        <RequestAgreementReviewButton {...defaultProps} onRequestSubmitted={onRequestSubmitted} />
      )

      const button = screen.getByTestId('request-review-button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(onRequestSubmitted).toHaveBeenCalled()
      })
    })
  })

  // ============================================
  // Cooldown Display Tests
  // ============================================

  describe('cooldown display (AC4)', () => {
    it('should show countdown message when in cooldown', () => {
      mockCooldownStatus.canRequest = false
      mockCooldownStatus.daysRemaining = 30

      render(<RequestAgreementReviewButton {...defaultProps} />)

      expect(screen.getByText(/30 days/i)).toBeInTheDocument()
    })

    it('should disable button during cooldown', () => {
      mockCooldownStatus.canRequest = false
      mockCooldownStatus.daysRemaining = 45

      render(<RequestAgreementReviewButton {...defaultProps} />)

      const button = screen.getByTestId('request-review-button')
      expect(button).toBeDisabled()
    })

    it('should show singular "day" when 1 day remaining', () => {
      mockCooldownStatus.canRequest = false
      mockCooldownStatus.daysRemaining = 1

      render(<RequestAgreementReviewButton {...defaultProps} />)

      expect(screen.getByText(/1 day/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // Pending Request Tests
  // ============================================

  describe('pending request state', () => {
    it('should show pending message when request is waiting', () => {
      // This would be based on the hook's pendingRequest state
      render(<RequestAgreementReviewButton {...defaultProps} hasPendingRequest={true} />)

      expect(screen.getByText(/waiting/i)).toBeInTheDocument()
    })

    it('should disable button when request is pending', () => {
      render(<RequestAgreementReviewButton {...defaultProps} hasPendingRequest={true} />)

      const button = screen.getByTestId('request-review-button')
      expect(button).toBeDisabled()
    })
  })

  // ============================================
  // Loading State Tests
  // ============================================

  describe('loading state', () => {
    it('should show loading indicator while submitting', () => {
      render(<RequestAgreementReviewButton {...defaultProps} isSubmitting={true} />)

      expect(screen.getByText(/sending/i)).toBeInTheDocument()
    })

    it('should disable button while submitting', () => {
      render(<RequestAgreementReviewButton {...defaultProps} isSubmitting={true} />)

      const button = screen.getByTestId('request-review-button')
      expect(button).toBeDisabled()
    })
  })

  // ============================================
  // Messaging Tone Tests (AC5)
  // ============================================

  describe('messaging tone (AC5)', () => {
    it('should use invitation language, not demand language', () => {
      render(<RequestAgreementReviewButton {...defaultProps} />)

      const allText = document.body.textContent?.toLowerCase() || ''

      // Should NOT contain demanding language
      expect(allText).not.toContain('demand')
      expect(allText).not.toContain('require')
      expect(allText).not.toContain('must respond')
    })

    it('should respect parent authority in messaging', () => {
      render(<RequestAgreementReviewButton {...defaultProps} />)

      // Tooltip should be supportive
      const button = screen.getByTestId('request-review-button')
      const tooltip = button.getAttribute('title') || ''

      expect(tooltip.toLowerCase()).not.toContain('force')
      expect(tooltip.toLowerCase()).not.toContain('make')
    })
  })

  // ============================================
  // Accessibility Tests
  // ============================================

  describe('accessibility', () => {
    it('should have accessible button role', () => {
      render(<RequestAgreementReviewButton {...defaultProps} />)

      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })

    it('should have descriptive aria-label', () => {
      render(<RequestAgreementReviewButton {...defaultProps} />)

      const button = screen.getByTestId('request-review-button')
      expect(button.getAttribute('aria-label')).toBeTruthy()
    })

    it('should indicate disabled state to screen readers', () => {
      mockCooldownStatus.canRequest = false
      mockCooldownStatus.daysRemaining = 30

      render(<RequestAgreementReviewButton {...defaultProps} />)

      const button = screen.getByTestId('request-review-button')
      expect(button).toHaveAttribute('aria-disabled', 'true')
    })
  })
})
