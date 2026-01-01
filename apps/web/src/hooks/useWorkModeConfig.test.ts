/**
 * useWorkModeConfig Hook Tests - Story 33.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useWorkModeConfig } from './useWorkModeConfig'

// Mock Firebase
const mockOnSnapshot = vi.fn()
const mockSetDoc = vi.fn()
const mockUpdateDoc = vi.fn()
const mockArrayUnion = vi.fn((value) => ({ __arrayUnion: value }))
const mockArrayRemove = vi.fn((value) => ({ __arrayRemove: value }))
const mockDoc = vi.fn()

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  onSnapshot: (
    ref: unknown,
    onNext: (snapshot: { exists: () => boolean; data: () => unknown }) => void,
    onError?: (error: Error) => void
  ) => mockOnSnapshot(ref, onNext, onError),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  arrayUnion: (value: unknown) => mockArrayUnion(value),
  arrayRemove: (value: unknown) => mockArrayRemove(value),
}))

vi.mock('../lib/firebase', () => ({
  getFirestoreDb: vi.fn(() => ({})),
}))

describe('useWorkModeConfig - Story 33.3', () => {
  const mockChildId = 'child-1'
  const mockFamilyId = 'family-1'
  const mockParentUid = 'parent-1'

  const mockConfig = {
    childId: mockChildId,
    familyId: mockFamilyId,
    schedules: [],
    useDefaultWorkApps: true,
    customWorkApps: [],
    pauseScreenshots: true,
    suspendTimeLimits: true,
    allowManualActivation: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateDoc.mockResolvedValue(undefined)
    mockSetDoc.mockResolvedValue(undefined)
    mockDoc.mockReturnValue({ id: 'mock-doc' })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    it('returns loading state initially', () => {
      mockOnSnapshot.mockImplementation(() => () => {})

      const { result } = renderHook(() =>
        useWorkModeConfig({
          childId: mockChildId,
          familyId: mockFamilyId,
          parentUid: mockParentUid,
        })
      )

      expect(result.current.loading).toBe(true)
      expect(result.current.config).toBeNull()
    })

    it('loads existing config from Firestore', async () => {
      mockOnSnapshot.mockImplementation((_ref, onNext) => {
        onNext({
          exists: () => true,
          data: () => mockConfig,
        })
        return () => {}
      })

      const { result } = renderHook(() =>
        useWorkModeConfig({
          childId: mockChildId,
          familyId: mockFamilyId,
          parentUid: mockParentUid,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.config).toEqual(mockConfig)
      expect(result.current.error).toBeNull()
    })

    it('creates default config if none exists', async () => {
      mockOnSnapshot.mockImplementation((_ref, onNext) => {
        onNext({
          exists: () => false,
          data: () => null,
        })
        return () => {}
      })

      const { result } = renderHook(() =>
        useWorkModeConfig({
          childId: mockChildId,
          familyId: mockFamilyId,
          parentUid: mockParentUid,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockSetDoc).toHaveBeenCalled()
    })

    it('handles Firestore errors gracefully', async () => {
      mockOnSnapshot.mockImplementation((_ref, _onNext, onError) => {
        if (onError) onError(new Error('Firestore error'))
        return () => {}
      })

      const { result } = renderHook(() =>
        useWorkModeConfig({
          childId: mockChildId,
          familyId: mockFamilyId,
          parentUid: mockParentUid,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe('Failed to load work mode configuration')
    })

    it('returns empty state when childId is null', () => {
      const { result } = renderHook(() =>
        useWorkModeConfig({
          childId: null,
          familyId: mockFamilyId,
          parentUid: mockParentUid,
        })
      )

      expect(result.current.loading).toBe(false)
      expect(result.current.config).toBeNull()
    })
  })

  describe('schedule management', () => {
    beforeEach(() => {
      mockOnSnapshot.mockImplementation((_ref, onNext) => {
        onNext({
          exists: () => true,
          data: () => mockConfig,
        })
        return () => {}
      })
    })

    it('adds a new schedule', async () => {
      const { result } = renderHook(() =>
        useWorkModeConfig({
          childId: mockChildId,
          familyId: mockFamilyId,
          parentUid: mockParentUid,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const newSchedule = {
        name: 'Coffee Shop',
        days: ['saturday', 'sunday'] as const,
        startTime: '10:00',
        endTime: '16:00',
        isEnabled: true,
      }

      await act(async () => {
        const scheduleId = await result.current.addSchedule(newSchedule)
        expect(scheduleId).toMatch(/^schedule-/)
      })

      expect(mockUpdateDoc).toHaveBeenCalled()
    })

    it('removes a schedule', async () => {
      const configWithSchedule = {
        ...mockConfig,
        schedules: [
          {
            id: 'schedule-1',
            name: 'Coffee Shop',
            days: ['saturday'],
            startTime: '10:00',
            endTime: '16:00',
            isEnabled: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
      }

      mockOnSnapshot.mockImplementation((_ref, onNext) => {
        onNext({
          exists: () => true,
          data: () => configWithSchedule,
        })
        return () => {}
      })

      const { result } = renderHook(() =>
        useWorkModeConfig({
          childId: mockChildId,
          familyId: mockFamilyId,
          parentUid: mockParentUid,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.removeSchedule('schedule-1')
      })

      expect(mockUpdateDoc).toHaveBeenCalled()
      expect(mockArrayRemove).toHaveBeenCalled()
    })

    it('toggles schedule enabled state', async () => {
      const configWithSchedule = {
        ...mockConfig,
        schedules: [
          {
            id: 'schedule-1',
            name: 'Coffee Shop',
            days: ['saturday'],
            startTime: '10:00',
            endTime: '16:00',
            isEnabled: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
      }

      mockOnSnapshot.mockImplementation((_ref, onNext) => {
        onNext({
          exists: () => true,
          data: () => configWithSchedule,
        })
        return () => {}
      })

      const { result } = renderHook(() =>
        useWorkModeConfig({
          childId: mockChildId,
          familyId: mockFamilyId,
          parentUid: mockParentUid,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.toggleScheduleEnabled('schedule-1')
      })

      expect(mockUpdateDoc).toHaveBeenCalled()
    })
  })

  describe('work app management', () => {
    beforeEach(() => {
      mockOnSnapshot.mockImplementation((_ref, onNext) => {
        onNext({
          exists: () => true,
          data: () => mockConfig,
        })
        return () => {}
      })
    })

    it('adds a work app to whitelist', async () => {
      const { result } = renderHook(() =>
        useWorkModeConfig({
          childId: mockChildId,
          familyId: mockFamilyId,
          parentUid: mockParentUid,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.addWorkApp('customapp.com', 'Custom App')
      })

      expect(mockUpdateDoc).toHaveBeenCalled()
      expect(mockArrayUnion).toHaveBeenCalledWith(
        expect.objectContaining({
          pattern: 'customapp.com',
          name: 'Custom App',
        })
      )
    })

    it('removes a work app from whitelist', async () => {
      const configWithApp = {
        ...mockConfig,
        customWorkApps: [
          {
            pattern: 'customapp.com',
            name: 'Custom App',
            isWildcard: false,
            addedAt: Date.now(),
            addedByUid: mockParentUid,
          },
        ],
      }

      mockOnSnapshot.mockImplementation((_ref, onNext) => {
        onNext({
          exists: () => true,
          data: () => configWithApp,
        })
        return () => {}
      })

      const { result } = renderHook(() =>
        useWorkModeConfig({
          childId: mockChildId,
          familyId: mockFamilyId,
          parentUid: mockParentUid,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.removeWorkApp('customapp.com')
      })

      expect(mockUpdateDoc).toHaveBeenCalled()
      expect(mockArrayRemove).toHaveBeenCalled()
    })
  })

  describe('config toggles', () => {
    beforeEach(() => {
      mockOnSnapshot.mockImplementation((_ref, onNext) => {
        onNext({
          exists: () => true,
          data: () => mockConfig,
        })
        return () => {}
      })
    })

    it('toggles default work apps', async () => {
      const { result } = renderHook(() =>
        useWorkModeConfig({
          childId: mockChildId,
          familyId: mockFamilyId,
          parentUid: mockParentUid,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.toggleDefaultWorkApps(false)
      })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          useDefaultWorkApps: false,
        })
      )
    })

    it('toggles pause screenshots', async () => {
      const { result } = renderHook(() =>
        useWorkModeConfig({
          childId: mockChildId,
          familyId: mockFamilyId,
          parentUid: mockParentUid,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.togglePauseScreenshots(false)
      })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          pauseScreenshots: false,
        })
      )
    })

    it('toggles suspend time limits', async () => {
      const { result } = renderHook(() =>
        useWorkModeConfig({
          childId: mockChildId,
          familyId: mockFamilyId,
          parentUid: mockParentUid,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.toggleSuspendTimeLimits(false)
      })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          suspendTimeLimits: false,
        })
      )
    })

    it('toggles allow manual activation', async () => {
      const { result } = renderHook(() =>
        useWorkModeConfig({
          childId: mockChildId,
          familyId: mockFamilyId,
          parentUid: mockParentUid,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.toggleAllowManualActivation(false)
      })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          allowManualActivation: false,
        })
      )
    })
  })

  describe('effectiveWorkApps', () => {
    it('includes default apps when enabled', async () => {
      mockOnSnapshot.mockImplementation((_ref, onNext) => {
        onNext({
          exists: () => true,
          data: () => mockConfig,
        })
        return () => {}
      })

      const { result } = renderHook(() =>
        useWorkModeConfig({
          childId: mockChildId,
          familyId: mockFamilyId,
          parentUid: mockParentUid,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.effectiveWorkApps.length).toBeGreaterThan(0)
      expect(result.current.effectiveWorkApps.some((app) => app.pattern === 'slack.com')).toBe(true)
      expect(result.current.effectiveWorkApps.every((app) => app.isDefault)).toBe(true)
    })

    it('excludes default apps when disabled', async () => {
      mockOnSnapshot.mockImplementation((_ref, onNext) => {
        onNext({
          exists: () => true,
          data: () => ({
            ...mockConfig,
            useDefaultWorkApps: false,
          }),
        })
        return () => {}
      })

      const { result } = renderHook(() =>
        useWorkModeConfig({
          childId: mockChildId,
          familyId: mockFamilyId,
          parentUid: mockParentUid,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.effectiveWorkApps.length).toBe(0)
    })

    it('includes custom apps', async () => {
      mockOnSnapshot.mockImplementation((_ref, onNext) => {
        onNext({
          exists: () => true,
          data: () => ({
            ...mockConfig,
            useDefaultWorkApps: false,
            customWorkApps: [
              {
                pattern: 'customapp.com',
                name: 'Custom App',
                isWildcard: false,
                addedAt: Date.now(),
                addedByUid: mockParentUid,
              },
            ],
          }),
        })
        return () => {}
      })

      const { result } = renderHook(() =>
        useWorkModeConfig({
          childId: mockChildId,
          familyId: mockFamilyId,
          parentUid: mockParentUid,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.effectiveWorkApps.length).toBe(1)
      expect(result.current.effectiveWorkApps[0].pattern).toBe('customapp.com')
      expect(result.current.effectiveWorkApps[0].isDefault).toBe(false)
    })

    it('deduplicates apps by pattern', async () => {
      mockOnSnapshot.mockImplementation((_ref, onNext) => {
        onNext({
          exists: () => true,
          data: () => ({
            ...mockConfig,
            useDefaultWorkApps: true,
            customWorkApps: [
              {
                pattern: 'slack.com', // Duplicate of default
                name: 'Slack Custom',
                isWildcard: false,
                addedAt: Date.now(),
                addedByUid: mockParentUid,
              },
            ],
          }),
        })
        return () => {}
      })

      const { result } = renderHook(() =>
        useWorkModeConfig({
          childId: mockChildId,
          familyId: mockFamilyId,
          parentUid: mockParentUid,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Count how many times slack.com appears
      const slackApps = result.current.effectiveWorkApps.filter(
        (app) => app.pattern === 'slack.com'
      )
      expect(slackApps.length).toBe(1)
      expect(slackApps[0].isDefault).toBe(true) // Default takes precedence
    })
  })
})
