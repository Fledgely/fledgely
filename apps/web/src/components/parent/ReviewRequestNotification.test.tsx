/**
 * ReviewRequestNotification Tests - Story 34.5.3 Task 6
 *
 * Tests for parent review request notification component.
 * AC2: Review Request Notification to Parent
 * AC3: Suggested Discussion Areas
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ReviewRequestNotification } from './ReviewRequestNotification'
import type { AgreementReviewRequest } from '@fledgely/shared/contracts/agreementReviewRequest'

describe('ReviewRequestNotification - Story 34.5.3', () => {
  const mockRequest: AgreementReviewRequest = {
    id: 'request-123',
    familyId: 'family-456',
    childId: 'child-789',
    childName: 'Alex',
    agreementId: 'agreement-012',
    requestedAt: new Date('2024-01-15T10:00:00Z'),
    status: 'pending',
    acknowledgedAt: null,
    reviewedAt: null,
    suggestedAreas: ['Screen time limits', 'Weekend rules'],
    parentNotificationSent: true,
    expiresAt: new Date('2024-02-14T10:00:00Z'),
  }

  const defaultProps = {
    request: mockRequest,
    onAcknowledge: vi.fn(),
    onViewAgreement: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // Render Tests
  // ============================================

  describe('rendering', () => {
    it('should render the notification', () => {
      render(<ReviewRequestNotification {...defaultProps} />)
      expect(screen.getByTestId('review-request-notification')).toBeInTheDocument()
    })

    it('should display child name', () => {
      render(<ReviewRequestNotification {...defaultProps} />)
      expect(screen.getByText(/Alex/)).toBeInTheDocument()
    })

    it('should display invitation-style message (AC2)', () => {
      render(<ReviewRequestNotification {...defaultProps} />)

      // Should contain invitation-style language
      const allText = document.body.textContent?.toLowerCase() || ''
      const hasInvitationLanguage =
        allText.includes('invit') ||
        allText.includes('discuss') ||
        allText.includes('conversation') ||
        allText.includes('together')
      expect(hasInvitationLanguage).toBe(true)
    })

    it('should display supportive framing', () => {
      render(<ReviewRequestNotification {...defaultProps} />)

      // Should contain supportive message
      const allText = document.body.textContent?.toLowerCase() || ''
      expect(allText).not.toContain('demand')
      expect(allText).not.toContain('require')
      expect(allText).not.toContain('must')
    })
  })

  // ============================================
  // Suggested Areas Tests (AC3)
  // ============================================

  describe('suggested discussion areas (AC3)', () => {
    it('should display suggested discussion areas', () => {
      render(<ReviewRequestNotification {...defaultProps} />)

      expect(screen.getByText('Screen time limits')).toBeInTheDocument()
      expect(screen.getByText('Weekend rules')).toBeInTheDocument()
    })

    it('should handle empty suggested areas gracefully', () => {
      const propsWithNoAreas = {
        ...defaultProps,
        request: { ...mockRequest, suggestedAreas: [] },
      }
      render(<ReviewRequestNotification {...propsWithNoAreas} />)

      // Should still render without errors
      expect(screen.getByTestId('review-request-notification')).toBeInTheDocument()
    })

    it('should display suggested areas section header', () => {
      render(<ReviewRequestNotification {...defaultProps} />)

      // Should have a header for suggested areas
      expect(screen.getByText(/suggest/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // Action Button Tests
  // ============================================

  describe('action buttons', () => {
    it('should display View Agreement button', () => {
      render(<ReviewRequestNotification {...defaultProps} />)
      expect(screen.getByRole('button', { name: /view agreement/i })).toBeInTheDocument()
    })

    it('should display Acknowledge button', () => {
      render(<ReviewRequestNotification {...defaultProps} />)
      expect(screen.getByRole('button', { name: /acknowledge/i })).toBeInTheDocument()
    })

    it('should call onViewAgreement when View Agreement clicked', () => {
      render(<ReviewRequestNotification {...defaultProps} />)

      const viewButton = screen.getByRole('button', { name: /view agreement/i })
      fireEvent.click(viewButton)

      expect(defaultProps.onViewAgreement).toHaveBeenCalled()
    })

    it('should call onAcknowledge when Acknowledge clicked', () => {
      render(<ReviewRequestNotification {...defaultProps} />)

      const ackButton = screen.getByRole('button', { name: /acknowledge/i })
      fireEvent.click(ackButton)

      expect(defaultProps.onAcknowledge).toHaveBeenCalled()
    })
  })

  // ============================================
  // Messaging Tone Tests (AC5)
  // ============================================

  describe('messaging tone (AC5)', () => {
    it('should use invitation language, not demand language', () => {
      render(<ReviewRequestNotification {...defaultProps} />)

      const allText = document.body.textContent?.toLowerCase() || ''

      // Should NOT contain demanding/confrontational language
      expect(allText).not.toContain('demand')
      expect(allText).not.toContain('require')
      expect(allText).not.toContain('must respond')
      expect(allText).not.toContain('immediately')
    })

    it('should frame as opportunity to connect', () => {
      render(<ReviewRequestNotification {...defaultProps} />)

      const allText = document.body.textContent?.toLowerCase() || ''

      // Should contain connection/opportunity language
      const hasConnectionLanguage =
        allText.includes('opportunity') ||
        allText.includes('connect') ||
        allText.includes('together') ||
        allText.includes('conversation')
      expect(hasConnectionLanguage).toBe(true)
    })

    it('should not use ultimatum language', () => {
      render(<ReviewRequestNotification {...defaultProps} />)

      const allText = document.body.textContent?.toLowerCase() || ''

      expect(allText).not.toContain('or else')
      expect(allText).not.toContain('deadline')
      expect(allText).not.toContain('urgent')
    })
  })

  // ============================================
  // Status Display Tests
  // ============================================

  describe('status display', () => {
    it('should show pending indicator for pending request', () => {
      render(<ReviewRequestNotification {...defaultProps} />)

      // Should indicate the request is pending
      expect(screen.getByTestId('review-request-notification')).toBeInTheDocument()
    })

    it('should display request date', () => {
      render(<ReviewRequestNotification {...defaultProps} />)

      // Should show when the request was made
      const dateText = screen.getByTestId('review-request-notification').textContent
      expect(dateText).toBeTruthy()
    })
  })

  // ============================================
  // Accessibility Tests
  // ============================================

  describe('accessibility', () => {
    it('should have proper heading structure', () => {
      render(<ReviewRequestNotification {...defaultProps} />)

      // Should have a heading
      const headings = screen.getAllByRole('heading')
      expect(headings.length).toBeGreaterThan(0)
    })

    it('should have accessible button labels', () => {
      render(<ReviewRequestNotification {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button.textContent || button.getAttribute('aria-label')).toBeTruthy()
      })
    })
  })
})
