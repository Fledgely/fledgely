/**
 * useAgreementHistory Hook - Story 34.6
 *
 * Hook to fetch and manage agreement version history from Firestore.
 * AC1: Timeline shows all versions with dates
 * AC2: Each change shows who proposed, who accepted, what changed
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import type { HistoryVersion } from '@fledgely/shared'

export interface UseAgreementHistoryParams {
  familyId: string
  agreementId: string
}

export interface UseAgreementHistoryResult {
  /** List of agreement versions, ordered by versionNumber descending */
  versions: HistoryVersion[]
  /** Total number of versions */
  versionCount: number
  /** Most recent version */
  latestVersion: HistoryVersion | null
  /** Whether data is being fetched */
  loading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Refetch the history */
  refetch: () => Promise<void>
  /** Get a specific version by ID */
  getVersionById: (id: string) => HistoryVersion | undefined
}

/**
 * Hook to fetch agreement version history.
 * Returns versions ordered by versionNumber descending (newest first).
 */
export function useAgreementHistory({
  familyId,
  agreementId,
}: UseAgreementHistoryParams): UseAgreementHistoryResult {
  const [versions, setVersions] = useState<HistoryVersion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  const fetchVersions = useCallback(async () => {
    if (!familyId || !agreementId) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const db = getFirestoreDb()
      const versionsRef = collection(
        db,
        'families',
        familyId,
        'agreements',
        agreementId,
        'versions'
      )
      const versionsQuery = query(versionsRef, orderBy('versionNumber', 'desc'))
      const snapshot = await getDocs(versionsQuery)

      if (!isMountedRef.current) return

      const fetchedVersions: HistoryVersion[] = snapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          versionNumber: data.versionNumber,
          proposerId: data.proposerId,
          proposerName: data.proposerName,
          accepterId: data.accepterId,
          accepterName: data.accepterName,
          changes: data.changes || [],
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
          note: data.note,
        }
      })

      setVersions(fetchedVersions)
    } catch (err) {
      if (!isMountedRef.current) return
      console.error('Failed to fetch agreement history:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setVersions([])
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [familyId, agreementId])

  useEffect(() => {
    isMountedRef.current = true
    fetchVersions()

    return () => {
      isMountedRef.current = false
    }
  }, [fetchVersions])

  const getVersionById = useCallback(
    (id: string): HistoryVersion | undefined => {
      return versions.find((v) => v.id === id)
    },
    [versions]
  )

  return {
    versions,
    versionCount: versions.length,
    latestVersion: versions.length > 0 ? versions[0] : null,
    loading,
    error,
    refetch: fetchVersions,
    getVersionById,
  }
}
