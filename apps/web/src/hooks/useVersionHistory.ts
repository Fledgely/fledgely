/**
 * Version History Hook.
 *
 * Story 5.7: Draft Saving & Version History - AC3, AC4
 *
 * Manages version history for agreement drafts, including
 * creating snapshots and restoring previous versions.
 */

import { useState, useCallback } from 'react'
import type { AgreementTerm, AgreementVersion, VersionType } from '@fledgely/shared/contracts'

interface UseVersionHistoryOptions {
  /** Session ID to associate versions with */
  sessionId: string
  /** Current user's UID */
  currentUserUid: string
  /** Callback when version is created */
  onVersionCreated?: (version: AgreementVersion) => void
  /** Callback when version is restored */
  onVersionRestored?: (version: AgreementVersion) => void
}

interface UseVersionHistoryReturn {
  /** List of versions in chronological order */
  versions: AgreementVersion[]
  /** Currently selected version for preview */
  selectedVersion: AgreementVersion | null
  /** Whether versions are loading */
  isLoading: boolean
  /** Create a new version snapshot */
  createVersion: (
    type: VersionType,
    terms: AgreementTerm[],
    description?: string
  ) => AgreementVersion
  /** Select a version for preview */
  selectVersion: (versionId: string) => void
  /** Clear selected version */
  clearSelection: () => void
  /** Restore a previous version */
  restoreVersion: (versionId: string) => AgreementTerm[] | null
  /** Get default description for version type */
  getDefaultDescription: (type: VersionType) => string
}

/**
 * Default descriptions for version types.
 */
const VERSION_DESCRIPTIONS: Record<VersionType, string> = {
  initial_draft: 'Agreement started from template',
  child_additions: 'Child added their ideas',
  negotiation_complete: 'All discussions resolved',
  manual_save: 'Draft saved',
  auto_save: 'Auto-saved',
}

/**
 * Generate a unique ID for versions.
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Hook to manage version history for agreement drafts.
 *
 * @param options Configuration options
 * @returns Version history state and controls
 *
 * @example
 * ```tsx
 * const {
 *   versions,
 *   createVersion,
 *   selectVersion,
 *   restoreVersion,
 * } = useVersionHistory({
 *   sessionId: session.id,
 *   currentUserUid: user.uid,
 * })
 *
 * // Create a new version
 * createVersion('manual_save', currentTerms, 'Saved before child review')
 *
 * // Restore a previous version
 * const restoredTerms = restoreVersion(versionId)
 * ```
 */
export function useVersionHistory(options: UseVersionHistoryOptions): UseVersionHistoryReturn {
  const { sessionId, currentUserUid, onVersionCreated, onVersionRestored } = options

  const [versions, setVersions] = useState<AgreementVersion[]>([])
  const [selectedVersion, setSelectedVersion] = useState<AgreementVersion | null>(null)
  const [isLoading] = useState(false)

  /**
   * Get default description for a version type.
   */
  const getDefaultDescription = useCallback((type: VersionType): string => {
    return VERSION_DESCRIPTIONS[type]
  }, [])

  /**
   * Create a new version snapshot.
   */
  const createVersion = useCallback(
    (type: VersionType, terms: AgreementTerm[], description?: string): AgreementVersion => {
      const newVersion: AgreementVersion = {
        id: generateId(),
        sessionId,
        type,
        description: description || getDefaultDescription(type),
        termsSnapshot: [...terms], // Clone to avoid reference issues
        createdAt: new Date(),
        createdByUid: currentUserUid,
      }

      setVersions((prev) => [...prev, newVersion])
      onVersionCreated?.(newVersion)

      return newVersion
    },
    [sessionId, currentUserUid, getDefaultDescription, onVersionCreated]
  )

  /**
   * Select a version for preview.
   */
  const selectVersion = useCallback(
    (versionId: string) => {
      const version = versions.find((v) => v.id === versionId)
      setSelectedVersion(version || null)
    },
    [versions]
  )

  /**
   * Clear the selected version.
   */
  const clearSelection = useCallback(() => {
    setSelectedVersion(null)
  }, [])

  /**
   * Restore a previous version.
   */
  const restoreVersion = useCallback(
    (versionId: string): AgreementTerm[] | null => {
      const version = versions.find((v) => v.id === versionId)
      if (!version) return null

      // Clone the terms to return
      const restoredTerms = [...version.termsSnapshot]

      onVersionRestored?.(version)

      return restoredTerms
    },
    [versions, onVersionRestored]
  )

  return {
    versions,
    selectedVersion,
    isLoading,
    createVersion,
    selectVersion,
    clearSelection,
    restoreVersion,
    getDefaultDescription,
  }
}
