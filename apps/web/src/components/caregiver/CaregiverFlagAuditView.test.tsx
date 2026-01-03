/**
 * Tests for CaregiverFlagAuditView Component
 *
 * Story 39.5: Caregiver Flag Viewing
 * - AC4: Flag Viewing Audit - Display flag viewing history
 *
 * Tests cover:
 * - Entry list display
 * - Filtering by caregiver
 * - Filtering by child
 * - Empty state
 * - Loading state
 * - Error state
 * - Sort order (newest first)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CaregiverFlagAuditView, type CaregiverFlagViewLogEntry } from './CaregiverFlagAuditView'

describe('CaregiverFlagAuditView', () => {
  const mockEntries: CaregiverFlagViewLogEntry[] = [
    {
      id: 'log-1',
      familyId: 'family-123',
      caregiverUid: 'caregiver-1',
      caregiverName: 'Grandma',
      flagId: 'flag-1',
      childUid: 'child-1',
      childName: 'Emma',
      action: 'viewed',
      flagCategory: 'Violence',
      flagSeverity: 'high',
      timestamp: new Date('2025-12-30T14:00:00'),
    },
    {
      id: 'log-2',
      familyId: 'family-123',
      caregiverUid: 'caregiver-1',
      caregiverName: 'Grandma',
      flagId: 'flag-2',
      childUid: 'child-2',
      childName: 'Liam',
      action: 'marked_reviewed',
      flagCategory: 'Bullying',
      flagSeverity: 'medium',
      timestamp: new Date('2025-12-30T15:00:00'),
    },
    {
      id: 'log-3',
      familyId: 'family-123',
      caregiverUid: 'caregiver-2',
      caregiverName: 'Grandpa',
      flagId: 'flag-3',
      childUid: 'child-1',
      childName: 'Emma',
      action: 'viewed',
      flagCategory: 'Adult Content',
      flagSeverity: 'high',
      timestamp: new Date('2025-12-30T16:00:00'),
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Entry List Display', () => {
    it('should display all entries', () => {
      render(<CaregiverFlagAuditView entries={mockEntries} />)

      expect(screen.getByTestId('entry-list')).toBeInTheDocument()
      expect(screen.getAllByTestId(/^flag-audit-row-/)).toHaveLength(3)
    })

    it('should display entry count', () => {
      render(<CaregiverFlagAuditView entries={mockEntries} />)

      expect(screen.getByTestId('entry-count')).toHaveTextContent('3')
    })

    it('should display entries sorted by newest first', () => {
      render(<CaregiverFlagAuditView entries={mockEntries} />)

      const rows = screen.getAllByTestId(/^flag-audit-row-/)
      // log-3 is newest, should be first
      expect(rows[0]).toHaveAttribute('data-testid', 'flag-audit-row-log-3')
    })
  })

  describe('Filtering', () => {
    it('should filter by caregiver UID', () => {
      render(<CaregiverFlagAuditView entries={mockEntries} filterByCaregiverUid="caregiver-1" />)

      const rows = screen.getAllByTestId(/^flag-audit-row-/)
      expect(rows).toHaveLength(2)
    })

    it('should filter by child UID', () => {
      render(<CaregiverFlagAuditView entries={mockEntries} filterByChildUid="child-1" />)

      const rows = screen.getAllByTestId(/^flag-audit-row-/)
      expect(rows).toHaveLength(2)
    })

    it('should combine filters', () => {
      render(
        <CaregiverFlagAuditView
          entries={mockEntries}
          filterByCaregiverUid="caregiver-1"
          filterByChildUid="child-1"
        />
      )

      const rows = screen.getAllByTestId(/^flag-audit-row-/)
      expect(rows).toHaveLength(1)
      expect(rows[0]).toHaveAttribute('data-testid', 'flag-audit-row-log-1')
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no entries', () => {
      render(<CaregiverFlagAuditView entries={[]} />)

      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
      expect(screen.getByText(/no flag views yet/i)).toBeInTheDocument()
    })

    it('should show empty state when all entries are filtered out', () => {
      render(
        <CaregiverFlagAuditView
          entries={mockEntries}
          filterByCaregiverUid="non-existent-caregiver"
        />
      )

      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('should show loading state', () => {
      render(<CaregiverFlagAuditView entries={[]} loading={true} />)

      expect(screen.getByTestId('loading-state')).toBeInTheDocument()
      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })
  })

  describe('Error State', () => {
    it('should show error message', () => {
      render(<CaregiverFlagAuditView entries={[]} error="Failed to load" />)

      expect(screen.getByTestId('error-message')).toBeInTheDocument()
      expect(screen.getByText('Failed to load')).toBeInTheDocument()
    })
  })

  describe('Entry Format', () => {
    it('should display caregiver name', () => {
      render(<CaregiverFlagAuditView entries={[mockEntries[0]]} />)

      expect(screen.getByText('Grandma')).toBeInTheDocument()
    })

    it('should display child name', () => {
      render(<CaregiverFlagAuditView entries={[mockEntries[0]]} />)

      expect(screen.getByText('Emma')).toBeInTheDocument()
    })

    it('should display flag category', () => {
      render(<CaregiverFlagAuditView entries={[mockEntries[0]]} />)

      expect(screen.getByText('Violence')).toBeInTheDocument()
    })

    it('should display action type', () => {
      render(<CaregiverFlagAuditView entries={[mockEntries[0]]} />)

      expect(screen.getByText(/viewed/i)).toBeInTheDocument()
    })

    it('should display marked_reviewed action', () => {
      render(<CaregiverFlagAuditView entries={[mockEntries[1]]} />)

      expect(screen.getByText(/marked as reviewed/i)).toBeInTheDocument()
    })
  })

  describe('Date Range Filtering', () => {
    it('should filter by start date', () => {
      render(
        <CaregiverFlagAuditView
          entries={mockEntries}
          filterByStartDate={new Date('2025-12-30T15:30:00')}
        />
      )

      // Should only show log-3 (16:00) - log-1 (14:00) and log-2 (15:00) are before start
      const rows = screen.getAllByTestId(/^flag-audit-row-/)
      expect(rows).toHaveLength(1)
      expect(rows[0]).toHaveAttribute('data-testid', 'flag-audit-row-log-3')
    })

    it('should filter by end date', () => {
      render(
        <CaregiverFlagAuditView
          entries={mockEntries}
          filterByEndDate={new Date('2025-12-30T14:30:00')}
        />
      )

      // Should only show log-1 (14:00) - log-2 (15:00) and log-3 (16:00) are after end
      const rows = screen.getAllByTestId(/^flag-audit-row-/)
      expect(rows).toHaveLength(1)
      expect(rows[0]).toHaveAttribute('data-testid', 'flag-audit-row-log-1')
    })

    it('should filter by date range', () => {
      render(
        <CaregiverFlagAuditView
          entries={mockEntries}
          filterByStartDate={new Date('2025-12-30T14:30:00')}
          filterByEndDate={new Date('2025-12-30T15:30:00')}
        />
      )

      // Should only show log-2 (15:00) - log-1 (14:00) is before start, log-3 (16:00) is after end
      const rows = screen.getAllByTestId(/^flag-audit-row-/)
      expect(rows).toHaveLength(1)
      expect(rows[0]).toHaveAttribute('data-testid', 'flag-audit-row-log-2')
    })

    it('should show empty state when date range excludes all entries', () => {
      render(
        <CaregiverFlagAuditView
          entries={mockEntries}
          filterByStartDate={new Date('2025-12-31T00:00:00')}
        />
      )

      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading', () => {
      render(<CaregiverFlagAuditView entries={mockEntries} />)

      expect(screen.getByRole('heading', { name: /flag viewing history/i })).toBeInTheDocument()
    })
  })
})
