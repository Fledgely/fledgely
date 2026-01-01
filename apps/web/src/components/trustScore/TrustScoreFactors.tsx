'use client'

/**
 * TrustScoreFactors Component - Story 36.3 Task 3
 *
 * Shows factor breakdown with child-friendly labels.
 * Groups factors by category (positive, neutral, concerning).
 *
 * AC3: Factors breakdown: "Following time limits: +10"
 * AC4: Language is encouraging, not punitive
 */

import { type TrustFactor } from '@fledgely/shared'

// ============================================================================
// Types
// ============================================================================

export interface TrustScoreFactorsProps {
  /** Array of trust factors to display */
  factors: TrustFactor[]
  /** Compact mode shows summary only */
  compact?: boolean
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Format a factor's contribution for display.
 * Example: "Following time limits: +10"
 */
function formatFactorContribution(factor: TrustFactor): string {
  const sign = factor.value >= 0 ? '+' : ''
  return `${factor.description}: ${sign}${factor.value}`
}

/**
 * Get colors for factor category
 */
function getCategoryColors(category: TrustFactor['category']): {
  bg: string
  text: string
  border: string
} {
  switch (category) {
    case 'positive':
      return {
        bg: '#ecfdf5',
        text: '#047857',
        border: '#6ee7b7',
      }
    case 'concerning':
      return {
        bg: '#fff7ed',
        text: '#9a3412',
        border: '#fdba74',
      }
    case 'neutral':
    default:
      return {
        bg: '#f9fafb',
        text: '#6b7280',
        border: '#e5e7eb',
      }
  }
}

// ============================================================================
// Factor Item Component
// ============================================================================

interface FactorItemProps {
  factor: TrustFactor
  index: number
}

function FactorItem({ factor, index }: FactorItemProps) {
  const colors = getCategoryColors(factor.category)

  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 12px',
        backgroundColor: colors.bg,
        borderRadius: '8px',
        marginBottom: '4px',
        borderLeft: `3px solid ${colors.border}`,
      }}
      data-testid={`factor-${index}`}
      data-category={factor.category}
      role="listitem"
    >
      <span
        style={{
          fontSize: '14px',
          color: colors.text,
        }}
      >
        {formatFactorContribution(factor)}
      </span>
    </li>
  )
}

// ============================================================================
// Factor Group Component
// ============================================================================

interface FactorGroupProps {
  title: string
  factors: TrustFactor[]
  testId: string
  headerTestId: string
  startIndex: number
}

function FactorGroup({ title, factors, testId, headerTestId, startIndex }: FactorGroupProps) {
  if (factors.length === 0) return null

  return (
    <div data-testid={testId} style={{ marginBottom: '16px' }}>
      <h4
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#374151',
          marginBottom: '8px',
        }}
        data-testid={headerTestId}
      >
        {title}
      </h4>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {factors.map((factor, idx) => (
          <FactorItem key={idx} factor={factor} index={startIndex + idx} />
        ))}
      </ul>
    </div>
  )
}

// ============================================================================
// Compact Summary Component
// ============================================================================

interface CompactSummaryProps {
  positiveCount: number
  concerningCount: number
}

function CompactSummary({ positiveCount, concerningCount }: CompactSummaryProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '16px',
        fontSize: '14px',
      }}
      data-testid="factors-summary"
    >
      {positiveCount > 0 && <span style={{ color: '#047857' }}>{positiveCount} helping</span>}
      {concerningCount > 0 && (
        <span style={{ color: '#9a3412' }}>{concerningCount} to work on</span>
      )}
      {positiveCount === 0 && concerningCount === 0 && (
        <span style={{ color: '#6b7280' }}>No factors yet</span>
      )}
    </div>
  )
}

// ============================================================================
// Empty State Component
// ============================================================================

function EmptyState() {
  return (
    <div
      style={{
        padding: '16px',
        textAlign: 'center',
        color: '#6b7280',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
      }}
      data-testid="factors-empty"
    >
      <p style={{ margin: 0, fontSize: '14px' }}>
        No factors recorded yet. Keep using the app and your score will start building!
      </p>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * TrustScoreFactors - Displays factor breakdown
 */
export function TrustScoreFactors({ factors, compact = false }: TrustScoreFactorsProps) {
  // Group factors by category
  const positiveFactors = factors.filter((f) => f.category === 'positive')
  const neutralFactors = factors.filter((f) => f.category === 'neutral')
  const concerningFactors = factors.filter((f) => f.category === 'concerning')

  // Compact mode shows summary only
  if (compact) {
    return (
      <div data-testid="trust-score-factors" role="list">
        <CompactSummary
          positiveCount={positiveFactors.length}
          concerningCount={concerningFactors.length}
        />
      </div>
    )
  }

  // Empty state
  if (factors.length === 0) {
    return (
      <div data-testid="trust-score-factors" role="list">
        <EmptyState />
      </div>
    )
  }

  // Calculate starting indices for each group
  let currentIndex = 0
  const positiveStartIndex = currentIndex
  currentIndex += positiveFactors.length

  const neutralStartIndex = currentIndex
  currentIndex += neutralFactors.length

  const concerningStartIndex = currentIndex

  return (
    <div data-testid="trust-score-factors" role="list">
      <FactorGroup
        title="What's helping your score"
        factors={positiveFactors}
        testId="positive-factors"
        headerTestId="positive-factors-header"
        startIndex={positiveStartIndex}
      />
      {neutralFactors.length > 0 && (
        <FactorGroup
          title="Normal activities"
          factors={neutralFactors}
          testId="neutral-factors"
          headerTestId="neutral-factors-header"
          startIndex={neutralStartIndex}
        />
      )}
      <FactorGroup
        title="Things to work on"
        factors={concerningFactors}
        testId="concerning-factors"
        headerTestId="concerning-factors-header"
        startIndex={concerningStartIndex}
      />
    </div>
  )
}
