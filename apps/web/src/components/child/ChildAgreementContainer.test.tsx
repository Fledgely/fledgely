/**
 * ChildAgreementContainer Tests - Story 19C.5
 *
 * Task 7.5: Test integration with ChildAgreementView
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ChildAgreementContainer } from './ChildAgreementContainer'
import type { ChildAgreement } from '../../hooks/useChildAgreement'

// Mock the service
vi.mock('../../services/agreementChangeService', () => ({
  submitChangeRequest: vi.fn(),
  createParentNotification: vi.fn(),
}))

// Mock the escalation status hook for Story 34.5.2
const mockAcknowledgeEscalation = vi.fn()
vi.mock('../../hooks/useEscalationStatus', () => ({
  useEscalationStatus: vi.fn(() => ({
    status: null,
    loading: false,
    error: null,
    acknowledgeEscalation: mockAcknowledgeEscalation,
  })),
}))

// Mock the review request cooldown hook for Story 34.5.3
const mockSubmitRequest = vi.fn()
vi.mock('../../hooks/useReviewRequestCooldown', () => ({
  useReviewRequestCooldown: vi.fn(() => ({
    cooldownStatus: {
      canRequest: true,
      daysRemaining: 0,
      lastRequestAt: null,
      nextAvailableAt: null,
    },
    loading: false,
    error: null,
    canRequest: true,
    daysRemaining: 0,
    submitRequest: mockSubmitRequest,
    isSubmitting: false,
  })),
}))

import { useEscalationStatus } from '../../hooks/useEscalationStatus'
const mockUseEscalationStatus = useEscalationStatus as ReturnType<typeof vi.fn>

import {
  submitChangeRequest,
  createParentNotification,
} from '../../services/agreementChangeService'

const mockSubmitChangeRequest = submitChangeRequest as ReturnType<typeof vi.fn>
const mockCreateParentNotification = createParentNotification as ReturnType<typeof vi.fn>

// Sample agreement data
const mockAgreement: ChildAgreement = {
  id: 'agreement-123',
  familyId: 'family-456',
  childId: 'child-123',
  version: '1.0',
  status: 'active',
  activatedAt: new Date('2024-01-15'),
  terms: [
    {
      id: 'term-1',
      text: 'Screen time limited to 2 hours per day',
      category: 'time',
      party: 'child',
      explanation: null,
      isDefault: false,
    },
  ],
  monitoring: {
    screenshotsEnabled: true,
    captureFrequency: 'every 5 minutes',
    retentionPeriod: '7 days',
    paused: false,
  },
  signatures: [
    { party: 'parent', name: 'Mom', signedAt: new Date('2024-01-15') },
    { party: 'child', name: 'Alex', signedAt: new Date('2024-01-15') },
  ],
}

describe('ChildAgreementContainer', () => {
  const defaultProps = {
    agreement: mockAgreement,
    childId: 'child-123',
    childName: 'Alex',
    familyId: 'family-456',
    parentName: 'Mom',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockSubmitChangeRequest.mockResolvedValue({ requestId: 'request-123', parentNotified: false })
    mockCreateParentNotification.mockResolvedValue('notification-123')
    mockAcknowledgeEscalation.mockResolvedValue(undefined)
    // Reset escalation mock to default (no escalation)
    mockUseEscalationStatus.mockReturnValue({
      status: {
        hasActiveEscalation: false,
        escalationEvent: null,
        isAcknowledged: false,
      },
      loading: false,
      error: null,
      acknowledgeEscalation: mockAcknowledgeEscalation,
    })
  })

  describe('Task 6.1: Connect onRequestChange to open modal', () => {
    it('should render the ChildAgreementView', () => {
      render(<ChildAgreementContainer {...defaultProps} />)
      expect(screen.getByTestId('child-agreement-view')).toBeInTheDocument()
    })

    it('should show request change button', () => {
      render(<ChildAgreementContainer {...defaultProps} />)
      expect(screen.getByTestId('request-change-button')).toBeInTheDocument()
    })

    it('should open modal when request change button is clicked', () => {
      render(<ChildAgreementContainer {...defaultProps} />)

      fireEvent.click(screen.getByTestId('request-change-button'))

      expect(screen.getByTestId('change-request-modal')).toBeInTheDocument()
    })

    it('should not show modal initially', () => {
      render(<ChildAgreementContainer {...defaultProps} />)
      expect(screen.queryByTestId('change-request-modal')).not.toBeInTheDocument()
    })
  })

  describe('Task 6.2: Pass necessary data to modal', () => {
    it('should pass parentName to modal for confirmation message', async () => {
      render(<ChildAgreementContainer {...defaultProps} />)

      fireEvent.click(screen.getByTestId('request-change-button'))
      fireEvent.change(screen.getByTestId('what-to-change-input'), {
        target: { value: 'More screen time' },
      })
      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('success-message')).toHaveTextContent('Mom')
      })
    })

    it('should call service with correct agreement data', async () => {
      render(<ChildAgreementContainer {...defaultProps} />)

      fireEvent.click(screen.getByTestId('request-change-button'))
      fireEvent.change(screen.getByTestId('what-to-change-input'), {
        target: { value: 'More screen time' },
      })
      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(mockSubmitChangeRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            childId: 'child-123',
            familyId: 'family-456',
            agreementId: 'agreement-123',
          })
        )
      })
    })
  })

  describe('Task 6.3: Handle successful submission feedback', () => {
    it('should show success state after submission', async () => {
      render(<ChildAgreementContainer {...defaultProps} />)

      fireEvent.click(screen.getByTestId('request-change-button'))
      fireEvent.change(screen.getByTestId('what-to-change-input'), {
        target: { value: 'More screen time' },
      })
      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('success-state')).toBeInTheDocument()
      })
    })

    it('should show confirmation message with parent name (AC4)', async () => {
      render(<ChildAgreementContainer {...defaultProps} />)

      fireEvent.click(screen.getByTestId('request-change-button'))
      fireEvent.change(screen.getByTestId('what-to-change-input'), {
        target: { value: 'More screen time' },
      })
      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('success-message')).toHaveTextContent(
          'Request sent - talk to Mom about it'
        )
      })
    })

    it('should close modal when Got it button is clicked', async () => {
      render(<ChildAgreementContainer {...defaultProps} />)

      fireEvent.click(screen.getByTestId('request-change-button'))
      fireEvent.change(screen.getByTestId('what-to-change-input'), {
        target: { value: 'More screen time' },
      })
      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('close-button')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('close-button'))

      expect(screen.queryByTestId('change-request-modal')).not.toBeInTheDocument()
    })

    it('should create parent notification (AC3)', async () => {
      render(<ChildAgreementContainer {...defaultProps} />)

      fireEvent.click(screen.getByTestId('request-change-button'))
      fireEvent.change(screen.getByTestId('what-to-change-input'), {
        target: { value: 'More screen time' },
      })
      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(mockCreateParentNotification).toHaveBeenCalledWith(
          'family-456',
          'request-123',
          'Alex'
        )
      })
    })
  })

  describe('Loading and error handling', () => {
    it('should pass loading state to ChildAgreementView', () => {
      render(<ChildAgreementContainer {...defaultProps} loading={true} />)
      expect(screen.getByTestId('loading-state')).toBeInTheDocument()
    })

    it('should pass error state to ChildAgreementView', () => {
      render(<ChildAgreementContainer {...defaultProps} error="Something went wrong" />)
      expect(screen.getByTestId('error-state')).toBeInTheDocument()
    })

    it('should show submission error in modal', async () => {
      mockSubmitChangeRequest.mockRejectedValue(new Error('Network error'))

      render(<ChildAgreementContainer {...defaultProps} />)

      fireEvent.click(screen.getByTestId('request-change-button'))
      fireEvent.change(screen.getByTestId('what-to-change-input'), {
        target: { value: 'More screen time' },
      })
      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('form-error')).toHaveTextContent('Network error')
      })
    })

    it('should allow retry after error', async () => {
      mockSubmitChangeRequest
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ requestId: 'request-123', parentNotified: false })

      render(<ChildAgreementContainer {...defaultProps} />)

      fireEvent.click(screen.getByTestId('request-change-button'))
      fireEvent.change(screen.getByTestId('what-to-change-input'), {
        target: { value: 'More screen time' },
      })
      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('form-error')).toBeInTheDocument()
      })

      // Retry
      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('success-state')).toBeInTheDocument()
      })
    })
  })

  describe('Modal cancel behavior', () => {
    it('should close modal when cancel is clicked', () => {
      render(<ChildAgreementContainer {...defaultProps} />)

      fireEvent.click(screen.getByTestId('request-change-button'))
      expect(screen.getByTestId('change-request-modal')).toBeInTheDocument()

      fireEvent.click(screen.getByTestId('cancel-button'))

      expect(screen.queryByTestId('change-request-modal')).not.toBeInTheDocument()
    })

    it('should close modal when overlay is clicked', () => {
      render(<ChildAgreementContainer {...defaultProps} />)

      fireEvent.click(screen.getByTestId('request-change-button'))
      expect(screen.getByTestId('change-request-modal')).toBeInTheDocument()

      fireEvent.click(screen.getByTestId('change-request-modal-overlay'))

      expect(screen.queryByTestId('change-request-modal')).not.toBeInTheDocument()
    })

    it('should reset form state when modal is reopened', async () => {
      mockSubmitChangeRequest.mockRejectedValue(new Error('Network error'))

      render(<ChildAgreementContainer {...defaultProps} />)

      // First: Open, submit with error, then close
      fireEvent.click(screen.getByTestId('request-change-button'))
      fireEvent.change(screen.getByTestId('what-to-change-input'), {
        target: { value: 'More screen time' },
      })
      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('form-error')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('cancel-button'))

      // Reopen modal
      mockSubmitChangeRequest.mockResolvedValue({ requestId: 'request-123', parentNotified: false })
      fireEvent.click(screen.getByTestId('request-change-button'))

      // Error should be cleared
      expect(screen.queryByTestId('form-error')).not.toBeInTheDocument()
    })
  })

  describe('Empty agreement state', () => {
    it('should not show request change button when no agreement', () => {
      render(<ChildAgreementContainer {...defaultProps} agreement={null} />)
      expect(screen.queryByTestId('request-change-button')).not.toBeInTheDocument()
    })

    it('should show empty state when no agreement', () => {
      render(<ChildAgreementContainer {...defaultProps} agreement={null} />)
      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })
  })

  describe('Child name display', () => {
    it('should pass child name to ChildAgreementView', () => {
      render(<ChildAgreementContainer {...defaultProps} childName="Emma" />)
      // Child name badge should be visible on terms
      expect(screen.getByText('Emma')).toBeInTheDocument()
    })
  })

  // ============================================
  // Story 34.5.2: Escalation Integration Tests
  // ============================================

  describe('Story 34.5.2 Task 7: Escalation Prompt Integration', () => {
    it('should not show escalation prompt when no active escalation', () => {
      render(<ChildAgreementContainer {...defaultProps} />)

      expect(screen.queryByTestId('escalation-prompt-container')).not.toBeInTheDocument()
    })

    it('should show escalation prompt when there is active escalation', () => {
      mockUseEscalationStatus.mockReturnValue({
        status: {
          hasActiveEscalation: true,
          escalationEvent: { id: 'escalation-1' },
          isAcknowledged: false,
        },
        loading: false,
        error: null,
        acknowledgeEscalation: mockAcknowledgeEscalation,
      })

      render(<ChildAgreementContainer {...defaultProps} />)

      expect(screen.getByTestId('escalation-prompt-container')).toBeInTheDocument()
      expect(screen.getByTestId('escalation-prompt')).toBeInTheDocument()
    })

    it('should hide escalation prompt when already acknowledged', () => {
      mockUseEscalationStatus.mockReturnValue({
        status: {
          hasActiveEscalation: true,
          escalationEvent: { id: 'escalation-1' },
          isAcknowledged: true,
        },
        loading: false,
        error: null,
        acknowledgeEscalation: mockAcknowledgeEscalation,
      })

      render(<ChildAgreementContainer {...defaultProps} />)

      expect(screen.queryByTestId('escalation-prompt-container')).not.toBeInTheDocument()
    })

    it('should call acknowledgeEscalation when acknowledge button is clicked', async () => {
      mockUseEscalationStatus.mockReturnValue({
        status: {
          hasActiveEscalation: true,
          escalationEvent: { id: 'escalation-1' },
          isAcknowledged: false,
        },
        loading: false,
        error: null,
        acknowledgeEscalation: mockAcknowledgeEscalation,
      })

      render(<ChildAgreementContainer {...defaultProps} />)

      fireEvent.click(screen.getByTestId('escalation-acknowledge'))

      await waitFor(() => {
        expect(mockAcknowledgeEscalation).toHaveBeenCalled()
      })
    })

    it('should open resources modal when CTA is clicked', () => {
      mockUseEscalationStatus.mockReturnValue({
        status: {
          hasActiveEscalation: true,
          escalationEvent: { id: 'escalation-1' },
          isAcknowledged: false,
        },
        loading: false,
        error: null,
        acknowledgeEscalation: mockAcknowledgeEscalation,
      })

      render(<ChildAgreementContainer {...defaultProps} />)

      fireEvent.click(screen.getByTestId('escalation-cta'))

      expect(screen.getByTestId('mediation-resources-modal')).toBeInTheDocument()
    })

    it('should close resources modal when close button is clicked', () => {
      mockUseEscalationStatus.mockReturnValue({
        status: {
          hasActiveEscalation: true,
          escalationEvent: { id: 'escalation-1' },
          isAcknowledged: false,
        },
        loading: false,
        error: null,
        acknowledgeEscalation: mockAcknowledgeEscalation,
      })

      render(<ChildAgreementContainer {...defaultProps} />)

      // Open modal
      fireEvent.click(screen.getByTestId('escalation-cta'))
      expect(screen.getByTestId('mediation-resources-modal')).toBeInTheDocument()

      // Close modal
      fireEvent.click(screen.getByTestId('modal-close-button'))
      expect(screen.queryByTestId('mediation-resources-modal')).not.toBeInTheDocument()
    })
  })

  // ============================================
  // Story 34.5.3: Agreement Review Request Integration Tests
  // ============================================

  describe('Story 34.5.3 Task 7: Review Request Button Integration', () => {
    beforeEach(() => {
      mockSubmitRequest.mockResolvedValue({
        id: 'request-123',
        familyId: 'family-456',
        childId: 'child-123',
        childName: 'Alex',
        agreementId: 'agreement-123',
        requestedAt: new Date(),
        status: 'pending',
        acknowledgedAt: null,
        reviewedAt: null,
        suggestedAreas: [],
        parentNotificationSent: true,
        expiresAt: new Date(),
      })
    })

    it('should show review request button when agreement exists', () => {
      render(<ChildAgreementContainer {...defaultProps} />)

      expect(screen.getByTestId('review-request-button-container')).toBeInTheDocument()
      expect(screen.getByTestId('request-review-button')).toBeInTheDocument()
    })

    it('should not show review request button when no agreement', () => {
      render(<ChildAgreementContainer {...defaultProps} agreement={null} />)

      expect(screen.queryByTestId('review-request-button-container')).not.toBeInTheDocument()
    })

    it('should display invitation-style text on button (AC5)', () => {
      render(<ChildAgreementContainer {...defaultProps} />)

      const buttonText = screen.getByTestId('request-review-button').textContent
      expect(buttonText?.toLowerCase()).toContain('request')
    })
  })
})
