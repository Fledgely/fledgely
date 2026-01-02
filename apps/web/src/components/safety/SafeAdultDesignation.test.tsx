/**
 * SafeAdultDesignation Component Tests - Story 7.5.4 Task 5
 *
 * Tests for designating safe adult during signal.
 * AC1: Safe adult notification option
 * AC6: Phone and email support
 *
 * CRITICAL: Component uses child-appropriate language.
 * Does NOT mention fledgely or monitoring.
 * TDD approach: Write tests first, then implementation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SafeAdultDesignation } from './SafeAdultDesignation'
import type { SafeAdultDesignation as SafeAdultDesignationType } from '@fledgely/shared/contracts/safeAdult'

describe('SafeAdultDesignation', () => {
  const mockOnDesignate = vi.fn()
  const mockOnSkip = vi.fn()

  const defaultProps = {
    signalId: 'sig_123',
    childId: 'child_123',
    preConfiguredAdult: null,
    onDesignate: mockOnDesignate,
    onSkip: mockOnSkip,
    isProcessing: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // Rendering Tests
  // ============================================

  describe('rendering', () => {
    it('should render component', () => {
      render(<SafeAdultDesignation {...defaultProps} />)

      expect(screen.getByRole('region')).toBeInTheDocument()
    })

    it('should render heading with child-appropriate text', () => {
      render(<SafeAdultDesignation {...defaultProps} />)

      expect(screen.getByRole('heading')).toBeInTheDocument()
    })

    it('should NOT mention fledgely', () => {
      render(<SafeAdultDesignation {...defaultProps} />)

      expect(screen.queryByText(/fledgely/i)).not.toBeInTheDocument()
    })

    it('should NOT mention monitoring', () => {
      render(<SafeAdultDesignation {...defaultProps} />)

      expect(screen.queryByText(/monitoring/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/tracked/i)).not.toBeInTheDocument()
    })

    it('should render phone input', () => {
      render(<SafeAdultDesignation {...defaultProps} />)

      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
    })

    it('should render email input', () => {
      render(<SafeAdultDesignation {...defaultProps} />)

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    })

    it('should render skip button', () => {
      render(<SafeAdultDesignation {...defaultProps} />)

      expect(screen.getByRole('button', { name: /skip/i })).toBeInTheDocument()
    })

    it('should render submit button', () => {
      render(<SafeAdultDesignation {...defaultProps} />)

      expect(screen.getByRole('button', { name: /send|notify|contact/i })).toBeInTheDocument()
    })
  })

  // ============================================
  // Pre-Configured Adult Tests
  // ============================================

  describe('with pre-configured adult', () => {
    const preConfiguredAdult: SafeAdultDesignationType = {
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

    it('should show pre-configured adult option', () => {
      render(<SafeAdultDesignation {...defaultProps} preConfiguredAdult={preConfiguredAdult} />)

      expect(screen.getByText(/Aunt Jane/i)).toBeInTheDocument()
    })

    it('should show "Use [Name]" button', () => {
      render(<SafeAdultDesignation {...defaultProps} preConfiguredAdult={preConfiguredAdult} />)

      expect(screen.getByRole('button', { name: /use.*aunt jane/i })).toBeInTheDocument()
    })

    it('should call onDesignate with pre-configured adult when selected', () => {
      render(<SafeAdultDesignation {...defaultProps} preConfiguredAdult={preConfiguredAdult} />)

      fireEvent.click(screen.getByRole('button', { name: /use.*aunt jane/i }))

      expect(mockOnDesignate).toHaveBeenCalledWith(preConfiguredAdult)
    })

    it('should still allow entering different contact', () => {
      render(<SafeAdultDesignation {...defaultProps} preConfiguredAdult={preConfiguredAdult} />)

      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // Phone Input Tests
  // ============================================

  describe('phone input', () => {
    it('should accept valid phone number', () => {
      render(<SafeAdultDesignation {...defaultProps} />)

      const phoneInput = screen.getByLabelText(/phone/i)
      fireEvent.change(phoneInput, { target: { value: '555-123-4567' } })

      expect(phoneInput).toHaveValue('555-123-4567')
    })

    it('should not submit with invalid phone', async () => {
      render(<SafeAdultDesignation {...defaultProps} />)

      const phoneInput = screen.getByLabelText(/phone/i)
      fireEvent.change(phoneInput, { target: { value: 'abc' } })
      fireEvent.click(screen.getByRole('button', { name: /send|notify|contact/i }))

      // Invalid phone should not trigger onDesignate
      await waitFor(() => {
        expect(mockOnDesignate).not.toHaveBeenCalled()
      })
    })

    it('should accept various phone formats', () => {
      render(<SafeAdultDesignation {...defaultProps} />)

      const phoneInput = screen.getByLabelText(/phone/i)
      fireEvent.change(phoneInput, { target: { value: '(555) 123-4567' } })

      expect(phoneInput).toHaveValue('(555) 123-4567')
    })
  })

  // ============================================
  // Email Input Tests
  // ============================================

  describe('email input', () => {
    it('should accept valid email', () => {
      render(<SafeAdultDesignation {...defaultProps} />)

      const emailInput = screen.getByLabelText(/email/i)
      fireEvent.change(emailInput, { target: { value: 'aunt@example.com' } })

      expect(emailInput).toHaveValue('aunt@example.com')
    })

    it('should not submit with invalid email', async () => {
      render(<SafeAdultDesignation {...defaultProps} />)

      const emailInput = screen.getByLabelText(/email/i)
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
      fireEvent.click(screen.getByRole('button', { name: /send|notify|contact/i }))

      // Invalid email should not trigger onDesignate
      await waitFor(() => {
        expect(mockOnDesignate).not.toHaveBeenCalled()
      })
    })
  })

  // ============================================
  // Form Submission Tests
  // ============================================

  describe('form submission', () => {
    it('should call onDesignate with phone', async () => {
      render(<SafeAdultDesignation {...defaultProps} />)

      const phoneInput = screen.getByLabelText(/phone/i)
      fireEvent.change(phoneInput, { target: { value: '555-123-4567' } })
      fireEvent.click(screen.getByRole('button', { name: /send|notify|contact/i }))

      await waitFor(() => {
        expect(mockOnDesignate).toHaveBeenCalled()
      })
    })

    it('should call onDesignate with email', async () => {
      render(<SafeAdultDesignation {...defaultProps} />)

      const emailInput = screen.getByLabelText(/email/i)
      fireEvent.change(emailInput, { target: { value: 'aunt@example.com' } })
      fireEvent.click(screen.getByRole('button', { name: /send|notify|contact/i }))

      await waitFor(() => {
        expect(mockOnDesignate).toHaveBeenCalled()
      })
    })

    it('should call onDesignate with both contacts', async () => {
      render(<SafeAdultDesignation {...defaultProps} />)

      const phoneInput = screen.getByLabelText(/phone/i)
      const emailInput = screen.getByLabelText(/email/i)
      fireEvent.change(phoneInput, { target: { value: '555-123-4567' } })
      fireEvent.change(emailInput, { target: { value: 'aunt@example.com' } })
      fireEvent.click(screen.getByRole('button', { name: /send|notify|contact/i }))

      await waitFor(() => {
        expect(mockOnDesignate).toHaveBeenCalled()
      })
    })

    it('should require at least one contact method', async () => {
      render(<SafeAdultDesignation {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /send|notify|contact/i }))

      await waitFor(() => {
        expect(screen.getByText(/phone number or email address/i)).toBeInTheDocument()
      })
    })
  })

  // ============================================
  // Skip Button Tests
  // ============================================

  describe('skip button', () => {
    it('should call onSkip when clicked', () => {
      render(<SafeAdultDesignation {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /skip/i }))

      expect(mockOnSkip).toHaveBeenCalled()
    })

    it('should be clearly visible', () => {
      render(<SafeAdultDesignation {...defaultProps} />)

      const skipButton = screen.getByRole('button', { name: /skip/i })
      expect(skipButton).toBeVisible()
    })
  })

  // ============================================
  // Processing State Tests
  // ============================================

  describe('processing state', () => {
    it('should disable submit button when processing', () => {
      render(<SafeAdultDesignation {...defaultProps} isProcessing={true} />)

      const submitButton = screen.getByRole('button', { name: /send|notify|contact|sending/i })
      expect(submitButton).toBeDisabled()
    })

    it('should disable skip button when processing', () => {
      render(<SafeAdultDesignation {...defaultProps} isProcessing={true} />)

      const skipButton = screen.getByRole('button', { name: /skip/i })
      expect(skipButton).toBeDisabled()
    })

    it('should show loading indicator when processing', () => {
      render(<SafeAdultDesignation {...defaultProps} isProcessing={true} />)

      expect(screen.getByRole('status')).toBeInTheDocument()
    })
  })

  // ============================================
  // Accessibility Tests
  // ============================================

  describe('accessibility', () => {
    it('should have accessible form labels', () => {
      render(<SafeAdultDesignation {...defaultProps} />)

      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    })

    it('should have form role', () => {
      render(<SafeAdultDesignation {...defaultProps} />)

      expect(screen.getByRole('form')).toBeInTheDocument()
    })

    it('should announce errors to screen readers', async () => {
      render(<SafeAdultDesignation {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /send|notify|contact/i }))

      await waitFor(() => {
        const errorElement = screen.getByText(/phone number or email address/i)
        expect(errorElement).toHaveAttribute('role', 'alert')
      })
    })
  })

  // ============================================
  // Child-Appropriate Language Tests
  // ============================================

  describe('child-appropriate language', () => {
    it('should use simple language in headings', () => {
      render(<SafeAdultDesignation {...defaultProps} />)

      const heading = screen.getByRole('heading')
      expect(heading.textContent).toMatch(/trust|adult|someone|help/i)
    })

    it('should NOT use scary terminology', () => {
      render(<SafeAdultDesignation {...defaultProps} />)

      expect(screen.queryByText(/crisis/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/emergency/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/danger/i)).not.toBeInTheDocument()
    })

    it('should use reassuring language', () => {
      render(<SafeAdultDesignation {...defaultProps} />)

      const text = document.body.textContent || ''
      expect(text).toMatch(/help|support|trust|safe/i)
    })
  })
})
