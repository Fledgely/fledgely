/**
 * Unit tests for Data View Audit Service.
 *
 * Story 3A.1: Data Symmetry Enforcement - AC3
 * Tests for audit logging functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { logDataView, logDataViewNonBlocking } from './dataViewAuditService'
import type { LogDataViewParams } from './dataViewAuditService'

// Mock Firebase Firestore
const mockAddDoc = vi.fn()
const mockCollection = vi.fn()

vi.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  Timestamp: {
    now: () => ({ seconds: 1234567890, nanoseconds: 0 }),
  },
}))

vi.mock('../lib/firebase', () => ({
  getFirestoreDb: () => ({}),
}))

describe('dataViewAuditService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAddDoc.mockResolvedValue({ id: 'audit-log-123' })
    mockCollection.mockReturnValue('auditLogs-collection-ref')
  })

  describe('logDataView', () => {
    const validParams: LogDataViewParams = {
      viewerUid: 'guardian-123',
      childId: 'child-456',
      familyId: 'family-789',
      dataType: 'children_list',
      sessionId: 'session-abc',
    }

    it('creates an audit log entry with all fields', async () => {
      const result = await logDataView(validParams)

      expect(mockCollection).toHaveBeenCalledWith({}, 'auditLogs')
      expect(mockAddDoc).toHaveBeenCalledWith('auditLogs-collection-ref', {
        viewerUid: 'guardian-123',
        childId: 'child-456',
        familyId: 'family-789',
        dataType: 'children_list',
        viewedAt: { seconds: 1234567890, nanoseconds: 0 },
        sessionId: 'session-abc',
      })
      expect(result).toBe('audit-log-123')
    })

    it('handles null childId for family-level views', async () => {
      const params: LogDataViewParams = {
        ...validParams,
        childId: null,
      }

      await logDataView(params)

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          childId: null,
        })
      )
    })

    it('handles undefined sessionId by setting null', async () => {
      const params: LogDataViewParams = {
        viewerUid: 'guardian-123',
        childId: 'child-456',
        familyId: 'family-789',
        dataType: 'child_profile',
      }

      await logDataView(params)

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          sessionId: null,
        })
      )
    })

    it('throws error if viewerUid is empty', async () => {
      const params: LogDataViewParams = {
        viewerUid: '',
        childId: 'child-456',
        familyId: 'family-789',
        dataType: 'children_list',
      }

      await expect(logDataView(params)).rejects.toThrow('viewerUid is required')
    })

    it('throws error if familyId is empty', async () => {
      const params: LogDataViewParams = {
        viewerUid: 'guardian-123',
        childId: 'child-456',
        familyId: '',
        dataType: 'children_list',
      }

      await expect(logDataView(params)).rejects.toThrow('familyId is required')
    })

    it('throws error if dataType is invalid', async () => {
      const params = {
        viewerUid: 'guardian-123',
        childId: 'child-456',
        familyId: 'family-789',
        dataType: 'invalid_type' as LogDataViewParams['dataType'],
      }

      await expect(logDataView(params)).rejects.toThrow('Invalid dataType')
    })

    it('propagates Firestore errors', async () => {
      mockAddDoc.mockRejectedValueOnce(new Error('Firestore error'))

      await expect(logDataView(validParams)).rejects.toThrow('Firestore error')
    })

    it('logs correct dataType for each view type', async () => {
      const dataTypes = [
        'children_list',
        'child_profile',
        'screenshots',
        'activity',
        'agreements',
        'flags',
      ] as const

      for (const dataType of dataTypes) {
        await logDataView({ ...validParams, dataType })

        expect(mockAddDoc).toHaveBeenLastCalledWith(
          expect.anything(),
          expect.objectContaining({
            dataType,
          })
        )
      }
    })
  })

  describe('logDataViewNonBlocking', () => {
    const validParams: LogDataViewParams = {
      viewerUid: 'guardian-123',
      childId: 'child-456',
      familyId: 'family-789',
      dataType: 'children_list',
    }

    it('does not throw when Firestore fails', () => {
      mockAddDoc.mockRejectedValueOnce(new Error('Firestore error'))

      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Should not throw
      expect(() => logDataViewNonBlocking(validParams)).not.toThrow()

      consoleSpy.mockRestore()
    })

    it('logs error to console when Firestore fails', async () => {
      mockAddDoc.mockRejectedValueOnce(new Error('Firestore error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      logDataViewNonBlocking(validParams)

      // Wait for the promise to reject
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(consoleSpy).toHaveBeenCalledWith('Failed to log data view:', expect.any(Error))

      consoleSpy.mockRestore()
    })

    it('successfully logs when Firestore works', async () => {
      logDataViewNonBlocking(validParams)

      // Wait for the promise to resolve
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(mockAddDoc).toHaveBeenCalled()
    })
  })

  describe('AC3: Viewing Timestamps Logged', () => {
    it('includes all required fields for audit compliance', async () => {
      const params: LogDataViewParams = {
        viewerUid: 'parent-uid-123',
        childId: 'child-uid-456',
        familyId: 'family-uid-789',
        dataType: 'screenshots',
      }

      await logDataView(params)

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          viewerUid: 'parent-uid-123', // parentUid equivalent
          childId: 'child-uid-456', // childId
          dataType: 'screenshots', // dataType
          viewedAt: expect.anything(), // viewedAt timestamp
        })
      )
    })

    it('returns the created log entry ID', async () => {
      mockAddDoc.mockResolvedValueOnce({ id: 'unique-audit-id' })

      const result = await logDataView({
        viewerUid: 'guardian-123',
        childId: 'child-456',
        familyId: 'family-789',
        dataType: 'child_profile',
      })

      expect(result).toBe('unique-audit-id')
    })
  })
})
