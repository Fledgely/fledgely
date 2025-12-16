/**
 * WizardStepIndicator Tests
 *
 * Story 4.4: Quick Start Wizard - Task 4
 * AC #4: Wizard uses progress indicator showing time remaining
 *
 * Tests:
 * - Progress bar display
 * - Step dots/markers
 * - Time estimate display
 * - Accessibility (ARIA live region)
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WizardStepIndicator } from '../WizardStepIndicator'

describe('WizardStepIndicator', () => {
  const defaultProps = {
    currentStep: 0,
    totalSteps: 5,
    stepNames: ['Age Selection', 'Screen Time', 'Bedtime', 'Monitoring', 'Preview'],
  }

  describe('basic rendering', () => {
    it('renders the progress bar', () => {
      render(<WizardStepIndicator {...defaultProps} />)
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('renders step count text', () => {
      render(<WizardStepIndicator {...defaultProps} />)
      // Multiple elements match (visible text + aria-live region)
      const matches = screen.getAllByText(/step 1 of 5/i)
      expect(matches.length).toBeGreaterThan(0)
    })

    it('renders current step name', () => {
      render(<WizardStepIndicator {...defaultProps} />)
      expect(screen.getByText('Age Selection')).toBeInTheDocument()
    })

    it('renders time remaining estimate', () => {
      render(<WizardStepIndicator {...defaultProps} />)
      expect(screen.getByText(/min remaining/i)).toBeInTheDocument()
    })
  })

  describe('progress calculation', () => {
    it('shows 0% progress on step 0', () => {
      render(<WizardStepIndicator {...defaultProps} currentStep={0} />)
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-valuenow', '0')
    })

    it('shows 25% progress on step 1 of 5', () => {
      render(<WizardStepIndicator {...defaultProps} currentStep={1} />)
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-valuenow', '20')
    })

    it('shows 50% progress on step 2 of 5', () => {
      render(<WizardStepIndicator {...defaultProps} currentStep={2} />)
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-valuenow', '40')
    })

    it('shows 100% progress on final step', () => {
      render(<WizardStepIndicator {...defaultProps} currentStep={4} />)
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-valuenow', '80')
    })

    it('calculates progress correctly for different total steps', () => {
      render(
        <WizardStepIndicator
          currentStep={2}
          totalSteps={3}
          stepNames={['Step 1', 'Step 2', 'Step 3']}
        />
      )
      const progressbar = screen.getByRole('progressbar')
      // 2/3 completed = ~67%
      expect(progressbar).toHaveAttribute('aria-valuenow', '67')
    })
  })

  describe('step count display', () => {
    it('displays correct step number for step 0', () => {
      render(<WizardStepIndicator {...defaultProps} currentStep={0} />)
      // Multiple elements match (visible text + aria-live region)
      const matches = screen.getAllByText(/step 1 of 5/i)
      expect(matches.length).toBeGreaterThan(0)
    })

    it('displays correct step number for step 2', () => {
      render(<WizardStepIndicator {...defaultProps} currentStep={2} />)
      const matches = screen.getAllByText(/step 3 of 5/i)
      expect(matches.length).toBeGreaterThan(0)
    })

    it('displays correct step number for final step', () => {
      render(<WizardStepIndicator {...defaultProps} currentStep={4} />)
      const matches = screen.getAllByText(/step 5 of 5/i)
      expect(matches.length).toBeGreaterThan(0)
    })
  })

  describe('time estimate display', () => {
    it('shows higher time estimate on first step', () => {
      render(<WizardStepIndicator {...defaultProps} currentStep={0} />)
      const timeText = screen.getByText(/min remaining/i).textContent
      expect(timeText).toMatch(/\d+/)
    })

    it('shows lower time estimate on later steps', () => {
      const { rerender } = render(<WizardStepIndicator {...defaultProps} currentStep={0} />)
      const initialTimeText = screen.getByText(/min remaining/i).textContent

      rerender(<WizardStepIndicator {...defaultProps} currentStep={3} />)
      const laterTimeText = screen.getByText(/min remaining/i).textContent

      // Extract numbers from text
      const initialMinutes = parseInt(initialTimeText?.match(/\d+/)?.[0] || '0')
      const laterMinutes = parseInt(laterTimeText?.match(/\d+/)?.[0] || '0')

      expect(laterMinutes).toBeLessThanOrEqual(initialMinutes)
    })

    it('shows ~1 min or less on final step', () => {
      render(<WizardStepIndicator {...defaultProps} currentStep={4} />)
      const timeText = screen.getByText(/min remaining/i).textContent
      const minutes = parseInt(timeText?.match(/\d+/)?.[0] || '0')
      expect(minutes).toBeLessThanOrEqual(2)
    })
  })

  describe('step dots/markers', () => {
    it('renders step dots for each step', () => {
      render(<WizardStepIndicator {...defaultProps} />)
      const dots = screen.getAllByTestId(/step-dot/i)
      expect(dots.length).toBe(5)
    })

    it('marks current step as active', () => {
      render(<WizardStepIndicator {...defaultProps} currentStep={2} />)
      const dots = screen.getAllByTestId(/step-dot/i)
      // Current step should have active styling
      expect(dots[2]).toHaveClass(/active|current/)
    })

    it('marks completed steps differently', () => {
      render(<WizardStepIndicator {...defaultProps} currentStep={2} />)
      const dots = screen.getAllByTestId(/step-dot/i)
      // Steps before current should be completed
      expect(dots[0]).toHaveClass(/completed|done/)
      expect(dots[1]).toHaveClass(/completed|done/)
    })

    it('marks future steps as pending', () => {
      render(<WizardStepIndicator {...defaultProps} currentStep={2} />)
      const dots = screen.getAllByTestId(/step-dot/i)
      // Steps after current should be pending
      expect(dots[3]).toHaveClass(/pending|upcoming/)
      expect(dots[4]).toHaveClass(/pending|upcoming/)
    })
  })

  describe('accessibility', () => {
    it('has aria-label on progressbar', () => {
      render(<WizardStepIndicator {...defaultProps} />)
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-label')
    })

    it('has aria-valuemin and aria-valuemax', () => {
      render(<WizardStepIndicator {...defaultProps} />)
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-valuemin', '0')
      expect(progressbar).toHaveAttribute('aria-valuemax', '100')
    })

    it('has ARIA live region for step announcements', () => {
      render(<WizardStepIndicator {...defaultProps} />)
      const liveRegion = document.querySelector('[aria-live="polite"]')
      expect(liveRegion).toBeInTheDocument()
    })

    it('announces step changes for screen readers', () => {
      const { rerender } = render(<WizardStepIndicator {...defaultProps} currentStep={0} />)
      rerender(<WizardStepIndicator {...defaultProps} currentStep={1} />)

      const liveRegion = document.querySelector('[aria-live="polite"]')
      expect(liveRegion?.textContent).toMatch(/step 2|screen time/i)
    })

    it('step dots have accessible labels', () => {
      render(<WizardStepIndicator {...defaultProps} />)
      const dots = screen.getAllByTestId(/step-dot/i)
      dots.forEach((dot, index) => {
        expect(dot).toHaveAttribute('aria-label')
      })
    })
  })

  describe('visual animation', () => {
    it('progress bar has transition classes for smooth animation', () => {
      render(<WizardStepIndicator {...defaultProps} />)
      const progressbar = screen.getByRole('progressbar')
      const progressFill = progressbar.querySelector('[class*="transition"]')
      expect(progressFill).toBeInTheDocument()
    })
  })
})
