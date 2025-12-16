'use client'

import { useEffect, useCallback, useRef } from 'react'

/**
 * useFocusTrap Hook
 *
 * Story 6.7: Signature Accessibility - Task 4.1
 *
 * Traps keyboard focus within a container element. Essential for
 * accessible modals and dialogs per WCAG 2.1 AA (NFR42).
 *
 * Features:
 * - Traps Tab and Shift+Tab within container
 * - Auto-focuses first focusable element on mount
 * - Returns focus to trigger element on unmount
 * - Handles dynamic content changes
 *
 * @param containerRef - Ref to the container element
 * @param options - Configuration options
 * @returns Object with manual focus management functions
 *
 * @example
 * ```tsx
 * function Modal({ isOpen, onClose }) {
 *   const containerRef = useRef<HTMLDivElement>(null)
 *   const { focusFirst } = useFocusTrap(containerRef, { enabled: isOpen })
 *
 *   return (
 *     <div ref={containerRef} role="dialog" aria-modal="true">
 *       <button>First button</button>
 *       <button onClick={onClose}>Close</button>
 *     </div>
 *   )
 * }
 * ```
 */

interface UseFocusTrapOptions {
  /** Whether focus trap is enabled */
  enabled?: boolean
  /** Initial element to focus (selector or element) */
  initialFocus?: string | HTMLElement | null
  /** Return focus to this element when trap is disabled */
  returnFocusTo?: HTMLElement | null
  /** Callback when Escape is pressed */
  onEscape?: () => void
}

interface UseFocusTrapReturn {
  /** Manually focus the first focusable element */
  focusFirst: () => void
  /** Manually focus the last focusable element */
  focusLast: () => void
  /** Get all focusable elements in the container */
  getFocusableElements: () => HTMLElement[]
}

const FOCUSABLE_SELECTOR = [
  'button:not([disabled]):not([tabindex="-1"])',
  '[href]:not([tabindex="-1"])',
  'input:not([disabled]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  options: UseFocusTrapOptions = {}
): UseFocusTrapReturn {
  const {
    enabled = true,
    initialFocus = null,
    returnFocusTo = null,
    onEscape,
  } = options

  // Store the element that had focus before trap was enabled
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  const getFocusableElements = useCallback((): HTMLElement[] => {
    const container = containerRef.current
    if (!container) return []

    const elements = container.querySelectorAll(FOCUSABLE_SELECTOR)
    return Array.from(elements) as HTMLElement[]
  }, [containerRef])

  const focusFirst = useCallback(() => {
    const focusable = getFocusableElements()
    if (focusable.length > 0) {
      focusable[0].focus()
    }
  }, [getFocusableElements])

  const focusLast = useCallback(() => {
    const focusable = getFocusableElements()
    if (focusable.length > 0) {
      focusable[focusable.length - 1].focus()
    }
  }, [getFocusableElements])

  useEffect(() => {
    if (!enabled) return

    const container = containerRef.current
    if (!container) return

    // Store currently focused element
    previouslyFocusedRef.current = document.activeElement as HTMLElement

    // Set initial focus
    const setInitialFocus = () => {
      if (typeof initialFocus === 'string') {
        const element = container.querySelector(initialFocus) as HTMLElement
        element?.focus()
      } else if (initialFocus instanceof HTMLElement) {
        initialFocus.focus()
      } else {
        focusFirst()
      }
    }

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(setInitialFocus, 0)

    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle Escape key
      if (event.key === 'Escape' && onEscape) {
        event.preventDefault()
        onEscape()
        return
      }

      // Only trap Tab key
      if (event.key !== 'Tab') return

      const focusable = getFocusableElements()
      if (focusable.length === 0) return

      const firstElement = focusable[0]
      const lastElement = focusable[focusable.length - 1]

      // Shift+Tab: if on first element, go to last
      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        }
      }
      // Tab: if on last element, go to first
      else {
        if (document.activeElement === lastElement) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)

    return () => {
      clearTimeout(timeoutId)
      container.removeEventListener('keydown', handleKeyDown)

      // Return focus to previous element or specified element
      const returnTo = returnFocusTo || previouslyFocusedRef.current
      if (returnTo && typeof returnTo.focus === 'function') {
        // Small delay to ensure cleanup completes
        setTimeout(() => returnTo.focus(), 0)
      }
    }
  }, [enabled, containerRef, initialFocus, returnFocusTo, onEscape, focusFirst, getFocusableElements])

  return {
    focusFirst,
    focusLast,
    getFocusableElements,
  }
}

export type { UseFocusTrapOptions, UseFocusTrapReturn }
