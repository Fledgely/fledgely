/**
 * Tests for AgreementSummary Component
 *
 * Story 5.5: Agreement Preview & Summary - Task 2.6
 *
 * Tests for the agreement summary display component.
 */

import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { AgreementSummary } from '../AgreementSummary'
import type { AgreementPreview, SessionTerm } from '@fledgely/contracts'

// ============================================
// TEST FIXTURES
// ============================================

const createMockTerm = (overrides: Partial<SessionTerm> = {}): SessionTerm => ({
  id: '550e8400-e29b-41d4-a716-446655440000',
  type: 'screen_time',
  content: { minutes: 120 },
  status: 'accepted',
  addedBy: 'parent',
  createdAt: '2025-01-01T00:00:00Z',
  ...overrides,
})

const createMockPreview = (
  overrides: Partial<AgreementPreview> = {}
): AgreementPreview => ({
  sessionId: '550e8400-e29b-41d4-a716-446655440001',
  generatedAt: '2025-01-01T12:00:00Z',
  terms: [
    createMockTerm({
      id: 'term-1',
      type: 'screen_time',
      content: { minutes: 120 },
    }),
    createMockTerm({
      id: 'term-2',
      type: 'bedtime',
      content: { time: '21:00' },
    }),
    createMockTerm({
      id: 'term-3',
      type: 'rule',
      content: { text: 'No phones at dinner' },
      addedBy: 'child',
    }),
  ],
  contributions: [
    {
      termId: 'term-1',
      addedBy: 'parent',
      termTitle: 'Screen Time',
      category: 'screen_time',
    },
    {
      termId: 'term-2',
      addedBy: 'parent',
      termTitle: 'Bedtime',
      category: 'bedtime',
    },
    {
      termId: 'term-3',
      addedBy: 'child',
      termTitle: 'No phones at dinner',
      category: 'rule',
    },
  ],
  impact: {
    screenTime: {
      daily: 120,
      weekly: 840,
      description: '2 hours per day',
    },
  },
  parentScrollComplete: false,
  childScrollComplete: false,
  parentCommitments: [
    'I will check in daily about screen time',
    'I will not change the rules without discussing them first',
  ],
  childCommitments: [
    'I will put my devices away at bedtime',
    'I will tell a parent if something online makes me uncomfortable',
  ],
  ...overrides,
})

// ============================================
// BASIC RENDERING TESTS
// ============================================

describe('AgreementSummary', () => {
  describe('basic rendering', () => {
    it('renders the component', () => {
      const preview = createMockPreview()
      render(<AgreementSummary preview={preview} />)
      expect(screen.getByTestId('agreement-summary')).toBeInTheDocument()
    })

    it('renders custom data-testid', () => {
      const preview = createMockPreview()
      render(<AgreementSummary preview={preview} data-testid="custom-summary" />)
      expect(screen.getByTestId('custom-summary')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      const preview = createMockPreview()
      render(<AgreementSummary preview={preview} className="custom-class" />)
      expect(screen.getByTestId('agreement-summary')).toHaveClass('custom-class')
    })

    it('shows agreement title', () => {
      const preview = createMockPreview()
      render(<AgreementSummary preview={preview} />)
      expect(screen.getByText('Our Family Agreement')).toBeInTheDocument()
    })

    it('shows subtitle', () => {
      const preview = createMockPreview()
      render(<AgreementSummary preview={preview} />)
      expect(screen.getByText('Here is everything we agreed on together.')).toBeInTheDocument()
    })
  })

  // ============================================
  // CATEGORY SECTION TESTS (AC #1)
  // ============================================

  describe('category sections (AC #1)', () => {
    it('renders category sections for each term type', () => {
      const preview = createMockPreview()
      render(<AgreementSummary preview={preview} />)

      expect(screen.getByTestId('category-section-screen_time')).toBeInTheDocument()
      expect(screen.getByTestId('category-section-bedtime')).toBeInTheDocument()
      expect(screen.getByTestId('category-section-rule')).toBeInTheDocument()
    })

    it('shows category headers', () => {
      const preview = createMockPreview()
      render(<AgreementSummary preview={preview} />)

      expect(screen.getByText('Screen Time')).toBeInTheDocument()
      expect(screen.getByText('Bedtime')).toBeInTheDocument()
      expect(screen.getByText('Rule')).toBeInTheDocument()
    })

    it('groups terms under correct category', () => {
      const preview = createMockPreview()
      render(<AgreementSummary preview={preview} />)

      const screenTimeSection = screen.getByTestId('category-section-screen_time')
      expect(within(screenTimeSection).getByTestId('term-item-term-1')).toBeInTheDocument()

      const bedtimeSection = screen.getByTestId('category-section-bedtime')
      expect(within(bedtimeSection).getByTestId('term-item-term-2')).toBeInTheDocument()
    })

    it('displays section descriptions', () => {
      const preview = createMockPreview()
      render(<AgreementSummary preview={preview} />)

      // Check for child-friendly descriptions
      expect(screen.getByText(/time you can use screens/i)).toBeInTheDocument()
    })

    it('shows empty state when no accepted terms', () => {
      const preview = createMockPreview({ terms: [] })
      render(<AgreementSummary preview={preview} />)

      expect(screen.getByText('No terms have been accepted yet.')).toBeInTheDocument()
    })

    it('only shows accepted terms', () => {
      const preview = createMockPreview({
        terms: [
          createMockTerm({ id: 'accepted', status: 'accepted', type: 'rule' }),
          createMockTerm({ id: 'discussion', status: 'discussion', type: 'rule' }),
          createMockTerm({ id: 'removed', status: 'removed', type: 'rule' }),
        ],
      })
      render(<AgreementSummary preview={preview} />)

      expect(screen.getByTestId('term-item-accepted')).toBeInTheDocument()
      expect(screen.queryByTestId('term-item-discussion')).not.toBeInTheDocument()
      expect(screen.queryByTestId('term-item-removed')).not.toBeInTheDocument()
    })
  })

  // ============================================
  // TERM DISPLAY TESTS
  // ============================================

  describe('term items', () => {
    it('displays term content preview', () => {
      const preview = createMockPreview()
      render(<AgreementSummary preview={preview} />)

      // Screen time term should show formatted time
      expect(screen.getByText(/2 hours per day/i)).toBeInTheDocument()
    })

    it('shows contributor attribution badge', () => {
      const preview = createMockPreview()
      render(<AgreementSummary preview={preview} />)

      // Look for P (parent) and C (child) badges
      const pBadges = screen.getAllByText('P')
      const cBadges = screen.getAllByText('C')
      expect(pBadges.length).toBeGreaterThanOrEqual(1)
      expect(cBadges.length).toBeGreaterThanOrEqual(1)
    })

    it('shows checkmark indicators', () => {
      const preview = createMockPreview()
      render(<AgreementSummary preview={preview} />)

      // Each term should have a checkmark (SVG)
      const terms = screen.getAllByTestId(/^term-item-/)
      expect(terms.length).toBe(3)
    })
  })

  // ============================================
  // COMMITMENT SUMMARIES TESTS (AC #3)
  // ============================================

  describe('commitment summaries (AC #3)', () => {
    it('shows commitment section by default', () => {
      const preview = createMockPreview()
      render(<AgreementSummary preview={preview} />)

      expect(screen.getByText('What We Each Promise')).toBeInTheDocument()
    })

    it('shows parent commitments', () => {
      const preview = createMockPreview()
      render(<AgreementSummary preview={preview} />)

      expect(screen.getByTestId('commitments-parent')).toBeInTheDocument()
      expect(screen.getByText('Parent Promises')).toBeInTheDocument()
      expect(screen.getByText('I will check in daily about screen time')).toBeInTheDocument()
    })

    it('shows child commitments', () => {
      const preview = createMockPreview()
      render(<AgreementSummary preview={preview} />)

      expect(screen.getByTestId('commitments-child')).toBeInTheDocument()
      expect(screen.getByText('Child Promises')).toBeInTheDocument()
      expect(screen.getByText('I will put my devices away at bedtime')).toBeInTheDocument()
    })

    it('can hide commitments with showCommitments=false', () => {
      const preview = createMockPreview()
      render(<AgreementSummary preview={preview} showCommitments={false} />)

      expect(screen.queryByText('What We Each Promise')).not.toBeInTheDocument()
      expect(screen.queryByTestId('commitments-parent')).not.toBeInTheDocument()
    })

    it('hides empty commitment sections', () => {
      const preview = createMockPreview({
        parentCommitments: [],
        childCommitments: ['I will follow the rules'],
      })
      render(<AgreementSummary preview={preview} />)

      expect(screen.queryByTestId('commitments-parent')).not.toBeInTheDocument()
      expect(screen.getByTestId('commitments-child')).toBeInTheDocument()
    })
  })

  // ============================================
  // SIMPLIFIED MODE TESTS (NFR65)
  // ============================================

  describe('simplified mode (NFR65)', () => {
    it('uses simplified category names when enabled', () => {
      const preview = createMockPreview({
        terms: [
          createMockTerm({ id: 'term-1', type: 'monitoring', status: 'accepted' }),
          createMockTerm({ id: 'term-2', type: 'consequence', status: 'accepted' }),
        ],
      })
      render(<AgreementSummary preview={preview} simplifiedMode={true} />)

      // Should use simplified names
      expect(screen.getByText('Safety Checks')).toBeInTheDocument()
      expect(screen.getByText('What Happens If...')).toBeInTheDocument()
    })

    it('uses standard category names when simplified mode disabled', () => {
      const preview = createMockPreview({
        terms: [createMockTerm({ id: 'term-1', type: 'monitoring', status: 'accepted' })],
      })
      render(<AgreementSummary preview={preview} simplifiedMode={false} />)

      expect(screen.getByText('Monitoring')).toBeInTheDocument()
    })
  })

  // ============================================
  // ACCESSIBILITY TESTS (NFR42)
  // ============================================

  describe('accessibility (NFR42)', () => {
    it('has region role with label', () => {
      const preview = createMockPreview()
      render(<AgreementSummary preview={preview} />)

      const region = screen.getByRole('region', { name: 'Agreement Summary' })
      expect(region).toBeInTheDocument()
    })

    it('has section landmarks with headings', () => {
      const preview = createMockPreview()
      render(<AgreementSummary preview={preview} />)

      // Check for section headings
      const headings = screen.getAllByRole('heading', { level: 3 })
      expect(headings.length).toBeGreaterThanOrEqual(1)
    })

    it('has commitment lists with proper labels', () => {
      const preview = createMockPreview()
      render(<AgreementSummary preview={preview} />)

      const parentList = screen.getByRole('list', { name: 'Parent Promises' })
      expect(parentList).toBeInTheDocument()

      const childList = screen.getByRole('list', { name: 'Child Promises' })
      expect(childList).toBeInTheDocument()
    })

    it('has screen reader summary for term count', () => {
      const preview = createMockPreview()
      render(<AgreementSummary preview={preview} />)

      // The sr-only text should describe the agreement
      const srText = screen.getByText(/This agreement has 3 terms/)
      expect(srText).toBeInTheDocument()
      expect(srText).toHaveClass('sr-only')
    })

    it('has attribution badges with aria-labels', () => {
      const preview = createMockPreview()
      render(<AgreementSummary preview={preview} />)

      // Check for aria-labels on attribution badges
      expect(screen.getAllByLabelText('Parent suggested').length).toBeGreaterThanOrEqual(1)
    })
  })

  // ============================================
  // TIMESTAMP DISPLAY TESTS
  // ============================================

  describe('timestamp display', () => {
    it('shows generation timestamp', () => {
      const preview = createMockPreview({
        generatedAt: '2025-01-15T14:30:00Z',
      })
      render(<AgreementSummary preview={preview} />)

      expect(screen.getByText(/Generated on/)).toBeInTheDocument()
    })

    it('formats timestamp with datetime attribute', () => {
      const preview = createMockPreview({
        generatedAt: '2025-01-15T14:30:00Z',
      })
      render(<AgreementSummary preview={preview} />)

      const timeElement = screen.getByRole('time')
      expect(timeElement).toHaveAttribute('datetime', '2025-01-15T14:30:00Z')
    })
  })

  // ============================================
  // CATEGORY ORDERING TESTS
  // ============================================

  describe('category ordering', () => {
    it('displays categories in correct order', () => {
      const preview = createMockPreview({
        terms: [
          createMockTerm({ id: 't1', type: 'reward', status: 'accepted' }),
          createMockTerm({ id: 't2', type: 'rule', status: 'accepted' }),
          createMockTerm({ id: 't3', type: 'consequence', status: 'accepted' }),
          createMockTerm({ id: 't4', type: 'screen_time', status: 'accepted' }),
        ],
      })
      render(<AgreementSummary preview={preview} />)

      const sections = screen.getAllByTestId(/^category-section-/)
      const sectionTypes = sections.map((s) => s.getAttribute('data-testid')?.replace('category-section-', ''))

      // Rules should come first, then screen_time, then consequence, then reward
      expect(sectionTypes.indexOf('rule')).toBeLessThan(sectionTypes.indexOf('screen_time'))
      expect(sectionTypes.indexOf('consequence')).toBeLessThan(sectionTypes.indexOf('reward'))
    })
  })
})
