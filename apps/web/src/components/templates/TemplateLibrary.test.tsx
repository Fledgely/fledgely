/**
 * Unit tests for TemplateLibrary component.
 *
 * Story 4.1: Template Library Structure - AC1, AC2, AC4, AC5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TemplateLibrary } from './TemplateLibrary'
import type { AgreementTemplate } from '@fledgely/shared/contracts'

// Mock the hooks
vi.mock('../../hooks/useTemplates', () => ({
  useTemplateLibrary: vi.fn(),
}))

import { useTemplateLibrary } from '../../hooks/useTemplates'

const mockTemplates: AgreementTemplate[] = [
  {
    id: 'template-1',
    name: 'Supervised Explorer',
    description: 'High supervision for young children.',
    ageGroup: '5-7',
    variation: 'strict',
    categories: ['general'],
    screenTimeLimits: { weekday: 60, weekend: 90 },
    monitoringLevel: 'high',
    keyRules: ['Device only in common areas', 'Parent approves all apps'],
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'template-2',
    name: 'Safe Surfer',
    description: 'Strong boundaries for pre-teens.',
    ageGroup: '8-10',
    variation: 'strict',
    categories: ['gaming', 'general'],
    screenTimeLimits: { weekday: 60, weekend: 120 },
    monitoringLevel: 'high',
    keyRules: ['No social media accounts', 'Gaming limited to weekends'],
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'template-3',
    name: 'Connected Teen',
    description: 'Supervised social media access.',
    ageGroup: '11-13',
    variation: 'balanced',
    categories: ['social_media', 'gaming'],
    screenTimeLimits: { weekday: 120, weekend: 180 },
    monitoringLevel: 'medium',
    keyRules: ['Parent knows all passwords', 'Weekly social media check-in'],
    createdAt: new Date('2024-01-01'),
  },
]

describe('TemplateLibrary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useTemplateLibrary).mockReturnValue({
      data: mockTemplates,
      isLoading: false,
      error: null,
      isPending: false,
      isSuccess: true,
      isError: false,
      status: 'success',
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useTemplateLibrary>)
  })

  describe('rendering', () => {
    it('renders search input', () => {
      render(<TemplateLibrary />)
      expect(
        screen.getByPlaceholderText('Search templates by name, description, or rules...')
      ).toBeInTheDocument()
    })

    it('renders age group tabs', () => {
      render(<TemplateLibrary />)
      expect(screen.getByRole('tab', { name: 'All Ages' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Ages 5-7' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Ages 8-10' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Ages 11-13' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Ages 14-16' })).toBeInTheDocument()
    })

    it('renders category filter buttons', () => {
      render(<TemplateLibrary />)
      expect(screen.getByRole('button', { name: 'Gaming' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Social Media' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Homework' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'General' })).toBeInTheDocument()
    })

    it('renders template cards', () => {
      render(<TemplateLibrary />)
      expect(screen.getByText('Supervised Explorer')).toBeInTheDocument()
      expect(screen.getByText('Safe Surfer')).toBeInTheDocument()
      expect(screen.getByText('Connected Teen')).toBeInTheDocument()
    })

    it('shows template count', () => {
      render(<TemplateLibrary />)
      expect(screen.getByText('3 templates found')).toBeInTheDocument()
    })

    it('shows singular count for one template', () => {
      vi.mocked(useTemplateLibrary).mockReturnValue({
        data: [mockTemplates[0]],
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useTemplateLibrary>)

      render(<TemplateLibrary />)
      expect(screen.getByText('1 template found')).toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    it('shows loading indicator while loading', () => {
      vi.mocked(useTemplateLibrary).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as unknown as ReturnType<typeof useTemplateLibrary>)

      render(<TemplateLibrary />)
      expect(screen.getByText('Loading templates...')).toBeInTheDocument()
    })
  })

  describe('error state', () => {
    it('shows error message on error', () => {
      vi.mocked(useTemplateLibrary).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
      } as unknown as ReturnType<typeof useTemplateLibrary>)

      render(<TemplateLibrary />)
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('Error loading templates')).toBeInTheDocument()
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('shows empty state when no templates match', () => {
      vi.mocked(useTemplateLibrary).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useTemplateLibrary>)

      render(<TemplateLibrary />)
      expect(screen.getByText('No templates found')).toBeInTheDocument()
    })
  })

  describe('age group filtering (AC2)', () => {
    it('All Ages tab is selected by default', () => {
      render(<TemplateLibrary />)
      const allAgesTab = screen.getByRole('tab', { name: 'All Ages' })
      expect(allAgesTab).toHaveAttribute('aria-selected', 'true')
    })

    it('selects age group when tab is clicked', () => {
      render(<TemplateLibrary />)

      const ageGroupTab = screen.getByRole('tab', { name: 'Ages 8-10' })
      fireEvent.click(ageGroupTab)

      expect(ageGroupTab).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByRole('tab', { name: 'All Ages' })).toHaveAttribute(
        'aria-selected',
        'false'
      )
    })

    it('passes age group filter to hook', () => {
      render(<TemplateLibrary />)

      fireEvent.click(screen.getByRole('tab', { name: 'Ages 8-10' }))

      expect(useTemplateLibrary).toHaveBeenCalledWith(
        expect.objectContaining({
          ageGroup: '8-10',
        })
      )
    })

    it('accepts initial age group prop', () => {
      render(<TemplateLibrary initialAgeGroup="11-13" />)

      expect(screen.getByRole('tab', { name: 'Ages 11-13' })).toHaveAttribute(
        'aria-selected',
        'true'
      )
    })
  })

  describe('category filtering (AC4)', () => {
    it('category buttons start unselected', () => {
      render(<TemplateLibrary />)

      const gamingButton = screen.getByRole('button', { name: 'Gaming' })
      expect(gamingButton).toHaveAttribute('aria-pressed', 'false')
    })

    it('toggles category selection when clicked', () => {
      render(<TemplateLibrary />)

      const gamingButton = screen.getByRole('button', { name: 'Gaming' })
      fireEvent.click(gamingButton)

      expect(gamingButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('allows multiple categories to be selected', () => {
      render(<TemplateLibrary />)

      fireEvent.click(screen.getByRole('button', { name: 'Gaming' }))
      fireEvent.click(screen.getByRole('button', { name: 'Social Media' }))

      expect(screen.getByRole('button', { name: 'Gaming' })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByRole('button', { name: 'Social Media' })).toHaveAttribute(
        'aria-pressed',
        'true'
      )
    })

    it('deselects category when clicked again', () => {
      render(<TemplateLibrary />)

      const gamingButton = screen.getByRole('button', { name: 'Gaming' })
      fireEvent.click(gamingButton)
      fireEvent.click(gamingButton)

      expect(gamingButton).toHaveAttribute('aria-pressed', 'false')
    })

    it('passes category filter to hook', () => {
      render(<TemplateLibrary />)

      fireEvent.click(screen.getByRole('button', { name: 'Gaming' }))

      expect(useTemplateLibrary).toHaveBeenCalledWith(
        expect.objectContaining({
          categories: ['gaming'],
        })
      )
    })
  })

  describe('search functionality (AC4)', () => {
    it('updates search query on input', async () => {
      render(<TemplateLibrary />)

      const searchInput = screen.getByPlaceholderText(
        'Search templates by name, description, or rules...'
      )
      fireEvent.change(searchInput, { target: { value: 'social' } })

      await waitFor(() => {
        expect(useTemplateLibrary).toHaveBeenCalledWith(
          expect.objectContaining({
            searchQuery: 'social',
          })
        )
      })
    })

    it('shows clear button when search has value', () => {
      render(<TemplateLibrary />)

      const searchInput = screen.getByPlaceholderText(
        'Search templates by name, description, or rules...'
      )
      fireEvent.change(searchInput, { target: { value: 'test' } })

      expect(screen.getByRole('button', { name: 'Clear search' })).toBeInTheDocument()
    })

    it('clears search when clear button is clicked', () => {
      render(<TemplateLibrary />)

      const searchInput = screen.getByPlaceholderText(
        'Search templates by name, description, or rules...'
      ) as HTMLInputElement

      fireEvent.change(searchInput, { target: { value: 'test' } })
      fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))

      expect(searchInput.value).toBe('')
    })
  })

  describe('clear filters', () => {
    it('shows clear filters button when filters are active', () => {
      render(<TemplateLibrary />)

      fireEvent.click(screen.getByRole('button', { name: 'Gaming' }))

      expect(screen.getByRole('button', { name: 'Clear all filters' })).toBeInTheDocument()
    })

    it('does not show clear filters button when no filters active', () => {
      render(<TemplateLibrary />)

      expect(screen.queryByRole('button', { name: 'Clear all filters' })).not.toBeInTheDocument()
    })

    it('clears all filters when clicked', () => {
      render(<TemplateLibrary />)

      // Apply some filters
      fireEvent.click(screen.getByRole('tab', { name: 'Ages 8-10' }))
      fireEvent.click(screen.getByRole('button', { name: 'Gaming' }))

      // Clear filters
      fireEvent.click(screen.getByRole('button', { name: 'Clear all filters' }))

      // Verify filters are cleared
      expect(screen.getByRole('tab', { name: 'All Ages' })).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByRole('button', { name: 'Gaming' })).toHaveAttribute(
        'aria-pressed',
        'false'
      )
    })
  })

  describe('template selection', () => {
    it('calls onSelectTemplate when a template card is clicked', () => {
      const onSelectTemplate = vi.fn()
      render(<TemplateLibrary onSelectTemplate={onSelectTemplate} />)

      fireEvent.click(screen.getByText('Supervised Explorer').closest('button')!)

      expect(onSelectTemplate).toHaveBeenCalledWith(mockTemplates[0])
    })

    it('marks template as selected when selectedTemplateId matches', () => {
      render(<TemplateLibrary selectedTemplateId="template-1" onSelectTemplate={vi.fn()} />)

      const selectedCard = screen.getByLabelText(/Select Supervised Explorer template/)
      expect(selectedCard).toHaveAttribute('aria-pressed', 'true')
    })
  })

  describe('accessibility', () => {
    it('has accessible tablist for age groups', () => {
      render(<TemplateLibrary />)
      expect(
        screen.getByRole('tablist', { name: 'Filter templates by age group' })
      ).toBeInTheDocument()
    })

    it('has accessible group for categories', () => {
      render(<TemplateLibrary />)
      expect(screen.getByRole('group', { name: 'Filter by category' })).toBeInTheDocument()
    })

    it('has accessible label for template list', () => {
      render(<TemplateLibrary />)
      expect(screen.getByRole('list', { name: 'Available templates' })).toBeInTheDocument()
    })

    it('tabs have minimum touch target size', () => {
      render(<TemplateLibrary />)
      const tab = screen.getByRole('tab', { name: 'All Ages' })
      expect(tab).toHaveClass('min-h-[44px]')
    })
  })
})
