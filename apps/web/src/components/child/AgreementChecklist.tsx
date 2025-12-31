/**
 * AgreementChecklist Component - Story 19C.3
 *
 * A simple checklist showing key agreement points with expandable details.
 * Uses child-friendly language at 6th-grade reading level (NFR65).
 *
 * Task 1: Create AgreementChecklist component
 * Task 2: Display monitoring status items
 * Task 3: Display frequency and duration
 * Task 4: Implement expandable details
 */

import React, { useState } from 'react'
import { getTermExplanation } from '../../utils/childFriendlyLanguage'

/**
 * Inline styles using React.CSSProperties (NOT Tailwind per Epic 19B pattern)
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  header: {
    color: '#0ea5e9',
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    borderBottom: '1px solid #e0f2fe',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    borderRadius: '8px',
  },
  itemHover: {
    backgroundColor: '#f0f9ff',
  },
  indicator: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '12px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#ffffff',
    flexShrink: 0,
  },
  indicatorEnabled: {
    backgroundColor: '#22c55e', // Green for yes
  },
  indicatorDisabled: {
    backgroundColor: '#9ca3af', // Gray for no
  },
  indicatorInfo: {
    backgroundColor: '#0ea5e9', // Sky blue for info items
  },
  content: {
    flex: 1,
  },
  label: {
    color: '#334155',
    fontSize: '14px',
    fontWeight: 500,
  },
  value: {
    color: '#64748b',
    fontSize: '13px',
    marginTop: '2px',
  },
  expandIcon: {
    color: '#94a3b8',
    fontSize: '16px',
    marginLeft: '8px',
    transition: 'transform 0.2s',
  },
  expandIconOpen: {
    transform: 'rotate(180deg)',
  },
  details: {
    backgroundColor: '#f8fafc',
    padding: '12px',
    marginTop: '8px',
    marginBottom: '8px',
    marginLeft: '40px',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#475569',
    lineHeight: 1.5,
    animation: 'fadeIn 0.2s ease-out',
  },
}

interface AgreementChecklistProps {
  /** Whether screenshots are enabled */
  screenshotsEnabled: boolean
  /** Whether apps are tracked */
  appsTracked: boolean
  /** How often screenshots are captured */
  captureFrequency: string | null
  /** How long screenshots are kept */
  retentionPeriod: string | null
}

interface ChecklistItemData {
  id: string
  label: string
  value: string
  enabled?: boolean
  icon: string
  explanation: string
  type: 'boolean' | 'info'
}

export function AgreementChecklist({
  screenshotsEnabled,
  appsTracked,
  captureFrequency,
  retentionPeriod,
}: AgreementChecklistProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  // Build checklist items with child-friendly language
  const items: ChecklistItemData[] = [
    {
      id: 'screenshots',
      label: 'Pictures of your screen',
      value: screenshotsEnabled ? 'Yes' : 'No',
      enabled: screenshotsEnabled,
      icon: '📸',
      explanation:
        getTermExplanation('screenshots') ||
        "Your parent can see pictures of what's on your screen. This helps them keep you safe online.",
      type: 'boolean',
    },
    {
      id: 'apps',
      label: 'Apps being watched',
      value: appsTracked ? 'Yes' : 'No',
      enabled: appsTracked,
      icon: '🎮',
      explanation:
        'Your parent can see which apps you use and for how long. This helps them understand what you enjoy.',
      type: 'boolean',
    },
    {
      id: 'frequency',
      label: 'How often',
      value: captureFrequency ? captureFrequency.toLowerCase() : 'Not set',
      icon: '⏱️',
      explanation:
        getTermExplanation('capture interval') ||
        'This is how often a new picture of your screen is saved. More frequent means more pictures.',
      type: 'info',
    },
    {
      id: 'duration',
      label: 'How long kept',
      value: retentionPeriod ? retentionPeriod.toLowerCase() : 'Not set',
      icon: '📅',
      explanation:
        getTermExplanation('retention') ||
        'After this time, the pictures are deleted forever. Your parent chose this time together with you.',
      type: 'info',
    },
  ]

  const toggleItem = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggleItem(id)
    }
  }

  const getIndicatorStyle = (item: ChecklistItemData): React.CSSProperties => {
    if (item.type === 'info') {
      return { ...styles.indicator, ...styles.indicatorInfo }
    }
    return {
      ...styles.indicator,
      ...(item.enabled ? styles.indicatorEnabled : styles.indicatorDisabled),
    }
  }

  const getIndicatorIcon = (item: ChecklistItemData): string => {
    if (item.type === 'info') {
      return item.icon
    }
    return item.enabled ? '✓' : '✗'
  }

  return (
    <div style={styles.container} data-testid="agreement-checklist">
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-4px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>

      <h2 style={styles.header}>
        <span>📋</span> Quick Summary
      </h2>

      {items.map((item) => {
        const isExpanded = expandedItems.has(item.id)

        return (
          <div key={item.id}>
            <div
              role="button"
              tabIndex={0}
              aria-expanded={isExpanded}
              style={styles.item}
              onClick={() => toggleItem(item.id)}
              onKeyDown={(e) => handleKeyDown(e, item.id)}
              data-testid={`checklist-item-${item.id}`}
            >
              <div style={getIndicatorStyle(item)} data-testid={`checklist-indicator-${item.id}`}>
                {getIndicatorIcon(item)}
              </div>

              <div style={styles.content}>
                <div style={styles.label}>{item.label}</div>
                <div style={styles.value}>{item.value}</div>
              </div>

              <span style={{ ...styles.expandIcon, ...(isExpanded ? styles.expandIconOpen : {}) }}>
                ▼
              </span>
            </div>

            {isExpanded && (
              <div style={styles.details} data-testid={`checklist-item-${item.id}-details`}>
                {item.explanation}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
