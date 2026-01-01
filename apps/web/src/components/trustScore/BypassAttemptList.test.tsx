/**
 * BypassAttemptList Component Tests - Story 36.5 Task 3
 *
 * Tests for displaying list of bypass attempts.
 * AC3: Bypass attempts expire after configurable period
 * AC4: Child can see their own bypass attempt history
 * AC5: Parent can see bypass attempts with non-punitive framing
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BypassAttemptList } from './BypassAttemptList'
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

describe('BypassAttemptList - Story 36.5 Task 3', () => {
  describe('List rendering', () => {
    it('should render the list container', () => {
      const attempts = [createBypassAttempt()]

      render(<BypassAttemptList attempts={attempts} />)

      expect(screen.getByTestId('bypass-attempt-list')).toBeInTheDocument()
    })

    it('should render multiple bypass attempts', () => {
      const attempts = [
        createBypassAttempt({ id: 'bypass-1' }),
        createBypassAttempt({ id: 'bypass-2' }),
        createBypassAttempt({ id: 'bypass-3' }),
      ]

      render(<BypassAttemptList attempts={attempts} />)

      expect(screen.getAllByTestId('bypass-attempt-card')).toHaveLength(3)
    })

    it('should display attempts in descending order by date', () => {
      const attempts = [
        createBypassAttempt({
          id: 'bypass-old',
          occurredAt: daysAgo(10),
          context: 'Old attempt',
        }),
        createBypassAttempt({
          id: 'bypass-new',
          occurredAt: daysAgo(1),
          context: 'New attempt',
        }),
      ]

      render(<BypassAttemptList attempts={attempts} />)

      const cards = screen.getAllByTestId('attempt-context')
      expect(cards[0]).toHaveTextContent('New attempt')
      expect(cards[1]).toHaveTextContent('Old attempt')
    })
  })

  describe('Empty state', () => {
    it('should show empty state when no attempts', () => {
      render(<BypassAttemptList attempts={[]} />)

      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })

    it('should show appropriate empty message', () => {
      render(<BypassAttemptList attempts={[]} />)

      expect(screen.getByText(/no bypass attempts/i)).toBeInTheDocument()
    })

    it('should not show list when empty', () => {
      render(<BypassAttemptList attempts={[]} />)

      expect(screen.queryByTestId('bypass-attempt-card')).not.toBeInTheDocument()
    })
  })

  describe('AC3: Show expired/active status', () => {
    it('should show active count', () => {
      const attempts = [
        createBypassAttempt({ id: 'active-1', expiresAt: daysFromNow(10) }),
        createBypassAttempt({ id: 'active-2', expiresAt: daysFromNow(20) }),
      ]

      render(<BypassAttemptList attempts={attempts} />)

      expect(screen.getByTestId('active-count')).toHaveTextContent('2')
    })

    it('should show expired count when includeExpired is true', () => {
      const attempts = [
        createBypassAttempt({ id: 'active', expiresAt: daysFromNow(10) }),
        createBypassAttempt({ id: 'expired', expiresAt: daysAgo(5) }),
      ]

      render(<BypassAttemptList attempts={attempts} showExpired />)

      expect(screen.getByTestId('expired-count')).toHaveTextContent('1')
    })

    it('should hide expired attempts by default', () => {
      const attempts = [
        createBypassAttempt({ id: 'active', expiresAt: daysFromNow(10), context: 'Active' }),
        createBypassAttempt({ id: 'expired', expiresAt: daysAgo(5), context: 'Expired' }),
      ]

      render(<BypassAttemptList attempts={attempts} />)

      expect(screen.getByText('Active')).toBeInTheDocument()
      expect(screen.queryByText('Expired')).not.toBeInTheDocument()
    })

    it('should show expired attempts when showExpired is true', () => {
      const attempts = [
        createBypassAttempt({ id: 'active', expiresAt: daysFromNow(10), context: 'Active' }),
        createBypassAttempt({ id: 'expired', expiresAt: daysAgo(5), context: 'Expired' }),
      ]

      render(<BypassAttemptList attempts={attempts} showExpired />)

      expect(screen.getByText('Active')).toBeInTheDocument()
      expect(screen.getByText('Expired')).toBeInTheDocument()
    })

    it('should have toggle for showing expired', () => {
      const attempts = [
        createBypassAttempt({ id: 'active', expiresAt: daysFromNow(10) }),
        createBypassAttempt({ id: 'expired', expiresAt: daysAgo(5) }),
      ]

      render(<BypassAttemptList attempts={attempts} onToggleExpired={vi.fn()} />)

      expect(screen.getByTestId('toggle-expired')).toBeInTheDocument()
    })
  })

  describe('Filter by type', () => {
    it('should show filter controls', () => {
      const attempts = [createBypassAttempt()]

      render(<BypassAttemptList attempts={attempts} showFilters />)

      expect(screen.getByTestId('type-filter')).toBeInTheDocument()
    })

    it('should filter by selected type', () => {
      const attempts = [
        createBypassAttempt({ attemptType: 'vpn-detected', context: 'VPN usage' }),
        createBypassAttempt({ attemptType: 'extension-disable', context: 'Extension off' }),
      ]

      render(<BypassAttemptList attempts={attempts} showFilters filterType="vpn-detected" />)

      expect(screen.getByText('VPN usage')).toBeInTheDocument()
      expect(screen.queryByText('Extension off')).not.toBeInTheDocument()
    })

    it('should show all when filter is null', () => {
      const attempts = [
        createBypassAttempt({ attemptType: 'vpn-detected', context: 'VPN usage' }),
        createBypassAttempt({ attemptType: 'extension-disable', context: 'Extension off' }),
      ]

      render(<BypassAttemptList attempts={attempts} showFilters filterType={null} />)

      expect(screen.getByText('VPN usage')).toBeInTheDocument()
      expect(screen.getByText('Extension off')).toBeInTheDocument()
    })

    it('should call onFilterChange when filter changed', () => {
      const onFilterChange = vi.fn()
      const attempts = [createBypassAttempt()]

      render(<BypassAttemptList attempts={attempts} showFilters onFilterChange={onFilterChange} />)

      fireEvent.change(screen.getByTestId('type-filter'), {
        target: { value: 'vpn-detected' },
      })

      expect(onFilterChange).toHaveBeenCalledWith('vpn-detected')
    })
  })

  describe('Pagination', () => {
    it('should show pagination when more than page size', () => {
      const attempts = Array(15)
        .fill(null)
        .map((_, i) => createBypassAttempt({ id: `bypass-${i}` }))

      render(<BypassAttemptList attempts={attempts} pageSize={10} />)

      expect(screen.getByTestId('pagination')).toBeInTheDocument()
    })

    it('should not show pagination when fewer than page size', () => {
      const attempts = Array(5)
        .fill(null)
        .map((_, i) => createBypassAttempt({ id: `bypass-${i}` }))

      render(<BypassAttemptList attempts={attempts} pageSize={10} />)

      expect(screen.queryByTestId('pagination')).not.toBeInTheDocument()
    })

    it('should show only first page items initially', () => {
      const attempts = Array(15)
        .fill(null)
        .map((_, i) => createBypassAttempt({ id: `bypass-${i}`, context: `Attempt ${i}` }))

      render(<BypassAttemptList attempts={attempts} pageSize={10} />)

      expect(screen.getAllByTestId('bypass-attempt-card')).toHaveLength(10)
    })

    it('should show page info', () => {
      const attempts = Array(25)
        .fill(null)
        .map((_, i) => createBypassAttempt({ id: `bypass-${i}` }))

      render(<BypassAttemptList attempts={attempts} pageSize={10} />)

      expect(screen.getByTestId('page-info')).toHaveTextContent('1 of 3')
    })

    it('should navigate to next page', () => {
      const attempts = Array(15)
        .fill(null)
        .map((_, i) => createBypassAttempt({ id: `bypass-${i}`, context: `Attempt ${i}` }))

      render(<BypassAttemptList attempts={attempts} pageSize={10} />)

      fireEvent.click(screen.getByTestId('next-page'))

      expect(screen.getAllByTestId('bypass-attempt-card')).toHaveLength(5)
    })

    it('should navigate to previous page', () => {
      const attempts = Array(15)
        .fill(null)
        .map((_, i) => createBypassAttempt({ id: `bypass-${i}` }))

      render(<BypassAttemptList attempts={attempts} pageSize={10} />)

      fireEvent.click(screen.getByTestId('next-page'))
      fireEvent.click(screen.getByTestId('prev-page'))

      expect(screen.getByTestId('page-info')).toHaveTextContent('1 of 2')
    })

    it('should disable prev button on first page', () => {
      const attempts = Array(15)
        .fill(null)
        .map((_, i) => createBypassAttempt({ id: `bypass-${i}` }))

      render(<BypassAttemptList attempts={attempts} pageSize={10} />)

      expect(screen.getByTestId('prev-page')).toBeDisabled()
    })

    it('should disable next button on last page', () => {
      const attempts = Array(15)
        .fill(null)
        .map((_, i) => createBypassAttempt({ id: `bypass-${i}` }))

      render(<BypassAttemptList attempts={attempts} pageSize={10} />)

      fireEvent.click(screen.getByTestId('next-page'))

      expect(screen.getByTestId('next-page')).toBeDisabled()
    })
  })

  describe('Mark as accidental', () => {
    it('should pass onMarkAccidental to cards', () => {
      const onMarkAccidental = vi.fn()
      const attempts = [createBypassAttempt({ wasIntentional: null })]

      render(<BypassAttemptList attempts={attempts} onMarkAccidental={onMarkAccidental} />)

      fireEvent.click(screen.getByTestId('mark-accidental-button'))

      expect(onMarkAccidental).toHaveBeenCalled()
    })
  })

  describe('AC5: Non-punitive framing', () => {
    it('should use non-punitive heading', () => {
      const attempts = [createBypassAttempt()]

      render(<BypassAttemptList attempts={attempts} />)

      const list = screen.getByTestId('bypass-attempt-list')
      expect(list.textContent).not.toMatch(/caught|violated|offense/i)
    })

    it('should show helpful description', () => {
      const attempts = [createBypassAttempt()]

      render(<BypassAttemptList attempts={attempts} showDescription />)

      expect(screen.getByTestId('list-description')).toBeInTheDocument()
    })
  })

  describe('Summary stats', () => {
    it('should show total impact', () => {
      const attempts = [
        createBypassAttempt({ impactOnScore: -10 }),
        createBypassAttempt({ impactOnScore: -20 }),
      ]

      render(<BypassAttemptList attempts={attempts} showSummary />)

      expect(screen.getByTestId('total-impact')).toHaveTextContent('-30')
    })

    it('should count active attempts', () => {
      const attempts = [
        createBypassAttempt({ expiresAt: daysFromNow(10) }),
        createBypassAttempt({ expiresAt: daysFromNow(20) }),
        createBypassAttempt({ expiresAt: daysAgo(5) }),
      ]

      render(<BypassAttemptList attempts={attempts} showSummary />)

      expect(screen.getByTestId('active-count')).toHaveTextContent('2')
    })
  })

  describe('Accessibility', () => {
    it('should have accessible list role', () => {
      const attempts = [createBypassAttempt()]

      render(<BypassAttemptList attempts={attempts} />)

      expect(screen.getByRole('list')).toBeInTheDocument()
    })

    it('should have accessible heading', () => {
      const attempts = [createBypassAttempt()]

      render(<BypassAttemptList attempts={attempts} />)

      expect(screen.getByRole('heading')).toBeInTheDocument()
    })
  })
})
