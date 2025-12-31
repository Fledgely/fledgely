'use client'

/**
 * useDemo Hook
 *
 * Story 8.5.1: Demo Child Profile Creation
 *
 * Manages demo profile visibility for families without real children.
 * - Shows demo when family has no children and showDemoProfile is true
 * - Provides dismissDemo() to hide demo permanently
 * - Auto-dismisses demo when first real child is added
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
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
  const [loading, setLoading] = useState(true)
  const [dismissing, setDismissing] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        } else {
          // Family doesn't exist, default to true
          setShowDemoProfile(true)
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
  }
}
