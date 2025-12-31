'use client'

/**
 * useDemo Hook
 *
 * Story 8.5.1: Demo Child Profile Creation
 * Story 8.5.5: Demo-to-Real Transition
 * Story 8.5.6: Demo for Child Explanation
 *
 * Manages demo profile visibility for families without real children.
 * - Shows demo when family has no children and showDemoProfile is true
 * - Provides dismissDemo() to hide demo permanently
 * - Auto-archives demo when first real child is added (Story 8.5.5)
 * - Provides archiveDemo() and reactivateDemo() for transition flow
 * - Provides child explanation mode for showing demo to children (Story 8.5.6)
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import {
  DEMO_CHILD_PROFILE,
  DEMO_SCREENSHOTS,
  getDemoActivitySummary,
  type DemoScreenshot,
  type DemoActivitySummary,
} from '../data/demoData'
import type { ChildProfile } from '@fledgely/shared/contracts'

/**
 * Demo child type - extends ChildProfile with demo-specific fields.
 * Uses a minimal subset since demos don't need guardians.
 */
export type DemoChild = Omit<ChildProfile, 'guardians' | 'guardianUids' | 'custody'> & {
  isDemo: true
}

/**
 * Result from useDemo hook
 */
export interface UseDemoResult {
  /** Whether demo should be shown */
  showDemo: boolean
  /** The demo child profile (null if demo not shown) */
  demoChild: DemoChild | null
  /** Sample screenshots for the demo */
  demoScreenshots: DemoScreenshot[]
  /** Activity summary for demo display */
  activitySummary: DemoActivitySummary
  /** Dismiss the demo profile permanently */
  dismissDemo: () => Promise<void>
  /** Whether dismiss is in progress */
  dismissing: boolean
  /** Error message if any */
  error: string | null
  /** Loading state */
  loading: boolean
  /** Whether demo has been archived (Story 8.5.5) */
  demoArchived: boolean
  /** Archive the demo (called when real child is added) */
  archiveDemo: () => Promise<void>
  /** Reactivate archived demo for reference */
  reactivateDemo: () => Promise<void>
  /** Whether archive/reactivate is in progress */
  archiving: boolean
  /** Whether child explanation mode is active (Story 8.5.6) */
  isChildExplanationMode: boolean
  /** Enter child explanation mode for showing demo to child */
  enterChildExplanationMode: () => void
  /** Exit child explanation mode */
  exitChildExplanationMode: () => void
  /** Shareable URL for child to view demo on their device (null when not in child mode) */
  childModeShareUrl: string | null
}

/**
 * Hook to manage demo profile visibility
 *
 * @param familyId - The family ID to check demo state for
 * @param hasRealChildren - Whether the family has real children (from useChildren)
 * @returns Demo state and controls
 */
export function useDemo(familyId: string | null, hasRealChildren: boolean): UseDemoResult {
  const [showDemoProfile, setShowDemoProfile] = useState<boolean>(true)
  const [demoArchived, setDemoArchived] = useState<boolean>(false)
  const [loading, setLoading] = useState(true)
  const [dismissing, setDismissing] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Story 8.5.6: Child explanation mode
  const [isChildExplanationMode, setIsChildExplanationMode] = useState(false)

  // Subscribe to family document for showDemoProfile field
  useEffect(() => {
    if (!familyId) {
      setLoading(false)
      return
    }

    const db = getFirestoreDb()
    const familyRef = doc(db, 'families', familyId)

    const unsubscribe = onSnapshot(
      familyRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data()
          // Default to true if field doesn't exist (for existing families)
          setShowDemoProfile(data.showDemoProfile ?? true)
          // Track archived state (Story 8.5.5)
          setDemoArchived(data.demoArchived ?? false)
        } else {
          // Family doesn't exist, default to true
          setShowDemoProfile(true)
          setDemoArchived(false)
        }
        setLoading(false)
      },
      (err) => {
        console.error('Error fetching family for demo state:', err)
        setError('Failed to load demo state')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [familyId])

  // Track previous value of hasRealChildren for auto-archive detection
  const prevHasRealChildrenRef = useRef<boolean>(hasRealChildren)
  // Track if auto-archive is in progress to prevent race conditions
  const [autoArchiving, setAutoArchiving] = useState(false)

  // Auto-archive when first real child is added (Story 8.5.5 AC4)
  useEffect(() => {
    const previousValue = prevHasRealChildrenRef.current
    prevHasRealChildrenRef.current = hasRealChildren

    // Only auto-archive if:
    // 1. We transitioned from no children to having children
    // 2. Not currently auto-archiving (prevents race condition)
    // 3. Demo was showing (not already dismissed)
    // 4. Demo is not already archived
    if (
      !previousValue &&
      hasRealChildren &&
      !autoArchiving &&
      showDemoProfile &&
      !demoArchived &&
      familyId
    ) {
      setAutoArchiving(true)

      // Perform auto-archive
      const performAutoArchive = async () => {
        try {
          const db = getFirestoreDb()
          const familyRef = doc(db, 'families', familyId)

          await updateDoc(familyRef, {
            showDemoProfile: false,
            demoArchived: true,
            updatedAt: new Date(),
          })

          // State will be updated by the onSnapshot listener
        } catch (err) {
          console.error('Error auto-archiving demo:', err)
          // Don't set error for auto-archive failure - it's not critical
        } finally {
          setAutoArchiving(false)
        }
      }

      performAutoArchive()
    }
  }, [hasRealChildren, showDemoProfile, demoArchived, familyId, autoArchiving])

  // Dismiss demo profile
  const dismissDemo = useCallback(async () => {
    if (!familyId) {
      setError('No family ID provided')
      return
    }

    setDismissing(true)
    setError(null)

    try {
      const db = getFirestoreDb()
      const familyRef = doc(db, 'families', familyId)

      await updateDoc(familyRef, {
        showDemoProfile: false,
        updatedAt: new Date(),
      })

      setShowDemoProfile(false)
    } catch (err) {
      console.error('Error dismissing demo:', err)
      setError('Failed to dismiss demo')
    } finally {
      setDismissing(false)
    }
  }, [familyId])

  // Archive demo profile (Story 8.5.5)
  // Called when real child is added - demo becomes accessible from help section
  const archiveDemo = useCallback(async () => {
    if (!familyId) {
      setError('No family ID provided')
      return
    }

    setArchiving(true)
    setError(null)

    try {
      const db = getFirestoreDb()
      const familyRef = doc(db, 'families', familyId)

      await updateDoc(familyRef, {
        showDemoProfile: false,
        demoArchived: true,
        updatedAt: new Date(),
      })

      setShowDemoProfile(false)
      setDemoArchived(true)
    } catch (err) {
      console.error('Error archiving demo:', err)
      setError('Failed to archive demo')
    } finally {
      setArchiving(false)
    }
  }, [familyId])

  // Reactivate archived demo (Story 8.5.5)
  // Allows parent to access demo from help section for reference
  const reactivateDemo = useCallback(async () => {
    if (!familyId) {
      setError('No family ID provided')
      return
    }

    setArchiving(true)
    setError(null)

    try {
      const db = getFirestoreDb()
      const familyRef = doc(db, 'families', familyId)

      await updateDoc(familyRef, {
        showDemoProfile: true,
        // Keep demoArchived true so we know it was previously archived
        updatedAt: new Date(),
      })

      setShowDemoProfile(true)
    } catch (err) {
      console.error('Error reactivating demo:', err)
      setError('Failed to reactivate demo')
    } finally {
      setArchiving(false)
    }
  }, [familyId])

  // Story 8.5.6: Enter child explanation mode
  const enterChildExplanationMode = useCallback(() => {
    setIsChildExplanationMode(true)
  }, [])

  // Story 8.5.6: Exit child explanation mode
  const exitChildExplanationMode = useCallback(() => {
    setIsChildExplanationMode(false)
  }, [])

  // Story 8.5.6: Generate shareable URL for child device viewing
  const childModeShareUrl = useMemo(() => {
    if (!isChildExplanationMode || !familyId) return null
    // Generate URL with query parameter for child mode
    // In a real implementation, this would use the window.location
    // For now, we generate a relative URL pattern
    return `/demo?mode=child-explain&family=${familyId}`
  }, [isChildExplanationMode, familyId])

  // Calculate whether to show demo
  // Show demo when:
  // 1. familyId exists AND
  // 2. No real children exist AND
  // 3. showDemoProfile is true (not dismissed)
  const showDemo = useMemo(() => {
    return !!familyId && !hasRealChildren && showDemoProfile
  }, [familyId, hasRealChildren, showDemoProfile])

  // Create demo child with actual familyId
  const demoChild: DemoChild | null = useMemo(() => {
    if (!showDemo || !familyId) return null

    return {
      ...DEMO_CHILD_PROFILE,
      familyId,
    }
  }, [showDemo, familyId])

  // Activity summary
  const activitySummary = useMemo(() => getDemoActivitySummary(), [])

  return {
    showDemo,
    demoChild,
    demoScreenshots: showDemo ? DEMO_SCREENSHOTS : [],
    activitySummary,
    dismissDemo,
    dismissing,
    error,
    loading,
    demoArchived,
    archiveDemo,
    reactivateDemo,
    archiving,
    // Story 8.5.6: Child explanation mode
    isChildExplanationMode,
    enterChildExplanationMode,
    exitChildExplanationMode,
    childModeShareUrl,
  }
}
