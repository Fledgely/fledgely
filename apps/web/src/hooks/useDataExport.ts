'use client'

/**
 * useDataExport Hook - Story 51.1
 *
 * Manages GDPR data export requests and status.
 *
 * Acceptance Criteria:
 * - AC1: Request export from settings
 * - AC7: One active export per family
 *
 * Features:
 * - Real-time subscription to export status
 * - Request new export
 * - Auto-poll when processing
 */

import { useState, useEffect, useCallback } from 'react'
import { httpsCallable, HttpsCallableResult } from 'firebase/functions'
import { doc, onSnapshot } from 'firebase/firestore'
import { getFirebaseFunctions, getFirestoreDb } from '../lib/firebase'
import type { RequestDataExportResponse, DataExportRequest } from '@fledgely/shared'

/**
 * Export state for UI display
 */
export type ExportStatus =
  | 'idle'
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'expired'
  | 'already_in_progress'

/**
 * Hook return type
 */
export interface UseDataExportReturn {
  // State
  status: ExportStatus
  exportRequest: DataExportRequest | null
  loading: boolean
  actionLoading: boolean
  error: string | null

  // Computed
  canRequestExport: boolean
  downloadUrl: string | null
  expiresAt: Date | null
  fileSize: number | null
  estimatedCompletionAt: Date | null

  // Actions
  requestExport: () => Promise<boolean>
  clearError: () => void
  refreshStatus: () => void
}

/**
 * Format file size for display.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} bytes`
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  } else {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }
}

/**
 * Hook for managing GDPR data export requests.
 *
 * @param familyId - The family ID to manage exports for
 * @returns Export state and operations
 */
export function useDataExport(familyId: string | null): UseDataExportReturn {
  // State
  const [exportRequest, setExportRequest] = useState<DataExportRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [latestExportId, setLatestExportId] = useState<string | null>(null)

  // Clear error
  const clearError = useCallback(() => setError(null), [])

  // Force refresh
  const refreshStatus = useCallback(() => setRefreshKey((k) => k + 1), [])

  // Calculate status
  const status: ExportStatus =
    exportRequest?.status === 'pending'
      ? 'pending'
      : exportRequest?.status === 'processing'
        ? 'processing'
        : exportRequest?.status === 'completed'
          ? 'completed'
          : exportRequest?.status === 'failed'
            ? 'failed'
            : exportRequest?.status === 'expired'
              ? 'expired'
              : 'idle'

  // Can request if no active export or previous export is done
  const canRequestExport =
    !actionLoading &&
    (status === 'idle' || status === 'completed' || status === 'failed' || status === 'expired')

  // Download info
  const downloadUrl = exportRequest?.downloadUrl || null
  const expiresAt = exportRequest?.expiresAt ? new Date(exportRequest.expiresAt) : null
  const fileSize = exportRequest?.fileSize || null
  const estimatedCompletionAt =
    exportRequest?.requestedAt && (status === 'pending' || status === 'processing')
      ? new Date(exportRequest.requestedAt + 48 * 60 * 60 * 1000) // 48 hours from request
      : null

  // Subscribe to latest export for this family
  useEffect(() => {
    if (!familyId || !latestExportId) {
      return
    }

    const db = getFirestoreDb()
    const exportRef = doc(db, 'dataExports', latestExportId)

    const unsubscribe = onSnapshot(
      exportRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as DataExportRequest
          setExportRequest(data)
        }
        setLoading(false)
      },
      (err) => {
        console.error('Error subscribing to export status:', err)
        setError('Failed to load export status')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [familyId, latestExportId, refreshKey])

  // Check for existing export on mount
  useEffect(() => {
    if (!familyId) {
      setLoading(false)
      return
    }

    const checkExistingExport = async () => {
      setLoading(true)
      try {
        const functions = getFirebaseFunctions()
        const getStatus = httpsCallable<{ familyId: string }, RequestDataExportResponse>(
          functions,
          'getDataExportStatus'
        )

        const result = await getStatus({ familyId })

        if (result.data.exportId) {
          setLatestExportId(result.data.exportId)
        } else {
          setLoading(false)
        }
      } catch (err) {
        console.error('Error checking export status:', err)
        setLoading(false)
      }
    }

    checkExistingExport()
  }, [familyId, refreshKey])

  /**
   * Request a new data export
   */
  const requestExport = useCallback(async (): Promise<boolean> => {
    if (!familyId) {
      setError('No family selected')
      return false
    }

    setActionLoading(true)
    setError(null)

    try {
      const functions = getFirebaseFunctions()
      const requestFn = httpsCallable<{ familyId: string }, RequestDataExportResponse>(
        functions,
        'requestDataExport'
      )

      const result: HttpsCallableResult<RequestDataExportResponse> = await requestFn({ familyId })

      if (!result.data.success) {
        if (result.data.status === 'already_in_progress') {
          // Still subscribe to the existing export
          if (result.data.existingExportId) {
            setLatestExportId(result.data.existingExportId)
          }
          setError('An export is already in progress')
          return false
        }
        setError(result.data.message || 'Failed to request export')
        return false
      }

      // Subscribe to the new export
      if (result.data.exportId) {
        setLatestExportId(result.data.exportId)
      }

      return true
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to request export'
      setError(message)
      return false
    } finally {
      setActionLoading(false)
    }
  }, [familyId])

  return {
    status,
    exportRequest,
    loading,
    actionLoading,
    error,
    canRequestExport,
    downloadUrl,
    expiresAt,
    fileSize,
    estimatedCompletionAt,
    requestExport,
    clearError,
    refreshStatus,
  }
}

export default useDataExport
