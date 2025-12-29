/**
 * Tests for VersionHistoryPanel component.
 *
 * Story 5.7: Draft Saving & Version History - AC3, AC4
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { VersionHistoryPanel } from '../VersionHistoryPanel'
import type { AgreementVersion } from '@fledgely/shared/contracts'

const mockVersions: AgreementVersion[] = [
  {
    id: 'version-1',
    sessionId: 'session-123',
    type: 'initial_draft',
    description: 'Agreement started from template',
    termsSnapshot: [
      {
        id: 'term-1',
        text: 'No phones at dinner',
        category: 'screen_time',
        party: 'family',
        order: 0,
        explanation: 'Family time is important',
        createdAt: new Date('2024-01-15T10:00:00'),
        updatedAt: new Date('2024-01-15T10:00:00'),
      },
    ],
    createdAt: new Date('2024-01-15T10:00:00'),
    createdByUid: 'user-456',
  },
  {
    id: 'version-2',
    sessionId: 'session-123',
    type: 'child_additions',
    description: 'Child added their ideas',
    termsSnapshot: [
      {
        id: 'term-1',
        text: 'No phones at dinner',
        category: 'screen_time',
        party: 'family',
        order: 0,
        explanation: 'Family time is important',
        createdAt: new Date('2024-01-15T10:00:00'),
        updatedAt: new Date('2024-01-15T10:00:00'),
      },
      {
        id: 'term-2',
        text: 'Extra game time on weekends',
        category: 'screen_time',
        party: 'child',
        order: 1,
        explanation: 'I want to play more games',
        createdAt: new Date('2024-01-15T11:00:00'),
        updatedAt: new Date('2024-01-15T11:00:00'),
      },
    ],
    createdAt: new Date('2024-01-15T11:00:00'),
    createdByUid: 'child-789',
  },
  {
    id: 'version-3',
    sessionId: 'session-123',
    type: 'manual_save',
    description: 'Draft saved',
    termsSnapshot: [
      {
        id: 'term-1',
        text: 'No phones at dinner',
        category: 'screen_time',
        party: 'family',
        order: 0,
        explanation: 'Family time is important',
        createdAt: new Date('2024-01-15T10:00:00'),
        updatedAt: new Date('2024-01-15T10:00:00'),
      },
      {
        id: 'term-2',
        text: 'Extra game time on weekends',
        category: 'screen_time',
        party: 'child',
        order: 1,
        explanation: 'I want to play more games',
        createdAt: new Date('2024-01-15T11:00:00'),
        updatedAt: new Date('2024-01-15T11:00:00'),
      },
      {
        id: 'term-3',
        text: 'Finish homework first',
        category: 'education',
        party: 'parent',
        order: 2,
        explanation: 'Learning is important',
        createdAt: new Date('2024-01-15T12:00:00'),
        updatedAt: new Date('2024-01-15T12:00:00'),
      },
    ],
    createdAt: new Date('2024-01-15T12:00:00'),
    createdByUid: 'user-456',
  },
]

describe('VersionHistoryPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:30:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('empty state', () => {
    it('should display empty message when no versions', () => {
      render(
        <VersionHistoryPanel
          versions={[]}
          selectedVersionId={null}
          onSelectVersion={vi.fn()}
          onRestoreVersion={vi.fn()}
        />
      )

      expect(screen.getByTestId('version-history-empty')).toBeInTheDocument()
      expect(screen.getByText('No version history yet.')).toBeInTheDocument()
    })
  })

  describe('version display', () => {
    it('should display all versions', () => {
      render(
        <VersionHistoryPanel
          versions={mockVersions}
          selectedVersionId={null}
          onSelectVersion={vi.fn()}
          onRestoreVersion={vi.fn()}
        />
      )

      expect(screen.getByTestId('version-item-version-1')).toBeInTheDocument()
      expect(screen.getByTestId('version-item-version-2')).toBeInTheDocument()
      expect(screen.getByTestId('version-item-version-3')).toBeInTheDocument()
    })

    it('should sort versions newest first', () => {
      render(
        <VersionHistoryPanel
          versions={mockVersions}
          selectedVersionId={null}
          onSelectVersion={vi.fn()}
          onRestoreVersion={vi.fn()}
        />
      )

      const items = screen.getAllByTestId(/version-item-/)
      expect(items[0]).toHaveAttribute('data-testid', 'version-item-version-3')
      expect(items[2]).toHaveAttribute('data-testid', 'version-item-version-1')
    })

    it('should display version type labels', () => {
      render(
        <VersionHistoryPanel
          versions={mockVersions}
          selectedVersionId={null}
          onSelectVersion={vi.fn()}
          onRestoreVersion={vi.fn()}
        />
      )

      expect(screen.getByText('Initial Draft')).toBeInTheDocument()
      expect(screen.getByText('Child Additions')).toBeInTheDocument()
      expect(screen.getByText('Manual Save')).toBeInTheDocument()
    })

    it('should display version descriptions', () => {
      render(
        <VersionHistoryPanel
          versions={mockVersions}
          selectedVersionId={null}
          onSelectVersion={vi.fn()}
          onRestoreVersion={vi.fn()}
        />
      )

      expect(screen.getByText('Agreement started from template')).toBeInTheDocument()
      expect(screen.getByText('Child added their ideas')).toBeInTheDocument()
    })

    it('should display terms count', () => {
      render(
        <VersionHistoryPanel
          versions={mockVersions}
          selectedVersionId={null}
          onSelectVersion={vi.fn()}
          onRestoreVersion={vi.fn()}
        />
      )

      expect(screen.getByText('1 term')).toBeInTheDocument()
      expect(screen.getByText('2 terms')).toBeInTheDocument()
      expect(screen.getByText('3 terms')).toBeInTheDocument()
    })

    it('should mark latest version as current', () => {
      render(
        <VersionHistoryPanel
          versions={mockVersions}
          selectedVersionId={null}
          onSelectVersion={vi.fn()}
          onRestoreVersion={vi.fn()}
        />
      )

      expect(screen.getByText('Current')).toBeInTheDocument()
    })
  })

  describe('preview functionality', () => {
    it('should call onSelectVersion when preview is clicked', () => {
      const onSelectVersion = vi.fn()

      render(
        <VersionHistoryPanel
          versions={mockVersions}
          selectedVersionId={null}
          onSelectVersion={onSelectVersion}
          onRestoreVersion={vi.fn()}
        />
      )

      fireEvent.click(screen.getByTestId('preview-version-version-1'))

      expect(onSelectVersion).toHaveBeenCalledWith('version-1')
    })

    it('should show previewing state for selected version', () => {
      render(
        <VersionHistoryPanel
          versions={mockVersions}
          selectedVersionId="version-2"
          onSelectVersion={vi.fn()}
          onRestoreVersion={vi.fn()}
        />
      )

      expect(screen.getByTestId('preview-version-version-2')).toHaveTextContent('Previewing')
    })

    it('should have aria-pressed for preview button', () => {
      render(
        <VersionHistoryPanel
          versions={mockVersions}
          selectedVersionId="version-1"
          onSelectVersion={vi.fn()}
          onRestoreVersion={vi.fn()}
        />
      )

      expect(screen.getByTestId('preview-version-version-1')).toHaveAttribute(
        'aria-pressed',
        'true'
      )
      expect(screen.getByTestId('preview-version-version-2')).toHaveAttribute(
        'aria-pressed',
        'false'
      )
    })
  })

  describe('restore functionality', () => {
    it('should show restore button for non-latest versions', () => {
      render(
        <VersionHistoryPanel
          versions={mockVersions}
          selectedVersionId={null}
          onSelectVersion={vi.fn()}
          onRestoreVersion={vi.fn()}
        />
      )

      expect(screen.getByTestId('restore-version-version-1')).toBeInTheDocument()
      expect(screen.getByTestId('restore-version-version-2')).toBeInTheDocument()
      expect(screen.queryByTestId('restore-version-version-3')).not.toBeInTheDocument()
    })

    it('should call onRestoreVersion when restore is clicked', () => {
      const onRestoreVersion = vi.fn()

      render(
        <VersionHistoryPanel
          versions={mockVersions}
          selectedVersionId={null}
          onSelectVersion={vi.fn()}
          onRestoreVersion={onRestoreVersion}
        />
      )

      fireEvent.click(screen.getByTestId('restore-version-version-1'))

      expect(onRestoreVersion).toHaveBeenCalledWith('version-1')
    })

    it('should disable restore buttons while restoring', () => {
      render(
        <VersionHistoryPanel
          versions={mockVersions}
          selectedVersionId={null}
          onSelectVersion={vi.fn()}
          onRestoreVersion={vi.fn()}
          isRestoring={true}
        />
      )

      expect(screen.getByTestId('restore-version-version-1')).toBeDisabled()
      expect(screen.getByTestId('restore-version-version-2')).toBeDisabled()
    })

    it('should show restoring text while restoring', () => {
      render(
        <VersionHistoryPanel
          versions={mockVersions}
          selectedVersionId={null}
          onSelectVersion={vi.fn()}
          onRestoreVersion={vi.fn()}
          isRestoring={true}
        />
      )

      const restoreButtons = screen.getAllByText('Restoring...')
      expect(restoreButtons.length).toBeGreaterThan(0)
    })
  })

  describe('accessibility', () => {
    it('should have region role with label', () => {
      render(
        <VersionHistoryPanel
          versions={mockVersions}
          selectedVersionId={null}
          onSelectVersion={vi.fn()}
          onRestoreVersion={vi.fn()}
        />
      )

      expect(screen.getByRole('region', { name: 'Version history' })).toBeInTheDocument()
    })

    it('should have heading', () => {
      render(
        <VersionHistoryPanel
          versions={mockVersions}
          selectedVersionId={null}
          onSelectVersion={vi.fn()}
          onRestoreVersion={vi.fn()}
        />
      )

      expect(screen.getByRole('heading', { name: 'Version History' })).toBeInTheDocument()
    })

    it('should have test ID', () => {
      render(
        <VersionHistoryPanel
          versions={mockVersions}
          selectedVersionId={null}
          onSelectVersion={vi.fn()}
          onRestoreVersion={vi.fn()}
        />
      )

      expect(screen.getByTestId('version-history-panel')).toBeInTheDocument()
    })

    it('should meet minimum touch target size for buttons', () => {
      render(
        <VersionHistoryPanel
          versions={mockVersions}
          selectedVersionId={null}
          onSelectVersion={vi.fn()}
          onRestoreVersion={vi.fn()}
        />
      )

      const previewButton = screen.getByTestId('preview-version-version-1')
      expect(previewButton).toHaveClass('min-h-[32px]')
    })
  })

  describe('styling', () => {
    it('should apply custom className', () => {
      render(
        <VersionHistoryPanel
          versions={mockVersions}
          selectedVersionId={null}
          onSelectVersion={vi.fn()}
          onRestoreVersion={vi.fn()}
          className="custom-class"
        />
      )

      expect(screen.getByTestId('version-history-panel')).toHaveClass('custom-class')
    })
  })

  describe('version type icons', () => {
    it('should display correct icons for each version type', () => {
      render(
        <VersionHistoryPanel
          versions={mockVersions}
          selectedVersionId={null}
          onSelectVersion={vi.fn()}
          onRestoreVersion={vi.fn()}
        />
      )

      expect(screen.getByText('📄')).toBeInTheDocument() // initial_draft
      expect(screen.getByText('👧')).toBeInTheDocument() // child_additions
      expect(screen.getByText('💾')).toBeInTheDocument() // manual_save
    })
  })
})
