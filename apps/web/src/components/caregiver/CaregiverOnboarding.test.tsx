/**
 * Tests for CaregiverOnboarding component.
 *
 * Story 19D.1: Caregiver Invitation & Onboarding
 *
 * Tests cover:
 * - AC4: Caregiver sees simple onboarding explaining their limited access
 * - NFR49: Large, clear UI suitable for older adults
 * - Multi-step navigation
 * - Completion callback
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CaregiverOnboarding from './CaregiverOnboarding'

describe('CaregiverOnboarding', () => {
  const mockOnComplete = vi.fn()

  const defaultProps = {
    familyName: 'Smith Family',
    childNames: ['Emma', 'Jack'],
    onComplete: mockOnComplete,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Step 1: Welcome', () => {
    it('renders the onboarding container', () => {
      render(<CaregiverOnboarding {...defaultProps} />)

      expect(screen.getByTestId('caregiver-onboarding')).toBeInTheDocument()
    })

    it('shows welcome message with family name', () => {
      render(<CaregiverOnboarding {...defaultProps} />)

      expect(screen.getByTestId('onboarding-title')).toHaveTextContent(/welcome to smith family/i)
    })

    it('explains Status Viewer role', () => {
      render(<CaregiverOnboarding {...defaultProps} />)

      expect(screen.getByText(/status viewer/i)).toBeInTheDocument()
    })

    it('shows children the caregiver can view', () => {
      render(<CaregiverOnboarding {...defaultProps} />)

      expect(screen.getByTestId('children-list')).toBeInTheDocument()
      expect(screen.getByTestId('child-name-0')).toHaveTextContent('Emma')
      expect(screen.getByTestId('child-name-1')).toHaveTextContent('Jack')
    })

    it('shows Next button on first step', () => {
      render(<CaregiverOnboarding {...defaultProps} />)

      expect(screen.getByTestId('next-button')).toBeInTheDocument()
      expect(screen.getByTestId('next-button')).toHaveTextContent('Next')
    })

    it('does not show Back button on first step', () => {
      render(<CaregiverOnboarding {...defaultProps} />)

      expect(screen.queryByTestId('back-button')).not.toBeInTheDocument()
    })
  })

  describe('Step 2: What You Can See', () => {
    it('navigates to step 2 when Next is clicked', () => {
      render(<CaregiverOnboarding {...defaultProps} />)

      fireEvent.click(screen.getByTestId('next-button'))

      expect(screen.getByTestId('onboarding-title')).toHaveTextContent(/what you can see/i)
    })

    it('shows features list', () => {
      render(<CaregiverOnboarding {...defaultProps} />)

      fireEvent.click(screen.getByTestId('next-button'))

      expect(screen.getByTestId('feature-0')).toBeInTheDocument()
      expect(screen.getByTestId('feature-1')).toBeInTheDocument()
      expect(screen.getByTestId('feature-2')).toBeInTheDocument()
    })

    it('explains view status updates', () => {
      render(<CaregiverOnboarding {...defaultProps} />)

      fireEvent.click(screen.getByTestId('next-button'))

      expect(screen.getByText(/view status updates/i)).toBeInTheDocument()
    })

    it('explains contact parents feature', () => {
      render(<CaregiverOnboarding {...defaultProps} />)

      fireEvent.click(screen.getByTestId('next-button'))

      expect(screen.getByText(/contact parents/i)).toBeInTheDocument()
    })

    it('shows Back button on step 2', () => {
      render(<CaregiverOnboarding {...defaultProps} />)

      fireEvent.click(screen.getByTestId('next-button'))

      expect(screen.getByTestId('back-button')).toBeInTheDocument()
    })

    it('navigates back to step 1 when Back is clicked', () => {
      render(<CaregiverOnboarding {...defaultProps} />)

      fireEvent.click(screen.getByTestId('next-button'))
      fireEvent.click(screen.getByTestId('back-button'))

      expect(screen.getByTestId('onboarding-title')).toHaveTextContent(/welcome/i)
    })
  })

  describe('Step 3: What You Cannot Do', () => {
    it('navigates to step 3', () => {
      render(<CaregiverOnboarding {...defaultProps} />)

      fireEvent.click(screen.getByTestId('next-button')) // Go to step 2
      fireEvent.click(screen.getByTestId('next-button')) // Go to step 3

      expect(screen.getByTestId('onboarding-title')).toHaveTextContent(/what you cannot do/i)
    })

    it('explains no detailed activity', () => {
      render(<CaregiverOnboarding {...defaultProps} />)

      fireEvent.click(screen.getByTestId('next-button'))
      fireEvent.click(screen.getByTestId('next-button'))

      expect(screen.getByText(/no detailed activity/i)).toBeInTheDocument()
    })

    it('explains no settings changes', () => {
      render(<CaregiverOnboarding {...defaultProps} />)

      fireEvent.click(screen.getByTestId('next-button'))
      fireEvent.click(screen.getByTestId('next-button'))

      expect(screen.getByText(/no settings changes/i)).toBeInTheDocument()
    })

    it('explains no screenshots', () => {
      render(<CaregiverOnboarding {...defaultProps} />)

      fireEvent.click(screen.getByTestId('next-button'))
      fireEvent.click(screen.getByTestId('next-button'))

      expect(screen.getByText(/no screenshots/i)).toBeInTheDocument()
    })

    it('shows Get Started button on last step', () => {
      render(<CaregiverOnboarding {...defaultProps} />)

      fireEvent.click(screen.getByTestId('next-button'))
      fireEvent.click(screen.getByTestId('next-button'))

      expect(screen.getByTestId('complete-button')).toBeInTheDocument()
      expect(screen.getByTestId('complete-button')).toHaveTextContent('Get Started')
    })
  })

  describe('Completion', () => {
    it('calls onComplete when Get Started is clicked', () => {
      render(<CaregiverOnboarding {...defaultProps} />)

      fireEvent.click(screen.getByTestId('next-button')) // Step 2
      fireEvent.click(screen.getByTestId('next-button')) // Step 3
      fireEvent.click(screen.getByTestId('complete-button'))

      expect(mockOnComplete).toHaveBeenCalled()
    })
  })

  describe('Step Indicator', () => {
    it('shows step indicator with 3 dots', () => {
      render(<CaregiverOnboarding {...defaultProps} />)

      // Step indicator should exist
      expect(screen.getByLabelText(/step 1 of 3/i)).toBeInTheDocument()
    })

    it('updates step indicator as user progresses', () => {
      render(<CaregiverOnboarding {...defaultProps} />)

      fireEvent.click(screen.getByTestId('next-button'))

      expect(screen.getByLabelText(/step 2 of 3/i)).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles single child', () => {
      render(
        <CaregiverOnboarding
          familyName="Smith Family"
          childNames={['Emma']}
          onComplete={mockOnComplete}
        />
      )

      expect(screen.getByTestId('child-name-0')).toHaveTextContent('Emma')
      expect(screen.queryByTestId('child-name-1')).not.toBeInTheDocument()
    })

    it('handles many children', () => {
      render(
        <CaregiverOnboarding
          familyName="Smith Family"
          childNames={['Emma', 'Jack', 'Lily', 'Tom', 'Anna']}
          onComplete={mockOnComplete}
        />
      )

      expect(screen.getByTestId('child-name-0')).toBeInTheDocument()
      expect(screen.getByTestId('child-name-4')).toBeInTheDocument()
    })

    it('handles empty children array', () => {
      render(
        <CaregiverOnboarding
          familyName="Smith Family"
          childNames={[]}
          onComplete={mockOnComplete}
        />
      )

      // Should still render without crashing
      expect(screen.getByTestId('caregiver-onboarding')).toBeInTheDocument()
      expect(screen.queryByTestId('children-list')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility (NFR49)', () => {
    it('has accessible button labels', () => {
      render(<CaregiverOnboarding {...defaultProps} />)

      const nextButton = screen.getByTestId('next-button')
      expect(nextButton).toHaveTextContent('Next')
    })

    it('uses semantic heading', () => {
      render(<CaregiverOnboarding {...defaultProps} />)

      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toBeInTheDocument()
    })
  })
})
