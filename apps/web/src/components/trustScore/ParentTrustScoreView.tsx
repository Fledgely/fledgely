'use client'

/**
 * ParentTrustScoreView Component - Story 36.4 Task 6
 *
 * Main parent-facing view integrating all trust score components.
 */

import { useState } from 'react'
import { type TrustScore, type TrustFactor } from '@fledgely/shared'
import { ParentTrustScoreCard } from './ParentTrustScoreCard'
import { TrustScoreHistoryChart } from './TrustScoreHistoryChart'
import { MilestoneTimeline } from './MilestoneTimeline'
import { TrustGuidanceCard } from './TrustGuidanceCard'
import { FactorDetailModal } from './FactorDetailModal'

// ============================================================================
// Types
// ============================================================================

export interface ParentTrustScoreViewProps {
  /** Child ID */
  childId: string
  /** Child's name */
  childName: string
  /** Trust score data */
  trustScore: TrustScore
}

// ============================================================================
// Monthly Trend Calculation
// ============================================================================

function calculateMonthlyTrend(trustScore: TrustScore): number {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Find earliest score within last 30 days
  const monthlyHistory = trustScore.history.filter((entry) => entry.date >= thirtyDaysAgo)

  if (monthlyHistory.length === 0) {
    return 0
  }

  // Sort by date ascending
  monthlyHistory.sort((a, b) => a.date.getTime() - b.date.getTime())

  const earliestScore = monthlyHistory[0].previousScore
  return Math.round(trustScore.currentScore - earliestScore)
}

// ============================================================================
// Section Component
// ============================================================================

interface SectionProps {
  title: string
  testId: string
  children: React.ReactNode
}

function Section({ title, testId, children }: SectionProps) {
  return (
    <section
      style={{ marginBottom: '24px' }}
      data-testid={testId}
      aria-labelledby={`${testId}-heading`}
    >
      <h2
        id={`${testId}-heading`}
        style={{
          fontSize: '16px',
          fontWeight: 600,
          color: '#374151',
          marginBottom: '12px',
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function ParentTrustScoreView({
  childId,
  childName,
  trustScore,
}: ParentTrustScoreViewProps) {
  const [selectedFactor, setSelectedFactor] = useState<TrustFactor | null>(null)

  const monthlyTrend = calculateMonthlyTrend(trustScore)

  const handleFactorClick = (factor: TrustFactor) => {
    setSelectedFactor(factor)
  }

  const handleCloseModal = () => {
    setSelectedFactor(null)
  }

  return (
    <main
      style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: '20px',
      }}
      data-testid="parent-trust-score-view"
    >
      {/* Page title */}
      <h1
        style={{
          fontSize: '24px',
          fontWeight: 700,
          color: '#111827',
          marginBottom: '24px',
        }}
        data-testid="view-title"
      >
        {childName}&apos;s Trust Score
      </h1>

      {/* Score section */}
      <section style={{ marginBottom: '24px' }} data-testid="score-section">
        <ParentTrustScoreCard
          childId={childId}
          childName={childName}
          trustScore={trustScore}
          monthlyTrend={monthlyTrend}
          onFactorClick={handleFactorClick}
        />
      </section>

      {/* History section */}
      <Section title="History" testId="history-section">
        <TrustScoreHistoryChart
          history={trustScore.history}
          currentScore={trustScore.currentScore}
        />
      </Section>

      {/* Milestones section */}
      <Section title="Milestones" testId="milestones-section">
        <MilestoneTimeline history={trustScore.history} />
      </Section>

      {/* Guidance section */}
      <section style={{ marginBottom: '24px' }} data-testid="guidance-section">
        <TrustGuidanceCard trustScore={trustScore} childName={childName} />
      </section>

      {/* Factor detail modal */}
      {selectedFactor && (
        <FactorDetailModal factor={selectedFactor} isOpen={true} onClose={handleCloseModal} />
      )}
    </main>
  )
}
