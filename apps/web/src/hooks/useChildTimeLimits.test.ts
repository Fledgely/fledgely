/**
 * useChildTimeLimits Hook Tests - Story 30.2
 *
 * Tests for time limits hook functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useChildTimeLimits } from './useChildTimeLimits'

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  onSnapshot: vi.fn((ref, onSuccess) => {
    // Simulate document not existing initially
    onSuccess({
      exists: () => false,
      data: () => null,
    })
    return vi.fn() // unsubscribe
  }),
  setDoc: vi.fn(),
  getDoc: vi.fn().mockResolvedValue({
    exists: () => false,
    data: () => null,
  }),
}))

vi.mock('../lib/firebase', () => ({
  getFirestoreDb: vi.fn(() => ({})),
}))

describe('useChildTimeLimits Hook - Story 30.2', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial state', () => {
    it('returns default limits when familyId and childId are provided', async () => {
      const { result } = renderHook(() =>
        useChildTimeLimits({
          familyId: 'family-123',
          childId: 'child-456',
          enabled: true,
        })
      )

      // Mock triggers immediately, so loading is already false with defaults
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      expect(result.current.limits).toEqual({
        weekdayMinutes: 120,
        weekendMinutes: 180,
        scheduleType: 'weekdays',
        unlimited: false,
      })
    })

    it('returns loading false when disabled', () => {
      const { result } = renderHook(() =>
        useChildTimeLimits({
          familyId: 'family-123',
          childId: 'child-456',
          enabled: false,
        })
      )

      expect(result.current.loading).toBe(false)
      expect(result.current.limits).toBeNull()
    })

    it('returns loading false when familyId is null', () => {
      const { result } = renderHook(() =>
        useChildTimeLimits({
          familyId: null,
          childId: 'child-456',
          enabled: true,
        })
      )

      expect(result.current.loading).toBe(false)
      expect(result.current.limits).toBeNull()
    })

    it('returns loading false when childId is null', () => {
      const { result } = renderHook(() =>
        useChildTimeLimits({
          familyId: 'family-123',
          childId: null,
          enabled: true,
        })
      )

      expect(result.current.loading).toBe(false)
      expect(result.current.limits).toBeNull()
    })
  })

  describe('Default limits', () => {
    it('uses default limits when document does not exist', async () => {
      const { result } = renderHook(() =>
        useChildTimeLimits({
          familyId: 'family-123',
          childId: 'child-456',
          enabled: true,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.limits).toEqual({
        weekdayMinutes: 120,
        weekendMinutes: 180,
        scheduleType: 'weekdays',
        unlimited: false,
      })
    })
  })

  describe('hasChanges', () => {
    it('returns false when limits match original', async () => {
      const { result } = renderHook(() =>
        useChildTimeLimits({
          familyId: 'family-123',
          childId: 'child-456',
          enabled: true,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.hasChanges).toBe(false)
    })
  })

  describe('saveLimits', () => {
    it('returns error when familyId is missing', async () => {
      const { result } = renderHook(() =>
        useChildTimeLimits({
          familyId: null,
          childId: 'child-456',
          enabled: true,
        })
      )

      const saveResult = await result.current.saveLimits({
        weekdayMinutes: 60,
        weekendMinutes: 120,
        scheduleType: 'weekdays',
        unlimited: false,
      })

      expect(saveResult.success).toBe(false)
      expect(saveResult.error).toBe('Missing family or child ID')
    })

    it('returns error when childId is missing', async () => {
      const { result } = renderHook(() =>
        useChildTimeLimits({
          familyId: 'family-123',
          childId: null,
          enabled: true,
        })
      )

      const saveResult = await result.current.saveLimits({
        weekdayMinutes: 60,
        weekendMinutes: 120,
        scheduleType: 'weekdays',
        unlimited: false,
      })

      expect(saveResult.success).toBe(false)
      expect(saveResult.error).toBe('Missing family or child ID')
    })
  })

  describe('AC5: Cross-device limit', () => {
    it('saves dailyTotal which applies across all devices', async () => {
      const { setDoc } = await import('firebase/firestore')

      const { result } = renderHook(() =>
        useChildTimeLimits({
          familyId: 'family-123',
          childId: 'child-456',
          enabled: true,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await result.current.saveLimits({
        weekdayMinutes: 90,
        weekendMinutes: 150,
        scheduleType: 'school_days',
        unlimited: false,
      })

      // Verify setDoc was called with dailyTotal
      expect(setDoc).toHaveBeenCalled()
      const callArgs = (setDoc as ReturnType<typeof vi.fn>).mock.calls[0]
      const savedData = callArgs[1]

      expect(savedData.dailyTotal).toBeDefined()
      expect(savedData.dailyTotal.scheduleType).toBe('school_days')
      expect(savedData.dailyTotal.weekdayMinutes).toBe(90)
      expect(savedData.dailyTotal.weekendMinutes).toBe(150)
    })
  })
})
