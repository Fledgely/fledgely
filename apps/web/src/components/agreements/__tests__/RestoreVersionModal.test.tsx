/**
 * Tests for RestoreVersionModal component.
 *
 * Story 5.7: Draft Saving & Version History - AC4
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { RestoreVersionModal } from '../RestoreVersionModal'
import type { AgreementVersion, AgreementTerm } from '@fledgely/shared/contracts'

const createTerm = (overrides: Partial<AgreementTerm> = {}): AgreementTerm => ({
  id: 'term-1',
  text: 'Test term',
  category: 'screen_time',
  party: 'family',
  order: 0,
  explanation: 'Test explanation',
  createdAt: new Date('2024-01-15T10:00:00'),
  updatedAt: new Date('2024-01-15T10:00:00'),
  ...overrides,
})

const createVersion = (overrides: Partial<AgreementVersion> = {}): AgreementVersion => ({
  id: 'version-1',
  sessionId: 'session-123',
  type: 'manual_save',
  description: 'Draft saved',
  termsSnapshot: [createTerm()],
  createdAt: new Date('2024-01-15T10:00:00'),
  createdByUid: 'user-456',
  ...overrides,
})

describe('RestoreVersionModal', () => {
  const defaultProps = {
    version: createVersion(),
    currentTerms: [createTerm()],
    isRestoring: false,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  }

  describe('rendering', () => {
    it('should render modal with correct structure', () => {
      render(<RestoreVersionModal {...defaultProps} />)

      expect(screen.getByTestId('restore-version-modal')).toBeInTheDocument()
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should display modal title', () => {
      render(<RestoreVersionModal {...defaultProps} />)

      expect(screen.getByRole('heading', { name: 'Restore Previous Version?' })).toBeInTheDocument()
    })

    it('should display version information', () => {
      render(<RestoreVersionModal {...defaultProps} />)

      expect(screen.getByText('Manual Save')).toBeInTheDocument()
      expect(screen.getByText('Draft saved')).toBeInTheDocument()
    })

    it('should display terms count', () => {
      render(<RestoreVersionModal {...defaultProps} />)

      expect(screen.getByText(/1 term/)).toBeInTheDocument()
    })

    it('should show singular term for single term', () => {
      render(<RestoreVersionModal {...defaultProps} />)

      expect(screen.getByText(/1 term$/)).toBeInTheDocument()
    })

    it('should show plural terms for multiple terms', () => {
      const version = createVersion({
        termsSnapshot: [createTerm({ id: 'term-1' }), createTerm({ id: 'term-2' })],
      })

      render(<RestoreVersionModal {...defaultProps} version={version} />)

      expect(screen.getByText(/2 terms/)).toBeInTheDocument()
    })
  })

  describe('diff display', () => {
    it('should show terms that will be added back', () => {
      const version = createVersion({
        termsSnapshot: [
          createTerm({ id: 'term-1' }),
          createTerm({ id: 'term-2', text: 'New term' }),
        ],
      })
      const currentTerms = [createTerm({ id: 'term-1' })]

      render(
        <RestoreVersionModal {...defaultProps} version={version} currentTerms={currentTerms} />
      )

      expect(screen.getByText(/1 term will come back/)).toBeInTheDocument()
    })

    it('should show terms that will be removed', () => {
      const version = createVersion({
        termsSnapshot: [createTerm({ id: 'term-1' })],
      })
      const currentTerms = [
        createTerm({ id: 'term-1' }),
        createTerm({ id: 'term-2', text: 'Extra term' }),
      ]

      render(
        <RestoreVersionModal {...defaultProps} version={version} currentTerms={currentTerms} />
      )

      expect(screen.getByText(/1 term will be removed/)).toBeInTheDocument()
    })

    it('should show terms that will change', () => {
      const version = createVersion({
        termsSnapshot: [createTerm({ id: 'term-1', text: 'Old text' })],
      })
      const currentTerms = [createTerm({ id: 'term-1', text: 'New text' })]

      render(
        <RestoreVersionModal {...defaultProps} version={version} currentTerms={currentTerms} />
      )

      expect(screen.getByText(/1 term will change/)).toBeInTheDocument()
    })

    it('should show no changes message when versions are same', () => {
      const term = createTerm()
      const version = createVersion({ termsSnapshot: [term] })
      const currentTerms = [term]

      render(
        <RestoreVersionModal {...defaultProps} version={version} currentTerms={currentTerms} />
      )

      expect(
        screen.getByText('The selected version is the same as your current agreement.')
      ).toBeInTheDocument()
    })

    it('should use plural for multiple changes', () => {
      const version = createVersion({
        termsSnapshot: [
          createTerm({ id: 'term-1' }),
          createTerm({ id: 'term-2' }),
          createTerm({ id: 'term-3' }),
        ],
      })
      const currentTerms: AgreementTerm[] = []

      render(
        <RestoreVersionModal {...defaultProps} version={version} currentTerms={currentTerms} />
      )

      expect(screen.getByText(/3 terms will come back/)).toBeInTheDocument()
    })
  })

  describe('version types', () => {
    it('should format initial_draft correctly', () => {
      const version = createVersion({ type: 'initial_draft' })

      render(<RestoreVersionModal {...defaultProps} version={version} />)

      expect(screen.getByText('Initial Draft')).toBeInTheDocument()
    })

    it('should format child_additions correctly', () => {
      const version = createVersion({ type: 'child_additions' })

      render(<RestoreVersionModal {...defaultProps} version={version} />)

      expect(screen.getByText('Child Additions')).toBeInTheDocument()
    })

    it('should format negotiation_complete correctly', () => {
      const version = createVersion({ type: 'negotiation_complete' })

      render(<RestoreVersionModal {...defaultProps} version={version} />)

      expect(screen.getByText('Negotiation Complete')).toBeInTheDocument()
    })

    it('should format auto_save correctly', () => {
      const version = createVersion({ type: 'auto_save' })

      render(<RestoreVersionModal {...defaultProps} version={version} />)

      expect(screen.getByText('Auto Save')).toBeInTheDocument()
    })
  })

  describe('actions', () => {
    it('should call onConfirm when confirm button is clicked', () => {
      const onConfirm = vi.fn()

      render(<RestoreVersionModal {...defaultProps} onConfirm={onConfirm} />)

      fireEvent.click(screen.getByTestId('restore-confirm-button'))

      expect(onConfirm).toHaveBeenCalledTimes(1)
    })

    it('should call onCancel when cancel button is clicked', () => {
      const onCancel = vi.fn()

      render(<RestoreVersionModal {...defaultProps} onCancel={onCancel} />)

      fireEvent.click(screen.getByTestId('restore-cancel-button'))

      expect(onCancel).toHaveBeenCalledTimes(1)
    })
  })

  describe('restoring state', () => {
    it('should disable buttons while restoring', () => {
      render(<RestoreVersionModal {...defaultProps} isRestoring={true} />)

      expect(screen.getByTestId('restore-confirm-button')).toBeDisabled()
      expect(screen.getByTestId('restore-cancel-button')).toBeDisabled()
    })

    it('should show restoring text while restoring', () => {
      render(<RestoreVersionModal {...defaultProps} isRestoring={true} />)

      expect(screen.getByText('Restoring...')).toBeInTheDocument()
    })

    it('should show spinner while restoring', () => {
      render(<RestoreVersionModal {...defaultProps} isRestoring={true} />)

      expect(screen.getByText('↻')).toBeInTheDocument()
    })
  })

  describe('warning message', () => {
    it('should display warning about auto-save', () => {
      render(<RestoreVersionModal {...defaultProps} />)

      expect(
        screen.getByText(/Your current version will be saved automatically before restoring/)
      ).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have dialog role', () => {
      render(<RestoreVersionModal {...defaultProps} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should have aria-modal attribute', () => {
      render(<RestoreVersionModal {...defaultProps} />)

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    })

    it('should have aria-labelledby pointing to title', () => {
      render(<RestoreVersionModal {...defaultProps} />)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-labelledby', 'restore-modal-title')
    })

    it('should have buttons with minimum touch target size', () => {
      render(<RestoreVersionModal {...defaultProps} />)

      expect(screen.getByTestId('restore-confirm-button')).toHaveClass('min-h-[44px]')
      expect(screen.getByTestId('restore-cancel-button')).toHaveClass('min-h-[44px]')
    })
  })
})
