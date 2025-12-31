'use client'

/**
 * AuditExportButton Component
 *
 * Story 27.5: Audit Log Search and Export - AC2, AC3, AC5
 *
 * Provides export dropdown with CSV and text (PDF-style) format options.
 * Shows watermark notice before export and handles download.
 */

import { useState, useRef, useEffect } from 'react'
import { getAuth } from 'firebase/auth'
import type { AuditLogFilters } from '../../hooks/useAuditLog'

interface AuditExportButtonProps {
  familyId: string
  filters: AuditLogFilters
  disabled?: boolean
}

const styles = {
  container: {
    position: 'relative' as const,
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  dropdown: {
    position: 'absolute' as const,
    top: '100%',
    right: 0,
    marginTop: '4px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    zIndex: 50,
    minWidth: '180px',
    overflow: 'hidden',
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '10px 16px',
    fontSize: '14px',
    color: '#374151',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left' as const,
  },
  dropdownDivider: {
    height: '1px',
    backgroundColor: '#e5e7eb',
    margin: '4px 0',
  },
  notice: {
    padding: '12px 16px',
    fontSize: '12px',
    color: '#6b7280',
    backgroundColor: '#f9fafb',
    borderTop: '1px solid #e5e7eb',
  },
  loadingOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  loadingBox: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px 32px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '12px',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e5e7eb',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: '14px',
    color: '#374151',
  },
}

/**
 * API base URL for functions
 */
const FUNCTIONS_URL = process.env.NEXT_PUBLIC_FUNCTIONS_URL || ''

/**
 * Download icon SVG
 */
function DownloadIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  )
}

/**
 * CSV icon
 */
function CSVIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  )
}

/**
 * Text/PDF icon
 */
function TextIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  )
}

/**
 * Chevron down icon
 */
function ChevronDownIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export function AuditExportButton({ familyId, filters, disabled }: AuditExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<'csv' | 'txt' | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  /**
   * Handle export request
   */
  const handleExport = async (format: 'csv' | 'txt') => {
    setIsOpen(false)
    setExportFormat(format)
    setIsExporting(true)

    try {
      const auth = getAuth()
      const token = await auth.currentUser?.getIdToken()

      if (!token) {
        throw new Error('Not authenticated')
      }

      // Build query params
      const params = new URLSearchParams({
        familyId,
        format,
      })

      if (filters.actorUid) {
        params.append('actorUid', filters.actorUid)
      }

      if (filters.resourceType) {
        params.append('resourceType', filters.resourceType)
      }

      if (filters.startDate) {
        params.append('startDate', filters.startDate.getTime().toString())
      }

      if (filters.endDate) {
        params.append('endDate', filters.endDate.getTime().toString())
      }

      // Fetch export
      const response = await fetch(`${FUNCTIONS_URL}/exportAuditLog?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to export audit log')
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition')
      const filenameMatch = contentDisposition?.match(/filename="([^"]+)"/)
      const filename = filenameMatch?.[1] || `audit-log.${format}`

      // Download the file
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
      alert(err instanceof Error ? err.message : 'Failed to export audit log')
    } finally {
      setIsExporting(false)
      setExportFormat(null)
    }
  }

  return (
    <>
      <div style={styles.container} ref={dropdownRef}>
        <button
          type="button"
          style={{
            ...styles.button,
            ...(disabled ? styles.buttonDisabled : {}),
          }}
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled || isExporting}
          aria-haspopup="true"
          aria-expanded={isOpen}
        >
          <DownloadIcon />
          <span>Export</span>
          <ChevronDownIcon />
        </button>

        {isOpen && (
          <div style={styles.dropdown}>
            <button
              type="button"
              style={styles.dropdownItem}
              onClick={() => handleExport('csv')}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <CSVIcon />
              <span>Export as CSV</span>
            </button>

            <button
              type="button"
              style={styles.dropdownItem}
              onClick={() => handleExport('txt')}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <TextIcon />
              <span>Export as Text</span>
            </button>

            <div style={styles.notice}>
              Export includes watermark with your ID for traceability. This action is logged.
            </div>
          </div>
        )}
      </div>

      {/* Loading overlay */}
      {isExporting && (
        <div style={styles.loadingOverlay}>
          <div style={styles.loadingBox}>
            <div style={styles.spinner} />
            <span style={styles.loadingText}>
              Generating {exportFormat === 'csv' ? 'CSV' : 'text'} export...
            </span>
          </div>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
    </>
  )
}
