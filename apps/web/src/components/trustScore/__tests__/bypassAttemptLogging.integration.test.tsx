/**
 * Bypass Attempt Logging Integration Tests - Story 36.5 Task 7
 *
 * Integration tests for bypass attempt logging functionality.
 * Tests all ACs working together.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BypassAttemptCard } from '../BypassAttemptCard'
import { BypassAttemptList } from '../BypassAttemptList'
import { ChildBypassView } from '../ChildBypassView'
import { ParentBypassView } from '../ParentBypassView'
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

describe('Bypass Attempt Logging Integration - Story 36.5', () => {
  describe('AC1: Bypass attempt logged and displayed', () => {
    it('should display bypass attempt with all required information', () => {
      const attempt = createBypassAttempt({
        context: 'User disabled the extension manually',
        impactOnScore: -15,
      })

      render(<BypassAttemptCard attempt={attempt} />)

      expect(screen.getByTestId('bypass-attempt-card')).toBeInTheDocument()
      expect(screen.getByTestId('attempt-type')).toBeInTheDocument()
      expect(screen.getByTestId('attempt-context')).toHaveTextContent(
        'User disabled the extension manually'
      )
      expect(screen.getByTestId('attempt-timestamp')).toBeInTheDocument()
      expect(screen.getByTestId('attempt-impact')).toHaveTextContent('-15')
    })

    it('should display list of bypass attempts', () => {
      const attempts = [
        createBypassAttempt({ id: '1', context: 'First bypass' }),
        createBypassAttempt({ id: '2', context: 'Second bypass' }),
        createBypassAttempt({ id: '3', context: 'Third bypass' }),
      ]

      render(<BypassAttemptList attempts={attempts} />)

      expect(screen.getAllByTestId('bypass-attempt-card')).toHaveLength(3)
    })
  })

  describe('AC2: Impact shown on trust score', () => {
    it('should show negative impact on individual cards', () => {
      const attempt = createBypassAttempt({ impactOnScore: -20 })

      render(<BypassAttemptCard attempt={attempt} />)

      expect(screen.getByTestId('attempt-impact')).toHaveTextContent('-20')
    })

    it('should show total impact in child view', () => {
      const attempts = [
        createBypassAttempt({ impactOnScore: -10 }),
        createBypassAttempt({ impactOnScore: -15 }),
      ]

      render(<ChildBypassView attempts={attempts} childName="Alex" />)

      expect(screen.getByTestId('total-impact')).toHaveTextContent('-25')
    })

    it('should show total impact in parent view', () => {
      const attempts = [
        createBypassAttempt({ impactOnScore: -10 }),
        createBypassAttempt({ impactOnScore: -20 }),
      ]

      render(<ParentBypassView attempts={attempts} childName="Alex" />)

      expect(screen.getByTestId('total-impact')).toHaveTextContent('-30')
    })
  })

  describe('AC3: Expired attempts handled', () => {
    it('should show expired status on card', () => {
      const attempt = createBypassAttempt({ expiresAt: daysAgo(5) })

      render(<BypassAttemptCard attempt={attempt} />)

      expect(screen.getByTestId('bypass-attempt-card')).toHaveAttribute('data-status', 'expired')
    })

    it('should filter expired attempts in list by default', () => {
      const attempts = [
        createBypassAttempt({ id: 'active', expiresAt: daysFromNow(10) }),
        createBypassAttempt({ id: 'expired', expiresAt: daysAgo(5) }),
      ]

      render(<BypassAttemptList attempts={attempts} />)

      const cards = screen.getAllByTestId('bypass-attempt-card')
      expect(cards).toHaveLength(1)
    })

    it('should only count active attempts in child view', () => {
      const attempts = [
        createBypassAttempt({ impactOnScore: -10, expiresAt: daysFromNow(10) }),
        createBypassAttempt({ impactOnScore: -20, expiresAt: daysAgo(5) }),
      ]

      render(<ChildBypassView attempts={attempts} childName="Alex" />)

      // Total impact should only include active attempt
      expect(screen.getByTestId('total-impact')).toHaveTextContent('-10')
    })
  })

  describe('AC4: Child can see their own bypass history', () => {
    it('should render child view with name', () => {
      const attempts = [createBypassAttempt()]

      render(<ChildBypassView attempts={attempts} childName="Alex" />)

      expect(screen.getByTestId('child-bypass-view')).toBeInTheDocument()
      const headings = screen.getAllByRole('heading')
      expect(headings[0]).toHaveTextContent(/Alex/i)
    })

    it('should show educational messaging', () => {
      const attempts = [createBypassAttempt()]

      render(<ChildBypassView attempts={attempts} childName="Alex" />)

      expect(screen.getByTestId('educational-message')).toBeInTheDocument()
    })

    it('should show positive message when no bypasses', () => {
      render(<ChildBypassView attempts={[]} childName="Alex" />)

      expect(screen.getByTestId('positive-message')).toBeInTheDocument()
    })
  })

  describe('AC5: Parent can see bypass attempts with non-punitive framing', () => {
    it('should render parent view with non-punitive language', () => {
      const attempts = [createBypassAttempt()]

      render(<ParentBypassView attempts={attempts} childName="Alex" />)

      const view = screen.getByTestId('parent-bypass-view')
      expect(view.textContent).not.toMatch(/caught|violated|offense|punish/i)
    })

    it('should show conversation starters', () => {
      const attempts = [createBypassAttempt()]

      render(<ParentBypassView attempts={attempts} childName="Alex" />)

      expect(screen.getByTestId('conversation-starters')).toBeInTheDocument()
    })

    it('should show pattern insights with multiple attempts', () => {
      const attempts = [
        createBypassAttempt({ attemptType: 'vpn-detected' }),
        createBypassAttempt({ attemptType: 'vpn-detected' }),
        createBypassAttempt({ attemptType: 'extension-disable' }),
      ]

      render(<ParentBypassView attempts={attempts} childName="Alex" />)

      expect(screen.getByTestId('pattern-insights')).toBeInTheDocument()
      expect(screen.getByTestId('common-type')).toHaveTextContent(/VPN/i)
    })

    it('should show positive message when no bypasses', () => {
      render(<ParentBypassView attempts={[]} childName="Alex" />)

      expect(screen.getByTestId('positive-message')).toHaveTextContent(/Alex/i)
    })
  })

  describe('AC6: Marking as accidental works', () => {
    it('should call handler when marking as accidental on card', () => {
      const onMarkAccidental = vi.fn()
      const attempt = createBypassAttempt({ id: 'bypass-123', wasIntentional: null })

      render(<BypassAttemptCard attempt={attempt} onMarkAccidental={onMarkAccidental} />)

      fireEvent.click(screen.getByTestId('mark-accidental-button'))

      expect(onMarkAccidental).toHaveBeenCalledWith('bypass-123')
    })

    it('should show accidental badge after marked', () => {
      const attempt = createBypassAttempt({ wasIntentional: false })

      render(<BypassAttemptCard attempt={attempt} />)

      expect(screen.getByTestId('accidental-badge')).toBeInTheDocument()
      expect(screen.getByTestId('impact-reduced-badge')).toBeInTheDocument()
    })

    it('should not show mark button when already marked', () => {
      const attempt = createBypassAttempt({ wasIntentional: false })

      render(<BypassAttemptCard attempt={attempt} onMarkAccidental={vi.fn()} />)

      expect(screen.queryByTestId('mark-accidental-button')).not.toBeInTheDocument()
    })

    it('should pass handler through list to cards', () => {
      const onMarkAccidental = vi.fn()
      const attempts = [createBypassAttempt({ wasIntentional: null })]

      render(<BypassAttemptList attempts={attempts} onMarkAccidental={onMarkAccidental} />)

      fireEvent.click(screen.getByTestId('mark-accidental-button'))

      expect(onMarkAccidental).toHaveBeenCalled()
    })

    it('should pass handler through child view', () => {
      const onMarkAccidental = vi.fn()
      const attempts = [createBypassAttempt({ id: 'bypass-456', wasIntentional: null })]

      render(
        <ChildBypassView attempts={attempts} childName="Alex" onMarkAccidental={onMarkAccidental} />
      )

      fireEvent.click(screen.getByTestId('mark-accidental-button'))

      expect(onMarkAccidental).toHaveBeenCalledWith('bypass-456')
    })

    it('should pass handler through parent view', () => {
      const onMarkAccidental = vi.fn()
      const attempts = [createBypassAttempt({ id: 'bypass-789', wasIntentional: null })]

      render(
        <ParentBypassView
          attempts={attempts}
          childName="Alex"
          onMarkAccidental={onMarkAccidental}
        />
      )

      fireEvent.click(screen.getByTestId('mark-accidental-button'))

      expect(onMarkAccidental).toHaveBeenCalledWith('bypass-789')
    })
  })

  describe('Full workflow integration', () => {
    it('should support full bypass attempt workflow', () => {
      const attempts = [
        createBypassAttempt({
          id: 'bypass-1',
          attemptType: 'vpn-detected',
          context: 'VPN connection detected',
          impactOnScore: -20,
          wasIntentional: null,
        }),
        createBypassAttempt({
          id: 'bypass-2',
          attemptType: 'extension-disable',
          context: 'Extension was disabled',
          impactOnScore: -10,
          wasIntentional: false, // Already marked accidental
        }),
      ]

      const onMarkAccidental = vi.fn()

      // Render parent view
      render(
        <ParentBypassView
          attempts={attempts}
          childName="Emma"
          onMarkAccidental={onMarkAccidental}
        />
      )

      // Should show both attempts
      expect(screen.getAllByTestId('bypass-attempt-card')).toHaveLength(2)

      // Should show total impact from both
      expect(screen.getByTestId('total-impact')).toHaveTextContent('-30')

      // Should show conversation starters with child name
      expect(screen.getByTestId('conversation-starters').textContent).toMatch(/Emma/i)

      // The first attempt should have mark as accidental button
      // The second should not (already marked)
      const markButtons = screen.getAllByTestId('mark-accidental-button')
      expect(markButtons).toHaveLength(1)

      // Mark the first as accidental
      fireEvent.click(markButtons[0])
      expect(onMarkAccidental).toHaveBeenCalledWith('bypass-1')
    })

    it('should handle empty state gracefully', () => {
      render(<ParentBypassView attempts={[]} childName="Oliver" />)

      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
      expect(screen.getByTestId('positive-message')).toHaveTextContent(/Oliver/i)
      expect(screen.queryByTestId('bypass-attempt-card')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have accessible structure in child view', () => {
      const attempts = [createBypassAttempt()]

      render(<ChildBypassView attempts={attempts} childName="Alex" />)

      expect(screen.getByRole('region')).toBeInTheDocument()
      expect(screen.getAllByRole('heading').length).toBeGreaterThan(0)
    })

    it('should have accessible structure in parent view', () => {
      const attempts = [createBypassAttempt()]

      render(<ParentBypassView attempts={attempts} childName="Alex" />)

      expect(screen.getByRole('region')).toBeInTheDocument()
      // At least one list exists (could be multiple: conversation starters + bypass list)
      expect(screen.getAllByRole('list').length).toBeGreaterThan(0)
    })
  })
})
