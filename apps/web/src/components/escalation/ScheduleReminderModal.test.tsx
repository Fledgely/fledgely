/**
 * ScheduleReminderModal Component Tests - Story 34.5.4 Task 5
 *
 * Tests for the schedule reminder modal component.
 * AC4: Meeting Reminder (Optional)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ScheduleReminderModal } from './ScheduleReminderModal'

describe('ScheduleReminderModal - Story 34.5.4', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSchedule: vi.fn(),
    isScheduling: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // Modal Visibility Tests
  // ============================================

  describe('Modal Visibility', () => {
    it('should render when isOpen is true', () => {
      render(<ScheduleReminderModal {...defaultProps} />)

      expect(screen.getByTestId('schedule-reminder-modal')).toBeInTheDocument()
    })

    it('should not render when isOpen is false', () => {
      render(<ScheduleReminderModal {...defaultProps} isOpen={false} />)

      expect(screen.queryByTestId('schedule-reminder-modal')).not.toBeInTheDocument()
    })

    it('should call onClose when close button is clicked', () => {
      render(<ScheduleReminderModal {...defaultProps} />)

      fireEvent.click(screen.getByTestId('schedule-modal-close'))

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
    })

    it('should call onClose when backdrop is clicked', () => {
      render(<ScheduleReminderModal {...defaultProps} />)

      fireEvent.click(screen.getByTestId('schedule-modal-backdrop'))

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
    })
  })

  // ============================================
  // Date/Time Selection Tests
  // ============================================

  describe('Date/Time Selection', () => {
    it('should display date input', () => {
      render(<ScheduleReminderModal {...defaultProps} />)

      expect(screen.getByTestId('schedule-date-input')).toBeInTheDocument()
    })

    it('should display time input', () => {
      render(<ScheduleReminderModal {...defaultProps} />)

      expect(screen.getByTestId('schedule-time-input')).toBeInTheDocument()
    })

    it('should have default date set to tomorrow', () => {
      render(<ScheduleReminderModal {...defaultProps} />)

      const dateInput = screen.getByTestId('schedule-date-input') as HTMLInputElement
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const expectedDate = tomorrow.toISOString().split('T')[0]

      expect(dateInput.value).toBe(expectedDate)
    })

    it('should allow changing date', () => {
      render(<ScheduleReminderModal {...defaultProps} />)

      const dateInput = screen.getByTestId('schedule-date-input')
      fireEvent.change(dateInput, { target: { value: '2024-01-20' } })

      expect((dateInput as HTMLInputElement).value).toBe('2024-01-20')
    })

    it('should allow changing time', () => {
      render(<ScheduleReminderModal {...defaultProps} />)

      const timeInput = screen.getByTestId('schedule-time-input')
      fireEvent.change(timeInput, { target: { value: '19:00' } })

      expect((timeInput as HTMLInputElement).value).toBe('19:00')
    })
  })

  // ============================================
  // Submit Button Tests
  // ============================================

  describe('Submit Button', () => {
    it('should display schedule button', () => {
      render(<ScheduleReminderModal {...defaultProps} />)

      expect(screen.getByTestId('schedule-submit-button')).toBeInTheDocument()
    })

    it('should call onSchedule with Date when submitted', () => {
      render(<ScheduleReminderModal {...defaultProps} />)

      const dateInput = screen.getByTestId('schedule-date-input')
      const timeInput = screen.getByTestId('schedule-time-input')

      fireEvent.change(dateInput, { target: { value: '2024-01-20' } })
      fireEvent.change(timeInput, { target: { value: '18:00' } })

      fireEvent.click(screen.getByTestId('schedule-submit-button'))

      expect(defaultProps.onSchedule).toHaveBeenCalledWith(expect.any(Date))
    })

    it('should disable button when isScheduling is true', () => {
      render(<ScheduleReminderModal {...defaultProps} isScheduling={true} />)

      expect(screen.getByTestId('schedule-submit-button')).toBeDisabled()
    })

    it('should show loading text when isScheduling is true', () => {
      render(<ScheduleReminderModal {...defaultProps} isScheduling={true} />)

      expect(screen.getByTestId('schedule-submit-button').textContent).toContain('Scheduling')
    })
  })

  // ============================================
  // Cancel Button Tests
  // ============================================

  describe('Cancel Button', () => {
    it('should display cancel button', () => {
      render(<ScheduleReminderModal {...defaultProps} />)

      expect(screen.getByTestId('schedule-cancel-button')).toBeInTheDocument()
    })

    it('should call onClose when cancel is clicked', () => {
      render(<ScheduleReminderModal {...defaultProps} />)

      fireEvent.click(screen.getByTestId('schedule-cancel-button'))

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
    })
  })

  // ============================================
  // Messaging Tests
  // ============================================

  describe('Messaging', () => {
    it('should display supportive header', () => {
      render(<ScheduleReminderModal {...defaultProps} />)

      const header = screen.getByTestId('schedule-modal-header')
      expect(header.textContent).toMatch(/family|meeting|conversation/i)
    })

    it('should display encouraging message', () => {
      render(<ScheduleReminderModal {...defaultProps} />)

      const modal = screen.getByTestId('schedule-reminder-modal')
      expect(modal.textContent).toMatch(/good|ready|time/i)
    })
  })

  // ============================================
  // Accessibility Tests
  // ============================================

  describe('Accessibility', () => {
    it('should have proper modal role', () => {
      render(<ScheduleReminderModal {...defaultProps} />)

      const modal = screen.getByTestId('schedule-reminder-modal')
      expect(modal.getAttribute('role')).toBe('dialog')
    })

    it('should have aria-modal attribute', () => {
      render(<ScheduleReminderModal {...defaultProps} />)

      const modal = screen.getByTestId('schedule-reminder-modal')
      expect(modal.getAttribute('aria-modal')).toBe('true')
    })

    it('should have label for date input', () => {
      render(<ScheduleReminderModal {...defaultProps} />)

      expect(screen.getByLabelText(/date/i)).toBeInTheDocument()
    })

    it('should have label for time input', () => {
      render(<ScheduleReminderModal {...defaultProps} />)

      expect(screen.getByLabelText(/time/i)).toBeInTheDocument()
    })
  })
})
