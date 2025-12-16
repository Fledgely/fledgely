/**
 * useAgreementExport Hook
 *
 * Story 5.5: Agreement Preview & Summary - Task 6
 *
 * Hook for exporting agreements to PDF or print.
 * Uses CSS print styles + browser print dialog for MVP per dev notes.
 */

import { useCallback, useState } from 'react'
import type { AgreementPreview } from '@fledgely/contracts'

/**
 * Export format options
 */
export type ExportFormat = 'pdf' | 'print'

/**
 * Export status
 */
export type ExportStatus = 'idle' | 'preparing' | 'exporting' | 'success' | 'error'

/**
 * Return type for the useAgreementExport hook
 */
export interface UseAgreementExportReturn {
  /** Current export status */
  status: ExportStatus
  /** Any error message */
  error: string | null
  /** Export to PDF (via print dialog with PDF option) */
  exportToPdf: () => Promise<void>
  /** Open print dialog directly */
  openPrintDialog: () => Promise<void>
  /** Reset status back to idle */
  reset: () => void
  /** Whether an export operation is in progress */
  isExporting: boolean
}

/**
 * Options for the useAgreementExport hook
 */
export interface UseAgreementExportOptions {
  /** Agreement preview data for export */
  preview?: AgreementPreview
  /** Custom document title for export */
  title?: string
  /** Callback when export completes */
  onExportComplete?: () => void
  /** Callback when export fails */
  onExportError?: (error: Error) => void
}

/**
 * Generate a formatted date string for export
 */
export function formatExportDate(date: Date = new Date()): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Generate a filename for PDF export
 */
export function generateExportFilename(prefix: string = 'family-agreement'): string {
  const timestamp = new Date().toISOString().split('T')[0]
  return `${prefix}-${timestamp}.pdf`
}

/**
 * Add print-specific styles to the document
 */
function injectPrintStyles(): HTMLStyleElement {
  const styleId = 'agreement-export-styles'

  // Remove existing print styles if any
  const existing = document.getElementById(styleId)
  if (existing) {
    existing.remove()
  }

  const style = document.createElement('style')
  style.id = styleId
  style.textContent = `
    @media print {
      /* Hide non-printable elements */
      body > *:not(.agreement-preview-printable) {
        display: none !important;
      }

      .agreement-preview-printable {
        display: block !important;
        position: static !important;
        width: 100% !important;
        padding: 0 !important;
        margin: 0 !important;
      }

      /* Ensure proper page breaks */
      .agreement-term-card {
        page-break-inside: avoid;
      }

      .agreement-section-header {
        page-break-after: avoid;
      }

      /* Print-friendly colors */
      * {
        color: #000 !important;
        background: #fff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      /* Keep some colored elements for visual distinction */
      .contributor-badge {
        border: 1px solid #666 !important;
      }

      /* Page margins */
      @page {
        margin: 1in;
        size: letter;
      }

      /* Header and footer */
      .print-header {
        display: block !important;
      }

      .print-footer {
        display: block !important;
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        text-align: center;
        font-size: 10pt;
        color: #666 !important;
      }
    }
  `
  document.head.appendChild(style)
  return style
}

/**
 * Remove print-specific styles from the document
 */
function removePrintStyles(): void {
  const style = document.getElementById('agreement-export-styles')
  if (style) {
    style.remove()
  }
}

/**
 * useAgreementExport Hook
 *
 * Provides functionality to export agreements to PDF or print.
 *
 * @param options - Configuration options
 * @returns Export state and actions
 *
 * @example
 * ```tsx
 * const { exportToPdf, openPrintDialog, status, isExporting } = useAgreementExport({
 *   preview: agreementPreview,
 *   title: 'Our Family Agreement',
 *   onExportComplete: () => toast('Export complete!'),
 * })
 *
 * return (
 *   <button onClick={exportToPdf} disabled={isExporting}>
 *     Export PDF
 *   </button>
 * )
 * ```
 */
export function useAgreementExport(
  options: UseAgreementExportOptions = {}
): UseAgreementExportReturn {
  const { title = 'Family Agreement', onExportComplete, onExportError } = options

  const [status, setStatus] = useState<ExportStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  // Reset state
  const reset = useCallback(() => {
    setStatus('idle')
    setError(null)
  }, [])

  // Prepare document for printing
  const prepareForPrint = useCallback(async () => {
    // Store original title
    const originalTitle = document.title

    // Set document title for print
    document.title = title

    // Inject print styles
    injectPrintStyles()

    // Mark the preview element as printable
    const previewElement = document.querySelector('[data-agreement-preview]')
    if (previewElement) {
      previewElement.classList.add('agreement-preview-printable')
    }

    return () => {
      // Cleanup: restore original state
      document.title = originalTitle
      removePrintStyles()
      if (previewElement) {
        previewElement.classList.remove('agreement-preview-printable')
      }
    }
  }, [title])

  // Export to PDF via print dialog
  const exportToPdf = useCallback(async () => {
    if (status === 'preparing' || status === 'exporting') {
      return // Already exporting
    }

    setStatus('preparing')
    setError(null)

    let cleanup: (() => void) | undefined

    try {
      // Prepare document
      cleanup = await prepareForPrint()
      setStatus('exporting')

      // Small delay for DOM updates
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Open print dialog - user can choose PDF printer
      window.print()

      // Wait a bit for print dialog to open
      await new Promise((resolve) => setTimeout(resolve, 500))

      setStatus('success')
      onExportComplete?.()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Export failed'
      setError(errorMessage)
      setStatus('error')
      onExportError?.(err instanceof Error ? err : new Error(errorMessage))
    } finally {
      // Cleanup after a delay to ensure print dialog is open
      setTimeout(() => {
        cleanup?.()
      }, 1000)
    }
  }, [status, prepareForPrint, onExportComplete, onExportError])

  // Open print dialog directly
  const openPrintDialog = useCallback(async () => {
    if (status === 'preparing' || status === 'exporting') {
      return // Already exporting
    }

    setStatus('preparing')
    setError(null)

    let cleanup: (() => void) | undefined

    try {
      cleanup = await prepareForPrint()
      setStatus('exporting')

      await new Promise((resolve) => setTimeout(resolve, 100))
      window.print()
      await new Promise((resolve) => setTimeout(resolve, 500))

      setStatus('success')
      onExportComplete?.()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Print failed'
      setError(errorMessage)
      setStatus('error')
      onExportError?.(err instanceof Error ? err : new Error(errorMessage))
    } finally {
      setTimeout(() => {
        cleanup?.()
      }, 1000)
    }
  }, [status, prepareForPrint, onExportComplete, onExportError])

  return {
    status,
    error,
    exportToPdf,
    openPrintDialog,
    reset,
    isExporting: status === 'preparing' || status === 'exporting',
  }
}

export default useAgreementExport
