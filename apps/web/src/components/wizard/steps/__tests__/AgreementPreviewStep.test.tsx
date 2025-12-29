/**
 * Tests for AgreementPreviewStep component.
 *
 * Story 4.4: Quick Start Wizard - AC4
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AgreementPreviewStep } from '../AgreementPreviewStep'
import type { QuickStartState } from '../../../../hooks/useQuickStartWizard'
import type { AgreementTemplate } from '@fledgely/shared/contracts'

const mockTemplate: AgreementTemplate = {
  id: 'template-1',
  name: 'Digital Balance Template',
  description: 'A balanced approach for growing independence',
  ageGroup: '8-10',
  variation: 'balanced',
  defaults: {
    screenTimeLimits: { weekday: 120, weekend: 180 },
    bedtimeCutoff: { weekday: '21:00', weekend: '22:00' },
    monitoringLevel: 'medium',
  },
  sections: [],
}

describe('AgreementPreviewStep', () => {
  const mockState: QuickStartState = {
    childAge: 10,
    ageGroup: '8-10',
    selectedTemplate: mockTemplate,
    screenTimeLimits: { weekday: 120, weekend: 180 },
    bedtimeCutoff: { weekday: '21:00', weekend: '22:00' },
    monitoringLevel: 'medium',
  }

  const mockOnEditStep = vi.fn()
  const mockOnStartCoCreation = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render step heading', () => {
      render(
        <AgreementPreviewStep
          state={mockState}
          onEditStep={mockOnEditStep}
          onStartCoCreation={mockOnStartCoCreation}
        />
      )

      expect(screen.getByText('Review Your Selections')).toBeInTheDocument()
    })

    it('should render age group section', () => {
      render(
        <AgreementPreviewStep
          state={mockState}
          onEditStep={mockOnEditStep}
          onStartCoCreation={mockOnStartCoCreation}
        />
      )

      expect(screen.getByText('Age Group')).toBeInTheDocument()
      expect(screen.getByText('Ages 8-10')).toBeInTheDocument()
    })

    it('should render screen time section', () => {
      render(
        <AgreementPreviewStep
          state={mockState}
          onEditStep={mockOnEditStep}
          onStartCoCreation={mockOnStartCoCreation}
        />
      )

      expect(screen.getByText('Screen Time Limits')).toBeInTheDocument()
      expect(screen.getByText(/Weekdays: 2 hours/)).toBeInTheDocument()
      expect(screen.getByText(/Weekends: 3 hours/)).toBeInTheDocument()
    })

    it('should render bedtime section', () => {
      render(
        <AgreementPreviewStep
          state={mockState}
          onEditStep={mockOnEditStep}
          onStartCoCreation={mockOnStartCoCreation}
        />
      )

      expect(screen.getByText('Bedtime Cutoff')).toBeInTheDocument()
      expect(screen.getByText(/Weekdays: 9:00 PM/)).toBeInTheDocument()
      expect(screen.getByText(/Weekends: 10:00 PM/)).toBeInTheDocument()
    })

    it('should render monitoring section', () => {
      render(
        <AgreementPreviewStep
          state={mockState}
          onEditStep={mockOnEditStep}
          onStartCoCreation={mockOnStartCoCreation}
        />
      )

      expect(screen.getByText('Monitoring Level')).toBeInTheDocument()
      expect(screen.getByText('Medium Monitoring')).toBeInTheDocument()
    })

    it('should render template info', () => {
      render(
        <AgreementPreviewStep
          state={mockState}
          onEditStep={mockOnEditStep}
          onStartCoCreation={mockOnStartCoCreation}
        />
      )

      expect(screen.getByText('Based on: Digital Balance Template')).toBeInTheDocument()
      expect(screen.getByText('A balanced approach for growing independence')).toBeInTheDocument()
    })

    it('should render next steps info', () => {
      render(
        <AgreementPreviewStep
          state={mockState}
          onEditStep={mockOnEditStep}
          onStartCoCreation={mockOnStartCoCreation}
        />
      )

      expect(screen.getByText(/You'll sit down with your child/)).toBeInTheDocument()
    })

    it('should render Start Co-Creation button', () => {
      render(
        <AgreementPreviewStep
          state={mockState}
          onEditStep={mockOnEditStep}
          onStartCoCreation={mockOnStartCoCreation}
        />
      )

      expect(
        screen.getByRole('button', { name: 'Start Co-Creation with My Child' })
      ).toBeInTheDocument()
    })
  })

  describe('edit buttons', () => {
    it('should render Edit button for each section', () => {
      render(
        <AgreementPreviewStep
          state={mockState}
          onEditStep={mockOnEditStep}
          onStartCoCreation={mockOnStartCoCreation}
        />
      )

      const editButtons = screen.getAllByRole('button', { name: 'Edit' })
      expect(editButtons).toHaveLength(4) // Age, Screen Time, Bedtime, Monitoring
    })

    it('should call onEditStep with step 0 for age edit', () => {
      render(
        <AgreementPreviewStep
          state={mockState}
          onEditStep={mockOnEditStep}
          onStartCoCreation={mockOnStartCoCreation}
        />
      )

      const editButtons = screen.getAllByRole('button', { name: 'Edit' })
      fireEvent.click(editButtons[0])

      expect(mockOnEditStep).toHaveBeenCalledWith(0)
    })

    it('should call onEditStep with step 1 for screen time edit', () => {
      render(
        <AgreementPreviewStep
          state={mockState}
          onEditStep={mockOnEditStep}
          onStartCoCreation={mockOnStartCoCreation}
        />
      )

      const editButtons = screen.getAllByRole('button', { name: 'Edit' })
      fireEvent.click(editButtons[1])

      expect(mockOnEditStep).toHaveBeenCalledWith(1)
    })

    it('should call onEditStep with step 2 for bedtime edit', () => {
      render(
        <AgreementPreviewStep
          state={mockState}
          onEditStep={mockOnEditStep}
          onStartCoCreation={mockOnStartCoCreation}
        />
      )

      const editButtons = screen.getAllByRole('button', { name: 'Edit' })
      fireEvent.click(editButtons[2])

      expect(mockOnEditStep).toHaveBeenCalledWith(2)
    })

    it('should call onEditStep with step 3 for monitoring edit', () => {
      render(
        <AgreementPreviewStep
          state={mockState}
          onEditStep={mockOnEditStep}
          onStartCoCreation={mockOnStartCoCreation}
        />
      )

      const editButtons = screen.getAllByRole('button', { name: 'Edit' })
      fireEvent.click(editButtons[3])

      expect(mockOnEditStep).toHaveBeenCalledWith(3)
    })
  })

  describe('Start Co-Creation button', () => {
    it('should call onStartCoCreation when clicked', () => {
      render(
        <AgreementPreviewStep
          state={mockState}
          onEditStep={mockOnEditStep}
          onStartCoCreation={mockOnStartCoCreation}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: 'Start Co-Creation with My Child' }))

      expect(mockOnStartCoCreation).toHaveBeenCalled()
    })
  })

  describe('null values', () => {
    it('should show "Not selected" for null age group', () => {
      const stateWithNullAge: QuickStartState = {
        ...mockState,
        ageGroup: null,
      }

      render(
        <AgreementPreviewStep
          state={stateWithNullAge}
          onEditStep={mockOnEditStep}
          onStartCoCreation={mockOnStartCoCreation}
        />
      )

      expect(screen.getByText('Not selected')).toBeInTheDocument()
    })

    it('should show "No bedtime limit set" for null bedtime', () => {
      const stateWithNullBedtime: QuickStartState = {
        ...mockState,
        bedtimeCutoff: null,
      }

      render(
        <AgreementPreviewStep
          state={stateWithNullBedtime}
          onEditStep={mockOnEditStep}
          onStartCoCreation={mockOnStartCoCreation}
        />
      )

      expect(screen.getByText('No bedtime limit set')).toBeInTheDocument()
    })

    it('should not show template info when no template selected', () => {
      const stateWithNullTemplate: QuickStartState = {
        ...mockState,
        selectedTemplate: null,
      }

      render(
        <AgreementPreviewStep
          state={stateWithNullTemplate}
          onEditStep={mockOnEditStep}
          onStartCoCreation={mockOnStartCoCreation}
        />
      )

      expect(screen.queryByText('Based on:')).not.toBeInTheDocument()
    })
  })

  describe('time formatting', () => {
    it('should format minutes under an hour', () => {
      const stateWithShortTimes: QuickStartState = {
        ...mockState,
        screenTimeLimits: { weekday: 45, weekend: 30 },
      }

      render(
        <AgreementPreviewStep
          state={stateWithShortTimes}
          onEditStep={mockOnEditStep}
          onStartCoCreation={mockOnStartCoCreation}
        />
      )

      expect(screen.getByText(/45 minutes/)).toBeInTheDocument()
      expect(screen.getByText(/30 minutes/)).toBeInTheDocument()
    })

    it('should format hours and minutes', () => {
      const stateWithMixedTimes: QuickStartState = {
        ...mockState,
        screenTimeLimits: { weekday: 90, weekend: 150 },
      }

      render(
        <AgreementPreviewStep
          state={stateWithMixedTimes}
          onEditStep={mockOnEditStep}
          onStartCoCreation={mockOnStartCoCreation}
        />
      )

      expect(screen.getByText(/1h 30m/)).toBeInTheDocument()
      expect(screen.getByText(/2h 30m/)).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have minimum touch target on edit buttons (NFR49)', () => {
      render(
        <AgreementPreviewStep
          state={mockState}
          onEditStep={mockOnEditStep}
          onStartCoCreation={mockOnStartCoCreation}
        />
      )

      const editButtons = screen.getAllByRole('button', { name: 'Edit' })
      editButtons.forEach((button) => {
        expect(button).toHaveClass('min-h-[44px]')
        expect(button).toHaveClass('min-w-[60px]')
      })
    })

    it('should have minimum touch target on Start Co-Creation button (NFR49)', () => {
      render(
        <AgreementPreviewStep
          state={mockState}
          onEditStep={mockOnEditStep}
          onStartCoCreation={mockOnStartCoCreation}
        />
      )

      const startButton = screen.getByRole('button', { name: 'Start Co-Creation with My Child' })
      expect(startButton).toHaveClass('min-h-[56px]')
    })
  })
})
