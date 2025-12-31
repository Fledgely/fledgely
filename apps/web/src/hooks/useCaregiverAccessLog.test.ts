/**
 * useCaregiverAccessLog Hook Tests - Story 19A.3, Story 19D.3
 *
 * Tests for the caregiver access logging hook.
 *
 * Story 19A.3:
 * - AC5: View access logging per FR19D-X
 *
 * Story 19D.3:
 * - AC1: Audit record created with caregiver ID, timestamp, what was viewed
 * - AC2: Logs stored in append-only collection (Firestore)
 * - AC4: Logging implemented BEFORE caregiver access is enabled
 * - AC5: No caregiver access occurs without corresponding log
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCaregiverAccessLog, logCaregiverAction } from './useCaregiverAccessLog'

// Mock the dataViewAuditService
vi.mock('../services/dataViewAuditService', () => ({
  logDataViewNonBlocking: vi.fn(),
}))

import { logDataViewNonBlocking } from '../services/dataViewAuditService'

describe('useCaregiverAccessLog', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.stubEnv('NODE_ENV', 'development')
    vi.clearAllMocks()
  })

  afterEach(() => {
    consoleSpy.mockRestore()
    vi.unstubAllEnvs()
  })

  describe('Story 19D.3: Firestore logging', () => {
    it('should write to Firestore when viewerUid and familyId provided (AC1, AC2)', () => {
      renderHook(() => useCaregiverAccessLog('view', ['child-1'], 'caregiver-uid', 'family-id'))

      expect(logDataViewNonBlocking).toHaveBeenCalledWith({
        viewerUid: 'caregiver-uid',
        childId: 'child-1',
        familyId: 'family-id',
        dataType: 'caregiver_status',
        metadata: {
          action: 'view',
          viewerRole: 'caregiver',
        },
      })
    })

    it('should log each child separately for granular tracking (AC1)', () => {
      renderHook(() =>
        useCaregiverAccessLog('view', ['child-1', 'child-2'], 'caregiver-uid', 'family-id')
      )

      expect(logDataViewNonBlocking).toHaveBeenCalledTimes(2)
      expect(logDataViewNonBlocking).toHaveBeenNthCalledWith(1, {
        viewerUid: 'caregiver-uid',
        childId: 'child-1',
        familyId: 'family-id',
        dataType: 'caregiver_status',
        metadata: {
          action: 'view',
          viewerRole: 'caregiver',
        },
      })
      expect(logDataViewNonBlocking).toHaveBeenNthCalledWith(2, {
        viewerUid: 'caregiver-uid',
        childId: 'child-2',
        familyId: 'family-id',
        dataType: 'caregiver_status',
        metadata: {
          action: 'view',
          viewerRole: 'caregiver',
        },
      })
    })

    it('should log family-level view when no children provided', () => {
      renderHook(() => useCaregiverAccessLog('view', [], 'caregiver-uid', 'family-id'))

      expect(logDataViewNonBlocking).toHaveBeenCalledWith({
        viewerUid: 'caregiver-uid',
        childId: null,
        familyId: 'family-id',
        dataType: 'caregiver_status',
        metadata: {
          action: 'view',
          viewerRole: 'caregiver',
        },
      })
    })

    it('should include call_parent action in metadata', () => {
      renderHook(() =>
        useCaregiverAccessLog('call_parent', ['child-1'], 'caregiver-uid', 'family-id')
      )

      expect(logDataViewNonBlocking).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            action: 'call_parent',
            viewerRole: 'caregiver',
          },
        })
      )
    })
  })

  describe('Missing context handling', () => {
    it('should skip Firestore write when viewerUid is missing', () => {
      renderHook(() => useCaregiverAccessLog('view', ['child-1'], null, 'family-id'))

      expect(logDataViewNonBlocking).not.toHaveBeenCalled()
    })

    it('should skip Firestore write when familyId is missing', () => {
      renderHook(() => useCaregiverAccessLog('view', ['child-1'], 'caregiver-uid', null))

      expect(logDataViewNonBlocking).not.toHaveBeenCalled()
    })

    it('should log debug message when context is missing in development', () => {
      renderHook(() => useCaregiverAccessLog('view', ['child-1'], null, null))

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Caregiver Access Log] Skipped - missing context:',
        expect.any(Object)
      )
    })
  })

  describe('Duplicate prevention (AC5)', () => {
    it('should only log once per mount (ref prevents duplicate)', () => {
      renderHook(() => useCaregiverAccessLog('view', ['child-1'], 'caregiver-uid', 'family-id'))

      expect(logDataViewNonBlocking).toHaveBeenCalledTimes(1)
    })
  })

  describe('Development logging', () => {
    it('should log success message in development', () => {
      renderHook(() => useCaregiverAccessLog('view', ['child-1'], 'caregiver-uid', 'family-id'))

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Caregiver Access Log] Written to Firestore:',
        expect.objectContaining({
          action: 'view',
          viewerUid: 'caregiver-uid',
          familyId: 'family-id',
          childrenViewed: ['child-1'],
        })
      )
    })
  })
})

describe('logCaregiverAction', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.stubEnv('NODE_ENV', 'development')
    vi.clearAllMocks()
  })

  afterEach(() => {
    consoleSpy.mockRestore()
    vi.unstubAllEnvs()
  })

  it('should write to Firestore with correct params', () => {
    logCaregiverAction('call_parent', ['child-1'], 'caregiver-uid', 'family-id')

    expect(logDataViewNonBlocking).toHaveBeenCalledWith({
      viewerUid: 'caregiver-uid',
      childId: 'child-1',
      familyId: 'family-id',
      dataType: 'caregiver_status',
      metadata: {
        action: 'call_parent',
        viewerRole: 'caregiver',
      },
    })
  })

  it('should log each child separately', () => {
    logCaregiverAction('view', ['child-1', 'child-2'], 'caregiver-uid', 'family-id')

    expect(logDataViewNonBlocking).toHaveBeenCalledTimes(2)
  })

  it('should log family-level when no children', () => {
    logCaregiverAction('view', [], 'caregiver-uid', 'family-id')

    expect(logDataViewNonBlocking).toHaveBeenCalledWith(
      expect.objectContaining({
        childId: null,
      })
    )
  })

  it('should skip when viewerUid is missing', () => {
    logCaregiverAction('view', ['child-1'], null, 'family-id')

    expect(logDataViewNonBlocking).not.toHaveBeenCalled()
  })

  it('should skip when familyId is missing', () => {
    logCaregiverAction('view', ['child-1'], 'caregiver-uid', null)

    expect(logDataViewNonBlocking).not.toHaveBeenCalled()
  })
})
