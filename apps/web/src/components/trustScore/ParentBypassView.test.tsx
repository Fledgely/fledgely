/**
 * ParentBypassView Component Tests - Story 36.5 Task 5
 *
 * Tests for parent-facing view of child's bypass attempts.
 * AC5: Parent can see bypass attempts with non-punitive framing
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ParentBypassView } from './ParentBypassView'
import { type BypassAttempt } from '@fledgely/shared'

// Helper to create relative dates
const daysAgo = (days: number): Date => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

const daysFromNow = (days: number): Date => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}

const createBypassAttempt = (overrides: Partial<BypassAttempt> = {}): BypassAttempt => ({
  id: `bypass-${Math.random().toString(36).substring(7)}`,
  childId: 'child-123',
  deviceId: 'device-456',
  attemptType: 'extension-disable',
  context: 'Chrome extension was disabled from settings',
  occurredAt: daysAgo(5),
  expiresAt: daysFromNow(25),
  impactOnScore: -10,
  wasIntentional: null,
  ...overrides,
})

describe('ParentBypassView - Story 36.5 Task 5', () => {
  describe('AC5: Parent sees bypass history', () => {
    it('should render the view container', () => {
      render(<ParentBypassView attempts={[]} childName="Alex" />)

      expect(screen.getByTestId('parent-bypass-view')).toBeInTheDocument()
    })

    it('should display child name in heading', () => {
      render(<ParentBypassView attempts={[]} childName="Alex" />)

      const headings = screen.getAllByRole('heading')
      expect(headings[0]).toHaveTextContent(/Alex/i)
    })

    it('should show bypass attempts list', () => {
      const attempts = [createBypassAttempt()]

      render(<ParentBypassView attempts={attempts} childName="Alex" />)

      expect(screen.getByTestId('bypass-attempt-list')).toBeInTheDocument()
    })

    it('should show all bypass attempts', () => {
      const attempts = [
        createBypassAttempt({ id: '1', context: 'First attempt' }),
        createBypassAttempt({ id: '2', context: 'Second attempt' }),
      ]

      render(<ParentBypassView attempts={attempts} childName="Alex" />)

      expect(screen.getByText('First attempt')).toBeInTheDocument()
      expect(screen.getByText('Second attempt')).toBeInTheDocument()
    })
  })

  describe('Non-punitive framing', () => {
    it('should use non-punitive language in heading', () => {
      const attempts = [createBypassAttempt()]

      render(<ParentBypassView attempts={attempts} childName="Alex" />)

      const view = screen.getByTestId('parent-bypass-view')
      expect(view.textContent).not.toMatch(/caught|violated|offense|punish/i)
    })

    it('should frame as trust-building opportunity', () => {
      const attempts = [createBypassAttempt()]

      render(<ParentBypassView attempts={attempts} childName="Alex" />)

      expect(screen.getByTestId('parent-guidance')).toBeInTheDocument()
    })

    it('should focus on understanding, not punishment', () => {
      const attempts = [createBypassAttempt()]

      render(<ParentBypassView attempts={attempts} childName="Alex" />)

      const guidance = screen.getByTestId('parent-guidance')
      expect(guidance.textContent).toMatch(/understand|talk|conversation/i)
    })
  })

  describe('Conversation starters', () => {
    it('should show conversation starters section', () => {
      const attempts = [createBypassAttempt()]

      render(<ParentBypassView attempts={attempts} childName="Alex" />)

      expect(screen.getByTestId('conversation-starters')).toBeInTheDocument()
    })

    it('should provide age-appropriate conversation starters', () => {
      const attempts = [createBypassAttempt()]

      render(<ParentBypassView attempts={attempts} childName="Alex" />)

      const starters = screen.getByTestId('conversation-starters')
      expect(starters.querySelectorAll('[data-testid="starter-item"]').length).toBeGreaterThan(0)
    })

    it('should include child name in conversation starters', () => {
      const attempts = [createBypassAttempt()]

      render(<ParentBypassView attempts={attempts} childName="Alex" />)

      const starters = screen.getByTestId('conversation-starters')
      expect(starters.textContent).toMatch(/Alex/i)
    })
  })

  describe('Pattern insights', () => {
    it('should show pattern insights when multiple attempts', () => {
      const attempts = [
        createBypassAttempt({ attemptType: 'vpn-detected', occurredAt: daysAgo(1) }),
        createBypassAttempt({ attemptType: 'vpn-detected', occurredAt: daysAgo(3) }),
        createBypassAttempt({ attemptType: 'vpn-detected', occurredAt: daysAgo(5) }),
      ]

      render(<ParentBypassView attempts={attempts} childName="Alex" />)

      expect(screen.getByTestId('pattern-insights')).toBeInTheDocument()
    })

    it('should identify most common bypass type', () => {
      const attempts = [
        createBypassAttempt({ attemptType: 'vpn-detected' }),
        createBypassAttempt({ attemptType: 'vpn-detected' }),
        createBypassAttempt({ attemptType: 'extension-disable' }),
      ]

      render(<ParentBypassView attempts={attempts} childName="Alex" />)

      expect(screen.getByTestId('common-type')).toHaveTextContent(/VPN/i)
    })

    it('should show frequency insight', () => {
      const attempts = [
        createBypassAttempt({ occurredAt: daysAgo(1) }),
        createBypassAttempt({ occurredAt: daysAgo(2) }),
        createBypassAttempt({ occurredAt: daysAgo(3) }),
      ]

      render(<ParentBypassView attempts={attempts} childName="Alex" />)

      expect(screen.getByTestId('frequency-insight')).toBeInTheDocument()
    })

    it('should not show patterns with single attempt', () => {
      const attempts = [createBypassAttempt()]

      render(<ParentBypassView attempts={attempts} childName="Alex" />)

      expect(screen.queryByTestId('pattern-insights')).not.toBeInTheDocument()
    })
  })

  describe('Summary statistics', () => {
    it('should show total active attempts', () => {
      const attempts = [createBypassAttempt({ id: '1' }), createBypassAttempt({ id: '2' })]

      render(<ParentBypassView attempts={attempts} childName="Alex" />)

      const counts = screen.getAllByTestId('active-count')
      expect(counts[0]).toHaveTextContent('2')
    })

    it('should show total impact', () => {
      const attempts = [
        createBypassAttempt({ impactOnScore: -10 }),
        createBypassAttempt({ impactOnScore: -20 }),
      ]

      render(<ParentBypassView attempts={attempts} childName="Alex" />)

      expect(screen.getByTestId('total-impact')).toHaveTextContent('-30')
    })

    it('should show when first attempt expires', () => {
      const attempts = [createBypassAttempt({ expiresAt: daysFromNow(15) })]

      render(<ParentBypassView attempts={attempts} childName="Alex" />)

      expect(screen.getByTestId('expiry-info')).toBeInTheDocument()
    })
  })

  describe('Mark as accidental', () => {
    it('should allow parent to mark as accidental', () => {
      const onMarkAccidental = vi.fn()
      const attempts = [createBypassAttempt({ wasIntentional: null })]

      render(
        <ParentBypassView
          attempts={attempts}
          childName="Alex"
          onMarkAccidental={onMarkAccidental}
        />
      )

      fireEvent.click(screen.getByTestId('mark-accidental-button'))

      expect(onMarkAccidental).toHaveBeenCalled()
    })
  })

  describe('Empty state', () => {
    it('should show positive empty state', () => {
      render(<ParentBypassView attempts={[]} childName="Alex" />)

      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })

    it('should celebrate no bypass attempts', () => {
      render(<ParentBypassView attempts={[]} childName="Alex" />)

      expect(screen.getByTestId('positive-message')).toBeInTheDocument()
    })

    it('should mention child name in empty state', () => {
      render(<ParentBypassView attempts={[]} childName="Alex" />)

      expect(screen.getByTestId('positive-message')).toHaveTextContent(/Alex/i)
    })
  })

  describe('Toggle expired', () => {
    it('should allow toggling expired attempts', () => {
      const attempts = [
        createBypassAttempt({ expiresAt: daysFromNow(10), context: 'Active' }),
        createBypassAttempt({ expiresAt: daysAgo(5), context: 'Expired' }),
      ]

      render(<ParentBypassView attempts={attempts} childName="Alex" showExpiredToggle />)

      expect(screen.getByTestId('toggle-expired')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have accessible region', () => {
      const attempts = [createBypassAttempt()]

      render(<ParentBypassView attempts={attempts} childName="Alex" />)

      expect(screen.getByRole('region')).toBeInTheDocument()
    })

    it('should have proper heading hierarchy', () => {
      const attempts = [createBypassAttempt()]

      render(<ParentBypassView attempts={attempts} childName="Alex" />)

      const headings = screen.getAllByRole('heading')
      expect(headings.length).toBeGreaterThan(0)
    })
  })
})
