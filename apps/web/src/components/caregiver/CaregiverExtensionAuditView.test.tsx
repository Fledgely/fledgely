/**
 * Tests for CaregiverExtensionAuditView and CaregiverExtensionLogRow components.
 *
 * Story 39.4: Caregiver PIN for Time Extension
 *
 * Tests cover:
 * - AC4: Extension Logging - Display extension history
 * - Component rendering
 * - Entry filtering
 * - Sorting (newest first)
 * - Empty/loading/error states
 * - Accessibility compliance
 */

import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CaregiverExtensionAuditView } from './CaregiverExtensionAuditView'
import {
  CaregiverExtensionLogRow,
  type CaregiverExtensionLogEntry,
} from './CaregiverExtensionLogRow'

const createMockEntry = (
  overrides: Partial<CaregiverExtensionLogEntry> = {}
): CaregiverExtensionLogEntry => ({
  id: 'entry-123',
  caregiverUid: 'caregiver-456',
  caregiverName: 'Grandma',
  childUid: 'child-789',
  childName: 'Mateo',
  extensionMinutes: 30,
  newTimeBalanceMinutes: 60,
  timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
  ...overrides,
})

describe('CaregiverExtensionLogRow', () => {
  describe('Rendering', () => {
    it('renders the row container', () => {
      render(<CaregiverExtensionLogRow entry={createMockEntry()} />)

      expect(screen.getByTestId('extension-log-row')).toBeInTheDocument()
    })

    it('displays caregiver name', () => {
      render(<CaregiverExtensionLogRow entry={createMockEntry({ caregiverName: 'Grandpa Joe' })} />)

      expect(screen.getByText('Grandpa Joe')).toBeInTheDocument()
    })

    it('displays child name', () => {
      render(<CaregiverExtensionLogRow entry={createMockEntry({ childName: 'Sofia' })} />)

      expect(screen.getByText('Sofia')).toBeInTheDocument()
    })

    it('displays extension badge', () => {
      render(<CaregiverExtensionLogRow entry={createMockEntry({ extensionMinutes: 30 })} />)

      const badge = screen.getByTestId('extension-badge')
      expect(badge.textContent).toBe('+30min')
    })

    it('formats hours for 60+ minute extensions', () => {
      render(<CaregiverExtensionLogRow entry={createMockEntry({ extensionMinutes: 60 })} />)

      const badge = screen.getByTestId('extension-badge')
      expect(badge.textContent).toBe('+1h')
    })

    it('formats mixed hours and minutes', () => {
      render(<CaregiverExtensionLogRow entry={createMockEntry({ extensionMinutes: 90 })} />)

      const badge = screen.getByTestId('extension-badge')
      expect(badge.textContent).toBe('+1h 30m')
    })

    it('shows new balance in meta', () => {
      render(<CaregiverExtensionLogRow entry={createMockEntry({ newTimeBalanceMinutes: 45 })} />)

      expect(screen.getByText(/45min/)).toBeInTheDocument()
    })

    it('shows requested badge when requestId is present', () => {
      render(<CaregiverExtensionLogRow entry={createMockEntry({ requestId: 'req-123' })} />)

      expect(screen.getByText('requested')).toBeInTheDocument()
    })

    it('does not show requested badge when no requestId', () => {
      render(<CaregiverExtensionLogRow entry={createMockEntry({ requestId: undefined })} />)

      expect(screen.queryByText('requested')).not.toBeInTheDocument()
    })

    it('includes entry id in data attribute', () => {
      render(<CaregiverExtensionLogRow entry={createMockEntry({ id: 'entry-abc' })} />)

      const row = screen.getByTestId('extension-log-row')
      expect(row).toHaveAttribute('data-entry-id', 'entry-abc')
    })
  })

  describe('Time Display', () => {
    it('shows "Just now" for very recent entries', () => {
      render(
        <CaregiverExtensionLogRow
          entry={createMockEntry({ timestamp: new Date(Date.now() - 30 * 1000) })}
        />
      )

      expect(screen.getByText(/Just now/)).toBeInTheDocument()
    })

    it('shows minutes ago for recent entries', () => {
      render(
        <CaregiverExtensionLogRow
          entry={createMockEntry({ timestamp: new Date(Date.now() - 5 * 60 * 1000) })}
        />
      )

      expect(screen.getByText(/5m ago/)).toBeInTheDocument()
    })

    it('shows hours ago for older entries', () => {
      render(
        <CaregiverExtensionLogRow
          entry={createMockEntry({ timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000) })}
        />
      )

      expect(screen.getByText(/3h ago/)).toBeInTheDocument()
    })
  })
})

describe('CaregiverExtensionAuditView', () => {
  describe('Rendering', () => {
    it('renders the container', () => {
      render(<CaregiverExtensionAuditView entries={[]} />)

      expect(screen.getByTestId('caregiver-extension-audit-view')).toBeInTheDocument()
    })

    it('renders the title', () => {
      render(<CaregiverExtensionAuditView entries={[]} />)

      expect(screen.getByText('Extension History')).toBeInTheDocument()
    })

    it('shows entry count when entries exist', () => {
      render(<CaregiverExtensionAuditView entries={[createMockEntry()]} />)

      expect(screen.getByTestId('entry-count')).toHaveTextContent('1')
    })

    it('shows correct count for multiple entries', () => {
      const entries = [
        createMockEntry({ id: '1' }),
        createMockEntry({ id: '2' }),
        createMockEntry({ id: '3' }),
      ]
      render(<CaregiverExtensionAuditView entries={entries} />)

      expect(screen.getByTestId('entry-count')).toHaveTextContent('3')
    })
  })

  describe('Empty State', () => {
    it('shows empty state when no entries', () => {
      render(<CaregiverExtensionAuditView entries={[]} />)

      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })

    it('shows empty title', () => {
      render(<CaregiverExtensionAuditView entries={[]} />)

      expect(screen.getByText('No extensions yet')).toBeInTheDocument()
    })

    it('shows empty description', () => {
      render(<CaregiverExtensionAuditView entries={[]} />)

      expect(screen.getByText(/caregivers grant extra screen time/)).toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('shows loading state when loading', () => {
      render(<CaregiverExtensionAuditView entries={[]} loading={true} />)

      expect(screen.getByTestId('loading-state')).toBeInTheDocument()
    })

    it('shows loading text', () => {
      render(<CaregiverExtensionAuditView entries={[]} loading={true} />)

      expect(screen.getByText('Loading extension history...')).toBeInTheDocument()
    })

    it('does not show empty state when loading', () => {
      render(<CaregiverExtensionAuditView entries={[]} loading={true} />)

      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument()
    })
  })

  describe('Error State', () => {
    it('shows error message when error provided', () => {
      render(<CaregiverExtensionAuditView entries={[]} error="Failed to load" />)

      expect(screen.getByTestId('error-message')).toBeInTheDocument()
      expect(screen.getByText('Failed to load')).toBeInTheDocument()
    })

    it('error has role="alert"', () => {
      render(<CaregiverExtensionAuditView entries={[]} error="Error" />)

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  describe('Entry List', () => {
    it('renders entry list when entries exist', () => {
      render(<CaregiverExtensionAuditView entries={[createMockEntry()]} />)

      expect(screen.getByTestId('entry-list')).toBeInTheDocument()
    })

    it('renders all entry rows', () => {
      const entries = [
        createMockEntry({ id: '1', caregiverName: 'Grandma' }),
        createMockEntry({ id: '2', caregiverName: 'Grandpa' }),
      ]
      render(<CaregiverExtensionAuditView entries={entries} />)

      expect(screen.getByText('Grandma')).toBeInTheDocument()
      expect(screen.getByText('Grandpa')).toBeInTheDocument()
    })

    it('sorts entries by timestamp (newest first)', () => {
      const entries = [
        createMockEntry({ id: '1', caregiverName: 'Older', timestamp: new Date('2024-01-01') }),
        createMockEntry({ id: '2', caregiverName: 'Newer', timestamp: new Date('2024-01-02') }),
      ]
      render(<CaregiverExtensionAuditView entries={entries} />)

      const rows = screen.getAllByTestId('extension-log-row')
      expect(rows[0]).toHaveAttribute('data-entry-id', '2') // Newer first
      expect(rows[1]).toHaveAttribute('data-entry-id', '1')
    })
  })

  describe('Filtering', () => {
    it('filters by caregiver UID', () => {
      const entries = [
        createMockEntry({ id: '1', caregiverUid: 'cg-1', caregiverName: 'Grandma' }),
        createMockEntry({ id: '2', caregiverUid: 'cg-2', caregiverName: 'Grandpa' }),
      ]
      render(<CaregiverExtensionAuditView entries={entries} filterByCaregiverUid="cg-1" />)

      expect(screen.getByText('Grandma')).toBeInTheDocument()
      expect(screen.queryByText('Grandpa')).not.toBeInTheDocument()
    })

    it('filters by child UID', () => {
      const entries = [
        createMockEntry({ id: '1', childUid: 'child-1', childName: 'Mateo' }),
        createMockEntry({ id: '2', childUid: 'child-2', childName: 'Sofia' }),
      ]
      render(<CaregiverExtensionAuditView entries={entries} filterByChildUid="child-2" />)

      expect(screen.queryByText('Mateo')).not.toBeInTheDocument()
      expect(screen.getByText('Sofia')).toBeInTheDocument()
    })

    it('shows empty state when filter returns no results', () => {
      const entries = [createMockEntry({ id: '1', caregiverUid: 'cg-1' })]
      render(<CaregiverExtensionAuditView entries={entries} filterByCaregiverUid="cg-999" />)

      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })

    it('updates count based on filtered results', () => {
      const entries = [
        createMockEntry({ id: '1', caregiverUid: 'cg-1' }),
        createMockEntry({ id: '2', caregiverUid: 'cg-1' }),
        createMockEntry({ id: '3', caregiverUid: 'cg-2' }),
      ]
      render(<CaregiverExtensionAuditView entries={entries} filterByCaregiverUid="cg-1" />)

      expect(screen.getByTestId('entry-count')).toHaveTextContent('2')
    })
  })
})
