/**
 * Age18PreDeletionNotice Component Tests - Story 38.5 Task 7
 *
 * Tests for the pre-deletion warning UI shown before 18th birthday.
 * AC2: When child turns 18, all monitoring data is automatically deleted
 * AC5: Deletion occurs regardless of parent wishes
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Age18PreDeletionNotice from './Age18PreDeletionNotice'

describe('Age18PreDeletionNotice', () => {
  const defaultProps = {
    childName: 'Alex',
    daysUntil18: 30,
    eighteenthBirthday: new Date('2024-07-15'),
    viewerType: 'child' as const,
    onDismiss: vi.fn(),
  }

  // ============================================
  // Days Count Display Tests
  // ============================================

  describe('Days countdown display', () => {
    it('should display days until 18', () => {
      render(<Age18PreDeletionNotice {...defaultProps} daysUntil18={30} />)

      // Look for the countdown badge specifically
      expect(screen.getByText(/30 days remaining/i)).toBeInTheDocument()
    })

    it('should handle 1 day remaining', () => {
      render(<Age18PreDeletionNotice {...defaultProps} daysUntil18={1} />)

      expect(screen.getByText(/1 day remaining/i)).toBeInTheDocument()
    })

    it('should display 7 days correctly', () => {
      render(<Age18PreDeletionNotice {...defaultProps} daysUntil18={7} />)

      expect(screen.getByText(/7 days remaining/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // Child Viewer Tests
  // ============================================

  describe('Child viewer messaging', () => {
    it('should show child-specific message', () => {
      render(<Age18PreDeletionNotice {...defaultProps} viewerType="child" />)

      expect(screen.getByText(/your.*monitoring data/i)).toBeInTheDocument()
      expect(screen.getByText(/deleted/i)).toBeInTheDocument()
    })

    it('should use second person for child viewer', () => {
      render(<Age18PreDeletionNotice {...defaultProps} viewerType="child" childName="Jordan" />)

      // Child should see "your" in the main message
      expect(screen.getByText(/your.*monitoring data/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // Parent Viewer Tests
  // ============================================

  describe('Parent viewer messaging', () => {
    it('should show child name to parent viewer', () => {
      render(<Age18PreDeletionNotice {...defaultProps} viewerType="parent" childName="Alex" />)

      // Child name appears multiple times, so use getAllByText
      const nameMatches = screen.getAllByText(/Alex/)
      expect(nameMatches.length).toBeGreaterThan(0)
    })

    it('should indicate data will be deleted for parent', () => {
      render(<Age18PreDeletionNotice {...defaultProps} viewerType="parent" />)

      // "deleted" appears multiple times, so use getAllByText
      const deletedMatches = screen.getAllByText(/deleted/i)
      expect(deletedMatches.length).toBeGreaterThan(0)
    })
  })

  // ============================================
  // Parent Cannot Prevent Tests (AC5)
  // ============================================

  describe('Deletion regardless of parent wishes (AC5)', () => {
    it('should not show any prevent/delay options for parent', () => {
      render(<Age18PreDeletionNotice {...defaultProps} viewerType="parent" />)

      // Should not have buttons for prevent/delay/stop
      expect(screen.queryByRole('button', { name: /prevent/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /delay/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /stop/i })).not.toBeInTheDocument()
    })

    it('should indicate deletion is automatic', () => {
      render(<Age18PreDeletionNotice {...defaultProps} viewerType="parent" />)

      // The text about automatic deletion appears (may match multiple times)
      const automaticMatches = screen.getAllByText(/automatically/i)
      expect(automaticMatches.length).toBeGreaterThan(0)
    })
  })

  // ============================================
  // Data Export Link Tests
  // ============================================

  describe('Data export option link', () => {
    it('should show data export link for parent', () => {
      render(<Age18PreDeletionNotice {...defaultProps} viewerType="parent" />)

      expect(screen.getByText(/export/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // Dismiss Behavior Tests
  // ============================================

  describe('Dismiss behavior', () => {
    it('should call onDismiss when dismiss button clicked', () => {
      const mockOnDismiss = vi.fn()
      render(<Age18PreDeletionNotice {...defaultProps} onDismiss={mockOnDismiss} />)

      const dismissButton = screen.getByRole('button', { name: /dismiss|close|later/i })
      fireEvent.click(dismissButton)

      expect(mockOnDismiss).toHaveBeenCalledTimes(1)
    })

    it('should not render dismiss button when onDismiss not provided', () => {
      render(<Age18PreDeletionNotice {...defaultProps} onDismiss={undefined} />)

      expect(screen.queryByRole('button', { name: /dismiss|close|later/i })).not.toBeInTheDocument()
    })
  })

  // ============================================
  // Birthday Display Tests
  // ============================================

  describe('Birthday date display', () => {
    it('should display the 18th birthday date', () => {
      const birthday = new Date('2024-07-15')
      render(<Age18PreDeletionNotice {...defaultProps} eighteenthBirthday={birthday} />)

      // Should show formatted date
      expect(screen.getByText(/July 15, 2024|15.*July.*2024/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // Accessibility Tests
  // ============================================

  describe('Accessibility', () => {
    it('should have appropriate ARIA role', () => {
      render(<Age18PreDeletionNotice {...defaultProps} />)

      const notice = screen.getByRole('alert') || screen.getByRole('status')
      expect(notice).toBeInTheDocument()
    })
  })
})
