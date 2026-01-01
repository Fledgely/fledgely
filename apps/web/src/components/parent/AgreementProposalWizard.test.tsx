/**
 * AgreementProposalWizard Component Tests - Story 34.1
 *
 * Tests for the multi-step proposal creation wizard.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AgreementProposalWizard } from './AgreementProposalWizard'

// Mock @fledgely/shared
vi.mock('@fledgely/shared', () => ({
  AGREEMENT_PROPOSAL_MESSAGES: {
    childNotification: (name: string) => `${name} proposed a change`,
    pendingStatus: (name: string) => `Waiting for ${name} to review`,
    withdrawConfirmation: 'Are you sure you want to withdraw?',
    reasonPrompts: [
      "You've been responsible with gaming",
      "You've shown great time management",
      'Your grades have improved',
    ],
  },
}))

// Mock the hooks
const mockCreateProposal = vi.fn().mockResolvedValue('proposal-123')
vi.mock('../../hooks/useAgreementProposal', () => ({
  useAgreementProposal: () => ({
    loading: false,
    error: null,
    pendingProposal: null,
    createProposal: mockCreateProposal,
    withdrawProposal: vi.fn(),
  }),
}))

describe('AgreementProposalWizard - Story 34.1', () => {
  const mockSections = [
    { id: 'time-limits', name: 'Time Limits', description: 'Daily screen time limits' },
    { id: 'app-restrictions', name: 'App Restrictions', description: 'Blocked apps' },
  ]

  const mockAgreementData = {
    'time-limits': {
      weekday: { gaming: 60, social: 30 },
      weekend: { gaming: 120, social: 60 },
    },
    'app-restrictions': {
      blocked: ['TikTok'],
      limited: ['YouTube'],
    },
  }

  const defaultProps = {
    sections: mockSections,
    agreementData: mockAgreementData,
    familyId: 'family-1',
    childId: 'child-1',
    childName: 'Alex',
    agreementId: 'agreement-1',
    proposerId: 'parent-1',
    proposerName: 'Mom',
    onComplete: vi.fn(),
    onCancel: vi.fn(),
  }

  describe('step navigation', () => {
    it('should start on section selection step', () => {
      render(<AgreementProposalWizard {...defaultProps} />)

      expect(screen.getByText(/select sections/i)).toBeInTheDocument()
    })

    it('should show step indicator', () => {
      render(<AgreementProposalWizard {...defaultProps} />)

      expect(screen.getByText(/step 1/i)).toBeInTheDocument()
    })

    it('should disable next button when no sections selected', () => {
      render(<AgreementProposalWizard {...defaultProps} />)

      const nextButton = screen.getByRole('button', { name: /next/i })
      expect(nextButton).toBeDisabled()
    })

    it('should enable next button when section is selected', () => {
      render(<AgreementProposalWizard {...defaultProps} />)

      fireEvent.click(screen.getByLabelText('Time Limits'))

      const nextButton = screen.getByRole('button', { name: /next/i })
      expect(nextButton).not.toBeDisabled()
    })

    it('should navigate to step 2 when next is clicked', () => {
      render(<AgreementProposalWizard {...defaultProps} />)

      fireEvent.click(screen.getByLabelText('Time Limits'))
      fireEvent.click(screen.getByRole('button', { name: /next/i }))

      expect(screen.getByText(/step 2/i)).toBeInTheDocument()
      expect(screen.getByText(/make changes/i)).toBeInTheDocument()
    })

    it('should allow going back to previous step', () => {
      render(<AgreementProposalWizard {...defaultProps} />)

      // Go to step 2
      fireEvent.click(screen.getByLabelText('Time Limits'))
      fireEvent.click(screen.getByRole('button', { name: /next/i }))

      // Go back
      fireEvent.click(screen.getByRole('button', { name: /back/i }))

      expect(screen.getByText(/step 1/i)).toBeInTheDocument()
    })
  })

  describe('section selection (step 1)', () => {
    it('should display all available sections', () => {
      render(<AgreementProposalWizard {...defaultProps} />)

      expect(screen.getByText('Time Limits')).toBeInTheDocument()
      expect(screen.getByText('App Restrictions')).toBeInTheDocument()
    })

    it('should allow selecting multiple sections', () => {
      render(<AgreementProposalWizard {...defaultProps} />)

      fireEvent.click(screen.getByLabelText('Time Limits'))
      fireEvent.click(screen.getByLabelText('App Restrictions'))

      const timeLimitsCheckbox = screen.getByLabelText('Time Limits') as HTMLInputElement
      const appRestrictionsCheckbox = screen.getByLabelText('App Restrictions') as HTMLInputElement

      expect(timeLimitsCheckbox.checked).toBe(true)
      expect(appRestrictionsCheckbox.checked).toBe(true)
    })
  })

  describe('edit changes (step 2)', () => {
    it('should show editable fields for selected section', () => {
      render(<AgreementProposalWizard {...defaultProps} />)

      fireEvent.click(screen.getByLabelText('Time Limits'))
      fireEvent.click(screen.getByRole('button', { name: /next/i }))

      // Should show "Make Changes" header for step 2
      expect(screen.getByText(/make changes/i)).toBeInTheDocument()
    })
  })

  describe('reason input (step 3)', () => {
    it('should show reason input after changes', async () => {
      render(<AgreementProposalWizard {...defaultProps} />)

      // Step 1: Select section
      fireEvent.click(screen.getByLabelText('Time Limits'))
      fireEvent.click(screen.getByRole('button', { name: /next/i }))

      // Step 2: Skip to step 3
      fireEvent.click(screen.getByRole('button', { name: /next/i }))

      expect(screen.getByText(/step 3/i)).toBeInTheDocument()
      expect(screen.getByText(/reason/i)).toBeInTheDocument()
    })

    it('should show positive framing prompts', async () => {
      render(<AgreementProposalWizard {...defaultProps} />)

      // Navigate to step 3
      fireEvent.click(screen.getByLabelText('Time Limits'))
      fireEvent.click(screen.getByRole('button', { name: /next/i }))
      fireEvent.click(screen.getByRole('button', { name: /next/i }))

      expect(screen.getByText(/responsible/i)).toBeInTheDocument()
    })

    it('should allow entering custom reason', async () => {
      render(<AgreementProposalWizard {...defaultProps} />)

      // Navigate to step 3
      fireEvent.click(screen.getByLabelText('Time Limits'))
      fireEvent.click(screen.getByRole('button', { name: /next/i }))
      fireEvent.click(screen.getByRole('button', { name: /next/i }))

      const textarea = screen.getByRole('textbox')
      fireEvent.change(textarea, { target: { value: 'Great progress this week!' } })

      expect(textarea).toHaveValue('Great progress this week!')
    })
  })

  describe('review and submit (step 4)', () => {
    it('should show review of all changes', async () => {
      render(<AgreementProposalWizard {...defaultProps} />)

      // Navigate through all steps
      fireEvent.click(screen.getByLabelText('Time Limits'))
      fireEvent.click(screen.getByRole('button', { name: /next/i }))
      fireEvent.click(screen.getByRole('button', { name: /next/i }))
      fireEvent.click(screen.getByRole('button', { name: /next/i }))

      expect(screen.getByText(/step 4/i)).toBeInTheDocument()
      expect(screen.getByText('Review Your Proposal')).toBeInTheDocument()
    })

    it('should show submit button on final step', async () => {
      render(<AgreementProposalWizard {...defaultProps} />)

      // Navigate through all steps
      fireEvent.click(screen.getByLabelText('Time Limits'))
      fireEvent.click(screen.getByRole('button', { name: /next/i }))
      fireEvent.click(screen.getByRole('button', { name: /next/i }))
      fireEvent.click(screen.getByRole('button', { name: /next/i }))

      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
    })

    it('should call onComplete after successful submission', async () => {
      const onComplete = vi.fn()
      render(<AgreementProposalWizard {...defaultProps} onComplete={onComplete} />)

      // Navigate through all steps
      fireEvent.click(screen.getByLabelText('Time Limits'))
      fireEvent.click(screen.getByRole('button', { name: /next/i }))
      fireEvent.click(screen.getByRole('button', { name: /next/i }))
      fireEvent.click(screen.getByRole('button', { name: /next/i }))

      // Submit
      fireEvent.click(screen.getByRole('button', { name: /submit/i }))

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledWith('proposal-123')
      })
    })
  })

  describe('cancel functionality', () => {
    it('should show cancel button', () => {
      render(<AgreementProposalWizard {...defaultProps} />)

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('should call onCancel when cancel is clicked', () => {
      const onCancel = vi.fn()
      render(<AgreementProposalWizard {...defaultProps} onCancel={onCancel} />)

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

      expect(onCancel).toHaveBeenCalled()
    })
  })
})
