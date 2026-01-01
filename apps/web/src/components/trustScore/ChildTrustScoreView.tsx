'use client'

/**
 * ChildTrustScoreView Component - Story 36.3 Task 6
 *
 * Complete child trust score view page/section.
 * Integrates all trust score components for child-facing display.
 *
 * Layout (from story):
 * ┌─────────────────────────────────────┐
 * │  Your Trust Score                   │
 * │  ┌─────────────┐                    │
 * │  │     85      │ ↑ Up 5 this month  │
 * │  └─────────────┘                    │
 * │                                     │
 * │  What's helping your score:         │
 * │  • Following time limits: +10       │
 * │  • Using focus mode: +5             │
 * │                                     │
 * │  Tips to improve:                   │
 * │  • Keep sticking to time limits!    │
 * │                                     │
 * │  Keep up the great work! 🎉         │
 * └─────────────────────────────────────┘
 *
 * All ACs covered:
 * - AC1: Score displayed prominently
 * - AC2: Trend shown
 * - AC3: Factors breakdown
 * - AC4: Language is encouraging
 * - AC5: Tips shown
 * - AC6: Growth framing
 */

import { type TrustScore } from '@fledgely/shared'
import { useScoreCalculation } from '../../hooks/useScoreCalculation'
import { TrustScoreCard } from './TrustScoreCard'
import { TrustScoreTrend } from './TrustScoreTrend'
import { TrustScoreFactors } from './TrustScoreFactors'
import { TrustScoreImprovement } from './TrustScoreImprovement'
import { TrustScoreEncouragement } from './TrustScoreEncouragement'

// ============================================================================
// Types
// ============================================================================

export interface ChildTrustScoreViewProps {
  /** Child ID */
  childId: string
  /** Trust score data */
  trustScore: TrustScore
}

// ============================================================================
// Section Component
// ============================================================================

interface SectionProps {
  children: React.ReactNode
  testId?: string
}

function Section({ children, testId }: SectionProps) {
  return (
    <div
      style={{
        marginBottom: '20px',
      }}
      data-testid={testId}
    >
      {children}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * ChildTrustScoreView - Complete child-facing trust score display
 */
export function ChildTrustScoreView({ childId, trustScore }: ChildTrustScoreViewProps) {
  // Get calculation data from hook
  const { weeklyTrend, monthlyTrend, improvementTips, encouragement, milestoneMessage } =
    useScoreCalculation({
      trustScore,
      pendingFactors: [],
    })

  return (
    <div
      style={{
        maxWidth: '500px',
        margin: '0 auto',
        padding: '20px',
      }}
      data-testid="child-trust-score-view"
      role="main"
      aria-label="Your Trust Score"
    >
      {/* Page Title */}
      <h1
        style={{
          fontSize: '24px',
          fontWeight: 700,
          color: '#111827',
          marginBottom: '20px',
          textAlign: 'center',
        }}
      >
        Your Trust Score
      </h1>

      {/* AC1: Score displayed prominently */}
      <Section testId="score-section">
        <TrustScoreCard childId={childId} trustScore={trustScore} />
      </Section>

      {/* AC2: Trend shown */}
      <Section testId="trend-section">
        <TrustScoreTrend weeklyTrend={weeklyTrend} monthlyTrend={monthlyTrend} mode="monthly" />
      </Section>

      {/* AC3: Factors breakdown */}
      {trustScore.factors.length > 0 && (
        <Section testId="factors-section">
          <TrustScoreFactors factors={trustScore.factors} />
        </Section>
      )}

      {/* AC5: Tips to improve */}
      {improvementTips.length > 0 && (
        <Section testId="tips-section">
          <TrustScoreImprovement tips={improvementTips} />
        </Section>
      )}

      {/* AC4 & AC6: Encouragement and growth framing */}
      <Section testId="encouragement-section">
        <TrustScoreEncouragement message={encouragement} milestoneMessage={milestoneMessage} />
      </Section>
    </div>
  )
}
