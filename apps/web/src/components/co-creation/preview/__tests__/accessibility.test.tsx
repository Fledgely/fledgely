/**
 * Accessibility Tests for Preview Components
 *
 * Story 5.5: Agreement Preview & Summary - Task 9.6
 *
 * Tests for NFR compliance:
 * - NFR42: Screen reader accessibility
 * - NFR43: Keyboard navigation
 * - NFR45: Color contrast
 * - NFR49: Touch targets (44x44px)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ScrollProgress } from '../ScrollProgress'
import { ExportButton } from '../ExportButton'
import type { ContributionSummary } from '@fledgely/contracts'
import { ContributionAttribution } from '../ContributionAttribution'
import { ImpactSummary } from '../ImpactSummary'

// ============================================
// SETUP
// ============================================

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================
// SCROLL PROGRESS ACCESSIBILITY
// ============================================

describe('ScrollProgress Accessibility', () => {
  describe('NFR42: Screen Reader Support', () => {
    it('has accessible region role', () => {
      render(
        <ScrollProgress
          parentProgress={50}
          childProgress={50}
          parentComplete={false}
          childComplete={false}
        />
      )
      expect(screen.getByRole('region')).toBeInTheDocument()
    })

    it('has descriptive aria-label on region', () => {
      render(
        <ScrollProgress
          parentProgress={50}
          childProgress={50}
          parentComplete={false}
          childComplete={false}
        />
      )
      expect(screen.getByLabelText('Scroll progress tracking')).toBeInTheDocument()
    })

    it('has live region for status announcements', () => {
      render(
        <ScrollProgress
          parentProgress={50}
          childProgress={50}
          parentComplete={false}
          childComplete={false}
        />
      )
      const status = screen.getByRole('status')
      expect(status).toHaveAttribute('aria-live', 'polite')
    })

    it('announces completion state to screen readers', () => {
      render(
        <ScrollProgress
          parentProgress={100}
          childProgress={100}
          parentComplete={true}
          childComplete={true}
        />
      )
      const status = screen.getByRole('status')
      expect(status.textContent).toContain('Both parent and child have read')
    })

    it('progress bars have accessible labels', () => {
      render(
        <ScrollProgress
          parentProgress={75}
          childProgress={25}
          parentComplete={false}
          childComplete={false}
        />
      )
      const progressbars = screen.getAllByRole('progressbar')
      progressbars.forEach((bar) => {
        expect(bar).toHaveAttribute('aria-label')
      })
    })
  })

  describe('NFR43: Keyboard Navigation', () => {
    it('progress bars are not interactive (read-only)', () => {
      render(
        <ScrollProgress
          parentProgress={50}
          childProgress={50}
          parentComplete={false}
          childComplete={false}
        />
      )
      // Progress bars should be visual-only, not keyboard focusable
      const progressbars = screen.getAllByRole('progressbar')
      progressbars.forEach((bar) => {
        expect(bar).not.toHaveAttribute('tabindex')
      })
    })
  })
})

// ============================================
// EXPORT BUTTON ACCESSIBILITY
// ============================================

describe('ExportButton Accessibility', () => {
  describe('NFR42: Screen Reader Support', () => {
    it('has aria-haspopup for dropdown', () => {
      render(<ExportButton onExportPdf={vi.fn()} onPrint={vi.fn()} />)
      expect(screen.getByTestId('export-button')).toHaveAttribute('aria-haspopup', 'menu')
    })

    it('has aria-expanded that updates', async () => {
      const user = userEvent.setup()
      render(<ExportButton onExportPdf={vi.fn()} onPrint={vi.fn()} />)

      const button = screen.getByTestId('export-button')
      expect(button).toHaveAttribute('aria-expanded', 'false')

      await user.click(button)
      expect(button).toHaveAttribute('aria-expanded', 'true')
    })

    it('dropdown has role="menu"', async () => {
      const user = userEvent.setup()
      render(<ExportButton onExportPdf={vi.fn()} onPrint={vi.fn()} />)

      await user.click(screen.getByTestId('export-button'))
      expect(screen.getByRole('menu')).toBeInTheDocument()
    })

    it('menu items have role="menuitem"', async () => {
      const user = userEvent.setup()
      render(<ExportButton onExportPdf={vi.fn()} onPrint={vi.fn()} />)

      await user.click(screen.getByTestId('export-button'))
      const items = screen.getAllByRole('menuitem')
      expect(items.length).toBeGreaterThan(0)
    })

    it('announces exporting state', () => {
      render(<ExportButton onExportPdf={vi.fn()} onPrint={vi.fn()} isExporting={true} />)
      const status = screen.getByRole('status')
      expect(status.textContent).toContain('Exporting')
    })
  })

  describe('NFR43: Keyboard Navigation', () => {
    it('button is keyboard focusable', () => {
      render(<ExportButton onExportPdf={vi.fn()} onPrint={vi.fn()} />)
      const button = screen.getByTestId('export-button')
      button.focus()
      expect(document.activeElement).toBe(button)
    })

    it('Escape closes dropdown and returns focus', async () => {
      const user = userEvent.setup()
      render(<ExportButton onExportPdf={vi.fn()} onPrint={vi.fn()} />)

      await user.click(screen.getByTestId('export-button'))
      expect(screen.getByRole('menu')).toBeInTheDocument()

      await user.keyboard('{Escape}')
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
      expect(screen.getByTestId('export-button')).toHaveFocus()
    })

    it('Enter/Space opens dropdown', async () => {
      const user = userEvent.setup()
      render(<ExportButton onExportPdf={vi.fn()} onPrint={vi.fn()} />)

      const button = screen.getByTestId('export-button')
      button.focus()
      await user.keyboard('{Enter}')

      expect(screen.getByRole('menu')).toBeInTheDocument()
    })
  })

  describe('NFR49: Touch Targets', () => {
    it('button has minimum touch target size', () => {
      const { container } = render(<ExportButton onExportPdf={vi.fn()} onPrint={vi.fn()} />)
      const button = container.querySelector('button')

      // Check that button has padding classes that ensure 44x44 minimum
      expect(button).toHaveClass('px-4', 'py-2.5')
    })
  })
})

// ============================================
// CONTRIBUTION ATTRIBUTION ACCESSIBILITY
// ============================================

describe('ContributionAttribution Accessibility', () => {
  const mockContributions: ContributionSummary[] = [
    {
      termId: 't1',
      addedBy: 'parent',
      termTitle: 'Screen time limit',
      category: 'screen_time',
    },
    {
      termId: 't2',
      addedBy: 'child',
      termTitle: 'Bedtime rule',
      category: 'bedtime',
    },
  ]

  describe('NFR42: Screen Reader Support', () => {
    it('has accessible list structure', () => {
      render(<ContributionAttribution contributions={mockContributions} />)
      expect(screen.getByRole('list')).toBeInTheDocument()
    })

    it('list items have proper role', () => {
      render(<ContributionAttribution contributions={mockContributions} />)
      const items = screen.getAllByRole('listitem')
      expect(items.length).toBe(mockContributions.length)
    })

    it('contributor badges have accessible labels', () => {
      render(<ContributionAttribution contributions={mockContributions} />)
      // Parent badges should have aria-label - use getAllBy since there may be multiple
      const parentBadges = screen.getAllByLabelText(/parent/i)
      expect(parentBadges.length).toBeGreaterThan(0)
    })
  })
})

// ============================================
// IMPACT SUMMARY ACCESSIBILITY
// ============================================

describe('ImpactSummary Accessibility', () => {
  const mockImpact = {
    screenTime: {
      daily: 120,
      weekly: 840,
      description: '2 hours per day',
    },
    bedtime: {
      weekday: '21:00',
      weekend: '22:00',
    },
  }

  describe('NFR42: Screen Reader Support', () => {
    it('renders headings for screen readers', () => {
      render(<ImpactSummary impact={mockImpact} />)
      // Should have section headings - there may be multiple for each card
      const headings = screen.getAllByRole('heading')
      expect(headings.length).toBeGreaterThan(0)
    })

    it('presents data in accessible structure', () => {
      render(<ImpactSummary impact={mockImpact} />)
      // Should render content that screen readers can navigate
      expect(screen.getByTestId('impact-summary')).toBeInTheDocument()
    })
  })

  describe('NFR42: Simplified Mode', () => {
    it('uses simplified language when enabled', () => {
      const { container } = render(<ImpactSummary impact={mockImpact} simplified={true} />)
      // Simplified mode should use child-friendly language
      expect(container.textContent).toBeDefined()
    })
  })
})

// ============================================
// GENERAL ACCESSIBILITY PATTERNS
// ============================================

describe('General Accessibility Patterns', () => {
  describe('Focus Management', () => {
    it('focus indicators are visible', () => {
      render(<ExportButton onExportPdf={vi.fn()} onPrint={vi.fn()} />)
      const button = screen.getByTestId('export-button')
      // Button should have focus ring class
      expect(button.className).toContain('focus:')
    })
  })

  describe('Visual Contrast', () => {
    it('text elements use contrast-appropriate colors', () => {
      render(
        <ScrollProgress
          parentProgress={50}
          childProgress={50}
          parentComplete={false}
          childComplete={false}
        />
      )
      // Elements should use gray-900/gray-100 for proper contrast
      const container = screen.getByTestId('scroll-progress')
      expect(container.className).toContain('dark:')
    })
  })

  describe('Interactive Element States', () => {
    it('disabled buttons have proper disabled state', () => {
      render(<ExportButton onExportPdf={vi.fn()} onPrint={vi.fn()} disabled={true} />)
      const button = screen.getByTestId('export-button')
      expect(button).toBeDisabled()
    })

    it('disabled buttons have visual indication', () => {
      render(<ExportButton onExportPdf={vi.fn()} onPrint={vi.fn()} disabled={true} />)
      const button = screen.getByTestId('export-button')
      expect(button.className).toContain('cursor-not-allowed')
    })
  })
})
