/**
 * Agreement Export Service - Story 34.6
 *
 * Service for exporting agreement history to various formats.
 * AC6: Export available for records
 */

import type { AgreementVersion } from '@fledgely/shared'

/**
 * Supported export formats.
 */
export type ExportFormat = 'json' | 'text'

/**
 * JSON export structure.
 */
interface JsonExport {
  familyName: string
  exportedAt: string
  totalVersions: number
  totalUpdates: number
  versions: Array<{
    versionNumber: number
    proposerId: string
    proposerName: string
    accepterId: string
    accepterName: string
    changes: Array<{
      fieldPath: string
      fieldLabel: string
      previousValue: string | null
      newValue: string | null
    }>
    createdAt: string
    note?: string
  }>
}

/**
 * Export agreement history as JSON.
 *
 * @param versions - Agreement versions to export
 * @param familyName - Name of the family
 * @returns JSON string of the export
 */
export function exportHistoryAsJson(versions: AgreementVersion[], familyName: string): string {
  const exportData: JsonExport = {
    familyName,
    exportedAt: new Date().toISOString(),
    totalVersions: versions.length,
    totalUpdates: Math.max(0, versions.length - 1),
    versions: versions.map((v) => ({
      versionNumber: v.versionNumber,
      proposerId: v.proposerId,
      proposerName: v.proposerName,
      accepterId: v.accepterId,
      accepterName: v.accepterName,
      changes: v.changes.map((c) => ({
        fieldPath: c.fieldPath,
        fieldLabel: c.fieldLabel,
        previousValue: c.previousValue,
        newValue: c.newValue,
      })),
      createdAt: v.createdAt.toISOString(),
      note: v.note,
    })),
  }

  return JSON.stringify(exportData, null, 2)
}

/**
 * Format a date for text export.
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format a single version for text output.
 *
 * @param version - Agreement version to format
 * @returns Formatted text string
 */
export function formatVersionForText(version: AgreementVersion): string {
  const lines: string[] = []

  lines.push(`=== Version ${version.versionNumber} ===`)
  lines.push(`Date: ${formatDate(version.createdAt)}`)
  lines.push(`Proposed by: ${version.proposerName}`)
  lines.push(`Accepted by: ${version.accepterName}`)

  if (version.changes.length > 0) {
    lines.push('')
    lines.push('Changes:')
    version.changes.forEach((change) => {
      if (change.previousValue === null) {
        lines.push(`  + ${change.fieldLabel}: ${change.newValue}`)
      } else if (change.newValue === null) {
        lines.push(`  - ${change.fieldLabel}: ${change.previousValue} (removed)`)
      } else {
        lines.push(`  ~ ${change.fieldLabel}: ${change.previousValue} → ${change.newValue}`)
      }
    })
  } else {
    lines.push('')
    lines.push('Initial version - no changes recorded')
  }

  if (version.note) {
    lines.push('')
    lines.push(`Note: "${version.note}"`)
  }

  return lines.join('\n')
}

/**
 * Export agreement history as readable text.
 *
 * @param versions - Agreement versions to export
 * @param familyName - Name of the family
 * @returns Text string of the export
 */
export function exportHistoryAsText(versions: AgreementVersion[], familyName: string): string {
  const lines: string[] = []

  lines.push('═'.repeat(50))
  lines.push(`${familyName} - Agreement History`)
  lines.push('═'.repeat(50))
  lines.push('')
  lines.push(`Exported: ${formatDate(new Date())}`)
  lines.push(`Total Versions: ${versions.length}`)
  lines.push(`Total Updates: ${Math.max(0, versions.length - 1)}`)
  lines.push('')

  if (versions.length === 0) {
    lines.push('No versions recorded yet.')
  } else {
    versions.forEach((version, index) => {
      if (index > 0) {
        lines.push('')
        lines.push('─'.repeat(40))
        lines.push('')
      }
      lines.push(formatVersionForText(version))
    })
  }

  lines.push('')
  lines.push('═'.repeat(50))
  lines.push('End of Agreement History')
  lines.push('═'.repeat(50))

  return lines.join('\n')
}

/**
 * Trigger a download of the export.
 *
 * @param versions - Agreement versions to export
 * @param familyName - Name of the family
 * @param format - Export format (json or text)
 */
export function downloadExport(
  versions: AgreementVersion[],
  familyName: string,
  format: ExportFormat
): void {
  let content: string
  let mimeType: string
  let extension: string

  if (format === 'json') {
    content = exportHistoryAsJson(versions, familyName)
    mimeType = 'application/json'
    extension = 'json'
  } else {
    content = exportHistoryAsText(versions, familyName)
    mimeType = 'text/plain'
    extension = 'txt'
  }

  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)

  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `agreement-history-${timestamp}.${extension}`

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()

  URL.revokeObjectURL(url)
}
