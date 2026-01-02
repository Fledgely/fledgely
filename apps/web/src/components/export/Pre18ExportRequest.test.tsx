/**
 * Pre18ExportRequest Component Tests - Story 38.6 Task 6
 *
 * Tests for parent component to request data export.
 * AC2: Export option available
 * AC3: Export includes: sanitized activity summaries (no screenshots)
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Pre18ExportRequest from './Pre18ExportRequest'

describe('Pre18ExportRequest', () => {
  const defaultProps = {
    childName: 'Alex',
    daysUntil18: 25,
    onRequestExport: vi.fn(),
  }

  // ============================================
  // Visibility Tests (AC2)
  // ============================================

  describe('Export option availability (AC2)', () => {
    it('should show export option when child approaching 18', () => {
      render(<Pre18ExportRequest {...defaultProps} />)

      // Multiple elements contain "export", so use getAllByText
      const exportMatches = screen.getAllByText(/export/i)
      expect(exportMatches.length).toBeGreaterThan(0)
    })

    it('should display days until 18', () => {
      render(<Pre18ExportRequest {...defaultProps} daysUntil18={25} />)

      expect(screen.getByText(/25/)).toBeInTheDocument()
    })

    it('should display child name', () => {
      render(<Pre18ExportRequest {...defaultProps} childName="Jordan" />)

      // Child name appears in multiple places
      const matches = screen.getAllByText(/Jordan/)
      expect(matches.length).toBeGreaterThan(0)
    })
  })

  // ============================================
  // Explanation Tests (AC3)
  // ============================================

  describe('Export content explanation (AC3)', () => {
    it('should explain what will be included', () => {
      render(<Pre18ExportRequest {...defaultProps} />)

      expect(screen.getByText(/summar/i)).toBeInTheDocument() // summaries
    })

    it('should explain what will NOT be included', () => {
      render(<Pre18ExportRequest {...defaultProps} />)

      expect(screen.getByText(/screenshot/i)).toBeInTheDocument()
    })

    it('should mention activity data', () => {
      render(<Pre18ExportRequest {...defaultProps} />)

      expect(screen.getByText(/activity/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // Request Button Tests
  // ============================================

  describe('Export request button', () => {
    it('should render request button', () => {
      render(<Pre18ExportRequest {...defaultProps} />)

      const button = screen.getByRole('button', { name: /request|export/i })
      expect(button).toBeInTheDocument()
    })

    it('should call onRequestExport when button clicked', () => {
      const mockOnRequest = vi.fn()
      render(<Pre18ExportRequest {...defaultProps} onRequestExport={mockOnRequest} />)

      const button = screen.getByRole('button', { name: /request|export/i })
      fireEvent.click(button)

      expect(mockOnRequest).toHaveBeenCalledTimes(1)
    })
  })

  // ============================================
  // Child Consent Notice Tests (AC4)
  // ============================================

  describe('Child consent notice (AC4)', () => {
    it('should mention child consent is required', () => {
      render(<Pre18ExportRequest {...defaultProps} />)

      expect(screen.getByText(/consent/i)).toBeInTheDocument()
    })

    it('should indicate child will be asked', () => {
      render(<Pre18ExportRequest {...defaultProps} />)

      // Multiple elements contain "Alex", so use getAllByText
      const alexMatches = screen.getAllByText(/Alex/i)
      expect(alexMatches.length).toBeGreaterThan(0)
    })
  })

  // ============================================
  // Status Display Tests
  // ============================================

  describe('Status display', () => {
    it('should show pending status when waiting for consent', () => {
      render(<Pre18ExportRequest {...defaultProps} status="pending_consent" />)

      expect(screen.getByText(/pending|waiting/i)).toBeInTheDocument()
    })

    it('should show completed status when export ready', () => {
      render(
        <Pre18ExportRequest
          {...defaultProps}
          status="completed"
          exportUrl="https://example.com/export.zip"
        />
      )

      // "Export ready!" text exists in the component
      expect(screen.getByText(/Export ready!/i)).toBeInTheDocument()
    })

    it('should show download link when export ready', () => {
      render(
        <Pre18ExportRequest
          {...defaultProps}
          status="completed"
          exportUrl="https://example.com/export.zip"
        />
      )

      const link = screen.getByRole('link', { name: /download/i })
      expect(link).toHaveAttribute('href', 'https://example.com/export.zip')
    })

    it('should disable request button after request submitted', () => {
      render(<Pre18ExportRequest {...defaultProps} status="pending_consent" />)

      const button = screen.getByRole('button', { name: /request|export/i })
      expect(button).toBeDisabled()
    })
  })

  // ============================================
  // Accessibility Tests
  // ============================================

  describe('Accessibility', () => {
    it('should have accessible heading', () => {
      render(<Pre18ExportRequest {...defaultProps} />)

      const headings = screen.getAllByRole('heading')
      expect(headings.length).toBeGreaterThan(0)
    })

    it('should have accessible button', () => {
      render(<Pre18ExportRequest {...defaultProps} />)

      const button = screen.getByRole('button')
      expect(button).toBeEnabled()
    })
  })
})
