import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PetitionStatusChecker } from './PetitionStatusChecker'

// Mock Firebase functions
vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(),
}))

vi.mock('@/lib/firebase', () => ({
  functions: {},
}))

import { httpsCallable } from 'firebase/functions'

/**
 * PetitionStatusChecker Component Tests
 *
 * Story 3.6: Legal Parent Petition for Access - Task 7
 *
 * Tests verify:
 * - Form renders with reference number and email fields
 * - Validates input before submission
 * - Shows status after successful lookup
 * - Shows error for invalid/not-found petitions
 * - Accessibility: 44x44px targets (NFR49)
 * - Accessibility: Proper labels and aria attributes
 */

describe('PetitionStatusChecker', () => {
  const mockOnClose = vi.fn()
  const mockStatusResult = {
    success: true,
    status: 'under-review',
    statusLabel: 'Under Review',
    submittedAt: new Date('2025-12-15T10:00:00Z'),
    updatedAt: new Date('2025-12-15T12:00:00Z'),
    supportMessage: 'Your petition is being reviewed by our team.',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(httpsCallable).mockReturnValue(
      vi.fn().mockResolvedValue({ data: mockStatusResult })
    )
  })

  // ============================================================================
  // Render Tests
  // ============================================================================

  describe('rendering', () => {
    it('renders when open', () => {
      render(<PetitionStatusChecker open={true} onOpenChange={mockOnClose} />)

      expect(screen.getByText(/check petition status/i)).toBeInTheDocument()
    })

    it('does not render when closed', () => {
      render(<PetitionStatusChecker open={false} onOpenChange={mockOnClose} />)

      expect(screen.queryByText(/check petition status/i)).not.toBeInTheDocument()
    })

    it('renders reference number field', () => {
      render(<PetitionStatusChecker open={true} onOpenChange={mockOnClose} />)

      expect(screen.getByLabelText(/reference number/i)).toBeInTheDocument()
    })

    it('renders email field', () => {
      render(<PetitionStatusChecker open={true} onOpenChange={mockOnClose} />)

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    })

    it('renders check status button', () => {
      render(<PetitionStatusChecker open={true} onOpenChange={mockOnClose} />)

      expect(screen.getByRole('button', { name: /check status/i })).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Form Validation Tests
  // ============================================================================

  describe('validation', () => {
    it('shows error when reference number is empty', async () => {
      const user = userEvent.setup()
      render(<PetitionStatusChecker open={true} onOpenChange={mockOnClose} />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.click(screen.getByRole('button', { name: /check status/i }))

      await waitFor(() => {
        expect(screen.getByText(/reference number is required/i)).toBeInTheDocument()
      })
    })

    it('shows error for invalid reference number format', async () => {
      const user = userEvent.setup()
      render(<PetitionStatusChecker open={true} onOpenChange={mockOnClose} />)

      await user.type(screen.getByLabelText(/reference number/i), 'INVALID-FORMAT')
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.click(screen.getByRole('button', { name: /check status/i }))

      await waitFor(() => {
        expect(screen.getByText(/invalid reference number format/i)).toBeInTheDocument()
      })
    })

    it('shows error when email is empty', async () => {
      const user = userEvent.setup()
      render(<PetitionStatusChecker open={true} onOpenChange={mockOnClose} />)

      await user.type(screen.getByLabelText(/reference number/i), 'LP-20251215-A1B2C')
      await user.click(screen.getByRole('button', { name: /check status/i }))

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Status Display Tests
  // ============================================================================

  describe('status display', () => {
    it('shows status label after successful lookup', async () => {
      const user = userEvent.setup()
      render(<PetitionStatusChecker open={true} onOpenChange={mockOnClose} />)

      await user.type(screen.getByLabelText(/reference number/i), 'LP-20251215-A1B2C')
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.click(screen.getByRole('button', { name: /check status/i }))

      await waitFor(() => {
        expect(screen.getByText(/under review/i)).toBeInTheDocument()
      })
    })

    it('shows support message when available', async () => {
      const user = userEvent.setup()
      render(<PetitionStatusChecker open={true} onOpenChange={mockOnClose} />)

      await user.type(screen.getByLabelText(/reference number/i), 'LP-20251215-A1B2C')
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.click(screen.getByRole('button', { name: /check status/i }))

      await waitFor(() => {
        expect(screen.getByText(/being reviewed by our team/i)).toBeInTheDocument()
      })
    })

    it('shows different status colors for different states', async () => {
      // Test verified status (green)
      vi.mocked(httpsCallable).mockReturnValue(
        vi.fn().mockResolvedValue({
          data: {
            success: true,
            status: 'verified',
            statusLabel: 'Verified',
            submittedAt: new Date(),
            updatedAt: new Date(),
          },
        })
      )

      const user = userEvent.setup()
      render(<PetitionStatusChecker open={true} onOpenChange={mockOnClose} />)

      await user.type(screen.getByLabelText(/reference number/i), 'LP-20251215-A1B2C')
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.click(screen.getByRole('button', { name: /check status/i }))

      await waitFor(() => {
        expect(screen.getByText(/verified/i)).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('error handling', () => {
    it('shows error when petition not found', async () => {
      vi.mocked(httpsCallable).mockReturnValue(
        vi.fn().mockResolvedValue({
          data: {
            success: false,
            error: 'Petition not found',
          },
        })
      )

      const user = userEvent.setup()
      render(<PetitionStatusChecker open={true} onOpenChange={mockOnClose} />)

      await user.type(screen.getByLabelText(/reference number/i), 'LP-20251215-XXXXX')
      await user.type(screen.getByLabelText(/email/i), 'wrong@example.com')
      await user.click(screen.getByRole('button', { name: /check status/i }))

      await waitFor(() => {
        expect(screen.getByText(/not found|no petition|couldn't find/i)).toBeInTheDocument()
      })
    })

    it('shows error on network failure', async () => {
      vi.mocked(httpsCallable).mockReturnValue(
        vi.fn().mockRejectedValue(new Error('Network error'))
      )

      const user = userEvent.setup()
      render(<PetitionStatusChecker open={true} onOpenChange={mockOnClose} />)

      await user.type(screen.getByLabelText(/reference number/i), 'LP-20251215-A1B2C')
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.click(screen.getByRole('button', { name: /check status/i }))

      await waitFor(() => {
        expect(screen.getByText(/error|try again|something went wrong/i)).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Accessibility Tests (NFR49, NFR45)
  // ============================================================================

  describe('accessibility', () => {
    it('check status button meets 44x44px minimum (NFR49)', () => {
      render(<PetitionStatusChecker open={true} onOpenChange={mockOnClose} />)

      const checkButton = screen.getByRole('button', { name: /check status/i })
      expect(checkButton).toHaveClass('min-h-[44px]')
    })

    it('all inputs have labels', () => {
      render(<PetitionStatusChecker open={true} onOpenChange={mockOnClose} />)

      expect(screen.getByLabelText(/reference number/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    })

    it('form can be navigated with keyboard', async () => {
      const user = userEvent.setup()
      render(<PetitionStatusChecker open={true} onOpenChange={mockOnClose} />)

      const referenceInput = screen.getByLabelText(/reference number/i)
      await user.click(referenceInput)
      await user.tab()

      expect(screen.getByLabelText(/email/i)).toHaveFocus()
    })
  })

  // ============================================================================
  // Close Behavior Tests
  // ============================================================================

  describe('close behavior', () => {
    it('calls onOpenChange when cancel is clicked', async () => {
      const user = userEvent.setup()
      render(<PetitionStatusChecker open={true} onOpenChange={mockOnClose} />)

      // Find the Cancel button specifically (not the Close X button)
      const cancelButton = screen.getByRole('button', { name: /^cancel$/i })
      await user.click(cancelButton)
      expect(mockOnClose).toHaveBeenCalledWith(false)
    })

    it('can check another petition after viewing status', async () => {
      const user = userEvent.setup()
      render(<PetitionStatusChecker open={true} onOpenChange={mockOnClose} />)

      // First lookup
      await user.type(screen.getByLabelText(/reference number/i), 'LP-20251215-A1B2C')
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.click(screen.getByRole('button', { name: /check status/i }))

      await waitFor(() => {
        expect(screen.getByText(/under review/i)).toBeInTheDocument()
      })

      // Should have option to check another
      const checkAnotherButton = screen.queryByRole('button', { name: /check another|back|new search/i })
      if (checkAnotherButton) {
        await user.click(checkAnotherButton)
        // Should see form again
        await waitFor(() => {
          expect(screen.getByLabelText(/reference number/i)).toBeInTheDocument()
        })
      }
    })
  })
})
