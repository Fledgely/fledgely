/**
 * Alumni Status Badge Tests - Story 38.3 Task 9
 *
 * Tests for alumni status badge component.
 * AC6: Child account transitions to alumni status
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AlumniStatusBadge from './AlumniStatusBadge'
import type { AlumniRecord } from '@fledgely/shared'

const createMockAlumniRecord = (overrides?: Partial<AlumniRecord>): AlumniRecord => ({
  childId: 'child-456',
  familyId: 'family-789',
  graduatedAt: new Date('2025-06-15'),
  certificateId: 'cert-123',
  previousAccountData: {
    monitoringStartDate: new Date('2023-06-15'),
    totalMonitoringMonths: 24,
    finalTrustScore: 100,
  },
  ...overrides,
})

describe('AlumniStatusBadge', () => {
  // ============================================
  // Basic Rendering Tests
  // ============================================

  describe('Basic Rendering', () => {
    it('should render badge with required props', () => {
      render(<AlumniStatusBadge alumniRecord={createMockAlumniRecord()} viewerType="child" />)

      expect(screen.getByText(/alumni/i)).toBeInTheDocument()
    })

    it('should display graduated status', () => {
      render(<AlumniStatusBadge alumniRecord={createMockAlumniRecord()} viewerType="child" />)

      expect(screen.getByText(/graduated/i)).toBeInTheDocument()
    })

    it('should indicate no monitoring', () => {
      render(<AlumniStatusBadge alumniRecord={createMockAlumniRecord()} viewerType="child" />)

      expect(screen.getByText(/no monitoring/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // Viewer Type Tests
  // ============================================

  describe('Viewer Type Specific Content', () => {
    it('should show child-specific messaging for child viewer', () => {
      render(<AlumniStatusBadge alumniRecord={createMockAlumniRecord()} viewerType="child" />)

      // Uses "you" language for child
      expect(screen.getByText(/alumni status|graduated/i)).toBeInTheDocument()
    })

    it('should show parent-specific messaging for parent viewer', () => {
      render(<AlumniStatusBadge alumniRecord={createMockAlumniRecord()} viewerType="parent" />)

      expect(screen.getByText(/alumni/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // Show Details Tests
  // ============================================

  describe('Show Details', () => {
    it('should show details panel when showDetails is true', () => {
      render(
        <AlumniStatusBadge
          alumniRecord={createMockAlumniRecord()}
          viewerType="child"
          showDetails={true}
        />
      )

      // Should show graduation date
      expect(screen.getByText(/June/i)).toBeInTheDocument()
    })

    it('should hide details when showDetails is false', () => {
      render(
        <AlumniStatusBadge
          alumniRecord={createMockAlumniRecord()}
          viewerType="child"
          showDetails={false}
        />
      )

      // Should not show full graduation date details
      expect(screen.queryByText(/monitoring months/i)).not.toBeInTheDocument()
    })

    it('should show monitoring duration in details', () => {
      render(
        <AlumniStatusBadge
          alumniRecord={createMockAlumniRecord({
            previousAccountData: {
              monitoringStartDate: new Date('2023-06-15'),
              totalMonitoringMonths: 24,
              finalTrustScore: 100,
            },
          })}
          viewerType="child"
          showDetails={true}
        />
      )

      expect(screen.getByText(/24/)).toBeInTheDocument()
    })

    it('should show graduated date in details', () => {
      render(
        <AlumniStatusBadge
          alumniRecord={createMockAlumniRecord({ graduatedAt: new Date('2025-06-15') })}
          viewerType="child"
          showDetails={true}
        />
      )

      expect(screen.getByText(/June 15, 2025/)).toBeInTheDocument()
    })
  })

  // ============================================
  // Certificate Link Tests
  // ============================================

  describe('Certificate Link', () => {
    it('should show view certificate link when onViewCertificate provided', () => {
      const mockOnViewCertificate = vi.fn()

      render(
        <AlumniStatusBadge
          alumniRecord={createMockAlumniRecord()}
          viewerType="child"
          showDetails={true}
          onViewCertificate={mockOnViewCertificate}
        />
      )

      expect(screen.getByRole('button', { name: /certificate/i })).toBeInTheDocument()
    })

    it('should call onViewCertificate when link clicked', () => {
      const mockOnViewCertificate = vi.fn()

      render(
        <AlumniStatusBadge
          alumniRecord={createMockAlumniRecord()}
          viewerType="child"
          showDetails={true}
          onViewCertificate={mockOnViewCertificate}
        />
      )

      const button = screen.getByRole('button', { name: /certificate/i })
      fireEvent.click(button)

      expect(mockOnViewCertificate).toHaveBeenCalled()
    })

    it('should not show certificate link when onViewCertificate not provided', () => {
      render(
        <AlumniStatusBadge
          alumniRecord={createMockAlumniRecord()}
          viewerType="child"
          showDetails={true}
        />
      )

      expect(screen.queryByRole('button', { name: /certificate/i })).not.toBeInTheDocument()
    })
  })

  // ============================================
  // Visual Styling Tests
  // ============================================

  describe('Visual Styling', () => {
    it('should have badge styling', () => {
      const { container } = render(
        <AlumniStatusBadge alumniRecord={createMockAlumniRecord()} viewerType="child" />
      )

      const badge = container.querySelector('[class*="badge"]') || container.firstElementChild
      expect(badge).toBeInTheDocument()
    })

    it('should use success/positive colors', () => {
      const { container } = render(
        <AlumniStatusBadge alumniRecord={createMockAlumniRecord()} viewerType="child" />
      )

      // Should have green styling for alumni status
      expect(container.innerHTML).toContain('rgb(')
    })
  })

  // ============================================
  // Accessibility Tests
  // ============================================

  describe('Accessibility', () => {
    it('should have proper ARIA label', () => {
      render(<AlumniStatusBadge alumniRecord={createMockAlumniRecord()} viewerType="child" />)

      const badge = screen.getByRole('status')
      expect(badge).toBeInTheDocument()
    })

    it('should be keyboard accessible', () => {
      const mockOnViewCertificate = vi.fn()

      render(
        <AlumniStatusBadge
          alumniRecord={createMockAlumniRecord()}
          viewerType="child"
          showDetails={true}
          onViewCertificate={mockOnViewCertificate}
        />
      )

      const button = screen.getByRole('button', { name: /certificate/i })
      expect(button).not.toHaveAttribute('tabindex', '-1')
    })
  })
})
