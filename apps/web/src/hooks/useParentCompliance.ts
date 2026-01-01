'use client'

/**
 * useParentCompliance Hook - Story 32.4
 *
 * Real-time listener for parent compliance during offline time.
 * Supports both child view (seeing parent compliance) and parent self-view.
 *
 * Requirements:
 * - AC1: Parent compliance logged after offline windows
 * - AC2: Child can see parent compliance
 * - AC3: Parent can see their own compliance stats
 * - AC4: Transparency without shaming
 */

import { useState, useEffect, useMemo } from 'react'
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import type { ParentComplianceRecord, ParentComplianceSummary } from '@fledgely/shared'
import { PARENT_COMPLIANCE_MESSAGES } from '@fledgely/shared'

interface UseParentComplianceOptions {
  familyId: string | null | undefined
  /** Parent UID for self-view, or undefined for family-wide view */
  parentUid?: string
  /** Number of recent records to fetch */
  recordLimit?: number
  enabled?: boolean
}

interface UseParentComplianceResult {
  /** Recent compliance records */
  records: ParentComplianceRecord[]
  /** Compliance summary statistics */
  summary: ParentComplianceSummary | null
  /** Loading state */
  loading: boolean
  /** Error message if any */
  error: string | null
  /** Get display message for a record (AC4: non-shaming language) */
  getDisplayMessage: (record: ParentComplianceRecord) => string
  /** Pre-defined messages for UI */
  messages: typeof PARENT_COMPLIANCE_MESSAGES
}

/**
 * Calculate compliance summary from records
 */
function calculateSummary(
  records: ParentComplianceRecord[],
  parentUid?: string
): ParentComplianceSummary | null {
  if (records.length === 0) {
    return parentUid
      ? {
          parentUid,
          totalWindows: 0,
          compliantWindows: 0,
          compliancePercentage: 0,
          lastRecordDate: null,
        }
      : null
  }

  // If filtering by parentUid, only include their records
  const relevantRecords = parentUid ? records.filter((r) => r.parentUid === parentUid) : records

  if (relevantRecords.length === 0 && parentUid) {
    return {
      parentUid,
      totalWindows: 0,
      compliantWindows: 0,
      compliancePercentage: 0,
      lastRecordDate: null,
    }
  }

  const totalWindows = relevantRecords.length
  const compliantWindows = relevantRecords.filter((r) => r.wasCompliant).length
  const compliancePercentage =
    totalWindows > 0 ? Math.round((compliantWindows / totalWindows) * 100) : 0
  const lastRecordDate = Math.max(...relevantRecords.map((r) => r.createdAt))

  return {
    parentUid: parentUid || relevantRecords[0]?.parentUid || '',
    totalWindows,
    compliantWindows,
    compliancePercentage,
    lastRecordDate,
  }
}

/**
 * Hook to access parent compliance data for offline time.
 *
 * Story 32.4: Parent Compliance Tracking
 *
 * @example
 * // Child viewing parent compliance
 * const { records, messages, getDisplayMessage } = useParentCompliance({
 *   familyId: 'family-123',
 * })
 *
 * @example
 * // Parent viewing their own stats
 * const { summary, messages } = useParentCompliance({
 *   familyId: 'family-123',
 *   parentUid: 'parent-456',
 * })
 */
export function useParentCompliance({
  familyId,
  parentUid,
  recordLimit = 30,
  enabled = true,
}: UseParentComplianceOptions): UseParentComplianceResult {
  const [records, setRecords] = useState<ParentComplianceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!familyId || !enabled) {
      setRecords([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const db = getFirestoreDb()
    // Collection path: /families/{familyId}/parentCompliance
    const complianceRef = collection(db, 'families', familyId, 'parentCompliance')

    // Build query based on whether we're filtering by parent
    let complianceQuery
    if (parentUid) {
      complianceQuery = query(
        complianceRef,
        where('parentUid', '==', parentUid),
        orderBy('createdAt', 'desc'),
        limit(recordLimit)
      )
    } else {
      complianceQuery = query(complianceRef, orderBy('createdAt', 'desc'), limit(recordLimit))
    }

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      complianceQuery,
      (snapshot) => {
        const complianceRecords: ParentComplianceRecord[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          complianceRecords.push({
            familyId: data.familyId,
            parentUid: data.parentUid,
            deviceId: data.deviceId,
            parentDisplayName: data.parentDisplayName,
            offlineWindowStart: data.offlineWindowStart,
            offlineWindowEnd: data.offlineWindowEnd,
            wasCompliant: data.wasCompliant,
            activityEvents: data.activityEvents || [],
            createdAt: data.createdAt,
          })
        })
        setRecords(complianceRecords)
        setLoading(false)
      },
      (err) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error listening to parent compliance:', err)
        }
        setError('Failed to load compliance data')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [familyId, parentUid, recordLimit, enabled])

  // Calculate summary from records
  const summary = useMemo(() => calculateSummary(records, parentUid), [records, parentUid])

  /**
   * Get display message for a compliance record.
   * AC4: Uses non-shaming, factual language.
   */
  const getDisplayMessage = (record: ParentComplianceRecord): string => {
    const name = record.parentDisplayName || 'Parent'
    if (record.wasCompliant) {
      return PARENT_COMPLIANCE_MESSAGES.compliant(name)
    }
    return PARENT_COMPLIANCE_MESSAGES.nonCompliant(name)
  }

  return {
    records,
    summary,
    loading,
    error,
    getDisplayMessage,
    messages: PARENT_COMPLIANCE_MESSAGES,
  }
}

/**
 * Type for grouped compliance records by parent
 */
export interface ParentComplianceByParent {
  parentUid: string
  parentDisplayName: string
  records: ParentComplianceRecord[]
  summary: ParentComplianceSummary
}

/**
 * Hook to get compliance grouped by parent (for family-wide views)
 *
 * Story 32.4 AC2: Child Compliance Dashboard
 */
export function useParentComplianceByParent({
  familyId,
  recordLimit = 30,
  enabled = true,
}: Omit<UseParentComplianceOptions, 'parentUid'>): {
  byParent: ParentComplianceByParent[]
  loading: boolean
  error: string | null
} {
  const { records, loading, error } = useParentCompliance({
    familyId,
    recordLimit,
    enabled,
  })

  const byParent = useMemo(() => {
    // Group records by parentUid
    const grouped = new Map<string, ParentComplianceRecord[]>()
    for (const record of records) {
      const existing = grouped.get(record.parentUid) || []
      existing.push(record)
      grouped.set(record.parentUid, existing)
    }

    // Convert to array with summaries
    const result: ParentComplianceByParent[] = []
    for (const [parentUid, parentRecords] of grouped) {
      const summary = calculateSummary(parentRecords, parentUid)
      if (summary) {
        result.push({
          parentUid,
          parentDisplayName: parentRecords[0]?.parentDisplayName || 'Parent',
          records: parentRecords,
          summary,
        })
      }
    }

    // Sort by parent name
    return result.sort((a, b) => a.parentDisplayName.localeCompare(b.parentDisplayName))
  }, [records])

  return { byParent, loading, error }
}
