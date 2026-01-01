'use client'

/**
 * FamilyTrustOverview Component - Story 36.6 Task 3
 *
 * Displays family trust overview without leaderboard.
 * AC4: No family-wide leaderboard (prevents competition)
 * AC6: Privacy maintains dignity and prevents shame
 */

import { useMemo } from 'react'

// ============================================================================
// Types
// ============================================================================

export interface ChildTrustData {
  id: string
  name: string
  score: number
}

export interface FamilyTrustOverviewProps {
  /** Array of children with their trust scores */
  childData: ChildTrustData[]
  /** Callback when clicking on a child card */
  onChildClick?: (childId: string) => void
}

// ============================================================================
// Helpers
// ============================================================================

function getScoreLevel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'High Trust', color: '#059669' }
  if (score >= 50) return { label: 'Growing', color: '#d97706' }
  return { label: 'Building', color: '#6b7280' }
}

function getScoreContext(score: number): string {
  if (score >= 80) return 'Doing great!'
  if (score >= 50) return 'Making progress'
  return 'Room to grow together'
}

// ============================================================================
// Child Card Component
// ============================================================================

interface ChildCardProps {
  child: ChildTrustData
  onClick?: () => void
}

function ChildCard({ child, onClick }: ChildCardProps) {
  const level = getScoreLevel(child.score)
  const context = getScoreContext(child.score)

  const CardWrapper = onClick ? 'button' : 'div'
  const wrapperProps = onClick
    ? {
        type: 'button' as const,
        onClick,
        style: {
          cursor: 'pointer',
          width: '100%',
          textAlign: 'left' as const,
        },
      }
    : {}

  return (
    <CardWrapper
      data-testid="child-card"
      {...wrapperProps}
      style={{
        padding: '16px',
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        ...wrapperProps.style,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
        }}
      >
        <span
          data-testid="child-name"
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#374151',
          }}
        >
          {child.name}
        </span>
        <span
          data-testid="child-score"
          style={{
            fontSize: '24px',
            fontWeight: 700,
            color: level.color,
          }}
        >
          {child.score}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          data-testid="score-level"
          style={{
            fontSize: '13px',
            color: level.color,
            fontWeight: 500,
          }}
        >
          {level.label}
        </span>
        <span
          data-testid="score-context"
          style={{
            fontSize: '12px',
            color: '#6b7280',
          }}
        >
          {context}
        </span>
      </div>
    </CardWrapper>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function FamilyTrustOverview({ childData, onChildClick }: FamilyTrustOverviewProps) {
  // Sort alphabetically by name (NOT by score - no ranking!)
  const sortedChildren = useMemo(
    () => [...childData].sort((a, b) => a.name.localeCompare(b.name)),
    [childData]
  )

  // Empty state
  if (childData.length === 0) {
    return (
      <div data-testid="family-trust-overview">
        <div
          data-testid="empty-state"
          style={{
            padding: '32px',
            textAlign: 'center',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            color: '#6b7280',
          }}
        >
          <p>No children in family</p>
        </div>
      </div>
    )
  }

  return (
    <div
      data-testid="family-trust-overview"
      style={{
        padding: '16px',
        backgroundColor: '#f9fafb',
        borderRadius: '12px',
      }}
    >
      <h2
        style={{
          fontSize: '18px',
          fontWeight: 600,
          color: '#374151',
          marginBottom: '16px',
        }}
      >
        Family Trust Overview
      </h2>

      <ul
        role="list"
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {sortedChildren.map((child) => (
          <li key={child.id}>
            <ChildCard
              child={child}
              onClick={onChildClick ? () => onChildClick(child.id) : undefined}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
