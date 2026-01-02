/**
 * NegotiationResourcesPanel Component - Story 34.5.6 Task 1
 *
 * Proactive panel displaying age-appropriate negotiation tips.
 * AC1: Age-appropriate tips
 * AC2: Practical content with examples
 * AC3: Empowering not manipulative
 * AC4: Proactive access from child dashboard
 *
 * CRITICAL:
 * - Content must be empowering, not manipulative
 * - Respects parent authority while giving child voice
 * - Available proactively, not just after rejections
 */

import { memo, useState } from 'react'
import type { AgeTier } from '@fledgely/shared/contracts/mediationResources'
import { getNegotiationTips } from '@fledgely/shared/services/mediationResourceService'

// ============================================
// Types
// ============================================

export interface NegotiationResourcesPanelProps {
  /** Child's age tier for content adaptation */
  ageTier: AgeTier
  /** Whether panel starts expanded */
  defaultExpanded?: boolean
  /** Child's name for personalization */
  childName?: string
}

// ============================================
// Styles
// ============================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#f0f9ff', // blue-50 - encouraging, not warning
    borderRadius: '12px',
    border: '1px solid #bae6fd', // blue-200
    marginBottom: '16px',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    backgroundColor: '#e0f2fe', // blue-100
    cursor: 'pointer',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerIcon: {
    fontSize: '24px',
  },
  headerText: {
    margin: 0,
  },
  headerTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#0369a1', // blue-700
    margin: 0,
  },
  headerSubtitle: {
    fontSize: '13px',
    color: '#0284c7', // blue-600
    margin: '2px 0 0 0',
  },
  expandIcon: {
    fontSize: '20px',
    color: '#0369a1',
    transition: 'transform 0.2s ease',
  },
  content: {
    padding: '20px',
  },
  tipsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  tipCard: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    overflow: 'hidden',
    cursor: 'pointer',
    border: '1px solid #bae6fd',
    transition: 'all 0.15s ease',
  },
  tipHeader: {
    width: '100%',
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    textAlign: 'left' as const,
  },
  tipTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1f2937',
    marginBottom: '4px',
  },
  tipDescription: {
    fontSize: '13px',
    color: '#6b7280',
  },
  tipExpandIcon: {
    fontSize: '16px',
    color: '#9ca3af',
    transition: 'transform 0.2s ease',
    flexShrink: 0,
  },
  tipContent: {
    padding: '0 16px 14px 16px',
    fontSize: '13px',
    color: '#374151',
    lineHeight: 1.6,
    borderTop: '1px solid #e5e7eb',
    paddingTop: '12px',
  },
  noTips: {
    fontSize: '13px',
    color: '#9ca3af',
    fontStyle: 'italic',
    textAlign: 'center' as const,
    padding: '20px',
  },
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get personalized header based on child name.
 */
function getHeaderTitle(childName?: string): string {
  if (childName && childName.trim().length > 0) {
    return `Tips for ${childName.trim()}`
  }
  return 'Tips for Talking with Your Parents'
}

/**
 * Get encouraging subheader text.
 */
function getSubheaderText(): string {
  return 'Learn how to share your thoughts and be heard'
}

// ============================================
// Component
// ============================================

export const NegotiationResourcesPanel = memo(function NegotiationResourcesPanel({
  ageTier,
  defaultExpanded = false,
  childName,
}: NegotiationResourcesPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [expandedTip, setExpandedTip] = useState<number | null>(null)

  // Get tips for the age tier
  const tips = getNegotiationTips(ageTier)

  const togglePanel = () => {
    setIsExpanded(!isExpanded)
  }

  const toggleTip = (index: number) => {
    setExpandedTip(expandedTip === index ? null : index)
  }

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      action()
    }
  }

  return (
    <div data-testid="negotiation-resources-panel" style={styles.container}>
      {/* Collapsible Header */}
      <div
        data-testid="panel-header"
        style={styles.header}
        onClick={togglePanel}
        onKeyDown={(e) => handleKeyDown(e, togglePanel)}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-controls="negotiation-tips-content"
      >
        <div style={styles.headerLeft}>
          <span style={styles.headerIcon}>💬</span>
          <div style={styles.headerText}>
            <h3 style={styles.headerTitle}>{getHeaderTitle(childName)}</h3>
            <p data-testid="panel-subheader" style={styles.headerSubtitle}>
              {getSubheaderText()}
            </p>
          </div>
        </div>
        <span
          style={{
            ...styles.expandIcon,
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          ▼
        </span>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <div id="negotiation-tips-content" data-testid="tips-container" style={styles.content}>
          {tips.length === 0 ? (
            <div data-testid="no-tips-message" style={styles.noTips}>
              No tips available yet
            </div>
          ) : (
            <div style={styles.tipsList}>
              {tips.map((tip, index) => (
                <div
                  key={tip.id}
                  data-testid={`tip-${index}`}
                  style={styles.tipCard}
                  onClick={() => toggleTip(index)}
                  onKeyDown={(e) => handleKeyDown(e, () => toggleTip(index))}
                  role="button"
                  tabIndex={0}
                  aria-expanded={expandedTip === index}
                >
                  <div style={styles.tipHeader}>
                    <div>
                      <div data-testid="tip-title" style={styles.tipTitle}>
                        {tip.title}
                      </div>
                      <div data-testid="tip-description" style={styles.tipDescription}>
                        {tip.shortDescription}
                      </div>
                    </div>
                    <span
                      style={{
                        ...styles.tipExpandIcon,
                        transform: expandedTip === index ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                    >
                      ▼
                    </span>
                  </div>

                  {expandedTip === index && (
                    <div data-testid={`tip-full-content-${index}`} style={styles.tipContent}>
                      {tip.fullContent}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
})
