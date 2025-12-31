/**
 * Flag Throttle Service Tests
 *
 * Story 21.3: False Positive Throttling - AC1, AC2, AC6
 *
 * Tests for flag alert throttling logic.
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock firebase-admin/firestore
const mockSet = vi.fn().mockResolvedValue(undefined)
const mockGet = vi.fn()

// Create a mock that properly chains collection/doc calls
const createMockRef = () => {
  const ref: Record<string, unknown> = {}
  ref.collection = vi.fn().mockReturnValue(ref)
  ref.doc = vi.fn().mockReturnValue({
    get: mockGet,
    set: mockSet,
    collection: vi.fn().mockReturnValue(ref),
  })
  ref.get = mockGet
  ref.set = mockSet
  return ref
}

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => createMockRef()),
  FieldValue: {
    increment: vi.fn((n: number) => ({ _increment: n })),
    arrayUnion: vi.fn((...items: string[]) => ({ _arrayUnion: items })),
  },
}))

describe('flagThrottle (Story 21.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mockGet to remove any persistent mockResolvedValue from previous tests
    mockGet.mockReset()
  })

  describe('getTodayDateString', () => {
    it('returns date in YYYY-MM-DD format', async () => {
      const { getTodayDateString } = await import('./flagThrottle')
      const dateString = getTodayDateString()
      expect(dateString).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it("returns today's date", async () => {
      const { getTodayDateString } = await import('./flagThrottle')
      const dateString = getTodayDateString()
      const expected = new Date().toISOString().split('T')[0]
      expect(dateString).toBe(expected)
    })
  })

  describe('getFamilyThrottleLevel', () => {
    it('returns standard as default when family not found', async () => {
      mockGet.mockResolvedValue({ exists: false })

      const { getFamilyThrottleLevel, _resetDbForTesting } = await import('./flagThrottle')
      _resetDbForTesting()

      const level = await getFamilyThrottleLevel('family-123')
      expect(level).toBe('standard')
    })

    it('returns standard when settings not configured', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({}),
      })

      const { getFamilyThrottleLevel, _resetDbForTesting } = await import('./flagThrottle')
      _resetDbForTesting()

      const level = await getFamilyThrottleLevel('family-123')
      expect(level).toBe('standard')
    })

    it('returns configured throttle level', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ settings: { flagThrottleLevel: 'minimal' } }),
      })

      const { getFamilyThrottleLevel, _resetDbForTesting } = await import('./flagThrottle')
      _resetDbForTesting()

      const level = await getFamilyThrottleLevel('family-123')
      expect(level).toBe('minimal')
    })

    it('returns standard for invalid throttle level', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ settings: { flagThrottleLevel: 'invalid' } }),
      })

      const { getFamilyThrottleLevel, _resetDbForTesting } = await import('./flagThrottle')
      _resetDbForTesting()

      const level = await getFamilyThrottleLevel('family-123')
      expect(level).toBe('standard')
    })
  })

  describe('getThrottleState', () => {
    it('returns fresh state when no existing state', async () => {
      mockGet.mockResolvedValue({ exists: false })

      const { getThrottleState, _resetDbForTesting, getTodayDateString } =
        await import('./flagThrottle')
      _resetDbForTesting()

      const state = await getThrottleState('family-123', 'child-456')
      expect(state.childId).toBe('child-456')
      expect(state.familyId).toBe('family-123')
      expect(state.date).toBe(getTodayDateString())
      expect(state.alertsSentToday).toBe(0)
      expect(state.throttledToday).toBe(0)
      expect(state.alertedFlagIds).toEqual([])
      expect(state.severityCounts).toEqual({ high: 0, medium: 0, low: 0 })
    })

    it('returns existing state if from today', async () => {
      const { getTodayDateString, getThrottleState, _resetDbForTesting } =
        await import('./flagThrottle')
      _resetDbForTesting()

      const today = getTodayDateString()
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          childId: 'child-456',
          familyId: 'family-123',
          date: today,
          alertsSentToday: 2,
          throttledToday: 1,
          alertedFlagIds: ['flag-1', 'flag-2'],
          severityCounts: { high: 1, medium: 1, low: 0 },
        }),
      })

      const state = await getThrottleState('family-123', 'child-456')
      expect(state.alertsSentToday).toBe(2)
      expect(state.throttledToday).toBe(1)
      expect(state.alertedFlagIds).toEqual(['flag-1', 'flag-2'])
    })

    it('returns fresh state if existing state is from different day', async () => {
      const { getThrottleState, _resetDbForTesting, getTodayDateString } =
        await import('./flagThrottle')
      _resetDbForTesting()

      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          childId: 'child-456',
          familyId: 'family-123',
          date: '2023-01-01', // Old date
          alertsSentToday: 5,
          throttledToday: 3,
          alertedFlagIds: ['old-flag'],
          severityCounts: { high: 3, medium: 2, low: 0 },
        }),
      })

      const state = await getThrottleState('family-123', 'child-456')
      expect(state.date).toBe(getTodayDateString())
      expect(state.alertsSentToday).toBe(0) // Reset
      expect(state.throttledToday).toBe(0) // Reset
      expect(state.alertedFlagIds).toEqual([]) // Reset
    })
  })

  describe('shouldAlertForFlag', () => {
    it('always returns true for "all" throttle level', async () => {
      // Mock family with 'all' level
      mockGet
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ settings: { flagThrottleLevel: 'all' } }),
        })
        .mockResolvedValueOnce({ exists: false })

      const { shouldAlertForFlag, _resetDbForTesting } = await import('./flagThrottle')
      _resetDbForTesting()

      const result = await shouldAlertForFlag('family-123', 'child-456', 'low')
      expect(result).toBe(true)
    })

    it('returns true when under threshold', async () => {
      const { getTodayDateString, shouldAlertForFlag, _resetDbForTesting } =
        await import('./flagThrottle')
      _resetDbForTesting()

      // Mock family with standard level (3/day)
      mockGet
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ settings: { flagThrottleLevel: 'standard' } }),
        })
        // Mock throttle state with 2 alerts sent
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            childId: 'child-456',
            familyId: 'family-123',
            date: getTodayDateString(),
            alertsSentToday: 2,
            throttledToday: 0,
            alertedFlagIds: ['flag-1', 'flag-2'],
            severityCounts: { high: 1, medium: 1, low: 0 },
          }),
        })

      const result = await shouldAlertForFlag('family-123', 'child-456', 'medium')
      expect(result).toBe(true)
    })

    it('returns false when at threshold with no lower priority to bump', async () => {
      const { getTodayDateString, shouldAlertForFlag, _resetDbForTesting } =
        await import('./flagThrottle')
      _resetDbForTesting()

      // Mock family with standard level (3/day)
      mockGet
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ settings: { flagThrottleLevel: 'standard' } }),
        })
        // Mock throttle state with 3 alerts sent, all high
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            childId: 'child-456',
            familyId: 'family-123',
            date: getTodayDateString(),
            alertsSentToday: 3,
            throttledToday: 0,
            alertedFlagIds: ['flag-1', 'flag-2', 'flag-3'],
            severityCounts: { high: 3, medium: 0, low: 0 },
          }),
        })

      const result = await shouldAlertForFlag('family-123', 'child-456', 'medium')
      expect(result).toBe(false)
    })

    it('returns true for high severity when low severity alerts exist at threshold', async () => {
      const { getTodayDateString, shouldAlertForFlag, _resetDbForTesting } =
        await import('./flagThrottle')
      _resetDbForTesting()

      // Mock family with standard level (3/day)
      mockGet
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ settings: { flagThrottleLevel: 'standard' } }),
        })
        // Mock throttle state with 3 alerts, one is low
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            childId: 'child-456',
            familyId: 'family-123',
            date: getTodayDateString(),
            alertsSentToday: 3,
            throttledToday: 0,
            alertedFlagIds: ['flag-1', 'flag-2', 'flag-3'],
            severityCounts: { high: 1, medium: 1, low: 1 },
          }),
        })

      const result = await shouldAlertForFlag('family-123', 'child-456', 'high')
      expect(result).toBe(true)
    })

    it('returns true for medium severity when low severity alerts exist at threshold', async () => {
      const { getTodayDateString, shouldAlertForFlag, _resetDbForTesting } =
        await import('./flagThrottle')
      _resetDbForTesting()

      // Mock family with minimal level (1/day)
      mockGet
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ settings: { flagThrottleLevel: 'minimal' } }),
        })
        // Mock throttle state with 1 low alert
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            childId: 'child-456',
            familyId: 'family-123',
            date: getTodayDateString(),
            alertsSentToday: 1,
            throttledToday: 0,
            alertedFlagIds: ['flag-1'],
            severityCounts: { high: 0, medium: 0, low: 1 },
          }),
        })

      const result = await shouldAlertForFlag('family-123', 'child-456', 'medium')
      expect(result).toBe(true)
    })

    it('returns false for duplicate flag ID', async () => {
      const { getTodayDateString, shouldAlertForFlag, _resetDbForTesting } =
        await import('./flagThrottle')
      _resetDbForTesting()

      mockGet
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ settings: { flagThrottleLevel: 'standard' } }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            childId: 'child-456',
            familyId: 'family-123',
            date: getTodayDateString(),
            alertsSentToday: 1,
            throttledToday: 0,
            alertedFlagIds: ['existing-flag'],
            severityCounts: { high: 1, medium: 0, low: 0 },
          }),
        })

      const result = await shouldAlertForFlag('family-123', 'child-456', 'high', 'existing-flag')
      expect(result).toBe(false)
    })
  })

  describe('recordFlagAlert', () => {
    it('creates fresh state when no state exists', async () => {
      // When no state exists, getRawThrottleStateDate returns null
      // So recordFlagAlert creates a fresh state (no merge)
      mockGet.mockResolvedValue({ exists: false })

      const { recordFlagAlert, _resetDbForTesting, getTodayDateString } =
        await import('./flagThrottle')
      _resetDbForTesting()

      await recordFlagAlert('family-123', 'child-456', 'flag-1', 'high')

      expect(mockSet).toHaveBeenCalledWith({
        childId: 'child-456',
        familyId: 'family-123',
        date: getTodayDateString(),
        alertsSentToday: 1,
        throttledToday: 0,
        alertedFlagIds: ['flag-1'],
        severityCounts: { high: 1, medium: 0, low: 0 },
      })
    })

    it('updates existing state from today with merge', async () => {
      const { getTodayDateString, recordFlagAlert, _resetDbForTesting } =
        await import('./flagThrottle')
      _resetDbForTesting()

      const today = getTodayDateString()
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          childId: 'child-456',
          familyId: 'family-123',
          date: today,
          alertsSentToday: 1,
          throttledToday: 0,
          alertedFlagIds: ['flag-1'],
          severityCounts: { high: 1, medium: 0, low: 0 },
        }),
      })

      await recordFlagAlert('family-123', 'child-456', 'flag-2', 'medium')

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          alertsSentToday: { _increment: 1 },
          alertedFlagIds: { _arrayUnion: ['flag-2'] },
          'severityCounts.medium': { _increment: 1 },
        }),
        { merge: true }
      )
    })

    it('creates fresh state when existing state is from different day', async () => {
      // When state exists but is from a different day, we create a fresh state (no merge)
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          childId: 'child-456',
          familyId: 'family-123',
          date: '2023-01-01', // Old date
          alertsSentToday: 5,
          throttledToday: 3,
          alertedFlagIds: ['old-flag'],
          severityCounts: { high: 3, medium: 2, low: 0 },
        }),
      })

      const { recordFlagAlert, _resetDbForTesting, getTodayDateString } =
        await import('./flagThrottle')
      _resetDbForTesting()

      await recordFlagAlert('family-123', 'child-456', 'flag-1', 'low')

      expect(mockSet).toHaveBeenCalledWith({
        childId: 'child-456',
        familyId: 'family-123',
        date: getTodayDateString(),
        alertsSentToday: 1,
        throttledToday: 0,
        alertedFlagIds: ['flag-1'],
        severityCounts: { high: 0, medium: 0, low: 1 },
      })
    })
  })

  describe('recordThrottledFlag', () => {
    it('increments throttled count', async () => {
      const { getTodayDateString, recordThrottledFlag, _resetDbForTesting } =
        await import('./flagThrottle')
      _resetDbForTesting()

      const today = getTodayDateString()
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          childId: 'child-456',
          familyId: 'family-123',
          date: today,
          alertsSentToday: 3,
          throttledToday: 1,
          alertedFlagIds: [],
          severityCounts: { high: 0, medium: 0, low: 0 },
        }),
      })

      await recordThrottledFlag('family-123', 'child-456')

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          throttledToday: { _increment: 1 },
        }),
        { merge: true }
      )
    })
  })

  describe('getThrottledFlagCount', () => {
    it('returns 0 when no state exists', async () => {
      mockGet.mockResolvedValue({ exists: false })

      const { getThrottledFlagCount, _resetDbForTesting } = await import('./flagThrottle')
      _resetDbForTesting()

      const count = await getThrottledFlagCount('family-123', 'child-456')
      expect(count).toBe(0)
    })

    it('returns 0 when state is from different day', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          childId: 'child-456',
          familyId: 'family-123',
          date: '2023-01-01',
          throttledToday: 5,
        }),
      })

      const { getThrottledFlagCount, _resetDbForTesting } = await import('./flagThrottle')
      _resetDbForTesting()

      const count = await getThrottledFlagCount('family-123', 'child-456')
      expect(count).toBe(0)
    })

    it('returns throttled count from today', async () => {
      const { getTodayDateString, getThrottledFlagCount, _resetDbForTesting } =
        await import('./flagThrottle')
      _resetDbForTesting()

      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          childId: 'child-456',
          familyId: 'family-123',
          date: getTodayDateString(),
          throttledToday: 3,
          alertsSentToday: 0,
          alertedFlagIds: [],
          severityCounts: { high: 0, medium: 0, low: 0 },
        }),
      })

      const count = await getThrottledFlagCount('family-123', 'child-456')
      expect(count).toBe(3)
    })
  })
})
