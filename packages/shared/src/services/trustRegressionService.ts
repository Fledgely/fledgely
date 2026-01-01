/**
 * Trust Regression Service - Story 37.6 Task 2
 *
 * Service for managing trust regression events.
 * Key principles:
 * - 2-week grace period before any monitoring changes (AC1)
 * - Conversation-first approach (AC3)
 * - Parent-child discussion encouraged (AC4)
 * - Child can explain circumstances (AC5)
 */

import { v4 as uuidv4 } from 'uuid'
import {
  RegressionEvent,
  RegressionStatus,
  TrustRegressionConfig,
  DEFAULT_REGRESSION_CONFIG,
  createRegressionEvent as createEvent,
  calculateGraceDaysRemaining,
  isInGracePeriod as checkGracePeriod,
  isConversationRequired as checkConversationRequired,
  validateRegression,
} from '../contracts/trustRegression'
import { MilestoneType } from '../contracts/developmentalMessaging'

// In-memory store for regression events (would be replaced with actual database)
const regressionEvents: Map<string, RegressionEvent> = new Map()
const childEvents: Map<string, string> = new Map() // childId -> eventId

/**
 * Create a new regression event with 2-week grace period.
 * AC1: 2-week grace period before monitoring increases
 * AC3: Conversation-first approach, not automatic punishment
 */
export function createRegressionEvent(
  childId: string,
  previousMilestone: MilestoneType,
  currentMilestone: MilestoneType,
  config: TrustRegressionConfig = DEFAULT_REGRESSION_CONFIG
): RegressionEvent {
  // Validate that this is actually a regression
  if (!validateRegression(previousMilestone, currentMilestone)) {
    throw new Error(
      `Invalid regression: ${previousMilestone} -> ${currentMilestone} is not a valid regression`
    )
  }

  const eventId = uuidv4()
  const event = createEvent({
    id: eventId,
    childId,
    previousMilestone,
    currentMilestone,
    gracePeriodDays: config.gracePeriodDays,
  })

  // Store the event
  regressionEvents.set(eventId, event)
  childEvents.set(childId, eventId)

  return event
}

/**
 * Get regression event by ID.
 */
export function getRegressionEventById(eventId: string): RegressionEvent | null {
  return regressionEvents.get(eventId) || null
}

/**
 * Get active regression status for a child.
 */
export function getRegressionStatus(childId: string): RegressionEvent | null {
  const eventId = childEvents.get(childId)
  if (!eventId) return null

  const event = regressionEvents.get(eventId)
  if (!event) return null

  // Return only if not resolved/reverted
  if (event.status === 'resolved' || event.status === 'reverted') {
    return null
  }

  return event
}

/**
 * Check if a child is currently in grace period.
 */
export function isInGracePeriod(childId: string): boolean {
  const event = getRegressionStatus(childId)
  if (!event) return false
  return checkGracePeriod(event)
}

/**
 * Check if conversation is required before any monitoring changes.
 * AC3: Conversation-first approach
 */
export function isConversationRequired(childId: string): boolean {
  const event = getRegressionStatus(childId)
  if (!event) return false
  return checkConversationRequired(event)
}

/**
 * Get days remaining in grace period.
 */
export function getGraceDaysRemaining(childId: string): number {
  const event = getRegressionStatus(childId)
  if (!event) return 0
  return calculateGraceDaysRemaining(event)
}

/**
 * Record child's explanation of circumstances.
 * AC5: Child can explain circumstances
 */
export function recordChildExplanation(eventId: string, explanation: string): RegressionEvent {
  const event = regressionEvents.get(eventId)
  if (!event) {
    throw new Error(`Regression event not found: ${eventId}`)
  }

  if (event.status === 'resolved' || event.status === 'reverted') {
    throw new Error('Cannot add explanation to resolved/reverted event')
  }

  const updatedEvent: RegressionEvent = {
    ...event,
    childExplanation: explanation,
    updatedAt: new Date(),
  }

  regressionEvents.set(eventId, updatedEvent)
  return updatedEvent
}

/**
 * Mark that parent-child conversation has occurred.
 * AC3: Conversation-first approach
 * AC4: Parent-child discussion encouraged before changes
 */
export function markConversationHeld(eventId: string, parentNotes?: string): RegressionEvent {
  const event = regressionEvents.get(eventId)
  if (!event) {
    throw new Error(`Regression event not found: ${eventId}`)
  }

  if (event.status === 'resolved' || event.status === 'reverted') {
    throw new Error('Cannot mark conversation on resolved/reverted event')
  }

  const now = new Date()
  const newStatus: RegressionStatus =
    event.status === 'grace_period' ? 'awaiting_conversation' : event.status

  const updatedEvent: RegressionEvent = {
    ...event,
    conversationHeld: true,
    conversationHeldAt: now,
    parentNotes: parentNotes || event.parentNotes,
    status: newStatus,
    updatedAt: now,
  }

  regressionEvents.set(eventId, updatedEvent)
  return updatedEvent
}

/**
 * Resolve regression - decide to keep current monitoring level.
 * Can only be done after conversation is held.
 */
export function resolveRegression(eventId: string): RegressionEvent {
  const event = regressionEvents.get(eventId)
  if (!event) {
    throw new Error(`Regression event not found: ${eventId}`)
  }

  if (event.status === 'resolved' || event.status === 'reverted') {
    throw new Error('Event is already resolved or reverted')
  }

  if (!event.conversationHeld) {
    throw new Error('Conversation must be held before resolving regression')
  }

  const updatedEvent: RegressionEvent = {
    ...event,
    status: 'resolved',
    updatedAt: new Date(),
  }

  regressionEvents.set(eventId, updatedEvent)
  // Remove from active events
  childEvents.delete(event.childId)

  return updatedEvent
}

/**
 * Revert monitoring - return to previous monitoring level.
 * Can only be done after conversation is held (never automatic).
 * AC3: Not automatic punishment
 */
export function revertMonitoring(eventId: string): RegressionEvent {
  const event = regressionEvents.get(eventId)
  if (!event) {
    throw new Error(`Regression event not found: ${eventId}`)
  }

  if (event.status === 'resolved' || event.status === 'reverted') {
    throw new Error('Event is already resolved or reverted')
  }

  if (!event.conversationHeld) {
    throw new Error('Conversation must be held before reverting monitoring')
  }

  const updatedEvent: RegressionEvent = {
    ...event,
    status: 'reverted',
    updatedAt: new Date(),
  }

  regressionEvents.set(eventId, updatedEvent)
  // Remove from active events
  childEvents.delete(event.childId)

  return updatedEvent
}

/**
 * Update event status based on grace period expiry.
 * Called when checking status after time has passed.
 */
export function updateEventStatus(eventId: string): RegressionEvent | null {
  const event = regressionEvents.get(eventId)
  if (!event) return null

  // If in grace period and grace has expired, move to awaiting_conversation
  if (event.status === 'grace_period') {
    if (calculateGraceDaysRemaining(event) === 0) {
      const updatedEvent: RegressionEvent = {
        ...event,
        status: 'awaiting_conversation',
        updatedAt: new Date(),
      }
      regressionEvents.set(eventId, updatedEvent)
      return updatedEvent
    }
  }

  return event
}

/**
 * Check if monitoring can be changed (grace period over + conversation held).
 */
export function canChangeMonitoring(childId: string): boolean {
  const event = getRegressionStatus(childId)
  if (!event) return true // No active regression

  // Cannot change during grace period
  if (checkGracePeriod(event)) return false

  // Cannot change without conversation
  if (!event.conversationHeld) return false

  return true
}

/**
 * Get summary of regression state for display.
 */
export function getRegressionSummary(childId: string): {
  hasActiveRegression: boolean
  isInGracePeriod: boolean
  daysRemaining: number
  conversationHeld: boolean
  childExplained: boolean
  status: RegressionStatus | null
} {
  const event = getRegressionStatus(childId)

  if (!event) {
    return {
      hasActiveRegression: false,
      isInGracePeriod: false,
      daysRemaining: 0,
      conversationHeld: false,
      childExplained: false,
      status: null,
    }
  }

  return {
    hasActiveRegression: true,
    isInGracePeriod: checkGracePeriod(event),
    daysRemaining: calculateGraceDaysRemaining(event),
    conversationHeld: event.conversationHeld,
    childExplained: !!event.childExplanation,
    status: event.status,
  }
}

/**
 * Clear all regression events (for testing).
 */
export function clearAllEvents(): void {
  regressionEvents.clear()
  childEvents.clear()
}

/**
 * Get all events for a child (including resolved).
 */
export function getAllEventsForChild(childId: string): RegressionEvent[] {
  const events: RegressionEvent[] = []
  regressionEvents.forEach((event) => {
    if (event.childId === childId) {
      events.push(event)
    }
  })
  return events.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
}
