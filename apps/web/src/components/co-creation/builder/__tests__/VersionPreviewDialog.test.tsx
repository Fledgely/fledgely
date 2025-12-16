/**
 * Tests for VersionPreviewDialog Component
 *
 * Story 5.7: Draft Saving & Version History - Task 5
 *
 * Tests for version preview modal with restore functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { SessionVersion } from '@fledgely/contracts'
import { VersionPreviewDialog } from '../VersionPreviewDialog'

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
        content: { weekdayMinutes: 60, weekendMinutes: 120 },
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
    ],
    agreementMode: 'full',
  },
  createdAt: '2024-01-01T12:00:00Z',
  ...overrides,
})

describe('VersionPreviewDialog', () => {
  const defaultProps = {
    version: createMockVersion(),
    isOpen: true,
    onClose: vi.fn(),
    onRestore: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Reset body overflow
    document.body.style.overflow = ''
  })

  describe('rendering', () => {
    it('should render the dialog when open', () => {
      render(<VersionPreviewDialog {...defaultProps} />)
      expect(screen.getByTestId('version-preview-dialog')).toBeInTheDocument()
    })

    it('should not render when closed', () => {
      render(<VersionPreviewDialog {...defaultProps} isOpen={false} />)
      expect(screen.queryByTestId('version-preview-dialog')).not.toBeInTheDocument()
    })

    it('should not render when version is null', () => {
      render(<VersionPreviewDialog {...defaultProps} version={null} />)
      expect(screen.queryByTestId('version-preview-dialog')).not.toBeInTheDocument()
    })

    it('should render dialog with role="dialog"', () => {
      render(<VersionPreviewDialog {...defaultProps} />)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should have aria-modal="true"', () => {
      render(<VersionPreviewDialog {...defaultProps} />)
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    })
  })

  describe('header content', () => {
    it('should display version type label', () => {
      render(<VersionPreviewDialog {...defaultProps} />)
      expect(screen.getByText('Initial Draft')).toBeInTheDocument()
    })

    it('should display custom label when provided', () => {
      const version = createMockVersion({ label: 'My Custom Version' })
      render(<VersionPreviewDialog {...defaultProps} version={version} />)
      expect(screen.getByText('My Custom Version')).toBeInTheDocument()
    })

    it('should display formatted date', () => {
      render(<VersionPreviewDialog {...defaultProps} />)
      // Check for parts of the formatted date
      expect(screen.getByText(/January 1, 2024/)).toBeInTheDocument()
    })

    it('should render close button', () => {
      render(<VersionPreviewDialog {...defaultProps} />)
      expect(screen.getByTestId('version-preview-dialog-close')).toBeInTheDocument()
    })
  })

  describe('version info', () => {
    it('should display creator', () => {
      render(<VersionPreviewDialog {...defaultProps} />)
      expect(screen.getByText('Created by')).toBeInTheDocument()
      // Parent appears in both creator section and term cards, so use getAllByText
      expect(screen.getAllByText('Parent').length).toBeGreaterThan(0)
    })

    it('should display child as creator when applicable', () => {
      const version = createMockVersion({ createdBy: 'child' })
      render(<VersionPreviewDialog {...defaultProps} version={version} />)
      // Child appears in both creator section and term cards, so use getAllByText
      expect(screen.getAllByText('Child').length).toBeGreaterThan(0)
    })

    it('should display term count', () => {
      render(<VersionPreviewDialog {...defaultProps} />)
      expect(screen.getByText('Terms')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('should display agreement mode', () => {
      render(<VersionPreviewDialog {...defaultProps} />)
      expect(screen.getByText('Mode')).toBeInTheDocument()
      expect(screen.getByText('Full Agreement')).toBeInTheDocument()
    })

    it('should display Agreement Only mode when applicable', () => {
      const version = createMockVersion({
        snapshot: {
          ...createMockVersion().snapshot,
          agreementMode: 'agreement_only',
        },
      })
      render(<VersionPreviewDialog {...defaultProps} version={version} />)
      expect(screen.getByText('Agreement Only')).toBeInTheDocument()
    })
  })

  describe('terms display', () => {
    it('should display terms list', () => {
      render(<VersionPreviewDialog {...defaultProps} />)
      expect(screen.getByText('Agreement Terms')).toBeInTheDocument()
    })

    it('should display term type labels', () => {
      render(<VersionPreviewDialog {...defaultProps} />)
      expect(screen.getByText('Screen Time')).toBeInTheDocument()
      expect(screen.getByText('Bedtime')).toBeInTheDocument()
    })

    it('should display term content preview', () => {
      render(<VersionPreviewDialog {...defaultProps} />)
      expect(screen.getByText(/60 min on weekdays/)).toBeInTheDocument()
      expect(screen.getByText(/21:00/)).toBeInTheDocument()
    })

    it('should show empty message when no terms', () => {
      const version = createMockVersion({
        snapshot: {
          terms: [],
          contributions: [],
          agreementMode: 'full',
        },
      })
      render(<VersionPreviewDialog {...defaultProps} version={version} />)
      expect(screen.getByText('No terms in this version')).toBeInTheDocument()
    })

    it('should have list role for terms', () => {
      render(<VersionPreviewDialog {...defaultProps} />)
      expect(screen.getByRole('list', { name: 'Version terms' })).toBeInTheDocument()
    })
  })

  describe('close functionality', () => {
    it('should call onClose when close button is clicked', async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      render(<VersionPreviewDialog {...defaultProps} onClose={onClose} />)

      await user.click(screen.getByTestId('version-preview-dialog-close'))

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('should call onClose when backdrop is clicked', async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      render(<VersionPreviewDialog {...defaultProps} onClose={onClose} />)

      await user.click(screen.getByTestId('version-preview-dialog-backdrop'))

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('should call onClose when Cancel button is clicked', async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      render(<VersionPreviewDialog {...defaultProps} onClose={onClose} />)

      await user.click(screen.getByTestId('version-preview-dialog-cancel'))

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('should call onClose when ESC key is pressed', () => {
      const onClose = vi.fn()
      render(<VersionPreviewDialog {...defaultProps} onClose={onClose} />)

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('restore functionality', () => {
    it('should render restore button', () => {
      render(<VersionPreviewDialog {...defaultProps} />)
      expect(screen.getByTestId('version-preview-dialog-restore')).toBeInTheDocument()
    })

    it('should display "Restore This Version" text', () => {
      render(<VersionPreviewDialog {...defaultProps} />)
      expect(screen.getByText('Restore This Version')).toBeInTheDocument()
    })

    it('should call onRestore when restore button is clicked', async () => {
      const onRestore = vi.fn()
      const user = userEvent.setup()
      render(<VersionPreviewDialog {...defaultProps} onRestore={onRestore} />)

      await user.click(screen.getByTestId('version-preview-dialog-restore'))

      expect(onRestore).toHaveBeenCalledTimes(1)
      expect(onRestore).toHaveBeenCalledWith(defaultProps.version)
    })

    it('should show loading state when restoring', () => {
      render(<VersionPreviewDialog {...defaultProps} isRestoring />)
      expect(screen.getByText('Restoring...')).toBeInTheDocument()
    })

    it('should disable restore button when restoring', () => {
      render(<VersionPreviewDialog {...defaultProps} isRestoring />)
      expect(screen.getByTestId('version-preview-dialog-restore')).toBeDisabled()
    })

    it('should have accessible label on restore button', () => {
      render(<VersionPreviewDialog {...defaultProps} />)
      expect(screen.getByTestId('version-preview-dialog-restore')).toHaveAttribute(
        'aria-label',
        'Restore this version'
      )
    })

    it('should have loading aria-label when restoring', () => {
      render(<VersionPreviewDialog {...defaultProps} isRestoring />)
      expect(screen.getByTestId('version-preview-dialog-restore')).toHaveAttribute(
        'aria-label',
        'Restoring this version...'
      )
    })
  })

  describe('accessibility', () => {
    it('should have aria-labelledby pointing to title', () => {
      render(<VersionPreviewDialog {...defaultProps} />)
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'version-preview-title')
    })

    it('should have proper heading for title', () => {
      render(<VersionPreviewDialog {...defaultProps} />)
      const title = screen.getByRole('heading', { level: 2 })
      expect(title).toHaveAttribute('id', 'version-preview-title')
    })

    it('should focus close button on open', () => {
      render(<VersionPreviewDialog {...defaultProps} />)
      expect(document.activeElement).toBe(screen.getByTestId('version-preview-dialog-close'))
    })

    it('should have minimum touch target on close button (NFR49)', () => {
      render(<VersionPreviewDialog {...defaultProps} />)
      const closeButton = screen.getByTestId('version-preview-dialog-close')
      expect(closeButton).toHaveClass('min-w-[44px]', 'min-h-[44px]')
    })

    it('should have minimum touch target on restore button (NFR49)', () => {
      render(<VersionPreviewDialog {...defaultProps} />)
      const restoreButton = screen.getByTestId('version-preview-dialog-restore')
      expect(restoreButton).toHaveClass('min-h-[44px]')
    })

    it('should prevent body scroll when open', () => {
      render(<VersionPreviewDialog {...defaultProps} />)
      expect(document.body.style.overflow).toBe('hidden')
    })

    it('should restore body scroll when closed', () => {
      const { rerender } = render(<VersionPreviewDialog {...defaultProps} />)
      expect(document.body.style.overflow).toBe('hidden')

      rerender(<VersionPreviewDialog {...defaultProps} isOpen={false} />)
      expect(document.body.style.overflow).toBe('')
    })
  })

  describe('version types', () => {
    const versionTypes = [
      { type: 'initial_draft', label: 'Initial Draft' },
      { type: 'child_contribution', label: 'Child Added Content' },
      { type: 'negotiation_resolved', label: 'Agreement Reached' },
      { type: 'manual_save', label: 'Saved' },
      { type: 'restored_from_version', label: 'Restored Version' },
    ] as const

    versionTypes.forEach(({ type, label }) => {
      it(`should display correct label for ${type}`, () => {
        const version = createMockVersion({ versionType: type })
        render(<VersionPreviewDialog {...defaultProps} version={version} />)
        expect(screen.getByText(label)).toBeInTheDocument()
      })
    })
  })

  describe('custom props', () => {
    it('should use custom data-testid', () => {
      render(<VersionPreviewDialog {...defaultProps} data-testid="custom-dialog" />)
      expect(screen.getByTestId('custom-dialog')).toBeInTheDocument()
    })
  })
})
