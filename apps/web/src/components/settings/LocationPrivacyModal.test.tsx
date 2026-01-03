/**
 * Tests for LocationPrivacyModal Component.
 *
 * Story 40.1: Location-Based Rule Opt-In
 * - AC2: Clear Privacy Explanation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LocationPrivacyModal, type LocationPrivacyModalProps } from './LocationPrivacyModal'

describe('LocationPrivacyModal', () => {
  const defaultProps: LocationPrivacyModalProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders nothing when closed', () => {
      render(<LocationPrivacyModal {...defaultProps} isOpen={false} />)
      expect(screen.queryByTestId('location-privacy-modal')).toBeNull()
    })

    it('renders modal when open', () => {
      render(<LocationPrivacyModal {...defaultProps} />)
      expect(screen.getByTestId('location-privacy-modal')).toBeTruthy()
    })

    it('renders title', () => {
      render(<LocationPrivacyModal {...defaultProps} />)
      expect(screen.getByText('Location Privacy Information')).toBeTruthy()
    })

    it('has proper ARIA attributes', () => {
      render(<LocationPrivacyModal {...defaultProps} />)
      const modal = screen.getByTestId('location-privacy-modal')
      expect(modal.getAttribute('role')).toBe('dialog')
      expect(modal.getAttribute('aria-modal')).toBe('true')
    })
  })

  describe('Privacy Information (AC2)', () => {
    it('displays what is collected section', () => {
      render(<LocationPrivacyModal {...defaultProps} />)
      expect(screen.getByText('What We Collect')).toBeTruthy()
      expect(screen.getByText(/Device GPS coordinates/)).toBeTruthy()
    })

    it("displays how it's used section", () => {
      render(<LocationPrivacyModal {...defaultProps} />)
      expect(screen.getByText("How It's Used")).toBeTruthy()
      expect(screen.getByText(/Apply different rules/)).toBeTruthy()
    })

    it('displays storage and access section', () => {
      render(<LocationPrivacyModal {...defaultProps} />)
      expect(screen.getByText('Storage & Access')).toBeTruthy()
      expect(screen.getByText(/never shared with third parties/)).toBeTruthy()
    })

    it('displays child transparency section', () => {
      render(<LocationPrivacyModal {...defaultProps} />)
      expect(screen.getByText('Child Transparency')).toBeTruthy()
    })
  })

  describe('Checkbox Requirement', () => {
    it('renders checkbox unchecked by default', () => {
      render(<LocationPrivacyModal {...defaultProps} />)
      const checkbox = screen.getByTestId('understood-checkbox') as HTMLInputElement
      expect(checkbox.checked).toBe(false)
    })

    it('confirm button is disabled when unchecked', () => {
      render(<LocationPrivacyModal {...defaultProps} />)
      expect(screen.getByTestId('confirm-button')).toBeDisabled()
    })

    it('confirm button is enabled when checked', () => {
      render(<LocationPrivacyModal {...defaultProps} />)
      fireEvent.click(screen.getByTestId('understood-checkbox'))
      expect(screen.getByTestId('confirm-button')).not.toBeDisabled()
    })
  })

  describe('User Actions', () => {
    it('calls onClose when cancel button clicked', () => {
      const onClose = vi.fn()
      render(<LocationPrivacyModal {...defaultProps} onClose={onClose} />)

      fireEvent.click(screen.getByTestId('cancel-button'))
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onConfirm when confirm button clicked with checkbox', () => {
      const onConfirm = vi.fn()
      render(<LocationPrivacyModal {...defaultProps} onConfirm={onConfirm} />)

      fireEvent.click(screen.getByTestId('understood-checkbox'))
      fireEvent.click(screen.getByTestId('confirm-button'))
      expect(onConfirm).toHaveBeenCalledTimes(1)
    })

    it('does not call onConfirm when checkbox unchecked', () => {
      const onConfirm = vi.fn()
      render(<LocationPrivacyModal {...defaultProps} onConfirm={onConfirm} />)

      fireEvent.click(screen.getByTestId('confirm-button'))
      expect(onConfirm).not.toHaveBeenCalled()
    })

    it('calls onClose when clicking overlay', () => {
      const onClose = vi.fn()
      render(<LocationPrivacyModal {...defaultProps} onClose={onClose} />)

      fireEvent.click(screen.getByTestId('location-privacy-modal'))
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Loading State', () => {
    it('disables confirm button when loading', () => {
      render(<LocationPrivacyModal {...defaultProps} loading={true} />)
      fireEvent.click(screen.getByTestId('understood-checkbox'))
      expect(screen.getByTestId('confirm-button')).toBeDisabled()
    })

    it('shows loading text on confirm button', () => {
      render(<LocationPrivacyModal {...defaultProps} loading={true} />)
      expect(screen.getByText('Processing...')).toBeTruthy()
    })
  })
})
