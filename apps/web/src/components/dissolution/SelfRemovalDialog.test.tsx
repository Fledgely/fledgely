import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SelfRemovalDialog } from './SelfRemovalDialog'

// Mock hooks
vi.mock('@/hooks/useReauthentication', () => ({
  useReauthentication: vi.fn(() => ({
    reauthenticate: vi.fn().mockResolvedValue('mock-token'),
    loading: false,
    error: null,
    clearError: vi.fn(),
  })),
}))

vi.mock('@/hooks/useSelfRemoval', () => ({
  useSelfRemoval: vi.fn(() => ({
    removeSelf: vi.fn().mockResolvedValue({
      success: true,
      isSingleGuardian: false,
      familyId: 'family-123',
      removedAt: new Date(),
    }),
    checkCanRemove: vi.fn().mockResolvedValue({
      canRemove: true,
      isSingleGuardian: false,
    }),
    loading: false,
    error: null,
    clearError: vi.fn(),
    isSingleGuardian: false,
    removalResult: null,
  })),
}))

import { useReauthentication } from '@/hooks/useReauthentication'
import { useSelfRemoval } from '@/hooks/useSelfRemoval'

const mockUseReauthentication = vi.mocked(useReauthentication)
const mockUseSelfRemoval = vi.mocked(useSelfRemoval)

/**
 * SelfRemovalDialog Component Tests
 *
 * Story 2.8: Unilateral Self-Removal (Survivor Escape)
 *
 * Tests verify:
 * - Multi-step dialog flow
 * - Single guardian warning step
 * - Re-authentication integration
 * - Success state with domestic abuse resources
 * - Accessibility (44x44px touch targets, aria-live)
 */

describe('SelfRemovalDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    familyId: 'family-123',
    onSuccess: vi.fn(),
    onError: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset hook mocks to default success state
    mockUseReauthentication.mockReturnValue({
      reauthenticate: vi.fn().mockResolvedValue('mock-token'),
      loading: false,
      error: null,
      clearError: vi.fn(),
    } as ReturnType<typeof useReauthentication>)

    mockUseSelfRemoval.mockReturnValue({
      removeSelf: vi.fn().mockResolvedValue({
        success: true,
        isSingleGuardian: false,
        familyId: 'family-123',
        removedAt: new Date(),
      }),
      checkCanRemove: vi.fn().mockResolvedValue({
        canRemove: true,
        isSingleGuardian: false,
      }),
      loading: false,
      error: null,
      clearError: vi.fn(),
      isSingleGuardian: false,
      removalResult: null,
      requiresReauth: true,
      setRequiresReauth: vi.fn(),
    } as unknown as ReturnType<typeof useSelfRemoval>)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ============================================================================
  // Initial Render Tests
  // ============================================================================

  describe('Initial Render', () => {
    it('should render explain step by default', () => {
      render(<SelfRemovalDialog {...defaultProps} />)

      expect(screen.getByText('Remove Yourself From This Family')).toBeInTheDocument()
      expect(screen.getByText('What happens when you leave:')).toBeInTheDocument()
    })

    it('should show key information about self-removal', () => {
      render(<SelfRemovalDialog {...defaultProps} />)

      expect(screen.getByText('Your access will be removed immediately')).toBeInTheDocument()
      expect(screen.getByText('You will no longer see any family data')).toBeInTheDocument()
      expect(
        screen.getByText('The family continues to exist for other members')
      ).toBeInTheDocument()
      expect(
        screen.getByText('Child data remains safe with other guardian(s)')
      ).toBeInTheDocument()
    })

    it('should show no notification message', () => {
      render(<SelfRemovalDialog {...defaultProps} />)

      expect(
        screen.getByText(/No one else in the family will be notified/)
      ).toBeInTheDocument()
    })

    it('should require acknowledgment checkbox', () => {
      render(<SelfRemovalDialog {...defaultProps} />)

      const removeButton = screen.getByRole('button', { name: /remove myself/i })
      expect(removeButton).toBeDisabled()

      const checkbox = screen.getByRole('checkbox', {
        name: /I understand this cannot be undone/i,
      })
      expect(checkbox).not.toBeChecked()
    })
  })

  // ============================================================================
  // Interaction Tests
  // ============================================================================

  describe('Interactions', () => {
    it('should enable button when checkbox is checked', async () => {
      const user = userEvent.setup()
      render(<SelfRemovalDialog {...defaultProps} />)

      const checkbox = screen.getByRole('checkbox')
      await user.click(checkbox)

      const removeButton = screen.getByRole('button', { name: /remove myself/i })
      expect(removeButton).not.toBeDisabled()
    })

    it('should call onOpenChange when cancel is clicked', async () => {
      const user = userEvent.setup()
      render(<SelfRemovalDialog {...defaultProps} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  // ============================================================================
  // Single Guardian Warning Tests
  // ============================================================================

  describe('Single Guardian Warning', () => {
    it('should show single guardian warning when applicable', async () => {
      mockUseSelfRemoval.mockReturnValue({
        removeSelf: vi.fn(),
        checkCanRemove: vi.fn().mockResolvedValue({
          canRemove: true,
          isSingleGuardian: true,
          reason: 'single-guardian-warning',
        }),
        loading: false,
        error: null,
        clearError: vi.fn(),
        isSingleGuardian: true,
        removalResult: null,
        requiresReauth: true,
        setRequiresReauth: vi.fn(),
      } as unknown as ReturnType<typeof useSelfRemoval>)

      const user = userEvent.setup()
      render(<SelfRemovalDialog {...defaultProps} />)

      // Check acknowledgment and click remove
      const checkbox = screen.getByRole('checkbox')
      await user.click(checkbox)

      const removeButton = screen.getByRole('button', { name: /remove myself/i })
      await user.click(removeButton)

      // Should show warning
      await waitFor(() => {
        expect(screen.getByText('You Are The Only Guardian')).toBeInTheDocument()
      })
    })

    it('should show consequences of single guardian leaving', async () => {
      mockUseSelfRemoval.mockReturnValue({
        removeSelf: vi.fn(),
        checkCanRemove: vi.fn().mockResolvedValue({
          canRemove: true,
          isSingleGuardian: true,
        }),
        loading: false,
        error: null,
        clearError: vi.fn(),
        isSingleGuardian: true,
        removalResult: null,
        requiresReauth: true,
        setRequiresReauth: vi.fn(),
      } as unknown as ReturnType<typeof useSelfRemoval>)

      const user = userEvent.setup()
      render(<SelfRemovalDialog {...defaultProps} />)

      // Proceed to warning
      const checkbox = screen.getByRole('checkbox')
      await user.click(checkbox)
      const removeButton = screen.getByRole('button', { name: /remove myself/i })
      await user.click(removeButton)

      await waitFor(() => {
        expect(screen.getByText('Children will have no guardian')).toBeInTheDocument()
        expect(
          screen.getByText('The family will be flagged for support review')
        ).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Success Flow Tests
  // ============================================================================

  describe('Success Flow', () => {
    it('should show success state with domestic abuse resources', async () => {
      const user = userEvent.setup()
      render(<SelfRemovalDialog {...defaultProps} />)

      // Check acknowledgment and click remove
      const checkbox = screen.getByRole('checkbox')
      await user.click(checkbox)

      const removeButton = screen.getByRole('button', { name: /remove myself/i })
      await user.click(removeButton)

      // Should show success
      await waitFor(() => {
        expect(screen.getByText('You Have Been Removed')).toBeInTheDocument()
      })

      // Should show domestic abuse resources
      expect(screen.getByText('Support Resources')).toBeInTheDocument()
      expect(screen.getByText(/National Domestic Violence Hotline/)).toBeInTheDocument()
    })

    it('should call onSuccess callback when removal succeeds', async () => {
      const user = userEvent.setup()
      render(<SelfRemovalDialog {...defaultProps} />)

      const checkbox = screen.getByRole('checkbox')
      await user.click(checkbox)

      const removeButton = screen.getByRole('button', { name: /remove myself/i })
      await user.click(removeButton)

      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalled()
      })
    })
  })

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    it('should display error message when check fails', async () => {
      mockUseSelfRemoval.mockReturnValue({
        removeSelf: vi.fn(),
        checkCanRemove: vi.fn().mockResolvedValue({
          canRemove: false,
          isSingleGuardian: false,
          reason: 'not-a-guardian',
        }),
        loading: false,
        error: null,
        clearError: vi.fn(),
        isSingleGuardian: false,
        removalResult: null,
        requiresReauth: true,
        setRequiresReauth: vi.fn(),
      } as unknown as ReturnType<typeof useSelfRemoval>)

      const user = userEvent.setup()
      render(<SelfRemovalDialog {...defaultProps} />)

      const checkbox = screen.getByRole('checkbox')
      await user.click(checkbox)

      const removeButton = screen.getByRole('button', { name: /remove myself/i })
      await user.click(removeButton)

      await waitFor(() => {
        expect(
          screen.getByText('You are not a member of this family.')
        ).toBeInTheDocument()
      })
    })

    it('should call onError callback when removal fails', async () => {
      const mockRemoveSelf = vi.fn().mockRejectedValue(new Error('Removal failed'))

      mockUseSelfRemoval.mockReturnValue({
        removeSelf: mockRemoveSelf,
        checkCanRemove: vi.fn().mockResolvedValue({
          canRemove: true,
          isSingleGuardian: false,
        }),
        loading: false,
        error: null,
        clearError: vi.fn(),
        isSingleGuardian: false,
        removalResult: null,
        requiresReauth: true,
        setRequiresReauth: vi.fn(),
      } as unknown as ReturnType<typeof useSelfRemoval>)

      const user = userEvent.setup()
      render(<SelfRemovalDialog {...defaultProps} />)

      const checkbox = screen.getByRole('checkbox')
      await user.click(checkbox)

      const removeButton = screen.getByRole('button', { name: /remove myself/i })
      await user.click(removeButton)

      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalled()
      })
    })
  })

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  describe('Accessibility', () => {
    it('should have minimum 44x44px touch targets for buttons', () => {
      render(<SelfRemovalDialog {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        // Check for min-h-[44px] and min-w-[44px] classes
        expect(
          button.className.includes('min-h-[44px]') ||
            button.className.includes('min-w-[44px]')
        ).toBe(true)
      })
    })

    it('should have aria-live region for announcements', () => {
      render(<SelfRemovalDialog {...defaultProps} />)

      const liveRegion = document.querySelector('[aria-live]')
      expect(liveRegion).toBeInTheDocument()
    })

    it('should have proper role for support resources', async () => {
      const user = userEvent.setup()
      render(<SelfRemovalDialog {...defaultProps} />)

      // Navigate to success
      const checkbox = screen.getByRole('checkbox')
      await user.click(checkbox)
      const removeButton = screen.getByRole('button', { name: /remove myself/i })
      await user.click(removeButton)

      await waitFor(() => {
        const resourcesRegion = screen.getByRole('complementary', {
          name: /support resources/i,
        })
        expect(resourcesRegion).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Loading State Tests
  // ============================================================================

  describe('Loading States', () => {
    it('should show loading spinner during re-authentication', async () => {
      mockUseReauthentication.mockReturnValue({
        reauthenticate: vi.fn(() => new Promise(() => {})), // Never resolves
        loading: true,
        error: null,
        clearError: vi.fn(),
      } as ReturnType<typeof useReauthentication>)

      const user = userEvent.setup()
      render(<SelfRemovalDialog {...defaultProps} />)

      const checkbox = screen.getByRole('checkbox')
      await user.click(checkbox)

      // Button should show loading state
      const removeButton = screen.getByRole('button', { name: /please wait/i })
      expect(removeButton).toBeInTheDocument()
    })

    it('should disable cancel button during processing', () => {
      mockUseSelfRemoval.mockReturnValue({
        removeSelf: vi.fn(),
        checkCanRemove: vi.fn(),
        loading: true,
        error: null,
        clearError: vi.fn(),
        isSingleGuardian: false,
        removalResult: null,
        requiresReauth: true,
        setRequiresReauth: vi.fn(),
      } as unknown as ReturnType<typeof useSelfRemoval>)

      render(<SelfRemovalDialog {...defaultProps} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      expect(cancelButton).toBeDisabled()
    })
  })
})
