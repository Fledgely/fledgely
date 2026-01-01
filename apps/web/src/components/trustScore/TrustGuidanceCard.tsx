'use client'

/**
 * TrustGuidanceCard Component - Story 36.4 Task 5
 *
 * Guidance card with tips and conversation starters for parents.
 * AC5: Guidance card with tips for parents
 */

import { useState } from 'react'
import { type TrustScore, type TrustFactor } from '@fledgely/shared'

// ============================================================================
// Types
// ============================================================================

export interface TrustGuidanceCardProps {
  /** Trust score data */
  trustScore: TrustScore
  /** Child's name */
  childName: string
}

type ScoreLevel = 'high' | 'medium' | 'growing'

// ============================================================================
// Score Level Helpers
// ============================================================================

function getScoreLevel(score: number): ScoreLevel {
  if (score >= 80) return 'high'
  if (score >= 50) return 'medium'
  return 'growing'
}

function getScoreColors(level: ScoreLevel): {
  background: string
  border: string
  text: string
} {
  switch (level) {
    case 'high':
      return {
        background: '#ecfdf5',
        border: '#6ee7b7',
        text: '#047857',
      }
    case 'medium':
      return {
        background: '#fffbeb',
        border: '#fcd34d',
        text: '#92400e',
      }
    case 'growing':
      return {
        background: '#fff7ed',
        border: '#fdba74',
        text: '#9a3412',
      }
  }
}

// ============================================================================
// Guidance Messages
// ============================================================================

function getGuidanceMessage(level: ScoreLevel, childName: string): string {
  switch (level) {
    case 'high':
      return `Great job! ${childName} is showing excellent responsibility with their device usage.`
    case 'medium':
      return `${childName} is building trust and making progress. Keep encouraging good habits!`
    case 'growing':
      return `Let's work together to help ${childName} build better digital habits.`
  }
}

// ============================================================================
// Parent Tips
// ============================================================================

function getParentTips(factors: TrustFactor[], level: ScoreLevel): string[] {
  const tips: string[] = []

  // Factor-based tips
  const hasTimeLimitIssue = factors.some(
    (f) => f.type === 'time-limit-compliance' && f.category === 'concerning'
  )
  const hasBypassAttempt = factors.some((f) => f.type === 'bypass-attempt')

  if (hasTimeLimitIssue) {
    tips.push('Consider discussing screen time limits together to find a balance.')
  }

  if (hasBypassAttempt) {
    tips.push('Have an open conversation about why boundaries exist.')
  }

  // Level-based tips
  if (level === 'high') {
    tips.push('Celebrate this achievement with your child!')
    tips.push('Consider discussing additional privileges as a reward.')
  } else if (level === 'medium') {
    tips.push('Focus on the positive progress being made.')
    tips.push('Set small, achievable goals together.')
  } else {
    tips.push('Create a supportive environment for improvement.')
    tips.push('Break down goals into smaller, manageable steps.')
    tips.push('Recognize small wins to build momentum.')
  }

  return tips
}

// ============================================================================
// Conversation Starters
// ============================================================================

function getConversationStarters(childName: string, level: ScoreLevel): string[] {
  const starters: string[] = []

  if (level === 'high') {
    starters.push(
      `"${childName}, I noticed you've been doing great with your screen time. How does that feel?"`
    )
    starters.push(
      `"What's your favorite thing about how you're using your device lately, ${childName}?"`
    )
  } else if (level === 'medium') {
    starters.push(`"${childName}, let's talk about what's going well with your screen time."`)
    starters.push(`"What would help you feel better about your device usage, ${childName}?"`)
  } else {
    starters.push(`"${childName}, I want to help you succeed. What's been challenging?"`)
    starters.push(`"Let's figure this out together, ${childName}. What would make things easier?"`)
  }

  return starters
}

// ============================================================================
// Main Component
// ============================================================================

export function TrustGuidanceCard({ trustScore, childName }: TrustGuidanceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const score = trustScore.currentScore
  const level = getScoreLevel(score)
  const colors = getScoreColors(level)
  const message = getGuidanceMessage(level, childName)
  const tips = getParentTips(trustScore.factors, level)
  const conversationStarters = getConversationStarters(childName, level)

  return (
    <div
      style={{
        backgroundColor: colors.background,
        border: `2px solid ${colors.border}`,
        borderRadius: '12px',
        padding: '20px',
      }}
      data-testid="trust-guidance-card"
      data-level={level}
      aria-label={`Parenting guidance for ${childName}'s trust score`}
    >
      {/* Header */}
      <h3
        style={{
          fontSize: '16px',
          fontWeight: 600,
          color: colors.text,
          marginBottom: '12px',
        }}
        data-testid="guidance-header"
      >
        Parenting Insights
      </h3>

      {/* Main message */}
      <p
        style={{
          fontSize: '14px',
          color: '#374151',
          lineHeight: 1.5,
          marginBottom: '16px',
        }}
        data-testid="guidance-message"
      >
        {message}
      </p>

      {/* Parent tips */}
      <div data-testid="parent-tips" style={{ marginBottom: '16px' }}>
        <h4
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#6b7280',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Tips for Parents
        </h4>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {tips.slice(0, isExpanded ? tips.length : 2).map((tip, index) => (
            <li
              key={index}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                marginBottom: '8px',
                fontSize: '14px',
                color: '#4b5563',
              }}
              data-testid={`parent-tip-${index}`}
            >
              <span style={{ color: colors.text }}>💡</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>

        {tips.length > 2 && (
          <button
            style={{
              background: 'none',
              border: 'none',
              fontSize: '13px',
              color: colors.text,
              cursor: 'pointer',
              padding: '4px 0',
              fontWeight: 500,
            }}
            onClick={() => setIsExpanded(!isExpanded)}
            data-testid="expand-tips-button"
            aria-expanded={isExpanded}
          >
            {isExpanded ? 'Show less' : `+${tips.length - 2} more tips`}
          </button>
        )}

        {isExpanded && tips.length > 2 && <div data-testid="expanded-tips" />}
      </div>

      {/* Conversation starters */}
      <div data-testid="conversation-starters">
        <h4
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#6b7280',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Conversation Starters
        </h4>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {conversationStarters.map((starter, index) => (
            <li
              key={index}
              style={{
                padding: '8px 12px',
                backgroundColor: 'white',
                borderRadius: '6px',
                marginBottom: '8px',
                fontSize: '14px',
                color: '#4b5563',
                fontStyle: 'italic',
              }}
            >
              {starter}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
