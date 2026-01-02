/**
 * Confirmation Analytics Service - Story 7.5.3 Task 8
 *
 * Service for confirmation analytics tracking and reporting.
 * AC7: Analytics for continuous improvement (anonymized)
 *
 * CRITICAL: All analytics must be anonymized - no PII.
 * This data is used to improve crisis resources and content.
 */

// ============================================
// Types
// ============================================

export type AnalyticsEventType =
  | 'confirmation_displayed'
  | 'resource_clicked'
  | 'chat_initiated'
  | 'confirmation_dismissed'

export type AgeGroup = 'young_child' | 'middle_child' | 'teen'
export type ResourceType = 'phone' | 'chat' | 'website' | 'text'

export interface ConfirmationAnalyticsEvent {
  eventType: AnalyticsEventType
  timestamp: number
  jurisdiction?: string
  ageGroup?: AgeGroup
  resourceId?: string
  resourceType?: ResourceType
  viewDurationMs?: number
}

export interface ResourceClickStats {
  [resourceId: string]: number
}

export interface DisplayStats {
  total: number
  byJurisdiction: Record<string, number>
  byAgeGroup: Record<string, number>
}

export interface AnalyticsReport {
  displayCount: number
  resourceClickCount: number
  chatInitiatedCount: number
  startTime: number
  endTime: number
  clicksByResourceType: Record<string, number>
}

export interface JurisdictionReport extends AnalyticsReport {
  jurisdiction: string
}

// ============================================
// In-Memory Analytics Store
// ============================================

let analyticsEvents: ConfirmationAnalyticsEvent[] = []

// ============================================
// Tracking Functions
// ============================================

/**
 * Track confirmation display event.
 *
 * CRITICAL: No PII is collected - only aggregate data.
 *
 * @param jurisdiction - Jurisdiction code
 * @param ageGroup - Age group of the child
 */
export function trackConfirmationDisplayed(jurisdiction: string, ageGroup: AgeGroup): void {
  analyticsEvents.push({
    eventType: 'confirmation_displayed',
    timestamp: Date.now(),
    jurisdiction,
    ageGroup,
  })
}

/**
 * Track resource click event.
 *
 * @param resourceId - ID of the clicked resource
 * @param resourceType - Type of resource
 * @param jurisdiction - Jurisdiction code
 */
export function trackResourceClicked(
  resourceId: string,
  resourceType: ResourceType,
  jurisdiction: string
): void {
  analyticsEvents.push({
    eventType: 'resource_clicked',
    timestamp: Date.now(),
    resourceId,
    resourceType,
    jurisdiction,
  })
}

/**
 * Track chat initiation event.
 *
 * @param resourceId - ID of the chat resource
 * @param jurisdiction - Jurisdiction code
 */
export function trackChatInitiated(resourceId: string, jurisdiction: string): void {
  analyticsEvents.push({
    eventType: 'chat_initiated',
    timestamp: Date.now(),
    resourceId,
    jurisdiction,
  })
}

/**
 * Track confirmation dismissal event.
 *
 * @param jurisdiction - Jurisdiction code
 * @param viewDurationMs - How long the confirmation was viewed
 */
export function trackConfirmationDismissed(jurisdiction: string, viewDurationMs: number): void {
  analyticsEvents.push({
    eventType: 'confirmation_dismissed',
    timestamp: Date.now(),
    jurisdiction,
    viewDurationMs,
  })
}

// ============================================
// Analytics Retrieval Functions
// ============================================

/**
 * Get analytics data with optional filters.
 *
 * @param eventType - Optional event type filter
 * @param jurisdiction - Optional jurisdiction filter
 * @returns Filtered analytics events
 */
export function getAnalyticsData(
  eventType?: AnalyticsEventType,
  jurisdiction?: string
): ConfirmationAnalyticsEvent[] {
  let filtered = [...analyticsEvents]

  if (eventType) {
    filtered = filtered.filter((e) => e.eventType === eventType)
  }

  if (jurisdiction) {
    filtered = filtered.filter((e) => e.jurisdiction === jurisdiction)
  }

  return filtered
}

/**
 * Get click counts by resource ID.
 *
 * @returns Object mapping resource IDs to click counts
 */
export function getResourceClickStats(): ResourceClickStats {
  const stats: ResourceClickStats = {}

  for (const event of analyticsEvents) {
    if (event.eventType === 'resource_clicked' && event.resourceId) {
      stats[event.resourceId] = (stats[event.resourceId] || 0) + 1
    }
  }

  return stats
}

/**
 * Get display statistics.
 *
 * @returns Display stats by jurisdiction and age group
 */
export function getDisplayStats(): DisplayStats {
  const stats: DisplayStats = {
    total: 0,
    byJurisdiction: {},
    byAgeGroup: {},
  }

  for (const event of analyticsEvents) {
    if (event.eventType === 'confirmation_displayed') {
      stats.total++

      if (event.jurisdiction) {
        stats.byJurisdiction[event.jurisdiction] =
          (stats.byJurisdiction[event.jurisdiction] || 0) + 1
      }

      if (event.ageGroup) {
        stats.byAgeGroup[event.ageGroup] = (stats.byAgeGroup[event.ageGroup] || 0) + 1
      }
    }
  }

  return stats
}

// ============================================
// Reporting Functions
// ============================================

/**
 * Generate anonymous analytics report.
 *
 * CRITICAL: Report contains only aggregate data, no PII.
 *
 * @returns Anonymous analytics report
 */
export function generateAnonymousReport(): AnalyticsReport {
  const displayEvents = analyticsEvents.filter((e) => e.eventType === 'confirmation_displayed')
  const clickEvents = analyticsEvents.filter((e) => e.eventType === 'resource_clicked')
  const chatEvents = analyticsEvents.filter((e) => e.eventType === 'chat_initiated')

  const clicksByResourceType: Record<string, number> = {}
  for (const event of clickEvents) {
    if (event.resourceType) {
      clicksByResourceType[event.resourceType] = (clicksByResourceType[event.resourceType] || 0) + 1
    }
  }

  const allEvents = analyticsEvents
  const startTime = allEvents.length > 0 ? Math.min(...allEvents.map((e) => e.timestamp)) : 0
  const endTime = allEvents.length > 0 ? Math.max(...allEvents.map((e) => e.timestamp)) : 0

  return {
    displayCount: displayEvents.length,
    resourceClickCount: clickEvents.length,
    chatInitiatedCount: chatEvents.length,
    startTime,
    endTime,
    clicksByResourceType,
  }
}

/**
 * Generate jurisdiction-specific analytics report.
 *
 * @param jurisdiction - Jurisdiction to report on
 * @returns Jurisdiction-specific analytics report
 */
export function generateJurisdictionReport(jurisdiction: string): JurisdictionReport {
  const jurisdictionEvents = analyticsEvents.filter((e) => e.jurisdiction === jurisdiction)

  const displayEvents = jurisdictionEvents.filter((e) => e.eventType === 'confirmation_displayed')
  const clickEvents = jurisdictionEvents.filter((e) => e.eventType === 'resource_clicked')
  const chatEvents = jurisdictionEvents.filter((e) => e.eventType === 'chat_initiated')

  const clicksByResourceType: Record<string, number> = {}
  for (const event of clickEvents) {
    if (event.resourceType) {
      clicksByResourceType[event.resourceType] = (clicksByResourceType[event.resourceType] || 0) + 1
    }
  }

  const startTime =
    jurisdictionEvents.length > 0 ? Math.min(...jurisdictionEvents.map((e) => e.timestamp)) : 0
  const endTime =
    jurisdictionEvents.length > 0 ? Math.max(...jurisdictionEvents.map((e) => e.timestamp)) : 0

  return {
    jurisdiction,
    displayCount: displayEvents.length,
    resourceClickCount: clickEvents.length,
    chatInitiatedCount: chatEvents.length,
    startTime,
    endTime,
    clicksByResourceType,
  }
}

// ============================================
// Analytics Management Functions
// ============================================

/**
 * Clear all analytics data.
 */
export function clearAnalyticsData(): void {
  analyticsEvents = []
}

/**
 * Get total analytics event count.
 *
 * @returns Number of tracked events
 */
export function getAnalyticsCount(): number {
  return analyticsEvents.length
}
