/**
 * useSafetySignalConfirmation Hook - Story 7.5.3 Task 6
 *
 * Integration hook for safety signal confirmation flow.
 * Connects gesture detection with confirmation display.
 *
 * AC1: Discrete confirmation display after signal triggered
 *
 * CRITICAL: Must handle offline mode gracefully.
 */

import { useState, useCallback, useMemo, useRef } from 'react'
import {
  getResourcesForJurisdiction,
  getAgeAdjustedContent,
  getConfirmationContent,
  trackConfirmationDisplayed,
  trackResourceClicked,
  trackChatInitiated,
  trackConfirmationDismissed,
  isChatAvailable,
  type SignalCrisisResource,
  type ConfirmationContent,
} from '@fledgely/shared'
import type { TriggerMethod } from './SafetySignalGestureDetector'

export interface UseSafetySignalConfirmationProps {
  /** Jurisdiction for resources and content */
  jurisdiction: string
  /** Child's age for age-appropriate content */
  childAge: number
  /** Whether device is offline */
  isOffline?: boolean
  /** Callback when signal is triggered */
  onSignalTriggered?: (method: TriggerMethod) => void
  /** Callback when confirmation is dismissed */
  onDismiss?: () => void
  /** Callback when resource is clicked */
  onResourceClick?: (resource: SignalCrisisResource) => void
  /** Callback when chat is clicked */
  onChatClick?: () => void
}

export interface UseSafetySignalConfirmationReturn {
  /** Whether confirmation is currently open */
  isConfirmationOpen: boolean
  /** How the signal was triggered */
  triggerMethod: TriggerMethod | null
  /** Confirmation content to display */
  content: ConfirmationContent
  /** Crisis resources to display */
  resources: SignalCrisisResource[]
  /** Whether chat is available */
  chatAvailable: boolean
  /** Whether device is offline */
  isOffline: boolean
  /** Handler for signal triggered */
  handleSignalTriggered: (method: TriggerMethod) => void
  /** Handler for dismissing confirmation */
  handleDismiss: () => void
  /** Handler for resource click */
  handleResourceClick: (resource: SignalCrisisResource) => void
  /** Handler for chat click */
  handleChatClick: () => void
}

/**
 * Hook to manage safety signal confirmation flow.
 *
 * Integrates:
 * - Gesture detection trigger
 * - Confirmation content (age-appropriate)
 * - Crisis resources (jurisdiction-specific)
 * - Analytics tracking
 */
export function useSafetySignalConfirmation({
  jurisdiction,
  childAge,
  isOffline = false,
  onSignalTriggered,
  onDismiss,
  onResourceClick,
  onChatClick,
}: UseSafetySignalConfirmationProps): UseSafetySignalConfirmationReturn {
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  const [triggerMethod, setTriggerMethod] = useState<TriggerMethod | null>(null)
  const displayTimeRef = useRef<number>(0)

  // Get age-appropriate content
  const content = useMemo(() => {
    if (childAge) {
      return getAgeAdjustedContent(childAge, jurisdiction)
    }
    return getConfirmationContent(jurisdiction)
  }, [childAge, jurisdiction])

  // Get jurisdiction-specific resources
  const resources = useMemo(() => {
    return getResourcesForJurisdiction(jurisdiction)
  }, [jurisdiction])

  // Check if chat is available
  const chatAvailable = useMemo(() => {
    return isChatAvailable(jurisdiction)
  }, [jurisdiction])

  /**
   * Handle signal triggered from gesture detector
   */
  const handleSignalTriggered = useCallback(
    (method: TriggerMethod) => {
      setTriggerMethod(method)
      setIsConfirmationOpen(true)
      displayTimeRef.current = Date.now()

      // Track analytics
      const ageGroup = childAge <= 8 ? 'young_child' : childAge <= 12 ? 'middle_child' : 'teen'
      trackConfirmationDisplayed(jurisdiction, ageGroup)

      // Call external callback
      onSignalTriggered?.(method)
    },
    [jurisdiction, childAge, onSignalTriggered]
  )

  /**
   * Handle confirmation dismissed
   */
  const handleDismiss = useCallback(() => {
    const viewDuration = Date.now() - displayTimeRef.current
    trackConfirmationDismissed(jurisdiction, viewDuration)

    setIsConfirmationOpen(false)
    setTriggerMethod(null)

    onDismiss?.()
  }, [jurisdiction, onDismiss])

  /**
   * Handle resource clicked
   */
  const handleResourceClick = useCallback(
    (resource: SignalCrisisResource) => {
      trackResourceClicked(resource.id, resource.type, jurisdiction)
      onResourceClick?.(resource)
    },
    [jurisdiction, onResourceClick]
  )

  /**
   * Handle chat clicked
   */
  const handleChatClick = useCallback(() => {
    const chatResource = resources.find((r) => r.chatAvailable)
    if (chatResource) {
      trackChatInitiated(chatResource.id, jurisdiction)
    }
    onChatClick?.()
  }, [jurisdiction, resources, onChatClick])

  return {
    isConfirmationOpen,
    triggerMethod,
    content,
    resources,
    chatAvailable,
    isOffline,
    handleSignalTriggered,
    handleDismiss,
    handleResourceClick,
    handleChatClick,
  }
}
