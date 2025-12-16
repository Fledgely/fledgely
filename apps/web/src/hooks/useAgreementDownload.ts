'use client'

import { useState, useCallback } from 'react'
import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

/**
 * useAgreementDownload Hook
 *
 * Story 6.4: Signing Ceremony Celebration - Task 2
 *
 * Provides functionality to download and share signed family agreements.
 *
 * Features:
 * - Task 2.1: Download agreement hook
 * - Task 2.2: Generate PDF of signed agreement
 * - Task 2.3: Download button functionality
 * - Task 2.4: Share using Web Share API with fallback
 * - Task 2.5: Audit log entry for download/share
 */

/**
 * Parameters for the useAgreementDownload hook
 */
export interface UseAgreementDownloadParams {
  /** Agreement ID to download/share */
  agreementId: string
  /** Family ID */
  familyId: string
}

/**
 * Result of a share operation
 */
export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'error'

/**
 * Return type for the useAgreementDownload hook
 */
export interface UseAgreementDownloadReturn {
  /** Download the agreement as PDF */
  downloadAgreement: () => Promise<void>
  /** Share the agreement via Web Share API or clipboard - returns result type */
  shareAgreement: () => Promise<ShareResult>
  /** Loading state */
  isLoading: boolean
  /** Error message if any */
  error: string | null
}

/**
 * Agreement data structure for PDF generation
 */
interface AgreementForPdf {
  id: string
  version: string
  status: string
  activatedAt?: string
  terms: Array<{
    id: string
    type: string
    content: {
      title?: string
      childCommitment?: string
      parentCommitment?: string
    }
  }>
  signatures: {
    parent?: {
      signedAt: string
      signedBy: string
      signatureType: string
      signatureValue: string
    }
    coParent?: {
      signedAt: string
      signedBy: string
      signatureType: string
      signatureValue: string
    }
    child?: {
      signedAt: string
      signedBy: string
      signatureType: string
      signatureValue: string
    }
  }
}

/**
 * Escape HTML special characters to prevent XSS
 * @param str - String to escape
 * @returns Escaped string safe for HTML
 */
function escapeHtml(str: string | undefined): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Generate printable HTML content for the agreement
 */
function generatePrintableHtml(agreement: AgreementForPdf): string {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const termsHtml = agreement.terms
    .map(
      (term, index) => `
        <div class="term">
          <h3>${escapeHtml(term.content.title) || `Term ${index + 1}`}</h3>
          ${
            term.content.childCommitment
              ? `<p><strong>Child commitment:</strong> ${escapeHtml(term.content.childCommitment)}</p>`
              : ''
          }
          ${
            term.content.parentCommitment
              ? `<p><strong>Parent commitment:</strong> ${escapeHtml(term.content.parentCommitment)}</p>`
              : ''
          }
        </div>
      `
    )
    .join('')

  const signaturesHtml = `
    <div class="signatures">
      ${
        agreement.signatures.parent
          ? `
        <div class="signature">
          <h4>Parent Signature</h4>
          <p class="sig-value">${escapeHtml(agreement.signatures.parent.signatureValue)}</p>
          <p class="sig-date">Signed: ${formatDate(agreement.signatures.parent.signedAt)}</p>
        </div>
      `
          : ''
      }
      ${
        agreement.signatures.coParent
          ? `
        <div class="signature">
          <h4>Co-Parent Signature</h4>
          <p class="sig-value">${escapeHtml(agreement.signatures.coParent.signatureValue)}</p>
          <p class="sig-date">Signed: ${formatDate(agreement.signatures.coParent.signedAt)}</p>
        </div>
      `
          : ''
      }
      ${
        agreement.signatures.child
          ? `
        <div class="signature">
          <h4>Child Signature</h4>
          <p class="sig-value">${escapeHtml(agreement.signatures.child.signatureValue)}</p>
          <p class="sig-date">Signed: ${formatDate(agreement.signatures.child.signedAt)}</p>
        </div>
      `
          : ''
      }
    </div>
  `

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Family Agreement - Version ${agreement.version}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 20px;
          line-height: 1.6;
          color: #1f2937;
        }
        h1 {
          text-align: center;
          color: #111827;
          margin-bottom: 8px;
        }
        .version {
          text-align: center;
          color: #6b7280;
          margin-bottom: 24px;
        }
        .activated {
          text-align: center;
          color: #059669;
          font-weight: 500;
          margin-bottom: 32px;
        }
        .section {
          margin-bottom: 32px;
        }
        .section h2 {
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 8px;
          color: #374151;
        }
        .term {
          background: #f9fafb;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 16px;
        }
        .term h3 {
          margin: 0 0 8px 0;
          color: #111827;
        }
        .term p {
          margin: 4px 0;
        }
        .signatures {
          display: flex;
          flex-wrap: wrap;
          gap: 24px;
          justify-content: center;
        }
        .signature {
          text-align: center;
          min-width: 200px;
          padding: 16px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }
        .signature h4 {
          margin: 0 0 8px 0;
          color: #6b7280;
        }
        .sig-value {
          font-size: 1.25em;
          font-style: italic;
          color: #1f2937;
          margin: 8px 0;
        }
        .sig-date {
          font-size: 0.875em;
          color: #6b7280;
        }
        .footer {
          margin-top: 48px;
          text-align: center;
          color: #9ca3af;
          font-size: 0.875em;
        }
        @media print {
          body { margin: 0; padding: 20px; }
        }
      </style>
    </head>
    <body>
      <h1>Family Agreement</h1>
      <p class="version">Version ${agreement.version}</p>
      <p class="activated">Activated: ${formatDate(agreement.activatedAt)}</p>

      <div class="section">
        <h2>Agreement Terms</h2>
        ${termsHtml}
      </div>

      <div class="section">
        <h2>Signatures</h2>
        ${signaturesHtml}
      </div>

      <div class="footer">
        <p>This agreement was signed digitally via fledgely</p>
        <p>Agreement ID: ${agreement.id}</p>
      </div>
    </body>
    </html>
  `
}

/**
 * Hook for downloading and sharing signed agreements
 *
 * @param params - Agreement ID and Family ID
 * @returns Functions to download/share and loading/error states
 */
export function useAgreementDownload({
  agreementId,
  familyId,
}: UseAgreementDownloadParams): UseAgreementDownloadReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch agreement data from Firestore
   */
  const fetchAgreement = useCallback(async (): Promise<AgreementForPdf | null> => {
    const docRef = doc(db, 'families', familyId, 'agreements', agreementId)
    const snapshot = await getDoc(docRef)

    if (!snapshot.exists()) {
      return null
    }

    const data = snapshot.data()
    return {
      id: snapshot.id,
      version: data.version || '1.0',
      status: data.status || 'unknown',
      activatedAt: data.activatedAt,
      terms: data.terms || [],
      signatures: data.signatures || {},
    }
  }, [agreementId, familyId])

  /**
   * Create audit log entry
   */
  const createAuditLog = useCallback(
    async (action: 'agreement_downloaded' | 'agreement_shared', version: string) => {
      try {
        const auditRef = collection(
          db,
          'families',
          familyId,
          'agreements',
          agreementId,
          'audit-log'
        )

        await addDoc(auditRef, {
          action,
          agreementId,
          timestamp: serverTimestamp(),
          metadata: {
            version,
          },
        })
      } catch (err) {
        // Log but don't fail the main operation
        console.error('Failed to create audit log:', err)
      }
    },
    [agreementId, familyId]
  )

  /**
   * Download agreement as PDF via print dialog
   *
   * Task 2.1-2.3: Generate and download PDF
   */
  const downloadAgreement = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const agreement = await fetchAgreement()

      if (!agreement) {
        setError('Agreement not found')
        return
      }

      // Generate printable HTML
      const html = generatePrintableHtml(agreement)

      // Open print window
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        // Popup was blocked
        setError('Please allow popups to download the agreement')
        return
      }

      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
      // Don't close automatically - let user decide

      // Task 2.5: Create audit log entry (only if popup succeeded)
      await createAuditLog('agreement_downloaded', agreement.version)
    } catch (err) {
      console.error('Download error:', err)
      setError('Failed to download agreement')
    } finally {
      setIsLoading(false)
    }
  }, [fetchAgreement, createAuditLog])

  /**
   * Share agreement via Web Share API or clipboard fallback
   *
   * Task 2.4: Share functionality with fallback
   * @returns ShareResult indicating what happened
   */
  const shareAgreement = useCallback(async (): Promise<ShareResult> => {
    setIsLoading(true)
    setError(null)

    try {
      const agreement = await fetchAgreement()

      if (!agreement) {
        setError('Agreement not found')
        return 'error'
      }

      const shareUrl = `${window.location.origin}/agreements/${agreementId}`
      const shareData = {
        title: 'Our Family Agreement',
        text: `Check out our family agreement (Version ${agreement.version})`,
        url: shareUrl,
      }

      let result: ShareResult = 'shared'

      // Try Web Share API first
      if (navigator.share) {
        try {
          await navigator.share(shareData)
          result = 'shared'
        } catch (shareErr) {
          // User cancelled or share failed
          if ((shareErr as Error).name === 'AbortError') {
            return 'cancelled'
          }
          throw shareErr
        }
      } else {
        // Fallback: copy link to clipboard
        await navigator.clipboard.writeText(shareUrl)
        result = 'copied'
      }

      // Task 2.5: Create audit log entry
      await createAuditLog('agreement_shared', agreement.version)
      return result
    } catch (err) {
      console.error('Share error:', err)
      setError('Failed to share agreement')
      return 'error'
    } finally {
      setIsLoading(false)
    }
  }, [agreementId, fetchAgreement, createAuditLog])

  return {
    downloadAgreement,
    shareAgreement,
    isLoading,
    error,
  }
}
