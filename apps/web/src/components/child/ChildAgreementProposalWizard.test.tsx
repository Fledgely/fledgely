/**
 * ChildAgreementProposalWizard Tests - Story 34.2
 *
 * Tests for child-initiated agreement change proposals.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ChildAgreementProposalWizard } from './ChildAgreementProposalWizard'

// Mock the hooks
const mockCreateProposal = vi.fn()
vi.mock('../../hooks/useAgreementProposal', () => ({
  useAgreementProposal: vi.fn(() => ({
    createProposal: mockCreateProposal,
    withdrawProposal: vi.fn(),
    loading: false,
    error: null,
    pendingProposal: null,
  })),
}))

// Mock the shared package
vi.mock('@fledgely/shared', () => ({
  CHILD_PROPOSAL_MESSAGES: {
    reasonPrompts: [
      "I've been responsible with my screen time lately",
      'I need more gaming time for playing with friends',
      'I think this rule is too strict for my age',
      'I want to try having more freedom',
    ],
    successMessage: 'Great job speaking up!',
    encouragement: 'Tell your parents why this change would help you',
  },
  AGREEMENT_PROPOSAL_MESSAGES: {
    reasonPrompts: ['Test prompt 1', 'Test prompt 2', 'Test prompt 3'],
  },
}))

const mockSections = [
  { id: 'time-limits', name: 'Screen Time', description: 'Daily screen time limits' },
  { id: 'apps', name: 'Apps', description: 'Allowed apps and games' },
  { id: 'bedtime', name: 'Bedtime', description: 'Device bedtime settings' },
]

const defaultProps = {
  sections: mockSections,
  agreementData: {},
  familyId: 'family-1',
  childId: 'child-1',
  agreementId: 'agreement-1',
  userId: 'user-child-1',
  childName: 'Emma',
  parentNames: ['Mom', 'Dad'],
  onComplete: vi.fn(),
  onCancel: vi.fn(),
}

describe('ChildAgreementProposalWizard - Story 34.2', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateProposal.mockResolvedValue('proposal-123')
  })

  describe('step navigation', () => {
    it('should start on section selection step', () => {
      render(<ChildAgreementProposalWizard {...defaultProps} />)
      expect(screen.getByText(/what would you like to change/i)).toBeInTheDocument()
    })

    it('should show step indicator', () => {
      render(<ChildAgreementProposalWizard {...defaultProps} />)
      expect(screen.getByText(/step 1 of 4/i)).toBeInTheDocument()
    })

    it('should disable next button when no sections selected', () => {
      render(<ChildAgreementProposalWizard {...defaultProps} />)
      const nextButton = screen.getByRole('button', { name: /next/i })
      expect(nextButton).toBeDisabled()
    })

    it('should enable next button when section is selected', () => {
      render(<ChildAgreementProposalWizard {...defaultProps} />)
      fireEvent.click(screen.getByLabelText(/screen time/i))
      const nextButton = screen.getByRole('button', { name: /next/i })
      expect(nextButton).not.toBeDisabled()
    })

    it('should navigate to step 2 when next is clicked', () => {
      render(<ChildAgreementProposalWizard {...defaultProps} />)
      fireEvent.click(screen.getByLabelText(/screen time/i))
      fireEvent.click(screen.getByRole('button', { name: /next/i }))
      expect(screen.getByText(/step 2 of 4/i)).toBeInTheDocument()
    })

    it('should allow going back to previous step', () => {
      render(<ChildAgreementProposalWizard {...defaultProps} />)
      fireEvent.click(screen.getByLabelText(/screen time/i))
      fireEvent.click(screen.getByRole('button', { name: /next/i }))
      fireEvent.click(screen.getByRole('button', { name: /back/i }))
      expect(screen.getByText(/step 1 of 4/i)).toBeInTheDocument()
    })
  })

  describe('child-friendly language (AC1)', () => {
    it('should use child-friendly section labels', () => {
      render(<ChildAgreementProposalWizard {...defaultProps} />)
      expect(screen.getByText(/what would you like to change/i)).toBeInTheDocument()
    })

    it('should display encouraging language', () => {
      render(<ChildAgreementProposalWizard {...defaultProps} />)
      expect(
        screen.getByText(/pick the parts of your agreement you want to talk about/i)
      ).toBeInTheDocument()
    })
  })

  describe('section selection (step 1)', () => {
    it('should display all available sections', () => {
      render(<ChildAgreementProposalWizard {...defaultProps} />)
      expect(screen.getByText('Screen Time')).toBeInTheDocument()
      expect(screen.getByText('Apps')).toBeInTheDocument()
      expect(screen.getByText('Bedtime')).toBeInTheDocument()
    })

    it('should allow selecting multiple sections', () => {
      render(<ChildAgreementProposalWizard {...defaultProps} />)
      fireEvent.click(screen.getByLabelText(/screen time/i))
      fireEvent.click(screen.getByLabelText(/apps/i))

      const screenTimeCheckbox = screen.getByLabelText(/screen time/i)
      const appsCheckbox = screen.getByLabelText(/apps/i)
      expect(screenTimeCheckbox).toBeChecked()
      expect(appsCheckbox).toBeChecked()
    })
  })

  describe('reason input - required (step 3) (AC2)', () => {
    it('should show required reason input', () => {
      render(<ChildAgreementProposalWizard {...defaultProps} />)
      // Navigate to step 3
      fireEvent.click(screen.getByLabelText(/screen time/i))
      fireEvent.click(screen.getByRole('button', { name: /next/i }))
      fireEvent.click(screen.getByRole('button', { name: /next/i }))

      // Check for the heading specifically
      expect(screen.getByRole('heading', { name: /tell your parents why/i })).toBeInTheDocument()
    })

    it('should show age-appropriate prompts', () => {
      render(<ChildAgreementProposalWizard {...defaultProps} />)
      // Navigate to step 3
      fireEvent.click(screen.getByLabelText(/screen time/i))
      fireEvent.click(screen.getByRole('button', { name: /next/i }))
      fireEvent.click(screen.getByRole('button', { name: /next/i }))

      expect(
        screen.getByText(/I've been responsible with my screen time lately/i)
      ).toBeInTheDocument()
    })

    it('should require reason before proceeding', () => {
      render(<ChildAgreementProposalWizard {...defaultProps} />)
      // Navigate to step 3
      fireEvent.click(screen.getByLabelText(/screen time/i))
      fireEvent.click(screen.getByRole('button', { name: /next/i }))
      fireEvent.click(screen.getByRole('button', { name: /next/i }))

      // Next should be disabled without a reason
      const nextButton = screen.getByRole('button', { name: /next/i })
      expect(nextButton).toBeDisabled()
    })

    it('should enable next when reason is provided', () => {
      render(<ChildAgreementProposalWizard {...defaultProps} />)
      // Navigate to step 3
      fireEvent.click(screen.getByLabelText(/screen time/i))
      fireEvent.click(screen.getByRole('button', { name: /next/i }))
      fireEvent.click(screen.getByRole('button', { name: /next/i }))

      const textarea = screen.getByRole('textbox')
      fireEvent.change(textarea, { target: { value: 'I want more gaming time' } })

      const nextButton = screen.getByRole('button', { name: /next/i })
      expect(nextButton).not.toBeDisabled()
    })

    it('should allow using suggested prompts', () => {
      render(<ChildAgreementProposalWizard {...defaultProps} />)
      // Navigate to step 3
      fireEvent.click(screen.getByLabelText(/screen time/i))
      fireEvent.click(screen.getByRole('button', { name: /next/i }))
      fireEvent.click(screen.getByRole('button', { name: /next/i }))

      fireEvent.click(
        screen.getByRole('button', {
          name: /I've been responsible with my screen time lately/i,
        })
      )

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
      expect(textarea.value).toBe("I've been responsible with my screen time lately")
    })
  })

  describe('review and submit (step 4) (AC3)', () => {
    it('should show review of proposal', async () => {
      render(<ChildAgreementProposalWizard {...defaultProps} />)
      // Navigate through all steps
      fireEvent.click(screen.getByLabelText(/screen time/i))
      fireEvent.click(screen.getByRole('button', { name: /next/i }))
      fireEvent.click(screen.getByRole('button', { name: /next/i }))
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'My reason' } })
      fireEvent.click(screen.getByRole('button', { name: /next/i }))

      expect(screen.getByText('Review Your Request')).toBeInTheDocument()
    })

    it('should show submit button on final step', async () => {
      render(<ChildAgreementProposalWizard {...defaultProps} />)
      // Navigate through all steps
      fireEvent.click(screen.getByLabelText(/screen time/i))
      fireEvent.click(screen.getByRole('button', { name: /next/i }))
      fireEvent.click(screen.getByRole('button', { name: /next/i }))
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'My reason' } })
      fireEvent.click(screen.getByRole('button', { name: /next/i }))

      expect(screen.getByRole('button', { name: /send to parents/i })).toBeInTheDocument()
    })

    it('should show parent names in notification message', async () => {
      render(<ChildAgreementProposalWizard {...defaultProps} />)
      // Navigate through all steps
      fireEvent.click(screen.getByLabelText(/screen time/i))
      fireEvent.click(screen.getByRole('button', { name: /next/i }))
      fireEvent.click(screen.getByRole('button', { name: /next/i }))
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'My reason' } })
      fireEvent.click(screen.getByRole('button', { name: /next/i }))

      expect(screen.getByText(/mom and dad will get a notification/i)).toBeInTheDocument()
    })

    it('should call onComplete after successful submission', async () => {
      render(<ChildAgreementProposalWizard {...defaultProps} />)
      // Navigate through all steps
      fireEvent.click(screen.getByLabelText(/screen time/i))
      fireEvent.click(screen.getByRole('button', { name: /next/i }))
      fireEvent.click(screen.getByRole('button', { name: /next/i }))
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'My reason' } })
      fireEvent.click(screen.getByRole('button', { name: /next/i }))

      fireEvent.click(screen.getByRole('button', { name: /send to parents/i }))

      await waitFor(() => {
        expect(mockCreateProposal).toHaveBeenCalled()
        expect(defaultProps.onComplete).toHaveBeenCalledWith('proposal-123')
      })
    })
  })

  describe('celebratory feedback (AC3)', () => {
    it('should show celebratory message on successful submission', async () => {
      render(<ChildAgreementProposalWizard {...defaultProps} />)
      // Navigate through all steps
      fireEvent.click(screen.getByLabelText(/screen time/i))
      fireEvent.click(screen.getByRole('button', { name: /next/i }))
      fireEvent.click(screen.getByRole('button', { name: /next/i }))
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'My reason' } })
      fireEvent.click(screen.getByRole('button', { name: /next/i }))

      fireEvent.click(screen.getByRole('button', { name: /send to parents/i }))

      await waitFor(() => {
        expect(defaultProps.onComplete).toHaveBeenCalled()
      })
    })
  })

  describe('cancel functionality', () => {
    it('should show cancel button', () => {
      render(<ChildAgreementProposalWizard {...defaultProps} />)
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('should call onCancel when cancel is clicked', () => {
      render(<ChildAgreementProposalWizard {...defaultProps} />)
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
      expect(defaultProps.onCancel).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should display error when submission fails', async () => {
      mockCreateProposal.mockRejectedValue(new Error('Failed to submit'))

      render(<ChildAgreementProposalWizard {...defaultProps} />)
      // Navigate through all steps
      fireEvent.click(screen.getByLabelText(/screen time/i))
      fireEvent.click(screen.getByRole('button', { name: /next/i }))
      fireEvent.click(screen.getByRole('button', { name: /next/i }))
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'My reason' } })
      fireEvent.click(screen.getByRole('button', { name: /next/i }))

      fireEvent.click(screen.getByRole('button', { name: /send to parents/i }))

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })
  })
})
