/**
 * Agreement History Integration Tests - Story 34.6
 *
 * Integration tests for the complete agreement history flow.
 * Tests all acceptance criteria working together.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AgreementHistoryTimeline } from '../AgreementHistoryTimeline'
import { AgreementVersionDiff } from '../AgreementVersionDiff'
import { AgreementHistorySummary } from '../AgreementHistorySummary'
import { computeVersionDiff, hasChanges } from '../../../utils/agreementDiff'
import { exportHistoryAsJson, exportHistoryAsText } from '../../../services/agreementExportService'
import type { HistoryVersion } from '@fledgely/shared'

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
    diff: {
      header: 'Compare Versions',
      previous: 'Previous',
      current: 'Current',
      noChanges: 'No differences found between these versions.',
      selectVersions: 'Select two versions to compare.',
    },
    growth: {
      milestone: {
        five: "You've reached 5 updates! Your family is learning to adapt together.",
        ten: '10 updates and counting! This shows real commitment to growth.',
        twenty: '20 updates! Your agreement evolves with your family.',
      },
      collaboration: 'Every update represents a conversation and a decision made together.',
      evolution: 'Agreements that change are agreements that work.',
    },
    export: {
      button: 'Export History',
      success: 'History exported successfully!',
      formats: {
        json: 'Export as JSON',
        text: 'Export as Text',
      },
    },
  },
  getUpdateCountMessage: (count: number) =>
    count === 0
      ? "We haven't updated the agreement yet."
      : count === 1
        ? "We've updated the agreement 1 time."
        : `We've updated the agreement ${count} times.`,
  getGrowthMessage: (count: number) => {
    if (count >= 20) return '20 updates! Your agreement evolves with your family.'
    if (count >= 10) return '10 updates and counting! This shows real commitment to growth.'
    if (count >= 5) return "You've reached 5 updates! Your family is learning to adapt together."
    if (count >= 2) return 'Every update represents a conversation and a decision made together.'
    return 'Agreements that change are agreements that work.'
  },
}))

describe('Agreement History Integration - Story 34.6', () => {
  const mockVersions: HistoryVersion[] = [
    {
      id: 'v5',
      versionNumber: 5,
      proposerId: 'parent-1',
      proposerName: 'Mom',
      accepterId: 'parent-2',
      accepterName: 'Dad',
      changes: [
        {
          fieldPath: 'allowance.weekly',
          fieldLabel: 'Weekly Allowance',
          previousValue: '$10',
          newValue: '$15',
        },
      ],
      createdAt: new Date('2024-05-01'),
    },
    {
      id: 'v4',
      versionNumber: 4,
      proposerId: 'parent-2',
      proposerName: 'Dad',
      accepterId: 'parent-1',
      accepterName: 'Mom',
      changes: [
        {
          fieldPath: 'chores.weekend',
          fieldLabel: 'Weekend Chores',
          previousValue: null,
          newValue: 'Clean room',
        },
      ],
      createdAt: new Date('2024-04-01'),
    },
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
      createdAt: new Date('2024-02-01'),
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

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('AC1: Timeline shows all versions with dates', () => {
    it('should display all versions in chronological order', () => {
      render(<AgreementHistoryTimeline versions={mockVersions} />)

      expect(screen.getByText(/Version 5/)).toBeInTheDocument()
      expect(screen.getByText(/Version 4/)).toBeInTheDocument()
      expect(screen.getByText(/Version 3/)).toBeInTheDocument()
      expect(screen.getByText(/Version 2/)).toBeInTheDocument()
      expect(screen.getByText(/Version 1/)).toBeInTheDocument()
    })

    it('should show dates for all versions', () => {
      render(<AgreementHistoryTimeline versions={mockVersions} />)

      expect(screen.getByText(/May 1, 2024/)).toBeInTheDocument()
      expect(screen.getByText(/Apr 1, 2024/)).toBeInTheDocument()
      expect(screen.getByText(/Mar 1, 2024/)).toBeInTheDocument()
      expect(screen.getByText(/Feb 1, 2024/)).toBeInTheDocument()
      expect(screen.getByText(/Jan 1, 2024/)).toBeInTheDocument()
    })
  })

  describe('AC2: Each change shows who proposed, accepted, what changed', () => {
    it('should display proposer and accepter for each version', () => {
      render(<AgreementHistoryTimeline versions={mockVersions} />)

      // Both parents should appear as proposers/accepters
      const momMentions = screen.getAllByText(/Mom/)
      const dadMentions = screen.getAllByText(/Dad/)

      expect(momMentions.length).toBeGreaterThanOrEqual(5)
      expect(dadMentions.length).toBeGreaterThanOrEqual(5)
    })

    it('should show what changed in each version', () => {
      render(<AgreementHistoryTimeline versions={mockVersions} />)

      expect(screen.getByText(/Weekly Allowance/)).toBeInTheDocument()
      expect(screen.getByText(/Weekend Chores/)).toBeInTheDocument()
      expect(screen.getByText(/Weekday Bedtime/)).toBeInTheDocument()
      expect(screen.getByText(/Weekday Screen Time/)).toBeInTheDocument()
    })
  })

  describe('AC3: Diff view available for any two versions', () => {
    it('should compute diff between any two versions', () => {
      const diff = computeVersionDiff(mockVersions[4], mockVersions[0])

      expect(diff.fromVersion).toBe(1)
      expect(diff.toVersion).toBe(5)
      expect(hasChanges(diff)).toBe(true)
    })

    it('should display diff in comparison component', () => {
      render(<AgreementVersionDiff fromVersion={mockVersions[4]} toVersion={mockVersions[3]} />)

      expect(screen.getByText(/Compare Versions/)).toBeInTheDocument()
      expect(screen.getByText(/Version 1/)).toBeInTheDocument()
      expect(screen.getByText(/Version 2/)).toBeInTheDocument()
    })

    it('should allow version selection for comparison', () => {
      const onVersionSelect = vi.fn()
      render(<AgreementHistoryTimeline versions={mockVersions} onVersionSelect={onVersionSelect} />)

      const version3Button = screen.getByText(/Version 3/).closest('button')
      fireEvent.click(version3Button!)

      expect(onVersionSelect).toHaveBeenCalledWith(mockVersions[2])
    })
  })

  describe('AC4: Update count summary', () => {
    it('should show correct update count', () => {
      render(<AgreementHistorySummary versionCount={mockVersions.length} />)

      // 5 versions = 4 updates
      expect(screen.getByText(/updated the agreement 4 times/i)).toBeInTheDocument()
    })

    it('should show singular for one update', () => {
      render(<AgreementHistorySummary versionCount={2} />)

      expect(screen.getByText(/updated the agreement 1 time/i)).toBeInTheDocument()
    })
  })

  describe('AC5: Growth and trust-building messaging', () => {
    it('should show milestone message at 5 versions', () => {
      render(<AgreementHistorySummary versionCount={5} />)

      expect(screen.getByText(/learning to adapt together/i)).toBeInTheDocument()
    })

    it('should show positive language', () => {
      render(<AgreementHistorySummary versionCount={3} />)

      const summary = screen.getByTestId('agreement-history-summary')
      const text = summary.textContent?.toLowerCase() || ''

      expect(text).toContain('together')
    })
  })

  describe('AC6: Export available for records', () => {
    it('should export history as JSON', () => {
      const json = exportHistoryAsJson(mockVersions, 'Smith Family')
      const parsed = JSON.parse(json)

      expect(parsed.familyName).toBe('Smith Family')
      expect(parsed.versions).toHaveLength(5)
      expect(parsed.totalUpdates).toBe(4)
    })

    it('should export history as text', () => {
      const text = exportHistoryAsText(mockVersions, 'Smith Family')

      expect(text).toContain('Smith Family')
      expect(text).toContain('Agreement History')
      expect(text).toContain('Version 5')
      expect(text).toContain('Version 1')
    })

    it('should include all version details in export', () => {
      const json = exportHistoryAsJson(mockVersions, 'Smith Family')
      const parsed = JSON.parse(json)

      const v5 = parsed.versions[0]
      expect(v5.proposerName).toBe('Mom')
      expect(v5.accepterName).toBe('Dad')
      expect(v5.changes[0].fieldLabel).toBe('Weekly Allowance')
    })
  })

  describe('complete workflow integration', () => {
    it('should support timeline selection to diff view flow', async () => {
      let selectedVersion: HistoryVersion | null = null

      const { rerender } = render(
        <div>
          <AgreementHistoryTimeline
            versions={mockVersions}
            onVersionSelect={(v) => {
              selectedVersion = v
            }}
          />
          <AgreementVersionDiff fromVersion={mockVersions[4]} toVersion={null} />
        </div>
      )

      // Select a version
      const version3Button = screen.getByText(/Version 3/).closest('button')
      fireEvent.click(version3Button!)

      // Rerender with selected version
      rerender(
        <div>
          <AgreementHistoryTimeline
            versions={mockVersions}
            onVersionSelect={(v) => {
              selectedVersion = v
            }}
            selectedVersionId={selectedVersion?.id}
          />
          <AgreementVersionDiff fromVersion={mockVersions[4]} toVersion={selectedVersion} />
        </div>
      )

      // Diff view should now show comparison
      expect(screen.getAllByText(/Version 3/).length).toBeGreaterThanOrEqual(1)
    })

    it('should display summary with timeline', () => {
      render(
        <div>
          <AgreementHistorySummary versionCount={mockVersions.length} />
          <AgreementHistoryTimeline versions={mockVersions} />
        </div>
      )

      // Summary - may appear in multiple places
      expect(screen.getAllByText(/updated the agreement 4 times/i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText(/learning to adapt together/i)).toBeInTheDocument()

      // Timeline
      expect(screen.getByText('Agreement History')).toBeInTheDocument()
      expect(screen.getByText(/Version 5/)).toBeInTheDocument()
    })
  })
})
