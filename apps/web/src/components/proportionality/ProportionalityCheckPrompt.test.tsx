/**
 * ProportionalityCheckPrompt Tests - Story 38.4 Task 9
 *
 * Tests for the check-in prompt banner.
 * AC1: Annual prompt triggered after 12+ months
 * AC2: Both parties prompted
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ProportionalityCheckPrompt, {
  type ProportionalityCheckPromptProps,
} from './ProportionalityCheckPrompt'
import type { ProportionalityCheck } from '@fledgely/shared'

describe('ProportionalityCheckPrompt', () => {
  const thirteenMonthsAgo = new Date()
  thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13)

  const tenDaysFromNow = new Date()
  tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10)

  const twoDaysFromNow = new Date()
  twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2)

  const mockCheck: ProportionalityCheck = {
    id: 'check-123',
    familyId: 'family-456',
    childId: 'child-789',
    triggerType: 'annual',
    status: 'pending',
    monitoringStartDate: thirteenMonthsAgo,
    checkDueDate: new Date(),
    checkCompletedDate: null,
    expiresAt: tenDaysFromNow,
    createdAt: new Date(),
  }

  const defaultProps: ProportionalityCheckPromptProps = {
    check: mockCheck,
    childName: 'Alex',
    viewerType: 'parent',
    onStartCheck: vi.fn(),
    onDismiss: vi.fn(),
  }

  // ============================================
  // Display Tests (AC1, AC2)
  // ============================================

  describe('Display prompt (AC1, AC2)', () => {
    it('should display prompt for parent', () => {
      render(<ProportionalityCheckPrompt {...defaultProps} />)

      expect(screen.getByText(/Annual Monitoring Check for Alex/i)).toBeInTheDocument()
    })

    it('should display prompt for child', () => {
      render(<ProportionalityCheckPrompt {...defaultProps} viewerType="child" />)

      expect(screen.getByText(/Time for a Check-In/i)).toBeInTheDocument()
    })

    it('should have accessible region role', () => {
      render(<ProportionalityCheckPrompt {...defaultProps} />)

      expect(screen.getByRole('region')).toBeInTheDocument()
    })
  })

  // ============================================
  // Monitoring Duration Tests
  // ============================================

  describe('Monitoring duration', () => {
    it('should display monitoring duration for parent', () => {
      render(<ProportionalityCheckPrompt {...defaultProps} />)

      expect(screen.getByText(/1 year.*since monitoring began/i)).toBeInTheDocument()
    })

    it('should use child-friendly message for child', () => {
      render(<ProportionalityCheckPrompt {...defaultProps} viewerType="child" />)

      expect(screen.getByText(/It's been a year since monitoring started/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // Expiry Countdown Tests
  // ============================================

  describe('Expiry countdown', () => {
    it('should show days until expiry', () => {
      render(<ProportionalityCheckPrompt {...defaultProps} />)

      expect(screen.getByText(/Respond within \d+ days/i)).toBeInTheDocument()
    })

    it('should show urgent message when 3 days or less', () => {
      const urgentCheck: ProportionalityCheck = {
        ...mockCheck,
        expiresAt: twoDaysFromNow,
      }
      render(<ProportionalityCheckPrompt {...defaultProps} check={urgentCheck} />)

      expect(screen.getByText(/Only 2 days? left to respond/i)).toBeInTheDocument()
    })

    it('should have orange styling when urgent', () => {
      const urgentCheck: ProportionalityCheck = {
        ...mockCheck,
        expiresAt: twoDaysFromNow,
      }
      render(<ProportionalityCheckPrompt {...defaultProps} check={urgentCheck} />)

      const container = screen.getByRole('region')
      expect(container.className).toContain('bg-orange-50')
    })
  })

  // ============================================
  // Action Button Tests
  // ============================================

  describe('Action buttons', () => {
    it('should show start check button', () => {
      render(<ProportionalityCheckPrompt {...defaultProps} />)

      expect(screen.getByRole('button', { name: /Start Check-In/i })).toBeInTheDocument()
    })

    it('should show dismiss button when onDismiss provided', () => {
      render(<ProportionalityCheckPrompt {...defaultProps} />)

      expect(screen.getByRole('button', { name: /Remind Me Later/i })).toBeInTheDocument()
    })

    it('should not show dismiss button when onDismiss not provided', () => {
      render(<ProportionalityCheckPrompt {...defaultProps} onDismiss={undefined} />)

      expect(screen.queryByRole('button', { name: /Remind Me Later/i })).not.toBeInTheDocument()
    })

    it('should call onStartCheck when clicked', () => {
      const onStartCheck = vi.fn()
      render(<ProportionalityCheckPrompt {...defaultProps} onStartCheck={onStartCheck} />)

      fireEvent.click(screen.getByRole('button', { name: /Start Check-In/i }))

      expect(onStartCheck).toHaveBeenCalled()
    })

    it('should call onDismiss when clicked', () => {
      const onDismiss = vi.fn()
      render(<ProportionalityCheckPrompt {...defaultProps} onDismiss={onDismiss} />)

      fireEvent.click(screen.getByRole('button', { name: /Remind Me Later/i }))

      expect(onDismiss).toHaveBeenCalled()
    })
  })

  // ============================================
  // Styling Tests
  // ============================================

  describe('Styling', () => {
    it('should have blue styling for non-urgent', () => {
      render(<ProportionalityCheckPrompt {...defaultProps} />)

      const container = screen.getByRole('region')
      expect(container.className).toContain('bg-blue-50')
    })

    it('should have blue button for non-urgent', () => {
      render(<ProportionalityCheckPrompt {...defaultProps} />)

      const button = screen.getByRole('button', { name: /Start Check-In/i })
      expect(button.className).toContain('bg-blue-600')
    })

    it('should have orange button for urgent', () => {
      const urgentCheck: ProportionalityCheck = {
        ...mockCheck,
        expiresAt: twoDaysFromNow,
      }
      render(<ProportionalityCheckPrompt {...defaultProps} check={urgentCheck} />)

      const button = screen.getByRole('button', { name: /Start Check-In/i })
      expect(button.className).toContain('bg-orange-600')
    })
  })
})
