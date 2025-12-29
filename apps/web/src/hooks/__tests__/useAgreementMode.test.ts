/**
 * Tests for useAgreementMode hook.
 *
 * Story 5.6: Agreement-Only Mode Selection - AC4, AC5
 */

import { renderHook } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useAgreementMode } from '../useAgreementMode'

describe('useAgreementMode', () => {
  describe('agreement_only mode', () => {
    it('should return correct mode', () => {
      const { result } = renderHook(() => useAgreementMode({ mode: 'agreement_only' }))

      expect(result.current.mode).toBe('agreement_only')
    })

    it('should report isAgreementOnly as true', () => {
      const { result } = renderHook(() => useAgreementMode({ mode: 'agreement_only' }))

      expect(result.current.isAgreementOnly).toBe(true)
    })

    it('should report isFullMonitoring as false', () => {
      const { result } = renderHook(() => useAgreementMode({ mode: 'agreement_only' }))

      expect(result.current.isFullMonitoring).toBe(false)
    })

    it('should report shouldShowEnrollment as false', () => {
      const { result } = renderHook(() => useAgreementMode({ mode: 'agreement_only' }))

      expect(result.current.shouldShowEnrollment).toBe(false)
    })

    it('should report shouldShowMonitoringTerms as false', () => {
      const { result } = renderHook(() => useAgreementMode({ mode: 'agreement_only' }))

      expect(result.current.shouldShowMonitoringTerms).toBe(false)
    })

    it('should report canUpgradeToMonitoring as true', () => {
      const { result } = renderHook(() => useAgreementMode({ mode: 'agreement_only' }))

      expect(result.current.canUpgradeToMonitoring).toBe(true)
    })
  })

  describe('full_monitoring mode', () => {
    it('should return correct mode', () => {
      const { result } = renderHook(() => useAgreementMode({ mode: 'full_monitoring' }))

      expect(result.current.mode).toBe('full_monitoring')
    })

    it('should report isAgreementOnly as false', () => {
      const { result } = renderHook(() => useAgreementMode({ mode: 'full_monitoring' }))

      expect(result.current.isAgreementOnly).toBe(false)
    })

    it('should report isFullMonitoring as true', () => {
      const { result } = renderHook(() => useAgreementMode({ mode: 'full_monitoring' }))

      expect(result.current.isFullMonitoring).toBe(true)
    })

    it('should report shouldShowEnrollment as true', () => {
      const { result } = renderHook(() => useAgreementMode({ mode: 'full_monitoring' }))

      expect(result.current.shouldShowEnrollment).toBe(true)
    })

    it('should report shouldShowMonitoringTerms as true', () => {
      const { result } = renderHook(() => useAgreementMode({ mode: 'full_monitoring' }))

      expect(result.current.shouldShowMonitoringTerms).toBe(true)
    })

    it('should report canUpgradeToMonitoring as false', () => {
      const { result } = renderHook(() => useAgreementMode({ mode: 'full_monitoring' }))

      expect(result.current.canUpgradeToMonitoring).toBe(false)
    })
  })

  describe('mode switching', () => {
    it('should update isAgreementOnly when mode changes', () => {
      const { result, rerender } = renderHook(({ mode }) => useAgreementMode({ mode }), {
        initialProps: { mode: 'agreement_only' as const },
      })

      expect(result.current.isAgreementOnly).toBe(true)

      rerender({ mode: 'full_monitoring' })

      expect(result.current.isAgreementOnly).toBe(false)
    })

    it('should update isFullMonitoring when mode changes', () => {
      const { result, rerender } = renderHook(({ mode }) => useAgreementMode({ mode }), {
        initialProps: { mode: 'agreement_only' as const },
      })

      expect(result.current.isFullMonitoring).toBe(false)

      rerender({ mode: 'full_monitoring' })

      expect(result.current.isFullMonitoring).toBe(true)
    })

    it('should update shouldShowEnrollment when mode changes', () => {
      const { result, rerender } = renderHook(({ mode }) => useAgreementMode({ mode }), {
        initialProps: { mode: 'agreement_only' as const },
      })

      expect(result.current.shouldShowEnrollment).toBe(false)

      rerender({ mode: 'full_monitoring' })

      expect(result.current.shouldShowEnrollment).toBe(true)
    })

    it('should update shouldShowMonitoringTerms when mode changes', () => {
      const { result, rerender } = renderHook(({ mode }) => useAgreementMode({ mode }), {
        initialProps: { mode: 'agreement_only' as const },
      })

      expect(result.current.shouldShowMonitoringTerms).toBe(false)

      rerender({ mode: 'full_monitoring' })

      expect(result.current.shouldShowMonitoringTerms).toBe(true)
    })

    it('should update canUpgradeToMonitoring when mode changes', () => {
      const { result, rerender } = renderHook(({ mode }) => useAgreementMode({ mode }), {
        initialProps: { mode: 'agreement_only' as const },
      })

      expect(result.current.canUpgradeToMonitoring).toBe(true)

      rerender({ mode: 'full_monitoring' })

      expect(result.current.canUpgradeToMonitoring).toBe(false)
    })
  })

  describe('return value consistency', () => {
    it('should return all expected properties', () => {
      const { result } = renderHook(() => useAgreementMode({ mode: 'agreement_only' }))

      expect(result.current).toHaveProperty('mode')
      expect(result.current).toHaveProperty('isAgreementOnly')
      expect(result.current).toHaveProperty('isFullMonitoring')
      expect(result.current).toHaveProperty('shouldShowEnrollment')
      expect(result.current).toHaveProperty('shouldShowMonitoringTerms')
      expect(result.current).toHaveProperty('canUpgradeToMonitoring')
    })

    it('should return correct types for all properties', () => {
      const { result } = renderHook(() => useAgreementMode({ mode: 'agreement_only' }))

      expect(typeof result.current.mode).toBe('string')
      expect(typeof result.current.isAgreementOnly).toBe('boolean')
      expect(typeof result.current.isFullMonitoring).toBe('boolean')
      expect(typeof result.current.shouldShowEnrollment).toBe('boolean')
      expect(typeof result.current.shouldShowMonitoringTerms).toBe('boolean')
      expect(typeof result.current.canUpgradeToMonitoring).toBe('boolean')
    })
  })

  describe('mode validation', () => {
    it('should handle agreement_only mode correctly', () => {
      const { result } = renderHook(() => useAgreementMode({ mode: 'agreement_only' }))

      // All these should be consistent for agreement_only
      expect(result.current.isAgreementOnly).toBe(true)
      expect(result.current.isFullMonitoring).toBe(false)
      expect(result.current.shouldShowEnrollment).toBe(false)
      expect(result.current.shouldShowMonitoringTerms).toBe(false)
      expect(result.current.canUpgradeToMonitoring).toBe(true)
    })

    it('should handle full_monitoring mode correctly', () => {
      const { result } = renderHook(() => useAgreementMode({ mode: 'full_monitoring' }))

      // All these should be consistent for full_monitoring
      expect(result.current.isAgreementOnly).toBe(false)
      expect(result.current.isFullMonitoring).toBe(true)
      expect(result.current.shouldShowEnrollment).toBe(true)
      expect(result.current.shouldShowMonitoringTerms).toBe(true)
      expect(result.current.canUpgradeToMonitoring).toBe(false)
    })
  })
})
