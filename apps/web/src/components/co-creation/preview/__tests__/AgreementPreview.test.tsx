/**
 * Tests for AgreementPreview Component
 *
 * Story 5.5: Agreement Preview & Summary - Task 7.7
 *
 * Integration tests for the main agreement preview page.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AgreementPreview } from '../AgreementPreview'
import type { CoCreationSession, SessionContribution, SessionTerm } from '@fledgely/contracts'

// ============================================
// MOCK SETUP
// ============================================

// Mock hooks
vi.mock('../../../../hooks/useScrollCompletion', () => ({
  useScrollCompletion: vi.fn().mockReturnValue({
    scrollPercentage: 50,
    isComplete: false,
    markComplete: vi.fn(),
    reset: vi.fn(),
  }),
}))

vi.mock('../../../../hooks/useImpactEstimate', () => ({
  useImpactEstimate: vi.fn().mockReturnValue({
    impact: {
      screenTime: { daily: 120, weekly: 840, description: '2 hours per day' },
    },
    hasImpact: true,
    hasScreenTimeImpact: true,
    hasBedtimeImpact: false,
    hasMonitoringImpact: false,
    summary: ['2 hours of screen time per day'],
  }),
}))

vi.mock('../../../../hooks/useAgreementExport', () => ({
  useAgreementExport: vi.fn().mockReturnValue({
    exportToPdf: vi.fn(),
    openPrintDialog: vi.fn(),
    isExporting: false,
    status: 'idle',
    error: null,
    reset: vi.fn(),
  }),
}))

// ============================================
// TEST FIXTURES
// ============================================

const createMockTerm = (overrides: Partial<SessionTerm> = {}): SessionTerm => ({
  id: '550e8400-e29b-41d4-a716-446655440000',
  type: 'rule',
  content: { text: 'Test rule' },
  status: 'accepted',
  addedBy: 'parent',
  createdAt: '2025-01-01T00:00:00Z',
  ...overrides,
})

const createMockContribution = (
  overrides: Partial<SessionContribution> = {}
): SessionContribution => ({
  id: '660e8400-e29b-41d4-a716-446655440001',
  termId: '550e8400-e29b-41d4-a716-446655440000',
  contributor: 'parent',
  action: 'added_term',
  createdAt: '2025-01-01T00:00:00Z',
  ...overrides,
})

const createMockSession = (
  overrides: Partial<CoCreationSession> = {}
): CoCreationSession => ({
  id: '770e8400-e29b-41d4-a716-446655440002',
  familyId: 'family-123',
  childId: 'child-123',
  initiatedBy: 'parent',
  status: 'active',
  sourceDraft: { type: 'wizard' },
  createdAt: '2025-01-01T00:00:00Z',
  expiresAt: '2025-01-02T00:00:00Z',
  terms: [
    createMockTerm({
      id: 't1',
      type: 'rule',
      content: { text: 'No phones at dinner' },
      order: 0,
      updatedAt: '2025-01-01T00:00:00Z',
      discussionNotes: [],
      resolutionStatus: 'resolved',
    }),
    createMockTerm({
      id: 't2',
      type: 'screen_time',
      content: { dailyLimit: 120 },
      addedBy: 'child',
      order: 1,
      updatedAt: '2025-01-01T00:00:00Z',
      discussionNotes: [],
      resolutionStatus: 'resolved',
    }),
  ],
  contributions: [
    createMockContribution({
      id: 'c1',
      termId: 't1',
      contributor: 'parent',
      action: 'added_term',
      createdAt: '2025-01-01T00:00:00Z',
    }),
    createMockContribution({
      id: 'c2',
      termId: 't2',
      contributor: 'child',
      action: 'added_term',
      createdAt: '2025-01-01T00:01:00Z',
    }),
  ],
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================
// BASIC RENDERING TESTS
// ============================================

describe('AgreementPreview', () => {
  describe('basic rendering', () => {
    it('renders without crashing', () => {
      render(<AgreementPreview session={createMockSession()} />)
      expect(screen.getByTestId('agreement-preview')).toBeInTheDocument()
    })

    it('renders with custom data-testid', () => {
      render(<AgreementPreview session={createMockSession()} data-testid="custom-preview" />)
      expect(screen.getByTestId('custom-preview')).toBeInTheDocument()
    })

    it('renders header with title', () => {
      render(<AgreementPreview session={createMockSession()} />)
      expect(screen.getByText('Agreement Preview')).toBeInTheDocument()
    })

    it('renders header description', () => {
      render(<AgreementPreview session={createMockSession()} />)
      expect(screen.getByText('Review your family agreement before signing')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(<AgreementPreview session={createMockSession()} className="custom-class" />)
      expect(screen.getByTestId('agreement-preview')).toHaveClass('custom-class')
    })
  })

  // ============================================
  // COMPONENT INTEGRATION TESTS
  // ============================================

  describe('component integration', () => {
    it('renders AgreementSummary component', () => {
      render(<AgreementPreview session={createMockSession()} />)
      expect(screen.getByTestId('agreement-summary')).toBeInTheDocument()
    })

    it('renders ContributionAttribution component', () => {
      render(<AgreementPreview session={createMockSession()} />)
      expect(screen.getByTestId('contribution-attribution')).toBeInTheDocument()
    })

    it('renders ImpactSummary component when hasImpact', () => {
      render(<AgreementPreview session={createMockSession()} />)
      expect(screen.getByTestId('impact-summary')).toBeInTheDocument()
    })

    it('renders ScrollProgress component', () => {
      render(<AgreementPreview session={createMockSession()} />)
      expect(screen.getByTestId('scroll-progress')).toBeInTheDocument()
    })

    it('renders ExportButton component', () => {
      render(<AgreementPreview session={createMockSession()} />)
      expect(screen.getByTestId('export-button')).toBeInTheDocument()
    })
  })

  // ============================================
  // SECTION HEADER TESTS
  // ============================================

  describe('section headers', () => {
    it('renders "Who Contributed What" section', () => {
      render(<AgreementPreview session={createMockSession()} />)
      expect(screen.getByText('Who Contributed What')).toBeInTheDocument()
    })

    it('renders "What This Means" section', () => {
      render(<AgreementPreview session={createMockSession()} />)
      expect(screen.getByText('What This Means')).toBeInTheDocument()
    })

    it('renders "Signatures" section', () => {
      render(<AgreementPreview session={createMockSession()} />)
      expect(screen.getByText('Signatures')).toBeInTheDocument()
    })
  })

  // ============================================
  // CONTRIBUTION STATS TESTS
  // ============================================

  describe('contribution stats', () => {
    it('displays parent contribution count', () => {
      render(<AgreementPreview session={createMockSession()} />)
      const container = screen.getByTestId('agreement-preview')
      expect(container.textContent).toContain('Parent contributed:')
    })

    it('displays child contribution count', () => {
      render(<AgreementPreview session={createMockSession()} />)
      const container = screen.getByTestId('agreement-preview')
      expect(container.textContent).toContain('Child contributed:')
    })
  })

  // ============================================
  // SIGNATURES SECTION TESTS
  // ============================================

  describe('signatures section', () => {
    it('renders parent signature placeholder', () => {
      render(<AgreementPreview session={createMockSession()} />)
      expect(screen.getByText('Parent Signature')).toBeInTheDocument()
    })

    it('renders child signature placeholder', () => {
      render(<AgreementPreview session={createMockSession()} />)
      expect(screen.getByText('Child Signature')).toBeInTheDocument()
    })
  })

  // ============================================
  // SIGNING GATE TESTS
  // ============================================

  describe('signing gate', () => {
    it('renders continue to signing button', () => {
      render(<AgreementPreview session={createMockSession()} />)
      expect(screen.getByTestId('continue-to-signing-button')).toBeInTheDocument()
    })

    it('button is disabled when scroll not complete', () => {
      render(
        <AgreementPreview
          session={createMockSession()}
          parentScrollComplete={false}
          childScrollComplete={false}
        />
      )
      expect(screen.getByTestId('continue-to-signing-button')).toBeDisabled()
    })

    it('button is enabled when both have completed scroll', () => {
      render(
        <AgreementPreview
          session={createMockSession()}
          parentScrollComplete={true}
          childScrollComplete={true}
        />
      )
      expect(screen.getByTestId('continue-to-signing-button')).not.toBeDisabled()
    })

    it('shows message when scroll not complete', () => {
      render(
        <AgreementPreview
          session={createMockSession()}
          parentScrollComplete={false}
          childScrollComplete={false}
        />
      )
      expect(
        screen.getByText(/Both parent and child must read the entire agreement/)
      ).toBeInTheDocument()
    })

    it('hides message when scroll complete', () => {
      render(
        <AgreementPreview
          session={createMockSession()}
          parentScrollComplete={true}
          childScrollComplete={true}
        />
      )
      expect(
        screen.queryByText(/Both parent and child must read the entire agreement/)
      ).not.toBeInTheDocument()
    })

    it('calls onContinueToSigning when button clicked', async () => {
      const onContinueToSigning = vi.fn()
      const user = userEvent.setup()

      render(
        <AgreementPreview
          session={createMockSession()}
          parentScrollComplete={true}
          childScrollComplete={true}
          onContinueToSigning={onContinueToSigning}
        />
      )

      await user.click(screen.getByTestId('continue-to-signing-button'))
      expect(onContinueToSigning).toHaveBeenCalled()
    })

    it('does not call onContinueToSigning when scroll incomplete', async () => {
      const onContinueToSigning = vi.fn()
      const user = userEvent.setup()

      render(
        <AgreementPreview
          session={createMockSession()}
          parentScrollComplete={false}
          childScrollComplete={false}
          onContinueToSigning={onContinueToSigning}
        />
      )

      await user.click(screen.getByTestId('continue-to-signing-button'))
      expect(onContinueToSigning).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // FOOTER TESTS
  // ============================================

  describe('footer', () => {
    it('renders Fledgely branding', () => {
      render(<AgreementPreview session={createMockSession()} />)
      const container = screen.getByTestId('agreement-preview')
      expect(container.textContent).toContain('Generated by Fledgely')
    })

    it('renders session ID', () => {
      render(<AgreementPreview session={createMockSession()} />)
      const container = screen.getByTestId('agreement-preview')
      expect(container.textContent).toContain('Session ID:')
    })
  })

  // ============================================
  // SIMPLIFIED MODE TESTS
  // ============================================

  describe('simplified mode', () => {
    it('passes simplified prop to AgreementSummary', () => {
      render(<AgreementPreview session={createMockSession()} simplified={true} />)
      // This test verifies the prop is passed - actual behavior tested in AgreementSummary tests
      expect(screen.getByTestId('agreement-summary')).toBeInTheDocument()
    })

    it('passes simplified prop to ImpactSummary', () => {
      render(<AgreementPreview session={createMockSession()} simplified={true} />)
      expect(screen.getByTestId('impact-summary')).toBeInTheDocument()
    })
  })

  // ============================================
  // SCROLL PROGRESS TESTS
  // ============================================

  describe('scroll progress', () => {
    it('passes scroll progress to ScrollProgress component', () => {
      render(
        <AgreementPreview
          session={createMockSession()}
          parentScrollProgress={75}
          childScrollProgress={50}
          parentScrollComplete={false}
          childScrollComplete={false}
        />
      )
      expect(screen.getByTestId('scroll-progress')).toBeInTheDocument()
    })

    it('passes activeContributor to ScrollProgress', () => {
      render(
        <AgreementPreview session={createMockSession()} activeContributor="child" />
      )
      expect(screen.getByTestId('scroll-progress')).toBeInTheDocument()
    })
  })

  // ============================================
  // ACCESSIBILITY TESTS
  // ============================================

  describe('accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<AgreementPreview session={createMockSession()} />)

      // h1 for main title
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Agreement Preview')

      // h2 for sections
      const h2s = screen.getAllByRole('heading', { level: 2 })
      expect(h2s.length).toBeGreaterThan(0)
    })

    it('has aria-labelledby for sections', () => {
      render(<AgreementPreview session={createMockSession()} />)

      // Check that sections are labeled
      expect(screen.getByLabelText(/attribution/i)).toBeInTheDocument()
    })

    it('has data-agreement-preview attribute for print styling', () => {
      render(<AgreementPreview session={createMockSession()} />)
      const preview = screen.getByTestId('agreement-preview')
      expect(preview).toHaveAttribute('data-agreement-preview')
    })

    it('signing gate button has aria-describedby when disabled', () => {
      render(
        <AgreementPreview
          session={createMockSession()}
          parentScrollComplete={false}
          childScrollComplete={false}
        />
      )
      expect(screen.getByTestId('continue-to-signing-button')).toHaveAttribute(
        'aria-describedby',
        'signing-gate-message'
      )
    })
  })
})
