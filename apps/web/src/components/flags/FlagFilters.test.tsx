/**
 * FlagFilters Component Tests - Story 22.1
 *
 * Tests for the FlagFilters component.
 * Covers acceptance criteria:
 * - AC4: Filters available by child, category, severity
 * - AC4: Multiple filters can be combined
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FlagFilters } from './FlagFilters'

describe('FlagFilters', () => {
  const mockChildren = [
    { id: 'child-1', name: 'Emma' },
    { id: 'child-2', name: 'Liam' },
    { id: 'child-3', name: 'Olivia' },
  ]

  const defaultProps = {
    familyChildren: mockChildren,
    selectedChildId: '',
    selectedCategory: '',
    selectedSeverity: '',
    onChildChange: vi.fn(),
    onCategoryChange: vi.fn(),
    onSeverityChange: vi.fn(),
    onClearFilters: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('AC4: Filter availability', () => {
    it('should render all filter controls', () => {
      render(<FlagFilters {...defaultProps} />)

      expect(screen.getByTestId('filter-child')).toBeInTheDocument()
      expect(screen.getByTestId('filter-category')).toBeInTheDocument()
      expect(screen.getByTestId('filter-severity')).toBeInTheDocument()
    })

    it('should show all children in the child filter dropdown', () => {
      render(<FlagFilters {...defaultProps} />)

      const childFilter = screen.getByTestId('filter-child')
      expect(childFilter).toHaveTextContent('All Children')
      expect(childFilter).toHaveTextContent('Emma')
      expect(childFilter).toHaveTextContent('Liam')
      expect(childFilter).toHaveTextContent('Olivia')
    })

    it('should show all categories in the category filter dropdown', () => {
      render(<FlagFilters {...defaultProps} />)

      const categoryFilter = screen.getByTestId('filter-category')
      expect(categoryFilter).toHaveTextContent('All Categories')
      expect(categoryFilter).toHaveTextContent('Violence')
      expect(categoryFilter).toHaveTextContent('Adult Content')
      expect(categoryFilter).toHaveTextContent('Bullying')
      expect(categoryFilter).toHaveTextContent('Self-Harm')
      expect(categoryFilter).toHaveTextContent('Explicit Language')
      expect(categoryFilter).toHaveTextContent('Unknown Contacts')
    })

    it('should show all severities in the severity filter dropdown', () => {
      render(<FlagFilters {...defaultProps} />)

      const severityFilter = screen.getByTestId('filter-severity')
      expect(severityFilter).toHaveTextContent('All Severities')
      expect(severityFilter).toHaveTextContent('High')
      expect(severityFilter).toHaveTextContent('Medium')
      expect(severityFilter).toHaveTextContent('Low')
    })
  })

  describe('Filter callbacks', () => {
    it('should call onChildChange when child filter changes', () => {
      const onChildChange = vi.fn()
      render(<FlagFilters {...defaultProps} onChildChange={onChildChange} />)

      const childFilter = screen.getByTestId('filter-child')
      fireEvent.change(childFilter, { target: { value: 'child-1' } })

      expect(onChildChange).toHaveBeenCalledWith('child-1')
    })

    it('should call onCategoryChange when category filter changes', () => {
      const onCategoryChange = vi.fn()
      render(<FlagFilters {...defaultProps} onCategoryChange={onCategoryChange} />)

      const categoryFilter = screen.getByTestId('filter-category')
      fireEvent.change(categoryFilter, { target: { value: 'Violence' } })

      expect(onCategoryChange).toHaveBeenCalledWith('Violence')
    })

    it('should call onSeverityChange when severity filter changes', () => {
      const onSeverityChange = vi.fn()
      render(<FlagFilters {...defaultProps} onSeverityChange={onSeverityChange} />)

      const severityFilter = screen.getByTestId('filter-severity')
      fireEvent.change(severityFilter, { target: { value: 'high' } })

      expect(onSeverityChange).toHaveBeenCalledWith('high')
    })
  })

  describe('Clear filters button', () => {
    it('should not show clear button when no filters are active', () => {
      render(<FlagFilters {...defaultProps} />)

      expect(screen.queryByTestId('clear-filters')).not.toBeInTheDocument()
    })

    it('should show clear button when child filter is active', () => {
      render(<FlagFilters {...defaultProps} selectedChildId="child-1" />)

      expect(screen.getByTestId('clear-filters')).toBeInTheDocument()
    })

    it('should show clear button when category filter is active', () => {
      render(<FlagFilters {...defaultProps} selectedCategory="Violence" />)

      expect(screen.getByTestId('clear-filters')).toBeInTheDocument()
    })

    it('should show clear button when severity filter is active', () => {
      render(<FlagFilters {...defaultProps} selectedSeverity="high" />)

      expect(screen.getByTestId('clear-filters')).toBeInTheDocument()
    })

    it('should show active filter count on clear button', () => {
      render(
        <FlagFilters
          {...defaultProps}
          selectedChildId="child-1"
          selectedCategory="Violence"
          selectedSeverity="high"
        />
      )

      const clearButton = screen.getByTestId('clear-filters')
      expect(clearButton).toHaveTextContent('3')
    })

    it('should call onClearFilters when clear button is clicked', () => {
      const onClearFilters = vi.fn()
      render(
        <FlagFilters {...defaultProps} selectedChildId="child-1" onClearFilters={onClearFilters} />
      )

      const clearButton = screen.getByTestId('clear-filters')
      fireEvent.click(clearButton)

      expect(onClearFilters).toHaveBeenCalledTimes(1)
    })
  })

  describe('AC4: Multiple filters can be combined', () => {
    it('should show multiple active filters simultaneously', () => {
      render(
        <FlagFilters
          {...defaultProps}
          selectedChildId="child-2"
          selectedCategory="Bullying"
          selectedSeverity="medium"
        />
      )

      const childFilter = screen.getByTestId('filter-child') as HTMLSelectElement
      const categoryFilter = screen.getByTestId('filter-category') as HTMLSelectElement
      const severityFilter = screen.getByTestId('filter-severity') as HTMLSelectElement

      expect(childFilter.value).toBe('child-2')
      expect(categoryFilter.value).toBe('Bullying')
      expect(severityFilter.value).toBe('medium')
    })

    it('should count all active filters correctly', () => {
      render(
        <FlagFilters {...defaultProps} selectedChildId="child-1" selectedCategory="Violence" />
      )

      const clearButton = screen.getByTestId('clear-filters')
      expect(clearButton).toHaveTextContent('2')
    })
  })

  describe('Filter labels', () => {
    it('should have proper labels for accessibility', () => {
      render(<FlagFilters {...defaultProps} />)

      expect(screen.getByLabelText('Child')).toBeInTheDocument()
      expect(screen.getByLabelText('Category')).toBeInTheDocument()
      expect(screen.getByLabelText('Severity')).toBeInTheDocument()
    })
  })

  describe('Empty children array', () => {
    it('should still render with no children options', () => {
      render(<FlagFilters {...defaultProps} familyChildren={[]} />)

      const childFilter = screen.getByTestId('filter-child')
      expect(childFilter).toBeInTheDocument()
      // Should only have the "All Children" option
      expect(childFilter.querySelectorAll('option').length).toBe(1)
    })
  })
})
