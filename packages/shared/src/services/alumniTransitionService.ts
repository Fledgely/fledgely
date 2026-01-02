/**
 * Alumni Transition Service - Story 38.3 Task 4
 *
 * Service for transitioning child to alumni status.
 * AC6: Child account transitions to alumni status
 */

import type { AlumniRecord, AlumniPreferences } from '../contracts/graduationProcess'

// ============================================
// In-memory stores (would be replaced with database)
// ============================================

const alumniStore: Map<string, AlumniRecord> = new Map()
const preferencesStore: Map<string, AlumniPreferences> = new Map()

// ============================================
// Types
// ============================================

export interface TransitionData {
  monitoringStartDate: Date
  totalMonitoringMonths: number
  finalTrustScore: number
  certificateId: string
  graduationDate: Date
}

export interface AlumniStatusInfo {
  graduatedAt: string
  duration: string
  hasResources: boolean
}

// ============================================
// Helper Functions
// ============================================

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// ============================================
// Service Functions
// ============================================

/**
 * Transition child to alumni status.
 * AC6: Child account transitions to alumni status
 */
export function transitionToAlumni(
  childId: string,
  familyId: string,
  data: TransitionData
): AlumniRecord {
  // Check if already alumni
  if (alumniStore.has(childId)) {
    throw new Error(`Child ${childId} is already alumni`)
  }

  const record: AlumniRecord = {
    childId,
    familyId,
    graduatedAt: data.graduationDate,
    certificateId: data.certificateId,
    previousAccountData: {
      monitoringStartDate: data.monitoringStartDate,
      totalMonitoringMonths: data.totalMonitoringMonths,
      finalTrustScore: data.finalTrustScore,
    },
  }

  alumniStore.set(childId, record)

  // Set default preferences
  preferencesStore.set(childId, getDefaultAlumniPreferences())

  return record
}

/**
 * Get alumni record for child.
 */
export function getAlumniRecord(childId: string): AlumniRecord | null {
  return alumniStore.get(childId) || null
}

/**
 * Check if child is alumni.
 */
export function isAlumni(childId: string): boolean {
  return alumniStore.has(childId)
}

/**
 * Get alumni status display info.
 */
export function getAlumniStatusInfo(record: AlumniRecord): AlumniStatusInfo {
  return {
    graduatedAt: formatDate(record.graduatedAt),
    duration: `${record.previousAccountData.totalMonitoringMonths} months monitoring journey`,
    hasResources: true,
  }
}

/**
 * Update alumni preferences (optional resource notifications).
 */
export function updateAlumniPreferences(childId: string, preferences: AlumniPreferences): void {
  if (!alumniStore.has(childId)) {
    throw new Error(`Child ${childId} is not an alumni`)
  }

  preferencesStore.set(childId, preferences)
}

/**
 * Get default alumni preferences.
 */
export function getDefaultAlumniPreferences(): AlumniPreferences {
  return {
    receiveWellnessResources: true,
    receiveAnniversaryReminders: true,
  }
}

/**
 * Get all alumni records.
 */
export function getAllAlumni(): AlumniRecord[] {
  return Array.from(alumniStore.values())
}

/**
 * Clear all stored data (for testing).
 */
export function clearAllAlumniData(): void {
  alumniStore.clear()
  preferencesStore.clear()
}
