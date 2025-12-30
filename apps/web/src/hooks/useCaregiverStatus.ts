'use client'

/**
 * useCaregiverStatus Hook - Story 19A.3
 *
 * Provides simplified status for caregiver view.
 * Returns overall family status, children needing attention, and parent contact info.
 *
 * Key Differences from Parent View:
 * - Simplified language ("Doing well" vs "All Good")
 * - No device details or metrics
 * - Includes parent contact for help button
 *
 * Dependencies:
 * - Epic 19D for full caregiver authentication (currently stubbed)
 */

import { useMemo, useCallback } from 'react'
import { useChildStatus, ChildStatus } from './useChildStatus'
import type { FamilyStatus } from './useFamilyStatus'

/**
 * Simplified child summary for caregiver view
 */
export interface CaregiverChildSummary {
  childId: string
  childName: string
  photoURL: string | null
  status: FamilyStatus
  statusMessage: string // "Doing well" | "Check in" | "Needs help"
}

/**
 * Parent contact information
 */
export interface ParentContact {
  name: string
  phone: string | null
}

/**
 * Result from useCaregiverStatus hook
 */
export interface CaregiverStatusResult {
  overallStatus: FamilyStatus
  statusMessage: string
  children: CaregiverChildSummary[]
  childrenNeedingAttention: string[]
  parentContact: ParentContact | null
  loading: boolean
  error: string | null
  /** Refetch data (triggers full page reload as underlying hooks don't support refetch) */
  refetch: () => void
}

/**
 * Caregiver-friendly status labels (simpler language for older adults)
 */
export const caregiverStatusLabels: Record<FamilyStatus, string> = {
  good: 'Doing well',
  attention: 'Check in',
  action: 'Needs help',
}

/**
 * Convert parent view status to caregiver-friendly message
 */
function getStatusMessage(status: FamilyStatus): string {
  return caregiverStatusLabels[status]
}

/**
 * Convert ChildStatus to simplified CaregiverChildSummary
 */
function toChildSummary(child: ChildStatus): CaregiverChildSummary {
  return {
    childId: child.childId,
    childName: child.childName,
    photoURL: child.photoURL,
    status: child.status,
    statusMessage: getStatusMessage(child.status),
  }
}

/**
 * Calculate overall status from children
 */
function calculateOverallCaregiverStatus(children: ChildStatus[]): FamilyStatus {
  if (children.length === 0) {
    return 'good'
  }

  // If any child needs action, overall is action
  if (children.some((c) => c.status === 'action')) {
    return 'action'
  }

  // If any child needs attention, overall is attention
  if (children.some((c) => c.status === 'attention')) {
    return 'attention'
  }

  return 'good'
}

/**
 * Generate the main status message for caregiver view
 */
function generateStatusMessage(status: FamilyStatus, childrenNeedingAttention: string[]): string {
  if (status === 'good') {
    return 'Your grandchildren are doing well'
  }

  if (childrenNeedingAttention.length === 1) {
    return `Check in with ${childrenNeedingAttention[0]}`
  }

  if (childrenNeedingAttention.length === 2) {
    return `Check in with ${childrenNeedingAttention[0]} and ${childrenNeedingAttention[1]}`
  }

  // 3+ children
  const allButLast = childrenNeedingAttention.slice(0, -1).join(', ')
  const last = childrenNeedingAttention[childrenNeedingAttention.length - 1]
  return `Check in with ${allButLast}, and ${last}`
}

/**
 * Hook to get simplified status for caregiver view
 *
 * @param familyId - The family ID to get status for
 * @returns Simplified status suitable for caregiver view
 */
export function useCaregiverStatus(familyId: string | null): CaregiverStatusResult {
  const { childStatuses, loading, error } = useChildStatus(familyId)

  // Refetch function - underlying hooks don't support refetch, so use reload
  const refetch = useCallback(() => {
    window.location.reload()
  }, [])

  const result = useMemo(() => {
    // Convert to simplified summaries
    const children = childStatuses.map(toChildSummary)

    // Get children needing attention (not "good" status)
    const childrenNeedingAttention = childStatuses
      .filter((c) => c.status !== 'good')
      .map((c) => c.childName)

    // Calculate overall status
    const overallStatus = calculateOverallCaregiverStatus(childStatuses)

    // Generate status message
    const statusMessage = generateStatusMessage(overallStatus, childrenNeedingAttention)

    // TODO: Get parent contact from family data when Epic 19D provides it
    // For now, stub with placeholder
    const parentContact: ParentContact | null = {
      name: 'Parent',
      phone: null, // Will be populated from family data in Epic 19D
    }

    return {
      overallStatus,
      statusMessage,
      children,
      childrenNeedingAttention,
      parentContact,
    }
  }, [childStatuses])

  return {
    ...result,
    loading,
    error,
    refetch,
  }
}
