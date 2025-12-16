/**
 * Integration Tests for VisualAgreementBuilder Save & Version Features
 *
 * Story 5.7: Draft Saving & Version History - Task 6.7
 *
 * Tests integration of:
 * - useAutoSave hook
 * - SaveButton component
 * - VersionHistoryPanel
 * - VersionPreviewDialog
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { CoCreationSession, SessionVersion, SessionTerm } from '@fledgely/contracts'
import { VisualAgreementBuilder } from '../VisualAgreementBuilder'

// ============================================
// TEST DATA FACTORIES
// ============================================

const createMockTerm = (overrides?: Partial<SessionTerm>): SessionTerm => ({
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
  ...overrides,
})

const createMockSession = (overrides?: Partial<CoCreationSession>): CoCreationSession => ({
  id: '550e8400-e29b-41d4-a716-446655440000',
  familyId: 'family-123',
  childId: 'child-123',
  initiatedBy: 'parent-456',
  status: 'active',
  agreementMode: 'full',
  sourceDraft: { type: 'wizard', templateId: 'template-001' },
  terms: [createMockTerm()],
  contributions: [
    {
      id: '550e8400-e29b-41d4-a716-446655440020',
      contributor: 'parent',
      action: 'added_term',
      termId: '550e8400-e29b-41d4-a716-446655440010',
      createdAt: '2024-01-01T00:00:00Z',
    },
  ],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  lastActivityAt: '2024-01-01T00:00:00Z',
  ...overrides,
})

const createMockVersion = (overrides?: Partial<SessionVersion>): SessionVersion => ({
  id: '550e8400-e29b-41d4-a716-446655440001',
  sessionId: '550e8400-e29b-41d4-a716-446655440000',
  versionType: 'manual_save',
  createdBy: 'parent',
  snapshot: {
    terms: [createMockTerm()],
    contributions: [],
    agreementMode: 'full',
  },
  createdAt: '2024-01-01T10:00:00Z',
  ...overrides,
})

// ============================================
// TEST SETUP
// ============================================

describe('VisualAgreementBuilder Save & Version Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ============================================
  // SAVE BUTTON INTEGRATION (Task 6.2)
  // ============================================

  describe('SaveButton Integration', () => {
    it('should render SaveButton when session and performSave are provided', () => {
      const session = createMockSession()
      const performSave = vi.fn().mockResolvedValue({ success: true })

      render(
        <VisualAgreementBuilder
          terms={session.terms}
          currentContributor="parent"
          session={session}
          performSave={performSave}
        />
      )

      expect(screen.getByTestId('builder-save-button')).toBeInTheDocument()
    })

    it('should NOT render SaveButton when session is not provided', () => {
      render(
        <VisualAgreementBuilder
          terms={[createMockTerm()]}
          currentContributor="parent"
        />
      )

      expect(screen.queryByTestId('builder-save-button')).not.toBeInTheDocument()
    })

    it('should NOT render SaveButton when performSave is not provided', () => {
      const session = createMockSession()

      render(
        <VisualAgreementBuilder
          terms={session.terms}
          currentContributor="parent"
          session={session}
        />
      )

      expect(screen.queryByTestId('builder-save-button')).not.toBeInTheDocument()
    })

    it('should call performSave when save button is clicked', async () => {
      vi.useRealTimers()
      const session = createMockSession()
      const performSave = vi.fn().mockResolvedValue({ success: true })

      render(
        <VisualAgreementBuilder
          terms={session.terms}
          currentContributor="parent"
          session={session}
          performSave={performSave}
        />
      )

      const saveButton = screen.getByTestId('builder-save-button-trigger')
      await act(async () => {
        fireEvent.click(saveButton)
      })

      await waitFor(() => {
        expect(performSave).toHaveBeenCalled()
      })
    })

    it('should disable SaveButton when isReadOnly', () => {
      const session = createMockSession()
      const performSave = vi.fn().mockResolvedValue({ success: true })

      render(
        <VisualAgreementBuilder
          terms={session.terms}
          currentContributor="parent"
          session={session}
          performSave={performSave}
          isReadOnly
        />
      )

      const saveButton = screen.getByTestId('builder-save-button-trigger')
      expect(saveButton).toBeDisabled()
    })

    it('should call onSaveSuccess callback on successful save', async () => {
      vi.useRealTimers()
      const session = createMockSession()
      const performSave = vi.fn().mockResolvedValue({ success: true })
      const onSaveSuccess = vi.fn()

      render(
        <VisualAgreementBuilder
          terms={session.terms}
          currentContributor="parent"
          session={session}
          performSave={performSave}
          onSaveSuccess={onSaveSuccess}
        />
      )

      const saveButton = screen.getByTestId('builder-save-button-trigger')
      await act(async () => {
        fireEvent.click(saveButton)
      })

      await waitFor(() => {
        expect(onSaveSuccess).toHaveBeenCalled()
      })
    })

    it('should call onSaveError callback on failed save', async () => {
      vi.useRealTimers()
      const session = createMockSession()
      const performSave = vi.fn().mockResolvedValue({ success: false, error: 'Network error' })
      const onSaveError = vi.fn()

      render(
        <VisualAgreementBuilder
          terms={session.terms}
          currentContributor="parent"
          session={session}
          performSave={performSave}
          onSaveError={onSaveError}
        />
      )

      const saveButton = screen.getByTestId('builder-save-button-trigger')
      await act(async () => {
        fireEvent.click(saveButton)
      })

      await waitFor(() => {
        expect(onSaveError).toHaveBeenCalled()
      })
    })
  })

  // ============================================
  // VERSION HISTORY TOGGLE (Task 6.3)
  // ============================================

  describe('Version History Toggle', () => {
    it('should render version history toggle when versions are available', () => {
      const session = createMockSession()
      const versions = [createMockVersion()]
      const performSave = vi.fn().mockResolvedValue({ success: true })

      render(
        <VisualAgreementBuilder
          terms={session.terms}
          currentContributor="parent"
          session={session}
          performSave={performSave}
          versions={versions}
        />
      )

      expect(screen.getByTestId('version-history-toggle')).toBeInTheDocument()
    })

    it('should NOT render version history toggle when no versions', () => {
      const session = createMockSession()
      const performSave = vi.fn().mockResolvedValue({ success: true })

      render(
        <VisualAgreementBuilder
          terms={session.terms}
          currentContributor="parent"
          session={session}
          performSave={performSave}
          versions={[]}
        />
      )

      expect(screen.queryByTestId('version-history-toggle')).not.toBeInTheDocument()
    })

    it('should show version count badge', () => {
      const session = createMockSession()
      const versions = [
        createMockVersion({ id: 'v1' }),
        createMockVersion({ id: 'v2' }),
        createMockVersion({ id: 'v3' }),
      ]
      const performSave = vi.fn().mockResolvedValue({ success: true })

      render(
        <VisualAgreementBuilder
          terms={session.terms}
          currentContributor="parent"
          session={session}
          performSave={performSave}
          versions={versions}
        />
      )

      const toggle = screen.getByTestId('version-history-toggle')
      expect(toggle).toHaveTextContent('3')
    })

    it('should toggle version history panel visibility', async () => {
      vi.useRealTimers()
      const session = createMockSession()
      const versions = [createMockVersion()]
      const performSave = vi.fn().mockResolvedValue({ success: true })

      render(
        <VisualAgreementBuilder
          terms={session.terms}
          currentContributor="parent"
          session={session}
          performSave={performSave}
          versions={versions}
        />
      )

      // Panel should not be visible initially
      expect(screen.queryByTestId('builder-version-history')).not.toBeInTheDocument()

      // Click toggle to show panel
      const toggle = screen.getByTestId('version-history-toggle')
      await act(async () => {
        fireEvent.click(toggle)
      })

      expect(screen.getByTestId('builder-version-history')).toBeInTheDocument()

      // Click toggle again to hide panel
      await act(async () => {
        fireEvent.click(toggle)
      })

      expect(screen.queryByTestId('builder-version-history')).not.toBeInTheDocument()
    })

    it('should have correct aria-expanded attribute', async () => {
      vi.useRealTimers()
      const session = createMockSession()
      const versions = [createMockVersion()]
      const performSave = vi.fn().mockResolvedValue({ success: true })

      render(
        <VisualAgreementBuilder
          terms={session.terms}
          currentContributor="parent"
          session={session}
          performSave={performSave}
          versions={versions}
        />
      )

      const toggle = screen.getByTestId('version-history-toggle')
      expect(toggle).toHaveAttribute('aria-expanded', 'false')

      await act(async () => {
        fireEvent.click(toggle)
      })

      expect(toggle).toHaveAttribute('aria-expanded', 'true')
    })
  })

  // ============================================
  // VERSION HISTORY PANEL (Task 6.4)
  // ============================================

  describe('Version History Panel', () => {
    it('should display versions in the panel', async () => {
      vi.useRealTimers()
      const session = createMockSession()
      const versions = [
        createMockVersion({ id: 'v1', versionType: 'initial_draft' }),
        createMockVersion({ id: 'v2', versionType: 'manual_save' }),
      ]
      const performSave = vi.fn().mockResolvedValue({ success: true })

      render(
        <VisualAgreementBuilder
          terms={session.terms}
          currentContributor="parent"
          session={session}
          performSave={performSave}
          versions={versions}
        />
      )

      // Open the panel
      const toggle = screen.getByTestId('version-history-toggle')
      await act(async () => {
        fireEvent.click(toggle)
      })

      expect(screen.getByTestId('version-item-v1')).toBeInTheDocument()
      expect(screen.getByTestId('version-item-v2')).toBeInTheDocument()
    })

    it('should open version preview when preview button clicked', async () => {
      vi.useRealTimers()
      const session = createMockSession()
      const versions = [createMockVersion({ id: 'v1' })]
      const performSave = vi.fn().mockResolvedValue({ success: true })

      render(
        <VisualAgreementBuilder
          terms={session.terms}
          currentContributor="parent"
          session={session}
          performSave={performSave}
          versions={versions}
        />
      )

      // Open the panel
      const toggle = screen.getByTestId('version-history-toggle')
      await act(async () => {
        fireEvent.click(toggle)
      })

      // Click preview button
      const previewButton = screen.getByTestId('preview-version-v1')
      await act(async () => {
        fireEvent.click(previewButton)
      })

      // Check that preview dialog opens
      expect(screen.getByTestId('builder-version-preview')).toBeInTheDocument()
    })
  })

  // ============================================
  // VERSION RESTORE (Task 6.5)
  // ============================================

  describe('Version Restore', () => {
    it('should call onRestoreVersion when restore is confirmed', async () => {
      vi.useRealTimers()
      const session = createMockSession()
      const versions = [
        createMockVersion({ id: 'v1', versionType: 'initial_draft' }),
        createMockVersion({ id: 'v2', versionType: 'manual_save', createdAt: '2024-01-02T10:00:00Z' }),
      ]
      const performSave = vi.fn().mockResolvedValue({ success: true })
      const onRestoreVersion = vi.fn().mockResolvedValue(undefined)

      render(
        <VisualAgreementBuilder
          terms={session.terms}
          currentContributor="parent"
          session={session}
          performSave={performSave}
          versions={versions}
          onRestoreVersion={onRestoreVersion}
        />
      )

      // Open the panel
      const toggle = screen.getByTestId('version-history-toggle')
      await act(async () => {
        fireEvent.click(toggle)
      })

      // Click restore button on the older version (v1, not the latest v2)
      const restoreButton = screen.getByTestId('restore-version-v1')
      await act(async () => {
        fireEvent.click(restoreButton)
      })

      await waitFor(() => {
        expect(onRestoreVersion).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'v1' })
        )
      })
    })
  })

  // ============================================
  // ENABLE SAVE FEATURES FLAG
  // ============================================

  describe('enableSaveFeatures flag', () => {
    it('should hide save features when enableSaveFeatures is false', () => {
      const session = createMockSession()
      const versions = [createMockVersion()]
      const performSave = vi.fn().mockResolvedValue({ success: true })

      render(
        <VisualAgreementBuilder
          terms={session.terms}
          currentContributor="parent"
          session={session}
          performSave={performSave}
          versions={versions}
          enableSaveFeatures={false}
        />
      )

      expect(screen.queryByTestId('builder-save-button')).not.toBeInTheDocument()
      expect(screen.queryByTestId('version-history-toggle')).not.toBeInTheDocument()
    })

    it('should show save features when enableSaveFeatures is true', () => {
      const session = createMockSession()
      const versions = [createMockVersion()]
      const performSave = vi.fn().mockResolvedValue({ success: true })

      render(
        <VisualAgreementBuilder
          terms={session.terms}
          currentContributor="parent"
          session={session}
          performSave={performSave}
          versions={versions}
          enableSaveFeatures={true}
        />
      )

      expect(screen.getByTestId('builder-save-button')).toBeInTheDocument()
      expect(screen.getByTestId('version-history-toggle')).toBeInTheDocument()
    })
  })

  // ============================================
  // ACCESSIBILITY (Task 6.7, NFR42, NFR43)
  // ============================================

  describe('Accessibility', () => {
    it('should have accessible toggle button', () => {
      const session = createMockSession()
      const versions = [createMockVersion()]
      const performSave = vi.fn().mockResolvedValue({ success: true })

      render(
        <VisualAgreementBuilder
          terms={session.terms}
          currentContributor="parent"
          session={session}
          performSave={performSave}
          versions={versions}
        />
      )

      const toggle = screen.getByTestId('version-history-toggle')
      expect(toggle).toHaveAttribute('aria-label')
      expect(toggle).toHaveAttribute('aria-expanded')
      expect(toggle).toHaveAttribute('aria-controls', 'version-history-panel')
    })

    it('should meet touch target size requirements (NFR49)', () => {
      const session = createMockSession()
      const versions = [createMockVersion()]
      const performSave = vi.fn().mockResolvedValue({ success: true })

      render(
        <VisualAgreementBuilder
          terms={session.terms}
          currentContributor="parent"
          session={session}
          performSave={performSave}
          versions={versions}
        />
      )

      const toggle = screen.getByTestId('version-history-toggle')
      expect(toggle.className).toContain('min-h-[44px]')
      expect(toggle.className).toContain('min-w-[44px]')
    })
  })
})
