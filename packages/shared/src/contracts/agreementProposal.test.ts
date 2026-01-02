/**
 * Agreement Proposal Schema Tests - Story 34.1
 *
 * Tests for proposal schemas supporting parent-initiated agreement changes.
 */

import { describe, it, expect } from 'vitest'
import {
  proposalStatusSchema,
  proposalChangeTypeSchema,
  proposalChangeSchema,
  agreementProposalSchema,
  proposalResponseActionSchema,
  proposalResponseSchema,
  AGREEMENT_PROPOSAL_MESSAGES,
  type ProposalChange,
  type AgreementProposal,
  type ProposalResponse,
} from './index'

describe('proposalStatusSchema - Story 34.1', () => {
  it('should accept "pending" status', () => {
    expect(proposalStatusSchema.parse('pending')).toBe('pending')
  })

  it('should accept "accepted" status', () => {
    expect(proposalStatusSchema.parse('accepted')).toBe('accepted')
  })

  it('should accept "declined" status', () => {
    expect(proposalStatusSchema.parse('declined')).toBe('declined')
  })

  it('should accept "withdrawn" status', () => {
    expect(proposalStatusSchema.parse('withdrawn')).toBe('withdrawn')
  })

  it('should accept "counter-proposed" status', () => {
    expect(proposalStatusSchema.parse('counter-proposed')).toBe('counter-proposed')
  })

  it('should reject invalid status', () => {
    expect(() => proposalStatusSchema.parse('invalid')).toThrow()
  })
})

describe('proposalChangeTypeSchema - Story 34.1', () => {
  it('should accept "add" change type', () => {
    expect(proposalChangeTypeSchema.parse('add')).toBe('add')
  })

  it('should accept "modify" change type', () => {
    expect(proposalChangeTypeSchema.parse('modify')).toBe('modify')
  })

  it('should accept "remove" change type', () => {
    expect(proposalChangeTypeSchema.parse('remove')).toBe('remove')
  })

  it('should reject invalid change type', () => {
    expect(() => proposalChangeTypeSchema.parse('update')).toThrow()
  })
})

describe('proposalChangeSchema - Story 34.1', () => {
  const validChange: ProposalChange = {
    sectionId: 'time-limits',
    sectionName: 'Time Limits',
    fieldPath: 'timeLimits.weekday.gaming',
    oldValue: 60,
    newValue: 90,
    changeType: 'modify',
  }

  it('should accept valid proposal change', () => {
    const result = proposalChangeSchema.parse(validChange)
    expect(result).toEqual(validChange)
  })

  it('should accept change with null oldValue (for add)', () => {
    const addChange: ProposalChange = {
      ...validChange,
      oldValue: null,
      changeType: 'add',
    }
    const result = proposalChangeSchema.parse(addChange)
    expect(result.oldValue).toBeNull()
  })

  it('should accept change with null newValue (for remove)', () => {
    const removeChange: ProposalChange = {
      ...validChange,
      newValue: null,
      changeType: 'remove',
    }
    const result = proposalChangeSchema.parse(removeChange)
    expect(result.newValue).toBeNull()
  })

  it('should accept complex object values', () => {
    const complexChange: ProposalChange = {
      ...validChange,
      oldValue: { daily: 60, weekly: 300 },
      newValue: { daily: 90, weekly: 420 },
    }
    const result = proposalChangeSchema.parse(complexChange)
    expect(result.newValue).toEqual({ daily: 90, weekly: 420 })
  })

  it('should require sectionId', () => {
    const invalid = { ...validChange, sectionId: undefined }
    expect(() => proposalChangeSchema.parse(invalid)).toThrow()
  })

  it('should require fieldPath', () => {
    const invalid = { ...validChange, fieldPath: undefined }
    expect(() => proposalChangeSchema.parse(invalid)).toThrow()
  })
})

describe('agreementProposalSchema - Story 34.1', () => {
  const validProposal: AgreementProposal = {
    id: 'proposal-123',
    familyId: 'family-1',
    childId: 'child-1',
    agreementId: 'agreement-1',
    proposedBy: 'parent',
    proposerId: 'parent-1',
    proposerName: 'Mom',
    changes: [
      {
        sectionId: 'time-limits',
        sectionName: 'Time Limits',
        fieldPath: 'timeLimits.weekday.gaming',
        oldValue: 60,
        newValue: 90,
        changeType: 'modify',
      },
    ],
    reason: "You've been responsible with gaming",
    status: 'pending',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    respondedAt: null,
    version: 1,
    proposalNumber: 1,
  }

  it('should accept valid parent-initiated proposal', () => {
    const result = agreementProposalSchema.parse(validProposal)
    expect(result.proposedBy).toBe('parent')
    expect(result.status).toBe('pending')
  })

  it('should accept child-initiated proposal', () => {
    const childProposal = {
      ...validProposal,
      proposedBy: 'child' as const,
      proposerId: 'child-1',
      proposerName: 'Alex',
    }
    const result = agreementProposalSchema.parse(childProposal)
    expect(result.proposedBy).toBe('child')
  })

  it('should accept null reason', () => {
    const noReason = { ...validProposal, reason: null }
    const result = agreementProposalSchema.parse(noReason)
    expect(result.reason).toBeNull()
  })

  it('should accept multiple changes', () => {
    const multiChange = {
      ...validProposal,
      changes: [
        validProposal.changes[0],
        {
          sectionId: 'app-restrictions',
          sectionName: 'App Restrictions',
          fieldPath: 'apps.blocked',
          oldValue: ['TikTok'],
          newValue: ['TikTok', 'Instagram'],
          changeType: 'modify' as const,
        },
      ],
    }
    const result = agreementProposalSchema.parse(multiChange)
    expect(result.changes).toHaveLength(2)
  })

  it('should accept empty changes array', () => {
    const emptyChanges = { ...validProposal, changes: [] }
    const result = agreementProposalSchema.parse(emptyChanges)
    expect(result.changes).toHaveLength(0)
  })

  it('should accept responded proposal with respondedAt', () => {
    const responded = {
      ...validProposal,
      status: 'accepted' as const,
      respondedAt: Date.now(),
    }
    const result = agreementProposalSchema.parse(responded)
    expect(result.respondedAt).not.toBeNull()
  })

  it('should require familyId', () => {
    const invalid = { ...validProposal, familyId: undefined }
    expect(() => agreementProposalSchema.parse(invalid)).toThrow()
  })

  it('should require childId', () => {
    const invalid = { ...validProposal, childId: undefined }
    expect(() => agreementProposalSchema.parse(invalid)).toThrow()
  })

  it('should require proposerId', () => {
    const invalid = { ...validProposal, proposerId: undefined }
    expect(() => agreementProposalSchema.parse(invalid)).toThrow()
  })

  it('should require valid proposedBy', () => {
    const invalid = { ...validProposal, proposedBy: 'admin' }
    expect(() => agreementProposalSchema.parse(invalid)).toThrow()
  })
})

describe('proposalResponseActionSchema - Story 34.1', () => {
  it('should accept "accept" action', () => {
    expect(proposalResponseActionSchema.parse('accept')).toBe('accept')
  })

  it('should accept "decline" action', () => {
    expect(proposalResponseActionSchema.parse('decline')).toBe('decline')
  })

  it('should accept "counter" action', () => {
    expect(proposalResponseActionSchema.parse('counter')).toBe('counter')
  })

  it('should reject invalid action', () => {
    expect(() => proposalResponseActionSchema.parse('approve')).toThrow()
  })
})

describe('proposalResponseSchema - Story 34.1', () => {
  const validResponse: ProposalResponse = {
    id: 'response-1',
    proposalId: 'proposal-123',
    responderId: 'child-1',
    responderName: 'Alex',
    action: 'accept',
    comment: 'Sounds good!',
    counterChanges: null,
    createdAt: Date.now(),
  }

  it('should accept valid accept response', () => {
    const result = proposalResponseSchema.parse(validResponse)
    expect(result.action).toBe('accept')
  })

  it('should accept decline response with comment', () => {
    const decline = {
      ...validResponse,
      action: 'decline' as const,
      comment: 'I need more time to think',
    }
    const result = proposalResponseSchema.parse(decline)
    expect(result.action).toBe('decline')
    expect(result.comment).toBe('I need more time to think')
  })

  it('should accept counter response with changes', () => {
    const counter = {
      ...validResponse,
      action: 'counter' as const,
      counterChanges: [
        {
          sectionId: 'time-limits',
          sectionName: 'Time Limits',
          fieldPath: 'timeLimits.weekday.gaming',
          oldValue: 60,
          newValue: 75,
          changeType: 'modify' as const,
        },
      ],
    }
    const result = proposalResponseSchema.parse(counter)
    expect(result.action).toBe('counter')
    expect(result.counterChanges).toHaveLength(1)
  })

  it('should accept null comment', () => {
    const noComment = { ...validResponse, comment: null }
    const result = proposalResponseSchema.parse(noComment)
    expect(result.comment).toBeNull()
  })

  it('should require proposalId', () => {
    const invalid = { ...validResponse, proposalId: undefined }
    expect(() => proposalResponseSchema.parse(invalid)).toThrow()
  })
})

describe('AGREEMENT_PROPOSAL_MESSAGES - Story 34.1', () => {
  it('should have parent notification message', () => {
    const message = AGREEMENT_PROPOSAL_MESSAGES.childNotification('Mom')
    expect(message).toContain('Mom')
    expect(message).toContain('proposed')
  })

  it('should have pending status message', () => {
    const message = AGREEMENT_PROPOSAL_MESSAGES.pendingStatus('Alex')
    expect(message).toContain('Waiting')
    expect(message).toContain('Alex')
  })

  it('should have withdraw confirmation message', () => {
    const message = AGREEMENT_PROPOSAL_MESSAGES.withdrawConfirmation
    expect(message).toBeDefined()
  })

  it('should have positive framing prompts', () => {
    expect(AGREEMENT_PROPOSAL_MESSAGES.reasonPrompts).toBeDefined()
    expect(AGREEMENT_PROPOSAL_MESSAGES.reasonPrompts.length).toBeGreaterThan(0)
    expect(AGREEMENT_PROPOSAL_MESSAGES.reasonPrompts[0]).toContain('responsible')
  })
})

// =============================================================================
// STORY 3A.3: CO-PARENT APPROVAL TESTS
// =============================================================================

import { coParentApprovalStatusSchema } from './index'

describe('coParentApprovalStatusSchema - Story 3A.3', () => {
  it('should accept "pending" status', () => {
    expect(coParentApprovalStatusSchema.parse('pending')).toBe('pending')
  })

  it('should accept "approved" status', () => {
    expect(coParentApprovalStatusSchema.parse('approved')).toBe('approved')
  })

  it('should accept "declined" status', () => {
    expect(coParentApprovalStatusSchema.parse('declined')).toBe('declined')
  })

  it('should reject invalid status', () => {
    expect(() => coParentApprovalStatusSchema.parse('waiting')).toThrow()
  })
})

describe('proposalStatusSchema - Story 3A.3 extensions', () => {
  it('should accept "pending_coparent_approval" status', () => {
    expect(proposalStatusSchema.parse('pending_coparent_approval')).toBe(
      'pending_coparent_approval'
    )
  })

  it('should accept "expired" status', () => {
    expect(proposalStatusSchema.parse('expired')).toBe('expired')
  })
})

describe('agreementProposalSchema co-parent fields - Story 3A.3', () => {
  const baseProposal = {
    id: 'proposal-123',
    familyId: 'family-1',
    childId: 'child-1',
    agreementId: 'agreement-1',
    proposedBy: 'parent' as const,
    proposerId: 'parent-1',
    proposerName: 'Mom',
    changes: [],
    reason: null,
    status: 'pending' as const,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    respondedAt: null,
    version: 1,
    proposalNumber: 1,
  }

  it('should accept proposal without co-parent fields (defaults applied)', () => {
    const result = agreementProposalSchema.parse(baseProposal)
    expect(result.coParentApprovalRequired).toBe(false)
    expect(result.coParentApprovalStatus).toBeNull()
    expect(result.coParentApprovedByUid).toBeNull()
    expect(result.coParentApprovedAt).toBeNull()
    expect(result.coParentDeclineReason).toBeNull()
    expect(result.expiresAt).toBeNull()
  })

  it('should accept proposal with co-parent approval required', () => {
    const sharedCustodyProposal = {
      ...baseProposal,
      status: 'pending_coparent_approval' as const,
      coParentApprovalRequired: true,
      coParentApprovalStatus: 'pending' as const,
      expiresAt: Date.now() + 14 * 24 * 60 * 60 * 1000, // 14 days
    }
    const result = agreementProposalSchema.parse(sharedCustodyProposal)
    expect(result.coParentApprovalRequired).toBe(true)
    expect(result.coParentApprovalStatus).toBe('pending')
    expect(result.expiresAt).not.toBeNull()
  })

  it('should accept proposal with co-parent approval granted', () => {
    const approvedProposal = {
      ...baseProposal,
      status: 'pending' as const, // Now awaiting child response
      coParentApprovalRequired: true,
      coParentApprovalStatus: 'approved' as const,
      coParentApprovedByUid: 'parent-2',
      coParentApprovedAt: Date.now(),
      expiresAt: Date.now() + 14 * 24 * 60 * 60 * 1000,
    }
    const result = agreementProposalSchema.parse(approvedProposal)
    expect(result.coParentApprovalStatus).toBe('approved')
    expect(result.coParentApprovedByUid).toBe('parent-2')
    expect(result.coParentApprovedAt).not.toBeNull()
  })

  it('should accept proposal with co-parent approval declined', () => {
    const declinedProposal = {
      ...baseProposal,
      status: 'declined' as const,
      coParentApprovalRequired: true,
      coParentApprovalStatus: 'declined' as const,
      coParentApprovedByUid: 'parent-2',
      coParentApprovedAt: Date.now(),
      coParentDeclineReason: 'I think we should discuss this first',
      expiresAt: Date.now() + 14 * 24 * 60 * 60 * 1000,
    }
    const result = agreementProposalSchema.parse(declinedProposal)
    expect(result.coParentApprovalStatus).toBe('declined')
    expect(result.coParentDeclineReason).toBe('I think we should discuss this first')
  })

  it('should accept expired proposal', () => {
    const expiredProposal = {
      ...baseProposal,
      status: 'expired' as const,
      coParentApprovalRequired: true,
      coParentApprovalStatus: 'pending' as const, // Never responded
      expiresAt: Date.now() - 1000, // Already expired
    }
    const result = agreementProposalSchema.parse(expiredProposal)
    expect(result.status).toBe('expired')
  })

  it('should reject invalid coParentApprovalStatus', () => {
    const invalid = {
      ...baseProposal,
      coParentApprovalRequired: true,
      coParentApprovalStatus: 'waiting', // Invalid
    }
    expect(() => agreementProposalSchema.parse(invalid)).toThrow()
  })
})
