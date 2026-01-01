'use client'

/**
 * FactorDetailModal Component - Story 36.4 Task 4
 *
 * Modal showing detailed factor information for parents.
 * AC4: Factor details available on click
 */

import { useEffect, useRef } from 'react'
import { type TrustFactor } from '@fledgely/shared'

// ============================================================================
// Types
// ============================================================================

export interface FactorDetailModalProps {
  /** Factor to display */
  factor: TrustFactor
  /** Whether modal is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
}

// ============================================================================
// Factor Explanations
// ============================================================================

function getFactorExplanation(type: TrustFactor['type']): string {
  const explanations: Partial<Record<TrustFactor['type'], string>> = {
    'time-limit-compliance': 'Your child has been following the agreed screen time limits.',
    'focus-mode-usage': 'Focus mode helps your child concentrate during homework time.',
    'bypass-attempt': 'Bypass attempts may indicate the need to discuss boundaries.',
    'no-bypass-attempts': 'No bypass attempts shows trustworthy behavior.',
    'normal-app-usage': 'Using apps in expected ways demonstrates responsibility.',
    'monitoring-disabled': 'Monitoring was disabled during this period.',
  }
  return explanations[type] || 'This factor affects the trust score.'
}

// ============================================================================
// Category Colors
// ============================================================================

function getCategoryColors(category: TrustFactor['category']): {
  background: string
  border: string
  text: string
} {
  switch (category) {
    case 'positive':
      return {
        background: '#ecfdf5',
        border: '#10b981',
        text: '#047857',
      }
    case 'neutral':
      return {
        background: '#f3f4f6',
        border: '#9ca3af',
        text: '#4b5563',
      }
    case 'concerning':
      return {
        background: '#fff7ed',
        border: '#fb923c',
        text: '#9a3412',
      }
  }
}

// ============================================================================
// Main Component
// ============================================================================

export function FactorDetailModal({ factor, isOpen, onClose }: FactorDetailModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const colors = getCategoryColors(factor.category)

  // Focus close button on open
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus()
    }
  }, [isOpen])

  // Handle escape key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) {
    return null
  }

  const valueSign = factor.value >= 0 ? '+' : ''

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
      onKeyDown={handleKeyDown}
      data-testid="factor-detail-modal"
      data-category={factor.category}
    >
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}
        data-testid="modal-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div
        role="dialog"
        aria-labelledby="factor-modal-title"
        aria-modal="true"
        style={{
          position: 'relative',
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '400px',
          width: '90%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '16px',
          }}
        >
          <h2
            id="factor-modal-title"
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#111827',
              margin: 0,
            }}
            data-testid="factor-description"
          >
            {factor.description}
          </h2>

          <button
            ref={closeButtonRef}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              color: '#9ca3af',
              cursor: 'pointer',
              padding: '4px',
              lineHeight: 1,
            }}
            onClick={onClose}
            data-testid="modal-close-button"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Value and category */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              padding: '8px 16px',
              backgroundColor: colors.background,
              border: `2px solid ${colors.border}`,
              borderRadius: '8px',
            }}
          >
            <span
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: colors.text,
              }}
              data-testid="factor-value"
            >
              {valueSign}
              {factor.value}
            </span>
          </div>

          <span
            style={{
              fontSize: '14px',
              fontWeight: 500,
              color: colors.text,
              textTransform: 'capitalize',
            }}
            data-testid="factor-category"
          >
            {factor.category}
          </span>
        </div>

        {/* Explanation */}
        <div
          style={{
            padding: '12px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            marginBottom: '12px',
          }}
          data-testid="factor-explanation"
        >
          <p
            style={{
              fontSize: '14px',
              color: '#4b5563',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {getFactorExplanation(factor.type)}
          </p>
        </div>

        {/* Date */}
        <div
          style={{
            fontSize: '13px',
            color: '#6b7280',
          }}
          data-testid="factor-date"
        >
          Occurred: {factor.occurredAt.toLocaleDateString()}
        </div>
      </div>
    </div>
  )
}
