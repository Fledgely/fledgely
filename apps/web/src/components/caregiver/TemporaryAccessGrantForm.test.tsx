/**
 * Tests for TemporaryAccessGrantForm component.
 *
 * Story 39.3: Temporary Caregiver Access
 *
 * Tests cover:
 * - AC1: Start and end time configurable
 * - AC2: Access presets (today_only, this_weekend, custom)
 * - Form submission and validation
 * - Success/error states
 * - NFR49: 44px minimum touch targets
 * - Accessibility compliance
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import TemporaryAccessGrantForm from './TemporaryAccessGrantForm'

// Mock Firebase Functions
vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(() => mockGrantTemporaryAccess),
}))

// Mock the callable function
const mockGrantTemporaryAccess = vi.fn()

describe('TemporaryAccessGrantForm', () => {
  const defaultProps = {
    familyId: 'family-123',
    caregiverUid: 'caregiver-456',
    caregiverName: 'Grandma',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGrantTemporaryAccess.mockResolvedValue({
      data: {
        success: true,
        grantId: 'grant-789',
        startAt: new Date().toISOString(),
        endAt: new Date(Date.now() + 3600000).toISOString(),
        preset: 'today_only',
        status: 'active',
      },
    })
  })

  describe('Rendering', () => {
    it('renders the container', () => {
      render(<TemporaryAccessGrantForm {...defaultProps} />)

      expect(screen.getByTestId('temporary-access-grant-form')).toBeInTheDocument()
    })

    it('renders the title', () => {
      render(<TemporaryAccessGrantForm {...defaultProps} />)

      expect(screen.getByRole('heading', { name: 'Grant Temporary Access' })).toBeInTheDocument()
    })

    it('displays caregiver name in subtitle', () => {
      render(<TemporaryAccessGrantForm {...defaultProps} />)

      expect(screen.getByText(/Grandma/)).toBeInTheDocument()
    })

    it('renders submit button', () => {
      render(<TemporaryAccessGrantForm {...defaultProps} />)

      expect(screen.getByTestId('submit-button')).toBeInTheDocument()
      expect(screen.getByTestId('submit-button')).toHaveTextContent('Grant Access')
    })

    it('renders cancel button', () => {
      render(<TemporaryAccessGrantForm {...defaultProps} />)

      expect(screen.getByTestId('cancel-button')).toBeInTheDocument()
    })
  })

  describe('Preset Selection (AC2)', () => {
    it('renders today_only preset button', () => {
      render(<TemporaryAccessGrantForm {...defaultProps} />)

      expect(screen.getByTestId('preset-today_only')).toBeInTheDocument()
      expect(screen.getByText('Today Only')).toBeInTheDocument()
    })

    it('renders this_weekend preset button', () => {
      render(<TemporaryAccessGrantForm {...defaultProps} />)

      expect(screen.getByTestId('preset-this_weekend')).toBeInTheDocument()
      expect(screen.getByText('Weekend')).toBeInTheDocument()
    })

    it('renders custom preset button', () => {
      render(<TemporaryAccessGrantForm {...defaultProps} />)

      expect(screen.getByTestId('preset-custom')).toBeInTheDocument()
      expect(screen.getByText('Custom')).toBeInTheDocument()
    })

    it('defaults to today_only preset', () => {
      render(<TemporaryAccessGrantForm {...defaultProps} />)

      const todayButton = screen.getByTestId('preset-today_only')
      expect(todayButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('switches preset when clicked', () => {
      render(<TemporaryAccessGrantForm {...defaultProps} />)

      const weekendButton = screen.getByTestId('preset-this_weekend')
      fireEvent.click(weekendButton)

      expect(weekendButton).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByTestId('preset-today_only')).toHaveAttribute('aria-pressed', 'false')
    })
  })

  describe('Custom Date Selection (AC1)', () => {
    it('shows custom date inputs when custom preset selected', () => {
      render(<TemporaryAccessGrantForm {...defaultProps} />)

      fireEvent.click(screen.getByTestId('preset-custom'))

      expect(screen.getByTestId('custom-date-section')).toBeInTheDocument()
      expect(screen.getByTestId('custom-start-input')).toBeInTheDocument()
      expect(screen.getByTestId('custom-end-input')).toBeInTheDocument()
    })

    it('hides custom date inputs when non-custom preset selected', () => {
      render(<TemporaryAccessGrantForm {...defaultProps} />)

      fireEvent.click(screen.getByTestId('preset-custom'))
      expect(screen.getByTestId('custom-date-section')).toBeInTheDocument()

      fireEvent.click(screen.getByTestId('preset-today_only'))
      expect(screen.queryByTestId('custom-date-section')).not.toBeInTheDocument()
    })

    it('shows error when end time before start time', () => {
      render(<TemporaryAccessGrantForm {...defaultProps} />)

      fireEvent.click(screen.getByTestId('preset-custom'))

      const startInput = screen.getByTestId('custom-start-input')
      const endInput = screen.getByTestId('custom-end-input')

      // Set end before start
      fireEvent.change(startInput, { target: { value: '2026-01-05T18:00' } })
      fireEvent.change(endInput, { target: { value: '2026-01-05T10:00' } })

      expect(screen.getByTestId('custom-date-error')).toBeInTheDocument()
      expect(screen.getByText('End time must be after start time')).toBeInTheDocument()
    })
  })

  describe('Duration Preview', () => {
    it('displays duration preview for today_only preset', () => {
      render(<TemporaryAccessGrantForm {...defaultProps} />)

      expect(screen.getByTestId('duration-preview')).toBeInTheDocument()
      expect(screen.getByText(/Duration:/)).toBeInTheDocument()
    })

    it('displays duration preview for this_weekend preset', () => {
      render(<TemporaryAccessGrantForm {...defaultProps} />)

      fireEvent.click(screen.getByTestId('preset-this_weekend'))

      expect(screen.getByTestId('duration-preview')).toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    it('calls grantTemporaryAccess on submit with today_only preset', async () => {
      render(<TemporaryAccessGrantForm {...defaultProps} />)

      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(mockGrantTemporaryAccess).toHaveBeenCalledWith(
          expect.objectContaining({
            familyId: 'family-123',
            caregiverUid: 'caregiver-456',
            preset: 'today_only',
            timezone: expect.any(String),
          })
        )
      })
    })

    it('calls grantTemporaryAccess with this_weekend preset', async () => {
      render(<TemporaryAccessGrantForm {...defaultProps} />)

      fireEvent.click(screen.getByTestId('preset-this_weekend'))
      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(mockGrantTemporaryAccess).toHaveBeenCalledWith(
          expect.objectContaining({
            preset: 'this_weekend',
          })
        )
      })
    })

    it('shows success state after successful submission', async () => {
      render(<TemporaryAccessGrantForm {...defaultProps} />)

      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(screen.getByText('Access Granted!')).toBeInTheDocument()
      })
    })

    it('calls onSuccess callback with grant details', async () => {
      const onSuccess = vi.fn()
      render(<TemporaryAccessGrantForm {...defaultProps} onSuccess={onSuccess} />)

      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            grantId: 'grant-789',
          })
        )
      })
    })

    it('shows error message on failed submission', async () => {
      mockGrantTemporaryAccess.mockRejectedValue(new Error('Network error'))

      render(<TemporaryAccessGrantForm {...defaultProps} />)

      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('form-error')).toBeInTheDocument()
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    it('disables submit button while submitting', async () => {
      mockGrantTemporaryAccess.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  data: { success: true, grantId: 'grant-789', status: 'active' },
                }),
              100
            )
          )
      )

      render(<TemporaryAccessGrantForm {...defaultProps} />)

      fireEvent.click(screen.getByTestId('submit-button'))

      expect(screen.getByTestId('submit-button')).toBeDisabled()
      expect(screen.getByTestId('submit-button')).toHaveTextContent('Granting...')

      await waitFor(() => {
        expect(screen.getByText('Access Granted!')).toBeInTheDocument()
      })
    })
  })

  describe('Cancel Button', () => {
    it('calls onCancel when clicked', () => {
      const onCancel = vi.fn()
      render(<TemporaryAccessGrantForm {...defaultProps} onCancel={onCancel} />)

      fireEvent.click(screen.getByTestId('cancel-button'))

      expect(onCancel).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('preset buttons have aria-pressed attribute', () => {
      render(<TemporaryAccessGrantForm {...defaultProps} />)

      const presets = ['preset-today_only', 'preset-this_weekend', 'preset-custom']
      presets.forEach((preset) => {
        expect(screen.getByTestId(preset)).toHaveAttribute('aria-pressed')
      })
    })

    it('error message has role="alert"', async () => {
      mockGrantTemporaryAccess.mockRejectedValue(new Error('Error'))

      render(<TemporaryAccessGrantForm {...defaultProps} />)

      fireEvent.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })

    it('custom date error has role="alert"', () => {
      render(<TemporaryAccessGrantForm {...defaultProps} />)

      fireEvent.click(screen.getByTestId('preset-custom'))

      const startInput = screen.getByTestId('custom-start-input')
      const endInput = screen.getByTestId('custom-end-input')

      fireEvent.change(startInput, { target: { value: '2026-01-05T18:00' } })
      fireEvent.change(endInput, { target: { value: '2026-01-05T10:00' } })

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('custom date inputs have labels', () => {
      render(<TemporaryAccessGrantForm {...defaultProps} />)

      fireEvent.click(screen.getByTestId('preset-custom'))

      expect(screen.getByLabelText('Start')).toBeInTheDocument()
      expect(screen.getByLabelText('End')).toBeInTheDocument()
    })
  })

  describe('Touch Targets (NFR49)', () => {
    it('submit button has min-height of 48px', () => {
      render(<TemporaryAccessGrantForm {...defaultProps} />)

      const submitButton = screen.getByTestId('submit-button')
      expect(submitButton).toHaveStyle({ minHeight: '48px' })
    })

    it('cancel button has min-height of 48px', () => {
      render(<TemporaryAccessGrantForm {...defaultProps} />)

      const cancelButton = screen.getByTestId('cancel-button')
      expect(cancelButton).toHaveStyle({ minHeight: '48px' })
    })

    it('preset buttons have min-height of 80px', () => {
      render(<TemporaryAccessGrantForm {...defaultProps} />)

      const presetButton = screen.getByTestId('preset-today_only')
      expect(presetButton).toHaveStyle({ minHeight: '80px' })
    })
  })

  describe('Validation', () => {
    it('disables submit for custom preset without valid dates', () => {
      render(<TemporaryAccessGrantForm {...defaultProps} />)

      fireEvent.click(screen.getByTestId('preset-custom'))

      // Clear the default values
      const startInput = screen.getByTestId('custom-start-input')
      const endInput = screen.getByTestId('custom-end-input')

      fireEvent.change(startInput, { target: { value: '' } })
      fireEvent.change(endInput, { target: { value: '' } })

      // Submit should be disabled when dates are empty/invalid
      expect(screen.getByTestId('submit-button')).toBeDisabled()
    })

    it('shows duration error for less than 1 hour', () => {
      render(<TemporaryAccessGrantForm {...defaultProps} />)

      fireEvent.click(screen.getByTestId('preset-custom'))

      const now = new Date()
      const start = new Date(now)
      const end = new Date(now)
      end.setMinutes(end.getMinutes() + 30) // 30 minutes - less than 1 hour

      const startInput = screen.getByTestId('custom-start-input')
      const endInput = screen.getByTestId('custom-end-input')

      fireEvent.change(startInput, {
        target: { value: start.toISOString().slice(0, 16) },
      })
      fireEvent.change(endInput, {
        target: { value: end.toISOString().slice(0, 16) },
      })

      expect(screen.getByTestId('custom-date-error')).toBeInTheDocument()
      expect(screen.getByText(/at least 1 hour/)).toBeInTheDocument()
    })
  })
})
