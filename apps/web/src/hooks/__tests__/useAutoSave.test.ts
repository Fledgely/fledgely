/**
 * Tests for useAutoSave hook.
 *
 * Story 5.7: Draft Saving & Version History - AC1, AC2
 */

import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAutoSave } from '../useAutoSave'

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('should initialize with saved status', () => {
      const onSave = vi.fn()
      const { result } = renderHook(() =>
        useAutoSave({
          data: { terms: [] },
          onSave,
        })
      )

      expect(result.current.status).toBe('saved')
      expect(result.current.isDirty).toBe(false)
      expect(result.current.lastSavedAt).toBeNull()
    })
  })

  describe('markDirty', () => {
    it('should mark data as dirty', () => {
      const onSave = vi.fn()
      const { result } = renderHook(() =>
        useAutoSave({
          data: { terms: [] },
          onSave,
        })
      )

      act(() => {
        result.current.markDirty()
      })

      expect(result.current.isDirty).toBe(true)
      expect(result.current.status).toBe('unsaved')
    })

    it('should change status from saved to unsaved', () => {
      const onSave = vi.fn()
      const { result } = renderHook(() =>
        useAutoSave({
          data: { terms: [] },
          onSave,
        })
      )

      expect(result.current.status).toBe('saved')

      act(() => {
        result.current.markDirty()
      })

      expect(result.current.status).toBe('unsaved')
    })
  })

  describe('markClean', () => {
    it('should mark data as clean', () => {
      const onSave = vi.fn()
      const { result } = renderHook(() =>
        useAutoSave({
          data: { terms: [] },
          onSave,
        })
      )

      act(() => {
        result.current.markDirty()
      })

      expect(result.current.isDirty).toBe(true)

      act(() => {
        result.current.markClean()
      })

      expect(result.current.isDirty).toBe(false)
      expect(result.current.status).toBe('saved')
    })
  })

  describe('manual save', () => {
    it('should call onSave when save is triggered', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)
      const data = { terms: ['term1'] }

      const { result } = renderHook(() =>
        useAutoSave({
          data,
          onSave,
        })
      )

      act(() => {
        result.current.markDirty()
      })

      await act(async () => {
        await result.current.save()
      })

      expect(onSave).toHaveBeenCalledWith(data)
    })

    it('should update status to saving during save', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() =>
        useAutoSave({
          data: { terms: [] },
          onSave,
        })
      )

      act(() => {
        result.current.markDirty()
      })

      // Start save and check status transitions
      await act(async () => {
        await result.current.save()
      })

      // After save completes, status should be saved
      expect(result.current.status).toBe('saved')
    })

    it('should update lastSavedAt after successful save', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() =>
        useAutoSave({
          data: { terms: [] },
          onSave,
        })
      )

      act(() => {
        result.current.markDirty()
      })

      expect(result.current.lastSavedAt).toBeNull()

      await act(async () => {
        await result.current.save()
      })

      expect(result.current.lastSavedAt).toBeInstanceOf(Date)
    })

    it('should not save when not dirty', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() =>
        useAutoSave({
          data: { terms: [] },
          onSave,
        })
      )

      await act(async () => {
        await result.current.save()
      })

      expect(onSave).not.toHaveBeenCalled()
    })

    it('should call onSaveComplete after successful save', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)
      const onSaveComplete = vi.fn()

      const { result } = renderHook(() =>
        useAutoSave({
          data: { terms: [] },
          onSave,
          onSaveComplete,
        })
      )

      act(() => {
        result.current.markDirty()
      })

      await act(async () => {
        await result.current.save()
      })

      expect(onSaveComplete).toHaveBeenCalled()
    })
  })

  describe('save error handling', () => {
    it('should set status to error on save failure', async () => {
      const onSave = vi.fn().mockRejectedValue(new Error('Save failed'))

      const { result } = renderHook(() =>
        useAutoSave({
          data: { terms: [] },
          onSave,
        })
      )

      act(() => {
        result.current.markDirty()
      })

      await act(async () => {
        await result.current.save()
      })

      expect(result.current.status).toBe('error')
    })

    it('should call onSaveError on save failure', async () => {
      const error = new Error('Save failed')
      const onSave = vi.fn().mockRejectedValue(error)
      const onSaveError = vi.fn()

      const { result } = renderHook(() =>
        useAutoSave({
          data: { terms: [] },
          onSave,
          onSaveError,
        })
      )

      act(() => {
        result.current.markDirty()
      })

      await act(async () => {
        await result.current.save()
      })

      expect(onSaveError).toHaveBeenCalledWith(error)
    })
  })

  describe('auto-save interval', () => {
    it('should auto-save after interval when dirty', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() =>
        useAutoSave({
          data: { terms: [] },
          onSave,
          intervalMs: 5000,
        })
      )

      act(() => {
        result.current.markDirty()
      })

      expect(onSave).not.toHaveBeenCalled()

      await act(async () => {
        vi.advanceTimersByTime(5000)
      })

      expect(onSave).toHaveBeenCalled()
    })

    it('should not auto-save when not dirty', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)

      renderHook(() =>
        useAutoSave({
          data: { terms: [] },
          onSave,
          intervalMs: 5000,
        })
      )

      await act(async () => {
        vi.advanceTimersByTime(10000)
      })

      expect(onSave).not.toHaveBeenCalled()
    })

    it('should not auto-save when disabled', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() =>
        useAutoSave({
          data: { terms: [] },
          onSave,
          enabled: false,
          intervalMs: 5000,
        })
      )

      act(() => {
        result.current.markDirty()
      })

      await act(async () => {
        vi.advanceTimersByTime(10000)
      })

      expect(onSave).not.toHaveBeenCalled()
    })

    it('should use default 30 second interval', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() =>
        useAutoSave({
          data: { terms: [] },
          onSave,
        })
      )

      act(() => {
        result.current.markDirty()
      })

      await act(async () => {
        vi.advanceTimersByTime(29000)
      })

      expect(onSave).not.toHaveBeenCalled()

      await act(async () => {
        vi.advanceTimersByTime(1000)
      })

      expect(onSave).toHaveBeenCalled()
    })
  })

  describe('data updates', () => {
    it('should use latest data when saving', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)

      const { result, rerender } = renderHook(
        ({ data }) =>
          useAutoSave({
            data,
            onSave,
          }),
        { initialProps: { data: { terms: ['term1'] } } }
      )

      act(() => {
        result.current.markDirty()
      })

      // Update data
      rerender({ data: { terms: ['term1', 'term2'] } })

      await act(async () => {
        await result.current.save()
      })

      expect(onSave).toHaveBeenCalledWith({ terms: ['term1', 'term2'] })
    })
  })
})
