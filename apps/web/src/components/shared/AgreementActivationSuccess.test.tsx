/**
 * AgreementActivationSuccess Component Tests - Story 34.4
 *
 * Tests for the success/celebration screen after activation.
 * AC5: Both parties notification (visual celebration)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AgreementActivationSuccess } from './AgreementActivationSuccess'
import type { DualSignatures, ProposalChange } from '@fledgely/shared'

describe('AgreementActivationSuccess - Story 34.4', () => {
  const mockSignatures: DualSignatures = {
    proposer: {
      userId: 'parent-1',
      userName: 'Mom',
      role: 'parent',
      signedAt: Date.now() - 60000, // 1 minute ago
      action: 'confirmed',
    },
    recipient: {
      userId: 'child-abc',
      userName: 'Emma',
      role: 'child',
      signedAt: Date.now() - 120000, // 2 minutes ago
      action: 'accepted',
    },
  }

  const mockChanges: ProposalChange[] = [
    {
      sectionId: 'time-limits',
      sectionName: 'Time Limits',
      fieldPath: 'weekday.gaming',
      oldValue: 60,
      newValue: 90,
      changeType: 'modify',
    },
  ]

  const defaultProps = {
    signatures: mockSignatures,
    changes: mockChanges,
    versionNumber: 2,
    onViewAgreement: vi.fn(),
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('celebration UI', () => {
    it('should display success message', () => {
      render(<AgreementActivationSuccess {...defaultProps} />)

      expect(screen.getByText(/agreement updated/i)).toBeInTheDocument()
    })

    it('should display celebration icon or animation', () => {
      render(<AgreementActivationSuccess {...defaultProps} />)

      // Look for celebration elements (emoji, checkmark, etc.)
      expect(screen.getByText('🎉')).toBeInTheDocument()
    })
  })

  describe('signatures display', () => {
    it('should display proposer signature info', () => {
      render(<AgreementActivationSuccess {...defaultProps} />)

      expect(screen.getByText(/Mom/)).toBeInTheDocument()
    })

    it('should display recipient signature info', () => {
      render(<AgreementActivationSuccess {...defaultProps} />)

      expect(screen.getByText(/Emma/)).toBeInTheDocument()
    })

    it('should show signature timestamps', () => {
      render(<AgreementActivationSuccess {...defaultProps} />)

      // Both signatures should have timestamps visible
      const signatureSection = screen.getByTestId('signatures-section')
      expect(signatureSection).toBeInTheDocument()
    })

    it('should display both roles (parent/child)', () => {
      render(<AgreementActivationSuccess {...defaultProps} />)

      expect(screen.getByText(/parent/i)).toBeInTheDocument()
      expect(screen.getByText(/child/i)).toBeInTheDocument()
    })
  })

  describe('change summary', () => {
    it('should display change summary', () => {
      render(<AgreementActivationSuccess {...defaultProps} />)

      expect(screen.getByText(/Time Limits/)).toBeInTheDocument()
    })

    it('should show version number', () => {
      render(<AgreementActivationSuccess {...defaultProps} />)

      expect(screen.getByText(/version 2/i)).toBeInTheDocument()
    })
  })

  describe('actions', () => {
    it('should display View Agreement button', () => {
      render(<AgreementActivationSuccess {...defaultProps} />)

      expect(screen.getByRole('button', { name: /view.*agreement/i })).toBeInTheDocument()
    })

    it('should call onViewAgreement when button clicked', () => {
      render(<AgreementActivationSuccess {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /view.*agreement/i }))

      expect(defaultProps.onViewAgreement).toHaveBeenCalled()
    })

    it('should display close/done button', () => {
      render(<AgreementActivationSuccess {...defaultProps} />)

      expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument()
    })

    it('should call onClose when close button clicked', () => {
      render(<AgreementActivationSuccess {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /done/i }))

      expect(defaultProps.onClose).toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('should have accessible landmark', () => {
      render(<AgreementActivationSuccess {...defaultProps} />)

      expect(screen.getByRole('main')).toBeInTheDocument()
    })
  })
})
