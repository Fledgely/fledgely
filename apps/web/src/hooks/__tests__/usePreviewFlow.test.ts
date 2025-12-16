/**
 * Tests for usePreviewFlow Hook
 *
 * Story 5.5: Agreement Preview & Summary - Task 8.6
 *
 * Tests for the preview flow navigation hook.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePreviewFlow } from '../usePreviewFlow'
import type { CoCreationSession } from '@fledgely/contracts'

// ============================================
// MOCK SETUP
// ============================================

// Mock the useCanProceedToSigning hook
vi.mock('../useCanProceedToSigning', () => ({
  useCanProceedToSigning: vi.fn().mockReturnValue({
    canProceed: true,
    unresolvedCount: 0,
    unresolvedTermIds: [],
    unresolvedTerms: [],
    message: 'All terms resolved. Ready to proceed.',
    a11yMessage: 'All terms resolved. Ready to proceed.',
  }),
}))

// Import after mock setup
import { useCanProceedToSigning } from '../useCanProceedToSigning'

const mockUseCanProceedToSigning = vi.mocked(useCanProceedToSigning)

// ============================================
// TEST FIXTURES
// ============================================

const createMockSession = (): CoCreationSession => ({
  id: '550e8400-e29b-41d4-a716-446655440000',
  familyId: 'family-123',
  childId: 'child-123',
  initiatedBy: 'parent',
  status: 'active',
  sourceDraft: { type: 'wizard' },
  createdAt: '2025-01-01T00:00:00Z',
  expiresAt: '2025-01-02T00:00:00Z',
  terms: [],
  contributions: [],
})

beforeEach(() => {
  vi.clearAllMocks()
  mockUseCanProceedToSigning.mockReturnValue({
    canProceed: true,
    unresolvedCount: 0,
    unresolvedTermIds: [],
    unresolvedTerms: [],
    message: 'All terms resolved. Ready to proceed.',
    a11yMessage: 'All terms resolved. Ready to proceed.',
  })
})

// ============================================
// BASIC HOOK TESTS
// ============================================

describe('usePreviewFlow', () => {
  describe('basic functionality', () => {
    it('returns current phase', () => {
      const { result } = renderHook(() => usePreviewFlow(createMockSession()))
      expect(result.current.currentPhase).toBeDefined()
    })

    it('starts at builder phase by default', () => {
      const { result } = renderHook(() => usePreviewFlow(createMockSession()))
      expect(result.current.currentPhase).toBe('builder')
    })

    it('can start at specified initial phase', () => {
      const { result } = renderHook(() =>
        usePreviewFlow(createMockSession(), { initialPhase: 'preview' })
      )
      expect(result.current.currentPhase).toBe('preview')
    })

    it('returns scroll state', () => {
      const { result } = renderHook(() => usePreviewFlow(createMockSession()))
      expect(result.current.scrollState).toEqual({
        parentComplete: false,
        childComplete: false,
        parentProgress: 0,
        childProgress: 0,
      })
    })

    it('returns gate message', () => {
      const { result } = renderHook(() => usePreviewFlow(createMockSession()))
      expect(typeof result.current.gateMessage).toBe('string')
    })
  })

  // ============================================
  // NAVIGATION TESTS
  // ============================================

  describe('navigation', () => {
    it('can navigate to builder from any phase', () => {
      const { result } = renderHook(() =>
        usePreviewFlow(createMockSession(), { initialPhase: 'preview' })
      )

      act(() => {
        result.current.goToBuilder()
      })

      expect(result.current.currentPhase).toBe('builder')
    })

    it('can navigate to preview when signing gate allows', () => {
      const { result } = renderHook(() => usePreviewFlow(createMockSession()))

      let success: boolean = false
      act(() => {
        success = result.current.goToPreview()
      })

      expect(success).toBe(true)
      expect(result.current.currentPhase).toBe('preview')
    })

    it('blocks navigation to preview when signing gate blocks', () => {
      mockUseCanProceedToSigning.mockReturnValue({
        canProceed: false,
        unresolvedCount: 2,
        unresolvedTermIds: ['t1', 't2'],
        unresolvedTerms: [],
        message: '2 terms need to be resolved.',
        a11yMessage: '2 terms need to be resolved.',
      })

      const onNavigationBlocked = vi.fn()
      const { result } = renderHook(() =>
        usePreviewFlow(createMockSession(), { onNavigationBlocked })
      )

      let success: boolean = false
      act(() => {
        success = result.current.goToPreview()
      })

      expect(success).toBe(false)
      expect(result.current.currentPhase).toBe('builder')
      expect(onNavigationBlocked).toHaveBeenCalledWith('preview', expect.any(String))
    })

    it('can navigate to signing when both have completed scroll', () => {
      const { result } = renderHook(() =>
        usePreviewFlow(createMockSession(), { initialPhase: 'preview' })
      )

      act(() => {
        result.current.updateScrollCompletion('parent', true)
        result.current.updateScrollCompletion('child', true)
      })

      let success: boolean = false
      act(() => {
        success = result.current.goToSigning()
      })

      expect(success).toBe(true)
      expect(result.current.currentPhase).toBe('signing')
    })

    it('blocks navigation to signing when parent has not completed scroll', () => {
      const onNavigationBlocked = vi.fn()
      const { result } = renderHook(() =>
        usePreviewFlow(createMockSession(), { initialPhase: 'preview', onNavigationBlocked })
      )

      act(() => {
        result.current.updateScrollCompletion('child', true)
      })

      let success: boolean = false
      act(() => {
        success = result.current.goToSigning()
      })

      expect(success).toBe(false)
      expect(result.current.currentPhase).toBe('preview')
      expect(onNavigationBlocked).toHaveBeenCalled()
    })

    it('blocks navigation to signing when child has not completed scroll', () => {
      const onNavigationBlocked = vi.fn()
      const { result } = renderHook(() =>
        usePreviewFlow(createMockSession(), { initialPhase: 'preview', onNavigationBlocked })
      )

      act(() => {
        result.current.updateScrollCompletion('parent', true)
      })

      let success: boolean = false
      act(() => {
        success = result.current.goToSigning()
      })

      expect(success).toBe(false)
      expect(result.current.currentPhase).toBe('preview')
      expect(onNavigationBlocked).toHaveBeenCalled()
    })
  })

  // ============================================
  // SCROLL STATE TESTS
  // ============================================

  describe('scroll state', () => {
    it('updates parent scroll completion', () => {
      const { result } = renderHook(() => usePreviewFlow(createMockSession()))

      act(() => {
        result.current.updateScrollCompletion('parent', true, 100)
      })

      expect(result.current.scrollState.parentComplete).toBe(true)
      expect(result.current.scrollState.parentProgress).toBe(100)
    })

    it('updates child scroll completion', () => {
      const { result } = renderHook(() => usePreviewFlow(createMockSession()))

      act(() => {
        result.current.updateScrollCompletion('child', true, 100)
      })

      expect(result.current.scrollState.childComplete).toBe(true)
      expect(result.current.scrollState.childProgress).toBe(100)
    })

    it('sets progress to 100 when marking complete without progress', () => {
      const { result } = renderHook(() => usePreviewFlow(createMockSession()))

      act(() => {
        result.current.updateScrollCompletion('parent', true)
      })

      expect(result.current.scrollState.parentProgress).toBe(100)
    })

    it('resets scroll state', () => {
      const { result } = renderHook(() => usePreviewFlow(createMockSession()))

      act(() => {
        result.current.updateScrollCompletion('parent', true, 100)
        result.current.updateScrollCompletion('child', true, 100)
      })

      act(() => {
        result.current.resetScrollState()
      })

      expect(result.current.scrollState).toEqual({
        parentComplete: false,
        childComplete: false,
        parentProgress: 0,
        childProgress: 0,
      })
    })
  })

  // ============================================
  // CALLBACKS TESTS
  // ============================================

  describe('callbacks', () => {
    it('calls onPhaseChange when phase changes', () => {
      const onPhaseChange = vi.fn()
      const { result } = renderHook(() =>
        usePreviewFlow(createMockSession(), { onPhaseChange })
      )

      act(() => {
        result.current.goToPreview()
      })

      expect(onPhaseChange).toHaveBeenCalledWith('preview', 'builder')
    })

    it('does not call onPhaseChange when staying on same phase', () => {
      const onPhaseChange = vi.fn()
      const { result } = renderHook(() =>
        usePreviewFlow(createMockSession(), { onPhaseChange })
      )

      act(() => {
        result.current.goToBuilder()
      })

      expect(onPhaseChange).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // GATE MESSAGE TESTS
  // ============================================

  describe('gate messages', () => {
    it('shows signing gate message at builder phase', () => {
      mockUseCanProceedToSigning.mockReturnValue({
        canProceed: false,
        unresolvedCount: 2,
        unresolvedTermIds: [],
        unresolvedTerms: [],
        message: 'Custom gate message',
        a11yMessage: 'Custom gate message',
      })

      const { result } = renderHook(() => usePreviewFlow(createMockSession()))
      expect(result.current.gateMessage).toBe('Custom gate message')
    })

    it('shows scroll message at preview phase when both incomplete', () => {
      const { result } = renderHook(() =>
        usePreviewFlow(createMockSession(), { initialPhase: 'preview' })
      )
      expect(result.current.gateMessage).toContain('Both parent and child')
    })

    it('shows parent-specific message when only parent incomplete', () => {
      const { result } = renderHook(() =>
        usePreviewFlow(createMockSession(), { initialPhase: 'preview' })
      )

      act(() => {
        result.current.updateScrollCompletion('child', true)
      })

      expect(result.current.gateMessage).toContain('Parent')
    })

    it('shows child-specific message when only child incomplete', () => {
      const { result } = renderHook(() =>
        usePreviewFlow(createMockSession(), { initialPhase: 'preview' })
      )

      act(() => {
        result.current.updateScrollCompletion('parent', true)
      })

      expect(result.current.gateMessage).toContain('Child')
    })

    it('shows ready message when both complete', () => {
      const { result } = renderHook(() =>
        usePreviewFlow(createMockSession(), { initialPhase: 'preview' })
      )

      act(() => {
        result.current.updateScrollCompletion('parent', true)
        result.current.updateScrollCompletion('child', true)
      })

      expect(result.current.gateMessage).toContain('Ready')
    })
  })

  // ============================================
  // CAN PROCEED FLAGS TESTS
  // ============================================

  describe('can proceed flags', () => {
    it('canProceedToPreview reflects signing gate', () => {
      mockUseCanProceedToSigning.mockReturnValue({
        canProceed: true,
        unresolvedCount: 0,
        unresolvedTermIds: [],
        unresolvedTerms: [],
        message: 'Ready',
        a11yMessage: 'Ready',
      })

      const { result } = renderHook(() => usePreviewFlow(createMockSession()))
      expect(result.current.canProceedToPreview).toBe(true)
    })

    it('canProceedToSigning reflects scroll completion', () => {
      const { result } = renderHook(() => usePreviewFlow(createMockSession()))

      expect(result.current.canProceedToSigning).toBe(false)

      act(() => {
        result.current.updateScrollCompletion('parent', true)
        result.current.updateScrollCompletion('child', true)
      })

      expect(result.current.canProceedToSigning).toBe(true)
    })
  })

  // ============================================
  // NULL SESSION TESTS
  // ============================================

  describe('null session', () => {
    it('handles null session gracefully', () => {
      const { result } = renderHook(() => usePreviewFlow(null))
      expect(result.current.currentPhase).toBe('builder')
    })

    it('handles undefined session gracefully', () => {
      const { result } = renderHook(() => usePreviewFlow(undefined))
      expect(result.current.currentPhase).toBe('builder')
    })
  })
})
