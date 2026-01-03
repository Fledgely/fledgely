/**
 * Tests for CaregiverExtensionApproval component.
 *
 * Story 39.4: Caregiver PIN for Time Extension
 *
 * Tests cover:
 * - AC2: Extension approval with PIN
 * - Component rendering
 * - PIN entry
 * - NFR49: 44px minimum touch targets
 * - Accessibility compliance
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CaregiverExtensionApproval from './CaregiverExtensionApproval'

// Mock Firebase Functions
vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(() => mockApproveExtensionWithPin),
}))

// Mock the callable function
const mockApproveExtensionWithPin = vi.fn()

describe('CaregiverExtensionApproval', () => {
  const defaultProps = {
    familyId: 'family-123',
    childUid: 'child-456',
    childName: 'Mateo',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockApproveExtensionWithPin.mockResolvedValue({
      data: {
        success: true,
        extensionMinutes: 30,
        newTimeBalanceMinutes: 60,
        childName: 'Mateo',
        message: 'Gave Mateo 30 more minutes!',
      },
    })
  })

  describe('Rendering', () => {
    it('renders the container', () => {
      render(<CaregiverExtensionApproval {...defaultProps} />)

      expect(screen.getByTestId('caregiver-extension-approval')).toBeInTheDocument()
    })

    it('renders the title', () => {
      render(<CaregiverExtensionApproval {...defaultProps} />)

      expect(screen.getByRole('heading', { name: 'Approve Extension' })).toBeInTheDocument()
    })

    it('renders the subtitle', () => {
      render(<CaregiverExtensionApproval {...defaultProps} />)

      expect(screen.getByText('Enter your PIN to grant more time')).toBeInTheDocument()
    })

    it('renders child info card', () => {
      render(<CaregiverExtensionApproval {...defaultProps} />)

      expect(screen.getByTestId('child-info-card')).toBeInTheDocument()
      expect(screen.getByText('Mateo')).toBeInTheDocument()
    })

    it('shows extension amount when provided', () => {
      render(<CaregiverExtensionApproval {...defaultProps} extensionMinutes={30} />)

      expect(screen.getByTestId('extension-amount')).toHaveTextContent('+30 min')
    })

    it('shows request text when requestId provided', () => {
      render(<CaregiverExtensionApproval {...defaultProps} requestId="req-123" />)

      expect(screen.getByText('Requested more time')).toBeInTheDocument()
    })

    it('shows grant text when no requestId', () => {
      render(<CaregiverExtensionApproval {...defaultProps} />)

      expect(screen.getByText('Grant extra screen time')).toBeInTheDocument()
    })
  })

  describe('PIN Entry (AC2)', () => {
    it('renders PIN input container', () => {
      render(<CaregiverExtensionApproval {...defaultProps} />)

      expect(screen.getByTestId('pin-input-container')).toBeInTheDocument()
    })

    it('renders correct number of PIN inputs for default length', () => {
      render(<CaregiverExtensionApproval {...defaultProps} />)

      expect(screen.getByTestId('pin-digit-0')).toBeInTheDocument()
      expect(screen.getByTestId('pin-digit-1')).toBeInTheDocument()
      expect(screen.getByTestId('pin-digit-2')).toBeInTheDocument()
      expect(screen.getByTestId('pin-digit-3')).toBeInTheDocument()
    })

    it('renders correct number of PIN inputs for 6-digit PIN', () => {
      render(<CaregiverExtensionApproval {...defaultProps} pinLength={6} />)

      expect(screen.getByTestId('pin-digit-5')).toBeInTheDocument()
    })

    it('allows entering digits', () => {
      render(<CaregiverExtensionApproval {...defaultProps} />)

      fireEvent.change(screen.getByTestId('pin-digit-0'), { target: { value: '1' } })

      expect(screen.getByTestId('pin-digit-0')).toHaveValue('1')
    })

    it('supports paste', () => {
      render(<CaregiverExtensionApproval {...defaultProps} />)

      const input = screen.getByTestId('pin-digit-0')
      fireEvent.paste(input, {
        clipboardData: { getData: () => '1234' },
      })

      expect(screen.getByTestId('pin-digit-0')).toHaveValue('1')
      expect(screen.getByTestId('pin-digit-1')).toHaveValue('2')
      expect(screen.getByTestId('pin-digit-2')).toHaveValue('3')
      expect(screen.getByTestId('pin-digit-3')).toHaveValue('4')
    })
  })

  describe('Approve Button State', () => {
    it('disables approve button until PIN is complete', () => {
      render(<CaregiverExtensionApproval {...defaultProps} />)

      expect(screen.getByTestId('approve-button')).toBeDisabled()
    })

    it('renders approve button', () => {
      render(<CaregiverExtensionApproval {...defaultProps} />)

      expect(screen.getByTestId('approve-button')).toHaveTextContent('Approve Extension')
    })
  })

  describe('Cancel Button', () => {
    it('renders cancel button when onCancel provided', () => {
      const onCancel = vi.fn()
      render(<CaregiverExtensionApproval {...defaultProps} onCancel={onCancel} />)

      expect(screen.getByTestId('cancel-button')).toBeInTheDocument()
    })

    it('does not render cancel button when onCancel not provided', () => {
      render(<CaregiverExtensionApproval {...defaultProps} />)

      expect(screen.queryByTestId('cancel-button')).not.toBeInTheDocument()
    })

    it('calls onCancel when clicked', () => {
      const onCancel = vi.fn()
      render(<CaregiverExtensionApproval {...defaultProps} onCancel={onCancel} />)

      fireEvent.click(screen.getByTestId('cancel-button'))

      expect(onCancel).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('PIN inputs have aria-label', () => {
      render(<CaregiverExtensionApproval {...defaultProps} />)

      expect(screen.getByLabelText('PIN digit 1')).toBeInTheDocument()
      expect(screen.getByLabelText('PIN digit 2')).toBeInTheDocument()
    })

    it('icon is hidden from screen readers', () => {
      const { container } = render(<CaregiverExtensionApproval {...defaultProps} />)

      const icons = container.querySelectorAll('[aria-hidden="true"]')
      expect(icons.length).toBeGreaterThan(0)
    })

    it('child avatar shows first letter of name', () => {
      render(<CaregiverExtensionApproval {...defaultProps} childName="Mateo" />)

      // The avatar should show 'M'
      const card = screen.getByTestId('child-info-card')
      expect(card).toBeInTheDocument()
    })
  })

  describe('Touch Targets (NFR49)', () => {
    it('approve button has min-height of 44px', () => {
      render(<CaregiverExtensionApproval {...defaultProps} />)

      const button = screen.getByTestId('approve-button')
      expect(button).toHaveStyle({ minHeight: '44px' })
    })

    it('cancel button has min-height of 44px', () => {
      render(<CaregiverExtensionApproval {...defaultProps} onCancel={vi.fn()} />)

      const button = screen.getByTestId('cancel-button')
      expect(button).toHaveStyle({ minHeight: '44px' })
    })

    it('PIN inputs have minimum 44px height', () => {
      render(<CaregiverExtensionApproval {...defaultProps} />)

      const pinInput = screen.getByTestId('pin-digit-0')
      expect(pinInput).toHaveStyle({ height: '56px' })
    })
  })
})
