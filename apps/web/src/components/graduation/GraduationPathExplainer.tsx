/**
 * Graduation Path Explainer Component - Story 38.1 Task 5
 *
 * Component explaining the full graduation path and eligibility.
 * AC3: Child sees clear path to end of monitoring
 * AC5: Eligibility triggers conversation, not auto-graduation
 */

import React from 'react'
import { ViewerType } from '@fledgely/shared'
import { getPathOverview, getEligibilityExplanation } from '@fledgely/shared'

export interface GraduationPathExplainerProps {
  viewerType: ViewerType
  childName?: string
  onClose?: () => void
}

/**
 * Graduation Path Explainer
 *
 * Explains the graduation path and what eligibility means.
 */
export function GraduationPathExplainer({
  viewerType,
  childName,
  onClose,
}: GraduationPathExplainerProps) {
  const pathOverview = getPathOverview(viewerType)
  const eligibilityExplanation = getEligibilityExplanation(viewerType)

  const requirements = [
    {
      icon: '🎯',
      title: 'Maintain 100% Trust',
      description:
        viewerType === 'child'
          ? 'Keep your trust score at 100% consistently.'
          : 'Your child needs to maintain a perfect trust score.',
    },
    {
      icon: '📅',
      title: '12 Consecutive Months',
      description:
        viewerType === 'child'
          ? 'Maintain perfect trust for 12 months in a row.'
          : '12 months of sustained responsibility demonstrates readiness.',
    },
    {
      icon: '💬',
      title: 'Family Conversation',
      description:
        viewerType === 'child'
          ? "When you're eligible, your family will discuss next steps together."
          : 'Eligibility triggers a graduation conversation, not automatic changes.',
    },
  ]

  const milestones = [
    { month: 3, label: 'First Quarter', description: 'Building momentum' },
    { month: 6, label: 'Halfway Point', description: 'Sustained progress' },
    { month: 9, label: 'Almost There', description: 'Approaching the finish line' },
    { month: 12, label: 'Graduation Eligible', description: 'Ready for conversation' },
  ]

  return (
    <div data-testid="graduation-path-explainer" className="graduation-path-explainer">
      {/* Header */}
      <div className="explainer-header" data-testid="explainer-header">
        <h2>
          {viewerType === 'child'
            ? 'Your Path to Graduation'
            : `Understanding ${childName ? `${childName}'s` : 'the'} Graduation Path`}
        </h2>
        {onClose && (
          <button
            className="close-button"
            data-testid="close-button"
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            ×
          </button>
        )}
      </div>

      {/* Path Overview */}
      <section className="path-overview-section" data-testid="path-overview-section">
        <h3>How Graduation Works</h3>
        <p data-testid="path-overview-text">{pathOverview}</p>
      </section>

      {/* Requirements */}
      <section className="requirements-section" data-testid="requirements-section">
        <h3>What It Takes</h3>
        <ul className="requirements-list" data-testid="requirements-list">
          {requirements.map((req, index) => (
            <li key={index} className="requirement-item" data-testid={`requirement-${index}`}>
              <span className="requirement-icon">{req.icon}</span>
              <div className="requirement-content">
                <strong>{req.title}</strong>
                <p>{req.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Milestones */}
      <section className="milestones-section" data-testid="milestones-section">
        <h3>Milestone Markers</h3>
        <p className="milestones-intro">
          {viewerType === 'child'
            ? "You'll celebrate these milestones along the way:"
            : 'Progress is marked at key milestones:'}
        </p>
        <ul className="milestones-list" data-testid="milestones-list">
          {milestones.map((milestone) => (
            <li
              key={milestone.month}
              className="milestone-item"
              data-testid={`milestone-explainer-${milestone.month}`}
            >
              <span className="milestone-month">{milestone.month} months</span>
              <span className="milestone-label">{milestone.label}</span>
              <span className="milestone-description">{milestone.description}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Eligibility Explanation (AC5) */}
      <section className="eligibility-section" data-testid="eligibility-section">
        <h3>What Eligibility Means</h3>
        <p data-testid="eligibility-explanation">{eligibilityExplanation}</p>
        <div className="important-note" data-testid="important-note">
          <strong>Important:</strong>{' '}
          {viewerType === 'child'
            ? "Reaching eligibility doesn't mean monitoring ends automatically. It means you've earned the right to have a conversation about it."
            : 'Eligibility is the start of a conversation, not an automatic transition. You maintain control over the graduation process.'}
        </div>
      </section>

      {/* What Happens After */}
      <section className="after-section" data-testid="after-section">
        <h3>After Graduation</h3>
        <p data-testid="after-explanation">
          {viewerType === 'child'
            ? "After graduation, you'll have more independence. Your family will discuss what that looks like together - there's no one-size-fits-all answer."
            : 'Post-graduation arrangements are customizable. Some families transition gradually, others all at once. The conversation determines what works best for your family.'}
        </p>
      </section>

      {/* Encouragement */}
      <section className="encouragement-section" data-testid="encouragement-section">
        <p className="encouragement-text" data-testid="encouragement-text">
          {viewerType === 'child'
            ? "This journey is about building trust and showing responsibility. Every day of good choices brings you closer to your goal. You've got this!"
            : 'The graduation path reinforces positive behavior by giving your child a clear, achievable goal. Your encouragement along the way makes a difference.'}
        </p>
      </section>
    </div>
  )
}

export default GraduationPathExplainer
