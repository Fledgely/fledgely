/**
 * RenewalModeSelector Component Tests - Story 35.3
 *
 * Tests for the renewal mode selection component.
 * AC1: Option: "Renew as-is" or "Renew with changes"
 * AC2: "Renew as-is" extends expiry with same terms
 * AC3: "Renew with changes" enters modification flow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RenewalModeSelector } from './RenewalModeSelector'

describe('RenewalModeSelector - Story 35.3', () => {
  const defaultProps = {
    onModeSelected: vi.fn(),
    onCancel: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering (AC1)', () => {
    it('should render both mode options', () => {
      render(<RenewalModeSelector {...defaultProps} />)

      expect(screen.getByText(/renew as-is/i)).toBeInTheDocument()
      expect(screen.getByText(/renew with changes/i)).toBeInTheDocument()
    })

    it('should display mode descriptions', () => {
      render(<RenewalModeSelector {...defaultProps} />)

      expect(screen.getByText(/keep the same terms/i)).toBeInTheDocument()
      expect(screen.getByText(/make modifications/i)).toBeInTheDocument()
    })

    it('should display title', () => {
      render(<RenewalModeSelector {...defaultProps} />)

      expect(screen.getByText(/how would you like to renew/i)).toBeInTheDocument()
    })
  })

  describe('renew as-is selection (AC2)', () => {
    it('should call onModeSelected with renew-as-is when selected', () => {
      render(<RenewalModeSelector {...defaultProps} />)

      fireEvent.click(screen.getByTestId('mode-renew-as-is'))

      expect(defaultProps.onModeSelected).toHaveBeenCalledWith('renew-as-is')
    })

    it('should have renew as-is button', () => {
      render(<RenewalModeSelector {...defaultProps} />)

      expect(screen.getByTestId('mode-renew-as-is')).toBeInTheDocument()
    })
  })

  describe('renew with changes selection (AC3)', () => {
    it('should call onModeSelected with renew-with-changes when selected', () => {
      render(<RenewalModeSelector {...defaultProps} />)

      fireEvent.click(screen.getByTestId('mode-renew-with-changes'))

      expect(defaultProps.onModeSelected).toHaveBeenCalledWith('renew-with-changes')
    })

    it('should indicate modification flow will be used', () => {
      render(<RenewalModeSelector {...defaultProps} />)

      // Look for indication that this leads to modification
      const changesOption = screen.getByTestId('mode-renew-with-changes')
      expect(changesOption).toBeInTheDocument()
    })
  })

  describe('cancel action', () => {
    it('should display cancel button', () => {
      render(<RenewalModeSelector {...defaultProps} />)

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('should call onCancel when cancel is clicked', () => {
      render(<RenewalModeSelector {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1)
    })
  })

  describe('current terms display', () => {
    it('should display current expiry date when provided', () => {
      render(<RenewalModeSelector {...defaultProps} currentExpiryDate={new Date('2024-07-01')} />)

      expect(screen.getByText(/jul 1, 2024/i)).toBeInTheDocument()
    })

    it('should display current duration when provided', () => {
      render(<RenewalModeSelector {...defaultProps} currentDuration="1-year" />)

      expect(screen.getByText(/1 year/i)).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have accessible buttons', () => {
      render(<RenewalModeSelector {...defaultProps} />)

      const asIsButton = screen.getByTestId('mode-renew-as-is')
      const changesButton = screen.getByTestId('mode-renew-with-changes')

      expect(asIsButton).toHaveAttribute('type', 'button')
      expect(changesButton).toHaveAttribute('type', 'button')
    })

    it('should have heading', () => {
      render(<RenewalModeSelector {...defaultProps} />)

      expect(screen.getByRole('heading')).toBeInTheDocument()
    })
  })
})
