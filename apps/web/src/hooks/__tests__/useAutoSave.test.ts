/**
 * Tests for useAutoSave Hook
 *
 * Story 5.7: Draft Saving & Version History - Task 2
 *
 * Tests for auto-save functionality with debounced Firestore writes,
 * retry logic, and status tracking.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { CoCreationSession } from '@fledgely/contracts'
import { useAutoSave, AUTO_SAVE_CONSTANTS } from '../useAutoSave'

// ============================================
// TEST DATA
// ============================================

const createMockSession = (overrides?: Partial<CoCreationSession>): CoCreationSession => ({
  id: '550e8400-e29b-41d4-a716-446655440001',
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

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('AUTO_SAVE_CONSTANTS', () => {
    it('should have correct debounce interval (30 seconds)', () => {
      expect(AUTO_SAVE_CONSTANTS.DEBOUNCE_INTERVAL_MS).toBe(30000)
    })

    it('should have correct max retries (3)', () => {
      expect(AUTO_SAVE_CONSTANTS.MAX_RETRIES).toBe(3)
    })

    it('should have correct retry delay (2 seconds)', () => {
      expect(AUTO_SAVE_CONSTANTS.RETRY_DELAY_MS).toBe(2000)
    })
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const session = createMockSession()
      const performSave = vi.fn().mockResolvedValue({ success: true })

      const { result } = renderHook(() =>
        useAutoSave({ session, performSave })
      )

      expect(result.current.status).toBe('idle')
      expect(result.current.lastSaved).toBeNull()
      expect(result.current.hasUnsavedChanges).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should return idle status when session is null', () => {
      const performSave = vi.fn().mockResolvedValue({ success: true })

      const { result } = renderHook(() =>
        useAutoSave({ session: null, performSave })
      )

      expect(result.current.status).toBe('idle')
    })
  })

  describe('saveNow function', () => {
    it('should call performSave with session data', async () => {
      vi.useRealTimers()
      const session = createMockSession()
      const performSave = vi.fn().mockResolvedValue({ success: true })

      const { result } = renderHook(() =>
        useAutoSave({ session, performSave })
      )

      await act(async () => {
        await result.current.saveNow()
      })

      expect(performSave).toHaveBeenCalledWith(session)
    })

    it('should set status to saved on success', async () => {
      vi.useRealTimers()
      const session = createMockSession()
      const performSave = vi.fn().mockResolvedValue({ success: true })

      const { result } = renderHook(() =>
        useAutoSave({ session, performSave })
      )

      await act(async () => {
        await result.current.saveNow()
      })

      expect(result.current.status).toBe('saved')
    })

    it('should update lastSaved on success', async () => {
      vi.useRealTimers()
      const session = createMockSession()
      const performSave = vi.fn().mockResolvedValue({ success: true })

      const { result } = renderHook(() =>
        useAutoSave({ session, performSave })
      )

      expect(result.current.lastSaved).toBeNull()

      await act(async () => {
        await result.current.saveNow()
      })

      expect(result.current.lastSaved).not.toBeNull()
    })

    it('should call onSaveSuccess callback on success', async () => {
      vi.useRealTimers()
      const session = createMockSession()
      const performSave = vi.fn().mockResolvedValue({ success: true })
      const onSaveSuccess = vi.fn()

      const { result } = renderHook(() =>
        useAutoSave({ session, performSave, onSaveSuccess })
      )

      await act(async () => {
        await result.current.saveNow()
      })

      expect(onSaveSuccess).toHaveBeenCalled()
    })

    it('should not call performSave when session is null', async () => {
      vi.useRealTimers()
      const performSave = vi.fn().mockResolvedValue({ success: true })

      const { result } = renderHook(() =>
        useAutoSave({ session: null, performSave })
      )

      await act(async () => {
        await result.current.saveNow()
      })

      expect(performSave).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should set status to error on failure', async () => {
      vi.useRealTimers()
      const session = createMockSession()
      // Return failure on all attempts (initial + 3 retries = 4 calls)
      const performSave = vi.fn().mockResolvedValue({
        success: false,
        error: 'Network error',
      })

      const { result } = renderHook(() =>
        useAutoSave({ session, performSave })
      )

      await act(async () => {
        await result.current.saveNow()
      })

      expect(result.current.status).toBe('error')
      expect(result.current.error).toBe('Network error')
    })

    it('should call onSaveError callback on failure', async () => {
      vi.useRealTimers()
      const session = createMockSession()
      const performSave = vi.fn().mockResolvedValue({
        success: false,
        error: 'Network error',
      })
      const onSaveError = vi.fn()

      const { result } = renderHook(() =>
        useAutoSave({ session, performSave, onSaveError })
      )

      await act(async () => {
        await result.current.saveNow()
      })

      expect(onSaveError).toHaveBeenCalledWith(expect.any(Error))
    })

    it('should handle exceptions during save', async () => {
      vi.useRealTimers()
      const session = createMockSession()
      const performSave = vi.fn().mockRejectedValue(new Error('Unexpected error'))

      const { result } = renderHook(() =>
        useAutoSave({ session, performSave })
      )

      await act(async () => {
        await result.current.saveNow()
      })

      expect(result.current.status).toBe('error')
      expect(result.current.error).toBe('Unexpected error')
    })
  })

  describe('clearError', () => {
    it('should clear error and reset to idle', async () => {
      vi.useRealTimers()
      const session = createMockSession()
      const performSave = vi.fn().mockResolvedValue({
        success: false,
        error: 'Network error',
      })

      const { result } = renderHook(() =>
        useAutoSave({ session, performSave })
      )

      await act(async () => {
        await result.current.saveNow()
      })

      expect(result.current.error).toBe('Network error')

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
      expect(result.current.status).toBe('idle')
    })
  })

  describe('timeSinceLastSave', () => {
    it('should return empty string when never saved', () => {
      vi.useRealTimers()
      const session = createMockSession()
      const performSave = vi.fn().mockResolvedValue({ success: true })

      const { result } = renderHook(() =>
        useAutoSave({ session, performSave })
      )

      expect(result.current.timeSinceLastSave).toBe('')
    })

    it('should return "Just now" right after save', async () => {
      vi.useRealTimers()
      const session = createMockSession()
      const performSave = vi.fn().mockResolvedValue({ success: true })

      const { result } = renderHook(() =>
        useAutoSave({ session, performSave })
      )

      await act(async () => {
        await result.current.saveNow()
      })

      expect(result.current.timeSinceLastSave).toBe('Just now')
    })
  })

  describe('change detection', () => {
    it('should detect changes after session update', () => {
      vi.useRealTimers()
      const session = createMockSession()
      const performSave = vi.fn().mockResolvedValue({ success: true })

      const { result, rerender } = renderHook(
        ({ session: s }) => useAutoSave({ session: s, performSave, enabled: false }),
        { initialProps: { session } }
      )

      // First render initializes previousSessionRef
      expect(result.current.hasUnsavedChanges).toBe(false)

      // Update session with new term
      const updatedSession = createMockSession({
        terms: [
          ...session.terms,
          {
            id: '550e8400-e29b-41d4-a716-446655440011',
            type: 'bedtime',
            content: { time: '21:00' },
            addedBy: 'child',
            status: 'accepted',
            order: 1,
            createdAt: '2024-01-01T00:01:00Z',
            updatedAt: '2024-01-01T00:01:00Z',
            discussionNotes: [],
            resolutionStatus: 'unresolved',
          },
        ],
        updatedAt: '2024-01-01T00:01:00Z',
      })

      rerender({ session: updatedSession })

      expect(result.current.hasUnsavedChanges).toBe(true)
    })
  })

  describe('disabled state', () => {
    it('should still allow manual save when disabled', async () => {
      vi.useRealTimers()
      const session = createMockSession()
      const performSave = vi.fn().mockResolvedValue({ success: true })

      const { result } = renderHook(() =>
        useAutoSave({ session, performSave, enabled: false })
      )

      await act(async () => {
        await result.current.saveNow()
      })

      expect(performSave).toHaveBeenCalledWith(session)
    })
  })

  describe('auto-save behavior (unit tests)', () => {
    it('should not auto-save when disabled', async () => {
      const session = createMockSession()
      const performSave = vi.fn().mockResolvedValue({ success: true })

      renderHook(
        ({ session: s }) => useAutoSave({ session: s, performSave, enabled: false }),
        { initialProps: { session } }
      )

      // Advance past debounce
      await act(async () => {
        vi.advanceTimersByTime(AUTO_SAVE_CONSTANTS.DEBOUNCE_INTERVAL_MS * 2)
      })

      expect(performSave).not.toHaveBeenCalled()
    })
  })
})
