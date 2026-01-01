/**
 * ExpiryDateSelector Tests - Story 35.1
 *
 * Tests for agreement expiry date selection component.
 * AC1: Expiry options (3 months, 6 months, 1 year, no expiry)
 * AC2: Age-based recommendations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ExpiryDateSelector } from './ExpiryDateSelector'
import type { ExpiryDuration } from '@fledgely/shared'

describe('ExpiryDateSelector - Story 35.1', () => {
  const mockOnSelect = vi.fn()

  const defaultProps = {
    selectedDuration: '6-months' as ExpiryDuration,
    onSelect: mockOnSelect,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering options (AC1)', () => {
    it('should render all 4 expiry options', () => {
      render(<ExpiryDateSelector {...defaultProps} />)

      expect(screen.getByText('3 months')).toBeInTheDocument()
      expect(screen.getByText('6 months')).toBeInTheDocument()
      expect(screen.getByText('1 year')).toBeInTheDocument()
      expect(screen.getByText('No expiry')).toBeInTheDocument()
    })

    it('should display descriptions for each option', () => {
      render(<ExpiryDateSelector {...defaultProps} />)

      expect(screen.getByText(/trial periods/i)).toBeInTheDocument()
      expect(screen.getByText(/children under 13/i)).toBeInTheDocument()
      expect(screen.getByText(/teens 13\+/i)).toBeInTheDocument()
      expect(screen.getByText(/annual review/i)).toBeInTheDocument()
    })

    it('should show header text', () => {
      render(<ExpiryDateSelector {...defaultProps} />)

      expect(screen.getByText(/Agreement Duration/i)).toBeInTheDocument()
    })

    it('should show description text', () => {
      render(<ExpiryDateSelector {...defaultProps} />)

      expect(screen.getByText(/Choose how long this agreement should last/i)).toBeInTheDocument()
    })
  })

  describe('selection behavior', () => {
    it('should highlight the selected option', () => {
      render(<ExpiryDateSelector {...defaultProps} selectedDuration="6-months" />)

      const selectedOption = screen.getByRole('radio', { name: /6 months/i })
      expect(selectedOption).toBeChecked()
    })

    it('should call onSelect when option is clicked', () => {
      render(<ExpiryDateSelector {...defaultProps} />)

      const oneYearOption = screen.getByRole('radio', { name: /1 year/i })
      fireEvent.click(oneYearOption)

      expect(mockOnSelect).toHaveBeenCalledWith('1-year')
    })

    it('should allow changing selection', () => {
      render(<ExpiryDateSelector {...defaultProps} selectedDuration="3-months" />)

      const noExpiryOption = screen.getByRole('radio', { name: /No expiry/i })
      fireEvent.click(noExpiryOption)

      expect(mockOnSelect).toHaveBeenCalledWith('no-expiry')
    })
  })

  describe('age-based recommendations (AC2)', () => {
    it('should show recommendation for younger children', () => {
      render(<ExpiryDateSelector {...defaultProps} childAge={10} />)

      // Should indicate 6 months is recommended for younger children
      const recommendedTexts = screen.getAllByText(/Recommended/i)
      expect(recommendedTexts.length).toBeGreaterThan(0)
    })

    it('should recommend 6 months for children under 13', () => {
      render(<ExpiryDateSelector {...defaultProps} childAge={8} />)

      const sixMonthsOption = screen
        .getByRole('radio', { name: /6 months/i })
        .closest('[data-option]')
      expect(sixMonthsOption).toHaveAttribute('data-recommended', 'true')
    })

    it('should recommend 1 year for teens 13+', () => {
      render(<ExpiryDateSelector {...defaultProps} childAge={15} />)

      const oneYearOption = screen.getByRole('radio', { name: /1 year/i }).closest('[data-option]')
      expect(oneYearOption).toHaveAttribute('data-recommended', 'true')
    })

    it('should show recommendation message for younger children', () => {
      render(<ExpiryDateSelector {...defaultProps} childAge={10} />)

      expect(screen.getByText(/children under 13.*6 months/i)).toBeInTheDocument()
    })

    it('should show recommendation message for teens', () => {
      render(<ExpiryDateSelector {...defaultProps} childAge={14} />)

      expect(screen.getByText(/teens 13\+.*annual/i)).toBeInTheDocument()
    })

    it('should not show recommendation when no age provided', () => {
      render(<ExpiryDateSelector {...defaultProps} />)

      const options = screen.getAllByRole('radio')
      options.forEach((option) => {
        const container = option.closest('[data-option]')
        expect(container).not.toHaveAttribute('data-recommended', 'true')
      })
    })
  })

  describe('disabled state', () => {
    it('should disable all options when disabled prop is true', () => {
      render(<ExpiryDateSelector {...defaultProps} disabled />)

      const options = screen.getAllByRole('radio')
      options.forEach((option) => {
        expect(option).toBeDisabled()
      })
    })

    it('should not call onSelect when disabled', () => {
      render(<ExpiryDateSelector {...defaultProps} disabled />)

      const oneYearOption = screen.getByRole('radio', { name: /1 year/i })
      fireEvent.click(oneYearOption)

      expect(mockOnSelect).not.toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('should use radiogroup role', () => {
      render(<ExpiryDateSelector {...defaultProps} />)

      expect(screen.getByRole('radiogroup')).toBeInTheDocument()
    })

    it('should have accessible labels for each option', () => {
      render(<ExpiryDateSelector {...defaultProps} />)

      expect(screen.getByRole('radio', { name: /3 months/i })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: /6 months/i })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: /1 year/i })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: /No expiry/i })).toBeInTheDocument()
    })

    it('should have aria-describedby for recommendations', () => {
      render(<ExpiryDateSelector {...defaultProps} childAge={10} />)

      const radiogroup = screen.getByRole('radiogroup')
      expect(radiogroup).toHaveAttribute('aria-describedby')
    })
  })

  describe('visual styling', () => {
    it('should have distinguishable selected state', () => {
      render(<ExpiryDateSelector {...defaultProps} selectedDuration="1-year" />)

      const oneYearOption = screen.getByRole('radio', { name: /1 year/i }).closest('[data-option]')
      expect(oneYearOption?.className).toMatch(/border-blue|ring|selected/i)
    })

    it('should show recommended badge on recommended option', () => {
      render(<ExpiryDateSelector {...defaultProps} childAge={10} />)

      // The 6-months option should have a recommended badge
      const sixMonthsLabel = screen.getByText('6 months').closest('[data-option]')
      expect(sixMonthsLabel?.textContent).toMatch(/Recommended/i)
    })
  })

  describe('compact mode', () => {
    it('should render in compact mode', () => {
      render(<ExpiryDateSelector {...defaultProps} compact />)

      expect(screen.getByRole('radiogroup')).toBeInTheDocument()
    })

    it('should hide descriptions in compact mode', () => {
      render(<ExpiryDateSelector {...defaultProps} compact />)

      expect(screen.queryByText(/trial periods/i)).not.toBeInTheDocument()
    })
  })
})
