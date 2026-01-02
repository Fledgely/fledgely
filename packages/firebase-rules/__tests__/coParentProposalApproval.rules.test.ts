/**
 * Co-Parent Proposal Approval Security Rules Tests - Story 3A.3
 *
 * Tests for Firestore security rules governing the two-parent approval
 * workflow for agreement changes in shared custody families.
 *
 * AC1: Only OTHER parent can approve/decline proposals
 * AC4: Proposer cannot self-approve
 * AC2: Child cannot respond until co-parent approves
 */

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import * as fs from 'fs'
import * as path from 'path'

// =============================================================================
// Test Setup
// =============================================================================

let testEnv: RulesTestEnvironment

const FAMILY_ID = 'test-family-123'
const CHILD_ID = 'test-child-456'
const PROPOSAL_ID = 'test-proposal-789'
const PARENT_1_UID = 'parent-1-uid'
const PARENT_2_UID = 'parent-2-uid'
const CHILD_UID = 'child-uid'

beforeAll(async () => {
  const rulesPath = path.resolve(__dirname, '../firestore.rules')
  const rules = fs.readFileSync(rulesPath, 'utf8')

  testEnv = await initializeTestEnvironment({
    projectId: 'fledgely-test',
    firestore: {
      rules,
      host: 'localhost',
      port: 8080,
    },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
})

// =============================================================================
// Helper Functions
// =============================================================================

async function setupFamilyWithProposal(
  status: 'pending' | 'pending_coparent_approval' = 'pending_coparent_approval'
) {
  // Set up family document
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()

    // Create family with both parents
    await setDoc(doc(db, 'families', FAMILY_ID), {
      id: FAMILY_ID,
      guardianUids: [PARENT_1_UID, PARENT_2_UID],
      guardians: [
        { uid: PARENT_1_UID, displayName: 'Parent 1' },
        { uid: PARENT_2_UID, displayName: 'Parent 2' },
      ],
      createdAt: Date.now(),
    })

    // Create proposal by parent 1
    await setDoc(doc(db, 'families', FAMILY_ID, 'agreementProposals', PROPOSAL_ID), {
      id: PROPOSAL_ID,
      familyId: FAMILY_ID,
      childId: CHILD_ID,
      agreementId: 'agreement-1',
      proposerId: PARENT_1_UID,
      proposerName: 'Parent 1',
      proposedBy: 'parent',
      status,
      coParentApprovalRequired: status === 'pending_coparent_approval',
      coParentApprovalStatus: status === 'pending_coparent_approval' ? 'pending' : null,
      changes: [
        { sectionId: 'time-limits', fieldPath: 'weekday.gaming', oldValue: 60, newValue: 90 },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  })
}

// =============================================================================
// Tests: Co-Parent Approval (Story 3A.3 AC1, AC4)
// =============================================================================

describe('Co-Parent Proposal Approval Rules - Story 3A.3', () => {
  describe('AC1: Other parent can approve proposal', () => {
    it('should allow OTHER guardian to approve co-parent proposal', async () => {
      await setupFamilyWithProposal('pending_coparent_approval')

      const parent2Context = testEnv.authenticatedContext(PARENT_2_UID)
      const db = parent2Context.firestore()

      await assertSucceeds(
        updateDoc(doc(db, 'families', FAMILY_ID, 'agreementProposals', PROPOSAL_ID), {
          status: 'pending',
          coParentApprovalStatus: 'approved',
          coParentApprovedByUid: PARENT_2_UID,
          coParentApprovedAt: Date.now(),
          familyId: FAMILY_ID,
          childId: CHILD_ID,
          agreementId: 'agreement-1',
          proposedBy: 'parent',
          proposerId: PARENT_1_UID,
        })
      )
    })

    it('should allow OTHER guardian to decline co-parent proposal', async () => {
      await setupFamilyWithProposal('pending_coparent_approval')

      const parent2Context = testEnv.authenticatedContext(PARENT_2_UID)
      const db = parent2Context.firestore()

      await assertSucceeds(
        updateDoc(doc(db, 'families', FAMILY_ID, 'agreementProposals', PROPOSAL_ID), {
          status: 'declined',
          coParentApprovalStatus: 'declined',
          coParentApprovedByUid: PARENT_2_UID,
          coParentApprovedAt: Date.now(),
          coParentDeclineReason: 'Need to discuss first',
          familyId: FAMILY_ID,
          childId: CHILD_ID,
          agreementId: 'agreement-1',
          proposedBy: 'parent',
          proposerId: PARENT_1_UID,
        })
      )
    })
  })

  describe('AC4: Proposer cannot self-approve', () => {
    it('should DENY proposer from approving their own proposal', async () => {
      await setupFamilyWithProposal('pending_coparent_approval')

      // Parent 1 is the proposer - they should NOT be able to approve
      const parent1Context = testEnv.authenticatedContext(PARENT_1_UID)
      const db = parent1Context.firestore()

      await assertFails(
        updateDoc(doc(db, 'families', FAMILY_ID, 'agreementProposals', PROPOSAL_ID), {
          status: 'pending',
          coParentApprovalStatus: 'approved',
          familyId: FAMILY_ID,
          childId: CHILD_ID,
          agreementId: 'agreement-1',
          proposedBy: 'parent',
          proposerId: PARENT_1_UID,
        })
      )
    })

    it('should DENY proposer from declining their own proposal via co-parent flow', async () => {
      await setupFamilyWithProposal('pending_coparent_approval')

      const parent1Context = testEnv.authenticatedContext(PARENT_1_UID)
      const db = parent1Context.firestore()

      await assertFails(
        updateDoc(doc(db, 'families', FAMILY_ID, 'agreementProposals', PROPOSAL_ID), {
          status: 'declined',
          coParentApprovalStatus: 'declined',
          familyId: FAMILY_ID,
          childId: CHILD_ID,
          agreementId: 'agreement-1',
          proposedBy: 'parent',
          proposerId: PARENT_1_UID,
        })
      )
    })
  })

  describe('Proposer can withdraw during co-parent approval', () => {
    it('should allow proposer to withdraw proposal during co-parent approval', async () => {
      await setupFamilyWithProposal('pending_coparent_approval')

      const parent1Context = testEnv.authenticatedContext(PARENT_1_UID)
      const db = parent1Context.firestore()

      await assertSucceeds(
        updateDoc(doc(db, 'families', FAMILY_ID, 'agreementProposals', PROPOSAL_ID), {
          status: 'withdrawn',
          familyId: FAMILY_ID,
          childId: CHILD_ID,
          agreementId: 'agreement-1',
        })
      )
    })
  })

  describe('AC2: Child cannot respond until co-parent approves', () => {
    it('should DENY child from responding to proposal pending co-parent approval', async () => {
      await setupFamilyWithProposal('pending_coparent_approval')

      // Child tries to accept while still pending co-parent approval
      const childContext = testEnv.authenticatedContext(CHILD_UID, {
        familyId: FAMILY_ID,
        childId: CHILD_ID,
      })
      const db = childContext.firestore()

      await assertFails(
        updateDoc(doc(db, 'families', FAMILY_ID, 'agreementProposals', PROPOSAL_ID), {
          status: 'accepted',
          familyId: FAMILY_ID,
          childId: CHILD_ID,
          agreementId: 'agreement-1',
          proposedBy: 'parent',
          proposerId: PARENT_1_UID,
        })
      )
    })

    it('should allow child to respond AFTER co-parent has approved', async () => {
      // Set up with status = 'pending' (meaning co-parent already approved)
      await setupFamilyWithProposal('pending')

      const childContext = testEnv.authenticatedContext(CHILD_UID, {
        familyId: FAMILY_ID,
        childId: CHILD_ID,
      })
      const db = childContext.firestore()

      await assertSucceeds(
        updateDoc(doc(db, 'families', FAMILY_ID, 'agreementProposals', PROPOSAL_ID), {
          status: 'accepted',
          respondedAt: Date.now(),
          familyId: FAMILY_ID,
          childId: CHILD_ID,
          agreementId: 'agreement-1',
          proposedBy: 'parent',
          proposerId: PARENT_1_UID,
        })
      )
    })
  })

  describe('Non-family members cannot access', () => {
    it('should DENY unauthenticated user from reading proposal', async () => {
      await setupFamilyWithProposal('pending_coparent_approval')

      const unauthedContext = testEnv.unauthenticatedContext()
      const db = unauthedContext.firestore()

      await assertFails(getDoc(doc(db, 'families', FAMILY_ID, 'agreementProposals', PROPOSAL_ID)))
    })

    it('should DENY user from different family from reading proposal', async () => {
      await setupFamilyWithProposal('pending_coparent_approval')

      const otherUserContext = testEnv.authenticatedContext('random-user')
      const db = otherUserContext.firestore()

      await assertFails(getDoc(doc(db, 'families', FAMILY_ID, 'agreementProposals', PROPOSAL_ID)))
    })

    it('should DENY user from different family from approving proposal', async () => {
      await setupFamilyWithProposal('pending_coparent_approval')

      const otherUserContext = testEnv.authenticatedContext('random-user')
      const db = otherUserContext.firestore()

      await assertFails(
        updateDoc(doc(db, 'families', FAMILY_ID, 'agreementProposals', PROPOSAL_ID), {
          status: 'pending',
          coParentApprovalStatus: 'approved',
        })
      )
    })
  })

  describe('Create with co-parent approval status', () => {
    it('should allow guardian to create proposal with pending_coparent_approval status', async () => {
      // Set up family first
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore()
        await setDoc(doc(db, 'families', FAMILY_ID), {
          id: FAMILY_ID,
          guardianUids: [PARENT_1_UID, PARENT_2_UID],
          guardians: [
            { uid: PARENT_1_UID, displayName: 'Parent 1' },
            { uid: PARENT_2_UID, displayName: 'Parent 2' },
          ],
          createdAt: Date.now(),
        })
      })

      const parent1Context = testEnv.authenticatedContext(PARENT_1_UID)
      const db = parent1Context.firestore()

      await assertSucceeds(
        setDoc(doc(db, 'families', FAMILY_ID, 'agreementProposals', 'new-proposal'), {
          id: 'new-proposal',
          familyId: FAMILY_ID,
          childId: CHILD_ID,
          agreementId: 'agreement-1',
          proposerId: PARENT_1_UID,
          proposerName: 'Parent 1',
          proposedBy: 'parent',
          status: 'pending_coparent_approval',
          coParentApprovalRequired: true,
          coParentApprovalStatus: 'pending',
          changes: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      )
    })
  })
})
