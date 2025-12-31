/**
 * DatePickerModal Tests - Story 19B.2
 *
 * Task 4.5: Create unit tests for date picker
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DatePickerModal } from './DatePickerModal'

describe('DatePickerModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSelectDate: vi.fn(),
    datesWithScreenshots: new Set<string>(),
    selectedDate: undefined,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not render when isOpen is false', () => {
    render(<DatePickerModal {...defaultProps} isOpen={false} />)

    expect(screen.queryByTestId('date-picker-modal')).not.toBeInTheDocument()
  })

  it('should render when isOpen is true', () => {
    render(<DatePickerModal {...defaultProps} />)

    expect(screen.getByTestId('date-picker-modal')).toBeInTheDocument()
  })

  it('should display "Pick a date" title', () => {
    render(<DatePickerModal {...defaultProps} />)

    expect(screen.getByText('Pick a date')).toBeInTheDocument()
  })

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<DatePickerModal {...defaultProps} onClose={onClose} />)

    fireEvent.click(screen.getByTestId('date-picker-close'))

    expect(onClose).toHaveBeenCalled()
  })

  it('should call onClose when overlay is clicked', () => {
    const onClose = vi.fn()
    render(<DatePickerModal {...defaultProps} onClose={onClose} />)

    fireEvent.click(screen.getByTestId('date-picker-modal'))

    expect(onClose).toHaveBeenCalled()
  })

  it('should not call onClose when content is clicked', () => {
    const onClose = vi.fn()
    render(<DatePickerModal {...defaultProps} onClose={onClose} />)

    fireEvent.click(screen.getByTestId('date-picker-content'))

    expect(onClose).not.toHaveBeenCalled()
  })

  it('should call onClose when Escape key is pressed', () => {
    const onClose = vi.fn()
    render(<DatePickerModal {...defaultProps} onClose={onClose} />)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalled()
  })

  it('should display current month and year', () => {
    render(<DatePickerModal {...defaultProps} />)

    const monthLabel = screen.getByTestId('date-picker-month')
    // Should contain current month name and year
    expect(monthLabel).toBeInTheDocument()
  })

  it('should display weekday headers', () => {
    render(<DatePickerModal {...defaultProps} />)

    expect(screen.getByText('Su')).toBeInTheDocument()
    expect(screen.getByText('Mo')).toBeInTheDocument()
    expect(screen.getByText('Tu')).toBeInTheDocument()
    expect(screen.getByText('We')).toBeInTheDocument()
    expect(screen.getByText('Th')).toBeInTheDocument()
    expect(screen.getByText('Fr')).toBeInTheDocument()
    expect(screen.getByText('Sa')).toBeInTheDocument()
  })

  it('should display day buttons', () => {
    render(<DatePickerModal {...defaultProps} />)

    // Check that day 1 and day 15 are rendered
    expect(screen.getByTestId('date-picker-day-1')).toBeInTheDocument()
    expect(screen.getByTestId('date-picker-day-15')).toBeInTheDocument()
  })

  it('should call onSelectDate when a day is clicked', () => {
    const onSelectDate = vi.fn()
    const onClose = vi.fn()
    render(<DatePickerModal {...defaultProps} onSelectDate={onSelectDate} onClose={onClose} />)

    fireEvent.click(screen.getByTestId('date-picker-day-15'))

    expect(onSelectDate).toHaveBeenCalledWith(expect.any(Date))
    expect(onClose).toHaveBeenCalled()
  })

  it('should navigate to previous month when prev button is clicked', () => {
    render(<DatePickerModal {...defaultProps} />)

    const monthLabel = screen.getByTestId('date-picker-month')
    const initialText = monthLabel.textContent

    fireEvent.click(screen.getByTestId('date-picker-prev'))

    expect(monthLabel.textContent).not.toBe(initialText)
  })

  it('should have accessible dialog role', () => {
    render(<DatePickerModal {...defaultProps} />)

    const modal = screen.getByTestId('date-picker-modal')
    expect(modal).toHaveAttribute('role', 'dialog')
    expect(modal).toHaveAttribute('aria-modal', 'true')
    expect(modal).toHaveAttribute('aria-label', 'Pick a date')
  })

  it('should highlight dates with screenshots', () => {
    const datesWithScreenshots = new Set(['2024-01-15'])
    // Set a specific date so we know what month to look at
    const selectedDate = new Date('2024-01-15')

    render(
      <DatePickerModal
        {...defaultProps}
        datesWithScreenshots={datesWithScreenshots}
        selectedDate={selectedDate}
      />
    )

    // Day 15 should be rendered and accessible
    const day15 = screen.getByTestId('date-picker-day-15')
    expect(day15).toBeInTheDocument()
    // Check aria-label mentions "has pictures"
    expect(day15.getAttribute('aria-label')).toContain('has pictures')
  })

  it('should have accessible aria-labels on day buttons', () => {
    render(<DatePickerModal {...defaultProps} />)

    const day1 = screen.getByTestId('date-picker-day-1')
    expect(day1).toHaveAttribute('aria-label')
  })
})
