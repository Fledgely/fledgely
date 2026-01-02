'use client'

/**
 * Graduation Conversation Guide Component - Story 38.2 Task 6
 *
 * Displays conversation template with discussion points.
 * AC5: Conversation template provided with discussion points
 * AC7: Respects child's demonstrated readiness for independence
 */

import { useState } from 'react'
import type {
  ConversationTemplate,
  ViewerType,
  ConversationStatus,
  ConversationOutcome,
} from '@fledgely/shared'
import {
  getDiscussionPointsForViewer,
  getRequiredDiscussionPoints,
  getOptionalDiscussionPoints,
  getSuggestedQuestions,
  getResources,
  getIntroduction,
  getClosingMessage,
  getDiscussionPointCount,
} from '@fledgely/shared'

export interface GraduationConversationGuideProps {
  template: ConversationTemplate
  viewerType: ViewerType
  childName: string
  conversationStatus: ConversationStatus
  onSchedule?: (date: Date) => void
  onComplete?: (outcome: ConversationOutcome) => void
}

const styles = {
  container: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '800px',
  },
  header: {
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '20px',
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#166534',
    margin: 0,
    marginBottom: '12px',
  },
  introduction: {
    fontSize: '16px',
    color: '#374151',
    lineHeight: 1.7,
    margin: 0,
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  badge: {
    fontSize: '12px',
    padding: '2px 8px',
    borderRadius: '12px',
    fontWeight: 500,
  },
  requiredBadge: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  optionalBadge: {
    backgroundColor: '#e5e7eb',
    color: '#4b5563',
  },
  discussionList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  discussionItem: {
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px',
    border: '1px solid #e5e7eb',
  },
  discussionItemCompleted: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  topicHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  topicTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  },
  topicNumber: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#166534',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600,
    marginRight: '12px',
  },
  prompt: {
    fontSize: '15px',
    color: '#4b5563',
    lineHeight: 1.6,
    margin: 0,
  },
  checkbox: {
    width: '20px',
    height: '20px',
    cursor: 'pointer',
  },
  questionsList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  questionItem: {
    fontSize: '15px',
    color: '#4b5563',
    padding: '12px 16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
  },
  questionIcon: {
    color: '#166534',
    fontWeight: 600,
    flexShrink: 0,
  },
  resourcesList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  resourceItem: {
    padding: '16px',
    backgroundColor: '#f0fdf4',
    borderRadius: '8px',
    marginBottom: '8px',
    border: '1px solid #86efac',
  },
  resourceTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#166534',
    margin: 0,
    marginBottom: '4px',
  },
  resourceDescription: {
    fontSize: '14px',
    color: '#4b5563',
    margin: 0,
  },
  resourceLink: {
    color: '#166534',
    textDecoration: 'underline',
    cursor: 'pointer',
  },
  closing: {
    backgroundColor: '#f0fdf4',
    borderRadius: '12px',
    padding: '20px',
    marginTop: '24px',
  },
  closingTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#166534',
    marginBottom: '8px',
    margin: 0,
  },
  closingMessage: {
    fontSize: '15px',
    color: '#15803d',
    lineHeight: 1.6,
    margin: 0,
  },
  actions: {
    marginTop: '32px',
    paddingTop: '24px',
    borderTop: '1px solid #e5e7eb',
  },
  actionsTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '16px',
  },
  buttonGroup: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '12px',
  },
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    padding: '10px 24px',
    backgroundColor: '#22c55e',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  secondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    padding: '10px 24px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    fontSize: '15px',
    fontWeight: 500,
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  dateInput: {
    minHeight: '44px',
    padding: '10px 16px',
    fontSize: '15px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    marginRight: '12px',
  },
  progressInfo: {
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '16px',
  },
}

export default function GraduationConversationGuide({
  template,
  viewerType,
  childName,
  conversationStatus,
  onSchedule,
  onComplete,
}: GraduationConversationGuideProps) {
  const [completedTopics, setCompletedTopics] = useState<Set<number>>(new Set())
  const [scheduledDate, setScheduledDate] = useState<string>('')
  const [selectedOutcome, setSelectedOutcome] = useState<ConversationOutcome | ''>('')

  const discussionPoints = getDiscussionPointsForViewer(template, viewerType)
  const _requiredPoints = getRequiredDiscussionPoints(template)
  const _optionalPoints = getOptionalDiscussionPoints(template)
  const questions = getSuggestedQuestions(template)
  const resources = getResources(template)
  const introduction = getIntroduction(template, viewerType, childName)
  const closing = getClosingMessage(template, viewerType, childName)
  const pointCount = getDiscussionPointCount(template)

  const handleTopicToggle = (index: number) => {
    const newCompleted = new Set(completedTopics)
    if (newCompleted.has(index)) {
      newCompleted.delete(index)
    } else {
      newCompleted.add(index)
    }
    setCompletedTopics(newCompleted)
  }

  const handleSchedule = () => {
    if (onSchedule && scheduledDate) {
      onSchedule(new Date(scheduledDate))
    }
  }

  const _handleComplete = () => {
    if (onComplete && selectedOutcome) {
      onComplete(selectedOutcome)
    }
  }

  const canSchedule = conversationStatus === 'acknowledged'
  const canComplete = conversationStatus === 'scheduled'

  return (
    <article
      style={styles.container}
      aria-label={`Graduation conversation guide for ${viewerType === 'child' ? 'you' : childName}`}
    >
      <style>
        {`
          .guide-btn:hover {
            opacity: 0.9;
          }
          .guide-btn:focus {
            outline: 2px solid #22c55e;
            outline-offset: 2px;
          }
        `}
      </style>

      <header style={styles.header}>
        <h1 style={styles.title}>{template.title}</h1>
        <p style={styles.introduction}>{introduction}</p>
      </header>

      <section style={styles.section} aria-labelledby="discussion-points-title">
        <h2 id="discussion-points-title" style={styles.sectionTitle}>
          Discussion Points
          <span style={{ ...styles.badge, ...styles.requiredBadge }}>
            {pointCount.required} required
          </span>
          {pointCount.optional > 0 && (
            <span style={{ ...styles.badge, ...styles.optionalBadge }}>
              {pointCount.optional} optional
            </span>
          )}
        </h2>

        <ol style={styles.discussionList}>
          {discussionPoints.map((point, index) => (
            <li
              key={index}
              style={{
                ...styles.discussionItem,
                ...(completedTopics.has(index) ? styles.discussionItemCompleted : {}),
              }}
            >
              <div style={styles.topicHeader}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={styles.topicNumber}>{index + 1}</span>
                  <h3 style={styles.topicTitle}>
                    {point.topic}
                    {point.optional && (
                      <span
                        style={{
                          ...styles.badge,
                          ...styles.optionalBadge,
                          marginLeft: '8px',
                        }}
                      >
                        Optional
                      </span>
                    )}
                  </h3>
                </div>
                <label>
                  <input
                    type="checkbox"
                    style={styles.checkbox}
                    checked={completedTopics.has(index)}
                    onChange={() => handleTopicToggle(index)}
                    aria-label={`Mark "${point.topic}" as discussed`}
                  />
                </label>
              </div>
              <p style={styles.prompt}>{point.prompt}</p>
            </li>
          ))}
        </ol>
      </section>

      <section style={styles.section} aria-labelledby="questions-title">
        <h2 id="questions-title" style={styles.sectionTitle}>
          Suggested Questions
        </h2>
        <ul style={styles.questionsList}>
          {questions.map((question, index) => (
            <li key={index} style={styles.questionItem}>
              <span style={styles.questionIcon} aria-hidden="true">
                ?
              </span>
              <span>{question}</span>
            </li>
          ))}
        </ul>
      </section>

      <section style={styles.section} aria-labelledby="resources-title">
        <h2 id="resources-title" style={styles.sectionTitle}>
          Helpful Resources
        </h2>
        <ul style={styles.resourcesList}>
          {resources.map((resource, index) => (
            <li key={index} style={styles.resourceItem}>
              <h3 style={styles.resourceTitle}>
                <a href={resource.url} style={styles.resourceLink}>
                  {resource.title}
                </a>
              </h3>
              {resource.description && (
                <p style={styles.resourceDescription}>{resource.description}</p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <div style={styles.closing}>
        <h3 style={styles.closingTitle}>Closing Thoughts</h3>
        <p style={styles.closingMessage}>{closing}</p>
      </div>

      {(canSchedule || canComplete) && (
        <div style={styles.actions}>
          {canSchedule && onSchedule && (
            <>
              <h3 style={styles.actionsTitle}>Schedule Your Conversation</h3>
              <div style={styles.buttonGroup}>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  style={styles.dateInput}
                  min={new Date().toISOString().split('T')[0]}
                  aria-label="Select date for conversation"
                />
                <button
                  type="button"
                  onClick={handleSchedule}
                  style={styles.primaryButton}
                  className="guide-btn"
                  disabled={!scheduledDate}
                >
                  Schedule Conversation
                </button>
              </div>
            </>
          )}

          {canComplete && onComplete && (
            <>
              <h3 style={styles.actionsTitle}>Record Conversation Outcome</h3>
              <div style={styles.buttonGroup}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOutcome('graduated')
                    if (onComplete) onComplete('graduated')
                  }}
                  style={styles.primaryButton}
                  className="guide-btn"
                >
                  Complete Graduation
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOutcome('deferred')
                    if (onComplete) onComplete('deferred')
                  }}
                  style={styles.secondaryButton}
                  className="guide-btn"
                >
                  Defer for Now
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOutcome('declined')
                    if (onComplete) onComplete('declined')
                  }}
                  style={styles.secondaryButton}
                  className="guide-btn"
                >
                  Decline
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <p style={styles.progressInfo}>
        {completedTopics.size > 0 && (
          <>
            Progress: {completedTopics.size} of {discussionPoints.length} topics discussed
          </>
        )}
      </p>
    </article>
  )
}
