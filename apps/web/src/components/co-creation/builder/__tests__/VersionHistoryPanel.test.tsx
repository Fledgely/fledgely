/**
 * Tests for VersionHistoryPanel Component
 *
 * Story 5.7: Draft Saving & Version History - Task 4
 *
 * Tests for version history timeline display with preview and restore capabilities.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { SessionVersion } from '@fledgely/contracts'
import { VersionHistoryPanel } from '../VersionHistoryPanel'

// ============================================
// TEST DATA
// ============================================

const createMockVersion = (overrides?: Partial<SessionVersion>): SessionVersion => ({
  id: '550e8400-e29b-41d4-a716-446655440001',
  sessionId: '550e8400-e29b-41d4-a716-446655440000',
  versionType: 'initial_draft',
  createdBy: 'parent',
  snapshot: {
    terms: [
      {
        id: '550e8400-e29b-41d4-a716-446655440010',
        type: 'screen_time',
        content: { weekdayMinutes: 60 },
        addedBy: 'parent',
        status: 'accepted',
        order: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        discussionNotes: [],
        resolutionStatus: 'unresolved',
      },
    ],
    contributions: [
      {
        id: '550e8400-e29b-41d4-a716-446655440020',
        contributor: 'parent',
        action: 'added_term',
        termId: '550e8400-e29b-41d4-a716-446655440010',
        createdAt: '2024-01-01T00:00:00Z',
      },
    ],
    agreementMode: 'full',
  },
  createdAt: '2024-01-01T00:00:00Z',
  ...overrides,
})

const mockVersions: SessionVersion[] = [
  createMockVersion({
    id: 'version-1',
    versionType: 'initial_draft',
    createdBy: 'parent',
    createdAt: '2024-01-01T10:00:00Z',
  }),
  createMockVersion({
    id: 'version-2',
    versionType: 'child_contribution',
    createdBy: 'child',
    createdAt: '2024-01-01T11:00:00Z',
    snapshot: {
      terms: [
        {
          id: '550e8400-e29b-41d4-a716-446655440010',
          type: 'screen_time',
          content: { weekdayMinutes: 60 },
          addedBy: 'parent',
          status: 'accepted',
          order: 0,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          discussionNotes: [],
          resolutionStatus: 'unresolved',
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440011',
          type: 'bedtime',
          content: { time: '21:00' },
          addedBy: 'child',
          status: 'accepted',
          order: 1,
          createdAt: '2024-01-01T01:00:00Z',
          updatedAt: '2024-01-01T01:00:00Z',
          discussionNotes: [],
          resolutionStatus: 'unresolved',
        },
      ],
      contributions: [
        {
          id: '550e8400-e29b-41d4-a716-446655440020',
          contributor: 'parent',
          action: 'added_term',
          termId: '550e8400-e29b-41d4-a716-446655440010',
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440021',
          contributor: 'child',
          action: 'added_term',
          termId: '550e8400-e29b-41d4-a716-446655440011',
          createdAt: '2024-01-01T01:00:00Z',
        },
      ],
      agreementMode: 'full',
    },
  }),
  createMockVersion({
    id: 'version-3',
    versionType: 'manual_save',
    createdBy: 'parent',
    createdAt: '2024-01-01T12:00:00Z',
  }),
]

describe('VersionHistoryPanel', () => {
  const defaultProps = {
    versions: mockVersions,
    onPreview: vi.fn(),
    onRestore: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render the version history panel', () => {
      render(<VersionHistoryPanel {...defaultProps} />)
      expect(screen.getByTestId('version-history-panel')).toBeInTheDocument()
    })

    it('should render the header', () => {
      render(<VersionHistoryPanel {...defaultProps} />)
      expect(screen.getByText('Version History')).toBeInTheDocument()
      expect(screen.getByText('See all the changes you have made')).toBeInTheDocument()
    })

    it('should render all versions', () => {
      render(<VersionHistoryPanel {...defaultProps} />)
      expect(screen.getByTestId('version-item-version-1')).toBeInTheDocument()
      expect(screen.getByTestId('version-item-version-2')).toBeInTheDocument()
      expect(screen.getByTestId('version-item-version-3')).toBeInTheDocument()
    })

    it('should display version type labels', () => {
      render(<VersionHistoryPanel {...defaultProps} />)
      expect(screen.getByText('Initial Draft')).toBeInTheDocument()
      expect(screen.getByText('Child Added Content')).toBeInTheDocument()
      expect(screen.getByText('Saved')).toBeInTheDocument()
    })

    it('should display version type descriptions', () => {
      render(<VersionHistoryPanel {...defaultProps} />)
      expect(screen.getByText('The agreement when you first started.')).toBeInTheDocument()
      expect(screen.getByText('When your child added something to the agreement.')).toBeInTheDocument()
      expect(screen.getByText('You saved your work.')).toBeInTheDocument()
    })

    it('should display term and contribution counts', () => {
      render(<VersionHistoryPanel {...defaultProps} />)
      // version-1 and version-3: 1 term, 1 contribution (appears twice)
      expect(screen.getAllByText('1 term, 1 change')).toHaveLength(2)
      // version-2: 2 terms, 2 contributions
      expect(screen.getByText('2 terms, 2 changes')).toBeInTheDocument()
    })

    it('should display contributor info', () => {
      render(<VersionHistoryPanel {...defaultProps} />)
      expect(screen.getAllByText('Parent').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Child').length).toBeGreaterThan(0)
    })
  })

  describe('version ordering', () => {
    it('should sort versions by date (newest first)', () => {
      render(<VersionHistoryPanel {...defaultProps} />)
      const list = screen.getByTestId('version-history-panel-list')
      const items = within(list).getAllByRole('listitem')

      // version-3 (12:00) should be first, version-1 (10:00) should be last
      expect(items[0]).toHaveAttribute('data-testid', 'version-item-version-3')
      expect(items[2]).toHaveAttribute('data-testid', 'version-item-version-1')
    })

    it('should mark the newest version as current', () => {
      render(<VersionHistoryPanel {...defaultProps} />)
      const latestItem = screen.getByTestId('version-item-version-3')
      expect(within(latestItem).getByText('Current')).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('should show empty state when no versions', () => {
      render(<VersionHistoryPanel {...defaultProps} versions={[]} />)
      expect(screen.getByTestId('version-history-panel-empty')).toBeInTheDocument()
      expect(screen.getByText('No versions saved yet')).toBeInTheDocument()
    })

    it('should show helpful message in empty state', () => {
      render(<VersionHistoryPanel {...defaultProps} versions={[]} />)
      expect(screen.getByText('Your changes will be saved automatically')).toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    it('should show loading skeletons when loading', () => {
      render(<VersionHistoryPanel {...defaultProps} isLoading />)
      const panel = screen.getByTestId('version-history-panel')
      // Skeletons should be present (they have aria-hidden="true")
      const skeletons = panel.querySelectorAll('[aria-hidden="true"].animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('selection state', () => {
    it('should highlight selected version', () => {
      render(<VersionHistoryPanel {...defaultProps} selectedVersionId="version-2" />)
      const selectedItem = screen.getByTestId('version-item-version-2')
      expect(selectedItem).toHaveClass('bg-blue-50')
    })

    it('should not highlight non-selected versions', () => {
      render(<VersionHistoryPanel {...defaultProps} selectedVersionId="version-2" />)
      const nonSelectedItem = screen.getByTestId('version-item-version-1')
      expect(nonSelectedItem).not.toHaveClass('bg-blue-50')
    })
  })

  describe('preview button', () => {
    it('should render preview button for each version', () => {
      render(<VersionHistoryPanel {...defaultProps} />)
      expect(screen.getByTestId('preview-version-version-1')).toBeInTheDocument()
      expect(screen.getByTestId('preview-version-version-2')).toBeInTheDocument()
      expect(screen.getByTestId('preview-version-version-3')).toBeInTheDocument()
    })

    it('should call onPreview when preview button is clicked', async () => {
      const onPreview = vi.fn()
      const user = userEvent.setup()
      render(<VersionHistoryPanel {...defaultProps} onPreview={onPreview} />)

      await user.click(screen.getByTestId('preview-version-version-1'))

      expect(onPreview).toHaveBeenCalledTimes(1)
      expect(onPreview).toHaveBeenCalledWith(expect.objectContaining({ id: 'version-1' }))
    })

    it('should have accessible label on preview button', () => {
      render(<VersionHistoryPanel {...defaultProps} />)
      const previewButton = screen.getByTestId('preview-version-version-1')
      expect(previewButton).toHaveAttribute('aria-label', 'Preview version: Initial Draft')
    })
  })

  describe('restore button', () => {
    it('should render restore button for non-current versions', () => {
      render(<VersionHistoryPanel {...defaultProps} />)
      // version-1 and version-2 are not current, so they should have restore buttons
      expect(screen.getByTestId('restore-version-version-1')).toBeInTheDocument()
      expect(screen.getByTestId('restore-version-version-2')).toBeInTheDocument()
    })

    it('should NOT render restore button for current version', () => {
      render(<VersionHistoryPanel {...defaultProps} />)
      // version-3 is current (newest), so it should NOT have a restore button
      expect(screen.queryByTestId('restore-version-version-3')).not.toBeInTheDocument()
    })

    it('should call onRestore when restore button is clicked', async () => {
      const onRestore = vi.fn()
      const user = userEvent.setup()
      render(<VersionHistoryPanel {...defaultProps} onRestore={onRestore} />)

      await user.click(screen.getByTestId('restore-version-version-1'))

      expect(onRestore).toHaveBeenCalledTimes(1)
      expect(onRestore).toHaveBeenCalledWith(expect.objectContaining({ id: 'version-1' }))
    })

    it('should have accessible label on restore button', () => {
      render(<VersionHistoryPanel {...defaultProps} />)
      const restoreButton = screen.getByTestId('restore-version-version-1')
      expect(restoreButton).toHaveAttribute('aria-label', 'Restore to version: Initial Draft')
    })
  })

  describe('accessibility', () => {
    it('should have proper landmark role', () => {
      render(<VersionHistoryPanel {...defaultProps} />)
      expect(screen.getByRole('complementary')).toBeInTheDocument()
    })

    it('should have aria-label on aside', () => {
      render(<VersionHistoryPanel {...defaultProps} />)
      expect(screen.getByRole('complementary')).toHaveAttribute('aria-label', 'Version history')
    })

    it('should have list role for versions', () => {
      render(<VersionHistoryPanel {...defaultProps} />)
      expect(screen.getByRole('list', { name: 'Saved versions' })).toBeInTheDocument()
    })

    it('should have listitem role for each version', () => {
      render(<VersionHistoryPanel {...defaultProps} />)
      const listItems = screen.getAllByRole('listitem')
      expect(listItems.length).toBe(3)
    })

    it('should have time element with datetime attribute', () => {
      render(<VersionHistoryPanel {...defaultProps} />)
      const timeElements = screen.getAllByRole('listitem').flatMap((item) =>
        Array.from(item.querySelectorAll('time'))
      )
      timeElements.forEach((time) => {
        expect(time).toHaveAttribute('dateTime')
      })
    })

    it('should have keyboard navigation hint', () => {
      render(<VersionHistoryPanel {...defaultProps} />)
      expect(screen.getByText('Use Tab and Enter to navigate')).toBeInTheDocument()
    })
  })

  describe('custom props', () => {
    it('should apply custom className', () => {
      render(<VersionHistoryPanel {...defaultProps} className="custom-class" />)
      expect(screen.getByTestId('version-history-panel')).toHaveClass('custom-class')
    })

    it('should use custom data-testid', () => {
      render(<VersionHistoryPanel {...defaultProps} data-testid="custom-panel" />)
      expect(screen.getByTestId('custom-panel')).toBeInTheDocument()
    })
  })

  describe('version types', () => {
    it('should display all version types correctly', () => {
      const allTypeVersions: SessionVersion[] = [
        createMockVersion({ id: 'v1', versionType: 'initial_draft', createdAt: '2024-01-01T01:00:00Z' }),
        createMockVersion({ id: 'v2', versionType: 'child_contribution', createdAt: '2024-01-01T02:00:00Z' }),
        createMockVersion({ id: 'v3', versionType: 'negotiation_resolved', createdAt: '2024-01-01T03:00:00Z' }),
        createMockVersion({ id: 'v4', versionType: 'manual_save', createdAt: '2024-01-01T04:00:00Z' }),
        createMockVersion({ id: 'v5', versionType: 'restored_from_version', createdAt: '2024-01-01T05:00:00Z' }),
      ]

      render(<VersionHistoryPanel {...defaultProps} versions={allTypeVersions} />)

      expect(screen.getByText('Initial Draft')).toBeInTheDocument()
      expect(screen.getByText('Child Added Content')).toBeInTheDocument()
      expect(screen.getByText('Agreement Reached')).toBeInTheDocument()
      expect(screen.getByText('Saved')).toBeInTheDocument()
      expect(screen.getByText('Restored Version')).toBeInTheDocument()
    })
  })

  describe('custom labels', () => {
    it('should display custom label when provided', () => {
      const versionWithLabel = createMockVersion({
        id: 'custom-version',
        label: 'My Custom Save Point',
        createdAt: '2024-01-02T00:00:00Z',
      })

      render(<VersionHistoryPanel {...defaultProps} versions={[versionWithLabel]} />)

      expect(screen.getByText('My Custom Save Point')).toBeInTheDocument()
    })
  })
})
