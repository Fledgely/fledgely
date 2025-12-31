/**
 * Tests for useDemo Hook
 *
 * Story 8.5.1: Demo Child Profile Creation
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useDemo } from './useDemo'
import { DEMO_CHILD_ID, DEMO_SCREENSHOTS } from '../data/demoData'

// Mock firebase
vi.mock('../lib/firebase', () => ({
  getFirestoreDb: vi.fn(() => ({})),
}))

// Mock firestore functions
const mockOnSnapshot = vi.fn()
const mockUpdateDoc = vi.fn()
const mockDoc = vi.fn()

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
}))

describe('useDemo (Story 8.5.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDoc.mockReturnValue({ id: 'test-family' })
    mockUpdateDoc.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Initial State', () => {
    it('should start in loading state', () => {
      mockOnSnapshot.mockReturnValue(() => {})

      const { result } = renderHook(() => useDemo('family-123', false))

      expect(result.current.loading).toBe(true)
    })

    it('should not show demo when familyId is null', async () => {
      const { result } = renderHook(() => useDemo(null, false))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.showDemo).toBe(false)
      expect(result.current.demoChild).toBeNull()
    })
  })

  describe('AC1: Demo Profile Availability', () => {
    it('should show demo when family has no children and showDemoProfile is true', async () => {
      // Simulate Firestore returning showDemoProfile: true
      mockOnSnapshot.mockImplementation((_, callback: (snapshot: unknown) => void) => {
        callback({
          exists: () => true,
          data: () => ({ showDemoProfile: true }),
        })
        return () => {}
      })

      const { result } = renderHook(() => useDemo('family-123', false))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.showDemo).toBe(true)
      expect(result.current.demoChild).not.toBeNull()
      expect(result.current.demoChild?.id).toBe(DEMO_CHILD_ID)
    })

    it('should default to showing demo when field is missing', async () => {
      mockOnSnapshot.mockImplementation((_, callback: (snapshot: unknown) => void) => {
        callback({
          exists: () => true,
          data: () => ({}), // No showDemoProfile field
        })
        return () => {}
      })

      const { result } = renderHook(() => useDemo('family-123', false))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.showDemo).toBe(true)
    })
  })

  describe('AC5: Dismissible Demo', () => {
    it('should provide dismissDemo function', async () => {
      mockOnSnapshot.mockImplementation((_, callback: (snapshot: unknown) => void) => {
        callback({
          exists: () => true,
          data: () => ({ showDemoProfile: true }),
        })
        return () => {}
      })

      const { result } = renderHook(() => useDemo('family-123', false))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(typeof result.current.dismissDemo).toBe('function')
    })

    it('should call updateDoc when dismissDemo is called', async () => {
      mockOnSnapshot.mockImplementation((_, callback: (snapshot: unknown) => void) => {
        callback({
          exists: () => true,
          data: () => ({ showDemoProfile: true }),
        })
        return () => {}
      })

      const { result } = renderHook(() => useDemo('family-123', false))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.dismissDemo()
      })

      expect(mockUpdateDoc).toHaveBeenCalled()
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          showDemoProfile: false,
        })
      )
    })

    it('should not show demo after dismissal', async () => {
      mockOnSnapshot.mockImplementation((_, callback: (snapshot: unknown) => void) => {
        callback({
          exists: () => true,
          data: () => ({ showDemoProfile: false }),
        })
        return () => {}
      })

      const { result } = renderHook(() => useDemo('family-123', false))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.showDemo).toBe(false)
    })
  })

  describe('AC6: Auto-dismiss when real child added', () => {
    it('should not show demo when family has real children', async () => {
      mockOnSnapshot.mockImplementation((_, callback: (snapshot: unknown) => void) => {
        callback({
          exists: () => true,
          data: () => ({ showDemoProfile: true }),
        })
        return () => {}
      })

      const { result } = renderHook(() => useDemo('family-123', true)) // hasRealChildren = true

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.showDemo).toBe(false)
      expect(result.current.demoChild).toBeNull()
    })
  })

  describe('Demo Child Profile', () => {
    it('should use actual familyId in demo child', async () => {
      mockOnSnapshot.mockImplementation((_, callback: (snapshot: unknown) => void) => {
        callback({
          exists: () => true,
          data: () => ({ showDemoProfile: true }),
        })
        return () => {}
      })

      const { result } = renderHook(() => useDemo('my-family-id', false))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.demoChild?.familyId).toBe('my-family-id')
    })

    it('should mark demo child with isDemo: true', async () => {
      mockOnSnapshot.mockImplementation((_, callback: (snapshot: unknown) => void) => {
        callback({
          exists: () => true,
          data: () => ({ showDemoProfile: true }),
        })
        return () => {}
      })

      const { result } = renderHook(() => useDemo('family-123', false))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.demoChild?.isDemo).toBe(true)
    })
  })

  describe('Demo Screenshots', () => {
    it('should provide demo screenshots when showing demo', async () => {
      mockOnSnapshot.mockImplementation((_, callback: (snapshot: unknown) => void) => {
        callback({
          exists: () => true,
          data: () => ({ showDemoProfile: true }),
        })
        return () => {}
      })

      const { result } = renderHook(() => useDemo('family-123', false))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.demoScreenshots.length).toBe(DEMO_SCREENSHOTS.length)
    })

    it('should return empty array when not showing demo', async () => {
      mockOnSnapshot.mockImplementation((_, callback: (snapshot: unknown) => void) => {
        callback({
          exists: () => true,
          data: () => ({ showDemoProfile: false }),
        })
        return () => {}
      })

      const { result } = renderHook(() => useDemo('family-123', false))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.demoScreenshots).toEqual([])
    })
  })

  describe('Activity Summary', () => {
    it('should provide activity summary', async () => {
      mockOnSnapshot.mockImplementation((_, callback: (snapshot: unknown) => void) => {
        callback({
          exists: () => true,
          data: () => ({ showDemoProfile: true }),
        })
        return () => {}
      })

      const { result } = renderHook(() => useDemo('family-123', false))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.activitySummary).toBeDefined()
      expect(result.current.activitySummary.totalScreenshots).toBeGreaterThan(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle Firestore errors gracefully', async () => {
      mockOnSnapshot.mockImplementation(
        (_, _callback: (snapshot: unknown) => void, errorCallback: (err: Error) => void) => {
          errorCallback(new Error('Firestore error'))
          return () => {}
        }
      )

      const { result } = renderHook(() => useDemo('family-123', false))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe('Failed to load demo state')
    })

    it('should handle dismissDemo errors', async () => {
      mockOnSnapshot.mockImplementation((_, callback: (snapshot: unknown) => void) => {
        callback({
          exists: () => true,
          data: () => ({ showDemoProfile: true }),
        })
        return () => {}
      })
      mockUpdateDoc.mockRejectedValue(new Error('Update failed'))

      const { result } = renderHook(() => useDemo('family-123', false))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.dismissDemo()
      })

      expect(result.current.error).toBe('Failed to dismiss demo')
    })
  })

  describe('Dismissing State', () => {
    it('should track dismissing state', async () => {
      mockOnSnapshot.mockImplementation((_, callback: (snapshot: unknown) => void) => {
        callback({
          exists: () => true,
          data: () => ({ showDemoProfile: true }),
        })
        return () => {}
      })

      // Make updateDoc take some time
      mockUpdateDoc.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)))

      const { result } = renderHook(() => useDemo('family-123', false))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.dismissing).toBe(false)

      // Start dismissing - don't await immediately
      let dismissPromise: Promise<void>
      act(() => {
        dismissPromise = result.current.dismissDemo()
      })

      // Check dismissing state during the operation
      await waitFor(() => {
        expect(result.current.dismissing).toBe(true)
      })

      // Wait for completion
      await act(async () => {
        await dismissPromise
      })

      expect(result.current.dismissing).toBe(false)
    })
  })

  describe('Demo Archival (Story 8.5.5)', () => {
    describe('AC4: Automatic Demo Archival', () => {
      it('should provide archiveDemo function', async () => {
        mockOnSnapshot.mockImplementation((_, callback: (snapshot: unknown) => void) => {
          callback({
            exists: () => true,
            data: () => ({ showDemoProfile: true }),
          })
          return () => {}
        })

        const { result } = renderHook(() => useDemo('family-123', false))

        await waitFor(() => {
          expect(result.current.loading).toBe(false)
        })

        expect(typeof result.current.archiveDemo).toBe('function')
      })

      it('should call updateDoc with demoArchived: true when archiveDemo is called', async () => {
        mockOnSnapshot.mockImplementation((_, callback: (snapshot: unknown) => void) => {
          callback({
            exists: () => true,
            data: () => ({ showDemoProfile: true }),
          })
          return () => {}
        })

        const { result } = renderHook(() => useDemo('family-123', false))

        await waitFor(() => {
          expect(result.current.loading).toBe(false)
        })

        await act(async () => {
          await result.current.archiveDemo()
        })

        expect(mockUpdateDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            showDemoProfile: false,
            demoArchived: true,
          })
        )
      })

      it('should set demoArchived to true after archival', async () => {
        mockOnSnapshot.mockImplementation((_, callback: (snapshot: unknown) => void) => {
          callback({
            exists: () => true,
            data: () => ({ showDemoProfile: true, demoArchived: false }),
          })
          return () => {}
        })

        const { result } = renderHook(() => useDemo('family-123', false))

        await waitFor(() => {
          expect(result.current.loading).toBe(false)
        })

        expect(result.current.demoArchived).toBe(false)

        await act(async () => {
          await result.current.archiveDemo()
        })

        expect(result.current.demoArchived).toBe(true)
      })

      it('should track archiving state during archiveDemo', async () => {
        mockOnSnapshot.mockImplementation((_, callback: (snapshot: unknown) => void) => {
          callback({
            exists: () => true,
            data: () => ({ showDemoProfile: true }),
          })
          return () => {}
        })

        mockUpdateDoc.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)))

        const { result } = renderHook(() => useDemo('family-123', false))

        await waitFor(() => {
          expect(result.current.loading).toBe(false)
        })

        expect(result.current.archiving).toBe(false)

        let archivePromise: Promise<void>
        act(() => {
          archivePromise = result.current.archiveDemo()
        })

        await waitFor(() => {
          expect(result.current.archiving).toBe(true)
        })

        await act(async () => {
          await archivePromise
        })

        expect(result.current.archiving).toBe(false)
      })

      it('should handle archiveDemo errors', async () => {
        mockOnSnapshot.mockImplementation((_, callback: (snapshot: unknown) => void) => {
          callback({
            exists: () => true,
            data: () => ({ showDemoProfile: true }),
          })
          return () => {}
        })
        mockUpdateDoc.mockRejectedValue(new Error('Archive failed'))

        const { result } = renderHook(() => useDemo('family-123', false))

        await waitFor(() => {
          expect(result.current.loading).toBe(false)
        })

        await act(async () => {
          await result.current.archiveDemo()
        })

        expect(result.current.error).toBe('Failed to archive demo')
      })

      it('should not archive when familyId is null', async () => {
        const { result } = renderHook(() => useDemo(null, false))

        await waitFor(() => {
          expect(result.current.loading).toBe(false)
        })

        await act(async () => {
          await result.current.archiveDemo()
        })

        expect(mockUpdateDoc).not.toHaveBeenCalled()
        expect(result.current.error).toBe('No family ID provided')
      })
    })

    describe('AC5: Demo Re-access', () => {
      it('should provide reactivateDemo function', async () => {
        mockOnSnapshot.mockImplementation((_, callback: (snapshot: unknown) => void) => {
          callback({
            exists: () => true,
            data: () => ({ showDemoProfile: false, demoArchived: true }),
          })
          return () => {}
        })

        const { result } = renderHook(() => useDemo('family-123', false))

        await waitFor(() => {
          expect(result.current.loading).toBe(false)
        })

        expect(typeof result.current.reactivateDemo).toBe('function')
      })

      it('should call updateDoc with showDemoProfile: true when reactivateDemo is called', async () => {
        mockOnSnapshot.mockImplementation((_, callback: (snapshot: unknown) => void) => {
          callback({
            exists: () => true,
            data: () => ({ showDemoProfile: false, demoArchived: true }),
          })
          return () => {}
        })

        const { result } = renderHook(() => useDemo('family-123', false))

        await waitFor(() => {
          expect(result.current.loading).toBe(false)
        })

        await act(async () => {
          await result.current.reactivateDemo()
        })

        expect(mockUpdateDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            showDemoProfile: true,
          })
        )
      })

      it('should track demoArchived state from Firestore', async () => {
        mockOnSnapshot.mockImplementation((_, callback: (snapshot: unknown) => void) => {
          callback({
            exists: () => true,
            data: () => ({ showDemoProfile: false, demoArchived: true }),
          })
          return () => {}
        })

        const { result } = renderHook(() => useDemo('family-123', false))

        await waitFor(() => {
          expect(result.current.loading).toBe(false)
        })

        expect(result.current.demoArchived).toBe(true)
      })

      it('should track archiving state during reactivateDemo', async () => {
        mockOnSnapshot.mockImplementation((_, callback: (snapshot: unknown) => void) => {
          callback({
            exists: () => true,
            data: () => ({ showDemoProfile: false, demoArchived: true }),
          })
          return () => {}
        })

        mockUpdateDoc.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)))

        const { result } = renderHook(() => useDemo('family-123', false))

        await waitFor(() => {
          expect(result.current.loading).toBe(false)
        })

        let reactivatePromise: Promise<void>
        act(() => {
          reactivatePromise = result.current.reactivateDemo()
        })

        await waitFor(() => {
          expect(result.current.archiving).toBe(true)
        })

        await act(async () => {
          await reactivatePromise
        })

        expect(result.current.archiving).toBe(false)
      })

      it('should handle reactivateDemo errors', async () => {
        mockOnSnapshot.mockImplementation((_, callback: (snapshot: unknown) => void) => {
          callback({
            exists: () => true,
            data: () => ({ showDemoProfile: false, demoArchived: true }),
          })
          return () => {}
        })
        mockUpdateDoc.mockRejectedValue(new Error('Reactivate failed'))

        const { result } = renderHook(() => useDemo('family-123', false))

        await waitFor(() => {
          expect(result.current.loading).toBe(false)
        })

        await act(async () => {
          await result.current.reactivateDemo()
        })

        expect(result.current.error).toBe('Failed to reactivate demo')
      })

      it('should not reactivate when familyId is null', async () => {
        const { result } = renderHook(() => useDemo(null, false))

        await waitFor(() => {
          expect(result.current.loading).toBe(false)
        })

        await act(async () => {
          await result.current.reactivateDemo()
        })

        expect(mockUpdateDoc).not.toHaveBeenCalled()
        expect(result.current.error).toBe('No family ID provided')
      })
    })

    describe('Demo State Transitions', () => {
      it('should default demoArchived to false when field is missing', async () => {
        mockOnSnapshot.mockImplementation((_, callback: (snapshot: unknown) => void) => {
          callback({
            exists: () => true,
            data: () => ({ showDemoProfile: true }), // No demoArchived field
          })
          return () => {}
        })

        const { result } = renderHook(() => useDemo('family-123', false))

        await waitFor(() => {
          expect(result.current.loading).toBe(false)
        })

        expect(result.current.demoArchived).toBe(false)
      })

      it('should default demoArchived to false when family does not exist', async () => {
        mockOnSnapshot.mockImplementation((_, callback: (snapshot: unknown) => void) => {
          callback({
            exists: () => false,
            data: () => null,
          })
          return () => {}
        })

        const { result } = renderHook(() => useDemo('family-123', false))

        await waitFor(() => {
          expect(result.current.loading).toBe(false)
        })

        expect(result.current.demoArchived).toBe(false)
      })
    })

    describe('Auto-Archive on Real Child Added (AC4)', () => {
      it('should auto-archive when hasRealChildren changes from false to true', async () => {
        mockOnSnapshot.mockImplementation((_, callback: (snapshot: unknown) => void) => {
          callback({
            exists: () => true,
            data: () => ({ showDemoProfile: true, demoArchived: false }),
          })
          return () => {}
        })

        const { result, rerender } = renderHook(
          ({ hasRealChildren }) => useDemo('family-123', hasRealChildren),
          { initialProps: { hasRealChildren: false } }
        )

        await waitFor(() => {
          expect(result.current.loading).toBe(false)
        })

        // Initially demo is showing
        expect(result.current.showDemo).toBe(true)

        // Add a real child
        rerender({ hasRealChildren: true })

        // Wait for auto-archive to complete
        await waitFor(() => {
          expect(mockUpdateDoc).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
              showDemoProfile: false,
              demoArchived: true,
            })
          )
        })
      })

      it('should not auto-archive if demo is already dismissed', async () => {
        mockOnSnapshot.mockImplementation((_, callback: (snapshot: unknown) => void) => {
          callback({
            exists: () => true,
            data: () => ({ showDemoProfile: false, demoArchived: false }),
          })
          return () => {}
        })

        const { result, rerender } = renderHook(
          ({ hasRealChildren }) => useDemo('family-123', hasRealChildren),
          { initialProps: { hasRealChildren: false } }
        )

        await waitFor(() => {
          expect(result.current.loading).toBe(false)
        })

        // Demo is not showing (dismissed)
        expect(result.current.showDemo).toBe(false)

        // Add a real child
        rerender({ hasRealChildren: true })

        // Should not trigger auto-archive since demo was already dismissed
        expect(mockUpdateDoc).not.toHaveBeenCalled()
      })

      it('should not auto-archive if demo is already archived', async () => {
        mockOnSnapshot.mockImplementation((_, callback: (snapshot: unknown) => void) => {
          callback({
            exists: () => true,
            data: () => ({ showDemoProfile: false, demoArchived: true }),
          })
          return () => {}
        })

        const { result, rerender } = renderHook(
          ({ hasRealChildren }) => useDemo('family-123', hasRealChildren),
          { initialProps: { hasRealChildren: false } }
        )

        await waitFor(() => {
          expect(result.current.loading).toBe(false)
        })

        // Add a real child
        rerender({ hasRealChildren: true })

        // Should not trigger auto-archive since demo is already archived
        expect(mockUpdateDoc).not.toHaveBeenCalled()
      })

      it('should not auto-archive if hasRealChildren was already true', async () => {
        mockOnSnapshot.mockImplementation((_, callback: (snapshot: unknown) => void) => {
          callback({
            exists: () => true,
            data: () => ({ showDemoProfile: true, demoArchived: false }),
          })
          return () => {}
        })

        // Start with hasRealChildren = true
        const { result } = renderHook(() => useDemo('family-123', true))

        await waitFor(() => {
          expect(result.current.loading).toBe(false)
        })

        // Should not have auto-archived since we started with children
        expect(mockUpdateDoc).not.toHaveBeenCalled()
      })
    })
  })
})
