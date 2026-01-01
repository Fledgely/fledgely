/**
 * AgreementHistoryTimeline Tests - Story 34.6
 *
 * Tests for the agreement history timeline component.
 * AC1: Timeline shows all versions with dates
 * AC2: Each change shows who proposed, who accepted, what changed
 * AC4: "We've updated the agreement X times" summary
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AgreementHistoryTimeline } from './AgreementHistoryTimeline'
import type { AgreementVersion } from '@fledgely/shared'

// Mock shared package
vi.mock('@fledgely/shared', () => ({
  HISTORY_MESSAGES: {
    timeline: {
      header: 'Agreement History',
      subheader: 'See how your family agreement has evolved',
      emptyState: 'Your agreement history will appear here as you make changes together.',
    },
    version: {
      proposedBy: 'Proposed by',
      acceptedBy: 'Accepted by',
      changesLabel: 'Changes made',
    },
  },
  getUpdateCountMessage: (count: number) =>
    count === 0
      ? "We haven't updated the agreement yet."
      : count === 1
        ? "We've updated the agreement 1 time."
        : `We've updated the agreement ${count} times.`,
}))

describe('AgreementHistoryTimeline - Story 34.6', () => {
  const mockVersions: AgreementVersion[] = [
    {
      id: 'v3',
      versionNumber: 3,
      proposerId: 'parent-1',
      proposerName: 'Mom',
      accepterId: 'parent-2',
      accepterName: 'Dad',
      changes: [
        {
          fieldPath: 'bedtime.weekday',
          fieldLabel: 'Weekday Bedtime',
          previousValue: '8:30 PM',
          newValue: '9:00 PM',
        },
      ],
      createdAt: new Date('2024-03-01'),
    },
    {
      id: 'v2',
      versionNumber: 2,
      proposerId: 'parent-2',
      proposerName: 'Dad',
      accepterId: 'parent-1',
      accepterName: 'Mom',
      changes: [
        {
          fieldPath: 'screenTime.weekday',
          fieldLabel: 'Weekday Screen Time',
          previousValue: '1 hour',
          newValue: '2 hours',
        },
      ],
      createdAt: new Date('2024-02-15'),
    },
    {
      id: 'v1',
      versionNumber: 1,
      proposerId: 'parent-1',
      proposerName: 'Mom',
      accepterId: 'parent-2',
      accepterName: 'Dad',
      changes: [],
      createdAt: new Date('2024-01-01'),
      note: 'Initial agreement',
    },
  ]

  const defaultProps = {
    versions: mockVersions,
    onVersionSelect: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render timeline header (AC1)', () => {
      render(<AgreementHistoryTimeline {...defaultProps} />)

      expect(screen.getByText('Agreement History')).toBeInTheDocument()
    })

    it('should render all versions in timeline (AC1)', () => {
      render(<AgreementHistoryTimeline {...defaultProps} />)

      expect(screen.getByText(/Version 3/)).toBeInTheDocument()
      expect(screen.getByText(/Version 2/)).toBeInTheDocument()
      expect(screen.getByText(/Version 1/)).toBeInTheDocument()
    })

    it('should show dates for each version (AC1)', () => {
      render(<AgreementHistoryTimeline {...defaultProps} />)

      expect(screen.getByText(/Mar 1, 2024/)).toBeInTheDocument()
      expect(screen.getByText(/Feb 15, 2024/)).toBeInTheDocument()
      expect(screen.getByText(/Jan 1, 2024/)).toBeInTheDocument()
    })

    it('should show proposer name (AC2)', () => {
      render(<AgreementHistoryTimeline {...defaultProps} />)

      expect(screen.getAllByText(/Mom/).length).toBeGreaterThanOrEqual(2)
      expect(screen.getAllByText(/Dad/).length).toBeGreaterThanOrEqual(1)
    })

    it('should show accepter name (AC2)', () => {
      render(<AgreementHistoryTimeline {...defaultProps} />)

      // Check both proposer and accepter info is present
      expect(screen.getAllByText(/Accepted by/).length).toBeGreaterThanOrEqual(1)
    })

    it('should show changes summary (AC2)', () => {
      render(<AgreementHistoryTimeline {...defaultProps} />)

      expect(screen.getByText(/Weekday Bedtime/)).toBeInTheDocument()
      expect(screen.getByText(/Weekday Screen Time/)).toBeInTheDocument()
    })
  })

  describe('update count message (AC4)', () => {
    it('should show update count for multiple versions', () => {
      render(<AgreementHistoryTimeline {...defaultProps} />)

      // 3 versions means 2 updates (excluding initial)
      expect(screen.getByText(/updated the agreement/i)).toBeInTheDocument()
    })

    it('should show singular for 1 update', () => {
      const twoVersions = mockVersions.slice(1) // v2 and v1
      render(<AgreementHistoryTimeline {...defaultProps} versions={twoVersions} />)

      expect(screen.getByText(/1 time/i)).toBeInTheDocument()
    })

    it('should show message for no updates', () => {
      const justInitial = [mockVersions[2]] // Only v1
      render(<AgreementHistoryTimeline {...defaultProps} versions={justInitial} />)

      expect(screen.getByText(/haven't updated/i)).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('should show empty state message when no versions', () => {
      render(<AgreementHistoryTimeline {...defaultProps} versions={[]} />)

      expect(screen.getByText(/history will appear here/i)).toBeInTheDocument()
    })
  })

  describe('interaction', () => {
    it('should call onVersionSelect when version is clicked', () => {
      const onVersionSelect = vi.fn()
      render(<AgreementHistoryTimeline {...defaultProps} onVersionSelect={onVersionSelect} />)

      const version3Button = screen.getByText(/Version 3/).closest('button')
      fireEvent.click(version3Button!)

      expect(onVersionSelect).toHaveBeenCalledWith(mockVersions[0])
    })

    it('should highlight selected version', () => {
      render(<AgreementHistoryTimeline {...defaultProps} selectedVersionId="v2" />)

      const version2Item = screen.getByText(/Version 2/).closest('li')
      expect(version2Item).toHaveClass('border-blue-500')
    })
  })

  describe('accessibility', () => {
    it('should have list role for timeline', () => {
      render(<AgreementHistoryTimeline {...defaultProps} />)

      // There should be at least one list (the timeline)
      expect(screen.getAllByRole('list').length).toBeGreaterThanOrEqual(1)
    })

    it('should have listitem role for each version', () => {
      render(<AgreementHistoryTimeline {...defaultProps} />)

      // There are 3 version items plus 2 change items (nested lists)
      const items = screen.getAllByRole('listitem')
      expect(items.length).toBeGreaterThanOrEqual(3)
    })

    it('should have clickable buttons for version selection', () => {
      render(<AgreementHistoryTimeline {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('version notes', () => {
    it('should show version note when present', () => {
      render(<AgreementHistoryTimeline {...defaultProps} />)

      expect(screen.getByText(/Initial agreement/)).toBeInTheDocument()
    })
  })
})
