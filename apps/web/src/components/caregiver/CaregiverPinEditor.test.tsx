/**
 * Tests for CaregiverPinEditor component.
 *
 * Story 39.4: Caregiver PIN for Time Extension
 *
 * Tests cover:
 * - AC1: PIN setup by parent (4-6 digits)
 * - AC3: Extension limits configurable
 * - Component rendering
 * - NFR49: 44px minimum touch targets
 * - Accessibility compliance
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CaregiverPinEditor from './CaregiverPinEditor'

// Mock Firebase Functions
vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(() => mockSetCaregiverPin),
}))

// Mock the callable function
const mockSetCaregiverPin = vi.fn()

describe('CaregiverPinEditor', () => {
  const defaultProps = {
    familyId: 'family-123',
    caregiverUid: 'caregiver-456',
    caregiverName: 'Grandma',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockSetCaregiverPin.mockResolvedValue({
      data: {
        success: true,
        extensionLimits: { maxDurationMinutes: 30, maxDailyExtensions: 1 },
      },
    })
  })

  describe('Rendering', () => {
    it('renders the container', () => {
      render(<CaregiverPinEditor {...defaultProps} />)

      expect(screen.getByTestId('caregiver-pin-editor')).toBeInTheDocument()
    })

    it('renders the title for new PIN', () => {
      render(<CaregiverPinEditor {...defaultProps} />)

      expect(screen.getByRole('heading', { name: 'Set PIN' })).toBeInTheDocument()
    })

    it('renders the title for updating PIN', () => {
      render(<CaregiverPinEditor {...defaultProps} hasPinConfigured />)

      expect(screen.getByRole('heading', { name: 'Update PIN' })).toBeInTheDocument()
    })

    it('displays caregiver name in subtitle', () => {
      render(<CaregiverPinEditor {...defaultProps} />)

      expect(screen.getByText('Grandma')).toBeInTheDocument()
    })

    it('displays description for new PIN', () => {
      render(<CaregiverPinEditor {...defaultProps} />)

      expect(
        screen.getByText(/Create a PIN for Grandma to approve time extensions/)
      ).toBeInTheDocument()
    })

    it('displays description for updating PIN', () => {
      render(<CaregiverPinEditor {...defaultProps} hasPinConfigured />)

      expect(
        screen.getByText(/Change Grandma's PIN for approving time extensions/)
      ).toBeInTheDocument()
    })

    it('renders save button with correct text for new PIN', () => {
      render(<CaregiverPinEditor {...defaultProps} />)

      expect(screen.getByTestId('save-button')).toHaveTextContent('Set PIN')
    })

    it('renders save button with correct text for update', () => {
      render(<CaregiverPinEditor {...defaultProps} hasPinConfigured />)

      expect(screen.getByTestId('save-button')).toHaveTextContent('Update PIN')
    })
  })

  describe('PIN Length Selection (AC1)', () => {
    it('renders PIN length select', () => {
      render(<CaregiverPinEditor {...defaultProps} />)

      expect(screen.getByTestId('pin-length-select')).toBeInTheDocument()
    })

    it('defaults to 4 digit PIN', () => {
      render(<CaregiverPinEditor {...defaultProps} />)

      expect(screen.getByTestId('pin-length-select')).toHaveValue('4')
      // Should show 4 PIN inputs
      expect(screen.getByTestId('pin-digit-0')).toBeInTheDocument()
      expect(screen.getByTestId('pin-digit-1')).toBeInTheDocument()
      expect(screen.getByTestId('pin-digit-2')).toBeInTheDocument()
      expect(screen.getByTestId('pin-digit-3')).toBeInTheDocument()
    })

    it('can select 5 digit PIN', () => {
      render(<CaregiverPinEditor {...defaultProps} />)

      fireEvent.change(screen.getByTestId('pin-length-select'), { target: { value: '5' } })

      expect(screen.getByTestId('pin-length-select')).toHaveValue('5')
      expect(screen.getByTestId('pin-digit-4')).toBeInTheDocument()
    })

    it('can select 6 digit PIN', () => {
      render(<CaregiverPinEditor {...defaultProps} />)

      fireEvent.change(screen.getByTestId('pin-length-select'), { target: { value: '6' } })

      expect(screen.getByTestId('pin-length-select')).toHaveValue('6')
      expect(screen.getByTestId('pin-digit-5')).toBeInTheDocument()
    })
  })

  describe('PIN Entry (AC1)', () => {
    it('renders PIN input fields', () => {
      render(<CaregiverPinEditor {...defaultProps} />)

      expect(screen.getByTestId('pin-input-container')).toBeInTheDocument()
    })

    it('renders confirm PIN input fields', () => {
      render(<CaregiverPinEditor {...defaultProps} />)

      expect(screen.getByTestId('confirm-pin-input-container')).toBeInTheDocument()
    })

    it('allows entering digits', () => {
      render(<CaregiverPinEditor {...defaultProps} />)

      fireEvent.change(screen.getByTestId('pin-digit-0'), { target: { value: '1' } })

      expect(screen.getByTestId('pin-digit-0')).toHaveValue('1')
    })

    it('supports paste', () => {
      render(<CaregiverPinEditor {...defaultProps} />)

      const input = screen.getByTestId('pin-digit-0')
      fireEvent.paste(input, {
        clipboardData: { getData: () => '1234' },
      })

      expect(screen.getByTestId('pin-digit-0')).toHaveValue('1')
      expect(screen.getByTestId('pin-digit-1')).toHaveValue('2')
      expect(screen.getByTestId('pin-digit-2')).toHaveValue('3')
      expect(screen.getByTestId('pin-digit-3')).toHaveValue('4')
    })

    it('filters non-digits on paste', () => {
      render(<CaregiverPinEditor {...defaultProps} />)

      const input = screen.getByTestId('pin-digit-0')
      fireEvent.paste(input, {
        clipboardData: { getData: () => '1a2b3c4d' },
      })

      expect(screen.getByTestId('pin-digit-0')).toHaveValue('1')
      expect(screen.getByTestId('pin-digit-1')).toHaveValue('2')
      expect(screen.getByTestId('pin-digit-2')).toHaveValue('3')
      expect(screen.getByTestId('pin-digit-3')).toHaveValue('4')
    })
  })

  describe('Extension Limits (AC3)', () => {
    it('renders max duration select', () => {
      render(<CaregiverPinEditor {...defaultProps} />)

      expect(screen.getByTestId('max-duration-select')).toBeInTheDocument()
    })

    it('renders max daily select', () => {
      render(<CaregiverPinEditor {...defaultProps} />)

      expect(screen.getByTestId('max-daily-select')).toBeInTheDocument()
    })

    it('defaults to 30 minutes max duration', () => {
      render(<CaregiverPinEditor {...defaultProps} />)

      expect(screen.getByTestId('max-duration-select')).toHaveValue('30')
    })

    it('defaults to 1 per day', () => {
      render(<CaregiverPinEditor {...defaultProps} />)

      expect(screen.getByTestId('max-daily-select')).toHaveValue('1')
    })

    it('uses provided current limits', () => {
      render(
        <CaregiverPinEditor
          {...defaultProps}
          currentLimits={{ maxDurationMinutes: 60, maxDailyExtensions: 3 }}
        />
      )

      expect(screen.getByTestId('max-duration-select')).toHaveValue('60')
      expect(screen.getByTestId('max-daily-select')).toHaveValue('3')
    })

    it('can change max duration', () => {
      render(<CaregiverPinEditor {...defaultProps} />)

      fireEvent.change(screen.getByTestId('max-duration-select'), { target: { value: '120' } })

      expect(screen.getByTestId('max-duration-select')).toHaveValue('120')
    })

    it('can change max daily extensions', () => {
      render(<CaregiverPinEditor {...defaultProps} />)

      fireEvent.change(screen.getByTestId('max-daily-select'), { target: { value: '5' } })

      expect(screen.getByTestId('max-daily-select')).toHaveValue('5')
    })
  })

  describe('Save Button State', () => {
    it('disables save button until PIN is complete', () => {
      render(<CaregiverPinEditor {...defaultProps} />)

      expect(screen.getByTestId('save-button')).toBeDisabled()
    })

    it('save button exists', () => {
      render(<CaregiverPinEditor {...defaultProps} />)

      expect(screen.getByTestId('save-button')).toBeInTheDocument()
    })
  })

  describe('Cancel Button', () => {
    it('renders cancel button when onCancel provided', () => {
      const onCancel = vi.fn()
      render(<CaregiverPinEditor {...defaultProps} onCancel={onCancel} />)

      expect(screen.getByTestId('cancel-button')).toBeInTheDocument()
    })

    it('does not render cancel button when onCancel not provided', () => {
      render(<CaregiverPinEditor {...defaultProps} />)

      expect(screen.queryByTestId('cancel-button')).not.toBeInTheDocument()
    })

    it('calls onCancel when clicked', () => {
      const onCancel = vi.fn()
      render(<CaregiverPinEditor {...defaultProps} onCancel={onCancel} />)

      fireEvent.click(screen.getByTestId('cancel-button'))

      expect(onCancel).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('PIN inputs have aria-label', () => {
      render(<CaregiverPinEditor {...defaultProps} />)

      expect(screen.getByLabelText('PIN digit 1')).toBeInTheDocument()
      expect(screen.getByLabelText('PIN digit 2')).toBeInTheDocument()
      expect(screen.getByLabelText('Confirm PIN digit 1')).toBeInTheDocument()
    })

    it('icon is hidden from screen readers', () => {
      const { container } = render(<CaregiverPinEditor {...defaultProps} />)

      const icons = container.querySelectorAll('[aria-hidden="true"]')
      expect(icons.length).toBeGreaterThan(0)
    })
  })

  describe('Touch Targets (NFR49)', () => {
    it('save button has min-height of 44px', () => {
      render(<CaregiverPinEditor {...defaultProps} />)

      const saveButton = screen.getByTestId('save-button')
      expect(saveButton).toHaveStyle({ minHeight: '44px' })
    })

    it('cancel button has min-height of 44px', () => {
      render(<CaregiverPinEditor {...defaultProps} onCancel={vi.fn()} />)

      const cancelButton = screen.getByTestId('cancel-button')
      expect(cancelButton).toHaveStyle({ minHeight: '44px' })
    })

    it('PIN inputs have minimum 44px height', () => {
      render(<CaregiverPinEditor {...defaultProps} />)

      const pinInput = screen.getByTestId('pin-digit-0')
      expect(pinInput).toHaveStyle({ height: '52px' })
    })

    it('select inputs have 44px height', () => {
      render(<CaregiverPinEditor {...defaultProps} />)

      expect(screen.getByTestId('max-duration-select')).toHaveStyle({ height: '44px' })
    })
  })
})
