/**
 * Tests for AgreementTermCard component.
 *
 * Story 5.2: Visual Agreement Builder - AC1, AC3, AC4, AC5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AgreementTermCard } from '../AgreementTermCard'
import type { AgreementTerm } from '@fledgely/shared/contracts'

describe('AgreementTermCard', () => {
  const mockTerm: AgreementTerm = {
    id: 'term-1',
    text: 'Screen time ends at 8pm on school nights',
    category: 'time',
    party: 'parent',
    order: 0,
    explanation:
      'This means you need to turn off your devices by 8pm when you have school the next day.',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('AC1: Visual Cards Interface', () => {
    it('renders term text', () => {
      render(<AgreementTermCard term={mockTerm} />)
      expect(screen.getByText('Screen time ends at 8pm on school nights')).toBeInTheDocument()
    })

    it('renders as interactive card with drag handle', () => {
      render(<AgreementTermCard term={mockTerm} showDragHandle={true} />)
      expect(screen.getByLabelText('Drag to reorder')).toBeInTheDocument()
    })

    it('can hide drag handle', () => {
      render(<AgreementTermCard term={mockTerm} showDragHandle={false} />)
      expect(screen.queryByLabelText('Drag to reorder')).not.toBeInTheDocument()
    })
  })

  describe('AC3: Child-Friendly Explanations', () => {
    it('shows tooltip on hover after delay', async () => {
      render(<AgreementTermCard term={mockTerm} />)

      const card = screen.getByTestId('term-text').closest('div')!
      fireEvent.mouseEnter(card)

      // Advance past the 500ms delay
      await vi.advanceTimersByTimeAsync(600)

      expect(screen.getByRole('tooltip')).toBeInTheDocument()
      expect(screen.getByText(/This means you need to turn off/)).toBeInTheDocument()
    })

    it('hides tooltip on mouse leave', async () => {
      render(<AgreementTermCard term={mockTerm} />)

      const card = screen.getByTestId('term-text').closest('div')!
      fireEvent.mouseEnter(card)
      await vi.advanceTimersByTimeAsync(600)

      expect(screen.getByRole('tooltip')).toBeInTheDocument()

      fireEvent.mouseLeave(card)

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })

    it('shows tooltip on focus for keyboard accessibility', () => {
      render(<AgreementTermCard term={mockTerm} onClick={() => {}} />)

      const card = screen.getByRole('button')
      fireEvent.focus(card)

      // Focus shows tooltip immediately (no delay)
      expect(screen.getByRole('tooltip')).toBeInTheDocument()
    })
  })

  describe('AC4: Party Attribution', () => {
    it('shows parent badge for parent-suggested terms', () => {
      render(<AgreementTermCard term={mockTerm} />)
      expect(screen.getByTestId('party-badge-parent')).toBeInTheDocument()
      expect(screen.getByText('Parent')).toBeInTheDocument()
    })

    it('shows child badge for child-suggested terms', () => {
      const childTerm = { ...mockTerm, party: 'child' as const }
      render(<AgreementTermCard term={childTerm} />)
      expect(screen.getByTestId('party-badge-child')).toBeInTheDocument()
      expect(screen.getByText('Child')).toBeInTheDocument()
    })
  })

  describe('AC5: Category Color Coding', () => {
    it('applies time category styling', () => {
      const timeTerm = { ...mockTerm, category: 'time' as const }
      render(<AgreementTermCard term={timeTerm} />)
      expect(screen.getByText('Time')).toBeInTheDocument()
    })

    it('applies apps category styling', () => {
      const appsTerm = { ...mockTerm, category: 'apps' as const }
      render(<AgreementTermCard term={appsTerm} />)
      expect(screen.getByText('Apps')).toBeInTheDocument()
    })

    it('applies monitoring category styling', () => {
      const monitoringTerm = { ...mockTerm, category: 'monitoring' as const }
      render(<AgreementTermCard term={monitoringTerm} />)
      expect(screen.getByText('Monitoring')).toBeInTheDocument()
    })

    it('applies rewards category styling', () => {
      const rewardsTerm = { ...mockTerm, category: 'rewards' as const }
      render(<AgreementTermCard term={rewardsTerm} />)
      expect(screen.getByText('Rewards')).toBeInTheDocument()
    })

    it('applies general category styling', () => {
      const generalTerm = { ...mockTerm, category: 'general' as const }
      render(<AgreementTermCard term={generalTerm} />)
      expect(screen.getByText('General')).toBeInTheDocument()
    })
  })

  describe('Interactive Actions', () => {
    it('calls onClick when card is clicked', () => {
      const onClick = vi.fn()
      render(<AgreementTermCard term={mockTerm} onClick={onClick} />)

      fireEvent.click(screen.getByRole('button'))
      expect(onClick).toHaveBeenCalled()
    })

    it('calls onEdit when edit button is clicked', () => {
      const onEdit = vi.fn()
      const onClick = vi.fn()
      render(<AgreementTermCard term={mockTerm} onClick={onClick} onEdit={onEdit} />)

      fireEvent.click(screen.getByTestId('edit-term'))
      expect(onEdit).toHaveBeenCalled()
      expect(onClick).not.toHaveBeenCalled() // Should not bubble
    })

    it('calls onDelete when delete button is clicked', () => {
      const onDelete = vi.fn()
      const onClick = vi.fn()
      render(<AgreementTermCard term={mockTerm} onClick={onClick} onDelete={onDelete} />)

      fireEvent.click(screen.getByTestId('delete-term'))
      expect(onDelete).toHaveBeenCalled()
      expect(onClick).not.toHaveBeenCalled() // Should not bubble
    })

    it('shows selected state', () => {
      render(<AgreementTermCard term={mockTerm} isSelected={true} />)

      const card = screen.getByTestId('term-text').closest('div')!
      expect(card).toHaveAttribute('aria-selected', 'true')
    })
  })

  describe('Accessibility', () => {
    it('has accessible edit button', () => {
      render(<AgreementTermCard term={mockTerm} onEdit={() => {}} />)
      expect(screen.getByLabelText('Edit term')).toBeInTheDocument()
    })

    it('has accessible delete button', () => {
      render(<AgreementTermCard term={mockTerm} onDelete={() => {}} />)
      expect(screen.getByLabelText('Delete term')).toBeInTheDocument()
    })

    it('has 44px minimum touch targets for action buttons', () => {
      render(<AgreementTermCard term={mockTerm} onEdit={() => {}} onDelete={() => {}} />)

      const editButton = screen.getByTestId('edit-term')
      const deleteButton = screen.getByTestId('delete-term')

      expect(editButton).toHaveClass('min-w-[44px]', 'min-h-[44px]')
      expect(deleteButton).toHaveClass('min-w-[44px]', 'min-h-[44px]')
    })
  })
})
