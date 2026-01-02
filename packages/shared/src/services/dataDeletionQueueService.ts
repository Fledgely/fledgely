/**
 * Data Deletion Queue Service - Story 38.3 Task 5
 *
 * Service for queuing data deletion after graduation.
 * AC5: Existing data enters deletion queue with configurable retention
 */

import type { DataType, DeletionQueueEntry, DeletionStatus } from '../contracts/graduationProcess'

// ============================================
// Constants
// ============================================

export const DELETION_DATA_TYPES: DataType[] = [
  'screenshots',
  'flags',
  'activity_logs',
  'trust_history',
]

// ============================================
// In-memory stores (would be replaced with database)
// ============================================

const deletionStore: Map<string, DeletionQueueEntry> = new Map()
const childDeletionIndex: Map<string, string[]> = new Map()

// ============================================
// Types
// ============================================

export interface ProcessingResult {
  processed: number
  success: number
  failed: number
}

// ============================================
// Helper Functions
// ============================================

function generateEntryId(): string {
  return `del-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

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
 * Queue child data for deletion.
 * AC5: Existing data enters deletion queue with configurable retention
 */
export function queueDataForDeletion(
  childId: string,
  familyId: string,
  retentionDays: number
): DeletionQueueEntry[] {
  const entries: DeletionQueueEntry[] = []
  const now = new Date()
  const scheduledDeletionDate = new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000)

  for (const dataType of DELETION_DATA_TYPES) {
    const id = generateEntryId()
    const entry: DeletionQueueEntry = {
      id,
      childId,
      familyId,
      dataType,
      scheduledDeletionDate,
      retentionDays,
      status: 'queued',
      createdAt: now,
      completedAt: null,
    }

    deletionStore.set(id, entry)
    entries.push(entry)

    // Update index
    const childEntries = childDeletionIndex.get(childId) || []
    childEntries.push(id)
    childDeletionIndex.set(childId, childEntries)
  }

  return entries
}

/**
 * Get deletion queue status for a child.
 */
export function getDeletionQueueStatus(childId: string): DeletionQueueEntry[] {
  const ids = childDeletionIndex.get(childId) || []
  return ids
    .map((id) => deletionStore.get(id))
    .filter((entry): entry is DeletionQueueEntry => entry !== undefined)
}

/**
 * Get data types pending deletion.
 */
export function getPendingDeletionTypes(
  childId: string
): { type: DataType; scheduledDate: Date; status: DeletionStatus }[] {
  const entries = getDeletionQueueStatus(childId)
  return entries
    .filter((e) => e.status === 'queued' || e.status === 'processing')
    .map((e) => ({
      type: e.dataType,
      scheduledDate: e.scheduledDeletionDate,
      status: e.status,
    }))
}

/**
 * Calculate deletion date based on graduation date and retention period.
 * Re-export from contracts for convenience.
 */
export function calculateDeletionDate(graduationDate: Date, retentionDays: number): Date {
  const deletionDate = new Date(graduationDate)
  deletionDate.setDate(deletionDate.getDate() + retentionDays)
  return deletionDate
}

/**
 * Get deletion confirmation message.
 */
export function getDeletionConfirmationMessage(dataTypes: DataType[], deletionDate: Date): string {
  const typesText =
    dataTypes.includes('all') || dataTypes.length === DELETION_DATA_TYPES.length
      ? 'All monitoring data'
      : dataTypes.join(', ')

  return `${typesText} will be permanently deleted on ${formatDate(deletionDate)}.`
}

/**
 * Process deletion queue (scheduled function).
 */
export function processReadyDeletions(): ProcessingResult {
  const ready = getReadyForDeletion()
  let success = 0
  let failed = 0

  for (const entry of ready) {
    try {
      // In real implementation, would actually delete the data
      markDeletionComplete(entry.id)
      success++
    } catch {
      markDeletionFailed(entry.id)
      failed++
    }
  }

  return {
    processed: ready.length,
    success,
    failed,
  }
}

/**
 * Cancel pending deletion (if child rejoins).
 */
export function cancelPendingDeletion(childId: string): void {
  const ids = childDeletionIndex.get(childId) || []

  for (const id of ids) {
    deletionStore.delete(id)
  }

  childDeletionIndex.delete(childId)
}

/**
 * Mark deletion entry as complete.
 */
export function markDeletionComplete(entryId: string): DeletionQueueEntry {
  const entry = deletionStore.get(entryId)
  if (!entry) {
    throw new Error(`Deletion entry not found: ${entryId}`)
  }

  const updated: DeletionQueueEntry = {
    ...entry,
    status: 'completed',
    completedAt: new Date(),
  }

  deletionStore.set(entryId, updated)
  return updated
}

/**
 * Mark deletion entry as failed.
 */
export function markDeletionFailed(entryId: string): DeletionQueueEntry {
  const entry = deletionStore.get(entryId)
  if (!entry) {
    throw new Error(`Deletion entry not found: ${entryId}`)
  }

  const updated: DeletionQueueEntry = {
    ...entry,
    status: 'failed',
  }

  deletionStore.set(entryId, updated)
  return updated
}

/**
 * Get entries ready for deletion.
 */
export function getReadyForDeletion(): DeletionQueueEntry[] {
  const now = Date.now()
  return Array.from(deletionStore.values()).filter(
    (entry) => entry.status === 'queued' && entry.scheduledDeletionDate.getTime() <= now
  )
}

/**
 * Clear all stored data (for testing).
 */
export function clearAllDeletionData(): void {
  deletionStore.clear()
  childDeletionIndex.clear()
}

/**
 * Get statistics for testing/debugging.
 */
export function getDeletionStats(): {
  total: number
  byStatus: Record<DeletionStatus, number>
} {
  const allEntries = Array.from(deletionStore.values())

  const byStatus: Record<DeletionStatus, number> = {
    queued: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  }

  for (const entry of allEntries) {
    byStatus[entry.status]++
  }

  return {
    total: allEntries.length,
    byStatus,
  }
}
