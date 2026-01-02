/**
 * Graduation Conversation Service - Story 38.2 Task 2
 *
 * Service for managing graduation conversations.
 * FR38A: System initiates graduation conversation when child reaches eligibility.
 */

import {
  GraduationConversation,
  AcknowledgmentRecord,
  ConversationStatus,
  ConversationOutcome,
  CreateConversationInput,
  RecordAcknowledgmentInput,
  ScheduleConversationInput,
  CompleteConversationInput,
  createInitialConversation,
  hasAllAcknowledgments,
  isConversationExpired,
  isValidScheduleDate,
  getMissingAcknowledgments,
} from '../contracts/graduationConversation'

// ============================================
// In-memory stores (would be replaced with database)
// ============================================

const conversationStore: Map<string, GraduationConversation> = new Map()
const familyConversationIndex: Map<string, string[]> = new Map()
const childConversationIndex: Map<string, string[]> = new Map()

// ============================================
// Core Service Functions
// ============================================

/**
 * Generate unique ID for conversation.
 */
function generateConversationId(): string {
  return `grad-conv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Initiate a graduation conversation when eligibility is reached.
 * AC1: System detects when child reaches 12 consecutive months at 100% trust
 */
export function initiateGraduationConversation(
  input: CreateConversationInput
): GraduationConversation {
  // Check if there's already an active conversation for this child
  const existingConversations = getConversationsForChild(input.childId)
  const activeConversation = existingConversations.find(
    (conv) => conv.status !== 'completed' && conv.status !== 'expired'
  )

  if (activeConversation) {
    throw new Error(`Active graduation conversation already exists for child ${input.childId}`)
  }

  // Create new conversation
  const id = generateConversationId()
  const conversation = createInitialConversation(id, input)

  // Store conversation
  conversationStore.set(id, conversation)

  // Update indexes
  const familyConvs = familyConversationIndex.get(input.familyId) || []
  familyConvs.push(id)
  familyConversationIndex.set(input.familyId, familyConvs)

  const childConvs = childConversationIndex.get(input.childId) || []
  childConvs.push(id)
  childConversationIndex.set(input.childId, childConvs)

  return conversation
}

/**
 * Record acknowledgment from child or parent.
 * AC3: Both parties must acknowledge readiness for graduation conversation
 */
export function recordAcknowledgment(input: RecordAcknowledgmentInput): GraduationConversation {
  const conversation = conversationStore.get(input.conversationId)

  if (!conversation) {
    throw new Error(`Conversation not found: ${input.conversationId}`)
  }

  if (conversation.status !== 'pending') {
    throw new Error(`Cannot acknowledge conversation in status: ${conversation.status}`)
  }

  if (isConversationExpired(conversation)) {
    throw new Error('Conversation has expired')
  }

  // Create acknowledgment record
  const acknowledgment: AcknowledgmentRecord = {
    userId: input.userId,
    role: input.role,
    acknowledgedAt: new Date(),
    message: input.message,
  }

  // Update conversation based on role
  let updatedConversation: GraduationConversation

  if (input.role === 'child') {
    if (conversation.childAcknowledgment !== null) {
      throw new Error('Child has already acknowledged')
    }

    updatedConversation = {
      ...conversation,
      childAcknowledgment: acknowledgment,
    }
  } else {
    // Check if parent is in required list
    if (!conversation.requiredParentIds.includes(input.userId)) {
      throw new Error('User is not a required parent for this conversation')
    }

    // Check if already acknowledged
    const alreadyAcknowledged = conversation.parentAcknowledgments.some(
      (ack) => ack.userId === input.userId
    )
    if (alreadyAcknowledged) {
      throw new Error('Parent has already acknowledged')
    }

    updatedConversation = {
      ...conversation,
      parentAcknowledgments: [...conversation.parentAcknowledgments, acknowledgment],
    }
  }

  // Check if all have acknowledged
  if (hasAllAcknowledgments(updatedConversation)) {
    updatedConversation = {
      ...updatedConversation,
      status: 'acknowledged',
    }
  }

  // Store updated conversation
  conversationStore.set(input.conversationId, updatedConversation)

  return updatedConversation
}

/**
 * Check if all parties have acknowledged.
 */
export function checkAllAcknowledged(conversationId: string): boolean {
  const conversation = conversationStore.get(conversationId)

  if (!conversation) {
    throw new Error(`Conversation not found: ${conversationId}`)
  }

  return hasAllAcknowledgments(conversation)
}

/**
 * Schedule the graduation conversation.
 */
export function scheduleConversation(input: ScheduleConversationInput): GraduationConversation {
  const conversation = conversationStore.get(input.conversationId)

  if (!conversation) {
    throw new Error(`Conversation not found: ${input.conversationId}`)
  }

  if (conversation.status !== 'acknowledged') {
    throw new Error(
      `Cannot schedule conversation in status: ${conversation.status}. All parties must acknowledge first.`
    )
  }

  if (!isValidScheduleDate(input.scheduledDate)) {
    throw new Error('Scheduled date must be at least 1 day in the future')
  }

  const updatedConversation: GraduationConversation = {
    ...conversation,
    status: 'scheduled',
    scheduledDate: input.scheduledDate,
  }

  conversationStore.set(input.conversationId, updatedConversation)

  return updatedConversation
}

/**
 * Complete the conversation with outcome.
 */
export function completeConversation(input: CompleteConversationInput): GraduationConversation {
  const conversation = conversationStore.get(input.conversationId)

  if (!conversation) {
    throw new Error(`Conversation not found: ${input.conversationId}`)
  }

  if (conversation.status !== 'scheduled' && conversation.status !== 'acknowledged') {
    throw new Error(`Cannot complete conversation in status: ${conversation.status}`)
  }

  const updatedConversation: GraduationConversation = {
    ...conversation,
    status: 'completed',
    completedAt: new Date(),
    outcome: input.outcome,
  }

  conversationStore.set(input.conversationId, updatedConversation)

  return updatedConversation
}

/**
 * Mark conversation as expired.
 */
export function expireConversation(conversationId: string): GraduationConversation {
  const conversation = conversationStore.get(conversationId)

  if (!conversation) {
    throw new Error(`Conversation not found: ${conversationId}`)
  }

  if (conversation.status === 'completed') {
    throw new Error('Cannot expire a completed conversation')
  }

  const updatedConversation: GraduationConversation = {
    ...conversation,
    status: 'expired',
  }

  conversationStore.set(conversationId, updatedConversation)

  return updatedConversation
}

/**
 * Record that a reminder was sent.
 */
export function recordReminderSent(conversationId: string): GraduationConversation {
  const conversation = conversationStore.get(conversationId)

  if (!conversation) {
    throw new Error(`Conversation not found: ${conversationId}`)
  }

  const updatedConversation: GraduationConversation = {
    ...conversation,
    remindersSent: conversation.remindersSent + 1,
    lastReminderAt: new Date(),
  }

  conversationStore.set(conversationId, updatedConversation)

  return updatedConversation
}

// ============================================
// Query Functions
// ============================================

/**
 * Get a conversation by ID.
 */
export function getConversation(conversationId: string): GraduationConversation | null {
  return conversationStore.get(conversationId) || null
}

/**
 * Get all conversations for a family.
 */
export function getConversationsForFamily(familyId: string): GraduationConversation[] {
  const ids = familyConversationIndex.get(familyId) || []
  return ids
    .map((id) => conversationStore.get(id))
    .filter((conv): conv is GraduationConversation => conv !== undefined)
}

/**
 * Get all conversations for a child.
 */
export function getConversationsForChild(childId: string): GraduationConversation[] {
  const ids = childConversationIndex.get(childId) || []
  return ids
    .map((id) => conversationStore.get(id))
    .filter((conv): conv is GraduationConversation => conv !== undefined)
}

/**
 * Get pending conversations for a family.
 * AC6: Prevents indefinite monitoring of compliant teens
 */
export function getPendingConversations(familyId: string): GraduationConversation[] {
  return getConversationsForFamily(familyId).filter(
    (conv) => conv.status === 'pending' || conv.status === 'acknowledged'
  )
}

/**
 * Get active conversation for a child (if any).
 */
export function getActiveConversationForChild(childId: string): GraduationConversation | null {
  const conversations = getConversationsForChild(childId)
  return (
    conversations.find(
      (conv) =>
        conv.status === 'pending' || conv.status === 'acknowledged' || conv.status === 'scheduled'
    ) || null
  )
}

/**
 * Get conversations needing reminders.
 */
export function getConversationsNeedingReminders(): GraduationConversation[] {
  const allConversations = Array.from(conversationStore.values())

  return allConversations.filter((conv) => {
    if (conv.status !== 'pending') return false

    const now = new Date()
    const daysSinceInitiated = Math.floor(
      (now.getTime() - conv.initiatedAt.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Send reminders at 7, 14, 21 days
    const reminderDays = [7, 14, 21]
    const expectedReminders = reminderDays.filter((day) => daysSinceInitiated >= day).length

    return conv.remindersSent < expectedReminders
  })
}

/**
 * Get expired conversations that need to be marked.
 */
export function getExpiredConversations(): GraduationConversation[] {
  const allConversations = Array.from(conversationStore.values())

  return allConversations.filter(
    (conv) =>
      conv.status !== 'completed' && conv.status !== 'expired' && isConversationExpired(conv)
  )
}

/**
 * Check if user has acknowledged conversation.
 */
export function hasUserAcknowledged(
  conversationId: string,
  userId: string,
  role: 'child' | 'parent'
): boolean {
  const conversation = conversationStore.get(conversationId)

  if (!conversation) {
    return false
  }

  if (role === 'child') {
    return (
      conversation.childAcknowledgment !== null &&
      conversation.childAcknowledgment.userId === userId
    )
  }

  return conversation.parentAcknowledgments.some((ack) => ack.userId === userId)
}

/**
 * Get acknowledgment status for a conversation.
 */
export function getAcknowledgmentStatus(conversationId: string): {
  childAcknowledged: boolean
  parentsAcknowledged: { parentId: string; acknowledged: boolean }[]
  allAcknowledged: boolean
} {
  const conversation = conversationStore.get(conversationId)

  if (!conversation) {
    throw new Error(`Conversation not found: ${conversationId}`)
  }

  const { childMissing, missingParentIds } = getMissingAcknowledgments(conversation)

  const parentsAcknowledged = conversation.requiredParentIds.map((parentId) => ({
    parentId,
    acknowledged: !missingParentIds.includes(parentId),
  }))

  return {
    childAcknowledged: !childMissing,
    parentsAcknowledged,
    allAcknowledged: hasAllAcknowledgments(conversation),
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Clear all stored data (for testing).
 */
export function clearAllConversationData(): void {
  conversationStore.clear()
  familyConversationIndex.clear()
  childConversationIndex.clear()
}

/**
 * Get statistics for testing/debugging.
 */
export function getConversationStats(): {
  total: number
  byStatus: Record<ConversationStatus, number>
  byOutcome: Record<ConversationOutcome | 'none', number>
} {
  const allConversations = Array.from(conversationStore.values())

  const byStatus: Record<ConversationStatus, number> = {
    pending: 0,
    acknowledged: 0,
    scheduled: 0,
    completed: 0,
    expired: 0,
  }

  const byOutcome: Record<ConversationOutcome | 'none', number> = {
    graduated: 0,
    deferred: 0,
    declined: 0,
    none: 0,
  }

  for (const conv of allConversations) {
    byStatus[conv.status]++
    byOutcome[conv.outcome || 'none']++
  }

  return {
    total: allConversations.length,
    byStatus,
    byOutcome,
  }
}
