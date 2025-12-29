/**
 * Restore Version Modal Component.
 *
 * Story 5.7: Draft Saving & Version History - AC4
 *
 * Confirms restoration of a previous version with
 * a preview of what will change.
 */

import type { AgreementVersion, AgreementTerm } from '@fledgely/shared/contracts'

interface RestoreVersionModalProps {
  /** Version to restore */
  version: AgreementVersion
  /** Current terms for comparison */
  currentTerms: AgreementTerm[]
  /** Whether restore is in progress */
  isRestoring: boolean
  /** Callback when restore is confirmed */
  onConfirm: () => void
  /** Callback when modal is closed */
  onCancel: () => void
}

/**
 * Calculate differences between versions.
 */
function calculateDiff(
  current: AgreementTerm[],
  snapshot: AgreementTerm[]
): { added: number; removed: number; changed: number } {
  const currentIds = new Set(current.map((t) => t.id))
  const snapshotIds = new Set(snapshot.map((t) => t.id))

  // Terms in snapshot but not in current (will be added back)
  const added = snapshot.filter((t) => !currentIds.has(t.id)).length

  // Terms in current but not in snapshot (will be removed)
  const removed = current.filter((t) => !snapshotIds.has(t.id)).length

  // Terms in both but with different text (will be changed)
  const changed = snapshot.filter((snapshotTerm) => {
    const currentTerm = current.find((t) => t.id === snapshotTerm.id)
    return currentTerm && currentTerm.text !== snapshotTerm.text
  }).length

  return { added, removed, changed }
}

/**
 * Format version type for display.
 */
function formatVersionType(type: AgreementVersion['type']): string {
  const labels: Record<AgreementVersion['type'], string> = {
    initial_draft: 'Initial Draft',
    child_additions: 'Child Additions',
    negotiation_complete: 'Negotiation Complete',
    manual_save: 'Manual Save',
    auto_save: 'Auto Save',
  }
  return labels[type]
}

/**
 * Format date for display.
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * RestoreVersionModal confirms restoration of a previous version
 * and shows what changes will occur.
 */
export function RestoreVersionModal({
  version,
  currentTerms,
  isRestoring,
  onConfirm,
  onCancel,
}: RestoreVersionModalProps) {
  const diff = calculateDiff(currentTerms, version.termsSnapshot)
  const hasChanges = diff.added > 0 || diff.removed > 0 || diff.changed > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="restore-modal-title"
      data-testid="restore-version-modal"
    >
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-amber-50">
          <h2 id="restore-modal-title" className="text-lg font-semibold text-gray-900">
            Restore Previous Version?
          </h2>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {/* Version info */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="font-medium text-gray-900">{formatVersionType(version.type)}</p>
            <p className="text-sm text-gray-600 mt-1">{version.description}</p>
            <p className="text-xs text-gray-400 mt-1">
              {formatDate(version.createdAt)} · {version.termsSnapshot.length} term
              {version.termsSnapshot.length === 1 ? '' : 's'}
            </p>
          </div>

          {/* Changes summary */}
          {hasChanges ? (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">
                This will make the following changes:
              </p>
              <ul className="text-sm space-y-1">
                {diff.added > 0 && (
                  <li className="flex items-center gap-2 text-green-700">
                    <span aria-hidden="true">+</span>
                    <span>
                      {diff.added} term{diff.added === 1 ? '' : 's'} will come back
                    </span>
                  </li>
                )}
                {diff.removed > 0 && (
                  <li className="flex items-center gap-2 text-red-700">
                    <span aria-hidden="true">−</span>
                    <span>
                      {diff.removed} term{diff.removed === 1 ? '' : 's'} will be removed
                    </span>
                  </li>
                )}
                {diff.changed > 0 && (
                  <li className="flex items-center gap-2 text-amber-700">
                    <span aria-hidden="true">~</span>
                    <span>
                      {diff.changed} term{diff.changed === 1 ? '' : 's'} will change
                    </span>
                  </li>
                )}
              </ul>
            </div>
          ) : (
            <p className="mb-4 text-sm text-gray-600">
              The selected version is the same as your current agreement.
            </p>
          )}

          {/* Warning */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <span className="font-medium">Note:</span> Your current version will be saved
              automatically before restoring.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isRestoring}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 min-h-[44px] disabled:opacity-50"
            data-testid="restore-cancel-button"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isRestoring}
            className="px-4 py-2 text-white bg-amber-600 rounded-lg hover:bg-amber-700 min-h-[44px] disabled:opacity-50 flex items-center gap-2"
            data-testid="restore-confirm-button"
          >
            {isRestoring ? (
              <>
                <span className="animate-spin" aria-hidden="true">
                  ↻
                </span>
                <span>Restoring...</span>
              </>
            ) : (
              <>
                <span aria-hidden="true">↩</span>
                <span>Restore Version</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
