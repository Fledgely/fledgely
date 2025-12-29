/**
 * Tests for QuickStartWizard component.
 *
 * Story 4.4: Quick Start Wizard
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QuickStartWizard } from '../QuickStartWizard'

describe('QuickStartWizard', () => {
  const mockOnComplete = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render the wizard container', () => {
      render(<QuickStartWizard onComplete={mockOnComplete} />)

      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('should start at age selection step', () => {
      render(<QuickStartWizard onComplete={mockOnComplete} />)

      expect(screen.getByText("What's your child's age group?")).toBeInTheDocument()
    })

    it('should show progress indicator', () => {
      render(<QuickStartWizard onComplete={mockOnComplete} />)

      expect(screen.getByText('Child Age')).toBeInTheDocument()
      expect(screen.getByText('Screen Time')).toBeInTheDocument()
    })
  })

  describe('navigation buttons', () => {
    it('should show Cancel button on first step', () => {
      render(<QuickStartWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />)

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    it('should call onCancel when Cancel is clicked', () => {
      render(<QuickStartWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />)

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(mockOnCancel).toHaveBeenCalled()
    })

    it('should show Continue button', () => {
      render(<QuickStartWizard onComplete={mockOnComplete} />)

      expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument()
    })

    it('should disable Continue button when cannot proceed', () => {
      render(<QuickStartWizard onComplete={mockOnComplete} />)

      expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
    })

    it('should enable Continue button after age selection', () => {
      render(<QuickStartWizard onComplete={mockOnComplete} />)

      // Select an age group
      fireEvent.click(screen.getByText('Ages 8-10'))

      expect(screen.getByRole('button', { name: 'Continue' })).not.toBeDisabled()
    })
  })

  describe('step navigation', () => {
    it('should navigate to screen time step after age selection', () => {
      render(<QuickStartWizard onComplete={mockOnComplete} />)

      // Select age group
      fireEvent.click(screen.getByText('Ages 8-10'))

      // Click Continue
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

      // Should now be on screen time step
      expect(screen.getByText('Set Screen Time Limits')).toBeInTheDocument()
    })

    it('should show Back button on non-first steps', () => {
      render(<QuickStartWizard onComplete={mockOnComplete} />)

      // Navigate to step 2
      fireEvent.click(screen.getByText('Ages 8-10'))
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

      expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
    })

    it('should navigate back when Back is clicked', () => {
      render(<QuickStartWizard onComplete={mockOnComplete} />)

      // Navigate to step 2
      fireEvent.click(screen.getByText('Ages 8-10'))
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

      // Click Back
      fireEvent.click(screen.getByRole('button', { name: 'Back' }))

      // Should be back on age selection
      expect(screen.getByText("What's your child's age group?")).toBeInTheDocument()
    })
  })

  describe('with childAge prop', () => {
    it('should pre-select age group based on child age', () => {
      render(<QuickStartWizard childAge={10} onComplete={mockOnComplete} />)

      // Should show the age in the heading
      expect(screen.getByText('Your child is 10 years old')).toBeInTheDocument()
    })

    it('should have Continue enabled when age is pre-selected', () => {
      render(<QuickStartWizard childAge={10} onComplete={mockOnComplete} />)

      expect(screen.getByRole('button', { name: 'Continue' })).not.toBeDisabled()
    })
  })

  describe('full wizard flow', () => {
    it('should navigate through all steps to preview', () => {
      render(<QuickStartWizard childAge={10} onComplete={mockOnComplete} />)

      // Step 1: Age (pre-selected)
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

      // Step 2: Screen Time
      expect(screen.getByText('Set Screen Time Limits')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

      // Step 3: Bedtime
      expect(screen.getByText('Set Bedtime Cutoff')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

      // Step 4: Monitoring
      expect(screen.getByText('Choose Monitoring Level')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

      // Step 5: Preview
      expect(screen.getByText('Review Your Selections')).toBeInTheDocument()
    })

    it('should show Start Co-Creation button on preview step', () => {
      render(<QuickStartWizard childAge={10} onComplete={mockOnComplete} />)

      // Navigate to preview step
      for (let i = 0; i < 4; i++) {
        fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
      }

      expect(
        screen.getByRole('button', { name: 'Start Co-Creation with My Child' })
      ).toBeInTheDocument()
    })

    it('should call onComplete when Start Co-Creation is clicked', () => {
      render(<QuickStartWizard childAge={10} onComplete={mockOnComplete} />)

      // Navigate to preview step
      for (let i = 0; i < 4; i++) {
        fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
      }

      // Click Start Co-Creation
      fireEvent.click(screen.getByRole('button', { name: 'Start Co-Creation with My Child' }))

      expect(mockOnComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          ageGroup: '8-10',
          screenTimeLimits: expect.any(Object),
          monitoringLevel: expect.any(String),
        })
      )
    })
  })

  describe('editing from preview', () => {
    it('should allow editing age from preview', () => {
      render(<QuickStartWizard childAge={10} onComplete={mockOnComplete} />)

      // Navigate to preview step
      for (let i = 0; i < 4; i++) {
        fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
      }

      // Click Edit on age section
      const editButtons = screen.getAllByRole('button', { name: 'Edit' })
      fireEvent.click(editButtons[0]) // First Edit button is for age

      // Should be back on age selection
      expect(screen.getByText('Your child is 10 years old')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have adequate touch targets on navigation buttons (NFR49)', () => {
      render(<QuickStartWizard onComplete={mockOnComplete} />)

      // Navigation buttons should have min-h-[44px]
      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      const continueButton = screen.getByRole('button', { name: 'Continue' })

      expect(cancelButton).toHaveClass('min-h-[44px]')
      expect(continueButton).toHaveClass('min-h-[44px]')
    })
  })
})
