/**
 * Tests for useVersionRestore Hook
 *
 * Story 5.7: Draft Saving & Version History - Task 8
 *
 * Tests for version restoration functionality with undo capability.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { CoCreationSession, SessionVersion } from '@fledgely/contracts'
import { useVersionRestore, RESTORE_CONSTANTS } from '../useVersionRestore'

// ============================================
// TEST DATA
// ============================================

const createMockSession = (overrides?: Partial<CoCreationSession>): CoCreationSession => ({
  id: '550e8400-e29b-41d4-a716-446655440000',
  familyId: 'family-123',
  childId: 'child-123',
  initiatedBy: 'parent-456',
  status: 'active',
  agreementMode: 'full',
  sourceDraft: { type: 'wizard', templateId: 'template-001' },
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
    terms: [
      {
        id: '550e8400-e29b-41d4-a716-446655440030',
        type: 'bedtime',
        content: { time: '20:00' },
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
        id: '550e8400-e29b-41d4-a716-446655440040',
        contributor: 'parent',
        action: 'added_term',
        termId: '550e8400-e29b-41d4-a716-446655440030',
        createdAt: '2024-01-01T00:00:00Z',
      },
    ],
    agreementMode: 'full',
  },
  createdAt: '2024-01-01T10:00:00Z',
  ...overrides,
})

describe('useVersionRestore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('RESTORE_CONSTANTS', () => {
    it('should have correct undo window (30 seconds)', () => {
      expect(RESTORE_CONSTANTS.UNDO_WINDOW_MS).toBe(30000)
    })
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const session = createMockSession()
      const applyRestore = vi.fn().mockResolvedValue({ success: true })

      const { result } = renderHook(() =>
        useVersionRestore({
          session,
          applyRestore,
          contributor: 'parent',
        })
      )

      expect(result.current.status).toBe('idle')
      expect(result.current.canUndo).toBe(false)
      expect(result.current.undoTimeRemaining).toBe(0)
      expect(result.current.error).toBeNull()
      expect(result.current.restoringVersion).toBeNull()
    })
  })

  describe('restoreVersion', () => {
    it('should call applyRestore with restored session', async () => {
      vi.useRealTimers()
      const session = createMockSession()
      const version = createMockVersion()
      const applyRestore = vi.fn().mockResolvedValue({ success: true })

      const { result } = renderHook(() =>
        useVersionRestore({
          session,
          applyRestore,
          contributor: 'parent',
        })
      )

      await act(async () => {
        await result.current.restoreVersion(version)
      })

      expect(applyRestore).toHaveBeenCalledTimes(1)
      expect(applyRestore).toHaveBeenCalledWith(
        expect.objectContaining({
          id: session.id,
          terms: version.snapshot.terms,
          agreementMode: version.snapshot.agreementMode,
        })
      )
    })

    it('should set status to success on successful restore', async () => {
      vi.useRealTimers()
      const session = createMockSession()
      const version = createMockVersion()
      const applyRestore = vi.fn().mockResolvedValue({ success: true })

      const { result } = renderHook(() =>
        useVersionRestore({
          session,
          applyRestore,
          contributor: 'parent',
        })
      )

      await act(async () => {
        await result.current.restoreVersion(version)
      })

      expect(result.current.status).toBe('success')
    })

    it('should call onRestoreSuccess callback on success', async () => {
      vi.useRealTimers()
      const session = createMockSession()
      const version = createMockVersion()
      const applyRestore = vi.fn().mockResolvedValue({ success: true })
      const onRestoreSuccess = vi.fn()

      const { result } = renderHook(() =>
        useVersionRestore({
          session,
          applyRestore,
          contributor: 'parent',
          onRestoreSuccess,
        })
      )

      await act(async () => {
        await result.current.restoreVersion(version)
      })

      expect(onRestoreSuccess).toHaveBeenCalledWith(version)
    })

    it('should set status to error on failed restore', async () => {
      vi.useRealTimers()
      const session = createMockSession()
      const version = createMockVersion()
      const applyRestore = vi.fn().mockResolvedValue({
        success: false,
        error: 'Network error',
      })

      const { result } = renderHook(() =>
        useVersionRestore({
          session,
          applyRestore,
          contributor: 'parent',
        })
      )

      await act(async () => {
        await result.current.restoreVersion(version)
      })

      expect(result.current.status).toBe('error')
      expect(result.current.error).toBe('Network error')
    })

    it('should call onRestoreError callback on failure', async () => {
      vi.useRealTimers()
      const session = createMockSession()
      const version = createMockVersion()
      const applyRestore = vi.fn().mockResolvedValue({
        success: false,
        error: 'Network error',
      })
      const onRestoreError = vi.fn()

      const { result } = renderHook(() =>
        useVersionRestore({
          session,
          applyRestore,
          contributor: 'parent',
          onRestoreError,
        })
      )

      await act(async () => {
        await result.current.restoreVersion(version)
      })

      expect(onRestoreError).toHaveBeenCalledWith(expect.any(Error))
    })

    it('should handle exceptions during restore', async () => {
      vi.useRealTimers()
      const session = createMockSession()
      const version = createMockVersion()
      const applyRestore = vi.fn().mockRejectedValue(new Error('Unexpected error'))

      const { result } = renderHook(() =>
        useVersionRestore({
          session,
          applyRestore,
          contributor: 'parent',
        })
      )

      await act(async () => {
        await result.current.restoreVersion(version)
      })

      expect(result.current.status).toBe('error')
      expect(result.current.error).toBe('Unexpected error')
    })

    it('should not restore when session is null', async () => {
      vi.useRealTimers()
      const version = createMockVersion()
      const applyRestore = vi.fn().mockResolvedValue({ success: true })

      const { result } = renderHook(() =>
        useVersionRestore({
          session: null,
          applyRestore,
          contributor: 'parent',
        })
      )

      await act(async () => {
        await result.current.restoreVersion(version)
      })

      expect(applyRestore).not.toHaveBeenCalled()
    })
  })

  describe('undo functionality', () => {
    it('should enable canUndo after successful restore', async () => {
      vi.useRealTimers()
      const session = createMockSession()
      const version = createMockVersion()
      const applyRestore = vi.fn().mockResolvedValue({ success: true })

      const { result } = renderHook(() =>
        useVersionRestore({
          session,
          applyRestore,
          contributor: 'parent',
        })
      )

      await act(async () => {
        await result.current.restoreVersion(version)
      })

      expect(result.current.canUndo).toBe(true)
    })

    it('should set undoTimeRemaining after successful restore', async () => {
      vi.useRealTimers()
      const session = createMockSession()
      const version = createMockVersion()
      const applyRestore = vi.fn().mockResolvedValue({ success: true })

      const { result } = renderHook(() =>
        useVersionRestore({
          session,
          applyRestore,
          contributor: 'parent',
        })
      )

      await act(async () => {
        await result.current.restoreVersion(version)
      })

      expect(result.current.undoTimeRemaining).toBe(30)
    })

    it('should call applyRestore with previous session on undo', async () => {
      vi.useRealTimers()
      const session = createMockSession()
      const version = createMockVersion()
      const applyRestore = vi.fn().mockResolvedValue({ success: true })

      const { result } = renderHook(() =>
        useVersionRestore({
          session,
          applyRestore,
          contributor: 'parent',
        })
      )

      // First restore
      await act(async () => {
        await result.current.restoreVersion(version)
      })

      // Then undo
      await act(async () => {
        await result.current.undoRestore()
      })

      // Should be called twice: once for restore, once for undo
      expect(applyRestore).toHaveBeenCalledTimes(2)
      // The second call should be with the original session
      expect(applyRestore).toHaveBeenLastCalledWith(
        expect.objectContaining({
          terms: session.terms,
        })
      )
    })

    it('should call onUndo callback on successful undo', async () => {
      vi.useRealTimers()
      const session = createMockSession()
      const version = createMockVersion()
      const applyRestore = vi.fn().mockResolvedValue({ success: true })
      const onUndo = vi.fn()

      const { result } = renderHook(() =>
        useVersionRestore({
          session,
          applyRestore,
          contributor: 'parent',
          onUndo,
        })
      )

      await act(async () => {
        await result.current.restoreVersion(version)
      })

      await act(async () => {
        await result.current.undoRestore()
      })

      expect(onUndo).toHaveBeenCalled()
    })

    it('should disable canUndo after undo is performed', async () => {
      vi.useRealTimers()
      const session = createMockSession()
      const version = createMockVersion()
      const applyRestore = vi.fn().mockResolvedValue({ success: true })

      const { result } = renderHook(() =>
        useVersionRestore({
          session,
          applyRestore,
          contributor: 'parent',
        })
      )

      await act(async () => {
        await result.current.restoreVersion(version)
      })

      expect(result.current.canUndo).toBe(true)

      await act(async () => {
        await result.current.undoRestore()
      })

      expect(result.current.canUndo).toBe(false)
    })

    it('should not perform undo if canUndo is false', async () => {
      vi.useRealTimers()
      const session = createMockSession()
      const applyRestore = vi.fn().mockResolvedValue({ success: true })

      const { result } = renderHook(() =>
        useVersionRestore({
          session,
          applyRestore,
          contributor: 'parent',
        })
      )

      // Try to undo without having restored first
      await act(async () => {
        await result.current.undoRestore()
      })

      expect(applyRestore).not.toHaveBeenCalled()
    })
  })

  describe('clearError', () => {
    it('should clear error and reset to idle', async () => {
      vi.useRealTimers()
      const session = createMockSession()
      const version = createMockVersion()
      const applyRestore = vi.fn().mockResolvedValue({
        success: false,
        error: 'Network error',
      })

      const { result } = renderHook(() =>
        useVersionRestore({
          session,
          applyRestore,
          contributor: 'parent',
        })
      )

      await act(async () => {
        await result.current.restoreVersion(version)
      })

      expect(result.current.error).toBe('Network error')

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
      expect(result.current.status).toBe('idle')
    })
  })

  describe('contributor', () => {
    it('should add contribution with correct contributor', async () => {
      vi.useRealTimers()
      const session = createMockSession()
      const version = createMockVersion()
      const applyRestore = vi.fn().mockResolvedValue({ success: true })

      const { result } = renderHook(() =>
        useVersionRestore({
          session,
          applyRestore,
          contributor: 'child',
        })
      )

      await act(async () => {
        await result.current.restoreVersion(version)
      })

      expect(applyRestore).toHaveBeenCalledWith(
        expect.objectContaining({
          contributions: expect.arrayContaining([
            expect.objectContaining({
              contributor: 'child',
            }),
          ]),
        })
      )
    })
  })
})
