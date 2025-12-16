'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { SessionTermType } from '@fledgely/contracts'
import { getTermTypeLabel, getTermExplanation, getTermCategoryColors } from './termUtils'

/**
 * Tooltip position relative to trigger element
 */
export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right'

/**
 * Props for the TermExplanationTooltip component
 */
export interface TermExplanationTooltipProps {
  /** The term type to explain */
  termType: SessionTermType
  /** Position of the tooltip relative to children */
  position?: TooltipPosition
  /** Additional CSS classes for the tooltip */
  className?: string
  /** Whether the tooltip is visible (controlled mode) */
  isOpen?: boolean
  /** Callback when visibility changes (controlled mode) */
  onOpenChange?: (isOpen: boolean) => void
  /** The trigger element(s) */
  children: React.ReactNode
  /** Delay before showing tooltip (ms) */
  showDelay?: number
  /** Delay before hiding tooltip (ms) */
  hideDelay?: number
  /** Data attribute for testing */
  'data-testid'?: string
}

/**
 * TermExplanationTooltip Component
 *
 * Story 5.2: Visual Agreement Builder - Task 3
 *
 * Child-friendly tooltip that explains term types at a 6th-grade reading level.
 * Features:
 * - Hover and focus activation (AC #3)
 * - Keyboard accessible (NFR43)
 * - Screen reader support via ARIA (NFR42)
 * - Position-aware display
 * - Show/hide delays for better UX
 *
 * @example
 * ```tsx
 * <TermExplanationTooltip termType="screen_time">
 *   <span>Screen Time</span>
 * </TermExplanationTooltip>
 * ```
 */
export function TermExplanationTooltip({
  termType,
  position = 'top',
  className = '',
  isOpen: controlledIsOpen,
  onOpenChange,
  children,
  showDelay = 200,
  hideDelay = 100,
  'data-testid': dataTestId,
}: TermExplanationTooltipProps) {
  // State for uncontrolled mode
  const [internalIsOpen, setInternalIsOpen] = useState(false)

  // Use controlled state if provided, otherwise use internal state
  const isControlled = controlledIsOpen !== undefined
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen

  // Refs for timeout management
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipId = `tooltip-${termType}-${Math.random().toString(36).slice(2, 9)}`

  // Get term information
  const label = getTermTypeLabel(termType)
  const explanation = getTermExplanation(termType)
  const colors = getTermCategoryColors(termType)

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current)
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    }
  }, [])

  // Update visibility
  const setIsOpen = useCallback(
    (value: boolean) => {
      if (isControlled) {
        onOpenChange?.(value)
      } else {
        setInternalIsOpen(value)
      }
    },
    [isControlled, onOpenChange]
  )

  // Handle show with delay
  const handleShow = useCallback(() => {
    // Clear any pending hide
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }

    // Set show timeout
    showTimeoutRef.current = setTimeout(() => {
      setIsOpen(true)
    }, showDelay)
  }, [setIsOpen, showDelay])

  // Handle hide with delay
  const handleHide = useCallback(() => {
    // Clear any pending show
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current)
      showTimeoutRef.current = null
    }

    // Set hide timeout
    hideTimeoutRef.current = setTimeout(() => {
      setIsOpen(false)
    }, hideDelay)
  }, [setIsOpen, hideDelay])

  // Handle immediate show (for focus)
  const handleFocus = useCallback(() => {
    if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current)
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    setIsOpen(true)
  }, [setIsOpen])

  // Handle immediate hide (for blur)
  const handleBlur = useCallback(() => {
    if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current)
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    setIsOpen(false)
  }, [setIsOpen])

  // Position classes
  const positionClasses: Record<TooltipPosition, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  // Arrow position classes
  const arrowClasses: Record<TooltipPosition, string> = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-900 dark:border-t-gray-100 border-b-transparent border-l-transparent border-r-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-900 dark:border-b-gray-100 border-t-transparent border-l-transparent border-r-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-900 dark:border-l-gray-100 border-r-transparent border-t-transparent border-b-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-900 dark:border-r-gray-100 border-l-transparent border-t-transparent border-b-transparent',
  }

  return (
    <div
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={handleShow}
      onMouseLeave={handleHide}
      onFocus={handleFocus}
      onBlur={handleBlur}
      data-testid={dataTestId}
    >
      {/* Trigger element wrapper */}
      <div
        aria-describedby={isOpen ? tooltipId : undefined}
      >
        {children}
      </div>

      {/* Tooltip */}
      {isOpen && (
        <div
          id={tooltipId}
          role="tooltip"
          className={`
            absolute z-50 px-3 py-2
            bg-gray-900 dark:bg-gray-100
            text-white dark:text-gray-900
            text-sm rounded-lg shadow-lg
            max-w-xs whitespace-normal
            ${positionClasses[position]}
            ${className}
          `}
          data-testid={`${dataTestId ?? 'tooltip'}-content`}
        >
          {/* Tooltip content */}
          <div className="text-center">
            {/* Term type label with category color */}
            <span className={`font-medium ${colors.text}`}>{label}</span>

            {/* Child-friendly explanation (6th-grade reading level per NFR65) */}
            <p className="mt-1 text-gray-300 dark:text-gray-600 text-xs">
              {explanation}
            </p>
          </div>

          {/* Arrow indicator */}
          <div
            className={`absolute border-4 ${arrowClasses[position]}`}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  )
}

/**
 * Simple tooltip wrapper for quick usage
 * Wraps children with tooltip behavior
 */
export function TermTooltipTrigger({
  termType,
  children,
  className,
}: {
  termType: SessionTermType
  children: React.ReactNode
  className?: string
}) {
  return (
    <TermExplanationTooltip termType={termType} className={className}>
      <span className="cursor-help" tabIndex={0}>
        {children}
      </span>
    </TermExplanationTooltip>
  )
}

export default TermExplanationTooltip
