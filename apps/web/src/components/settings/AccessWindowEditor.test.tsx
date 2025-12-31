/**
 * AccessWindowEditor Component Tests - Story 19D.4
 *
 * Tests for the parent access window configuration UI.
 *
 * Story 19D.4 Acceptance Criteria:
 * - AC1: Parent can set access windows (e.g., Saturday 2-6pm)
 *
 * @vitest-environment jsdom
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AccessWindowEditor } from './AccessWindowEditor'
import type { AccessWindow } from '@fledgely/shared'

describe('AccessWindowEditor', () => {
  const mockOnChange = vi.fn()

  const defaultProps = {
    accessWindows: [],
    onChange: mockOnChange,
  }

  const sampleWindow: AccessWindow = {
    dayOfWeek: 'saturday',
    startTime: '14:00',
    endTime: '18:00',
    timezone: 'America/New_York',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic rendering', () => {
    it('renders the component', () => {
      render(<AccessWindowEditor {...defaultProps} />)

      expect(screen.getByTestId('access-window-editor')).toBeInTheDocument()
    })

    it('displays header with title', () => {
      render(<AccessWindowEditor {...defaultProps} />)

      expect(screen.getByText('Access Windows')).toBeInTheDocument()
    })

    it('shows add button when no windows and not editing', () => {
      render(<AccessWindowEditor {...defaultProps} />)

      expect(screen.getByTestId('add-window-button')).toBeInTheDocument()
    })

    it('shows empty state message when no windows', () => {
      render(<AccessWindowEditor {...defaultProps} />)

      expect(screen.getByTestId('no-windows-message')).toBeInTheDocument()
      expect(screen.getByText(/No access windows set/)).toBeInTheDocument()
    })
  })

  describe('Displaying existing windows', () => {
    it('displays existing windows', () => {
      render(<AccessWindowEditor {...defaultProps} accessWindows={[sampleWindow]} />)

      expect(screen.getByTestId('window-item-0')).toBeInTheDocument()
      expect(screen.getByText(/Saturday 2:00 PM - 6:00 PM/)).toBeInTheDocument()
    })

    it('displays multiple windows', () => {
      const windows: AccessWindow[] = [
        sampleWindow,
        { dayOfWeek: 'sunday', startTime: '10:00', endTime: '14:00', timezone: 'America/New_York' },
      ]

      render(<AccessWindowEditor {...defaultProps} accessWindows={windows} />)

      expect(screen.getByTestId('window-item-0')).toBeInTheDocument()
      expect(screen.getByTestId('window-item-1')).toBeInTheDocument()
    })

    it('shows edit button for each window', () => {
      render(<AccessWindowEditor {...defaultProps} accessWindows={[sampleWindow]} />)

      expect(screen.getByTestId('edit-window-0')).toBeInTheDocument()
    })

    it('shows remove button for each window', () => {
      render(<AccessWindowEditor {...defaultProps} accessWindows={[sampleWindow]} />)

      expect(screen.getByTestId('remove-window-0')).toBeInTheDocument()
    })
  })

  describe('Adding windows (AC1)', () => {
    it('opens add form when add button clicked', () => {
      render(<AccessWindowEditor {...defaultProps} />)

      fireEvent.click(screen.getByTestId('add-window-button'))

      expect(screen.getByTestId('window-edit-form')).toBeInTheDocument()
    })

    it('shows day selector in add form', () => {
      render(<AccessWindowEditor {...defaultProps} />)

      fireEvent.click(screen.getByTestId('add-window-button'))

      expect(screen.getByTestId('window-day-select')).toBeInTheDocument()
    })

    it('shows start time selector in add form', () => {
      render(<AccessWindowEditor {...defaultProps} />)

      fireEvent.click(screen.getByTestId('add-window-button'))

      expect(screen.getByTestId('window-start-select')).toBeInTheDocument()
    })

    it('shows end time selector in add form', () => {
      render(<AccessWindowEditor {...defaultProps} />)

      fireEvent.click(screen.getByTestId('add-window-button'))

      expect(screen.getByTestId('window-end-select')).toBeInTheDocument()
    })

    it('adds new window when save clicked', () => {
      render(<AccessWindowEditor {...defaultProps} />)

      fireEvent.click(screen.getByTestId('add-window-button'))
      fireEvent.click(screen.getByTestId('save-window-button'))

      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          dayOfWeek: 'saturday',
          startTime: '14:00',
          endTime: '18:00',
        }),
      ])
    })

    it('closes form after adding window', () => {
      render(<AccessWindowEditor {...defaultProps} />)

      fireEvent.click(screen.getByTestId('add-window-button'))
      fireEvent.click(screen.getByTestId('save-window-button'))

      expect(screen.queryByTestId('window-edit-form')).not.toBeInTheDocument()
    })
  })

  describe('Editing windows', () => {
    it('opens edit form when edit button clicked', () => {
      render(<AccessWindowEditor {...defaultProps} accessWindows={[sampleWindow]} />)

      fireEvent.click(screen.getByTestId('edit-window-0'))

      expect(screen.getByTestId('window-edit-form')).toBeInTheDocument()
    })

    it('updates window when save clicked', () => {
      render(<AccessWindowEditor {...defaultProps} accessWindows={[sampleWindow]} />)

      fireEvent.click(screen.getByTestId('edit-window-0'))
      fireEvent.change(screen.getByTestId('window-day-select'), { target: { value: 'sunday' } })
      fireEvent.click(screen.getByTestId('save-window-button'))

      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          dayOfWeek: 'sunday',
        }),
      ])
    })
  })

  describe('Removing windows', () => {
    it('removes window when remove button clicked', () => {
      render(<AccessWindowEditor {...defaultProps} accessWindows={[sampleWindow]} />)

      fireEvent.click(screen.getByTestId('remove-window-0'))

      expect(mockOnChange).toHaveBeenCalledWith([])
    })

    it('removes correct window from multiple', () => {
      const windows: AccessWindow[] = [
        sampleWindow,
        { dayOfWeek: 'sunday', startTime: '10:00', endTime: '14:00', timezone: 'America/New_York' },
      ]

      render(<AccessWindowEditor {...defaultProps} accessWindows={windows} />)

      fireEvent.click(screen.getByTestId('remove-window-0'))

      expect(mockOnChange).toHaveBeenCalledWith([windows[1]])
    })
  })

  describe('Validation', () => {
    it('shows error when end time is before start time', () => {
      render(<AccessWindowEditor {...defaultProps} />)

      fireEvent.click(screen.getByTestId('add-window-button'))
      fireEvent.change(screen.getByTestId('window-start-select'), { target: { value: '18:00' } })
      fireEvent.change(screen.getByTestId('window-end-select'), { target: { value: '14:00' } })
      fireEvent.click(screen.getByTestId('save-window-button'))

      expect(screen.getByTestId('window-error')).toBeInTheDocument()
      expect(screen.getByText(/End time must be after start time/)).toBeInTheDocument()
    })

    it('does not call onChange when validation fails', () => {
      render(<AccessWindowEditor {...defaultProps} />)

      fireEvent.click(screen.getByTestId('add-window-button'))
      fireEvent.change(screen.getByTestId('window-start-select'), { target: { value: '18:00' } })
      fireEvent.change(screen.getByTestId('window-end-select'), { target: { value: '14:00' } })
      fireEvent.click(screen.getByTestId('save-window-button'))

      expect(mockOnChange).not.toHaveBeenCalled()
    })
  })

  describe('Cancel behavior', () => {
    it('closes form when cancel clicked', () => {
      render(<AccessWindowEditor {...defaultProps} />)

      fireEvent.click(screen.getByTestId('add-window-button'))
      fireEvent.click(screen.getByTestId('cancel-window-button'))

      expect(screen.queryByTestId('window-edit-form')).not.toBeInTheDocument()
    })

    it('does not add window when cancelled', () => {
      render(<AccessWindowEditor {...defaultProps} />)

      fireEvent.click(screen.getByTestId('add-window-button'))
      fireEvent.click(screen.getByTestId('cancel-window-button'))

      expect(mockOnChange).not.toHaveBeenCalled()
    })
  })

  describe('Max windows limit', () => {
    it('disables add button when max windows reached', () => {
      const windows: AccessWindow[] = Array(7)
        .fill(null)
        .map((_, i) => ({
          dayOfWeek: (
            ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
          )[i],
          startTime: '14:00',
          endTime: '18:00',
          timezone: 'America/New_York',
        }))

      render(<AccessWindowEditor {...defaultProps} accessWindows={windows} maxWindows={7} />)

      expect(screen.getByTestId('add-window-button')).toBeDisabled()
    })
  })

  describe('Disabled state', () => {
    it('disables add button when disabled', () => {
      render(<AccessWindowEditor {...defaultProps} disabled />)

      expect(screen.getByTestId('add-window-button')).toBeDisabled()
    })

    it('disables edit buttons when disabled', () => {
      render(<AccessWindowEditor {...defaultProps} accessWindows={[sampleWindow]} disabled />)

      expect(screen.getByTestId('edit-window-0')).toBeDisabled()
    })

    it('disables remove buttons when disabled', () => {
      render(<AccessWindowEditor {...defaultProps} accessWindows={[sampleWindow]} disabled />)

      expect(screen.getByTestId('remove-window-0')).toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    it('has accessible label for add button', () => {
      render(<AccessWindowEditor {...defaultProps} />)

      expect(screen.getByTestId('add-window-button')).toHaveAttribute(
        'aria-label',
        'Add access window'
      )
    })

    it('has accessible labels for edit buttons', () => {
      render(<AccessWindowEditor {...defaultProps} accessWindows={[sampleWindow]} />)

      expect(screen.getByTestId('edit-window-0')).toHaveAttribute(
        'aria-label',
        expect.stringContaining('Edit')
      )
    })

    it('has accessible labels for remove buttons', () => {
      render(<AccessWindowEditor {...defaultProps} accessWindows={[sampleWindow]} />)

      expect(screen.getByTestId('remove-window-0')).toHaveAttribute(
        'aria-label',
        expect.stringContaining('Remove')
      )
    })

    it('error has alert role', () => {
      render(<AccessWindowEditor {...defaultProps} />)

      fireEvent.click(screen.getByTestId('add-window-button'))
      fireEvent.change(screen.getByTestId('window-start-select'), { target: { value: '18:00' } })
      fireEvent.change(screen.getByTestId('window-end-select'), { target: { value: '14:00' } })
      fireEvent.click(screen.getByTestId('save-window-button'))

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })
})
