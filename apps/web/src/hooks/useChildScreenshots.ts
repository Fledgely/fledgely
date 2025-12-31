/**
 * useChildScreenshots Hook - Story 19B.1
 *
 * Fetches screenshots for an authenticated child from Firestore.
 * Uses cursor-based pagination for infinite scroll.
 *
 * Task 2: Create Screenshot Service (AC: #2, #3, #4)
 * - 2.1 Create useChildScreenshots hook to fetch from Firestore
 * - 2.2 Query /children/{childId}/screenshots with timestamp ordering
 * - 2.3 Implement pagination with cursor-based infinite scroll
 * - 2.4 Add real-time listener for new screenshots
 * - 2.5 Create loading and error states
 *
 * IMPORTANT: Security Implementation Note
 * ----------------------------------------
 * The current child authentication uses localStorage sessions (not Firebase Auth).
 * For MVP, security rules in firestore.rules allow child read access via custom
 * token with childId claim: `request.auth.token.childId == childId`
 *
 * To enable this in production, the child login flow needs to:
 * 1. Call a Cloud Function that validates the family code + child selection
 * 2. Generate a Firebase custom token with childId claim
 * 3. Sign in with the custom token using Firebase Auth
 *
 * This is planned for a future enhancement story (Epic 19B+).
 * For MVP demo/testing, guardians can access screenshots on behalf of children.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  getDocs,
  QueryDocumentSnapshot,
  DocumentData,
  Timestamp,
} from 'firebase/firestore'
import { getDownloadURL, ref } from 'firebase/storage'
import { getStorage } from 'firebase/storage'
import { getFirestoreDb, getFirebaseApp } from '../lib/firebase'

/**
 * Accessibility description status for screen reader integration.
 * Story 28.3: Screen Reader Integration - AC1, AC2
 */
export interface AccessibilityDescriptionStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  description?: string
  wordCount?: number
}

/**
 * Screenshot with resolved image URL
 */
export interface ChildScreenshot {
  id: string
  imageUrl: string
  timestamp: number
  url: string
  title: string
  deviceId: string
  /**
   * AI-generated accessibility description for screen readers.
   * Story 28.3: Screen Reader Integration - AC1, AC2
   */
  accessibilityDescription?: AccessibilityDescriptionStatus
}

/**
 * Hook options
 */
interface UseChildScreenshotsOptions {
  childId: string | null
  pageSize?: number
  enabled?: boolean
}

/**
 * Hook result
 */
interface UseChildScreenshotsResult {
  screenshots: ChildScreenshot[]
  loading: boolean
  loadingMore: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => Promise<void>
  refresh: () => void
}

/**
 * Default page size for screenshot loading
 */
const DEFAULT_PAGE_SIZE = 20

/**
 * Default days to show in gallery (AC2: last 7 days)
 */
const DEFAULT_DAYS_TO_SHOW = 7

/**
 * Parse accessibility description from Firestore document.
 * Story 28.3: Screen Reader Integration - AC1, AC2
 */
function parseAccessibilityDescription(
  data: DocumentData
): AccessibilityDescriptionStatus | undefined {
  const desc = data.accessibilityDescription
  if (!desc) return undefined

  // Only include if status is valid
  const validStatuses = ['pending', 'processing', 'completed', 'failed'] as const
  if (!validStatuses.includes(desc.status)) return undefined

  return {
    status: desc.status,
    description: desc.description || undefined,
    wordCount: typeof desc.wordCount === 'number' ? desc.wordCount : undefined,
  }
}

/**
 * Convert Firestore document to ChildScreenshot
 */
async function convertToChildScreenshot(
  doc: QueryDocumentSnapshot<DocumentData>
): Promise<ChildScreenshot | null> {
  try {
    const data = doc.data()

    // Get timestamp - handle both Firestore Timestamp and number
    let timestamp: number
    if (data.timestamp instanceof Timestamp) {
      timestamp = data.timestamp.toMillis()
    } else if (typeof data.timestamp === 'number') {
      timestamp = data.timestamp
    } else {
      timestamp = Date.now()
    }

    // Get download URL from Firebase Storage
    let imageUrl = ''
    if (data.storagePath) {
      try {
        const storage = getStorage(getFirebaseApp())
        const storageRef = ref(storage, data.storagePath)
        imageUrl = await getDownloadURL(storageRef)
      } catch {
        // Failed to get image URL - use placeholder
        imageUrl = ''
      }
    }

    // Story 28.3: Parse accessibility description for screen readers
    const accessibilityDescription = parseAccessibilityDescription(data)

    return {
      id: doc.id,
      imageUrl,
      timestamp,
      url: data.url || '',
      title: data.title || 'Screenshot',
      deviceId: data.deviceId || '',
      accessibilityDescription,
    }
  } catch {
    return null
  }
}

/**
 * Hook to fetch and paginate child screenshots
 */
export function useChildScreenshots({
  childId,
  pageSize = DEFAULT_PAGE_SIZE,
  enabled = true,
}: UseChildScreenshotsOptions): UseChildScreenshotsResult {
  const [screenshots, setScreenshots] = useState<ChildScreenshot[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)

  // Track last document for pagination
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null)

  // Track if initial load has happened
  const initialLoadDone = useRef(false)

  /**
   * Load initial screenshots with real-time updates
   */
  useEffect(() => {
    if (!childId || !enabled) {
      setScreenshots([])
      setLoading(false)
      setHasMore(false)
      return
    }

    setLoading(true)
    setError(null)
    initialLoadDone.current = false

    const db = getFirestoreDb()
    const screenshotsRef = collection(db, `children/${childId}/screenshots`)

    // AC2: Filter to last 7 days
    const sevenDaysAgo = Date.now() - DEFAULT_DAYS_TO_SHOW * 24 * 60 * 60 * 1000

    // Query screenshots ordered by timestamp (newest first), filtered to last 7 days
    const screenshotsQuery = query(
      screenshotsRef,
      where('timestamp', '>=', sevenDaysAgo),
      orderBy('timestamp', 'desc'),
      limit(pageSize)
    )

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      screenshotsQuery,
      async (snapshot) => {
        try {
          // Convert documents to screenshots
          const screenshotPromises = snapshot.docs.map(convertToChildScreenshot)
          const results = await Promise.all(screenshotPromises)
          const validScreenshots = results.filter((s): s is ChildScreenshot => s !== null)

          // Update last doc for pagination
          if (snapshot.docs.length > 0) {
            lastDocRef.current = snapshot.docs[snapshot.docs.length - 1]
          }

          // Check if there are more screenshots
          setHasMore(snapshot.docs.length === pageSize)

          setScreenshots(validScreenshots)
          setError(null)
          initialLoadDone.current = true
        } catch (err) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error processing screenshots:', err)
          }
          setError('Failed to load your pictures')
        }
        setLoading(false)
      },
      (err) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error listening to screenshots:', err)
        }
        setError('Failed to load your pictures')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [childId, pageSize, enabled])

  /**
   * Load more screenshots for infinite scroll
   */
  const loadMore = useCallback(async () => {
    if (!childId || !hasMore || loadingMore || !lastDocRef.current) {
      return
    }

    setLoadingMore(true)

    try {
      const db = getFirestoreDb()
      const screenshotsRef = collection(db, `children/${childId}/screenshots`)

      // Query next page starting after last document
      const nextQuery = query(
        screenshotsRef,
        orderBy('timestamp', 'desc'),
        startAfter(lastDocRef.current),
        limit(pageSize)
      )

      const snapshot = await getDocs(nextQuery)

      // Convert documents to screenshots
      const screenshotPromises = snapshot.docs.map(convertToChildScreenshot)
      const results = await Promise.all(screenshotPromises)
      const newScreenshots = results.filter((s): s is ChildScreenshot => s !== null)

      // Update last doc for next pagination
      if (snapshot.docs.length > 0) {
        lastDocRef.current = snapshot.docs[snapshot.docs.length - 1]
      }

      // Check if there are more screenshots
      setHasMore(snapshot.docs.length === pageSize)

      // Append new screenshots
      setScreenshots((prev) => [...prev, ...newScreenshots])
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error loading more screenshots:', err)
      }
      setError('Failed to load more pictures')
    }

    setLoadingMore(false)
  }, [childId, hasMore, loadingMore, pageSize])

  /**
   * Refresh screenshots - resets to initial state
   */
  const refresh = useCallback(() => {
    lastDocRef.current = null
    setScreenshots([])
    setHasMore(true)
    setLoading(true)
    initialLoadDone.current = false
  }, [])

  return {
    screenshots,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
  }
}
