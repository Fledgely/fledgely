/**
 * Tests for BedtimeCutoffStep component.
 *
 * Story 4.4: Quick Start Wizard - AC2
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BedtimeCutoffStep } from '../BedtimeCutoffStep'

describe('BedtimeCutoffStep', () => {
  const mockOnUpdateBedtime = vi.fn()
  const defaultBedtime = { weekday: '21:00', weekend: '22:00' }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render step heading', () => {
      render(
        <BedtimeCutoffStep
          bedtimeCutoff={defaultBedtime}
          ageGroup="8-10"
          onUpdateBedtime={mockOnUpdateBedtime}
        />
      )

      expect(screen.getByText('Set Bedtime Cutoff')).toBeInTheDocument()
    })

    it('should render weekday section', () => {
      render(
        <BedtimeCutoffStep
          bedtimeCutoff={defaultBedtime}
          ageGroup="8-10"
          onUpdateBedtime={mockOnUpdateBedtime}
        />
      )

      expect(screen.getByText('Weekday Bedtime')).toBeInTheDocument()
      expect(screen.getByText('Monday through Friday')).toBeInTheDocument()
    })

    it('should render weekend section', () => {
      render(
        <BedtimeCutoffStep
          bedtimeCutoff={defaultBedtime}
          ageGroup="8-10"
          onUpdateBedtime={mockOnUpdateBedtime}
        />
      )

      expect(screen.getByText('Weekend Bedtime')).toBeInTheDocument()
      expect(screen.getByText('Saturday and Sunday')).toBeInTheDocument()
    })

    it('should render explanation', () => {
      render(
        <BedtimeCutoffStep
          bedtimeCutoff={defaultBedtime}
          ageGroup="8-10"
          onUpdateBedtime={mockOnUpdateBedtime}
        />
      )

      expect(screen.getByText(/At bedtime, device screens will show/)).toBeInTheDocument()
    })
  })

  describe('time display', () => {
    it('should display time in 12-hour format', () => {
      render(
        <BedtimeCutoffStep
          bedtimeCutoff={{ weekday: '21:00', weekend: '22:30' }}
          ageGroup="8-10"
          onUpdateBedtime={mockOnUpdateBedtime}
        />
      )

      expect(screen.getByText('9:00 PM')).toBeInTheDocument()
      expect(screen.getByText('10:30 PM')).toBeInTheDocument()
    })

    it('should handle midnight correctly', () => {
      render(
        <BedtimeCutoffStep
          bedtimeCutoff={{ weekday: '00:00', weekend: '00:30' }}
          ageGroup="14-16"
          onUpdateBedtime={mockOnUpdateBedtime}
        />
      )

      expect(screen.getByText('12:00 AM')).toBeInTheDocument()
      expect(screen.getByText('12:30 AM')).toBeInTheDocument()
    })

    it('should handle noon correctly', () => {
      render(
        <BedtimeCutoffStep
          bedtimeCutoff={{ weekday: '12:00', weekend: '12:30' }}
          ageGroup="8-10"
          onUpdateBedtime={mockOnUpdateBedtime}
        />
      )

      expect(screen.getByText('12:00 PM')).toBeInTheDocument()
      expect(screen.getByText('12:30 PM')).toBeInTheDocument()
    })
  })

  describe('time input interaction', () => {
    it('should call onUpdateBedtime when weekday time changes', () => {
      render(
        <BedtimeCutoffStep
          bedtimeCutoff={defaultBedtime}
          ageGroup="8-10"
          onUpdateBedtime={mockOnUpdateBedtime}
        />
      )

      const weekdayInput = screen.getByLabelText('Weekday Bedtime')
      fireEvent.change(weekdayInput, { target: { value: '20:30' } })

      expect(mockOnUpdateBedtime).toHaveBeenCalledWith({ weekday: '20:30', weekend: '22:00' })
    })

    it('should call onUpdateBedtime when weekend time changes', () => {
      render(
        <BedtimeCutoffStep
          bedtimeCutoff={defaultBedtime}
          ageGroup="8-10"
          onUpdateBedtime={mockOnUpdateBedtime}
        />
      )

      const weekendInput = screen.getByLabelText('Weekend Bedtime')
      fireEvent.change(weekendInput, { target: { value: '23:00' } })

      expect(mockOnUpdateBedtime).toHaveBeenCalledWith({ weekday: '21:00', weekend: '23:00' })
    })
  })

  describe('no bedtime option for teens', () => {
    it('should show no bedtime checkbox for 14-16 age group', () => {
      render(
        <BedtimeCutoffStep
          bedtimeCutoff={defaultBedtime}
          ageGroup="14-16"
          onUpdateBedtime={mockOnUpdateBedtime}
        />
      )

      expect(screen.getByText('No bedtime limit')).toBeInTheDocument()
      expect(
        screen.getByText('Trust your teen to manage their own sleep schedule')
      ).toBeInTheDocument()
    })

    it('should not show no bedtime checkbox for younger age groups', () => {
      render(
        <BedtimeCutoffStep
          bedtimeCutoff={defaultBedtime}
          ageGroup="8-10"
          onUpdateBedtime={mockOnUpdateBedtime}
        />
      )

      expect(screen.queryByText('No bedtime limit')).not.toBeInTheDocument()
    })

    it('should call onUpdateBedtime with null when no bedtime is checked', () => {
      render(
        <BedtimeCutoffStep
          bedtimeCutoff={defaultBedtime}
          ageGroup="14-16"
          onUpdateBedtime={mockOnUpdateBedtime}
        />
      )

      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)

      expect(mockOnUpdateBedtime).toHaveBeenCalledWith(null)
    })

    it('should hide time inputs when no bedtime is selected', () => {
      render(
        <BedtimeCutoffStep
          bedtimeCutoff={null}
          ageGroup="14-16"
          onUpdateBedtime={mockOnUpdateBedtime}
        />
      )

      expect(screen.queryByLabelText('Weekday Bedtime')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Weekend Bedtime')).not.toBeInTheDocument()
    })

    it('should show time inputs when no bedtime is unchecked', () => {
      render(
        <BedtimeCutoffStep
          bedtimeCutoff={null}
          ageGroup="14-16"
          onUpdateBedtime={mockOnUpdateBedtime}
        />
      )

      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox) // Uncheck

      expect(mockOnUpdateBedtime).toHaveBeenCalledWith(
        expect.objectContaining({
          weekday: expect.any(String),
          weekend: expect.any(String),
        })
      )
    })
  })

  describe('null bedtime handling', () => {
    it('should use defaults when bedtime is null but checkbox is unchecked', () => {
      render(
        <BedtimeCutoffStep
          bedtimeCutoff={defaultBedtime}
          ageGroup="8-10"
          onUpdateBedtime={mockOnUpdateBedtime}
        />
      )

      // Should still show the time inputs with defaults
      expect(screen.getByLabelText('Weekday Bedtime')).toHaveValue('21:00')
    })
  })

  describe('accessibility', () => {
    it('should have proper labels on time inputs', () => {
      render(
        <BedtimeCutoffStep
          bedtimeCutoff={defaultBedtime}
          ageGroup="8-10"
          onUpdateBedtime={mockOnUpdateBedtime}
        />
      )

      expect(screen.getByLabelText('Weekday Bedtime')).toBeInTheDocument()
      expect(screen.getByLabelText('Weekend Bedtime')).toBeInTheDocument()
    })

    it('should have minimum touch target size on inputs (NFR49)', () => {
      render(
        <BedtimeCutoffStep
          bedtimeCutoff={defaultBedtime}
          ageGroup="8-10"
          onUpdateBedtime={mockOnUpdateBedtime}
        />
      )

      const weekdayInput = screen.getByLabelText('Weekday Bedtime')
      expect(weekdayInput).toHaveClass('min-h-[44px]')
    })
  })
})
