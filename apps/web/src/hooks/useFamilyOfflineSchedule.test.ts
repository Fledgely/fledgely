/**
 * useFamilyOfflineSchedule Hook Tests - Story 32.1
 *
 * Tests for family offline schedule hook functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// Hoist mocks to avoid initialization issues
const { mockSetDoc, mockGetDoc } = vi.hoisted(() => ({
  mockSetDoc: vi.fn().mockResolvedValue(undefined),
  mockGetDoc: vi.fn().mockResolvedValue({
    exists: () => false,
    data: () => null,
  }),
}))

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
  setDoc: mockSetDoc,
  getDoc: mockGetDoc,
}))

vi.mock('../lib/firebase', () => ({
  getFirestoreDb: vi.fn(() => ({})),
}))

// Mock the shared package exports that we need
vi.mock('@fledgely/shared', async () => {
  const actual = await vi.importActual('@fledgely/shared')
  return {
    ...actual,
    OFFLINE_SCHEDULE_PRESETS: {
      dinner_time: {
        weekday: { startTime: '18:00', endTime: '19:00' },
        weekend: { startTime: '18:00', endTime: '19:00' },
      },
      bedtime: {
        weekday: { startTime: '21:00', endTime: '07:00' },
        weekend: { startTime: '22:00', endTime: '08:00' },
      },
    },
  }
})

import { useFamilyOfflineSchedule } from './useFamilyOfflineSchedule'

describe('useFamilyOfflineSchedule Hook - Story 32.1', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial state', () => {
    it('returns default schedule when familyId is provided', async () => {
      const { result } = renderHook(() =>
        useFamilyOfflineSchedule({
          familyId: 'family-123',
          enabled: true,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.schedule).toEqual({
        enabled: false,
        preset: 'custom',
        weekdayStart: '21:00',
        weekdayEnd: '07:00',
        weekendStart: '22:00',
        weekendEnd: '08:00',
        appliesToParents: true,
        timezone: expect.any(String),
      })
    })

    it('returns loading false when disabled', () => {
      const { result } = renderHook(() =>
        useFamilyOfflineSchedule({
          familyId: 'family-123',
          enabled: false,
        })
      )

      expect(result.current.loading).toBe(false)
      expect(result.current.schedule).toBeNull()
    })

    it('returns loading false when familyId is null', () => {
      const { result } = renderHook(() =>
        useFamilyOfflineSchedule({
          familyId: null,
          enabled: true,
        })
      )

      expect(result.current.loading).toBe(false)
      expect(result.current.schedule).toBeNull()
    })
  })

  describe('Presets - AC3', () => {
    it('applies dinner_time preset correctly', async () => {
      const { result } = renderHook(() =>
        useFamilyOfflineSchedule({
          familyId: 'family-123',
          enabled: true,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const dinnerPreset = result.current.applyPreset('dinner_time')

      expect(dinnerPreset.preset).toBe('dinner_time')
      expect(dinnerPreset.weekdayStart).toBe('18:00')
      expect(dinnerPreset.weekdayEnd).toBe('19:00')
      expect(dinnerPreset.weekendStart).toBe('18:00')
      expect(dinnerPreset.weekendEnd).toBe('19:00')
      expect(dinnerPreset.enabled).toBe(true)
    })

    it('applies bedtime preset correctly', async () => {
      const { result } = renderHook(() =>
        useFamilyOfflineSchedule({
          familyId: 'family-123',
          enabled: true,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const bedtimePreset = result.current.applyPreset('bedtime')

      expect(bedtimePreset.preset).toBe('bedtime')
      expect(bedtimePreset.weekdayStart).toBe('21:00')
      expect(bedtimePreset.weekdayEnd).toBe('07:00')
      expect(bedtimePreset.weekendStart).toBe('22:00')
      expect(bedtimePreset.weekendEnd).toBe('08:00')
      expect(bedtimePreset.enabled).toBe(true)
    })
  })

  describe('hasChanges', () => {
    it('returns false when schedule matches original', async () => {
      const { result } = renderHook(() =>
        useFamilyOfflineSchedule({
          familyId: 'family-123',
          enabled: true,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.hasChanges).toBe(false)
    })
  })

  describe('saveSchedule', () => {
    it('returns error when familyId is missing', async () => {
      const { result } = renderHook(() =>
        useFamilyOfflineSchedule({
          familyId: null,
          enabled: true,
        })
      )

      const saveResult = await result.current.saveSchedule({
        enabled: true,
        preset: 'custom',
        weekdayStart: '20:00',
        weekdayEnd: '07:00',
        weekendStart: '21:00',
        weekendEnd: '08:00',
        appliesToParents: true,
        timezone: 'America/New_York',
      })

      expect(saveResult.success).toBe(false)
      expect(saveResult.error).toBe('Missing family ID')
    })

    it('returns saveSchedule function', async () => {
      const { result } = renderHook(() =>
        useFamilyOfflineSchedule({
          familyId: 'family-123',
          enabled: true,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Verify saveSchedule is a function
      expect(typeof result.current.saveSchedule).toBe('function')
    })
  })

  describe('AC4: Applies to all family members', () => {
    it('defaults appliesToParents to true', async () => {
      const { result } = renderHook(() =>
        useFamilyOfflineSchedule({
          familyId: 'family-123',
          enabled: true,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.schedule?.appliesToParents).toBe(true)
    })
  })
})
