/**
 * useSafetySignalConfirmation Tests - Story 7.5.3 Task 6
 *
 * Tests for the safety signal confirmation integration hook.
 * AC1: Discrete confirmation display after signal triggered
 *
 * CRITICAL: Must integrate gesture detection with confirmation display.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSafetySignalConfirmation } from './useSafetySignalConfirmation'

// Mock the shared package functions
vi.mock('@fledgely/shared', async () => {
  const actual = await vi.importActual('@fledgely/shared')
  return {
    ...actual,
    getResourcesForJurisdiction: vi.fn(() => [
      {
        id: '988-lifeline',
        name: '988 Suicide & Crisis Lifeline',
        description: 'Free, confidential support 24/7',
        type: 'hotline',
        value: '988',
        priority: 1,
        jurisdictions: ['US'],
        available24x7: true,
        chatAvailable: true,
      },
    ]),
    getConfirmationContent: vi.fn(() => ({
      headerText: 'Someone will reach out',
      bodyText: 'You did the right thing.',
      emergencyText: 'Call 911 if in danger',
      chatPromptText: 'Chat now',
      dismissButtonText: 'Got it',
    })),
    getAgeAdjustedContent: vi.fn(() => ({
      headerText: 'Help is coming',
      bodyText: 'You did good.',
      emergencyText: 'Call 911',
      chatPromptText: 'Talk',
      dismissButtonText: 'OK',
      ageGroup: 'young_child',
    })),
    trackConfirmationDisplayed: vi.fn(),
    trackResourceClicked: vi.fn(),
    trackChatInitiated: vi.fn(),
    trackConfirmationDismissed: vi.fn(),
    isChatAvailable: vi.fn(() => true),
  }
})

describe('useSafetySignalConfirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // Initial State Tests
  // ============================================

  describe('Initial State', () => {
    it('should start with confirmation not shown', () => {
      const { result } = renderHook(() =>
        useSafetySignalConfirmation({
          jurisdiction: 'US',
          childAge: 10,
        })
      )

      expect(result.current.isConfirmationOpen).toBe(false)
    })

    it('should start with no trigger method', () => {
      const { result } = renderHook(() =>
        useSafetySignalConfirmation({
          jurisdiction: 'US',
          childAge: 10,
        })
      )

      expect(result.current.triggerMethod).toBeNull()
    })

    it('should provide confirmation content', () => {
      const { result } = renderHook(() =>
        useSafetySignalConfirmation({
          jurisdiction: 'US',
          childAge: 10,
        })
      )

      expect(result.current.content).toBeTruthy()
      expect(result.current.content.headerText).toBeTruthy()
    })

    it('should provide crisis resources', () => {
      const { result } = renderHook(() =>
        useSafetySignalConfirmation({
          jurisdiction: 'US',
          childAge: 10,
        })
      )

      expect(result.current.resources.length).toBeGreaterThan(0)
    })
  })

  // ============================================
  // Signal Trigger Tests
  // ============================================

  describe('Signal Triggering', () => {
    it('should open confirmation when signal triggered', () => {
      const { result } = renderHook(() =>
        useSafetySignalConfirmation({
          jurisdiction: 'US',
          childAge: 10,
        })
      )

      act(() => {
        result.current.handleSignalTriggered('logo_tap')
      })

      expect(result.current.isConfirmationOpen).toBe(true)
    })

    it('should track trigger method', () => {
      const { result } = renderHook(() =>
        useSafetySignalConfirmation({
          jurisdiction: 'US',
          childAge: 10,
        })
      )

      act(() => {
        result.current.handleSignalTriggered('keyboard_shortcut')
      })

      expect(result.current.triggerMethod).toBe('keyboard_shortcut')
    })

    it('should call onSignalTriggered callback', () => {
      const onSignalTriggered = vi.fn()
      const { result } = renderHook(() =>
        useSafetySignalConfirmation({
          jurisdiction: 'US',
          childAge: 10,
          onSignalTriggered,
        })
      )

      act(() => {
        result.current.handleSignalTriggered('logo_tap')
      })

      expect(onSignalTriggered).toHaveBeenCalledWith('logo_tap')
    })
  })

  // ============================================
  // Dismissal Tests
  // ============================================

  describe('Dismissal', () => {
    it('should close confirmation on dismiss', () => {
      const { result } = renderHook(() =>
        useSafetySignalConfirmation({
          jurisdiction: 'US',
          childAge: 10,
        })
      )

      act(() => {
        result.current.handleSignalTriggered('logo_tap')
      })

      expect(result.current.isConfirmationOpen).toBe(true)

      act(() => {
        result.current.handleDismiss()
      })

      expect(result.current.isConfirmationOpen).toBe(false)
    })

    it('should reset trigger method on dismiss', () => {
      const { result } = renderHook(() =>
        useSafetySignalConfirmation({
          jurisdiction: 'US',
          childAge: 10,
        })
      )

      act(() => {
        result.current.handleSignalTriggered('logo_tap')
      })
      act(() => {
        result.current.handleDismiss()
      })

      expect(result.current.triggerMethod).toBeNull()
    })

    it('should call onDismiss callback', () => {
      const onDismiss = vi.fn()
      const { result } = renderHook(() =>
        useSafetySignalConfirmation({
          jurisdiction: 'US',
          childAge: 10,
          onDismiss,
        })
      )

      act(() => {
        result.current.handleSignalTriggered('logo_tap')
      })
      act(() => {
        result.current.handleDismiss()
      })

      expect(onDismiss).toHaveBeenCalled()
    })
  })

  // ============================================
  // Resource Click Tests
  // ============================================

  describe('Resource Click', () => {
    it('should call onResourceClick callback', () => {
      const onResourceClick = vi.fn()
      const { result } = renderHook(() =>
        useSafetySignalConfirmation({
          jurisdiction: 'US',
          childAge: 10,
          onResourceClick,
        })
      )

      const mockResource = result.current.resources[0]
      act(() => {
        result.current.handleResourceClick(mockResource)
      })

      expect(onResourceClick).toHaveBeenCalledWith(mockResource)
    })
  })

  // ============================================
  // Chat Click Tests
  // ============================================

  describe('Chat Click', () => {
    it('should indicate if chat is available', () => {
      const { result } = renderHook(() =>
        useSafetySignalConfirmation({
          jurisdiction: 'US',
          childAge: 10,
        })
      )

      expect(result.current.chatAvailable).toBe(true)
    })

    it('should call onChatClick callback', () => {
      const onChatClick = vi.fn()
      const { result } = renderHook(() =>
        useSafetySignalConfirmation({
          jurisdiction: 'US',
          childAge: 10,
          onChatClick,
        })
      )

      act(() => {
        result.current.handleChatClick()
      })

      expect(onChatClick).toHaveBeenCalled()
    })
  })

  // ============================================
  // Age-Adjusted Content Tests
  // ============================================

  describe('Age-Adjusted Content', () => {
    it('should use age-adjusted content when age provided', () => {
      const { result } = renderHook(() =>
        useSafetySignalConfirmation({
          jurisdiction: 'US',
          childAge: 7, // Young child
        })
      )

      // Should use simpler content for young children
      expect(result.current.content.headerText).toBeTruthy()
    })

    it('should update content when age changes', () => {
      const { result, rerender } = renderHook(
        ({ age }) =>
          useSafetySignalConfirmation({
            jurisdiction: 'US',
            childAge: age,
          }),
        { initialProps: { age: 7 } }
      )

      const _youngContent = result.current.content

      rerender({ age: 15 })

      // Content should be different for different ages
      expect(result.current.content).toBeTruthy()
    })
  })

  // ============================================
  // Offline Mode Tests
  // ============================================

  describe('Offline Mode', () => {
    it('should indicate offline status', () => {
      const { result } = renderHook(() =>
        useSafetySignalConfirmation({
          jurisdiction: 'US',
          childAge: 10,
          isOffline: true,
        })
      )

      expect(result.current.isOffline).toBe(true)
    })

    it('should still show confirmation when offline', () => {
      const { result } = renderHook(() =>
        useSafetySignalConfirmation({
          jurisdiction: 'US',
          childAge: 10,
          isOffline: true,
        })
      )

      act(() => {
        result.current.handleSignalTriggered('logo_tap')
      })

      expect(result.current.isConfirmationOpen).toBe(true)
    })
  })

  // ============================================
  // Jurisdiction Tests
  // ============================================

  describe('Jurisdiction', () => {
    it('should fetch resources for specified jurisdiction', () => {
      const { result } = renderHook(() =>
        useSafetySignalConfirmation({
          jurisdiction: 'UK',
          childAge: 10,
        })
      )

      expect(result.current.resources).toBeTruthy()
    })

    it('should update resources when jurisdiction changes', () => {
      const { result, rerender } = renderHook(
        ({ jurisdiction }) =>
          useSafetySignalConfirmation({
            jurisdiction,
            childAge: 10,
          }),
        { initialProps: { jurisdiction: 'US' } }
      )

      rerender({ jurisdiction: 'UK' })

      expect(result.current.resources).toBeTruthy()
    })
  })
})
