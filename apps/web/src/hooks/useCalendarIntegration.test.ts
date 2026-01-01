/**
 * useCalendarIntegration Hook Tests - Story 33.4
 *
 * Tests for calendar integration hook functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useCalendarIntegration } from './useCalendarIntegration'
import { CALENDAR_FOCUS_TRIGGER_KEYWORDS } from '@fledgely/shared'

// Hoisted mocks
const { mockOnSnapshot, mockSetDoc, mockUpdateDoc, mockDoc, mockDb } = vi.hoisted(() => {
  const mockOnSnapshot = vi.fn()
  const mockSetDoc = vi.fn()
  const mockUpdateDoc = vi.fn()
  const mockDoc = vi.fn()
  const mockDb = {}
  return { mockOnSnapshot, mockSetDoc, mockUpdateDoc, mockDoc, mockDb }
})

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  doc: mockDoc,
  onSnapshot: mockOnSnapshot,
  setDoc: mockSetDoc,
  updateDoc: mockUpdateDoc,
}))

vi.mock('../lib/firebase', () => ({
  getFirestoreDb: () => mockDb,
}))

describe('useCalendarIntegration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDoc.mockReturnValue({ id: 'mock-doc-ref' })
    mockSetDoc.mockResolvedValue(undefined)
    mockUpdateDoc.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should return loading state initially', () => {
      mockOnSnapshot.mockImplementation(() => () => {})

      const { result } = renderHook(() =>
        useCalendarIntegration({
          childId: 'child-123',
          familyId: 'family-456',
        })
      )

      expect(result.current.loading).toBe(true)
      expect(result.current.config).toBeNull()
    })

    it('should not subscribe when childId is null', () => {
      const { result } = renderHook(() =>
        useCalendarIntegration({
          childId: null,
          familyId: 'family-456',
        })
      )

      expect(result.current.loading).toBe(false)
      expect(mockOnSnapshot).not.toHaveBeenCalled()
    })

    it('should not subscribe when familyId is null', () => {
      const { result } = renderHook(() =>
        useCalendarIntegration({
          childId: 'child-123',
          familyId: null,
        })
      )

      expect(result.current.loading).toBe(false)
      expect(mockOnSnapshot).not.toHaveBeenCalled()
    })
  })

  describe('config subscription', () => {
    it('should load existing config', async () => {
      const mockConfig = {
        childId: 'child-123',
        familyId: 'family-456',
        isEnabled: true,
        provider: 'google',
        connectionStatus: 'connected',
        connectedEmail: 'child@example.com',
        connectedAt: Date.now(),
        syncFrequencyMinutes: 30,
        autoActivateFocusMode: true,
        focusTriggerKeywords: ['study', 'homework'],
        lastSyncAt: Date.now() - 60000,
        lastSyncError: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({
          exists: () => true,
          data: () => mockConfig,
        })
        return () => {}
      })

      const { result } = renderHook(() =>
        useCalendarIntegration({
          childId: 'child-123',
          familyId: 'family-456',
        })
      )

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.config).toEqual(mockConfig)
      expect(result.current.isConnected).toBe(true)
      expect(result.current.connectedEmail).toBe('child@example.com')
    })

    it('should create default config when none exists', async () => {
      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({
          exists: () => false,
          data: () => null,
        })
        return () => {}
      })

      const { result } = renderHook(() =>
        useCalendarIntegration({
          childId: 'child-123',
          familyId: 'family-456',
        })
      )

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(mockSetDoc).toHaveBeenCalled()
      expect(result.current.isConnected).toBe(false)
      expect(result.current.connectionStatus).toBe('disconnected')
    })

    it('should handle subscription errors', async () => {
      mockOnSnapshot.mockImplementation((_, _callback, errorCallback) => {
        errorCallback(new Error('Permission denied'))
        return () => {}
      })

      const { result } = renderHook(() =>
        useCalendarIntegration({
          childId: 'child-123',
          familyId: 'family-456',
        })
      )

      await waitFor(() => expect(result.current.error).not.toBeNull())

      expect(result.current.error).toBe('Failed to load calendar integration')
      expect(result.current.loading).toBe(false)
    })
  })

  describe('updateAutoActivation', () => {
    it('should update auto-activation setting', async () => {
      const mockConfig = {
        childId: 'child-123',
        familyId: 'family-456',
        isEnabled: true,
        provider: 'google',
        connectionStatus: 'connected',
        connectedEmail: 'child@example.com',
        connectedAt: Date.now(),
        syncFrequencyMinutes: 30,
        autoActivateFocusMode: false,
        focusTriggerKeywords: ['study'],
        lastSyncAt: null,
        lastSyncError: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      let subscriptionIndex = 0
      mockOnSnapshot.mockImplementation((_, callback) => {
        if (subscriptionIndex === 0) {
          callback({ exists: () => true, data: () => mockConfig })
          subscriptionIndex++
        } else {
          callback({ exists: () => false, data: () => null })
        }
        return () => {}
      })

      const { result } = renderHook(() =>
        useCalendarIntegration({
          childId: 'child-123',
          familyId: 'family-456',
        })
      )

      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await result.current.updateAutoActivation(true)
      })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          autoActivateFocusMode: true,
        })
      )
    })
  })

  describe('updateSyncFrequency', () => {
    it('should update sync frequency for valid values', async () => {
      const mockConfig = {
        childId: 'child-123',
        familyId: 'family-456',
        isEnabled: true,
        provider: 'google',
        connectionStatus: 'connected',
        connectedEmail: 'child@example.com',
        connectedAt: Date.now(),
        syncFrequencyMinutes: 30,
        autoActivateFocusMode: false,
        focusTriggerKeywords: ['study'],
        lastSyncAt: null,
        lastSyncError: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      let subscriptionIndex = 0
      mockOnSnapshot.mockImplementation((_, callback) => {
        if (subscriptionIndex === 0) {
          callback({ exists: () => true, data: () => mockConfig })
          subscriptionIndex++
        } else {
          callback({ exists: () => false, data: () => null })
        }
        return () => {}
      })

      const { result } = renderHook(() =>
        useCalendarIntegration({
          childId: 'child-123',
          familyId: 'family-456',
        })
      )

      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await result.current.updateSyncFrequency(15)
      })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          syncFrequencyMinutes: 15,
        })
      )
    })

    it('should reject invalid sync frequency', async () => {
      const mockConfig = {
        childId: 'child-123',
        familyId: 'family-456',
        isEnabled: true,
        provider: 'google',
        connectionStatus: 'connected',
        connectedEmail: 'child@example.com',
        connectedAt: Date.now(),
        syncFrequencyMinutes: 30,
        autoActivateFocusMode: false,
        focusTriggerKeywords: ['study'],
        lastSyncAt: null,
        lastSyncError: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      let subscriptionIndex = 0
      mockOnSnapshot.mockImplementation((_, callback) => {
        if (subscriptionIndex === 0) {
          callback({ exists: () => true, data: () => mockConfig })
          subscriptionIndex++
        } else {
          callback({ exists: () => false, data: () => null })
        }
        return () => {}
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() =>
        useCalendarIntegration({
          childId: 'child-123',
          familyId: 'family-456',
        })
      )

      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await result.current.updateSyncFrequency(45) // Invalid
      })

      expect(mockUpdateDoc).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('keyword management', () => {
    const mockConfigWithKeywords = {
      childId: 'child-123',
      familyId: 'family-456',
      isEnabled: true,
      provider: 'google',
      connectionStatus: 'connected',
      connectedEmail: 'child@example.com',
      connectedAt: Date.now(),
      syncFrequencyMinutes: 30,
      autoActivateFocusMode: true,
      focusTriggerKeywords: ['study', 'homework'],
      lastSyncAt: null,
      lastSyncError: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    it('should add a new keyword', async () => {
      let subscriptionIndex = 0
      mockOnSnapshot.mockImplementation((_, callback) => {
        if (subscriptionIndex === 0) {
          callback({ exists: () => true, data: () => mockConfigWithKeywords })
          subscriptionIndex++
        } else {
          callback({ exists: () => false, data: () => null })
        }
        return () => {}
      })

      const { result } = renderHook(() =>
        useCalendarIntegration({
          childId: 'child-123',
          familyId: 'family-456',
        })
      )

      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await result.current.addKeyword('exam')
      })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          focusTriggerKeywords: ['study', 'homework', 'exam'],
        })
      )
    })

    it('should not add duplicate keyword', async () => {
      let subscriptionIndex = 0
      mockOnSnapshot.mockImplementation((_, callback) => {
        if (subscriptionIndex === 0) {
          callback({ exists: () => true, data: () => mockConfigWithKeywords })
          subscriptionIndex++
        } else {
          callback({ exists: () => false, data: () => null })
        }
        return () => {}
      })

      const { result } = renderHook(() =>
        useCalendarIntegration({
          childId: 'child-123',
          familyId: 'family-456',
        })
      )

      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await result.current.addKeyword('study')
      })

      expect(mockUpdateDoc).not.toHaveBeenCalled()
    })

    it('should remove a keyword', async () => {
      let subscriptionIndex = 0
      mockOnSnapshot.mockImplementation((_, callback) => {
        if (subscriptionIndex === 0) {
          callback({ exists: () => true, data: () => mockConfigWithKeywords })
          subscriptionIndex++
        } else {
          callback({ exists: () => false, data: () => null })
        }
        return () => {}
      })

      const { result } = renderHook(() =>
        useCalendarIntegration({
          childId: 'child-123',
          familyId: 'family-456',
        })
      )

      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await result.current.removeKeyword('homework')
      })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          focusTriggerKeywords: ['study'],
        })
      )
    })

    it('should reset keywords to defaults', async () => {
      let subscriptionIndex = 0
      mockOnSnapshot.mockImplementation((_, callback) => {
        if (subscriptionIndex === 0) {
          callback({ exists: () => true, data: () => mockConfigWithKeywords })
          subscriptionIndex++
        } else {
          callback({ exists: () => false, data: () => null })
        }
        return () => {}
      })

      const { result } = renderHook(() =>
        useCalendarIntegration({
          childId: 'child-123',
          familyId: 'family-456',
        })
      )

      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await result.current.resetKeywords()
      })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          focusTriggerKeywords: [...CALENDAR_FOCUS_TRIGGER_KEYWORDS],
        })
      )
    })
  })

  describe('matchesKeywords', () => {
    it('should match text against configured keywords', async () => {
      const mockConfig = {
        childId: 'child-123',
        familyId: 'family-456',
        isEnabled: true,
        provider: 'google',
        connectionStatus: 'connected',
        connectedEmail: 'child@example.com',
        connectedAt: Date.now(),
        syncFrequencyMinutes: 30,
        autoActivateFocusMode: true,
        focusTriggerKeywords: ['study', 'homework', 'focus'],
        lastSyncAt: null,
        lastSyncError: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      let subscriptionIndex = 0
      mockOnSnapshot.mockImplementation((_, callback) => {
        if (subscriptionIndex === 0) {
          callback({ exists: () => true, data: () => mockConfig })
          subscriptionIndex++
        } else {
          callback({ exists: () => false, data: () => null })
        }
        return () => {}
      })

      const { result } = renderHook(() =>
        useCalendarIntegration({
          childId: 'child-123',
          familyId: 'family-456',
        })
      )

      await waitFor(() => expect(result.current.loading).toBe(false))

      // Should match
      const match1 = result.current.matchesKeywords('Math Homework')
      expect(match1.matches).toBe(true)
      expect(match1.matchedKeywords).toContain('homework')

      // Should match case-insensitive
      const match2 = result.current.matchesKeywords('STUDY SESSION')
      expect(match2.matches).toBe(true)
      expect(match2.matchedKeywords).toContain('study')

      // Should not match
      const match3 = result.current.matchesKeywords('Doctor Appointment')
      expect(match3.matches).toBe(false)
      expect(match3.matchedKeywords).toHaveLength(0)

      // Should match multiple
      const match4 = result.current.matchesKeywords('Focus on homework study')
      expect(match4.matches).toBe(true)
      expect(match4.matchedKeywords).toContain('focus')
      expect(match4.matchedKeywords).toContain('homework')
      expect(match4.matchedKeywords).toContain('study')
    })
  })

  describe('focusEligibleEvents', () => {
    it('should filter focus-eligible events', async () => {
      const now = Date.now()
      const mockEvents = [
        {
          id: 'event-1',
          title: 'Math Homework',
          startTime: now - 3600000, // Started 1 hour ago
          endTime: now + 1800000, // Ends in 30 min
          isFocusEligible: true,
          matchedKeywords: ['homework'],
          isAllDay: false,
          processed: false,
        },
        {
          id: 'event-2',
          title: 'Doctor Appointment',
          startTime: now + 3600000,
          endTime: now + 7200000,
          isFocusEligible: false,
          matchedKeywords: [],
          isAllDay: false,
          processed: false,
        },
        {
          id: 'event-3',
          title: 'Study Session',
          startTime: now + 1800000, // In 30 min
          endTime: now + 5400000,
          isFocusEligible: true,
          matchedKeywords: ['study'],
          isAllDay: false,
          processed: false,
        },
      ]

      let subscriptionIndex = 0
      mockOnSnapshot.mockImplementation((_, callback) => {
        if (subscriptionIndex === 0) {
          // Config subscription
          callback({
            exists: () => true,
            data: () => ({
              childId: 'child-123',
              familyId: 'family-456',
              isEnabled: true,
              provider: 'google',
              connectionStatus: 'connected',
              connectedEmail: 'child@example.com',
              connectedAt: Date.now(),
              syncFrequencyMinutes: 30,
              autoActivateFocusMode: true,
              focusTriggerKeywords: ['study', 'homework'],
              lastSyncAt: Date.now(),
              lastSyncError: null,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            }),
          })
          subscriptionIndex++
        } else {
          // Events subscription
          callback({
            exists: () => true,
            data: () => ({
              childId: 'child-123',
              familyId: 'family-456',
              events: mockEvents,
              fetchedAt: Date.now(),
              expiresAt: Date.now() + 3600000,
              updatedAt: Date.now(),
            }),
          })
        }
        return () => {}
      })

      const { result } = renderHook(() =>
        useCalendarIntegration({
          childId: 'child-123',
          familyId: 'family-456',
        })
      )

      await waitFor(() => expect(result.current.loading).toBe(false))
      await waitFor(() => expect(result.current.events).toHaveLength(3))

      expect(result.current.focusEligibleEvents).toHaveLength(2)
      expect(result.current.focusEligibleEvents.map((e) => e.id)).toEqual(['event-1', 'event-3'])
    })

    it('should identify current and upcoming focus events', async () => {
      const now = Date.now()
      const mockEvents = [
        {
          id: 'current-event',
          title: 'Current Homework',
          startTime: now - 1800000, // Started 30 min ago
          endTime: now + 1800000, // Ends in 30 min
          isFocusEligible: true,
          matchedKeywords: ['homework'],
          isAllDay: false,
          processed: false,
        },
        {
          id: 'upcoming-event',
          title: 'Upcoming Study',
          startTime: now + 1800000, // In 30 min
          endTime: now + 5400000,
          isFocusEligible: true,
          matchedKeywords: ['study'],
          isAllDay: false,
          processed: false,
        },
      ]

      let subscriptionIndex = 0
      mockOnSnapshot.mockImplementation((_, callback) => {
        if (subscriptionIndex === 0) {
          callback({
            exists: () => true,
            data: () => ({
              childId: 'child-123',
              familyId: 'family-456',
              isEnabled: true,
              provider: 'google',
              connectionStatus: 'connected',
              connectedEmail: 'child@example.com',
              connectedAt: Date.now(),
              syncFrequencyMinutes: 30,
              autoActivateFocusMode: true,
              focusTriggerKeywords: ['study', 'homework'],
              lastSyncAt: Date.now(),
              lastSyncError: null,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            }),
          })
          subscriptionIndex++
        } else {
          callback({
            exists: () => true,
            data: () => ({
              childId: 'child-123',
              familyId: 'family-456',
              events: mockEvents,
              fetchedAt: Date.now(),
              expiresAt: Date.now() + 3600000,
              updatedAt: Date.now(),
            }),
          })
        }
        return () => {}
      })

      const { result } = renderHook(() =>
        useCalendarIntegration({
          childId: 'child-123',
          familyId: 'family-456',
        })
      )

      await waitFor(() => expect(result.current.loading).toBe(false))
      await waitFor(() => expect(result.current.events).toHaveLength(2))

      expect(result.current.currentFocusEvent?.id).toBe('current-event')
      expect(result.current.upcomingFocusEvent?.id).toBe('upcoming-event')
    })
  })

  describe('sync status', () => {
    it('should expose sync status from config', async () => {
      const lastSync = Date.now() - 300000 // 5 min ago
      const mockConfig = {
        childId: 'child-123',
        familyId: 'family-456',
        isEnabled: true,
        provider: 'google',
        connectionStatus: 'connected',
        connectedEmail: 'child@example.com',
        connectedAt: Date.now() - 86400000,
        syncFrequencyMinutes: 30,
        autoActivateFocusMode: true,
        focusTriggerKeywords: ['study'],
        lastSyncAt: lastSync,
        lastSyncError: null,
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now(),
      }

      let subscriptionIndex = 0
      mockOnSnapshot.mockImplementation((_, callback) => {
        if (subscriptionIndex === 0) {
          // Config subscription
          callback({
            exists: () => true,
            data: () => mockConfig,
          })
          subscriptionIndex++
        } else {
          // Events subscription - return empty
          callback({
            exists: () => false,
            data: () => null,
          })
        }
        return () => {}
      })

      const { result } = renderHook(() =>
        useCalendarIntegration({
          childId: 'child-123',
          familyId: 'family-456',
        })
      )

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.lastSyncAt).toBe(lastSync)
      expect(result.current.lastSyncError).toBeNull()
    })

    it('should expose sync errors', async () => {
      const mockConfig = {
        childId: 'child-123',
        familyId: 'family-456',
        isEnabled: true,
        provider: 'google',
        connectionStatus: 'error',
        connectedEmail: 'child@example.com',
        connectedAt: Date.now() - 86400000,
        syncFrequencyMinutes: 30,
        autoActivateFocusMode: true,
        focusTriggerKeywords: ['study'],
        lastSyncAt: Date.now() - 3600000,
        lastSyncError: 'Token expired',
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now(),
      }

      let subscriptionIndex = 0
      mockOnSnapshot.mockImplementation((_, callback) => {
        if (subscriptionIndex === 0) {
          // Config subscription
          callback({
            exists: () => true,
            data: () => mockConfig,
          })
          subscriptionIndex++
        } else {
          // Events subscription - return empty
          callback({
            exists: () => false,
            data: () => null,
          })
        }
        return () => {}
      })

      const { result } = renderHook(() =>
        useCalendarIntegration({
          childId: 'child-123',
          familyId: 'family-456',
        })
      )

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.lastSyncError).toBe('Token expired')
      expect(result.current.connectionStatus).toBe('error')
    })
  })
})
