/**
 * Integration Tests for Template Preview & Selection Flow
 *
 * Story 4.3: Template Preview & Selection - Task 6
 * AC #1-6: End-to-end flow testing
 *
 * Tests the complete user journey:
 * 1. Browse template library
 * 2. Open template preview
 * 3. Review template details
 * 4. Compare templates
 * 5. Select and proceed to agreement creation
 */

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TemplatePreviewDialog } from '../TemplatePreviewDialog'
import { TemplateComparisonDialog } from '../TemplateComparisonDialog'
import {
  TemplateComparisonProvider,
  useTemplateComparisonStore,
} from '@/stores/templateComparisonStore'
import type { AgreementTemplate } from '@fledgely/contracts'

// Comprehensive mock templates representing different age groups and variations
const mockTemplates: AgreementTemplate[] = [
  {
    id: 'template-1-strict',
    name: 'Early Learner Boundaries',
    description: 'A structured approach for young children learning about technology.',
    ageGroup: '5-7',
    variation: 'strict',
    concerns: ['screen_time', 'safety'],
    summary: {
      screenTimeLimit: '30 minutes per day',
      monitoringLevel: 'comprehensive',
      keyRules: ['Parent always present', 'Educational content only', 'No social media'],
    },
    sections: [
      {
        id: 's1-1',
        type: 'screen_time',
        title: 'Daily Screen Time',
        description: 'How long you can use devices.',
        defaultValue: '30 minutes per day, educational content only',
        customizable: true,
        order: 0,
      },
      {
        id: 's1-2',
        type: 'monitoring_rules',
        title: 'Supervision',
        description: 'How parents will help.',
        defaultValue: 'A parent must be present during all screen time',
        customizable: false,
        order: 1,
      },
    ],
    createdAt: '2024-01-15T00:00:00.000Z',
    updatedAt: '2024-01-15T00:00:00.000Z',
  },
  {
    id: 'template-2-balanced',
    name: 'Middle Childhood Balance',
    description: 'A balanced approach for ages 8-10.',
    ageGroup: '8-10',
    variation: 'balanced',
    concerns: ['screen_time', 'homework', 'gaming'],
    summary: {
      screenTimeLimit: '1 hour school days, 2 hours weekends',
      monitoringLevel: 'moderate',
      keyRules: ['Homework first', 'Check-ins during gaming', 'Approved apps only'],
    },
    sections: [
      {
        id: 's2-1',
        type: 'screen_time',
        title: 'Screen Time Limits',
        description: 'Daily and weekly screen time.',
        defaultValue: '1 hour on school days, 2 hours on weekends',
        customizable: true,
        order: 0,
      },
      {
        id: 's2-2',
        type: 'homework',
        title: 'Homework First Rule',
        description: 'Screen time after responsibilities.',
        defaultValue: 'Complete homework before screen time',
        customizable: true,
        order: 1,
      },
      {
        id: 's2-3',
        type: 'gaming',
        title: 'Gaming Guidelines',
        description: 'Rules for video games.',
        defaultValue: 'Age-appropriate games only, 30-minute sessions',
        customizable: true,
        order: 2,
      },
    ],
    createdAt: '2024-01-15T00:00:00.000Z',
    updatedAt: '2024-01-15T00:00:00.000Z',
  },
  {
    id: 'template-3-permissive',
    name: 'Teen Autonomy Plan',
    description: 'A flexible approach for responsible teens.',
    ageGroup: '14-16',
    variation: 'permissive',
    concerns: ['social_media', 'privacy', 'communication'],
    summary: {
      screenTimeLimit: 'Self-managed with weekly check-ins',
      monitoringLevel: 'light',
      keyRules: ['Weekly family discussion', 'Respect privacy boundaries', 'Open communication'],
    },
    sections: [
      {
        id: 's3-1',
        type: 'screen_time',
        title: 'Screen Time Guidelines',
        description: 'Teen-led time management.',
        defaultValue: 'Self-managed with weekly family check-ins',
        customizable: true,
        order: 0,
      },
      {
        id: 's3-2',
        type: 'social_media',
        title: 'Social Media',
        description: 'Social media boundaries.',
        defaultValue: 'Approved platforms, public profiles discussed with parents',
        customizable: true,
        order: 1,
      },
      {
        id: 's3-3',
        type: 'privacy',
        title: 'Privacy Agreement',
        description: 'Respecting privacy while staying safe.',
        defaultValue: 'Private messages respected unless safety concerns arise',
        customizable: true,
        order: 2,
      },
    ],
    createdAt: '2024-01-15T00:00:00.000Z',
    updatedAt: '2024-01-15T00:00:00.000Z',
  },
]

// Test wrapper with comparison provider
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <TemplateComparisonProvider>{children}</TemplateComparisonProvider>
}

describe('Template Preview & Selection Integration', () => {
  describe('preview dialog flow', () => {
    it('shows all template sections when opened', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplates[1]}
          isOpen={true}
          onClose={() => {}}
        />
      )

      // Template name and description
      expect(screen.getByText('Middle Childhood Balance')).toBeInTheDocument()
      expect(screen.getByText(/balanced approach for ages 8-10/i)).toBeInTheDocument()

      // Summary information
      expect(screen.getByText(/1 hour school days/i)).toBeInTheDocument()
      expect(screen.getByText(/moderate/i)).toBeInTheDocument()

      // Key rules (appears in multiple places, so use getAllByText)
      const homeworkElements = screen.getAllByText(/homework first/i)
      expect(homeworkElements.length).toBeGreaterThan(0)

      // Section titles
      expect(screen.getByText('Screen Time Limits')).toBeInTheDocument()
      expect(screen.getByText('Homework First Rule')).toBeInTheDocument()
      expect(screen.getByText('Gaming Guidelines')).toBeInTheDocument()
    })

    it('displays customizable sections with indicators', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplates[1]}
          isOpen={true}
          onClose={() => {}}
        />
      )

      // Customizable badges should be present
      const customizableBadges = screen.getAllByLabelText(/customiz/i)
      expect(customizableBadges.length).toBeGreaterThan(0)
    })

    it('allows selection of template via Use This Template button', async () => {
      const user = userEvent.setup()
      const handleSelect = vi.fn()

      render(
        <TemplatePreviewDialog
          template={mockTemplates[0]}
          isOpen={true}
          onClose={() => {}}
          onSelect={handleSelect}
        />
      )

      const selectButton = screen.getByRole('button', { name: /use this template/i })
      await user.click(selectButton)

      expect(handleSelect).toHaveBeenCalledWith(mockTemplates[0])
    })

    it('closes dialog on backdrop click', async () => {
      const user = userEvent.setup()
      const handleClose = vi.fn()

      render(
        <TemplatePreviewDialog
          template={mockTemplates[0]}
          isOpen={true}
          onClose={handleClose}
        />
      )

      // Click the backdrop (first element with aria-hidden)
      const backdrop = document.querySelector('[aria-hidden="true"]')
      if (backdrop) {
        await user.click(backdrop)
        expect(handleClose).toHaveBeenCalled()
      }
    })

    it('shows age-appropriate content based on template', () => {
      render(
        <TemplatePreviewDialog
          template={mockTemplates[0]}
          isOpen={true}
          onClose={() => {}}
        />
      )

      // Early Childhood (5-7) template
      expect(screen.getByText(/Early Childhood/i)).toBeInTheDocument()
      // Screen time appears in multiple places (summary and section)
      const screenTimeElements = screen.getAllByText(/30 minutes/i)
      expect(screenTimeElements.length).toBeGreaterThan(0)
    })
  })

  describe('comparison dialog flow', () => {
    it('displays all templates in comparison view', () => {
      render(
        <TemplateComparisonDialog
          templates={mockTemplates}
          isOpen={true}
          onClose={() => {}}
        />
      )

      expect(screen.getByText('Early Learner Boundaries')).toBeInTheDocument()
      expect(screen.getByText('Middle Childhood Balance')).toBeInTheDocument()
      expect(screen.getByText('Teen Autonomy Plan')).toBeInTheDocument()
    })

    it('shows key comparison metrics for each template', () => {
      render(
        <TemplateComparisonDialog
          templates={mockTemplates.slice(0, 2)}
          isOpen={true}
          onClose={() => {}}
        />
      )

      // Screen time labels and values
      const screenTimeLabels = screen.getAllByText(/screen time/i)
      expect(screenTimeLabels.length).toBeGreaterThanOrEqual(2)

      // Monitoring labels
      const monitoringLabels = screen.getAllByText(/monitoring/i)
      expect(monitoringLabels.length).toBeGreaterThanOrEqual(2)
    })

    it('allows selection of a template from comparison', async () => {
      const user = userEvent.setup()
      const handleSelect = vi.fn()

      render(
        <TemplateComparisonDialog
          templates={mockTemplates.slice(0, 2)}
          isOpen={true}
          onClose={() => {}}
          onSelect={handleSelect}
        />
      )

      const selectButtons = screen.getAllByRole('button', { name: /select this template/i })
      await user.click(selectButtons[1])

      expect(handleSelect).toHaveBeenCalledWith(mockTemplates[1])
    })

    it('allows removal of template from comparison', async () => {
      const user = userEvent.setup()
      const handleRemove = vi.fn()

      render(
        <TemplateComparisonDialog
          templates={mockTemplates.slice(0, 2)}
          isOpen={true}
          onClose={() => {}}
          onRemove={handleRemove}
        />
      )

      const removeButtons = screen.getAllByRole('button', { name: /remove from comparison/i })
      await user.click(removeButtons[0])

      expect(handleRemove).toHaveBeenCalledWith(mockTemplates[0].id)
    })

    it('allows clearing all comparisons', async () => {
      const user = userEvent.setup()
      const handleClear = vi.fn()

      render(
        <TemplateComparisonDialog
          templates={mockTemplates}
          isOpen={true}
          onClose={() => {}}
          onClear={handleClear}
        />
      )

      const clearButton = screen.getByRole('button', { name: /clear all/i })
      await user.click(clearButton)

      expect(handleClear).toHaveBeenCalled()
    })
  })

  describe('comparison state management', () => {
    function ComparisonStateTest() {
      const store = useTemplateComparisonStore()
      return (
        <div>
          <p data-testid="count">{store.comparisonCount}</p>
          <p data-testid="comparing">{store.isComparing.toString()}</p>
          <p data-testid="can-add">{store.canAddMore.toString()}</p>
          <button onClick={() => store.addToComparison('t1')}>Add T1</button>
          <button onClick={() => store.addToComparison('t2')}>Add T2</button>
          <button onClick={() => store.addToComparison('t3')}>Add T3</button>
          <button onClick={() => store.removeFromComparison('t1')}>Remove T1</button>
          <button onClick={() => store.clearComparison()}>Clear</button>
          <button onClick={() => store.toggleComparison('t1')}>Toggle T1</button>
        </div>
      )
    }

    it('tracks comparison state correctly through add/remove cycle', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <ComparisonStateTest />
        </TestWrapper>
      )

      // Initial state
      expect(screen.getByTestId('count')).toHaveTextContent('0')
      expect(screen.getByTestId('comparing')).toHaveTextContent('false')
      expect(screen.getByTestId('can-add')).toHaveTextContent('true')

      // Add first template
      await user.click(screen.getByRole('button', { name: 'Add T1' }))
      expect(screen.getByTestId('count')).toHaveTextContent('1')
      expect(screen.getByTestId('comparing')).toHaveTextContent('true')

      // Add second template
      await user.click(screen.getByRole('button', { name: 'Add T2' }))
      expect(screen.getByTestId('count')).toHaveTextContent('2')

      // Add third template
      await user.click(screen.getByRole('button', { name: 'Add T3' }))
      expect(screen.getByTestId('count')).toHaveTextContent('3')
      expect(screen.getByTestId('can-add')).toHaveTextContent('false')

      // Remove one
      await user.click(screen.getByRole('button', { name: 'Remove T1' }))
      expect(screen.getByTestId('count')).toHaveTextContent('2')
      expect(screen.getByTestId('can-add')).toHaveTextContent('true')

      // Clear all
      await user.click(screen.getByRole('button', { name: 'Clear' }))
      expect(screen.getByTestId('count')).toHaveTextContent('0')
      expect(screen.getByTestId('comparing')).toHaveTextContent('false')
    })

    it('toggle adds when not in comparison', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <ComparisonStateTest />
        </TestWrapper>
      )

      await user.click(screen.getByRole('button', { name: 'Toggle T1' }))
      expect(screen.getByTestId('count')).toHaveTextContent('1')
    })

    it('toggle removes when already in comparison', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <ComparisonStateTest />
        </TestWrapper>
      )

      // Add then toggle (should remove)
      await user.click(screen.getByRole('button', { name: 'Add T1' }))
      await user.click(screen.getByRole('button', { name: 'Toggle T1' }))
      expect(screen.getByTestId('count')).toHaveTextContent('0')
    })
  })

  describe('keyboard navigation integration', () => {
    it('supports full keyboard navigation in preview dialog', async () => {
      const user = userEvent.setup()
      const handleClose = vi.fn()
      const handleSelect = vi.fn()

      render(
        <TemplatePreviewDialog
          template={mockTemplates[0]}
          isOpen={true}
          onClose={handleClose}
          onSelect={handleSelect}
        />
      )

      // Wait for focus to be set
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Tab through elements
      await user.tab()
      await user.tab()

      // Escape should close
      await user.keyboard('{Escape}')
      expect(handleClose).toHaveBeenCalled()
    })

    it('supports full keyboard navigation in comparison dialog', async () => {
      const user = userEvent.setup()
      const handleClose = vi.fn()

      render(
        <TemplateComparisonDialog
          templates={mockTemplates.slice(0, 2)}
          isOpen={true}
          onClose={handleClose}
          onSelect={() => {}}
        />
      )

      // Wait for focus to be set
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Tab through elements
      await user.tab()
      await user.tab()

      // Escape should close
      await user.keyboard('{Escape}')
      expect(handleClose).toHaveBeenCalled()
    })
  })

  describe('empty and edge case handling', () => {
    it('shows empty state in comparison dialog', () => {
      render(
        <TemplateComparisonDialog
          templates={[]}
          isOpen={true}
          onClose={() => {}}
        />
      )

      expect(screen.getByText(/no templates selected/i)).toBeInTheDocument()
    })

    it('handles single template in comparison view', () => {
      render(
        <TemplateComparisonDialog
          templates={[mockTemplates[0]]}
          isOpen={true}
          onClose={() => {}}
        />
      )

      expect(screen.getByText('Early Learner Boundaries')).toBeInTheDocument()
    })

    it('handles template with minimal data', () => {
      const minimalTemplate: AgreementTemplate = {
        id: 'minimal-1',
        name: 'Minimal Template',
        description: 'Basic template.',
        ageGroup: '8-10',
        variation: 'balanced',
        concerns: [],
        summary: {
          screenTimeLimit: '1 hour',
          monitoringLevel: 'moderate',
          keyRules: [],
        },
        sections: [],
        createdAt: '2024-01-15T00:00:00.000Z',
        updatedAt: '2024-01-15T00:00:00.000Z',
      }

      render(
        <TemplatePreviewDialog
          template={minimalTemplate}
          isOpen={true}
          onClose={() => {}}
        />
      )

      expect(screen.getByText('Minimal Template')).toBeInTheDocument()
      expect(screen.getByText(/1 hour/i)).toBeInTheDocument()
    })
  })

  describe('responsive behavior', () => {
    it('comparison dialog uses correct grid layout for 1 template', () => {
      const { container } = render(
        <TemplateComparisonDialog
          templates={[mockTemplates[0]]}
          isOpen={true}
          onClose={() => {}}
        />
      )

      const grid = container.querySelector('.grid')
      expect(grid?.className).toContain('grid-cols-1')
    })

    it('comparison dialog uses correct grid layout for 2 templates', () => {
      const { container } = render(
        <TemplateComparisonDialog
          templates={mockTemplates.slice(0, 2)}
          isOpen={true}
          onClose={() => {}}
        />
      )

      const grid = container.querySelector('.grid')
      expect(grid?.className).toContain('md:grid-cols-2')
    })

    it('comparison dialog uses correct grid layout for 3 templates', () => {
      const { container } = render(
        <TemplateComparisonDialog
          templates={mockTemplates}
          isOpen={true}
          onClose={() => {}}
        />
      )

      const grid = container.querySelector('.grid')
      expect(grid?.className).toContain('md:grid-cols-3')
    })
  })

  describe('variation badge display', () => {
    it('shows strict badge with correct styling', () => {
      render(
        <TemplateComparisonDialog
          templates={[mockTemplates[0]]}
          isOpen={true}
          onClose={() => {}}
        />
      )

      expect(screen.getByText('Strict')).toBeInTheDocument()
    })

    it('shows balanced badge with correct styling', () => {
      render(
        <TemplateComparisonDialog
          templates={[mockTemplates[1]]}
          isOpen={true}
          onClose={() => {}}
        />
      )

      expect(screen.getByText('Balanced')).toBeInTheDocument()
    })

    it('shows permissive badge with correct styling', () => {
      render(
        <TemplateComparisonDialog
          templates={[mockTemplates[2]]}
          isOpen={true}
          onClose={() => {}}
        />
      )

      expect(screen.getByText('Permissive')).toBeInTheDocument()
    })
  })
})
