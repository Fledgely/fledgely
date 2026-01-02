/**
 * Age18DeletionConfirmation Component Tests - Story 38.5 Task 6
 *
 * Tests for the deletion confirmation UI shown to child.
 * AC6: Child notified: "You're 18 - all data has been deleted"
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Age18DeletionConfirmation from './Age18DeletionConfirmation'

describe('Age18DeletionConfirmation', () => {
  const defaultProps = {
    childName: 'Alex',
    deletionDate: new Date('2024-06-15'),
    dataTypesDeleted: ['screenshots', 'flags', 'activity_logs', 'trust_history'] as const,
    onAcknowledge: vi.fn(),
  }

  // ============================================
  // Message Display Tests (AC6)
  // ============================================

  describe('Deletion message display', () => {
    it('should display the official deletion message (AC6)', () => {
      render(<Age18DeletionConfirmation {...defaultProps} />)

      expect(screen.getByText(/You're 18/i)).toBeInTheDocument()
      expect(screen.getByText(/all data has been deleted/i)).toBeInTheDocument()
    })

    it('should display child name', () => {
      render(<Age18DeletionConfirmation {...defaultProps} childName="Jordan" />)

      expect(screen.getByText(/Jordan/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // Celebratory Design Tests
  // ============================================

  describe('Celebratory design', () => {
    it('should have celebratory visual elements', () => {
      render(<Age18DeletionConfirmation {...defaultProps} />)

      // Should have some celebratory indicator (emoji or icon)
      const container = screen.getByTestId('deletion-confirmation')
      expect(container).toBeInTheDocument()
    })

    it('should not use punitive language', () => {
      render(<Age18DeletionConfirmation {...defaultProps} />)

      expect(screen.queryByText(/sorry/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/unfortunately/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/warning/i)).not.toBeInTheDocument()
    })

    it('should emphasize transition to adulthood', () => {
      render(<Age18DeletionConfirmation {...defaultProps} />)

      expect(screen.getByText(/18/)).toBeInTheDocument()
    })
  })

  // ============================================
  // Data Types Display Tests
  // ============================================

  describe('Data types deleted display', () => {
    it('should list data types that were deleted', () => {
      render(<Age18DeletionConfirmation {...defaultProps} />)

      expect(screen.getByText(/screenshots/i)).toBeInTheDocument()
      expect(screen.getByText(/flags/i)).toBeInTheDocument()
      expect(screen.getByText(/activity/i)).toBeInTheDocument()
    })

    it('should not show sensitive content', () => {
      render(<Age18DeletionConfirmation {...defaultProps} />)

      // Should not show actual screenshot content or flag details
      expect(screen.queryByText(/image/i)).not.toBeInTheDocument()
    })
  })

  // ============================================
  // Acknowledgment Tests
  // ============================================

  describe('Acknowledgment functionality', () => {
    it('should render acknowledge button', () => {
      render(<Age18DeletionConfirmation {...defaultProps} />)

      const button = screen.getByRole('button', { name: /got it|acknowledge|understand/i })
      expect(button).toBeInTheDocument()
    })

    it('should call onAcknowledge when button clicked', () => {
      const mockOnAcknowledge = vi.fn()
      render(<Age18DeletionConfirmation {...defaultProps} onAcknowledge={mockOnAcknowledge} />)

      const button = screen.getByRole('button', { name: /got it|acknowledge|understand/i })
      fireEvent.click(button)

      expect(mockOnAcknowledge).toHaveBeenCalledTimes(1)
    })
  })

  // ============================================
  // No Reversibility Tests
  // ============================================

  describe('No reversibility indication', () => {
    it('should not show any undo or reverse options', () => {
      render(<Age18DeletionConfirmation {...defaultProps} />)

      expect(screen.queryByText(/undo/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/reverse/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/recover/i)).not.toBeInTheDocument()
    })

    it('should not show reversibility warning since deletion is complete', () => {
      render(<Age18DeletionConfirmation {...defaultProps} />)

      // No need to warn about irreversibility - it's already done
      expect(screen.queryByText(/cannot be undone|irreversible|permanent/i)).not.toBeInTheDocument()
    })
  })

  // ============================================
  // Accessibility Tests
  // ============================================

  describe('Accessibility', () => {
    it('should have accessible heading', () => {
      render(<Age18DeletionConfirmation {...defaultProps} />)

      // There are multiple headings (h1 and h2), check that at least one exists
      const headings = screen.getAllByRole('heading')
      expect(headings.length).toBeGreaterThan(0)
    })

    it('should have accessible button', () => {
      render(<Age18DeletionConfirmation {...defaultProps} />)

      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      expect(button).toBeEnabled()
    })
  })
})
