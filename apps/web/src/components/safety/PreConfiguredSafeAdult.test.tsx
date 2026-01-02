/**
 * PreConfiguredSafeAdult Component Tests - Story 7.5.4 Task 6
 *
 * Tests for pre-configuring safe adult in protected resources.
 * AC3: Pre-configured safe adult
 *
 * CRITICAL: Uses child-appropriate language.
 * Configuration stored encrypted, inaccessible to parents.
 * TDD approach: Write tests first, then implementation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PreConfiguredSafeAdult } from './PreConfiguredSafeAdult'
import type { SafeAdultDesignation } from '@fledgely/shared/contracts/safeAdult'

describe('PreConfiguredSafeAdult', () => {
  const mockOnSave = vi.fn()
  const mockOnRemove = vi.fn()

  const defaultProps = {
    childId: 'child_123',
    existingDesignation: null,
    onSave: mockOnSave,
    onRemove: mockOnRemove,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // Rendering Tests
  // ============================================

  describe('rendering', () => {
    it('should render component', () => {
      render(<PreConfiguredSafeAdult {...defaultProps} />)

      expect(screen.getByRole('region')).toBeInTheDocument()
    })

    it('should render heading', () => {
      render(<PreConfiguredSafeAdult {...defaultProps} />)

      expect(screen.getByRole('heading')).toBeInTheDocument()
    })

    it('should NOT mention fledgely', () => {
      render(<PreConfiguredSafeAdult {...defaultProps} />)

      expect(screen.queryByText(/fledgely/i)).not.toBeInTheDocument()
    })

    it('should NOT mention monitoring', () => {
      render(<PreConfiguredSafeAdult {...defaultProps} />)

      expect(screen.queryByText(/monitoring/i)).not.toBeInTheDocument()
    })

    it('should render display name input', () => {
      render(<PreConfiguredSafeAdult {...defaultProps} />)

      expect(screen.getByLabelText(/name|who/i)).toBeInTheDocument()
    })

    it('should render phone input', () => {
      render(<PreConfiguredSafeAdult {...defaultProps} />)

      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
    })

    it('should render email input', () => {
      render(<PreConfiguredSafeAdult {...defaultProps} />)

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    })

    it('should render save button', () => {
      render(<PreConfiguredSafeAdult {...defaultProps} />)

      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
    })
  })

  // ============================================
  // Existing Designation Tests
  // ============================================

  describe('with existing designation', () => {
    const existingDesignation: SafeAdultDesignation = {
      id: 'sa_123',
      childId: 'child_123',
      phoneNumber: '+15551234567',
      email: 'aunt@example.com',
      preferredMethod: 'sms',
      displayName: 'Aunt Jane',
      createdAt: new Date(),
      updatedAt: new Date(),
      isPreConfigured: true,
      encryptionKeyId: 'sakey_123',
    }

    it('should show existing display name', () => {
      render(<PreConfiguredSafeAdult {...defaultProps} existingDesignation={existingDesignation} />)

      const nameInput = screen.getByLabelText(/name|who/i)
      expect(nameInput).toHaveValue('Aunt Jane')
    })

    it('should show existing phone', () => {
      render(<PreConfiguredSafeAdult {...defaultProps} existingDesignation={existingDesignation} />)

      const phoneInput = screen.getByLabelText(/phone/i)
      expect(phoneInput).toHaveValue('+15551234567')
    })

    it('should show existing email', () => {
      render(<PreConfiguredSafeAdult {...defaultProps} existingDesignation={existingDesignation} />)

      const emailInput = screen.getByLabelText(/email address/i)
      expect(emailInput).toHaveValue('aunt@example.com')
    })

    it('should show remove button', () => {
      render(<PreConfiguredSafeAdult {...defaultProps} existingDesignation={existingDesignation} />)

      expect(screen.getByRole('button', { name: /remove|delete/i })).toBeInTheDocument()
    })

    it('should show preferred method selector', () => {
      render(<PreConfiguredSafeAdult {...defaultProps} existingDesignation={existingDesignation} />)

      expect(screen.getByRole('group', { name: /prefer|contact/i })).toBeInTheDocument()
    })
  })

  // ============================================
  // Form Input Tests
  // ============================================

  describe('form inputs', () => {
    it('should update display name', () => {
      render(<PreConfiguredSafeAdult {...defaultProps} />)

      const nameInput = screen.getByLabelText(/name|who/i)
      fireEvent.change(nameInput, { target: { value: 'Uncle Bob' } })

      expect(nameInput).toHaveValue('Uncle Bob')
    })

    it('should update phone', () => {
      render(<PreConfiguredSafeAdult {...defaultProps} />)

      const phoneInput = screen.getByLabelText(/phone/i)
      fireEvent.change(phoneInput, { target: { value: '555-123-4567' } })

      expect(phoneInput).toHaveValue('555-123-4567')
    })

    it('should update email', () => {
      render(<PreConfiguredSafeAdult {...defaultProps} />)

      const emailInput = screen.getByLabelText(/email/i)
      fireEvent.change(emailInput, { target: { value: 'uncle@example.com' } })

      expect(emailInput).toHaveValue('uncle@example.com')
    })
  })

  // ============================================
  // Save Tests
  // ============================================

  describe('save', () => {
    it('should call onSave with form data', async () => {
      render(<PreConfiguredSafeAdult {...defaultProps} />)

      fireEvent.change(screen.getByLabelText(/name|who/i), { target: { value: 'Uncle Bob' } })
      fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '555-123-4567' } })
      fireEvent.click(screen.getByRole('button', { name: /save/i }))

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled()
      })
    })

    it('should require display name', async () => {
      render(<PreConfiguredSafeAdult {...defaultProps} />)

      fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '555-123-4567' } })
      fireEvent.click(screen.getByRole('button', { name: /save/i }))

      await waitFor(() => {
        expect(mockOnSave).not.toHaveBeenCalled()
      })
    })

    it('should require at least one contact method', async () => {
      render(<PreConfiguredSafeAdult {...defaultProps} />)

      fireEvent.change(screen.getByLabelText(/name|who/i), { target: { value: 'Uncle Bob' } })
      fireEvent.click(screen.getByRole('button', { name: /save/i }))

      await waitFor(() => {
        expect(mockOnSave).not.toHaveBeenCalled()
      })
    })

    it('should save with phone only', async () => {
      render(<PreConfiguredSafeAdult {...defaultProps} />)

      fireEvent.change(screen.getByLabelText(/name|who/i), { target: { value: 'Uncle Bob' } })
      fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '555-123-4567' } })
      fireEvent.click(screen.getByRole('button', { name: /save/i }))

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled()
      })
    })

    it('should save with email only', async () => {
      render(<PreConfiguredSafeAdult {...defaultProps} />)

      fireEvent.change(screen.getByLabelText(/name|who/i), { target: { value: 'Uncle Bob' } })
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'uncle@example.com' } })
      fireEvent.click(screen.getByRole('button', { name: /save/i }))

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled()
      })
    })
  })

  // ============================================
  // Remove Tests
  // ============================================

  describe('remove', () => {
    const existingDesignation: SafeAdultDesignation = {
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

    it('should show confirmation before remove', async () => {
      render(<PreConfiguredSafeAdult {...defaultProps} existingDesignation={existingDesignation} />)

      fireEvent.click(screen.getByRole('button', { name: /remove|delete/i }))

      await waitFor(() => {
        expect(screen.getByText(/sure|confirm/i)).toBeInTheDocument()
      })
    })

    it('should call onRemove after confirmation', async () => {
      render(<PreConfiguredSafeAdult {...defaultProps} existingDesignation={existingDesignation} />)

      fireEvent.click(screen.getByRole('button', { name: /remove|delete/i }))

      await waitFor(() => {
        expect(screen.getByText(/sure|confirm/i)).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /^yes/i }))

      await waitFor(() => {
        expect(mockOnRemove).toHaveBeenCalled()
      })
    })

    it('should not show remove button when no existing designation', () => {
      render(<PreConfiguredSafeAdult {...defaultProps} existingDesignation={null} />)

      expect(screen.queryByRole('button', { name: /remove|delete/i })).not.toBeInTheDocument()
    })
  })

  // ============================================
  // Accessibility Tests
  // ============================================

  describe('accessibility', () => {
    it('should have accessible labels', () => {
      render(<PreConfiguredSafeAdult {...defaultProps} />)

      expect(screen.getByLabelText(/name|who/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    })

    it('should have form role', () => {
      render(<PreConfiguredSafeAdult {...defaultProps} />)

      expect(screen.getByRole('form')).toBeInTheDocument()
    })
  })

  // ============================================
  // Child-Appropriate Language Tests
  // ============================================

  describe('child-appropriate language', () => {
    it('should use simple language', () => {
      render(<PreConfiguredSafeAdult {...defaultProps} />)

      const heading = screen.getByRole('heading')
      expect(heading.textContent).toMatch(/trusted|adult|someone|help/i)
    })

    it('should NOT use scary terminology', () => {
      render(<PreConfiguredSafeAdult {...defaultProps} />)

      expect(screen.queryByText(/crisis/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/emergency/i)).not.toBeInTheDocument()
    })
  })
})
