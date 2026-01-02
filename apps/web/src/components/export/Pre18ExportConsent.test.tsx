/**
 * Pre18ExportConsent Component Tests - Story 38.6 Task 7
 *
 * Tests for child component to grant/deny export consent.
 * AC4: Child must consent to any export
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Pre18ExportConsent from './Pre18ExportConsent'

describe('Pre18ExportConsent', () => {
  const defaultProps = {
    parentName: 'Mom',
    onGrantConsent: vi.fn(),
    onDenyConsent: vi.fn(),
  }

  // ============================================
  // Request Display Tests
  // ============================================

  describe('Consent request display', () => {
    it('should show consent request from parent', () => {
      render(<Pre18ExportConsent {...defaultProps} />)

      // "Mom" appears in multiple places
      const momMatches = screen.getAllByText(/Mom/)
      expect(momMatches.length).toBeGreaterThan(0)

      const exportMatches = screen.getAllByText(/export/i)
      expect(exportMatches.length).toBeGreaterThan(0)
    })

    it('should explain what will be exported', () => {
      render(<Pre18ExportConsent {...defaultProps} />)

      // Multiple summary mentions, use getAllByText
      const summaryMatches = screen.getAllByText(/summar/i)
      expect(summaryMatches.length).toBeGreaterThan(0)
    })

    it('should mention no screenshots', () => {
      render(<Pre18ExportConsent {...defaultProps} />)

      expect(screen.getByText(/screenshot/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // Consent Buttons Tests (AC4)
  // ============================================

  describe('Consent buttons (AC4)', () => {
    it('should render grant consent button', () => {
      render(<Pre18ExportConsent {...defaultProps} />)

      const button = screen.getByRole('button', { name: /allow|grant|yes|approve/i })
      expect(button).toBeInTheDocument()
    })

    it('should render deny consent button', () => {
      render(<Pre18ExportConsent {...defaultProps} />)

      const button = screen.getByRole('button', { name: /deny|no|decline/i })
      expect(button).toBeInTheDocument()
    })

    it('should call onGrantConsent when allow clicked', () => {
      const mockGrant = vi.fn()
      render(<Pre18ExportConsent {...defaultProps} onGrantConsent={mockGrant} />)

      const button = screen.getByRole('button', { name: /allow|grant|yes|approve/i })
      fireEvent.click(button)

      expect(mockGrant).toHaveBeenCalledTimes(1)
    })

    it('should call onDenyConsent when deny clicked', () => {
      const mockDeny = vi.fn()
      render(<Pre18ExportConsent {...defaultProps} onDenyConsent={mockDeny} />)

      const button = screen.getByRole('button', { name: /deny|no|decline/i })
      fireEvent.click(button)

      expect(mockDeny).toHaveBeenCalledTimes(1)
    })
  })

  // ============================================
  // Child Choice Emphasis Tests (AC4)
  // ============================================

  describe('Child choice emphasis (AC4)', () => {
    it('should emphasize this is the child choice', () => {
      render(<Pre18ExportConsent {...defaultProps} />)

      expect(screen.getByText(/your choice|you decide|your decision/i)).toBeInTheDocument()
    })

    it('should not use pressuring language', () => {
      render(<Pre18ExportConsent {...defaultProps} />)

      expect(screen.queryByText(/must|required|have to/i)).not.toBeInTheDocument()
    })
  })

  // ============================================
  // Confirmation Display Tests
  // ============================================

  describe('Confirmation display', () => {
    it('should show granted confirmation', () => {
      render(<Pre18ExportConsent {...defaultProps} status="granted" />)

      expect(screen.getByText(/approved|granted|allowed/i)).toBeInTheDocument()
    })

    it('should show denied confirmation', () => {
      render(<Pre18ExportConsent {...defaultProps} status="denied" />)

      expect(screen.getByText(/declined|denied/i)).toBeInTheDocument()
    })

    it('should hide buttons after decision made', () => {
      render(<Pre18ExportConsent {...defaultProps} status="granted" />)

      expect(screen.queryByRole('button', { name: /allow|grant/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /deny|decline/i })).not.toBeInTheDocument()
    })
  })

  // ============================================
  // Accessibility Tests
  // ============================================

  describe('Accessibility', () => {
    it('should have accessible alert role', () => {
      render(<Pre18ExportConsent {...defaultProps} />)

      // Has alert or status role
      const alert = screen.getByRole('alert')
      expect(alert).toBeInTheDocument()
    })

    it('should have accessible buttons', () => {
      render(<Pre18ExportConsent {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
      buttons.forEach((button) => {
        expect(button).toBeEnabled()
      })
    })
  })
})
