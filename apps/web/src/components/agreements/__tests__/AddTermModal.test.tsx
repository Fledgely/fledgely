/**
 * Tests for AddTermModal component.
 *
 * Story 5.2: Visual Agreement Builder - AC1, AC3
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AddTermModal } from '../AddTermModal'
import type { AgreementTerm } from '@fledgely/shared/contracts'

describe('AddTermModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
    party: 'parent' as const,
  }

  const mockTerm: AgreementTerm = {
    id: 'term-1',
    text: 'Existing rule text',
    category: 'time',
    party: 'parent',
    order: 0,
    explanation: 'Existing explanation',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  describe('Rendering', () => {
    it('renders when open', () => {
      render(<AddTermModal {...defaultProps} />)

      expect(screen.getByTestId('add-term-modal')).toBeInTheDocument()
      expect(screen.getByText('Add a New Rule')).toBeInTheDocument()
    })

    it('does not render when closed', () => {
      render(<AddTermModal {...defaultProps} isOpen={false} />)

      expect(screen.queryByTestId('add-term-modal')).not.toBeInTheDocument()
    })

    it('shows parent party badge', () => {
      render(<AddTermModal {...defaultProps} party="parent" />)

      expect(screen.getByText(/Parent's Idea/)).toBeInTheDocument()
    })

    it('shows child party badge', () => {
      render(<AddTermModal {...defaultProps} party="child" />)

      expect(screen.getByText(/Child's Idea/)).toBeInTheDocument()
    })

    it('shows Edit Rule title when editing', () => {
      render(<AddTermModal {...defaultProps} editingTerm={mockTerm} />)

      expect(screen.getByText('Edit Rule')).toBeInTheDocument()
    })
  })

  describe('Form Fields', () => {
    it('has term text input', () => {
      render(<AddTermModal {...defaultProps} />)

      expect(screen.getByTestId('term-text-input')).toBeInTheDocument()
      expect(screen.getByLabelText(/What's the rule/)).toBeInTheDocument()
    })

    it('has explanation input', () => {
      render(<AddTermModal {...defaultProps} />)

      expect(screen.getByTestId('term-explanation-input')).toBeInTheDocument()
      expect(screen.getByLabelText(/Explain it simply/)).toBeInTheDocument()
    })

    it('shows category options', () => {
      render(<AddTermModal {...defaultProps} />)

      expect(screen.getByTestId('category-time')).toBeInTheDocument()
      expect(screen.getByTestId('category-apps')).toBeInTheDocument()
      expect(screen.getByTestId('category-monitoring')).toBeInTheDocument()
      expect(screen.getByTestId('category-rewards')).toBeInTheDocument()
      expect(screen.getByTestId('category-general')).toBeInTheDocument()
    })

    it('populates form when editing', () => {
      render(<AddTermModal {...defaultProps} editingTerm={mockTerm} />)

      expect(screen.getByTestId('term-text-input')).toHaveValue('Existing rule text')
      expect(screen.getByTestId('term-explanation-input')).toHaveValue('Existing explanation')
    })
  })

  describe('Validation', () => {
    it('shows error when text is empty', async () => {
      render(<AddTermModal {...defaultProps} />)

      fireEvent.click(screen.getByTestId('save-term'))

      await waitFor(() => {
        expect(screen.getByText('Please enter the rule text')).toBeInTheDocument()
      })
    })

    it('shows error when explanation is empty', async () => {
      render(<AddTermModal {...defaultProps} />)

      fireEvent.change(screen.getByTestId('term-text-input'), {
        target: { value: 'Some rule text' },
      })
      fireEvent.click(screen.getByTestId('save-term'))

      await waitFor(() => {
        expect(screen.getByText('Please add an explanation for your child')).toBeInTheDocument()
      })
    })

    it('does not call onSave when validation fails', async () => {
      const onSave = vi.fn()
      render(<AddTermModal {...defaultProps} onSave={onSave} />)

      fireEvent.click(screen.getByTestId('save-term'))

      await waitFor(() => {
        expect(screen.getByText('Please enter the rule text')).toBeInTheDocument()
      })

      expect(onSave).not.toHaveBeenCalled()
    })
  })

  describe('Category Selection', () => {
    it('selects category when clicked', () => {
      render(<AddTermModal {...defaultProps} />)

      const appsButton = screen.getByTestId('category-apps')
      fireEvent.click(appsButton)

      expect(appsButton).toHaveClass('border-primary')
    })
  })

  describe('Auto-Generate Explanation', () => {
    it('generates explanation when button is clicked', async () => {
      render(<AddTermModal {...defaultProps} />)

      fireEvent.change(screen.getByTestId('term-text-input'), {
        target: { value: 'No games after homework' },
      })

      fireEvent.click(screen.getByTestId('auto-generate-explanation'))

      const explanationInput = screen.getByTestId('term-explanation-input') as HTMLTextAreaElement
      expect(explanationInput.value).toContain('No games after homework')
    })
  })

  describe('Form Submission', () => {
    it('calls onSave with form data when valid', async () => {
      const onSave = vi.fn()
      render(<AddTermModal {...defaultProps} onSave={onSave} />)

      fireEvent.change(screen.getByTestId('term-text-input'), {
        target: { value: 'New rule text' },
      })
      fireEvent.change(screen.getByTestId('term-explanation-input'), {
        target: { value: 'Simple explanation' },
      })
      fireEvent.click(screen.getByTestId('category-apps'))
      fireEvent.click(screen.getByTestId('save-term'))

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith({
          text: 'New rule text',
          category: 'apps',
          party: 'parent',
          explanation: 'Simple explanation',
        })
      })
    })

    it('calls onClose after successful save', async () => {
      const onClose = vi.fn()
      render(<AddTermModal {...defaultProps} onClose={onClose} />)

      fireEvent.change(screen.getByTestId('term-text-input'), {
        target: { value: 'Rule' },
      })
      fireEvent.change(screen.getByTestId('term-explanation-input'), {
        target: { value: 'Explanation' },
      })
      fireEvent.click(screen.getByTestId('save-term'))

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled()
      })
    })
  })

  describe('Cancel', () => {
    it('has cancel button', () => {
      render(<AddTermModal {...defaultProps} />)

      expect(screen.getByTestId('cancel-add-term')).toBeInTheDocument()
    })
  })

  describe('Character Limits', () => {
    it('shows character count for text', () => {
      render(<AddTermModal {...defaultProps} />)

      expect(screen.getByText('0/500 characters')).toBeInTheDocument()
    })

    it('shows character count for explanation', () => {
      render(<AddTermModal {...defaultProps} />)

      expect(screen.getByText('0/300 characters')).toBeInTheDocument()
    })

    it('updates character count as user types', () => {
      render(<AddTermModal {...defaultProps} />)

      fireEvent.change(screen.getByTestId('term-text-input'), {
        target: { value: 'Hello' },
      })

      expect(screen.getByText('5/500 characters')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has minimum 44px touch targets', () => {
      render(<AddTermModal {...defaultProps} />)

      expect(screen.getByTestId('save-term')).toHaveClass('min-h-[44px]')
      expect(screen.getByTestId('cancel-add-term')).toHaveClass('min-h-[44px]')
    })

    it('has required field indicators', () => {
      render(<AddTermModal {...defaultProps} />)

      const requiredIndicators = screen.getAllByText('*')
      expect(requiredIndicators.length).toBeGreaterThanOrEqual(2)
    })

    it('shows errors with role alert', async () => {
      render(<AddTermModal {...defaultProps} />)

      fireEvent.click(screen.getByTestId('save-term'))

      await waitFor(() => {
        expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
      })
    })
  })
})
