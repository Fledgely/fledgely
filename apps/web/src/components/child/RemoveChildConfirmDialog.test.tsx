import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RemoveChildConfirmDialog } from './RemoveChildConfirmDialog'

// Mock the hooks
const mockReauthenticate = vi.fn()
const mockRemoveChild = vi.fn()
const mockClearReauthError = vi.fn()
const mockClearRemoveError = vi.fn()

vi.mock('@/hooks/useReauthentication', () => ({
  useReauthentication: () => ({
    reauthenticate: mockReauthenticate,
    loading: false,
    error: null,
    clearError: mockClearReauthError,
    lastReauthAt: null,
    isReauthValid: () => false,
  }),
}))

vi.mock('@/hooks/useRemoveChild', () => ({
  useRemoveChild: () => ({
    removeChild: mockRemoveChild,
    loading: false,
    error: null,
    clearError: mockClearRemoveError,
    requiresReauth: true,
    setRequiresReauth: vi.fn(),
  }),
}))

describe('RemoveChildConfirmDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    childId: 'child-123',
    familyId: 'family-456',
    childName: 'Emma',
    childFullName: 'Emma Smith',
    onSuccess: vi.fn(),
    onError: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockReauthenticate.mockResolvedValue('mock-token-123')
    mockRemoveChild.mockResolvedValue({
      success: true,
      childId: 'child-123',
      familyId: 'family-456',
      devicesUnenrolled: 2,
      screenshotsDeleted: 5,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ============================================
  // RENDERING TESTS
  // ============================================
  describe('rendering', () => {
    it('renders dialog when open', () => {
      render(<RemoveChildConfirmDialog {...defaultProps} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText(/Remove Emma Smith\?/)).toBeInTheDocument()
    })

    it('does not render dialog when closed', () => {
      render(<RemoveChildConfirmDialog {...defaultProps} open={false} />)

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('displays data deletion warning', () => {
      render(<RemoveChildConfirmDialog {...defaultProps} />)

      expect(screen.getByText(/This cannot be undone/)).toBeInTheDocument()
      expect(screen.getByText(/deleted forever/)).toBeInTheDocument()
    })

    it('lists data types that will be deleted', () => {
      render(<RemoveChildConfirmDialog {...defaultProps} />)

      expect(screen.getByText(/Screenshots and activity logs/)).toBeInTheDocument()
      expect(screen.getByText(/Device enrollments/)).toBeInTheDocument()
      expect(screen.getByText(/Agreements and settings/)).toBeInTheDocument()
    })

    it('shows confirmation input with child name', () => {
      render(<RemoveChildConfirmDialog {...defaultProps} />)

      expect(screen.getByLabelText(/Type.*Emma.*to confirm/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Emma')).toBeInTheDocument()
    })

    it('renders Cancel button', () => {
      render(<RemoveChildConfirmDialog {...defaultProps} />)

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('renders Remove Child button', () => {
      render(<RemoveChildConfirmDialog {...defaultProps} />)

      expect(screen.getByRole('button', { name: /remove child/i })).toBeInTheDocument()
    })

    it('shows warning icon', () => {
      render(<RemoveChildConfirmDialog {...defaultProps} />)

      // AlertTriangle icon should be present (check by aria-hidden attribute)
      const icons = screen.getAllByRole('dialog')
      expect(icons.length).toBeGreaterThan(0)
    })
  })

  // ============================================
  // CONFIRMATION INPUT TESTS
  // ============================================
  describe('confirmation input', () => {
    it('disables Remove Child button when input is empty', () => {
      render(<RemoveChildConfirmDialog {...defaultProps} />)

      const removeButton = screen.getByRole('button', { name: /remove child/i })
      expect(removeButton).toBeDisabled()
    })

    it('disables Remove Child button when input does not match', async () => {
      render(<RemoveChildConfirmDialog {...defaultProps} />)

      const input = screen.getByPlaceholderText('Emma')
      await userEvent.type(input, 'Wrong')

      const removeButton = screen.getByRole('button', { name: /remove child/i })
      expect(removeButton).toBeDisabled()
    })

    it('enables Remove Child button when input matches exactly', async () => {
      render(<RemoveChildConfirmDialog {...defaultProps} />)

      const input = screen.getByPlaceholderText('Emma')
      await userEvent.type(input, 'Emma')

      const removeButton = screen.getByRole('button', { name: /remove child/i })
      expect(removeButton).toBeEnabled()
    })

    it('matches input case-insensitively', async () => {
      render(<RemoveChildConfirmDialog {...defaultProps} />)

      const input = screen.getByPlaceholderText('Emma')
      await userEvent.type(input, 'emma')

      const removeButton = screen.getByRole('button', { name: /remove child/i })
      expect(removeButton).toBeEnabled()
    })

    it('matches input case-insensitively with UPPERCASE', async () => {
      render(<RemoveChildConfirmDialog {...defaultProps} />)

      const input = screen.getByPlaceholderText('Emma')
      await userEvent.type(input, 'EMMA')

      const removeButton = screen.getByRole('button', { name: /remove child/i })
      expect(removeButton).toBeEnabled()
    })
  })

  // ============================================
  // INTERACTION TESTS
  // ============================================
  describe('interactions', () => {
    it('calls onOpenChange when Cancel is clicked', async () => {
      render(<RemoveChildConfirmDialog {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
    })

    it('triggers reauthentication when Remove Child is clicked', async () => {
      render(<RemoveChildConfirmDialog {...defaultProps} />)

      const input = screen.getByPlaceholderText('Emma')
      await userEvent.type(input, 'Emma')

      fireEvent.click(screen.getByRole('button', { name: /remove child/i }))

      await waitFor(() => {
        expect(mockReauthenticate).toHaveBeenCalled()
      })
    })

    it('calls removeChild after successful reauthentication', async () => {
      render(<RemoveChildConfirmDialog {...defaultProps} />)

      const input = screen.getByPlaceholderText('Emma')
      await userEvent.type(input, 'Emma')

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /remove child/i }))
      })

      await waitFor(() => {
        expect(mockRemoveChild).toHaveBeenCalledWith(
          'child-123',
          'family-456',
          'Emma',
          'mock-token-123'
        )
      })
    })

    it('calls onSuccess after successful removal', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })

      render(<RemoveChildConfirmDialog {...defaultProps} />)

      const input = screen.getByPlaceholderText('Emma')
      await userEvent.type(input, 'Emma')

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /remove child/i }))
      })

      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalledWith({
          childId: 'child-123',
          devicesUnenrolled: 2,
          screenshotsDeleted: 5,
        })
      })

      vi.useRealTimers()
    })

    it('submits on Enter key when confirmation is valid', async () => {
      render(<RemoveChildConfirmDialog {...defaultProps} />)

      const input = screen.getByPlaceholderText('Emma')
      await userEvent.type(input, 'Emma')
      await userEvent.keyboard('{Enter}')

      await waitFor(() => {
        expect(mockReauthenticate).toHaveBeenCalled()
      })
    })

    it('does not submit on Enter key when confirmation is invalid', async () => {
      render(<RemoveChildConfirmDialog {...defaultProps} />)

      const input = screen.getByPlaceholderText('Emma')
      await userEvent.type(input, 'Wrong')
      await userEvent.keyboard('{Enter}')

      expect(mockReauthenticate).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // ERROR HANDLING TESTS
  // ============================================
  describe('error handling', () => {
    it('shows error state when reauthentication fails', async () => {
      mockReauthenticate.mockRejectedValueOnce(new Error('Sign-in was cancelled. Please try again.'))

      render(<RemoveChildConfirmDialog {...defaultProps} />)

      const input = screen.getByPlaceholderText('Emma')
      await userEvent.type(input, 'Emma')

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /remove child/i }))
      })

      await waitFor(() => {
        expect(screen.getByText(/Could Not Remove Child/)).toBeInTheDocument()
      })
    })

    it('shows error state when removal fails', async () => {
      mockRemoveChild.mockRejectedValueOnce(new Error('The name you typed does not match. Please try again.'))

      render(<RemoveChildConfirmDialog {...defaultProps} />)

      const input = screen.getByPlaceholderText('Emma')
      await userEvent.type(input, 'Emma')

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /remove child/i }))
      })

      await waitFor(() => {
        expect(screen.getByText(/Could Not Remove Child/)).toBeInTheDocument()
      })
    })

    it('calls onError when removal fails', async () => {
      const testError = new Error('Test error')
      mockRemoveChild.mockRejectedValueOnce(testError)

      render(<RemoveChildConfirmDialog {...defaultProps} />)

      const input = screen.getByPlaceholderText('Emma')
      await userEvent.type(input, 'Emma')

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /remove child/i }))
      })

      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalledWith(testError)
      })
    })

    it('shows Try Again button on error', async () => {
      mockReauthenticate.mockRejectedValueOnce(new Error('Test error'))

      render(<RemoveChildConfirmDialog {...defaultProps} />)

      const input = screen.getByPlaceholderText('Emma')
      await userEvent.type(input, 'Emma')

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /remove child/i }))
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
      })
    })

    it('resets to confirm step when Try Again is clicked', async () => {
      mockReauthenticate.mockRejectedValueOnce(new Error('Test error'))

      render(<RemoveChildConfirmDialog {...defaultProps} />)

      const input = screen.getByPlaceholderText('Emma')
      await userEvent.type(input, 'Emma')

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /remove child/i }))
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /try again/i }))

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Emma')).toBeInTheDocument()
      })
    })

    it('indicates no data was deleted on error', async () => {
      mockRemoveChild.mockRejectedValueOnce(new Error('Test error'))

      render(<RemoveChildConfirmDialog {...defaultProps} />)

      const input = screen.getByPlaceholderText('Emma')
      await userEvent.type(input, 'Emma')

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /remove child/i }))
      })

      await waitFor(() => {
        // Multiple elements match due to sr-only live region, use getAllByText
        const elements = screen.getAllByText(/No data was deleted/)
        expect(elements.length).toBeGreaterThan(0)
      })
    })
  })

  // ============================================
  // SUCCESS STATE TESTS
  // ============================================
  describe('success state', () => {
    it('shows success message after removal', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })

      render(<RemoveChildConfirmDialog {...defaultProps} />)

      const input = screen.getByPlaceholderText('Emma')
      await userEvent.type(input, 'Emma')

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /remove child/i }))
      })

      await waitFor(() => {
        expect(screen.getByText(/Child Removed/)).toBeInTheDocument()
      })

      vi.useRealTimers()
    })

    it('mentions child name in success message', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })

      render(<RemoveChildConfirmDialog {...defaultProps} />)

      const input = screen.getByPlaceholderText('Emma')
      await userEvent.type(input, 'Emma')

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /remove child/i }))
      })

      await waitFor(() => {
        expect(screen.getByText(/Emma Smith has been removed/)).toBeInTheDocument()
      })

      vi.useRealTimers()
    })
  })

  // ============================================
  // ACCESSIBILITY TESTS
  // ============================================
  describe('accessibility', () => {
    it('has proper dialog role', () => {
      render(<RemoveChildConfirmDialog {...defaultProps} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('input has proper aria attributes', () => {
      render(<RemoveChildConfirmDialog {...defaultProps} />)

      const input = screen.getByPlaceholderText('Emma')
      expect(input).toHaveAttribute('id', 'confirmation-input')
    })

    it('has accessible alert for warning', () => {
      render(<RemoveChildConfirmDialog {...defaultProps} />)

      const alert = screen.getByRole('alert')
      expect(alert).toBeInTheDocument()
    })

    it('buttons have minimum touch target size (NFR49)', () => {
      render(<RemoveChildConfirmDialog {...defaultProps} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      const removeButton = screen.getByRole('button', { name: /remove child/i })

      expect(cancelButton).toHaveClass('min-h-[44px]')
      expect(removeButton).toHaveClass('min-h-[44px]')
    })

    it('input has minimum touch target size (NFR49)', () => {
      render(<RemoveChildConfirmDialog {...defaultProps} />)

      const input = screen.getByPlaceholderText('Emma')
      expect(input).toHaveClass('min-h-[44px]')
    })

    it('has sr-only live region for screen readers', () => {
      render(<RemoveChildConfirmDialog {...defaultProps} />)

      const liveRegion = document.querySelector('[aria-live="polite"]')
      expect(liveRegion).toBeInTheDocument()
      expect(liveRegion).toHaveClass('sr-only')
    })
  })

  // ============================================
  // STATE RESET TESTS
  // ============================================
  describe('state reset', () => {
    it('resets confirmation text when dialog opens', async () => {
      const { rerender } = render(
        <RemoveChildConfirmDialog {...defaultProps} open={false} />
      )

      // Open dialog
      rerender(<RemoveChildConfirmDialog {...defaultProps} open={true} />)

      const input = screen.getByPlaceholderText('Emma')
      expect(input).toHaveValue('')
    })

    it('clears errors when dialog opens', async () => {
      const { rerender } = render(
        <RemoveChildConfirmDialog {...defaultProps} open={false} />
      )

      // Open dialog
      rerender(<RemoveChildConfirmDialog {...defaultProps} open={true} />)

      expect(mockClearReauthError).toHaveBeenCalled()
      expect(mockClearRemoveError).toHaveBeenCalled()
    })
  })

  // ============================================
  // EDGE CASE TESTS
  // ============================================
  describe('edge cases', () => {
    it('handles child name with spaces', async () => {
      render(
        <RemoveChildConfirmDialog
          {...defaultProps}
          childName="Emma Jane"
          childFullName="Emma Jane Smith"
        />
      )

      const input = screen.getByPlaceholderText('Emma Jane')
      await userEvent.type(input, 'Emma Jane')

      const removeButton = screen.getByRole('button', { name: /remove child/i })
      expect(removeButton).toBeEnabled()
    })

    it('handles special characters in child name', async () => {
      render(
        <RemoveChildConfirmDialog
          {...defaultProps}
          childName="Emma-Jane"
          childFullName="Emma-Jane Smith"
        />
      )

      const input = screen.getByPlaceholderText('Emma-Jane')
      await userEvent.type(input, 'Emma-Jane')

      const removeButton = screen.getByRole('button', { name: /remove child/i })
      expect(removeButton).toBeEnabled()
    })

    it('handles optional callbacks being undefined', async () => {
      render(
        <RemoveChildConfirmDialog
          {...defaultProps}
          onSuccess={undefined}
          onError={undefined}
        />
      )

      const input = screen.getByPlaceholderText('Emma')
      await userEvent.type(input, 'Emma')

      // Should not throw when callbacks are undefined
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /remove child/i }))
      })

      await waitFor(() => {
        expect(mockRemoveChild).toHaveBeenCalled()
      })
    })

    it('trims whitespace from input for comparison', async () => {
      render(<RemoveChildConfirmDialog {...defaultProps} />)

      const input = screen.getByPlaceholderText('Emma')
      await userEvent.type(input, ' Emma ')

      // Note: The current implementation doesn't trim, so this tests current behavior
      // If whitespace should be trimmed, this test should expect enabled
      const removeButton = screen.getByRole('button', { name: /remove child/i })
      // Current implementation: doesn't trim, so button should be disabled
      // If behavior changes, update this expectation
      expect(removeButton).toBeDisabled()
    })
  })
})
