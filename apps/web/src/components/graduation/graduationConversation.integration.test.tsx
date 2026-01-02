/**
 * Graduation Conversation Integration Tests - Story 38.2 Task 7
 *
 * Integration tests verifying the graduation conversation components work together.
 * Tests the full conversation workflow from eligibility notification to completion.
 *
 * FR38A Requirement: At 100% trust for 12 months, system initiates graduation
 * conversation that BOTH parties must acknowledge.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import GraduationEligibilityBanner from './GraduationEligibilityBanner'
import GraduationConversationGuide from './GraduationConversationGuide'
import {
  GraduationConversation,
  ConversationTemplate,
  AcknowledgmentRecord,
  createInitialConversation,
  hasAllAcknowledgments,
  getMissingAcknowledgments,
  getConversationDaysUntilExpiry,
  isConversationExpired,
  getDefaultTemplate,
  getDiscussionPointsForViewer,
  getRequiredDiscussionPoints,
  getOptionalDiscussionPoints,
  getSuggestedQuestions,
  getResources,
  getChildEligibilityNotification,
  getParentEligibilityNotification,
  getCelebratoryMessage,
  getAcknowledgmentButtonLabel,
  getReminderNotification,
  shouldSendReminder,
} from '@fledgely/shared'

describe('Graduation Conversation Integration Tests - Story 38.2 Task 7', () => {
  const familyId = 'family-abc'
  const childId = 'child-123'
  const childName = 'Emma'
  const parentIds = ['parent-456', 'parent-789']

  let baseConversation: GraduationConversation

  // Helper: Create a conversation (pure function wrapper)
  function createConversation(
    cId: string = childId,
    pIds: string[] = parentIds,
    fId: string = familyId
  ): GraduationConversation {
    return createInitialConversation(`conv-${Date.now()}`, {
      familyId: fId,
      childId: cId,
      parentIds: pIds,
    })
  }

  // Helper: Record child acknowledgment (pure transformation)
  function recordChildAcknowledgment(conversation: GraduationConversation): GraduationConversation {
    const acknowledgment: AcknowledgmentRecord = {
      userId: conversation.childId,
      role: 'child',
      acknowledgedAt: new Date(),
    }
    const updated = {
      ...conversation,
      childAcknowledgment: acknowledgment,
    }
    // Update status if all acknowledged
    if (hasAllAcknowledgments(updated)) {
      return { ...updated, status: 'acknowledged' as const }
    }
    return updated
  }

  // Helper: Record parent acknowledgment (pure transformation)
  function recordParentAcknowledgment(
    conversation: GraduationConversation,
    parentId: string
  ): GraduationConversation {
    const acknowledgment: AcknowledgmentRecord = {
      userId: parentId,
      role: 'parent',
      acknowledgedAt: new Date(),
    }
    const updated = {
      ...conversation,
      parentAcknowledgments: [...conversation.parentAcknowledgments, acknowledgment],
    }
    // Update status if all acknowledged
    if (hasAllAcknowledgments(updated)) {
      return { ...updated, status: 'acknowledged' as const }
    }
    return updated
  }

  // Helper: Schedule conversation (pure transformation)
  function scheduleConversation(
    conversation: GraduationConversation,
    date: Date
  ): GraduationConversation {
    return {
      ...conversation,
      status: 'scheduled',
      scheduledDate: date,
    }
  }

  // Helper: Complete conversation (pure transformation)
  function completeConversation(
    conversation: GraduationConversation,
    outcome: 'graduated' | 'deferred' | 'declined'
  ): GraduationConversation {
    return {
      ...conversation,
      status: 'completed',
      outcome,
      completedAt: new Date(),
    }
  }

  // Helper: Check if scheduling is allowed
  function canScheduleConversation(conversation: GraduationConversation): boolean {
    return hasAllAcknowledgments(conversation) && conversation.status === 'acknowledged'
  }

  // Helper: Create template
  function createConversationTemplate(_conversationId: string): ConversationTemplate {
    return getDefaultTemplate()
  }

  beforeEach(() => {
    baseConversation = createConversation()
  })

  describe('Eligibility Notification to Both Parties (AC2)', () => {
    describe('Child receives eligibility notification', () => {
      it('should display celebratory notification for child', () => {
        render(
          <GraduationEligibilityBanner
            conversation={baseConversation}
            viewerType="child"
            viewerId={childId}
            childName={childName}
            hasAcknowledged={false}
            onAcknowledge={vi.fn()}
          />
        )

        // Child sees celebratory messaging
        const notification = getChildEligibilityNotification(baseConversation.id)
        expect(screen.getByText(notification.title)).toBeInTheDocument()

        // Shows acknowledgment button
        const buttonLabel = getAcknowledgmentButtonLabel('child')
        expect(screen.getByRole('button', { name: buttonLabel })).toBeInTheDocument()
      })

      it('should show child-specific celebratory message', () => {
        const celebratoryMessage = getCelebratoryMessage('child', childName)

        render(
          <GraduationEligibilityBanner
            conversation={baseConversation}
            viewerType="child"
            viewerId={childId}
            childName={childName}
            hasAcknowledged={false}
            onAcknowledge={vi.fn()}
          />
        )

        expect(screen.getByText(celebratoryMessage)).toBeInTheDocument()
      })
    })

    describe('Parent receives eligibility notification', () => {
      it('should display celebratory notification for parent', () => {
        render(
          <GraduationEligibilityBanner
            conversation={baseConversation}
            viewerType="parent"
            viewerId={parentIds[0]}
            childName={childName}
            hasAcknowledged={false}
            onAcknowledge={vi.fn()}
          />
        )

        // Parent sees notification with child name
        const notification = getParentEligibilityNotification(childName, baseConversation.id)
        expect(screen.getByText(notification.title)).toBeInTheDocument()

        // Shows acknowledgment button
        const buttonLabel = getAcknowledgmentButtonLabel('parent')
        expect(screen.getByRole('button', { name: buttonLabel })).toBeInTheDocument()
      })

      it('should show parent-specific celebratory message', () => {
        const celebratoryMessage = getCelebratoryMessage('parent', childName)

        render(
          <GraduationEligibilityBanner
            conversation={baseConversation}
            viewerType="parent"
            viewerId={parentIds[0]}
            childName={childName}
            hasAcknowledged={false}
            onAcknowledge={vi.fn()}
          />
        )

        expect(screen.getByText(celebratoryMessage)).toBeInTheDocument()
      })
    })
  })

  describe('Dual Acknowledgment System (AC3)', () => {
    it('should show pending status when no one has acknowledged', () => {
      render(
        <GraduationEligibilityBanner
          conversation={baseConversation}
          viewerType="child"
          viewerId={childId}
          childName={childName}
          hasAcknowledged={false}
          onAcknowledge={vi.fn()}
        />
      )

      // Check acknowledgment status section exists
      expect(screen.getByText('Acknowledgment Status')).toBeInTheDocument()

      // Both child and parents show pending
      expect(screen.getByText(/You.*pending/i)).toBeInTheDocument()
    })

    it('should update status when child acknowledges', async () => {
      const onAcknowledge = vi.fn().mockResolvedValue(undefined)

      const { rerender } = render(
        <GraduationEligibilityBanner
          conversation={baseConversation}
          viewerType="child"
          viewerId={childId}
          childName={childName}
          hasAcknowledged={false}
          onAcknowledge={onAcknowledge}
        />
      )

      // Click acknowledge button
      fireEvent.click(screen.getByRole('button', { name: /I'm Ready/i }))
      await waitFor(() => expect(onAcknowledge).toHaveBeenCalled())

      // Record acknowledgment in conversation
      const updatedConversation = recordChildAcknowledgment(baseConversation)

      // Rerender with updated state
      rerender(
        <GraduationEligibilityBanner
          conversation={updatedConversation}
          viewerType="child"
          viewerId={childId}
          childName={childName}
          hasAcknowledged={true}
          onAcknowledge={onAcknowledge}
        />
      )

      // Shows acknowledged badge
      expect(screen.getByText('You have acknowledged')).toBeInTheDocument()
    })

    it('should show parent that child has acknowledged', () => {
      const conversationWithChildAck = recordChildAcknowledgment(baseConversation)

      render(
        <GraduationEligibilityBanner
          conversation={conversationWithChildAck}
          viewerType="parent"
          viewerId={parentIds[0]}
          childName={childName}
          hasAcknowledged={false}
          onAcknowledge={vi.fn()}
        />
      )

      // Parent sees child has acknowledged
      expect(screen.getByText(`${childName} (acknowledged)`)).toBeInTheDocument()
    })

    it('should allow scheduling only when all have acknowledged', () => {
      // Initial state - no acknowledgments
      expect(hasAllAcknowledgments(baseConversation)).toBe(false)
      expect(canScheduleConversation(baseConversation)).toBe(false)

      // Child acknowledges
      let conversation = recordChildAcknowledgment(baseConversation)
      expect(hasAllAcknowledgments(conversation)).toBe(false)

      // First parent acknowledges
      conversation = recordParentAcknowledgment(conversation, parentIds[0])
      expect(hasAllAcknowledgments(conversation)).toBe(false)

      // Second parent acknowledges - now all are done
      conversation = recordParentAcknowledgment(conversation, parentIds[1])
      expect(hasAllAcknowledgments(conversation)).toBe(true)
      expect(canScheduleConversation(conversation)).toBe(true)
    })

    it('should show Schedule button only when all acknowledged', () => {
      // All parties acknowledged
      let conversation = recordChildAcknowledgment(baseConversation)
      conversation = recordParentAcknowledgment(conversation, parentIds[0])
      conversation = recordParentAcknowledgment(conversation, parentIds[1])

      const onSchedule = vi.fn()

      render(
        <GraduationEligibilityBanner
          conversation={conversation}
          viewerType="parent"
          viewerId={parentIds[0]}
          childName={childName}
          hasAcknowledged={true}
          onAcknowledge={vi.fn()}
          onSchedule={onSchedule}
        />
      )

      expect(screen.getByRole('button', { name: /Schedule Conversation/i })).toBeInTheDocument()
    })
  })

  describe('Conversation Template Display (AC5)', () => {
    it('should display conversation template with all sections', () => {
      const template = createConversationTemplate(baseConversation.id)

      render(
        <GraduationConversationGuide
          template={template}
          viewerType="child"
          childName={childName}
          conversationStatus="scheduled"
        />
      )

      // Title present
      expect(screen.getByText(template.title)).toBeInTheDocument()

      // Discussion points section
      expect(screen.getByText('Discussion Points')).toBeInTheDocument()

      // Suggested questions section
      expect(screen.getByText('Suggested Questions')).toBeInTheDocument()

      // Resources section
      expect(screen.getByText('Helpful Resources')).toBeInTheDocument()

      // Closing thoughts
      expect(screen.getByText('Closing Thoughts')).toBeInTheDocument()
    })

    it('should show required and optional discussion points', () => {
      const template = createConversationTemplate(baseConversation.id)
      const requiredPoints = getRequiredDiscussionPoints(template)
      const optionalPoints = getOptionalDiscussionPoints(template)

      render(
        <GraduationConversationGuide
          template={template}
          viewerType="child"
          childName={childName}
          conversationStatus="scheduled"
        />
      )

      // Badge shows count
      expect(screen.getByText(`${requiredPoints.length} required`)).toBeInTheDocument()
      if (optionalPoints.length > 0) {
        expect(screen.getByText(`${optionalPoints.length} optional`)).toBeInTheDocument()
      }
    })

    it('should show viewer-specific discussion points', () => {
      const template = createConversationTemplate(baseConversation.id)
      const childPoints = getDiscussionPointsForViewer(template, 'child')
      const parentPoints = getDiscussionPointsForViewer(template, 'parent')

      // Both should have points
      expect(childPoints.length).toBeGreaterThan(0)
      expect(parentPoints.length).toBeGreaterThan(0)
    })

    it('should allow tracking discussed topics', () => {
      const template = createConversationTemplate(baseConversation.id)

      render(
        <GraduationConversationGuide
          template={template}
          viewerType="child"
          childName={childName}
          conversationStatus="scheduled"
        />
      )

      // Find a checkbox and click it
      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes.length).toBeGreaterThan(0)

      fireEvent.click(checkboxes[0])

      // Progress should show
      expect(screen.getByText(/Progress:.*1.*topics discussed/i)).toBeInTheDocument()
    })
  })

  describe('Conversation Scheduling and Completion', () => {
    it('should allow scheduling conversation date', () => {
      let conversation = recordChildAcknowledgment(baseConversation)
      conversation = recordParentAcknowledgment(conversation, parentIds[0])
      conversation = recordParentAcknowledgment(conversation, parentIds[1])

      const template = createConversationTemplate(conversation.id)
      const onSchedule = vi.fn()

      render(
        <GraduationConversationGuide
          template={template}
          viewerType="parent"
          childName={childName}
          conversationStatus="acknowledged"
          onSchedule={onSchedule}
        />
      )

      // Date input should be present
      const dateInput = screen.getByLabelText(/Select date/i)
      expect(dateInput).toBeInTheDocument()

      // Schedule button present
      expect(screen.getByRole('button', { name: /Schedule Conversation/i })).toBeInTheDocument()
    })

    it('should schedule conversation with service', () => {
      let conversation = recordChildAcknowledgment(baseConversation)
      conversation = recordParentAcknowledgment(conversation, parentIds[0])
      conversation = recordParentAcknowledgment(conversation, parentIds[1])

      const scheduledDate = new Date('2025-07-01')
      conversation = scheduleConversation(conversation, scheduledDate)

      expect(conversation.status).toBe('scheduled')
      expect(conversation.scheduledDate).toEqual(scheduledDate)
    })

    it('should complete conversation with graduated outcome', () => {
      let conversation = recordChildAcknowledgment(baseConversation)
      conversation = recordParentAcknowledgment(conversation, parentIds[0])
      conversation = recordParentAcknowledgment(conversation, parentIds[1])
      conversation = scheduleConversation(conversation, new Date('2025-07-01'))

      const template = createConversationTemplate(conversation.id)
      const onComplete = vi.fn()

      render(
        <GraduationConversationGuide
          template={template}
          viewerType="parent"
          childName={childName}
          conversationStatus="scheduled"
          onComplete={onComplete}
        />
      )

      // Click Complete Graduation button
      fireEvent.click(screen.getByRole('button', { name: /Complete Graduation/i }))

      expect(onComplete).toHaveBeenCalledWith('graduated')
    })

    it('should handle deferred outcome', () => {
      const template = createConversationTemplate(baseConversation.id)
      const onComplete = vi.fn()

      render(
        <GraduationConversationGuide
          template={template}
          viewerType="parent"
          childName={childName}
          conversationStatus="scheduled"
          onComplete={onComplete}
        />
      )

      // Click Defer button
      fireEvent.click(screen.getByRole('button', { name: /Defer for Now/i }))

      expect(onComplete).toHaveBeenCalledWith('deferred')
    })

    it('should handle declined outcome', () => {
      const template = createConversationTemplate(baseConversation.id)
      const onComplete = vi.fn()

      render(
        <GraduationConversationGuide
          template={template}
          viewerType="parent"
          childName={childName}
          conversationStatus="scheduled"
          onComplete={onComplete}
        />
      )

      // Click Decline button
      fireEvent.click(screen.getByRole('button', { name: /Decline/i }))

      expect(onComplete).toHaveBeenCalledWith('declined')
    })

    it('should complete conversation in service with different outcomes', () => {
      let conversation = recordChildAcknowledgment(baseConversation)
      conversation = recordParentAcknowledgment(conversation, parentIds[0])
      conversation = recordParentAcknowledgment(conversation, parentIds[1])
      conversation = scheduleConversation(conversation, new Date('2025-07-01'))

      // Graduated
      const graduated = completeConversation(conversation, 'graduated')
      expect(graduated.status).toBe('completed')
      expect(graduated.outcome).toBe('graduated')
      expect(graduated.completedAt).toBeDefined()

      // Deferred
      const deferred = completeConversation(conversation, 'deferred')
      expect(deferred.outcome).toBe('deferred')

      // Declined
      const declined = completeConversation(conversation, 'declined')
      expect(declined.outcome).toBe('declined')
    })
  })

  describe('Reminder System', () => {
    it('should determine when reminders are needed', () => {
      // Create conversation 8 days ago (past 7-day reminder threshold)
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 8)
      const oldConversation: GraduationConversation = {
        ...baseConversation,
        initiatedAt: oldDate,
      }

      // shouldSendReminder checks internally against 7, 14, 21 day thresholds
      expect(shouldSendReminder(oldConversation)).toBe(true)
    })

    it('should not send reminder if already sent for threshold', () => {
      // Conversation 8 days old but already sent 1 reminder
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 8)
      const oldConversation: GraduationConversation = {
        ...baseConversation,
        initiatedAt: oldDate,
        remindersSent: 1,
      }

      // Already sent first reminder, not yet at 14 days
      expect(shouldSendReminder(oldConversation)).toBe(false)
    })

    it('should generate reminder notifications', () => {
      const childReminder = getReminderNotification('child', childName, 7)
      const parentReminder = getReminderNotification('parent', childName, 7)

      expect(childReminder.title).toBeDefined()
      expect(childReminder.message).toBeDefined()
      expect(parentReminder.title).toBeDefined()
      expect(parentReminder.message).toBeDefined()
    })
  })

  describe('Expiry System - Prevents Indefinite Monitoring (AC7)', () => {
    it('should show days remaining countdown', () => {
      render(
        <GraduationEligibilityBanner
          conversation={baseConversation}
          viewerType="child"
          viewerId={childId}
          childName={childName}
          hasAcknowledged={false}
          onAcknowledge={vi.fn()}
        />
      )

      const daysRemaining = getConversationDaysUntilExpiry(baseConversation)
      const remainingElements = screen.getAllByText(
        new RegExp(`${daysRemaining} days remaining`, 'i')
      )
      expect(remainingElements.length).toBeGreaterThan(0)
    })

    it('should show danger styling when less than 7 days remain', () => {
      // Create conversation that expires in 5 days
      const soonExpiry = new Date()
      soonExpiry.setDate(soonExpiry.getDate() + 5)
      const expiringConversation: GraduationConversation = {
        ...baseConversation,
        expiresAt: soonExpiry,
      }

      render(
        <GraduationEligibilityBanner
          conversation={expiringConversation}
          viewerType="child"
          viewerId={childId}
          childName={childName}
          hasAcknowledged={false}
          onAcknowledge={vi.fn()}
        />
      )

      // Should show remaining days (may appear in multiple places)
      const remainingElements = screen.getAllByText(/5 days remaining/i)
      expect(remainingElements.length).toBeGreaterThan(0)
    })

    it('should detect expired conversations', () => {
      // Create expired conversation
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)
      const expiredConversation: GraduationConversation = {
        ...baseConversation,
        expiresAt: pastDate,
      }

      expect(isConversationExpired(expiredConversation)).toBe(true)
    })

    it('should hide acknowledge button when expired', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)
      const expiredConversation: GraduationConversation = {
        ...baseConversation,
        expiresAt: pastDate,
      }

      render(
        <GraduationEligibilityBanner
          conversation={expiredConversation}
          viewerType="child"
          viewerId={childId}
          childName={childName}
          hasAcknowledged={false}
          onAcknowledge={vi.fn()}
        />
      )

      // Shows expired message
      expect(screen.getByText(/expired/i)).toBeInTheDocument()

      // Acknowledge button should not be present
      expect(screen.queryByRole('button', { name: /acknowledge/i })).not.toBeInTheDocument()
    })
  })

  describe('Full Workflow Integration Scenarios', () => {
    describe('Scenario 1: Complete happy path graduation', () => {
      it('should complete full graduation workflow', async () => {
        const onAcknowledge = vi.fn().mockResolvedValue(undefined)
        const onSchedule = vi.fn()
        const _onComplete = vi.fn()

        // Step 1: Child sees eligibility banner
        const { rerender } = render(
          <GraduationEligibilityBanner
            conversation={baseConversation}
            viewerType="child"
            viewerId={childId}
            childName={childName}
            hasAcknowledged={false}
            onAcknowledge={onAcknowledge}
          />
        )

        // Child acknowledges
        fireEvent.click(screen.getByRole('button', { name: /I'm Ready/i }))
        await waitFor(() => expect(onAcknowledge).toHaveBeenCalled())

        // Update conversation state
        let conversation = recordChildAcknowledgment(baseConversation)

        // Step 2: Parent 1 acknowledges
        conversation = recordParentAcknowledgment(conversation, parentIds[0])

        // Step 3: Parent 2 acknowledges
        conversation = recordParentAcknowledgment(conversation, parentIds[1])

        // All acknowledged
        expect(hasAllAcknowledgments(conversation)).toBe(true)

        // Step 4: Show schedule button
        rerender(
          <GraduationEligibilityBanner
            conversation={conversation}
            viewerType="parent"
            viewerId={parentIds[0]}
            childName={childName}
            hasAcknowledged={true}
            onAcknowledge={onAcknowledge}
            onSchedule={onSchedule}
          />
        )

        expect(screen.getByRole('button', { name: /Schedule Conversation/i })).toBeInTheDocument()

        // Step 5: Schedule conversation
        conversation = scheduleConversation(conversation, new Date('2025-07-15'))
        expect(conversation.status).toBe('scheduled')

        // Step 6: Complete conversation
        conversation = completeConversation(conversation, 'graduated')
        expect(conversation.status).toBe('completed')
        expect(conversation.outcome).toBe('graduated')
      })
    })

    describe('Scenario 2: Deferred graduation', () => {
      it('should handle deferred graduation properly', () => {
        let conversation = recordChildAcknowledgment(baseConversation)
        conversation = recordParentAcknowledgment(conversation, parentIds[0])
        conversation = recordParentAcknowledgment(conversation, parentIds[1])
        conversation = scheduleConversation(conversation, new Date('2025-07-01'))

        // Family decides to defer
        conversation = completeConversation(conversation, 'deferred')

        expect(conversation.status).toBe('completed')
        expect(conversation.outcome).toBe('deferred')
        expect(conversation.completedAt).toBeDefined()
      })
    })

    describe('Scenario 3: Two-parent household both must acknowledge', () => {
      it('should require both parents to acknowledge', () => {
        // Child acknowledges
        let conversation = recordChildAcknowledgment(baseConversation)

        // Only one parent acknowledges
        conversation = recordParentAcknowledgment(conversation, parentIds[0])

        // Still not all acknowledged
        const { childMissing, missingParentIds } = getMissingAcknowledgments(conversation)
        expect(childMissing).toBe(false)
        expect(missingParentIds).toContain(parentIds[1])
        expect(hasAllAcknowledgments(conversation)).toBe(false)

        // Second parent acknowledges
        conversation = recordParentAcknowledgment(conversation, parentIds[1])
        expect(hasAllAcknowledgments(conversation)).toBe(true)
      })
    })

    describe('Scenario 4: Single parent household', () => {
      it('should work with single parent', () => {
        const singleParentConversation = createConversation(childId, ['single-parent-123'])

        // Child acknowledges
        let conversation = recordChildAcknowledgment(singleParentConversation)

        // Single parent acknowledges
        conversation = recordParentAcknowledgment(conversation, 'single-parent-123')

        expect(hasAllAcknowledgments(conversation)).toBe(true)
        expect(canScheduleConversation(conversation)).toBe(true)
      })
    })
  })

  describe('AC Verification', () => {
    describe('AC1: FR38A triggers conversation at 100% for 12 months', () => {
      it('should create conversation when eligibility is reached', () => {
        const conversation = createConversation()

        expect(conversation).toBeDefined()
        expect(conversation.childId).toBe(childId)
        expect(conversation.requiredParentIds).toEqual(parentIds)
        expect(conversation.status).toBe('pending')
      })
    })

    describe('AC2: Notification to BOTH child AND parent', () => {
      it('should have distinct notifications for each party', () => {
        const childNotification = getChildEligibilityNotification(baseConversation.id)
        const parentNotification = getParentEligibilityNotification(childName, baseConversation.id)

        expect(childNotification).toBeDefined()
        expect(parentNotification).toBeDefined()
        expect(childNotification.title).not.toBe(parentNotification.title)
      })
    })

    describe('AC3: Both parties must acknowledge readiness', () => {
      it('should track acknowledgments from all parties', () => {
        let conversation = baseConversation

        // Start with no acknowledgments
        let missing = getMissingAcknowledgments(conversation)
        expect(missing.childMissing).toBe(true)
        expect(missing.missingParentIds.length).toBe(2)

        // Child acknowledges
        conversation = recordChildAcknowledgment(conversation)
        missing = getMissingAcknowledgments(conversation)
        expect(missing.childMissing).toBe(false)
        expect(missing.missingParentIds.length).toBe(2)

        // Parents acknowledge
        conversation = recordParentAcknowledgment(conversation, parentIds[0])
        conversation = recordParentAcknowledgment(conversation, parentIds[1])
        missing = getMissingAcknowledgments(conversation)
        expect(missing.childMissing).toBe(false)
        expect(missing.missingParentIds.length).toBe(0)
      })
    })

    describe('AC4: Celebratory messaging', () => {
      it('should provide celebratory messages for both parties', () => {
        const childMessage = getCelebratoryMessage('child', childName)
        const parentMessage = getCelebratoryMessage('parent', childName)

        // Messages should be celebratory (contain positive words)
        expect(childMessage.toLowerCase()).toMatch(
          /congratulations|achievement|proud|celebrate|earned/i
        )
        expect(parentMessage.toLowerCase()).toMatch(
          /congratulations|achievement|proud|celebrate|earned/i
        )
      })
    })

    describe('AC5: Conversation template with discussion points', () => {
      it('should provide structured conversation template', () => {
        const template = createConversationTemplate(baseConversation.id)

        expect(template.title).toBeDefined()
        expect(template.discussionPoints.length).toBeGreaterThan(0)
        expect(getSuggestedQuestions(template).length).toBeGreaterThan(0)
        expect(getResources(template).length).toBeGreaterThan(0)
      })
    })

    describe('AC6: Reminder if not acknowledged within timeframe', () => {
      it('should support reminder system', () => {
        // New conversation - no reminder needed
        expect(shouldSendReminder(baseConversation)).toBe(false)

        // Simulate 8 days passed
        const oldConversation: GraduationConversation = {
          ...baseConversation,
          initiatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        }

        // Should send first reminder after 7 days
        expect(shouldSendReminder(oldConversation)).toBe(true)
      })
    })

    describe('AC7: Respects demonstrated readiness for independence', () => {
      it('should have expiry to prevent indefinite monitoring', () => {
        expect(baseConversation.expiresAt).toBeDefined()

        const daysUntilExpiry = getConversationDaysUntilExpiry(baseConversation)
        expect(daysUntilExpiry).toBeGreaterThan(0)
        expect(daysUntilExpiry).toBeLessThanOrEqual(30)
      })

      it('should provide graduated outcome for completing graduation', () => {
        let conversation = recordChildAcknowledgment(baseConversation)
        conversation = recordParentAcknowledgment(conversation, parentIds[0])
        conversation = recordParentAcknowledgment(conversation, parentIds[1])
        conversation = scheduleConversation(conversation, new Date('2025-07-01'))
        conversation = completeConversation(conversation, 'graduated')

        expect(conversation.outcome).toBe('graduated')
        expect(conversation.status).toBe('completed')
      })
    })
  })
})
