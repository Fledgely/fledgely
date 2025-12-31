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
})
