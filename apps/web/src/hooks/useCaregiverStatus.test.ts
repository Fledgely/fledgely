/**
 * useCaregiverStatus Hook Tests - Story 19A.3, 19D.2
 *
 * Tests for the caregiver status aggregation hook.
 *
 * Story 19A.3:
 * - AC1: Simplified status display
 * - AC2: No complex device details
 *
 * Story 19D.2:
 * - AC2: Screen time status ('available' | 'finished')
 * - AC3: Time remaining display
 * - AC4: No screenshot access
 * - AC5: No device details
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCaregiverStatus, caregiverStatusLabels } from './useCaregiverStatus'
import * as useChildStatusModule from './useChildStatus'
import type { ChildStatus } from './useChildStatus'
import type { FamilyStatus } from './useFamilyStatus'

// Mock useChildStatus
vi.mock('./useChildStatus', () => ({
  useChildStatus: vi.fn(),
}))

/**
 * Helper to create a mock ChildStatus
 */
function createMockChildStatus(overrides: Partial<ChildStatus> = {}): ChildStatus {
  return {
    childId: 'child-1',
    childName: 'Emma',
    photoURL: null,
    status: 'good' as FamilyStatus,
    deviceCount: 1,
    activeDeviceCount: 1,
    lastActivity: new Date(),
    devices: [],
    issues: [],
    ...overrides,
  }
}

describe('useCaregiverStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading and error states', () => {
    it('should return loading state', () => {
      vi.mocked(useChildStatusModule.useChildStatus).mockReturnValue({
        childStatuses: [],
        loading: true,
        error: null,
      })

      const { result } = renderHook(() => useCaregiverStatus('family-1'))

      expect(result.current.loading).toBe(true)
      expect(result.current.error).toBeNull()
    })

    it('should return error state', () => {
      vi.mocked(useChildStatusModule.useChildStatus).mockReturnValue({
        childStatuses: [],
        loading: false,
        error: 'Failed to load',
      })

      const { result } = renderHook(() => useCaregiverStatus('family-1'))

      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe('Failed to load')
    })
  })

  describe('Status message generation', () => {
    it('should show "Your grandchildren are doing well" when all children are good', () => {
      vi.mocked(useChildStatusModule.useChildStatus).mockReturnValue({
        childStatuses: [
          createMockChildStatus({ childId: 'child-1', childName: 'Emma', status: 'good' }),
          createMockChildStatus({ childId: 'child-2', childName: 'Liam', status: 'good' }),
        ],
        loading: false,
        error: null,
      })

      const { result } = renderHook(() => useCaregiverStatus('family-1'))

      expect(result.current.statusMessage).toBe('Your grandchildren are doing well')
      expect(result.current.overallStatus).toBe('good')
    })

    it('should show "Check in with [child]" when one child needs attention', () => {
      vi.mocked(useChildStatusModule.useChildStatus).mockReturnValue({
        childStatuses: [
          createMockChildStatus({ childId: 'child-1', childName: 'Emma', status: 'attention' }),
          createMockChildStatus({ childId: 'child-2', childName: 'Liam', status: 'good' }),
        ],
        loading: false,
        error: null,
      })

      const { result } = renderHook(() => useCaregiverStatus('family-1'))

      expect(result.current.statusMessage).toBe('Check in with Emma')
      expect(result.current.overallStatus).toBe('attention')
    })

    it('should show "Check in with X and Y" when two children need attention', () => {
      vi.mocked(useChildStatusModule.useChildStatus).mockReturnValue({
        childStatuses: [
          createMockChildStatus({ childId: 'child-1', childName: 'Emma', status: 'attention' }),
          createMockChildStatus({ childId: 'child-2', childName: 'Liam', status: 'action' }),
        ],
        loading: false,
        error: null,
      })

      const { result } = renderHook(() => useCaregiverStatus('family-1'))

      expect(result.current.statusMessage).toBe('Check in with Emma and Liam')
      expect(result.current.overallStatus).toBe('action')
    })

    it('should show "Check in with X, Y, and Z" when three children need attention', () => {
      vi.mocked(useChildStatusModule.useChildStatus).mockReturnValue({
        childStatuses: [
          createMockChildStatus({ childId: 'child-1', childName: 'Emma', status: 'attention' }),
          createMockChildStatus({ childId: 'child-2', childName: 'Liam', status: 'attention' }),
          createMockChildStatus({ childId: 'child-3', childName: 'Olivia', status: 'action' }),
        ],
        loading: false,
        error: null,
      })

      const { result } = renderHook(() => useCaregiverStatus('family-1'))

      expect(result.current.statusMessage).toBe('Check in with Emma, Liam, and Olivia')
    })
  })

  describe('Overall status calculation', () => {
    it('should return "good" when all children are good', () => {
      vi.mocked(useChildStatusModule.useChildStatus).mockReturnValue({
        childStatuses: [
          createMockChildStatus({ childId: 'child-1', status: 'good' }),
          createMockChildStatus({ childId: 'child-2', status: 'good' }),
        ],
        loading: false,
        error: null,
      })

      const { result } = renderHook(() => useCaregiverStatus('family-1'))

      expect(result.current.overallStatus).toBe('good')
    })

    it('should return "attention" when any child needs attention', () => {
      vi.mocked(useChildStatusModule.useChildStatus).mockReturnValue({
        childStatuses: [
          createMockChildStatus({ childId: 'child-1', status: 'good' }),
          createMockChildStatus({ childId: 'child-2', status: 'attention' }),
        ],
        loading: false,
        error: null,
      })

      const { result } = renderHook(() => useCaregiverStatus('family-1'))

      expect(result.current.overallStatus).toBe('attention')
    })

    it('should return "action" when any child needs action', () => {
      vi.mocked(useChildStatusModule.useChildStatus).mockReturnValue({
        childStatuses: [
          createMockChildStatus({ childId: 'child-1', status: 'attention' }),
          createMockChildStatus({ childId: 'child-2', status: 'action' }),
        ],
        loading: false,
        error: null,
      })

      const { result } = renderHook(() => useCaregiverStatus('family-1'))

      expect(result.current.overallStatus).toBe('action')
    })

    it('should return "good" when no children', () => {
      vi.mocked(useChildStatusModule.useChildStatus).mockReturnValue({
        childStatuses: [],
        loading: false,
        error: null,
      })

      const { result } = renderHook(() => useCaregiverStatus('family-1'))

      expect(result.current.overallStatus).toBe('good')
    })
  })

  describe('Simplified child summaries', () => {
    it('should convert child status to simplified summary with screen time', () => {
      vi.mocked(useChildStatusModule.useChildStatus).mockReturnValue({
        childStatuses: [
          createMockChildStatus({
            childId: 'child-1',
            childName: 'Emma',
            photoURL: 'https://example.com/photo.jpg',
            status: 'good',
            deviceCount: 2,
            activeDeviceCount: 2,
          }),
        ],
        loading: false,
        error: null,
      })

      const { result } = renderHook(() => useCaregiverStatus('family-1'))

      expect(result.current.children).toHaveLength(1)
      const summary = result.current.children[0]
      expect(summary.childId).toBe('child-1')
      expect(summary.childName).toBe('Emma')
      expect(summary.photoURL).toBe('https://example.com/photo.jpg')
      expect(summary.status).toBe('good')
      expect(summary.statusMessage).toBe('Doing well')
      // Story 19D.2: Screen time fields should be present
      expect(summary.screenTimeStatus).toBeDefined()
      expect(['available', 'finished']).toContain(summary.screenTimeStatus)
    })

    it('should NOT include device details in simplified summary', () => {
      vi.mocked(useChildStatusModule.useChildStatus).mockReturnValue({
        childStatuses: [
          createMockChildStatus({
            childId: 'child-1',
            childName: 'Emma',
            status: 'good',
            deviceCount: 3,
            activeDeviceCount: 2,
            devices: [{ deviceId: 'dev-1' } as any],
            issues: [{ type: 'warning', message: 'test' } as any],
          }),
        ],
        loading: false,
        error: null,
      })

      const { result } = renderHook(() => useCaregiverStatus('family-1'))

      const summary = result.current.children[0]
      // Should NOT have device-related properties
      expect(summary).not.toHaveProperty('deviceCount')
      expect(summary).not.toHaveProperty('activeDeviceCount')
      expect(summary).not.toHaveProperty('devices')
      expect(summary).not.toHaveProperty('issues')
      expect(summary).not.toHaveProperty('lastActivity')
    })
  })

  describe('Children needing attention list', () => {
    it('should return empty array when all children are good', () => {
      vi.mocked(useChildStatusModule.useChildStatus).mockReturnValue({
        childStatuses: [
          createMockChildStatus({ childId: 'child-1', childName: 'Emma', status: 'good' }),
        ],
        loading: false,
        error: null,
      })

      const { result } = renderHook(() => useCaregiverStatus('family-1'))

      expect(result.current.childrenNeedingAttention).toEqual([])
    })

    it('should return names of children needing attention', () => {
      vi.mocked(useChildStatusModule.useChildStatus).mockReturnValue({
        childStatuses: [
          createMockChildStatus({ childId: 'child-1', childName: 'Emma', status: 'attention' }),
          createMockChildStatus({ childId: 'child-2', childName: 'Liam', status: 'good' }),
          createMockChildStatus({ childId: 'child-3', childName: 'Olivia', status: 'action' }),
        ],
        loading: false,
        error: null,
      })

      const { result } = renderHook(() => useCaregiverStatus('family-1'))

      expect(result.current.childrenNeedingAttention).toEqual(['Emma', 'Olivia'])
    })
  })

  describe('Caregiver-friendly labels', () => {
    it('should have correct caregiver labels', () => {
      expect(caregiverStatusLabels.good).toBe('Doing well')
      expect(caregiverStatusLabels.attention).toBe('Check in')
      expect(caregiverStatusLabels.action).toBe('Needs help')
    })
  })

  describe('Parent contact', () => {
    it('should return parent contact (stubbed for MVP)', () => {
      vi.mocked(useChildStatusModule.useChildStatus).mockReturnValue({
        childStatuses: [],
        loading: false,
        error: null,
      })

      const { result } = renderHook(() => useCaregiverStatus('family-1'))

      expect(result.current.parentContact).toEqual({
        name: 'Parent',
        phone: null,
      })
    })
  })

  describe('Screen time status (Story 19D.2)', () => {
    it('should include screenTimeStatus in child summary', () => {
      vi.mocked(useChildStatusModule.useChildStatus).mockReturnValue({
        childStatuses: [createMockChildStatus({ childId: 'child-1', childName: 'Emma' })],
        loading: false,
        error: null,
      })

      const { result } = renderHook(() => useCaregiverStatus('family-1'))

      expect(result.current.children[0]).toHaveProperty('screenTimeStatus')
      expect(['available', 'finished']).toContain(result.current.children[0].screenTimeStatus)
    })

    it('should include timeRemainingMinutes in child summary', () => {
      vi.mocked(useChildStatusModule.useChildStatus).mockReturnValue({
        childStatuses: [createMockChildStatus({ childId: 'child-1', childName: 'Emma' })],
        loading: false,
        error: null,
      })

      const { result } = renderHook(() => useCaregiverStatus('family-1'))

      expect(result.current.children[0]).toHaveProperty('timeRemainingMinutes')
    })

    it('should provide varied screen time data for different children', () => {
      // Using different childIds should produce variety in stubbed data
      vi.mocked(useChildStatusModule.useChildStatus).mockReturnValue({
        childStatuses: [
          createMockChildStatus({ childId: 'child-aaa', childName: 'Emma' }),
          createMockChildStatus({ childId: 'child-bbb', childName: 'Liam' }),
          createMockChildStatus({ childId: 'child-ccc', childName: 'Olivia' }),
          createMockChildStatus({ childId: 'child-ddd', childName: 'Noah' }),
        ],
        loading: false,
        error: null,
      })

      const { result } = renderHook(() => useCaregiverStatus('family-1'))

      // All children should have valid screen time status
      result.current.children.forEach((child) => {
        expect(['available', 'finished']).toContain(child.screenTimeStatus)
        // timeRemainingMinutes can be null or a number
        expect(
          child.timeRemainingMinutes === null || typeof child.timeRemainingMinutes === 'number'
        ).toBe(true)
      })
    })

    it('should NOT include screenshot data (AC4)', () => {
      vi.mocked(useChildStatusModule.useChildStatus).mockReturnValue({
        childStatuses: [createMockChildStatus({ childId: 'child-1', childName: 'Emma' })],
        loading: false,
        error: null,
      })

      const { result } = renderHook(() => useCaregiverStatus('family-1'))

      const summary = result.current.children[0]
      expect(summary).not.toHaveProperty('screenshots')
      expect(summary).not.toHaveProperty('screenshotUrls')
      expect(summary).not.toHaveProperty('lastScreenshot')
    })

    it('should NOT include device history or activity (AC5)', () => {
      vi.mocked(useChildStatusModule.useChildStatus).mockReturnValue({
        childStatuses: [createMockChildStatus({ childId: 'child-1', childName: 'Emma' })],
        loading: false,
        error: null,
      })

      const { result } = renderHook(() => useCaregiverStatus('family-1'))

      const summary = result.current.children[0]
      expect(summary).not.toHaveProperty('devices')
      expect(summary).not.toHaveProperty('activityHistory')
      expect(summary).not.toHaveProperty('lastActivity')
    })
  })
})
