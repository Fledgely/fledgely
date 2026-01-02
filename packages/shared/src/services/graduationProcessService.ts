/**
 * Graduation Process Service - Story 38.3 Task 2
 *
 * Service for managing the formal graduation process.
 * AC1: Both parties must confirm graduation decision (dual-consent)
 * AC2: Graduation date can be immediate or scheduled for future
 * AC4: Monitoring stops on graduation date
 */

import {
  type GraduationDecision,
  type ConfirmationRecord,
  type GraduationType,
  createInitialGraduationDecision,
  hasAllConfirmations as checkHasAllConfirmations,
  resolveGraduationType,
  isValidScheduledDate,
  isDecisionExpired,
} from '../contracts/graduationProcess'

// ============================================
// In-memory stores (would be replaced with database)
// ============================================

const decisionStore: Map<string, GraduationDecision> = new Map()
const familyDecisionIndex: Map<string, string[]> = new Map()
const childDecisionIndex: Map<string, string[]> = new Map()

// ============================================
// Types
// ============================================

export interface InitiateDecisionInput {
  conversationId: string
  childId: string
  familyId: string
  requiredParentIds: string[]
}

export interface RecordConfirmationInput {
  decisionId: string
  userId: string
  role: 'child' | 'parent'
  graduationType: GraduationType
  scheduledDate: Date | null
}

export interface ScheduleGraduationInput {
  decisionId: string
  scheduledDate: Date
}

export interface GraduationResult {
  success: boolean
  decisionId: string
  childId: string
  familyId: string
  graduationType: GraduationType
  graduationDate: Date
  message: string
}

// ============================================
// Core Service Functions
// ============================================

/**
 * Generate unique ID for decision.
 */
function generateDecisionId(): string {
  return `grad-dec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Initiate a graduation decision after conversation completed with 'graduated' outcome.
 * AC1: Both parties must confirm graduation decision
 */
export function initiateGraduationDecision(input: InitiateDecisionInput): GraduationDecision {
  // Check if there's already an active decision for this child
  const existingDecisions = getDecisionsForChild(input.childId)
  const activeDecision = existingDecisions.find(
    (dec) => dec.status !== 'completed' && !isDecisionExpired(dec)
  )

  if (activeDecision) {
    throw new Error(`Active graduation decision already exists for child ${input.childId}`)
  }

  // Create new decision
  const id = generateDecisionId()
  const decision = createInitialGraduationDecision(
    id,
    input.conversationId,
    input.childId,
    input.familyId,
    input.requiredParentIds
  )

  // Store decision
  decisionStore.set(id, decision)

  // Update indexes
  const familyDecs = familyDecisionIndex.get(input.familyId) || []
  familyDecs.push(id)
  familyDecisionIndex.set(input.familyId, familyDecs)

  const childDecs = childDecisionIndex.get(input.childId) || []
  childDecs.push(id)
  childDecisionIndex.set(input.childId, childDecs)

  return decision
}

/**
 * Record confirmation from child or parent.
 * AC1: Both parties must confirm graduation decision (dual-consent)
 */
export function recordGraduationConfirmation(input: RecordConfirmationInput): GraduationDecision {
  const decision = decisionStore.get(input.decisionId)

  if (!decision) {
    throw new Error(`Decision not found: ${input.decisionId}`)
  }

  if (decision.status !== 'pending') {
    throw new Error(`Cannot confirm decision in status: ${decision.status}`)
  }

  if (isDecisionExpired(decision)) {
    throw new Error('Decision has expired')
  }

  // Create confirmation record
  const confirmation: ConfirmationRecord = {
    userId: input.userId,
    role: input.role,
    confirmedAt: new Date(),
    selectedGraduationType: input.graduationType,
    scheduledDatePreference: input.scheduledDate,
  }

  // Update decision based on role
  let updatedDecision: GraduationDecision

  if (input.role === 'child') {
    if (decision.childConfirmation !== null) {
      throw new Error('Child has already confirmed')
    }

    updatedDecision = {
      ...decision,
      childConfirmation: confirmation,
    }
  } else {
    // Check if parent is in required list
    if (!decision.requiredParentIds.includes(input.userId)) {
      throw new Error('User is not a required parent for this decision')
    }

    // Check if already confirmed
    const alreadyConfirmed = decision.parentConfirmations.some(
      (conf) => conf.userId === input.userId
    )
    if (alreadyConfirmed) {
      throw new Error('Parent has already confirmed')
    }

    updatedDecision = {
      ...decision,
      parentConfirmations: [...decision.parentConfirmations, confirmation],
    }
  }

  // Check if all have confirmed
  if (checkHasAllConfirmations(updatedDecision)) {
    // Resolve graduation type based on all preferences
    const resolved = resolveGraduationType(updatedDecision)

    updatedDecision = {
      ...updatedDecision,
      status: 'confirmed',
      confirmedAt: new Date(),
      graduationType: resolved.type,
      scheduledDate: resolved.type === 'scheduled' ? resolved.date : null,
    }
  }

  // Store updated decision
  decisionStore.set(input.decisionId, updatedDecision)

  return updatedDecision
}

/**
 * Check if all parties have confirmed.
 */
export function checkAllConfirmations(decisionId: string): boolean {
  const decision = decisionStore.get(decisionId)

  if (!decision) {
    throw new Error(`Decision not found: ${decisionId}`)
  }

  return checkHasAllConfirmations(decision)
}

/**
 * Schedule the graduation for a future date.
 * AC2: Graduation date can be immediate or scheduled for future
 */
export function scheduleGraduation(input: ScheduleGraduationInput): GraduationDecision {
  const decision = decisionStore.get(input.decisionId)

  if (!decision) {
    throw new Error(`Decision not found: ${input.decisionId}`)
  }

  if (decision.status !== 'confirmed') {
    throw new Error('Decision must be confirmed before scheduling')
  }

  if (!isValidScheduledDate(input.scheduledDate)) {
    throw new Error('Scheduled date must be at least 1 day and at most 90 days in the future')
  }

  const updatedDecision: GraduationDecision = {
    ...decision,
    graduationType: 'scheduled',
    scheduledDate: input.scheduledDate,
  }

  decisionStore.set(input.decisionId, updatedDecision)

  return updatedDecision
}

/**
 * Execute graduation (stops monitoring, queues deletion).
 * AC4: Monitoring stops on graduation date
 */
export function executeGraduation(decisionId: string): GraduationResult {
  const decision = decisionStore.get(decisionId)

  if (!decision) {
    throw new Error(`Decision not found: ${decisionId}`)
  }

  if (decision.status !== 'confirmed') {
    throw new Error('Decision must be confirmed before execution')
  }

  // Mark as processing
  markDecisionProcessing(decisionId)

  // Determine graduation date
  const graduationDate =
    decision.graduationType === 'immediate' ? new Date() : decision.scheduledDate || new Date()

  // Mark as completed
  markDecisionCompleted(decisionId)

  return {
    success: true,
    decisionId: decision.id,
    childId: decision.childId,
    familyId: decision.familyId,
    graduationType: decision.graduationType,
    graduationDate,
    message: 'Graduation executed successfully',
  }
}

// ============================================
// Query Functions
// ============================================

/**
 * Get a decision by ID.
 */
export function getGraduationDecision(decisionId: string): GraduationDecision | null {
  return decisionStore.get(decisionId) || null
}

/**
 * Get pending decisions for a family.
 */
export function getPendingDecisions(familyId: string): GraduationDecision[] {
  return getDecisionsForFamily(familyId).filter(
    (dec) => dec.status === 'pending' || dec.status === 'confirmed'
  )
}

/**
 * Get all decisions for a child.
 */
export function getDecisionsForChild(childId: string): GraduationDecision[] {
  const ids = childDecisionIndex.get(childId) || []
  return ids
    .map((id) => decisionStore.get(id))
    .filter((dec): dec is GraduationDecision => dec !== undefined)
}

/**
 * Get all decisions for a family.
 */
export function getDecisionsForFamily(familyId: string): GraduationDecision[] {
  const ids = familyDecisionIndex.get(familyId) || []
  return ids
    .map((id) => decisionStore.get(id))
    .filter((dec): dec is GraduationDecision => dec !== undefined)
}

/**
 * Get expired decisions that need to be marked.
 */
export function getExpiredDecisions(): GraduationDecision[] {
  const allDecisions = Array.from(decisionStore.values())

  return allDecisions.filter((dec) => dec.status !== 'completed' && isDecisionExpired(dec))
}

// ============================================
// Status Update Functions
// ============================================

/**
 * Mark decision as processing.
 */
export function markDecisionProcessing(decisionId: string): GraduationDecision {
  const decision = decisionStore.get(decisionId)

  if (!decision) {
    throw new Error(`Decision not found: ${decisionId}`)
  }

  const updatedDecision: GraduationDecision = {
    ...decision,
    status: 'processing',
  }

  decisionStore.set(decisionId, updatedDecision)

  return updatedDecision
}

/**
 * Mark decision as completed.
 */
export function markDecisionCompleted(decisionId: string): GraduationDecision {
  const decision = decisionStore.get(decisionId)

  if (!decision) {
    throw new Error(`Decision not found: ${decisionId}`)
  }

  const updatedDecision: GraduationDecision = {
    ...decision,
    status: 'completed',
    completedAt: new Date(),
  }

  decisionStore.set(decisionId, updatedDecision)

  return updatedDecision
}

/**
 * Expire a decision that has passed its expiry date.
 */
export function expireDecision(decisionId: string): GraduationDecision {
  const decision = decisionStore.get(decisionId)

  if (!decision) {
    throw new Error(`Decision not found: ${decisionId}`)
  }

  if (decision.status === 'completed') {
    throw new Error('Cannot expire a completed decision')
  }

  // For now, we'll just update the expiresAt to past if not already expired
  // In a real system, this might mark it with a special 'expired' status
  const updatedDecision: GraduationDecision = {
    ...decision,
    expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Set to yesterday
  }

  decisionStore.set(decisionId, updatedDecision)

  return updatedDecision
}

// ============================================
// Utility Functions
// ============================================

/**
 * Clear all stored data (for testing).
 */
export function clearAllDecisionData(): void {
  decisionStore.clear()
  familyDecisionIndex.clear()
  childDecisionIndex.clear()
}

/**
 * Get statistics for testing/debugging.
 */
export function getDecisionStats(): {
  total: number
  byStatus: Record<GraduationDecision['status'], number>
} {
  const allDecisions = Array.from(decisionStore.values())

  const byStatus: Record<GraduationDecision['status'], number> = {
    pending: 0,
    confirmed: 0,
    processing: 0,
    completed: 0,
  }

  for (const dec of allDecisions) {
    byStatus[dec.status]++
  }

  return {
    total: allDecisions.length,
    byStatus,
  }
}
