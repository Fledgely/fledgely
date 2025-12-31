'use client'

/**
 * FrictionIndicatorsDashboard Component
 *
 * Story 27.5.4: Friction Indicators Dashboard
 *
 * Displays aggregated friction indicators for family health monitoring.
 * - AC1: Aggregated indicators (not specific responses)
 * - AC2: Relationship health indicator
 * - AC3: Trend line display
 * - AC4: Privacy protection (no private check-in content revealed)
 * - AC5: Bilateral transparency (same view for both parties)
 * - AC6: Conversation starter
 */

import React from 'react'

interface FrictionIndicators {
  relationshipHealth: 'mostly_positive' | 'stable' | 'some_concerns'
  relationshipHealthText: string
  trend: 'improving' | 'stable' | 'needs_attention'
  trendText: string
  conversationStarter: string | null
  hasEnoughData: boolean
  dataPointCount: number
}

interface FrictionIndicatorsDashboardProps {
  indicators: FrictionIndicators | null
  isLoading: boolean
  error: string | null
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    marginBottom: '24px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px',
  },
  icon: {
    fontSize: '24px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1a1a1a',
    margin: 0,
  },
  loadingState: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px',
    color: '#666',
  },
  errorState: {
    backgroundColor: '#fff5f5',
    padding: '16px',
    borderRadius: '8px',
    color: '#c53030',
    fontSize: '14px',
  },
  noDataState: {
    backgroundColor: '#f7fafc',
    padding: '20px',
    borderRadius: '8px',
    textAlign: 'center' as const,
    color: '#4a5568',
  },
  noDataIcon: {
    fontSize: '32px',
    marginBottom: '8px',
  },
  noDataText: {
    fontSize: '14px',
    margin: 0,
  },
  indicatorsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '16px',
  },
  indicatorCard: {
    padding: '16px',
    borderRadius: '8px',
    textAlign: 'center' as const,
  },
  indicatorLabel: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '8px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  indicatorValue: {
    fontSize: '18px',
    fontWeight: 600,
  },
  trendIcon: {
    marginRight: '6px',
  },
  conversationStarter: {
    backgroundColor: '#ebf8ff',
    padding: '16px',
    borderRadius: '8px',
    marginTop: '16px',
  },
  conversationIcon: {
    marginRight: '8px',
  },
  conversationText: {
    fontSize: '14px',
    color: '#2c5282',
    margin: 0,
    lineHeight: 1.5,
  },
}

function getHealthColor(health: string): string {
  switch (health) {
    case 'mostly_positive':
      return '#48bb78' // green
    case 'stable':
      return '#4299e1' // blue
    case 'some_concerns':
      return '#ed8936' // orange
    default:
      return '#718096'
  }
}

function getHealthBackground(health: string): string {
  switch (health) {
    case 'mostly_positive':
      return '#f0fff4'
    case 'stable':
      return '#ebf8ff'
    case 'some_concerns':
      return '#fffaf0'
    default:
      return '#f7fafc'
  }
}

function getTrendColor(trend: string): string {
  switch (trend) {
    case 'improving':
      return '#48bb78'
    case 'stable':
      return '#4299e1'
    case 'needs_attention':
      return '#ed8936'
    default:
      return '#718096'
  }
}

function getTrendBackground(trend: string): string {
  switch (trend) {
    case 'improving':
      return '#f0fff4'
    case 'stable':
      return '#ebf8ff'
    case 'needs_attention':
      return '#fffaf0'
    default:
      return '#f7fafc'
  }
}

function getTrendIcon(trend: string): string {
  switch (trend) {
    case 'improving':
      return '↗'
    case 'stable':
      return '→'
    case 'needs_attention':
      return '↘'
    default:
      return '→'
  }
}

export function FrictionIndicatorsDashboard({
  indicators,
  isLoading,
  error,
}: FrictionIndicatorsDashboardProps): React.ReactElement {
  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <span style={styles.icon}>💚</span>
          <h3 style={styles.title}>Family Health</h3>
        </div>
        <div style={styles.loadingState}>Loading indicators...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <span style={styles.icon}>💚</span>
          <h3 style={styles.title}>Family Health</h3>
        </div>
        <div style={styles.errorState}>{error}</div>
      </div>
    )
  }

  if (!indicators || !indicators.hasEnoughData) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <span style={styles.icon}>💚</span>
          <h3 style={styles.title}>Family Health</h3>
        </div>
        <div style={styles.noDataState}>
          <div style={styles.noDataIcon}>📊</div>
          <p style={styles.noDataText}>
            Not enough data yet. Complete check-ins and review flags to see indicators.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.icon}>💚</span>
        <h3 style={styles.title}>Family Health</h3>
      </div>

      <div style={styles.indicatorsGrid}>
        {/* Relationship Health Indicator */}
        <div
          style={{
            ...styles.indicatorCard,
            backgroundColor: getHealthBackground(indicators.relationshipHealth),
          }}
          data-testid="relationship-health-indicator"
        >
          <div style={styles.indicatorLabel}>Relationship Health</div>
          <div
            style={{
              ...styles.indicatorValue,
              color: getHealthColor(indicators.relationshipHealth),
            }}
          >
            {indicators.relationshipHealthText}
          </div>
        </div>

        {/* Trend Indicator */}
        <div
          style={{
            ...styles.indicatorCard,
            backgroundColor: getTrendBackground(indicators.trend),
          }}
          data-testid="trend-indicator"
        >
          <div style={styles.indicatorLabel}>Trend</div>
          <div
            style={{
              ...styles.indicatorValue,
              color: getTrendColor(indicators.trend),
            }}
          >
            <span style={styles.trendIcon}>{getTrendIcon(indicators.trend)}</span>
            {indicators.trendText}
          </div>
        </div>
      </div>

      {/* Conversation Starter */}
      {indicators.conversationStarter && (
        <div style={styles.conversationStarter} data-testid="conversation-starter">
          <p style={styles.conversationText}>
            <span style={styles.conversationIcon}>💬</span>
            {indicators.conversationStarter}
          </p>
        </div>
      )}
    </div>
  )
}
