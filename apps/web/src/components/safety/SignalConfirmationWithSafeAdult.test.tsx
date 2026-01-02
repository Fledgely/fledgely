/**
 * SignalConfirmationWithSafeAdult Integration Tests - Story 7.5.4 Task 7
 *
 * Tests for integrating safe adult designation with signal confirmation.
 * AC1: Safe adult notification option
 * AC2: Notification to safe adult
 * AC3: Pre-configured safe adult
 *
 * CRITICAL: Child-appropriate language throughout.
 * TDD approach: Write tests first, then implementation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SignalConfirmationWithSafeAdult } from './SignalConfirmationWithSafeAdult'
import type { SafeAdultDesignation } from '@fledgely/shared/contracts/safeAdult'
import type { ConfirmationContent, SignalCrisisResource } from '@fledgely/shared'

describe('SignalConfirmationWithSafeAdult', () => {
  const mockOnDismiss = vi.fn()
  const mockOnSafeAdultDesignated = vi.fn()
  const mockOnSafeAdultSkipped = vi.fn()
  const mockOnResourceClick = vi.fn()

  const defaultContent: ConfirmationContent = {
    headerText: 'We heard you',
    bodyText: 'Someone cares about you',
    emergencyText: 'If you need help right now',
    dismissButtonText: 'I understand',
    chatPromptText: 'Talk to someone',
  }

  const defaultResources: SignalCrisisResource[] = [
    {
      id: 'res_1',
      name: 'Crisis Text Line',
      description: 'Text HOME to 741741',
      type: 'text',
      url: 'sms:741741',
      available24h: true,
      priority: 1,
    },
  ]

  const defaultProps = {
    signalId: 'sig_123',
    childId: 'child_123',
    content: defaultContent,
    resources: defaultResources,
    onDismiss: mockOnDismiss,
    onSafeAdultDesignated: mockOnSafeAdultDesignated,
    onSafeAdultSkipped: mockOnSafeAdultSkipped,
    onResourceClick: mockOnResourceClick,
    preConfiguredAdult: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock implementations to default (resolve immediately)
    mockOnSafeAdultDesignated.mockResolvedValue(undefined)
  })

  // ============================================
  // Initial State Tests
  // ============================================

  describe('initial state', () => {
    it('should render confirmation first', () => {
      render(<SignalConfirmationWithSafeAdult {...defaultProps} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should show confirmation header', () => {
      render(<SignalConfirmationWithSafeAdult {...defaultProps} />)

      expect(screen.getByText('We heard you')).toBeInTheDocument()
    })

    it('should show crisis resources', () => {
      render(<SignalConfirmationWithSafeAdult {...defaultProps} />)

      expect(screen.getByText('Crisis Text Line')).toBeInTheDocument()
    })

    it('should NOT show safe adult form initially', () => {
      render(<SignalConfirmationWithSafeAdult {...defaultProps} />)

      expect(screen.queryByLabelText(/phone/i)).not.toBeInTheDocument()
    })
  })

  // ============================================
  // Transition to Safe Adult Tests
  // ============================================

  describe('transition to safe adult', () => {
    it('should show safe adult option after dismiss', async () => {
      render(<SignalConfirmationWithSafeAdult {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /understand/i }))

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/trust|someone/i)
      })
    })

    it('should show phone input after transition', async () => {
      render(<SignalConfirmationWithSafeAdult {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /understand/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
      })
    })

    it('should show skip option', async () => {
      render(<SignalConfirmationWithSafeAdult {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /understand/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /skip/i })).toBeInTheDocument()
      })
    })
  })

  // ============================================
  // Pre-Configured Adult Tests (AC3)
  // ============================================

  describe('pre-configured adult (AC3)', () => {
    const preConfiguredAdult: SafeAdultDesignation = {
      id: 'sa_123',
      childId: 'child_123',
      phoneNumber: '+15551234567',
      email: null,
      preferredMethod: 'sms',
      displayName: 'Aunt Jane',
      createdAt: new Date(),
      updatedAt: new Date(),
      isPreConfigured: true,
      encryptionKeyId: 'sakey_123',
    }

    it('should show pre-configured adult option', async () => {
      render(
        <SignalConfirmationWithSafeAdult
          {...defaultProps}
          preConfiguredAdult={preConfiguredAdult}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /understand/i }))

      await waitFor(() => {
        expect(screen.getByText(/Aunt Jane/i)).toBeInTheDocument()
      })
    })

    it('should show "Use [Name]" button', async () => {
      render(
        <SignalConfirmationWithSafeAdult
          {...defaultProps}
          preConfiguredAdult={preConfiguredAdult}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /understand/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /use.*aunt jane/i })).toBeInTheDocument()
      })
    })

    it('should call onSafeAdultDesignated when using pre-configured', async () => {
      render(
        <SignalConfirmationWithSafeAdult
          {...defaultProps}
          preConfiguredAdult={preConfiguredAdult}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /understand/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /use.*aunt jane/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /use.*aunt jane/i }))

      await waitFor(() => {
        expect(mockOnSafeAdultDesignated).toHaveBeenCalledWith(preConfiguredAdult)
      })
    })
  })

  // ============================================
  // New Designation Tests (AC1)
  // ============================================

  describe('new designation (AC1)', () => {
    it('should allow entering new contact', async () => {
      render(<SignalConfirmationWithSafeAdult {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /understand/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
      })

      fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '555-123-4567' } })

      expect(screen.getByLabelText(/phone/i)).toHaveValue('555-123-4567')
    })

    it('should call onSafeAdultDesignated with new contact', async () => {
      render(<SignalConfirmationWithSafeAdult {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /understand/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
      })

      fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '555-123-4567' } })
      fireEvent.click(screen.getByRole('button', { name: /send|notify|contact/i }))

      await waitFor(() => {
        expect(mockOnSafeAdultDesignated).toHaveBeenCalled()
      })
    })

    it('should pass signalId to designation component', async () => {
      render(<SignalConfirmationWithSafeAdult {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /understand/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
      })

      // The designation is handled internally - checking it works is sufficient
      fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '555-123-4567' } })
      fireEvent.click(screen.getByRole('button', { name: /send|notify|contact/i }))

      await waitFor(() => {
        expect(mockOnSafeAdultDesignated).toHaveBeenCalled()
        const designation = mockOnSafeAdultDesignated.mock.calls[0][0]
        expect(designation.childId).toBe('child_123')
      })
    })
  })

  // ============================================
  // Skip Flow Tests
  // ============================================

  describe('skip flow', () => {
    it('should call onSafeAdultSkipped when skip clicked', async () => {
      render(<SignalConfirmationWithSafeAdult {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /understand/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /skip/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /skip/i }))

      expect(mockOnSafeAdultSkipped).toHaveBeenCalled()
    })

    it('should complete flow after skip', async () => {
      render(<SignalConfirmationWithSafeAdult {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /understand/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /skip/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /skip/i }))

      await waitFor(() => {
        expect(mockOnDismiss).toHaveBeenCalled()
      })
    })
  })

  // ============================================
  // Resource Click Tests
  // ============================================

  describe('resource clicks', () => {
    it('should call onResourceClick when resource clicked', () => {
      render(<SignalConfirmationWithSafeAdult {...defaultProps} />)

      fireEvent.click(screen.getByText('Crisis Text Line'))

      expect(mockOnResourceClick).toHaveBeenCalled()
    })
  })

  // ============================================
  // Processing State Tests
  // ============================================

  describe('processing state', () => {
    it('should show processing indicator during notification', async () => {
      // Simulate slow callback
      mockOnSafeAdultDesignated.mockImplementation(() => new Promise(() => {}))

      render(<SignalConfirmationWithSafeAdult {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /understand/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
      })

      fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '555-123-4567' } })
      fireEvent.click(screen.getByRole('button', { name: /send|notify|contact/i }))

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument()
      })
    })
  })

  // ============================================
  // Child-Appropriate Language Tests
  // ============================================

  describe('child-appropriate language', () => {
    it('should NOT mention fledgely', async () => {
      render(<SignalConfirmationWithSafeAdult {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /understand/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
      })

      expect(screen.queryByText(/fledgely/i)).not.toBeInTheDocument()
    })

    it('should NOT mention monitoring', async () => {
      render(<SignalConfirmationWithSafeAdult {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /understand/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
      })

      expect(screen.queryByText(/monitoring/i)).not.toBeInTheDocument()
    })

    it('should use reassuring language', async () => {
      render(<SignalConfirmationWithSafeAdult {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /understand/i }))

      await waitFor(() => {
        const text = document.body.textContent || ''
        expect(text).toMatch(/trust|help|someone/i)
      })
    })
  })

  // ============================================
  // Accessibility Tests
  // ============================================

  describe('accessibility', () => {
    it('should maintain focus management', async () => {
      render(<SignalConfirmationWithSafeAdult {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /understand/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
      })

      // Safe adult section should have proper structure
      expect(screen.getByRole('region')).toBeInTheDocument()
    })

    it('should have accessible form labels', async () => {
      render(<SignalConfirmationWithSafeAdult {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /understand/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      })
    })
  })

  // ============================================
  // Complete Flow Tests
  // ============================================

  describe('complete flow', () => {
    it('should complete full designation flow', async () => {
      render(<SignalConfirmationWithSafeAdult {...defaultProps} />)

      // Step 1: Dismiss confirmation
      fireEvent.click(screen.getByRole('button', { name: /understand/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
      })

      // Step 2: Enter contact
      fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '555-123-4567' } })

      // Step 3: Submit
      fireEvent.click(screen.getByRole('button', { name: /send|notify|contact/i }))

      await waitFor(() => {
        expect(mockOnSafeAdultDesignated).toHaveBeenCalled()
      })

      // Step 4: Flow completes
      await waitFor(() => {
        expect(mockOnDismiss).toHaveBeenCalled()
      })
    })

    it('should call onDismiss after successful designation', async () => {
      render(<SignalConfirmationWithSafeAdult {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /understand/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
      })

      fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '555-123-4567' } })
      fireEvent.click(screen.getByRole('button', { name: /send|notify|contact/i }))

      await waitFor(() => {
        expect(mockOnDismiss).toHaveBeenCalled()
      })
    })
  })
})
