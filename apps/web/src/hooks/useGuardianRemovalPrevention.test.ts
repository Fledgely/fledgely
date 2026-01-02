/**
 * useGuardianRemovalPrevention Hook Tests - Story 3A.6
 *
 * Tests for the guardian removal prevention hook.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useGuardianRemovalPrevention } from './useGuardianRemovalPrevention'

// Mock the service
const mockCanRemoveGuardian = vi.fn()
const mockCanDowngradeToCaregiver = vi.fn()
const mockLogGuardianRemovalAttempt = vi.fn()

vi.mock('../services/guardianRemovalPreventionService', () => ({
  canRemoveGuardian: (...args: unknown[]) => mockCanRemoveGuardian(...args),
  canDowngradeToCaregiver: (...args: unknown[]) => mockCanDowngradeToCaregiver(...args),
  logGuardianRemovalAttempt: (...args: unknown[]) => mockLogGuardianRemovalAttempt(...args),
}))

describe('useGuardianRemovalPrevention - Story 3A.6', () => {
  const defaultProps = {
    familyId: 'family-1',
    currentUserUid: 'parent-1',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkCanRemove', () => {
    it('should call canRemoveGuardian with correct parameters', async () => {
      mockCanRemoveGuardian.mockResolvedValue({
        allowed: false,
        reason: 'Shared custody',
        guardianCount: 2,
      })

      const { result } = renderHook(() => useGuardianRemovalPrevention(defaultProps))

      await act(async () => {
        await result.current.checkCanRemove('parent-2')
      })

      expect(mockCanRemoveGuardian).toHaveBeenCalledWith('family-1', 'parent-2')
    })

    it('should return result from service', async () => {
      const expectedResult = {
        allowed: false,
        reason: 'Shared custody families cannot remove guardians',
        guardianCount: 2,
      }
      mockCanRemoveGuardian.mockResolvedValue(expectedResult)

      const { result } = renderHook(() => useGuardianRemovalPrevention(defaultProps))

      let checkResult
      await act(async () => {
        checkResult = await result.current.checkCanRemove('parent-2')
      })

      expect(checkResult).toEqual(expectedResult)
    })
  })

  describe('checkCanDowngrade', () => {
    it('should call canDowngradeToCaregiver with correct parameters', async () => {
      mockCanDowngradeToCaregiver.mockResolvedValue({
        allowed: false,
        reason: 'Cannot downgrade',
        guardianCount: 2,
      })

      const { result } = renderHook(() => useGuardianRemovalPrevention(defaultProps))

      await act(async () => {
        await result.current.checkCanDowngrade('parent-2')
      })

      expect(mockCanDowngradeToCaregiver).toHaveBeenCalledWith('family-1', 'parent-2')
    })

    it('should return result from service', async () => {
      const expectedResult = {
        allowed: false,
        reason: 'Cannot downgrade in shared custody',
        guardianCount: 2,
      }
      mockCanDowngradeToCaregiver.mockResolvedValue(expectedResult)

      const { result } = renderHook(() => useGuardianRemovalPrevention(defaultProps))

      let checkResult
      await act(async () => {
        checkResult = await result.current.checkCanDowngrade('parent-2')
      })

      expect(checkResult).toEqual(expectedResult)
    })
  })

  describe('attemptRemoval', () => {
    it('should log the attempt to admin audit', async () => {
      mockLogGuardianRemovalAttempt.mockResolvedValue(undefined)

      const { result } = renderHook(() => useGuardianRemovalPrevention(defaultProps))

      await act(async () => {
        await result.current.attemptRemoval('parent-2', 'parent2@example.com')
      })

      expect(mockLogGuardianRemovalAttempt).toHaveBeenCalledWith({
        familyId: 'family-1',
        attemptedByUid: 'parent-1',
        targetUid: 'parent-2',
        targetEmail: 'parent2@example.com',
      })
    })

    it('should open the modal after logging', async () => {
      mockLogGuardianRemovalAttempt.mockResolvedValue(undefined)

      const { result } = renderHook(() => useGuardianRemovalPrevention(defaultProps))

      expect(result.current.isModalOpen).toBe(false)

      await act(async () => {
        await result.current.attemptRemoval('parent-2')
      })

      expect(result.current.isModalOpen).toBe(true)
    })

    it('should set target guardian name from email', async () => {
      mockLogGuardianRemovalAttempt.mockResolvedValue(undefined)

      const { result } = renderHook(() => useGuardianRemovalPrevention(defaultProps))

      await act(async () => {
        await result.current.attemptRemoval('parent-2', 'jane@example.com')
      })

      expect(result.current.targetGuardianName).toBe('jane@example.com')
    })

    it('should use default name when email not provided', async () => {
      mockLogGuardianRemovalAttempt.mockResolvedValue(undefined)

      const { result } = renderHook(() => useGuardianRemovalPrevention(defaultProps))

      await act(async () => {
        await result.current.attemptRemoval('parent-2')
      })

      expect(result.current.targetGuardianName).toBe('the other guardian')
    })

    it('should set loading state during attempt', async () => {
      let resolveLog: () => void
      mockLogGuardianRemovalAttempt.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveLog = resolve
          })
      )

      const { result } = renderHook(() => useGuardianRemovalPrevention(defaultProps))

      expect(result.current.isLoading).toBe(false)

      let attemptPromise: Promise<void>
      act(() => {
        attemptPromise = result.current.attemptRemoval('parent-2')
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true)
      })

      await act(async () => {
        resolveLog!()
        await attemptPromise
      })

      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('attemptDowngrade', () => {
    it('should log the attempt to admin audit', async () => {
      mockLogGuardianRemovalAttempt.mockResolvedValue(undefined)

      const { result } = renderHook(() => useGuardianRemovalPrevention(defaultProps))

      await act(async () => {
        await result.current.attemptDowngrade('parent-2', 'parent2@example.com')
      })

      expect(mockLogGuardianRemovalAttempt).toHaveBeenCalledWith({
        familyId: 'family-1',
        attemptedByUid: 'parent-1',
        targetUid: 'parent-2',
        targetEmail: 'parent2@example.com',
      })
    })

    it('should open the modal after logging', async () => {
      mockLogGuardianRemovalAttempt.mockResolvedValue(undefined)

      const { result } = renderHook(() => useGuardianRemovalPrevention(defaultProps))

      await act(async () => {
        await result.current.attemptDowngrade('parent-2')
      })

      expect(result.current.isModalOpen).toBe(true)
    })
  })

  describe('closeModal', () => {
    it('should close the modal', async () => {
      mockLogGuardianRemovalAttempt.mockResolvedValue(undefined)

      const { result } = renderHook(() => useGuardianRemovalPrevention(defaultProps))

      // Open the modal
      await act(async () => {
        await result.current.attemptRemoval('parent-2')
      })

      expect(result.current.isModalOpen).toBe(true)

      // Close it
      act(() => {
        result.current.closeModal()
      })

      expect(result.current.isModalOpen).toBe(false)
    })

    it('should clear target guardian name', async () => {
      mockLogGuardianRemovalAttempt.mockResolvedValue(undefined)

      const { result } = renderHook(() => useGuardianRemovalPrevention(defaultProps))

      // Open the modal
      await act(async () => {
        await result.current.attemptRemoval('parent-2', 'jane@example.com')
      })

      expect(result.current.targetGuardianName).toBe('jane@example.com')

      // Close it
      act(() => {
        result.current.closeModal()
      })

      expect(result.current.targetGuardianName).toBeNull()
    })
  })

  describe('memoization', () => {
    it('should memoize checkCanRemove', () => {
      const { result, rerender } = renderHook(() => useGuardianRemovalPrevention(defaultProps))

      const checkCanRemove1 = result.current.checkCanRemove
      rerender()
      const checkCanRemove2 = result.current.checkCanRemove

      expect(checkCanRemove1).toBe(checkCanRemove2)
    })

    it('should update checkCanRemove when familyId changes', () => {
      const { result, rerender } = renderHook((props) => useGuardianRemovalPrevention(props), {
        initialProps: defaultProps,
      })

      const checkCanRemove1 = result.current.checkCanRemove

      rerender({ ...defaultProps, familyId: 'family-2' })
      const checkCanRemove2 = result.current.checkCanRemove

      expect(checkCanRemove1).not.toBe(checkCanRemove2)
    })
  })
})
