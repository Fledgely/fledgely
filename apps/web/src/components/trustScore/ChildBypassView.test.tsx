/**
 * ChildBypassView Component Tests - Story 36.5 Task 4
 *
 * Tests for child-facing view of their bypass history.
 * AC4: Child can see their own bypass attempt history
 * AC6: Distinguish between intentional bypass vs accidental
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChildBypassView } from './ChildBypassView'
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

describe('ChildBypassView - Story 36.5 Task 4', () => {
  describe('AC4: Child sees their own bypass history', () => {
    it('should render the view container', () => {
      render(<ChildBypassView attempts={[]} childName="Alex" />)

      expect(screen.getByTestId('child-bypass-view')).toBeInTheDocument()
    })

    it('should display child name in heading', () => {
      render(<ChildBypassView attempts={[]} childName="Alex" />)

      const headings = screen.getAllByRole('heading')
      expect(headings[0]).toHaveTextContent(/Alex/i)
    })

    it('should show bypass attempts list', () => {
      const attempts = [createBypassAttempt()]

      render(<ChildBypassView attempts={attempts} childName="Alex" />)

      expect(screen.getByTestId('bypass-attempt-list')).toBeInTheDocument()
    })

    it('should show all bypass attempts for the child', () => {
      const attempts = [
        createBypassAttempt({ id: '1', context: 'First attempt' }),
        createBypassAttempt({ id: '2', context: 'Second attempt' }),
      ]

      render(<ChildBypassView attempts={attempts} childName="Alex" />)

      expect(screen.getByText('First attempt')).toBeInTheDocument()
      expect(screen.getByText('Second attempt')).toBeInTheDocument()
    })
  })

  describe('Educational messaging', () => {
    it('should show educational message', () => {
      const attempts = [createBypassAttempt()]

      render(<ChildBypassView attempts={attempts} childName="Alex" />)

      expect(screen.getByTestId('educational-message')).toBeInTheDocument()
    })

    it('should explain why bypasses affect trust', () => {
      const attempts = [createBypassAttempt()]

      render(<ChildBypassView attempts={attempts} childName="Alex" />)

      const message = screen.getByTestId('educational-message')
      expect(message.textContent).toMatch(/trust/i)
    })

    it('should use growth-focused language', () => {
      const attempts = [createBypassAttempt()]

      render(<ChildBypassView attempts={attempts} childName="Alex" />)

      const view = screen.getByTestId('child-bypass-view')
      // Should not contain punitive language
      expect(view.textContent).not.toMatch(/punish|caught|trouble|bad/i)
    })

    it('should show encouragement when no bypasses', () => {
      render(<ChildBypassView attempts={[]} childName="Alex" />)

      expect(screen.getByTestId('positive-message')).toBeInTheDocument()
    })
  })

  describe('AC6: Mark as accidental', () => {
    it('should show mark as accidental option', () => {
      const attempts = [createBypassAttempt({ wasIntentional: null })]

      render(<ChildBypassView attempts={attempts} childName="Alex" onMarkAccidental={vi.fn()} />)

      expect(screen.getByTestId('mark-accidental-button')).toBeInTheDocument()
    })

    it('should call onMarkAccidental when clicked', () => {
      const onMarkAccidental = vi.fn()
      const attempts = [createBypassAttempt({ id: 'bypass-123', wasIntentional: null })]

      render(
        <ChildBypassView attempts={attempts} childName="Alex" onMarkAccidental={onMarkAccidental} />
      )

      fireEvent.click(screen.getByTestId('mark-accidental-button'))

      expect(onMarkAccidental).toHaveBeenCalledWith('bypass-123')
    })

    it('should not show mark button when already marked', () => {
      const attempts = [createBypassAttempt({ wasIntentional: false })]

      render(<ChildBypassView attempts={attempts} childName="Alex" onMarkAccidental={vi.fn()} />)

      expect(screen.queryByTestId('mark-accidental-button')).not.toBeInTheDocument()
    })

    it('should show explanation about marking as accidental', () => {
      const attempts = [createBypassAttempt({ wasIntentional: null })]

      render(<ChildBypassView attempts={attempts} childName="Alex" onMarkAccidental={vi.fn()} />)

      expect(screen.getByTestId('accidental-explanation')).toBeInTheDocument()
    })
  })

  describe('Growth-focused language', () => {
    it('should use positive framing', () => {
      const attempts = [createBypassAttempt()]

      render(<ChildBypassView attempts={attempts} childName="Alex" />)

      // Check main heading uses growth language
      const headings = screen.getAllByRole('heading')
      expect(headings[0].textContent).not.toMatch(/violation|caught|offense/i)
    })

    it('should show impact as trust score change', () => {
      const attempts = [createBypassAttempt({ impactOnScore: -15 })]

      render(<ChildBypassView attempts={attempts} childName="Alex" />)

      const impacts = screen.getAllByText(/-15/)
      expect(impacts.length).toBeGreaterThan(0)
    })

    it('should show reduced impact for accidental', () => {
      const attempts = [
        createBypassAttempt({
          wasIntentional: false,
          impactOnScore: -5,
        }),
      ]

      render(<ChildBypassView attempts={attempts} childName="Alex" />)

      expect(screen.getByTestId('impact-reduced-badge')).toBeInTheDocument()
    })
  })

  describe('Trust score summary', () => {
    it('should show current trust score when provided', () => {
      const attempts = [createBypassAttempt()]

      render(<ChildBypassView attempts={attempts} childName="Alex" currentTrustScore={75} />)

      expect(screen.getByTestId('current-score')).toHaveTextContent('75')
    })

    it('should show total impact from active bypasses', () => {
      const attempts = [
        createBypassAttempt({ impactOnScore: -10 }),
        createBypassAttempt({ impactOnScore: -20 }),
      ]

      render(<ChildBypassView attempts={attempts} childName="Alex" />)

      expect(screen.getByTestId('total-impact')).toHaveTextContent('-30')
    })

    it('should show when bypasses expire', () => {
      const attempts = [createBypassAttempt({ expiresAt: daysFromNow(25) })]

      render(<ChildBypassView attempts={attempts} childName="Alex" />)

      expect(screen.getByTestId('expiry-info')).toBeInTheDocument()
    })
  })

  describe('Empty state', () => {
    it('should show celebratory empty state', () => {
      render(<ChildBypassView attempts={[]} childName="Alex" />)

      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })

    it('should show encouraging message', () => {
      render(<ChildBypassView attempts={[]} childName="Alex" />)

      expect(screen.getByTestId('positive-message')).toHaveTextContent(/great|awesome|excellent/i)
    })
  })

  describe('Accessibility', () => {
    it('should have accessible heading structure', () => {
      const attempts = [createBypassAttempt()]

      render(<ChildBypassView attempts={attempts} childName="Alex" />)

      const headings = screen.getAllByRole('heading')
      expect(headings.length).toBeGreaterThan(0)
    })

    it('should have accessible region', () => {
      const attempts = [createBypassAttempt()]

      render(<ChildBypassView attempts={attempts} childName="Alex" />)

      expect(screen.getByRole('region')).toBeInTheDocument()
    })
  })
})
