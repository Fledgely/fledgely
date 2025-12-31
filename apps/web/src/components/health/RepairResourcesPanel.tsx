'use client'

/**
 * RepairResourcesPanel Component
 *
 * Story 27.5.5: Repair Resources Surfacing
 *
 * Displays helpful resources when friction indicators show concern.
 * - AC1: Surfaces when friction indicators warrant
 * - AC2: Parent resources
 * - AC3: Child resources
 * - AC4: Joint resources
 * - AC5: Links to external trusted sources
 * - AC6: Optional therapist directory
 * - AC7: Non-intrusive (collapsible, dismissible)
 */

import React, { useState } from 'react'

/**
 * Resource item structure.
 */
interface Resource {
  title: string
  description: string
  url: string
  source: string
}

/**
 * Resource categories.
 */
type ResourceCategory = 'parent' | 'child' | 'joint'

/**
 * Resource data for each category.
 *
 * Story 27.5.5 - AC2, AC3, AC4, AC5
 */
const RESOURCES: Record<ResourceCategory, Resource[]> = {
  parent: [
    {
      title: 'How to Discuss Flags Without Shame',
      description: 'Tips for having supportive conversations about concerning content',
      url: 'https://www.commonsensemedia.org/articles/tough-conversations',
      source: 'Common Sense Media',
    },
    {
      title: 'Building Trust During Monitoring',
      description: 'Strategies for maintaining open communication while keeping kids safe',
      url: 'https://www.healthychildren.org/English/family-life/Media/Pages/How-to-Monitor-Your-Childs-Media-Use.aspx',
      source: 'American Academy of Pediatrics',
    },
    {
      title: 'Age-Appropriate Boundaries',
      description: 'Setting device boundaries that respect growing independence',
      url: 'https://www.commonsensemedia.org/articles/parent-guides',
      source: 'Common Sense Media',
    },
  ],
  child: [
    {
      title: 'How to Talk to Parents About Privacy',
      description: 'Ways to share how you feel about monitoring respectfully',
      url: 'https://kidshealth.org/en/teens/talk-to-parents.html',
      source: 'KidsHealth',
    },
    {
      title: 'Understanding Why Parents Monitor',
      description: 'Learn why parents use monitoring and how it shows they care',
      url: 'https://kidshealth.org/en/kids/parents-care.html',
      source: 'KidsHealth',
    },
    {
      title: 'Sharing Your Concerns',
      description: 'Tips for talking about things that bother you',
      url: 'https://kidshealth.org/en/teens/family-relationships.html',
      source: 'KidsHealth',
    },
  ],
  joint: [
    {
      title: 'Family Conversation Starters About Trust',
      description: 'Questions to help your family talk about monitoring together',
      url: 'https://www.commonsensemedia.org/articles/family-media-agreement',
      source: 'Common Sense Media',
    },
    {
      title: 'Creating a Device Agreement Together',
      description: 'How to make rules everyone can agree on',
      url: 'https://www.commonsensemedia.org/family-media-agreement',
      source: 'Common Sense Media',
    },
    {
      title: 'Setting Screen Time Boundaries as a Team',
      description: 'Work together to find the right balance',
      url: 'https://www.healthychildren.org/English/family-life/Media/Pages/Media-and-Young-Minds.aspx',
      source: 'American Academy of Pediatrics',
    },
  ],
}

/**
 * Therapist directory resource.
 * Story 27.5.5 - AC6
 */
const THERAPIST_RESOURCE: Resource = {
  title: 'Find a Family Therapist',
  description: 'Connect with a professional who specializes in family communication',
  url: 'https://www.psychologytoday.com/us/therapists/family',
  source: 'Psychology Today',
}

interface RepairResourcesPanelProps {
  /** Whether to show parent resources */
  showParentResources: boolean
  /** Whether to show child resources */
  showChildResources: boolean
  /** Whether to include therapist directory */
  includeTherapistDirectory?: boolean
  /** Callback when panel is dismissed */
  onDismiss?: () => void
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#fffbeb', // amber-50
    borderRadius: '12px',
    border: '1px solid #fcd34d', // amber-300
    marginBottom: '24px',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    backgroundColor: '#fef3c7', // amber-100
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
    color: '#92400e', // amber-800
    margin: 0,
  },
  headerSubtitle: {
    fontSize: '13px',
    color: '#a16207', // amber-700
    margin: '2px 0 0 0',
  },
  expandIcon: {
    fontSize: '20px',
    color: '#92400e',
    transition: 'transform 0.2s ease',
  },
  content: {
    padding: '20px',
  },
  section: {
    marginBottom: '20px',
  },
  sectionLast: {
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#78350f', // amber-900
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sectionIcon: {
    fontSize: '16px',
  },
  resourceList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  resourceCard: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '14px',
    border: '1px solid #fde68a', // amber-200
    textDecoration: 'none',
    display: 'block',
    transition: 'all 0.15s ease',
  },
  resourceTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1f2937',
    marginBottom: '4px',
  },
  resourceDescription: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '6px',
    lineHeight: 1.4,
  },
  resourceSource: {
    fontSize: '12px',
    color: '#9ca3af',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  externalIcon: {
    fontSize: '10px',
  },
  dismissButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: '#92400e',
    border: '1px solid #fcd34d',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    marginTop: '16px',
  },
  therapistSection: {
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid #fde68a',
  },
}

export function RepairResourcesPanel({
  showParentResources,
  showChildResources,
  includeTherapistDirectory = false,
  onDismiss,
}: RepairResourcesPanelProps): React.ReactElement | null {
  const [isExpanded, setIsExpanded] = useState(true)

  // Don't render if no resources to show
  if (!showParentResources && !showChildResources) {
    return null
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  const renderResourceList = (resources: Resource[]) => (
    <div style={styles.resourceList}>
      {resources.map((resource, index) => (
        <a
          key={index}
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.resourceCard}
          className="resource-card"
        >
          <div style={styles.resourceTitle}>{resource.title}</div>
          <div style={styles.resourceDescription}>{resource.description}</div>
          <div style={styles.resourceSource}>
            <span style={styles.externalIcon}>↗</span>
            {resource.source}
          </div>
        </a>
      ))}
    </div>
  )

  return (
    <div style={styles.container} data-testid="repair-resources-panel">
      <style>
        {`
          .resource-card:hover {
            border-color: #fbbf24 !important;
            box-shadow: 0 2px 4px rgba(251, 191, 36, 0.2);
          }
          .dismiss-button:hover {
            background-color: #fef3c7 !important;
          }
        `}
      </style>

      {/* Collapsible header */}
      <div
        style={styles.header}
        onClick={toggleExpanded}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggleExpanded()
          }
        }}
        aria-expanded={isExpanded}
        aria-controls="repair-resources-content"
      >
        <div style={styles.headerLeft}>
          <span style={styles.headerIcon}>💡</span>
          <div style={styles.headerText}>
            <h3 style={styles.headerTitle}>Helpful Resources</h3>
            <p style={styles.headerSubtitle}>Tips for improving family communication</p>
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

      {/* Collapsible content */}
      {isExpanded && (
        <div id="repair-resources-content" style={styles.content}>
          {/* Parent resources */}
          {showParentResources && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>
                <span style={styles.sectionIcon}>👤</span>
                For Parents
              </div>
              {renderResourceList(RESOURCES.parent)}
            </div>
          )}

          {/* Child resources */}
          {showChildResources && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>
                <span style={styles.sectionIcon}>🧒</span>
                For Kids & Teens
              </div>
              {renderResourceList(RESOURCES.child)}
            </div>
          )}

          {/* Joint resources */}
          <div
            style={showParentResources || showChildResources ? styles.section : styles.sectionLast}
          >
            <div style={styles.sectionTitle}>
              <span style={styles.sectionIcon}>👨‍👩‍👧</span>
              For the Whole Family
            </div>
            {renderResourceList(RESOURCES.joint)}
          </div>

          {/* Therapist directory (optional) */}
          {includeTherapistDirectory && (
            <div style={styles.therapistSection}>
              <div style={styles.sectionTitle}>
                <span style={styles.sectionIcon}>🩺</span>
                Professional Support
              </div>
              {renderResourceList([THERAPIST_RESOURCE])}
            </div>
          )}

          {/* Dismiss button */}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              style={styles.dismissButton}
              className="dismiss-button"
            >
              Hide Resources
            </button>
          )}
        </div>
      )}
    </div>
  )
}
