/**
 * FactorDetailModal Component Tests - Story 36.4 Task 4
 *
 * Tests for factor detail modal shown when parent clicks a factor.
 * AC4: Factor details available on click
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FactorDetailModal } from './FactorDetailModal'
import { type TrustFactor } from '@fledgely/shared'

const createFactor = (
  type: TrustFactor['type'],
  category: TrustFactor['category'],
  value: number,
  description: string
): TrustFactor => ({
  type,
  category,
  value,
  description,
  occurredAt: new Date(),
})

describe('FactorDetailModal - Story 36.4 Task 4', () => {
  describe('AC4: Factor details on click', () => {
    it('should render the modal container', () => {
      const factor = createFactor('time-limit-compliance', 'positive', 10, 'Following time limits')

      render(<FactorDetailModal factor={factor} isOpen={true} onClose={vi.fn()} />)

      expect(screen.getByTestId('factor-detail-modal')).toBeInTheDocument()
    })

    it('should not render when closed', () => {
      const factor = createFactor('time-limit-compliance', 'positive', 10, 'Following time limits')

      render(<FactorDetailModal factor={factor} isOpen={false} onClose={vi.fn()} />)

      expect(screen.queryByTestId('factor-detail-modal')).not.toBeInTheDocument()
    })

    it('should display factor description', () => {
      const factor = createFactor('time-limit-compliance', 'positive', 10, 'Following time limits')

      render(<FactorDetailModal factor={factor} isOpen={true} onClose={vi.fn()} />)

      expect(screen.getByTestId('factor-description')).toHaveTextContent('Following time limits')
    })

    it('should display factor value', () => {
      const factor = createFactor('time-limit-compliance', 'positive', 10, 'Following time limits')

      render(<FactorDetailModal factor={factor} isOpen={true} onClose={vi.fn()} />)

      expect(screen.getByTestId('factor-value')).toHaveTextContent('+10')
    })

    it('should show negative value correctly', () => {
      const factor = createFactor('focus-mode-usage', 'concerning', -5, 'Screen time exceeded')

      render(<FactorDetailModal factor={factor} isOpen={true} onClose={vi.fn()} />)

      expect(screen.getByTestId('factor-value')).toHaveTextContent('-5')
    })

    it('should display factor category', () => {
      const factor = createFactor('time-limit-compliance', 'positive', 10, 'Following time limits')

      render(<FactorDetailModal factor={factor} isOpen={true} onClose={vi.fn()} />)

      expect(screen.getByTestId('factor-category')).toHaveTextContent('positive')
    })
  })

  describe('Modal interactions', () => {
    it('should call onClose when close button clicked', () => {
      const onClose = vi.fn()
      const factor = createFactor('time-limit-compliance', 'positive', 10, 'Following time limits')

      render(<FactorDetailModal factor={factor} isOpen={true} onClose={onClose} />)

      fireEvent.click(screen.getByTestId('modal-close-button'))

      expect(onClose).toHaveBeenCalled()
    })

    it('should call onClose when backdrop clicked', () => {
      const onClose = vi.fn()
      const factor = createFactor('time-limit-compliance', 'positive', 10, 'Following time limits')

      render(<FactorDetailModal factor={factor} isOpen={true} onClose={onClose} />)

      fireEvent.click(screen.getByTestId('modal-backdrop'))

      expect(onClose).toHaveBeenCalled()
    })

    it('should call onClose on Escape key', () => {
      const onClose = vi.fn()
      const factor = createFactor('time-limit-compliance', 'positive', 10, 'Following time limits')

      render(<FactorDetailModal factor={factor} isOpen={true} onClose={onClose} />)

      fireEvent.keyDown(screen.getByTestId('factor-detail-modal'), { key: 'Escape' })

      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('Factor type details', () => {
    it('should show explanation for time-limit-compliance', () => {
      const factor = createFactor('time-limit-compliance', 'positive', 10, 'Following time limits')

      render(<FactorDetailModal factor={factor} isOpen={true} onClose={vi.fn()} />)

      expect(screen.getByTestId('factor-explanation')).toBeInTheDocument()
    })

    it('should show occurred date', () => {
      const factor = createFactor('time-limit-compliance', 'positive', 10, 'Following time limits')

      render(<FactorDetailModal factor={factor} isOpen={true} onClose={vi.fn()} />)

      expect(screen.getByTestId('factor-date')).toBeInTheDocument()
    })
  })

  describe('Styling by category', () => {
    it('should have positive styling for positive category', () => {
      const factor = createFactor('time-limit-compliance', 'positive', 10, 'Following time limits')

      render(<FactorDetailModal factor={factor} isOpen={true} onClose={vi.fn()} />)

      expect(screen.getByTestId('factor-detail-modal')).toHaveAttribute('data-category', 'positive')
    })

    it('should have concerning styling for concerning category', () => {
      const factor = createFactor('focus-mode-usage', 'concerning', -5, 'Screen time exceeded')

      render(<FactorDetailModal factor={factor} isOpen={true} onClose={vi.fn()} />)

      expect(screen.getByTestId('factor-detail-modal')).toHaveAttribute(
        'data-category',
        'concerning'
      )
    })
  })

  describe('Accessibility', () => {
    it('should have role dialog', () => {
      const factor = createFactor('time-limit-compliance', 'positive', 10, 'Following time limits')

      render(<FactorDetailModal factor={factor} isOpen={true} onClose={vi.fn()} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should have aria-labelledby', () => {
      const factor = createFactor('time-limit-compliance', 'positive', 10, 'Following time limits')

      render(<FactorDetailModal factor={factor} isOpen={true} onClose={vi.fn()} />)

      const modal = screen.getByRole('dialog')
      expect(modal).toHaveAttribute('aria-labelledby')
    })

    it('should trap focus within modal', () => {
      const factor = createFactor('time-limit-compliance', 'positive', 10, 'Following time limits')

      render(<FactorDetailModal factor={factor} isOpen={true} onClose={vi.fn()} />)

      expect(screen.getByTestId('modal-close-button')).toHaveFocus()
    })
  })
})
