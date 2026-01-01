/**
 * useFocusModeWithCalendar Hook Tests - Story 33.4
 *
 * Tests for calendar-integrated focus mode auto-activation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Hoist mocks
const { mockUpdateDoc, mockSetDoc, mockDoc, mockDb } = vi.hoisted(() => {
  const mockUpdateDoc = vi.fn()
  const mockSetDoc = vi.fn()
  const mockDoc = vi.fn()
  const mockDb = {}
  return { mockUpdateDoc, mockSetDoc, mockDoc, mockDb }
})

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  doc: mockDoc,
  updateDoc: mockUpdateDoc,
  setDoc: mockSetDoc,
  increment: vi.fn((value: number) => ({ _increment: value })),
}))

vi.mock('../lib/firebase', () => ({
  getFirestoreDb: () => mockDb,
}))

// Mock the base hooks
const mockFocusModeState = vi.fn()
const mockCalendarState = vi.fn()

vi.mock('./useFocusMode', () => ({
  useFocusMode: () => mockFocusModeState(),
}))

vi.mock('./useCalendarIntegration', () => ({
  useCalendarIntegration: () => mockCalendarState(),
}))

// Import after mocks
import { useFocusModeWithCalendar } from './useFocusModeWithCalendar'

describe('useFocusModeWithCalendar - Story 33.4', () => {
  const defaultFocusModeState = {
    focusState: null,
    loading: false,
    error: null,
    isActive: false,
    currentSession: null,
    timeRemainingMs: null,
    timeRemainingFormatted: null,
    startFocusMode: vi.fn(),
    stopFocusMode: vi.fn(),
    totalSessionsToday: 0,
    totalFocusTimeToday: 0,
  }

  const defaultCalendarState = {
    config: null,
    events: [],
    loading: false,
    error: null,
    isConnected: false,
    connectionStatus: 'disconnected' as const,
    connectedEmail: null,
    updateAutoActivation: vi.fn(),
    updateSyncFrequency: vi.fn(),
    addKeyword: vi.fn(),
    removeKeyword: vi.fn(),
    resetKeywords: vi.fn(),
    focusEligibleEvents: [],
    currentFocusEvent: null,
    upcomingFocusEvent: null,
    matchesKeywords: vi.fn(),
    lastSyncAt: null,
    lastSyncError: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockFocusModeState.mockReturnValue(defaultFocusModeState)
    mockCalendarState.mockReturnValue(defaultCalendarState)
    mockDoc.mockReturnValue('mock-doc-ref')
    mockUpdateDoc.mockResolvedValue(undefined)
    mockSetDoc.mockResolvedValue(undefined)
  })

  describe('basic hook behavior', () => {
    it('returns combined focus mode and calendar state', () => {
      const { result } = renderHook(() =>
        useFocusModeWithCalendar({ childId: 'child-1', familyId: 'family-1' })
      )

      expect(result.current.isActive).toBe(false)
      expect(result.current.isCalendarConnected).toBe(false)
      expect(result.current.autoActivationEnabled).toBe(false)
      expect(result.current.isCalendarTriggered).toBe(false)
    })

    it('combines loading states', () => {
      mockFocusModeState.mockReturnValue({
        ...defaultFocusModeState,
        loading: true,
      })
      mockCalendarState.mockReturnValue({
        ...defaultCalendarState,
        loading: false,
      })

      const { result } = renderHook(() =>
        useFocusModeWithCalendar({ childId: 'child-1', familyId: 'family-1' })
      )

      expect(result.current.loading).toBe(true)
    })

    it('combines error states', () => {
      mockFocusModeState.mockReturnValue({
        ...defaultFocusModeState,
        error: null,
      })
      mockCalendarState.mockReturnValue({
        ...defaultCalendarState,
        error: 'Calendar error',
      })

      const { result } = renderHook(() =>
        useFocusModeWithCalendar({ childId: 'child-1', familyId: 'family-1' })
      )

      expect(result.current.error).toBe('Calendar error')
    })
  })

  describe('AC3: Automatic Focus Mode Activation', () => {
    it('auto-activates when calendar event starts and autoActivate is enabled', async () => {
      const currentEvent = {
        id: 'event-1',
        title: 'Math Homework',
        startTime: Date.now() - 60000, // Started 1 min ago
        endTime: Date.now() + 3540000, // Ends in ~1 hour
        isFocusEligible: true,
        matchedKeywords: ['homework'],
        description: null,
        isAllDay: false,
        processed: false,
      }

      mockCalendarState.mockReturnValue({
        ...defaultCalendarState,
        isConnected: true,
        config: { autoActivateFocusMode: true },
        currentFocusEvent: currentEvent,
        events: [currentEvent],
      })

      renderHook(() => useFocusModeWithCalendar({ childId: 'child-1', familyId: 'family-1' }))

      await waitFor(() => {
        expect(mockUpdateDoc).toHaveBeenCalled()
      })

      // Verify the session was created with calendar trigger
      const updateCall = mockUpdateDoc.mock.calls[0]
      expect(updateCall[1]).toMatchObject({
        isActive: true,
        currentSession: expect.objectContaining({
          triggeredBy: 'calendar',
          calendarEventId: 'event-1',
          calendarEventTitle: 'Math Homework',
        }),
      })
    })

    it('does not auto-activate when autoActivate is disabled', async () => {
      const currentEvent = {
        id: 'event-1',
        title: 'Math Homework',
        startTime: Date.now() - 60000,
        endTime: Date.now() + 3540000,
        isFocusEligible: true,
        matchedKeywords: ['homework'],
        description: null,
        isAllDay: false,
        processed: false,
      }

      mockCalendarState.mockReturnValue({
        ...defaultCalendarState,
        isConnected: true,
        config: { autoActivateFocusMode: false },
        currentFocusEvent: currentEvent,
        events: [currentEvent],
      })

      renderHook(() => useFocusModeWithCalendar({ childId: 'child-1', familyId: 'family-1' }))

      // Wait a bit to ensure no auto-activation
      await new Promise((r) => setTimeout(r, 100))

      expect(mockUpdateDoc).not.toHaveBeenCalled()
    })

    it('does not auto-activate when focus mode is already active', async () => {
      const currentEvent = {
        id: 'event-1',
        title: 'Math Homework',
        startTime: Date.now() - 60000,
        endTime: Date.now() + 3540000,
        isFocusEligible: true,
        matchedKeywords: ['homework'],
        description: null,
        isAllDay: false,
        processed: false,
      }

      mockFocusModeState.mockReturnValue({
        ...defaultFocusModeState,
        isActive: true,
        currentSession: { id: 'session-1', status: 'active' },
      })

      mockCalendarState.mockReturnValue({
        ...defaultCalendarState,
        isConnected: true,
        config: { autoActivateFocusMode: true },
        currentFocusEvent: currentEvent,
        events: [currentEvent],
      })

      renderHook(() => useFocusModeWithCalendar({ childId: 'child-1', familyId: 'family-1' }))

      await new Promise((r) => setTimeout(r, 100))

      expect(mockUpdateDoc).not.toHaveBeenCalled()
    })
  })

  describe('AC4: Manual Override', () => {
    it('allows manual stop of calendar-triggered focus mode', async () => {
      const calendarSession = {
        id: 'session-1',
        childId: 'child-1',
        familyId: 'family-1',
        status: 'active',
        durationType: 'untilOff',
        durationMs: 3600000,
        startedAt: Date.now() - 600000, // 10 min ago
        endedAt: null,
        completedFully: false,
        createdAt: Date.now() - 600000,
        updatedAt: Date.now() - 600000,
        triggeredBy: 'calendar',
        calendarEventId: 'event-1',
        calendarEventTitle: 'Math Homework',
      }

      mockFocusModeState.mockReturnValue({
        ...defaultFocusModeState,
        isActive: true,
        currentSession: calendarSession,
        totalFocusTimeToday: 0,
      })

      mockCalendarState.mockReturnValue({
        ...defaultCalendarState,
        isConnected: true,
        config: { autoActivateFocusMode: true },
        events: [],
      })

      const { result } = renderHook(() =>
        useFocusModeWithCalendar({ childId: 'child-1', familyId: 'family-1' })
      )

      expect(result.current.isCalendarTriggered).toBe(true)

      await act(async () => {
        await result.current.stopFocusMode()
      })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        'mock-doc-ref',
        expect.objectContaining({
          isActive: false,
          'currentSession.status': 'inactive',
          'currentSession.completedFully': false,
        })
      )
    })

    it('calls base stopFocusMode for manual sessions', async () => {
      const manualSession = {
        id: 'session-1',
        status: 'active',
        durationType: 'oneHour',
        // No triggeredBy field means manual
      }

      const mockStopFocusMode = vi.fn()
      mockFocusModeState.mockReturnValue({
        ...defaultFocusModeState,
        isActive: true,
        currentSession: manualSession,
        stopFocusMode: mockStopFocusMode,
      })

      const { result } = renderHook(() =>
        useFocusModeWithCalendar({ childId: 'child-1', familyId: 'family-1' })
      )

      expect(result.current.isCalendarTriggered).toBe(false)

      await act(async () => {
        await result.current.stopFocusMode()
      })

      expect(mockStopFocusMode).toHaveBeenCalled()
    })
  })

  describe('calendar status exposure', () => {
    it('exposes calendar connection status', () => {
      mockCalendarState.mockReturnValue({
        ...defaultCalendarState,
        isConnected: true,
      })

      const { result } = renderHook(() =>
        useFocusModeWithCalendar({ childId: 'child-1', familyId: 'family-1' })
      )

      expect(result.current.isCalendarConnected).toBe(true)
    })

    it('exposes current calendar event', () => {
      const currentEvent = {
        id: 'event-1',
        title: 'Study Session',
        startTime: Date.now() - 60000,
        endTime: Date.now() + 3540000,
        isFocusEligible: true,
        matchedKeywords: ['study'],
        description: null,
        isAllDay: false,
        processed: false,
      }

      mockCalendarState.mockReturnValue({
        ...defaultCalendarState,
        currentFocusEvent: currentEvent,
      })

      const { result } = renderHook(() =>
        useFocusModeWithCalendar({ childId: 'child-1', familyId: 'family-1' })
      )

      expect(result.current.currentCalendarEvent).toEqual(currentEvent)
    })

    it('exposes upcoming calendar event', () => {
      const upcomingEvent = {
        id: 'event-2',
        title: 'Homework Time',
        startTime: Date.now() + 1800000, // 30 min from now
        endTime: Date.now() + 5400000,
        isFocusEligible: true,
        matchedKeywords: ['homework'],
        description: null,
        isAllDay: false,
        processed: false,
      }

      mockCalendarState.mockReturnValue({
        ...defaultCalendarState,
        upcomingFocusEvent: upcomingEvent,
      })

      const { result } = renderHook(() =>
        useFocusModeWithCalendar({ childId: 'child-1', familyId: 'family-1' })
      )

      expect(result.current.upcomingCalendarEvent).toEqual(upcomingEvent)
    })
  })
})
