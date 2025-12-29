/**
 * Tests for AgeSelectionStep component.
 *
 * Story 4.4: Quick Start Wizard - AC1
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AgeSelectionStep } from '../AgeSelectionStep'

describe('AgeSelectionStep', () => {
  const mockOnSelectAgeGroup = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render step heading', () => {
      render(
        <AgeSelectionStep
          selectedAgeGroup={null}
          childAge={null}
          onSelectAgeGroup={mockOnSelectAgeGroup}
        />
      )

      expect(screen.getByText("What's your child's age group?")).toBeInTheDocument()
    })

    it('should render heading with child age when provided', () => {
      render(
        <AgeSelectionStep
          selectedAgeGroup="8-10"
          childAge={10}
          onSelectAgeGroup={mockOnSelectAgeGroup}
        />
      )

      expect(screen.getByText('Your child is 10 years old')).toBeInTheDocument()
    })

    it('should render all age group options', () => {
      render(
        <AgeSelectionStep
          selectedAgeGroup={null}
          childAge={null}
          onSelectAgeGroup={mockOnSelectAgeGroup}
        />
      )

      expect(screen.getByText('Ages 5-7')).toBeInTheDocument()
      expect(screen.getByText('Ages 8-10')).toBeInTheDocument()
      expect(screen.getByText('Ages 11-13')).toBeInTheDocument()
      expect(screen.getByText('Ages 14-16')).toBeInTheDocument()
    })

    it('should render descriptions for each age group', () => {
      render(
        <AgeSelectionStep
          selectedAgeGroup={null}
          childAge={null}
          onSelectAgeGroup={mockOnSelectAgeGroup}
        />
      )

      expect(screen.getByText(/Young children/)).toBeInTheDocument()
      expect(screen.getByText(/Growing independence/)).toBeInTheDocument()
      expect(screen.getByText(/Pre-teens/)).toBeInTheDocument()
      expect(screen.getByText(/Teens earning independence/)).toBeInTheDocument()
    })
  })

  describe('selection', () => {
    it('should call onSelectAgeGroup when age group is clicked', () => {
      render(
        <AgeSelectionStep
          selectedAgeGroup={null}
          childAge={null}
          onSelectAgeGroup={mockOnSelectAgeGroup}
        />
      )

      fireEvent.click(screen.getByText('Ages 8-10'))

      expect(mockOnSelectAgeGroup).toHaveBeenCalledWith('8-10')
    })

    it('should highlight selected age group', () => {
      render(
        <AgeSelectionStep
          selectedAgeGroup="11-13"
          childAge={null}
          onSelectAgeGroup={mockOnSelectAgeGroup}
        />
      )

      const selectedButton = screen.getByRole('button', { name: /Select Ages 11-13/ })
      expect(selectedButton).toHaveClass('border-primary')
    })

    it('should show checkmark on selected option', () => {
      render(
        <AgeSelectionStep
          selectedAgeGroup="8-10"
          childAge={null}
          onSelectAgeGroup={mockOnSelectAgeGroup}
        />
      )

      // The selected option should have the checkmark SVG
      const selectedButton = screen.getByRole('button', { name: /Select Ages 8-10/ })
      expect(selectedButton.querySelector('svg')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have radiogroup role', () => {
      render(
        <AgeSelectionStep
          selectedAgeGroup={null}
          childAge={null}
          onSelectAgeGroup={mockOnSelectAgeGroup}
        />
      )

      expect(screen.getByRole('radiogroup')).toBeInTheDocument()
    })

    it('should have aria-label on radiogroup', () => {
      render(
        <AgeSelectionStep
          selectedAgeGroup={null}
          childAge={null}
          onSelectAgeGroup={mockOnSelectAgeGroup}
        />
      )

      expect(screen.getByRole('radiogroup')).toHaveAttribute(
        'aria-label',
        "Select child's age group"
      )
    })

    it('should have aria-pressed on buttons', () => {
      render(
        <AgeSelectionStep
          selectedAgeGroup="8-10"
          childAge={null}
          onSelectAgeGroup={mockOnSelectAgeGroup}
        />
      )

      const selectedButton = screen.getByRole('button', { name: /Select Ages 8-10/ })
      expect(selectedButton).toHaveAttribute('aria-pressed', 'true')

      const unselectedButton = screen.getByRole('button', { name: /Select Ages 5-7/ })
      expect(unselectedButton).toHaveAttribute('aria-pressed', 'false')
    })

    it('should have aria-label on each option', () => {
      render(
        <AgeSelectionStep
          selectedAgeGroup={null}
          childAge={null}
          onSelectAgeGroup={mockOnSelectAgeGroup}
        />
      )

      expect(screen.getByRole('button', { name: /Select Ages 5-7/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Select Ages 8-10/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Select Ages 11-13/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Select Ages 14-16/ })).toBeInTheDocument()
    })

    it('should have icons hidden from screen readers', () => {
      render(
        <AgeSelectionStep
          selectedAgeGroup={null}
          childAge={null}
          onSelectAgeGroup={mockOnSelectAgeGroup}
        />
      )

      const icons = document.querySelectorAll('[aria-hidden="true"]')
      expect(icons.length).toBeGreaterThan(0)
    })
  })

  describe('touch targets (NFR49)', () => {
    it('should have minimum height on buttons', () => {
      render(
        <AgeSelectionStep
          selectedAgeGroup={null}
          childAge={null}
          onSelectAgeGroup={mockOnSelectAgeGroup}
        />
      )

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toHaveClass('min-h-[120px]')
      })
    })
  })
})
