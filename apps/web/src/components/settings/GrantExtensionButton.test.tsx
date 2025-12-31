/**
 * GrantExtensionButton Component Tests - Story 19D.4
 *
 * Tests for the one-time access extension button.
 *
 * Story 19D.4 Acceptance Criteria:
 * - AC4: Parent can grant one-time access extension
 *
 * @vitest-environment jsdom
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { GrantExtensionButton } from './GrantExtensionButton'

// Mock Firebase Firestore
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore')
  return {
    ...actual,
    doc: vi.fn(),
    updateDoc: vi.fn(),
    Timestamp: {
      fromDate: vi.fn((date) => ({ toDate: () => date })),
    },
  }
})

// Mock Firebase initialization
vi.mock('../../lib/firebase', () => ({
  getFirestoreDb: vi.fn(() => ({})),
}))

import { updateDoc } from 'firebase/firestore'

describe('GrantExtensionButton', () => {
  const mockOnExtensionGranted = vi.fn()

  const defaultProps = {
    familyId: 'family-123',
    caregiverId: 'caregiver-456',
    caregiverName: 'Grandpa Joe',
    grantedByUid: 'parent-789',
    grantedByName: 'Mom',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(updateDoc).mockResolvedValue(undefined)
  })

  describe('Basic rendering', () => {
    it('renders the button', () => {
      render(<GrantExtensionButton {...defaultProps} />)

      expect(screen.getByTestId('grant-extension-button')).toBeInTheDocument()
    })

    it('displays button text', () => {
      render(<GrantExtensionButton {...defaultProps} />)

      expect(screen.getByText('Extend Access')).toBeInTheDocument()
    })

    it('has accessible label with caregiver name', () => {
      render(<GrantExtensionButton {...defaultProps} />)

      expect(screen.getByTestId('grant-extension-button')).toHaveAttribute(
        'aria-label',
        'Grant extended access to Grandpa Joe'
      )
    })

    it('does not show dialog initially', () => {
      render(<GrantExtensionButton {...defaultProps} />)

      expect(screen.queryByTestId('extension-dialog')).not.toBeInTheDocument()
    })
  })

  describe('Dialog behavior', () => {
    it('opens dialog when button clicked', () => {
      render(<GrantExtensionButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('grant-extension-button'))

      expect(screen.getByTestId('extension-dialog')).toBeInTheDocument()
    })

    it('displays caregiver name in dialog', () => {
      render(<GrantExtensionButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('grant-extension-button'))

      expect(screen.getByText(/Grandpa Joe/)).toBeInTheDocument()
    })

    it('shows duration options', () => {
      render(<GrantExtensionButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('grant-extension-button'))

      expect(screen.getByTestId('duration-30')).toBeInTheDocument()
      expect(screen.getByTestId('duration-60')).toBeInTheDocument()
      expect(screen.getByTestId('duration-120')).toBeInTheDocument()
      expect(screen.getByTestId('duration-240')).toBeInTheDocument()
    })

    it('has dialog role and modal attributes', () => {
      render(<GrantExtensionButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('grant-extension-button'))

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
    })

    it('closes dialog when cancel clicked', () => {
      render(<GrantExtensionButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('grant-extension-button'))
      fireEvent.click(screen.getByTestId('cancel-extension-button'))

      expect(screen.queryByTestId('extension-dialog')).not.toBeInTheDocument()
    })
  })

  describe('Duration selection', () => {
    it('defaults to 1 hour', () => {
      render(<GrantExtensionButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('grant-extension-button'))

      expect(screen.getByTestId('duration-60')).toHaveAttribute('aria-checked', 'true')
    })

    it('allows selecting different duration', () => {
      render(<GrantExtensionButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('grant-extension-button'))
      fireEvent.click(screen.getByTestId('duration-120'))

      expect(screen.getByTestId('duration-120')).toHaveAttribute('aria-checked', 'true')
      expect(screen.getByTestId('duration-60')).toHaveAttribute('aria-checked', 'false')
    })
  })

  describe('Granting extension (AC4)', () => {
    it('calls updateDoc when grant clicked', async () => {
      render(<GrantExtensionButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('grant-extension-button'))
      fireEvent.click(screen.getByTestId('confirm-extension-button'))

      await waitFor(() => {
        expect(updateDoc).toHaveBeenCalled()
      })
    })

    it('shows success message after granting', async () => {
      render(<GrantExtensionButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('grant-extension-button'))
      fireEvent.click(screen.getByTestId('confirm-extension-button'))

      await waitFor(() => {
        expect(screen.getByTestId('extension-success')).toBeInTheDocument()
      })
    })

    it('calls onExtensionGranted callback', async () => {
      render(<GrantExtensionButton {...defaultProps} onExtensionGranted={mockOnExtensionGranted} />)

      fireEvent.click(screen.getByTestId('grant-extension-button'))
      fireEvent.click(screen.getByTestId('confirm-extension-button'))

      await waitFor(() => {
        expect(mockOnExtensionGranted).toHaveBeenCalledWith(
          expect.objectContaining({
            grantedByUid: 'parent-789',
            grantedByName: 'Mom',
          })
        )
      })
    })

    it('includes correct expiry time for selected duration', async () => {
      render(<GrantExtensionButton {...defaultProps} onExtensionGranted={mockOnExtensionGranted} />)

      fireEvent.click(screen.getByTestId('grant-extension-button'))
      fireEvent.click(screen.getByTestId('duration-120')) // 2 hours
      fireEvent.click(screen.getByTestId('confirm-extension-button'))

      await waitFor(() => {
        const call = mockOnExtensionGranted.mock.calls[0][0]
        const durationMs = call.expiresAt.getTime() - call.grantedAt.getTime()
        const durationMinutes = durationMs / 1000 / 60
        expect(durationMinutes).toBe(120)
      })
    })
  })

  describe('Error handling', () => {
    it('shows error when update fails', async () => {
      vi.mocked(updateDoc).mockRejectedValue(new Error('Network error'))

      render(<GrantExtensionButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('grant-extension-button'))
      fireEvent.click(screen.getByTestId('confirm-extension-button'))

      await waitFor(() => {
        expect(screen.getByTestId('extension-error')).toBeInTheDocument()
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    it('keeps dialog open on error', async () => {
      vi.mocked(updateDoc).mockRejectedValue(new Error('Failed'))

      render(<GrantExtensionButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('grant-extension-button'))
      fireEvent.click(screen.getByTestId('confirm-extension-button'))

      await waitFor(() => {
        expect(screen.getByTestId('extension-dialog')).toBeInTheDocument()
      })
    })
  })

  describe('Loading state', () => {
    it('shows loading text during grant', async () => {
      // Create a never-resolving promise to keep loading state
      vi.mocked(updateDoc).mockImplementation(() => new Promise(() => {}))

      render(<GrantExtensionButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('grant-extension-button'))
      fireEvent.click(screen.getByTestId('confirm-extension-button'))

      expect(screen.getByText('Granting...')).toBeInTheDocument()
    })

    it('disables confirm button during grant', async () => {
      vi.mocked(updateDoc).mockImplementation(() => new Promise(() => {}))

      render(<GrantExtensionButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('grant-extension-button'))
      fireEvent.click(screen.getByTestId('confirm-extension-button'))

      expect(screen.getByTestId('confirm-extension-button')).toBeDisabled()
    })

    it('disables cancel button during grant', async () => {
      vi.mocked(updateDoc).mockImplementation(() => new Promise(() => {}))

      render(<GrantExtensionButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('grant-extension-button'))
      fireEvent.click(screen.getByTestId('confirm-extension-button'))

      expect(screen.getByTestId('cancel-extension-button')).toBeDisabled()
    })
  })

  describe('Disabled state', () => {
    it('disables button when disabled prop is true', () => {
      render(<GrantExtensionButton {...defaultProps} disabled />)

      expect(screen.getByTestId('grant-extension-button')).toBeDisabled()
    })

    it('does not open dialog when disabled', () => {
      render(<GrantExtensionButton {...defaultProps} disabled />)

      fireEvent.click(screen.getByTestId('grant-extension-button'))

      expect(screen.queryByTestId('extension-dialog')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('dialog has aria-labelledby', () => {
      render(<GrantExtensionButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('grant-extension-button'))

      const dialog = screen.getByTestId('extension-dialog')
      expect(dialog).toHaveAttribute('aria-labelledby', 'extension-dialog-heading')
    })

    it('duration options have radiogroup role', () => {
      render(<GrantExtensionButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('grant-extension-button'))

      expect(screen.getByRole('radiogroup')).toBeInTheDocument()
    })

    it('duration options have radio role', () => {
      render(<GrantExtensionButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('grant-extension-button'))

      const radios = screen.getAllByRole('radio')
      expect(radios).toHaveLength(4)
    })

    it('error has alert role', async () => {
      vi.mocked(updateDoc).mockRejectedValue(new Error('Failed'))

      render(<GrantExtensionButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('grant-extension-button'))
      fireEvent.click(screen.getByTestId('confirm-extension-button'))

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })

    it('success has status role', async () => {
      render(<GrantExtensionButton {...defaultProps} />)

      fireEvent.click(screen.getByTestId('grant-extension-button'))
      fireEvent.click(screen.getByTestId('confirm-extension-button'))

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument()
      })
    })
  })
})
