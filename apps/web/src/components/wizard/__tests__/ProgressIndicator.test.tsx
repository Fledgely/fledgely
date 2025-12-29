/**
 * Tests for ProgressIndicator component.
 *
 * Story 4.4: Quick Start Wizard
 */

import { render, screen } from '@testing-library/react'
import { ProgressIndicator } from '../ProgressIndicator'
import { WIZARD_STEPS } from '../../../hooks/useQuickStartWizard'

describe('ProgressIndicator', () => {
  describe('rendering', () => {
    it('should render progress bar', () => {
      render(<ProgressIndicator currentStep={0} timeRemaining={8} />)

      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('should render all step names', () => {
      render(<ProgressIndicator currentStep={0} timeRemaining={8} />)

      WIZARD_STEPS.forEach((step) => {
        expect(screen.getByText(step.name)).toBeInTheDocument()
      })
    })

    it('should render time remaining', () => {
      render(<ProgressIndicator currentStep={0} timeRemaining={8} />)

      // Both the visible span and sr-only div contain the time
      const timeElements = screen.getAllByText(/8 min/)
      expect(timeElements.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('progress calculation', () => {
    it('should show 0% progress at first step', () => {
      render(<ProgressIndicator currentStep={0} timeRemaining={8} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '0')
    })

    it('should show progress at middle step', () => {
      render(<ProgressIndicator currentStep={2} timeRemaining={4} />)

      const progressBar = screen.getByRole('progressbar')
      const value = parseInt(progressBar.getAttribute('aria-valuenow') || '0')
      expect(value).toBeGreaterThan(0)
      expect(value).toBeLessThan(100)
    })

    it('should show 100% progress at last step', () => {
      render(<ProgressIndicator currentStep={4} timeRemaining={0} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '100')
    })
  })

  describe('step indicators', () => {
    it('should mark completed steps', () => {
      render(<ProgressIndicator currentStep={2} timeRemaining={4} />)

      // Steps 0 and 1 should be marked as completed (have checkmark)
      const checkmarks = screen.getAllByTestId('step-completed')
      expect(checkmarks).toHaveLength(2)
    })

    it('should highlight current step', () => {
      render(<ProgressIndicator currentStep={2} timeRemaining={4} />)

      const currentStep = screen.getByTestId('step-current')
      expect(currentStep).toBeInTheDocument()
    })

    it('should show upcoming steps differently', () => {
      render(<ProgressIndicator currentStep={1} timeRemaining={6} />)

      const upcomingSteps = screen.getAllByTestId('step-upcoming')
      expect(upcomingSteps).toHaveLength(3)
    })
  })

  describe('accessibility', () => {
    it('should have proper aria attributes on progressbar', () => {
      render(<ProgressIndicator currentStep={2} timeRemaining={4} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
      expect(progressBar).toHaveAttribute('aria-valuenow')
      expect(progressBar).toHaveAttribute('aria-label')
    })

    it('should indicate current step in screen reader accessible way', () => {
      render(<ProgressIndicator currentStep={2} timeRemaining={4} />)

      // The current step should have aria-current
      const steps = screen.getAllByRole('listitem')
      const currentStep = steps[2]
      expect(currentStep).toHaveAttribute('aria-current', 'step')
    })
  })

  describe('time display', () => {
    it('should display single minute correctly', () => {
      render(<ProgressIndicator currentStep={3} timeRemaining={1} />)

      // Both visible span and sr-only div contain the time
      const timeElements = screen.getAllByText(/1 min/)
      expect(timeElements.length).toBeGreaterThanOrEqual(1)
    })

    it('should display multiple minutes correctly', () => {
      render(<ProgressIndicator currentStep={0} timeRemaining={10} />)

      // Both visible span and sr-only div contain the time
      const timeElements = screen.getAllByText(/10 min/)
      expect(timeElements.length).toBeGreaterThanOrEqual(1)
    })

    it('should display zero minutes at completion', () => {
      render(<ProgressIndicator currentStep={4} timeRemaining={0} />)

      // Both visible span and sr-only div contain the time
      const timeElements = screen.getAllByText(/0 min/)
      expect(timeElements.length).toBeGreaterThanOrEqual(1)
    })
  })
})
