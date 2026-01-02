/**
 * useMeetingReminder Hook Tests - Story 34.5.4 Task 4
 *
 * Tests for the meeting reminder hook.
 * AC4: Meeting Reminder (Optional)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useMeetingReminder } from './useMeetingReminder'
import * as familyMeetingReminderService from '@fledgely/shared/services/familyMeetingReminderService'

// Mock the service
vi.mock('@fledgely/shared/services/familyMeetingReminderService', () => ({
  scheduleMeetingReminder: vi.fn(),
  cancelMeetingReminder: vi.fn(),
  getPendingReminders: vi.fn(),
}))

describe('useMeetingReminder - Story 34.5.4', () => {
  const mockProps = {
    familyId: 'family-123',
    createdBy: 'child-456',
    templateId: 'tween-template-001',
    ageTier: 'tween-12-14' as const,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // Initial State Tests
  // ============================================

  describe('Initial State', () => {
    it('should start with loading true', () => {
      vi.mocked(familyMeetingReminderService.getPendingReminders).mockResolvedValueOnce([])

      const { result } = renderHook(() => useMeetingReminder(mockProps))

      expect(result.current.loading).toBe(true)
    })

    it('should start with pendingReminder as null', () => {
      vi.mocked(familyMeetingReminderService.getPendingReminders).mockResolvedValueOnce([])

      const { result } = renderHook(() => useMeetingReminder(mockProps))

      expect(result.current.pendingReminder).toBeNull()
    })

    it('should start with error as null', () => {
      vi.mocked(familyMeetingReminderService.getPendingReminders).mockResolvedValueOnce([])

      const { result } = renderHook(() => useMeetingReminder(mockProps))

      expect(result.current.error).toBeNull()
    })

    it('should start with isScheduling as false', () => {
      vi.mocked(familyMeetingReminderService.getPendingReminders).mockResolvedValueOnce([])

      const { result } = renderHook(() => useMeetingReminder(mockProps))

      expect(result.current.isScheduling).toBe(false)
    })
  })

  // ============================================
  // Load Pending Reminders Tests
  // ============================================

  describe('Load Pending Reminders', () => {
    it('should fetch pending reminders on mount', async () => {
      vi.mocked(familyMeetingReminderService.getPendingReminders).mockResolvedValueOnce([])

      renderHook(() => useMeetingReminder(mockProps))

      await waitFor(() => {
        expect(familyMeetingReminderService.getPendingReminders).toHaveBeenCalledWith('family-123')
      })
    })

    it('should set pendingReminder when found', async () => {
      const mockReminder = {
        id: 'reminder-abc',
        familyId: 'family-123',
        scheduledAt: new Date('2024-01-15T18:00:00Z'),
        createdAt: new Date('2024-01-10T10:00:00Z'),
        createdBy: 'child-456',
        templateId: 'tween-template-001',
        ageTier: 'tween-12-14' as const,
        status: 'pending' as const,
        notificationSentAt: null,
      }

      vi.mocked(familyMeetingReminderService.getPendingReminders).mockResolvedValueOnce([
        mockReminder,
      ])

      const { result } = renderHook(() => useMeetingReminder(mockProps))

      await waitFor(() => {
        expect(result.current.pendingReminder).toEqual(mockReminder)
      })
    })

    it('should set loading to false after fetch', async () => {
      vi.mocked(familyMeetingReminderService.getPendingReminders).mockResolvedValueOnce([])

      const { result } = renderHook(() => useMeetingReminder(mockProps))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    })

    it('should set error on fetch failure', async () => {
      vi.mocked(familyMeetingReminderService.getPendingReminders).mockRejectedValueOnce(
        new Error('Network error')
      )

      const { result } = renderHook(() => useMeetingReminder(mockProps))

      await waitFor(() => {
        expect(result.current.error).not.toBeNull()
      })
    })
  })

  // ============================================
  // Schedule Reminder Tests
  // ============================================

  describe('scheduleReminder', () => {
    it('should set isScheduling to true during schedule', async () => {
      vi.mocked(familyMeetingReminderService.getPendingReminders).mockResolvedValueOnce([])
      vi.mocked(familyMeetingReminderService.scheduleMeetingReminder).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({} as never), 100))
      )

      const { result } = renderHook(() => useMeetingReminder(mockProps))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      act(() => {
        result.current.scheduleReminder(new Date('2024-01-15T18:00:00Z'))
      })

      expect(result.current.isScheduling).toBe(true)
    })

    it('should call service with correct parameters', async () => {
      const scheduledAt = new Date('2024-01-15T18:00:00Z')
      const mockReminder = {
        id: 'reminder-abc',
        familyId: 'family-123',
        scheduledAt,
        createdAt: new Date(),
        createdBy: 'child-456',
        templateId: 'tween-template-001',
        ageTier: 'tween-12-14' as const,
        status: 'pending' as const,
        notificationSentAt: null,
      }

      vi.mocked(familyMeetingReminderService.getPendingReminders).mockResolvedValueOnce([])
      vi.mocked(familyMeetingReminderService.scheduleMeetingReminder).mockResolvedValueOnce(
        mockReminder
      )

      const { result } = renderHook(() => useMeetingReminder(mockProps))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.scheduleReminder(scheduledAt)
      })

      expect(familyMeetingReminderService.scheduleMeetingReminder).toHaveBeenCalledWith({
        familyId: 'family-123',
        scheduledAt,
        createdBy: 'child-456',
        templateId: 'tween-template-001',
        ageTier: 'tween-12-14',
      })
    })

    it('should update pendingReminder after schedule', async () => {
      const mockReminder = {
        id: 'reminder-abc',
        familyId: 'family-123',
        scheduledAt: new Date('2024-01-15T18:00:00Z'),
        createdAt: new Date(),
        createdBy: 'child-456',
        templateId: 'tween-template-001',
        ageTier: 'tween-12-14' as const,
        status: 'pending' as const,
        notificationSentAt: null,
      }

      vi.mocked(familyMeetingReminderService.getPendingReminders).mockResolvedValueOnce([])
      vi.mocked(familyMeetingReminderService.scheduleMeetingReminder).mockResolvedValueOnce(
        mockReminder
      )

      const { result } = renderHook(() => useMeetingReminder(mockProps))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.scheduleReminder(new Date('2024-01-15T18:00:00Z'))
      })

      expect(result.current.pendingReminder).toEqual(mockReminder)
    })

    it('should set error on schedule failure', async () => {
      vi.mocked(familyMeetingReminderService.getPendingReminders).mockResolvedValueOnce([])
      vi.mocked(familyMeetingReminderService.scheduleMeetingReminder).mockRejectedValueOnce(
        new Error('Schedule failed')
      )

      const { result } = renderHook(() => useMeetingReminder(mockProps))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.scheduleReminder(new Date('2024-01-15T18:00:00Z'))
      })

      expect(result.current.error).not.toBeNull()
    })
  })

  // ============================================
  // Cancel Reminder Tests
  // ============================================

  describe('cancelReminder', () => {
    it('should call cancelMeetingReminder service', async () => {
      const mockReminder = {
        id: 'reminder-abc',
        familyId: 'family-123',
        scheduledAt: new Date('2024-01-15T18:00:00Z'),
        createdAt: new Date(),
        createdBy: 'child-456',
        templateId: 'tween-template-001',
        ageTier: 'tween-12-14' as const,
        status: 'pending' as const,
        notificationSentAt: null,
      }

      vi.mocked(familyMeetingReminderService.getPendingReminders).mockResolvedValueOnce([
        mockReminder,
      ])
      vi.mocked(familyMeetingReminderService.cancelMeetingReminder).mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useMeetingReminder(mockProps))

      await waitFor(() => {
        expect(result.current.pendingReminder).not.toBeNull()
      })

      await act(async () => {
        await result.current.cancelReminder()
      })

      expect(familyMeetingReminderService.cancelMeetingReminder).toHaveBeenCalledWith(
        'reminder-abc'
      )
    })

    it('should clear pendingReminder after cancel', async () => {
      const mockReminder = {
        id: 'reminder-abc',
        familyId: 'family-123',
        scheduledAt: new Date('2024-01-15T18:00:00Z'),
        createdAt: new Date(),
        createdBy: 'child-456',
        templateId: 'tween-template-001',
        ageTier: 'tween-12-14' as const,
        status: 'pending' as const,
        notificationSentAt: null,
      }

      vi.mocked(familyMeetingReminderService.getPendingReminders).mockResolvedValueOnce([
        mockReminder,
      ])
      vi.mocked(familyMeetingReminderService.cancelMeetingReminder).mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useMeetingReminder(mockProps))

      await waitFor(() => {
        expect(result.current.pendingReminder).not.toBeNull()
      })

      await act(async () => {
        await result.current.cancelReminder()
      })

      expect(result.current.pendingReminder).toBeNull()
    })

    it('should do nothing if no pending reminder', async () => {
      vi.mocked(familyMeetingReminderService.getPendingReminders).mockResolvedValueOnce([])

      const { result } = renderHook(() => useMeetingReminder(mockProps))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.cancelReminder()
      })

      expect(familyMeetingReminderService.cancelMeetingReminder).not.toHaveBeenCalled()
    })
  })
})
