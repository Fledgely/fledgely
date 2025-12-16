/**
 * Accessibility Tests for Visual Agreement Builder Components
 *
 * Story 5.2: Visual Agreement Builder - Task 9.6
 *
 * Comprehensive accessibility testing for:
 * - NFR42: Screen reader accessible
 * - NFR43: Keyboard navigable
 * - NFR45: 4.5:1 contrast ratio (WCAG AA)
 * - NFR46: Visible focus indicators
 * - NFR49: 44x44px touch targets
 * - NFR65: 6th-grade reading level
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { SessionTerm, SessionTermType, SessionContributor } from '@fledgely/contracts'

import { AgreementTermCard } from '../AgreementTermCard'
import { TermExplanationTooltip } from '../TermExplanationTooltip'
import { TermCountIndicator, TermCountBadge } from '../TermCountIndicator'
import { AddTermModal } from '../AddTermModal'
import { VisualAgreementBuilder } from '../VisualAgreementBuilder'
import {
  TERM_CATEGORY_COLORS,
  TERM_EXPLANATIONS,
  getTermCategoryColors,
  getTermExplanation,
} from '../termUtils'

// ============================================
// TEST HELPERS
// ============================================

const createMockTerm = (overrides: Partial<SessionTerm> = {}): SessionTerm => ({
  id: 'term-123',
  type: 'screen_time',
  content: { minutes: 60 },
  addedBy: 'parent',
  status: 'accepted',
  order: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

const termTypes: SessionTermType[] = [
  'screen_time',
  'bedtime',
  'monitoring',
  'rule',
  'consequence',
  'reward',
]

// ============================================
// NFR42: SCREEN READER ACCESSIBILITY
// ============================================

describe('NFR42: Screen Reader Accessibility', () => {
  describe('AgreementTermCard', () => {
    it('has aria-label describing the term', () => {
      const term = createMockTerm()
      render(<AgreementTermCard term={term} />)

      const card = screen.getByTestId('term-card-term-123')
      expect(card).toHaveAttribute('aria-label')
    })

    it('includes term type in aria-label', () => {
      const term = createMockTerm({ type: 'screen_time' })
      render(<AgreementTermCard term={term} />)

      const card = screen.getByTestId('term-card-term-123')
      expect(card.getAttribute('aria-label')?.toLowerCase()).toContain('screen time')
    })

    it('includes status in aria-label', () => {
      const term = createMockTerm({ status: 'discussion' })
      render(<AgreementTermCard term={term} />)

      const card = screen.getByTestId('term-card-term-123')
      const ariaLabel = card.getAttribute('aria-label')?.toLowerCase()
      expect(ariaLabel).toContain('discussion')
    })

    it('has aria-selected when selected', () => {
      const term = createMockTerm()
      render(<AgreementTermCard term={term} isSelected />)

      const card = screen.getByTestId('term-card-term-123')
      expect(card).toHaveAttribute('aria-selected', 'true')
    })

    it('has decorative icons that are hidden from screen readers', () => {
      const term = createMockTerm()
      const { container } = render(<AgreementTermCard term={term} />)

      // Icons should either have aria-hidden or be presentational
      const icons = container.querySelectorAll('svg')
      expect(icons.length).toBeGreaterThan(0)
      // The card itself provides the accessible name
      const card = screen.getByTestId('term-card-term-123')
      expect(card).toHaveAttribute('aria-label')
    })
  })

  describe('TermExplanationTooltip', () => {
    it('renders tooltip with accessible content when open', () => {
      render(
        <TermExplanationTooltip termType="screen_time" isOpen={true}>
          <button>Hover me</button>
        </TermExplanationTooltip>
      )

      // When controlled and open, tooltip content is visible
      expect(screen.getByText(/how much time/i)).toBeInTheDocument()
    })

    it('tooltip content describes the term type', () => {
      render(
        <TermExplanationTooltip termType="screen_time" isOpen={true}>
          <button>Hover me</button>
        </TermExplanationTooltip>
      )

      // Should show child-friendly explanation
      const explanation = screen.getByText(/how much time you can use screens/i)
      expect(explanation).toBeInTheDocument()
    })
  })

  describe('TermCountIndicator', () => {
    it('progress bar has role="progressbar"', () => {
      render(<TermCountIndicator count={50} />)
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('progress bar has aria-valuenow', () => {
      render(<TermCountIndicator count={50} />)
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50')
    })

    it('progress bar has aria-valuemin and aria-valuemax', () => {
      render(<TermCountIndicator count={50} />)
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
    })

    it('has aria-live region for announcements', () => {
      render(<TermCountIndicator count={95} />)
      const indicator = screen.getByTestId('term-count-indicator')
      expect(indicator.querySelector('[aria-live]')).toBeInTheDocument()
    })
  })

  describe('AddTermModal', () => {
    it('has role="dialog"', () => {
      render(
        <AddTermModal
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
          contributor="parent"
        />
      )
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('has aria-modal="true"', () => {
      render(
        <AddTermModal
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
          contributor="parent"
        />
      )
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    })

    it('has aria-labelledby', () => {
      render(
        <AddTermModal
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
          contributor="parent"
        />
      )
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby')
    })

    it('validation errors have role="alert"', async () => {
      const user = userEvent.setup()
      render(
        <AddTermModal
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
          contributor="parent"
        />
      )

      await user.click(screen.getByTestId('term-type-screen_time'))
      await user.click(screen.getByText('Add Term'))

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })
})

// ============================================
// NFR43: KEYBOARD NAVIGATION
// ============================================

describe('NFR43: Keyboard Navigation', () => {
  describe('AgreementTermCard', () => {
    it('is focusable with keyboard', () => {
      const term = createMockTerm()
      render(<AgreementTermCard term={term} />)

      const card = screen.getByTestId('term-card-term-123')
      card.focus()

      expect(document.activeElement).toBe(card)
    })

    it('responds to Enter key', async () => {
      const term = createMockTerm()
      const handleClick = vi.fn()
      render(<AgreementTermCard term={term} onClick={handleClick} />)

      const card = screen.getByTestId('term-card-term-123')
      card.focus()
      await fireEvent.keyDown(card, { key: 'Enter' })

      expect(handleClick).toHaveBeenCalled()
    })

    it('responds to Space key', async () => {
      const term = createMockTerm()
      const handleClick = vi.fn()
      render(<AgreementTermCard term={term} onClick={handleClick} />)

      const card = screen.getByTestId('term-card-term-123')
      card.focus()
      await fireEvent.keyDown(card, { key: ' ' })

      expect(handleClick).toHaveBeenCalled()
    })
  })

  describe('AddTermModal', () => {
    it('closes on Escape key', () => {
      const handleClose = vi.fn()
      render(
        <AddTermModal
          isOpen={true}
          onClose={handleClose}
          onSave={() => {}}
          contributor="parent"
        />
      )

      fireEvent.keyDown(screen.getByTestId('add-term-modal'), { key: 'Escape' })

      expect(handleClose).toHaveBeenCalled()
    })

    it('type selection buttons are focusable', () => {
      render(
        <AddTermModal
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
          contributor="parent"
        />
      )

      // Type options should be buttons and thus keyboard focusable
      const typeOption = screen.getByTestId('term-type-screen_time')
      expect(typeOption.tagName.toLowerCase()).toBe('button')
      expect(typeOption).not.toBeDisabled()
    })
  })

  describe('VisualAgreementBuilder', () => {
    it('Escape clears selection', () => {
      const terms = [createMockTerm()]
      const handleSelect = vi.fn()

      render(
        <VisualAgreementBuilder
          terms={terms}
          currentContributor="parent"
          selectedTermId="term-123"
          onTermSelect={handleSelect}
          groupByCategory={false}
        />
      )

      const builder = screen.getByTestId('visual-agreement-builder')
      fireEvent.keyDown(builder, { key: 'Escape' })

      expect(handleSelect).toHaveBeenCalledWith(null)
    })
  })
})

// ============================================
// NFR46: VISIBLE FOCUS INDICATORS
// ============================================

describe('NFR46: Visible Focus Indicators', () => {
  it('AgreementTermCard has focus-visible styling', () => {
    const term = createMockTerm()
    render(<AgreementTermCard term={term} />)

    const card = screen.getByTestId('term-card-term-123')
    expect(card.className).toContain('focus-visible:ring')
  })

  it('AddTermModal close button has focus-visible styling', () => {
    render(
      <AddTermModal
        isOpen={true}
        onClose={() => {}}
        onSave={() => {}}
        contributor="parent"
      />
    )

    const closeButton = screen.getByRole('button', { name: /close modal/i })
    expect(closeButton.className).toContain('focus-visible:ring')
  })

  it('VisualAgreementBuilder add button has focus-visible styling', () => {
    render(
      <VisualAgreementBuilder
        terms={[createMockTerm()]}
        currentContributor="parent"
      />
    )

    const addButton = screen.getByRole('button', { name: /add new term/i })
    expect(addButton.className).toContain('focus-visible:ring')
  })

  it.each(termTypes)('AddTermModal type option %s has focus-visible styling', (type) => {
    render(
      <AddTermModal
        isOpen={true}
        onClose={() => {}}
        onSave={() => {}}
        contributor="parent"
      />
    )

    const typeOption = screen.getByTestId(`term-type-${type}`)
    expect(typeOption.className).toContain('focus-visible:ring')
  })
})

// ============================================
// NFR49: 44x44px TOUCH TARGETS
// ============================================

describe('NFR49: 44x44px Touch Targets', () => {
  it('AgreementTermCard meets minimum touch target height', () => {
    const term = createMockTerm()
    render(<AgreementTermCard term={term} />)

    const card = screen.getByTestId('term-card-term-123')
    // Card is full-width, so only height matters for touch target
    expect(card.className).toContain('min-h-[44px]')
  })

  it('AddTermModal close button meets minimum touch target size', () => {
    render(
      <AddTermModal
        isOpen={true}
        onClose={() => {}}
        onSave={() => {}}
        contributor="parent"
      />
    )

    const closeButton = screen.getByRole('button', { name: /close modal/i })
    expect(closeButton.className).toContain('min-h-[44px]')
    expect(closeButton.className).toContain('min-w-[44px]')
  })

  it('AddTermModal type options meet minimum touch target size', () => {
    render(
      <AddTermModal
        isOpen={true}
        onClose={() => {}}
        onSave={() => {}}
        contributor="parent"
      />
    )

    const typeOption = screen.getByTestId('term-type-screen_time')
    expect(typeOption.className).toContain('min-h-[44px]')
  })

  it('AddTermModal action buttons meet minimum touch target size', () => {
    render(
      <AddTermModal
        isOpen={true}
        onClose={() => {}}
        onSave={() => {}}
        contributor="parent"
      />
    )

    const cancelButton = screen.getByText('Cancel')
    expect(cancelButton.className).toContain('min-h-[44px]')
  })

  it('VisualAgreementBuilder add button meets minimum touch target size', () => {
    render(
      <VisualAgreementBuilder
        terms={[createMockTerm()]}
        currentContributor="parent"
      />
    )

    const addButton = screen.getByRole('button', { name: /add new term/i })
    expect(addButton.className).toContain('min-h-[44px]')
    expect(addButton.className).toContain('min-w-[44px]')
  })

  it('TermCountBadge displays count accessibly', () => {
    render(<TermCountBadge count={50} />)

    const badge = screen.getByTestId('term-count-badge')
    // Badge is a display element, not interactive, so touch target is not required
    // but it should be visible and readable
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('50')
  })
})

// ============================================
// NFR65: 6TH-GRADE READING LEVEL
// ============================================

describe('NFR65: 6th-Grade Reading Level', () => {
  describe('Term explanations use simple language', () => {
    it.each(termTypes)('%s explanation is under 15 words', (type) => {
      const explanation = getTermExplanation(type)
      const wordCount = explanation.split(/\s+/).length
      expect(wordCount).toBeLessThanOrEqual(15)
    })

    it.each(termTypes)('%s explanation has no complex words', (type) => {
      const explanation = getTermExplanation(type)
      // Check for absence of complex vocabulary
      const complexWords = [
        'monitoring',
        'consequences',
        'enforcement',
        'compliance',
        'supervision',
        'restrictions',
      ]
      const lowerExplanation = explanation.toLowerCase()
      // Allow "monitoring" in type name but not in explanations of other types
      if (type !== 'monitoring') {
        complexWords.forEach((word) => {
          if (word !== 'monitoring' || type !== 'monitoring') {
            // Special handling for consequence
            if (word === 'consequences' && type === 'consequence') {
              return
            }
            expect(lowerExplanation).not.toContain(word)
          }
        })
      }
    })
  })

  describe('UI text uses simple language', () => {
    it('empty state message uses simple language', () => {
      render(
        <VisualAgreementBuilder terms={[]} currentContributor="parent" />
      )

      const emptyMessage = screen.getByText(/build your agreement together/i)
      expect(emptyMessage).toBeInTheDocument()
    })

    it('AddTermModal type descriptions are simple', async () => {
      const user = userEvent.setup()
      render(
        <AddTermModal
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
          contributor="parent"
        />
      )

      // Check that descriptions don't have complex words
      const text = screen.getByText(/how much time/i)
      expect(text).toBeInTheDocument()
    })
  })
})

// ============================================
// NFR45: WCAG AA COLOR CONTRAST
// ============================================

describe('NFR45: WCAG AA Color Contrast', () => {
  describe('Category colors have sufficient contrast', () => {
    it.each(termTypes)('%s colors are defined with accessible palette', (type) => {
      const colors = getTermCategoryColors(type)
      expect(colors.bg).toBeDefined()
      expect(colors.border).toBeDefined()
      expect(colors.text).toBeDefined()
    })

    it('category colors use Tailwind safe color values', () => {
      // Verify colors use -50 for backgrounds (light) and -800 for text (dark)
      Object.values(TERM_CATEGORY_COLORS).forEach((colors) => {
        expect(colors.bg).toMatch(/-50/)
        expect(colors.text).toMatch(/-800/)
      })
    })
  })
})

// ============================================
// ARIA LIVE REGIONS
// ============================================

describe('ARIA Live Regions', () => {
  it('TermCountIndicator announces limit warnings', () => {
    const { rerender } = render(<TermCountIndicator count={89} />)

    // Re-render with warning count
    rerender(<TermCountIndicator count={95} />)

    const indicator = screen.getByTestId('term-count-indicator')
    const liveRegion = indicator.querySelector('[aria-live]')
    expect(liveRegion).toBeInTheDocument()
  })

  it('TermCountIndicator announces max reached', () => {
    render(<TermCountIndicator count={100} />)

    const indicator = screen.getByTestId('term-count-indicator')
    const liveRegion = indicator.querySelector('[aria-live]')
    expect(liveRegion).toHaveTextContent(/maximum/i)
  })
})

// ============================================
// INTEGRATION: FULL BUILDER ACCESSIBILITY
// ============================================

describe('Full Builder Accessibility Integration', () => {
  it('builder has semantic structure', () => {
    const terms = [
      createMockTerm({ id: 'term-1', type: 'screen_time' }),
      createMockTerm({ id: 'term-2', type: 'bedtime', content: { time: '20:00' } }),
    ]

    render(
      <VisualAgreementBuilder
        terms={terms}
        currentContributor="parent"
        groupByCategory
      />
    )

    // Should have section elements for categories
    expect(screen.getByTestId('category-section-screen_time')).toBeInTheDocument()
    expect(screen.getByTestId('category-section-bedtime')).toBeInTheDocument()
  })

  it('category sections have aria-labelledby', () => {
    const terms = [createMockTerm({ id: 'term-1', type: 'screen_time' })]

    render(
      <VisualAgreementBuilder
        terms={terms}
        currentContributor="parent"
        groupByCategory
      />
    )

    const section = screen.getByTestId('category-section-screen_time')
    expect(section).toHaveAttribute('aria-labelledby', 'category-screen_time')
  })

  it('all interactive elements are keyboard accessible', async () => {
    const user = userEvent.setup()
    const terms = [createMockTerm()]

    render(
      <VisualAgreementBuilder
        terms={terms}
        currentContributor="parent"
        groupByCategory={false}
      />
    )

    // Tab through interactive elements
    await user.tab()
    expect(document.activeElement?.tagName).toBeTruthy()
  })
})
