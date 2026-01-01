/**
 * Agreement Diff Utility - Story 34.6
 *
 * Utilities for computing and displaying differences between agreement versions.
 * AC3: Diff view available for any two versions
 */

import type { HistoryVersion, AgreementChange } from '@fledgely/shared'

/**
 * Type of change for a diff entry.
 */
export type DiffEntryType = 'added' | 'removed' | 'modified'

/**
 * A single entry in a version diff.
 */
export interface DiffEntry {
  /** Type of change */
  type: DiffEntryType
  /** Dot-notation path to the field */
  fieldPath: string
  /** Human-readable label */
  fieldLabel: string
  /** Value in the older version (null if added) */
  previousValue: string | null
  /** Value in the newer version (null if removed) */
  newValue: string | null
}

/**
 * Result of computing a diff between two versions.
 */
export interface VersionDiff {
  /** Version number of the older version */
  fromVersion: number
  /** Version number of the newer version */
  toVersion: number
  /** ID of the older version */
  fromVersionId: string
  /** ID of the newer version */
  toVersionId: string
  /** Date of the older version */
  fromDate: Date
  /** Date of the newer version */
  toDate: Date
  /** List of changes between versions */
  entries: DiffEntry[]
}

/**
 * Formatted diff entry for display.
 */
export interface FormattedDiffEntry {
  /** Icon to show (+, -, ~) */
  icon: string
  /** CSS class for coloring */
  colorClass: string
  /** Human-readable description */
  description: string
  /** The raw entry */
  entry: DiffEntry
}

/**
 * Determine the type of change based on previous and new values.
 */
function getChangeType(change: AgreementChange): DiffEntryType {
  if (change.previousValue === null) {
    return 'added'
  }
  if (change.newValue === null) {
    return 'removed'
  }
  return 'modified'
}

/**
 * Compute the diff between two agreement versions.
 *
 * @param fromVersion - The older version
 * @param toVersion - The newer version
 * @returns A VersionDiff object containing all changes
 */
export function computeVersionDiff(
  fromVersion: HistoryVersion,
  toVersion: HistoryVersion
): VersionDiff {
  const entries: DiffEntry[] = toVersion.changes.map((change) => ({
    type: getChangeType(change),
    fieldPath: change.fieldPath,
    fieldLabel: change.fieldLabel,
    previousValue: change.previousValue,
    newValue: change.newValue,
  }))

  return {
    fromVersion: fromVersion.versionNumber,
    toVersion: toVersion.versionNumber,
    fromVersionId: fromVersion.id,
    toVersionId: toVersion.id,
    fromDate: fromVersion.createdAt,
    toDate: toVersion.createdAt,
    entries,
  }
}

/**
 * Format a diff entry for display in the UI.
 *
 * @param entry - The diff entry to format
 * @returns A formatted entry with icon, color class, and description
 */
export function formatDiffForDisplay(entry: DiffEntry): FormattedDiffEntry {
  switch (entry.type) {
    case 'added':
      return {
        icon: '+',
        colorClass: 'text-green-600 bg-green-50',
        description: `Added ${entry.fieldLabel}: ${entry.newValue}`,
        entry,
      }
    case 'removed':
      return {
        icon: '-',
        colorClass: 'text-red-600 bg-red-50',
        description: `Removed ${entry.fieldLabel}`,
        entry,
      }
    case 'modified':
      return {
        icon: '~',
        colorClass: 'text-amber-600 bg-amber-50',
        description: `Changed ${entry.fieldLabel}: ${entry.previousValue} → ${entry.newValue}`,
        entry,
      }
  }
}

/**
 * Check if a diff has any changes.
 *
 * @param diff - The version diff to check
 * @returns True if there are changes
 */
export function hasChanges(diff: VersionDiff): boolean {
  return diff.entries.length > 0
}
