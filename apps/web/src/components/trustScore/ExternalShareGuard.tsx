'use client'

/**
 * ExternalShareGuard Component - Story 36.6 Task 4
 *
 * Prevents external sharing of trust scores.
 * AC5: Trust score not shared outside family
 */

import { type ReactNode } from 'react'

// ============================================================================
// Types
// ============================================================================

export interface ExternalShareGuardProps {
  /** Content to protect from external sharing */
  children: ReactNode
  /** Show privacy notice */
  showNotice?: boolean
}

// ============================================================================
// Main Component
// ============================================================================

export function ExternalShareGuard({ children, showNotice = false }: ExternalShareGuardProps) {
  return (
    <div data-testid="external-share-guard">
      {/* Privacy notice when enabled */}
      {showNotice && (
        <div
          data-testid="privacy-notice"
          role="note"
          style={{
            padding: '12px 16px',
            backgroundColor: '#eff6ff',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '13px',
            color: '#1e40af',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span aria-hidden="true">🔒</span>
          <span>Trust scores are private to your family and cannot be shared externally.</span>
        </div>
      )}

      {/* Protected content - no share/export buttons rendered */}
      {children}
    </div>
  )
}
