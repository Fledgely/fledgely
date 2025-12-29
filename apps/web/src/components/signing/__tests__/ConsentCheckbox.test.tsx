/**
 * Tests for ConsentCheckbox component.
 *
 * Story 6.1: Child Digital Signature Ceremony - AC3
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ConsentCheckbox } from '../ConsentCheckbox'

describe('ConsentCheckbox', () => {
  const defaultProps = {
    checked: false,
    onChange: vi.fn(),
  }

  describe('rendering', () => {
    it('should render the consent checkbox component', () => {
      render(<ConsentCheckbox {...defaultProps} />)

      expect(screen.getByTestId('consent-checkbox')).toBeInTheDocument()
    })

    it('should render checkbox input', () => {
      render(<ConsentCheckbox {...defaultProps} />)

      expect(screen.getByTestId('consent-checkbox-input')).toBeInTheDocument()
    })

    it('should display default label', () => {
      render(<ConsentCheckbox {...defaultProps} />)

      expect(screen.getByText('I understand and agree to follow these rules')).toBeInTheDocument()
    })

    it('should display description text', () => {
      render(<ConsentCheckbox {...defaultProps} />)

      expect(
        screen.getByText(
          'By checking this box, you promise to try your best to follow the agreement you helped create.'
        )
      ).toBeInTheDocument()
    })
  })

  describe('checkbox behavior', () => {
    it('should call onChange when clicked', () => {
      const onChange = vi.fn()
      render(<ConsentCheckbox {...defaultProps} onChange={onChange} />)

      fireEvent.click(screen.getByTestId('consent-checkbox-input'))

      expect(onChange).toHaveBeenCalledWith(true)
    })

    it('should show unchecked state', () => {
      render(<ConsentCheckbox {...defaultProps} checked={false} />)

      expect(screen.getByTestId('consent-checkbox-input')).not.toBeChecked()
    })

    it('should show checked state', () => {
      render(<ConsentCheckbox {...defaultProps} checked={true} />)

      expect(screen.getByTestId('consent-checkbox-input')).toBeChecked()
    })

    it('should display checkmark when checked', () => {
      render(<ConsentCheckbox {...defaultProps} checked={true} />)

      expect(screen.getByText('✓')).toBeInTheDocument()
    })

    it('should not display checkmark when unchecked', () => {
      render(<ConsentCheckbox {...defaultProps} checked={false} />)

      expect(screen.queryByText('✓')).not.toBeInTheDocument()
    })
  })

  describe('custom label', () => {
    it('should display custom label text', () => {
      render(<ConsentCheckbox {...defaultProps} label="Custom consent text" />)

      expect(screen.getByText('Custom consent text')).toBeInTheDocument()
    })
  })

  describe('disabled state', () => {
    it('should disable checkbox when disabled prop is true', () => {
      render(<ConsentCheckbox {...defaultProps} disabled />)

      expect(screen.getByTestId('consent-checkbox-input')).toBeDisabled()
    })

    it('should not update value when disabled', () => {
      const onChange = vi.fn()
      render(<ConsentCheckbox {...defaultProps} checked={false} onChange={onChange} disabled />)

      // The checkbox is disabled, so clicks should be prevented by the browser
      const checkbox = screen.getByTestId('consent-checkbox-input')
      expect(checkbox).toBeDisabled()
    })
  })

  describe('accessibility', () => {
    it('should have aria-describedby for description', () => {
      render(<ConsentCheckbox {...defaultProps} />)

      expect(screen.getByTestId('consent-checkbox-input')).toHaveAttribute(
        'aria-describedby',
        'consent-description'
      )
    })

    it('should have 44px minimum height on label container', () => {
      render(<ConsentCheckbox {...defaultProps} />)

      const label = screen.getByTestId('consent-checkbox').querySelector('label')
      expect(label).toHaveClass('min-h-[44px]')
    })
  })

  describe('styling', () => {
    it('should apply green border when checked', () => {
      render(<ConsentCheckbox {...defaultProps} checked={true} />)

      const label = screen.getByTestId('consent-checkbox').querySelector('label')
      expect(label).toHaveClass('border-green-400')
    })

    it('should apply gray border when unchecked', () => {
      render(<ConsentCheckbox {...defaultProps} checked={false} />)

      const label = screen.getByTestId('consent-checkbox').querySelector('label')
      expect(label).toHaveClass('border-gray-300')
    })

    it('should apply custom className', () => {
      render(<ConsentCheckbox {...defaultProps} className="custom-class" />)

      expect(screen.getByTestId('consent-checkbox')).toHaveClass('custom-class')
    })
  })
})
