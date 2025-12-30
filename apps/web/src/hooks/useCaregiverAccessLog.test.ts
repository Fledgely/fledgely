/**
 * useCaregiverAccessLog Hook Tests - Story 19A.3
 *
 * Tests for the caregiver access logging hook.
 * Covers AC5 (view access logging per FR19D-X).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCaregiverAccessLog, logCaregiverAction } from './useCaregiverAccessLog'

describe('useCaregiverAccessLog', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.stubEnv('NODE_ENV', 'development')
  })

  afterEach(() => {
    consoleSpy.mockRestore()
    vi.unstubAllEnvs()
  })

  it('should log view access on mount', () => {
    renderHook(() => useCaregiverAccessLog('view'))

    expect(consoleSpy).toHaveBeenCalled()
    const logCall = consoleSpy.mock.calls[0]
    expect(logCall[0]).toBe('[Caregiver Access Log]')
    expect(logCall[1]).toHaveProperty('action', 'view')
    expect(logCall[1]).toHaveProperty('timestamp')
  })

  it('should log call_parent action', () => {
    renderHook(() => useCaregiverAccessLog('call_parent'))

    expect(consoleSpy).toHaveBeenCalled()
    const logCall = consoleSpy.mock.calls[0]
    expect(logCall[1]).toHaveProperty('action', 'call_parent')
  })

  it('should include children viewed in log', () => {
    const childrenViewed = ['child-1', 'child-2']
    renderHook(() => useCaregiverAccessLog('view', childrenViewed))

    expect(consoleSpy).toHaveBeenCalled()
    const logCall = consoleSpy.mock.calls[0]
    expect(logCall[1]).toHaveProperty('childrenViewed', childrenViewed)
  })

  it('should include empty array when no children provided', () => {
    renderHook(() => useCaregiverAccessLog('view'))

    expect(consoleSpy).toHaveBeenCalled()
    const logCall = consoleSpy.mock.calls[0]
    expect(logCall[1]).toHaveProperty('childrenViewed', [])
  })

  it('should only log once per mount (ref prevents duplicate)', () => {
    // First render should log
    renderHook(() => useCaregiverAccessLog('view'))

    expect(consoleSpy).toHaveBeenCalledTimes(1)
  })
})

describe('logCaregiverAction', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.stubEnv('NODE_ENV', 'development')
  })

  afterEach(() => {
    consoleSpy.mockRestore()
    vi.unstubAllEnvs()
  })

  it('should log action directly', () => {
    logCaregiverAction('call_parent')

    expect(consoleSpy).toHaveBeenCalled()
    const logCall = consoleSpy.mock.calls[0]
    expect(logCall[0]).toBe('[Caregiver Action Log]')
    expect(logCall[1]).toHaveProperty('action', 'call_parent')
  })

  it('should include children viewed in direct log', () => {
    const childrenViewed = ['child-1']
    logCaregiverAction('view', childrenViewed)

    expect(consoleSpy).toHaveBeenCalled()
    const logCall = consoleSpy.mock.calls[0]
    expect(logCall[1]).toHaveProperty('childrenViewed', childrenViewed)
  })
})
