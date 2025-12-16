'use client'

import { useState, useRef, useEffect } from 'react'
import type { ExportFormat } from '../../../hooks/useAgreementExport'

/**
 * Props for the ExportButton component
 */
export interface ExportButtonProps {
  /** Handler for PDF export */
  onExportPdf: () => void
  /** Handler for print dialog */
  onPrint: () => void
  /** Whether export is in progress */
  isExporting?: boolean
  /** Whether the button is disabled */
  disabled?: boolean
  /** Additional CSS classes */
  className?: string
  /** Data attributes for testing */
  'data-testid'?: string
}

/**
 * ExportDropdownItem Component
 */
interface DropdownItemProps {
  icon: React.ReactNode
  label: string
  description: string
  onClick: () => void
  disabled?: boolean
}

function DropdownItem({ icon, label, description, onClick, disabled }: DropdownItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-800 transition-colors ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      role="menuitem"
    >
      <span className="flex-shrink-0 w-5 h-5 mt-0.5 text-gray-500 dark:text-gray-400">
        {icon}
      </span>
      <div>
        <span className="block font-medium text-gray-900 dark:text-gray-100">{label}</span>
        <span className="block text-sm text-gray-500 dark:text-gray-400">{description}</span>
      </div>
    </button>
  )
}

/**
 * PDF Icon
 */
const PdfIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z" />
    <path d="M8 12h8v2H8zm0 3h8v2H8z" />
  </svg>
)

/**
 * Print Icon
 */
const PrintIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z" />
  </svg>
)

/**
 * Download/Export Icon
 */
const ExportIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
  </svg>
)

/**
 * Loading Spinner
 */
const Spinner = () => (
  <svg
    className="animate-spin h-5 w-5 text-current"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
)

/**
 * Chevron Down Icon
 */
const ChevronDownIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
      clipRule="evenodd"
    />
  </svg>
)

/**
 * ExportButton Component
 *
 * Story 5.5: Agreement Preview & Summary - Task 6.5
 *
 * Dropdown button for exporting agreements to PDF or print.
 *
 * Features:
 * - PDF export via print dialog (AC #6)
 * - Direct print option
 * - Loading state indication
 * - Keyboard accessible dropdown
 * - Screen reader support
 *
 * @example
 * ```tsx
 * <ExportButton
 *   onExportPdf={handleExportPdf}
 *   onPrint={handlePrint}
 *   isExporting={isExporting}
 * />
 * ```
 */
export function ExportButton({
  onExportPdf,
  onPrint,
  isExporting = false,
  disabled = false,
  className = '',
  'data-testid': dataTestId = 'export-button',
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close dropdown on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
        buttonRef.current?.focus()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleToggle = () => {
    if (!disabled && !isExporting) {
      setIsOpen(!isOpen)
    }
  }

  const handleExportPdf = () => {
    setIsOpen(false)
    onExportPdf()
  }

  const handlePrint = () => {
    setIsOpen(false)
    onPrint()
  }

  const isDisabled = disabled || isExporting

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {/* Main button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        disabled={isDisabled}
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
          isDisabled
            ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        data-testid={dataTestId}
      >
        {isExporting ? (
          <>
            <Spinner />
            <span>Exporting...</span>
          </>
        ) : (
          <>
            <ExportIcon />
            <span>Export</span>
            <ChevronDownIcon />
          </>
        )}
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50"
          role="menu"
          aria-orientation="vertical"
          data-testid={`${dataTestId}-menu`}
        >
          <DropdownItem
            icon={<PdfIcon />}
            label="Download PDF"
            description="Save agreement as PDF file"
            onClick={handleExportPdf}
            disabled={isExporting}
          />
          <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
          <DropdownItem
            icon={<PrintIcon />}
            label="Print"
            description="Open print dialog"
            onClick={handlePrint}
            disabled={isExporting}
          />
        </div>
      )}

      {/* Screen reader announcement */}
      <div className="sr-only" role="status" aria-live="polite">
        {isExporting ? 'Exporting agreement, please wait...' : ''}
      </div>
    </div>
  )
}

export default ExportButton
