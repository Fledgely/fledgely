/**
 * Tests for useFilteredTermCategories hook.
 *
 * Story 5.6: Agreement-Only Mode Selection - AC2, AC3
 */

import { renderHook } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useFilteredTermCategories } from '../useFilteredTermCategories'

describe('useFilteredTermCategories', () => {
  describe('agreement_only mode', () => {
    it('should return categories without monitoring', () => {
      const { result } = renderHook(() => useFilteredTermCategories({ mode: 'agreement_only' }))

      expect(result.current.categories).toEqual(['time', 'apps', 'rewards', 'general'])
    })

    it('should not include monitoring category', () => {
      const { result } = renderHook(() => useFilteredTermCategories({ mode: 'agreement_only' }))

      expect(result.current.categories).not.toContain('monitoring')
    })

    it('should report monitoring as not available', () => {
      const { result } = renderHook(() => useFilteredTermCategories({ mode: 'agreement_only' }))

      expect(result.current.isCategoryAvailable('monitoring')).toBe(false)
    })

    it('should report time as available', () => {
      const { result } = renderHook(() => useFilteredTermCategories({ mode: 'agreement_only' }))

      expect(result.current.isCategoryAvailable('time')).toBe(true)
    })

    it('should report apps as available', () => {
      const { result } = renderHook(() => useFilteredTermCategories({ mode: 'agreement_only' }))

      expect(result.current.isCategoryAvailable('apps')).toBe(true)
    })

    it('should report rewards as available', () => {
      const { result } = renderHook(() => useFilteredTermCategories({ mode: 'agreement_only' }))

      expect(result.current.isCategoryAvailable('rewards')).toBe(true)
    })

    it('should report general as available', () => {
      const { result } = renderHook(() => useFilteredTermCategories({ mode: 'agreement_only' }))

      expect(result.current.isCategoryAvailable('general')).toBe(true)
    })

    it('should report monitoring as not enabled', () => {
      const { result } = renderHook(() => useFilteredTermCategories({ mode: 'agreement_only' }))

      expect(result.current.isMonitoringEnabled).toBe(false)
    })
  })

  describe('full_monitoring mode', () => {
    it('should return all categories including monitoring', () => {
      const { result } = renderHook(() => useFilteredTermCategories({ mode: 'full_monitoring' }))

      expect(result.current.categories).toEqual([
        'time',
        'apps',
        'monitoring',
        'rewards',
        'general',
      ])
    })

    it('should include monitoring category', () => {
      const { result } = renderHook(() => useFilteredTermCategories({ mode: 'full_monitoring' }))

      expect(result.current.categories).toContain('monitoring')
    })

    it('should report monitoring as available', () => {
      const { result } = renderHook(() => useFilteredTermCategories({ mode: 'full_monitoring' }))

      expect(result.current.isCategoryAvailable('monitoring')).toBe(true)
    })

    it('should report all categories as available', () => {
      const { result } = renderHook(() => useFilteredTermCategories({ mode: 'full_monitoring' }))

      expect(result.current.isCategoryAvailable('time')).toBe(true)
      expect(result.current.isCategoryAvailable('apps')).toBe(true)
      expect(result.current.isCategoryAvailable('monitoring')).toBe(true)
      expect(result.current.isCategoryAvailable('rewards')).toBe(true)
      expect(result.current.isCategoryAvailable('general')).toBe(true)
    })

    it('should report monitoring as enabled', () => {
      const { result } = renderHook(() => useFilteredTermCategories({ mode: 'full_monitoring' }))

      expect(result.current.isMonitoringEnabled).toBe(true)
    })
  })

  describe('mode switching', () => {
    it('should update categories when mode changes', () => {
      const { result, rerender } = renderHook(({ mode }) => useFilteredTermCategories({ mode }), {
        initialProps: { mode: 'agreement_only' as const },
      })

      expect(result.current.categories).not.toContain('monitoring')

      rerender({ mode: 'full_monitoring' })

      expect(result.current.categories).toContain('monitoring')
    })

    it('should update isCategoryAvailable when mode changes', () => {
      const { result, rerender } = renderHook(({ mode }) => useFilteredTermCategories({ mode }), {
        initialProps: { mode: 'agreement_only' as const },
      })

      expect(result.current.isCategoryAvailable('monitoring')).toBe(false)

      rerender({ mode: 'full_monitoring' })

      expect(result.current.isCategoryAvailable('monitoring')).toBe(true)
    })

    it('should update isMonitoringEnabled when mode changes', () => {
      const { result, rerender } = renderHook(({ mode }) => useFilteredTermCategories({ mode }), {
        initialProps: { mode: 'agreement_only' as const },
      })

      expect(result.current.isMonitoringEnabled).toBe(false)

      rerender({ mode: 'full_monitoring' })

      expect(result.current.isMonitoringEnabled).toBe(true)
    })
  })

  describe('return value stability', () => {
    it('should return stable categories array for same mode', () => {
      const { result, rerender } = renderHook(() =>
        useFilteredTermCategories({ mode: 'agreement_only' })
      )

      const initialCategories = result.current.categories
      rerender()

      expect(result.current.categories).toBe(initialCategories)
    })

    it('should return stable isCategoryAvailable function for same mode', () => {
      const { result, rerender } = renderHook(() =>
        useFilteredTermCategories({ mode: 'agreement_only' })
      )

      const initialFn = result.current.isCategoryAvailable
      rerender()

      expect(result.current.isCategoryAvailable).toBe(initialFn)
    })
  })
})
