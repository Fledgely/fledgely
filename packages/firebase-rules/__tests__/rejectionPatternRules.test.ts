/**
 * Rejection Pattern Security Rules Tests - Story 34.5.1 Task 4
 *
 * Adversarial security tests for rejection pattern collections.
 * AC4: Privacy-Preserving Tracking
 *
 * CRITICAL:
 * - rejectionPatterns: Family members can read (transparency)
 * - rejectionEvents: System-only (privacy)
 * - escalationEvents: Family members can read (transparency)
 */

import { describe, it, beforeAll, afterAll } from 'vitest'
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('rejectionPatternRules - Story 34.5.1', () => {
  let testEnv: RulesTestEnvironment
  const testFamilyId = 'family-123'
  const testChildId = 'child-456'
  const otherFamilyId = 'family-other'
  const otherChildId = 'child-other'

  beforeAll(async () => {
    const rulesPath = join(__dirname, '..', 'firestore.rules')
    const rules = readFileSync(rulesPath, 'utf8')

    testEnv = await initializeTestEnvironment({
      projectId: 'rejection-pattern-rules-test',
      firestore: {
        rules,
        host: 'localhost',
        port: 8080,
      },
    })
  })

  afterAll(async () => {
    await testEnv?.cleanup()
  })

  // ============================================
  // rejectionPatterns Collection (Family-Visible)
  // ============================================

  describe('rejectionPatterns collection', () => {
    describe('read access', () => {
      it('should allow guardian to read their own family patterns', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc(`rejectionPatterns/${testChildId}`).set({
            familyId: testFamilyId,
            childId: testChildId,
            totalRejections: 2,
          })
        })

        const guardianContext = testEnv.authenticatedContext('guardian-1', {
          familyId: testFamilyId,
        })
        const db = guardianContext.firestore()

        await assertSucceeds(db.doc(`rejectionPatterns/${testChildId}`).get())
      })

      it('should allow child to read their own patterns', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc(`rejectionPatterns/${testChildId}`).set({
            familyId: testFamilyId,
            childId: testChildId,
            totalRejections: 2,
          })
        })

        const childContext = testEnv.authenticatedContext(testChildId, {
          childId: testChildId,
        })
        const db = childContext.firestore()

        await assertSucceeds(db.doc(`rejectionPatterns/${testChildId}`).get())
      })

      it('should deny guardian from other family reading patterns', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc(`rejectionPatterns/${testChildId}`).set({
            familyId: testFamilyId,
            childId: testChildId,
            totalRejections: 2,
          })
        })

        const otherGuardianContext = testEnv.authenticatedContext('other-guardian', {
          familyId: otherFamilyId,
        })
        const db = otherGuardianContext.firestore()

        await assertFails(db.doc(`rejectionPatterns/${testChildId}`).get())
      })

      it('should deny other child from reading patterns', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc(`rejectionPatterns/${testChildId}`).set({
            familyId: testFamilyId,
            childId: testChildId,
            totalRejections: 2,
          })
        })

        const otherChildContext = testEnv.authenticatedContext(otherChildId, {
          childId: otherChildId,
        })
        const db = otherChildContext.firestore()

        await assertFails(db.doc(`rejectionPatterns/${testChildId}`).get())
      })

      it('should deny unauthenticated users from reading patterns', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc(`rejectionPatterns/${testChildId}`).set({
            familyId: testFamilyId,
            childId: testChildId,
            totalRejections: 2,
          })
        })

        const unauthContext = testEnv.unauthenticatedContext()
        const db = unauthContext.firestore()

        await assertFails(db.doc(`rejectionPatterns/${testChildId}`).get())
      })
    })

    describe('write access (all denied)', () => {
      it('should deny guardian from creating patterns', async () => {
        const guardianContext = testEnv.authenticatedContext('guardian-1', {
          familyId: testFamilyId,
        })
        const db = guardianContext.firestore()

        await assertFails(
          db.doc(`rejectionPatterns/${testChildId}`).set({
            familyId: testFamilyId,
            childId: testChildId,
            totalRejections: 1,
          })
        )
      })

      it('should deny guardian from updating patterns', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc(`rejectionPatterns/${testChildId}`).set({
            familyId: testFamilyId,
            childId: testChildId,
            totalRejections: 2,
          })
        })

        const guardianContext = testEnv.authenticatedContext('guardian-1', {
          familyId: testFamilyId,
        })
        const db = guardianContext.firestore()

        await assertFails(
          db.doc(`rejectionPatterns/${testChildId}`).update({
            totalRejections: 0,
          })
        )
      })

      it('should deny deletion of patterns', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc(`rejectionPatterns/${testChildId}`).set({
            familyId: testFamilyId,
            childId: testChildId,
            totalRejections: 2,
          })
        })

        const guardianContext = testEnv.authenticatedContext('guardian-1', {
          familyId: testFamilyId,
        })
        const db = guardianContext.firestore()

        await assertFails(db.doc(`rejectionPatterns/${testChildId}`).delete())
      })
    })
  })

  // ============================================
  // rejectionEvents Collection (System-Only for Privacy)
  // ============================================

  describe('rejectionEvents collection', () => {
    describe('read access (all denied for privacy)', () => {
      it('should deny guardian from reading rejection events', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc('rejectionEvents/event-1').set({
            familyId: testFamilyId,
            childId: testChildId,
            proposalId: 'proposal-123',
            rejectedAt: new Date(),
          })
        })

        const guardianContext = testEnv.authenticatedContext('guardian-1', {
          familyId: testFamilyId,
        })
        const db = guardianContext.firestore()

        await assertFails(db.doc('rejectionEvents/event-1').get())
      })

      it('should deny child from reading rejection events', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc('rejectionEvents/event-1').set({
            familyId: testFamilyId,
            childId: testChildId,
            proposalId: 'proposal-123',
            rejectedAt: new Date(),
          })
        })

        const childContext = testEnv.authenticatedContext(testChildId, {
          childId: testChildId,
        })
        const db = childContext.firestore()

        await assertFails(db.doc('rejectionEvents/event-1').get())
      })

      it('should deny unauthenticated users from reading events', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc('rejectionEvents/event-1').set({
            familyId: testFamilyId,
            childId: testChildId,
            proposalId: 'proposal-123',
            rejectedAt: new Date(),
          })
        })

        const unauthContext = testEnv.unauthenticatedContext()
        const db = unauthContext.firestore()

        await assertFails(db.doc('rejectionEvents/event-1').get())
      })
    })

    describe('write access (all denied)', () => {
      it('should deny creating rejection events', async () => {
        const guardianContext = testEnv.authenticatedContext('guardian-1', {
          familyId: testFamilyId,
        })
        const db = guardianContext.firestore()

        await assertFails(
          db.doc('rejectionEvents/event-new').set({
            familyId: testFamilyId,
            childId: testChildId,
            proposalId: 'proposal-123',
            rejectedAt: new Date(),
          })
        )
      })

      it('should deny deleting rejection events', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc('rejectionEvents/event-1').set({
            familyId: testFamilyId,
            childId: testChildId,
            proposalId: 'proposal-123',
            rejectedAt: new Date(),
          })
        })

        const guardianContext = testEnv.authenticatedContext('guardian-1', {
          familyId: testFamilyId,
        })
        const db = guardianContext.firestore()

        await assertFails(db.doc('rejectionEvents/event-1').delete())
      })
    })
  })

  // ============================================
  // escalationEvents Collection (Family-Visible)
  // ============================================

  describe('escalationEvents collection', () => {
    describe('read access', () => {
      it('should allow guardian to read escalations for their family', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc('escalationEvents/esc-1').set({
            familyId: testFamilyId,
            childId: testChildId,
            triggeredAt: new Date(),
            rejectionsCount: 3,
          })
        })

        const guardianContext = testEnv.authenticatedContext('guardian-1', {
          familyId: testFamilyId,
        })
        const db = guardianContext.firestore()

        await assertSucceeds(db.doc('escalationEvents/esc-1').get())
      })

      it('should allow child to read their escalations', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc('escalationEvents/esc-1').set({
            familyId: testFamilyId,
            childId: testChildId,
            triggeredAt: new Date(),
            rejectionsCount: 3,
          })
        })

        const childContext = testEnv.authenticatedContext(testChildId, {
          childId: testChildId,
        })
        const db = childContext.firestore()

        await assertSucceeds(db.doc('escalationEvents/esc-1').get())
      })

      it('should deny other family from reading escalations', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc('escalationEvents/esc-1').set({
            familyId: testFamilyId,
            childId: testChildId,
            triggeredAt: new Date(),
            rejectionsCount: 3,
          })
        })

        const otherGuardianContext = testEnv.authenticatedContext('other-guardian', {
          familyId: otherFamilyId,
        })
        const db = otherGuardianContext.firestore()

        await assertFails(db.doc('escalationEvents/esc-1').get())
      })
    })

    describe('write access (all denied)', () => {
      it('should deny creating escalation events', async () => {
        const guardianContext = testEnv.authenticatedContext('guardian-1', {
          familyId: testFamilyId,
        })
        const db = guardianContext.firestore()

        await assertFails(
          db.doc('escalationEvents/esc-new').set({
            familyId: testFamilyId,
            childId: testChildId,
            triggeredAt: new Date(),
            rejectionsCount: 3,
          })
        )
      })

      it('should deny deleting escalation events', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc('escalationEvents/esc-1').set({
            familyId: testFamilyId,
            childId: testChildId,
            triggeredAt: new Date(),
            rejectionsCount: 3,
          })
        })

        const guardianContext = testEnv.authenticatedContext('guardian-1', {
          familyId: testFamilyId,
        })
        const db = guardianContext.firestore()

        await assertFails(db.doc('escalationEvents/esc-1').delete())
      })
    })
  })

  // ============================================
  // Story 34.5.2: Mediation Resources & Acknowledgments
  // ============================================

  describe('mediationResources collection', () => {
    describe('read access', () => {
      it('should allow authenticated users to read mediation resources', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc('mediationResources/resource-1').set({
            id: 'resource-1',
            type: 'negotiation-tips',
            title: 'How to Talk to Parents',
            ageTier: 'tween-12-14',
          })
        })

        const guardianContext = testEnv.authenticatedContext('guardian-1', {
          familyId: testFamilyId,
        })
        const db = guardianContext.firestore()

        await assertSucceeds(db.doc('mediationResources/resource-1').get())
      })

      it('should deny unauthenticated users from reading resources', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc('mediationResources/resource-1').set({
            id: 'resource-1',
            type: 'negotiation-tips',
            title: 'How to Talk to Parents',
            ageTier: 'tween-12-14',
          })
        })

        const unauthContext = testEnv.unauthenticatedContext()
        const db = unauthContext.firestore()

        await assertFails(db.doc('mediationResources/resource-1').get())
      })
    })

    describe('write access (all denied)', () => {
      it('should deny creating mediation resources', async () => {
        const guardianContext = testEnv.authenticatedContext('guardian-1', {
          familyId: testFamilyId,
        })
        const db = guardianContext.firestore()

        await assertFails(
          db.doc('mediationResources/resource-new').set({
            id: 'resource-new',
            type: 'negotiation-tips',
            title: 'New Resource',
            ageTier: 'teen-15-17',
          })
        )
      })
    })
  })

  describe('escalationAcknowledgments collection', () => {
    describe('read access', () => {
      it('should allow guardian to read acknowledgments for their family', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc('escalationAcknowledgments/ack-1').set({
            familyId: testFamilyId,
            childId: testChildId,
            escalationEventId: 'esc-1',
            acknowledgedAt: new Date(),
          })
        })

        const guardianContext = testEnv.authenticatedContext('guardian-1', {
          familyId: testFamilyId,
        })
        const db = guardianContext.firestore()

        await assertSucceeds(db.doc('escalationAcknowledgments/ack-1').get())
      })

      it('should allow child to read their acknowledgments', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc('escalationAcknowledgments/ack-1').set({
            familyId: testFamilyId,
            childId: testChildId,
            escalationEventId: 'esc-1',
            acknowledgedAt: new Date(),
          })
        })

        const childContext = testEnv.authenticatedContext(testChildId, {
          childId: testChildId,
        })
        const db = childContext.firestore()

        await assertSucceeds(db.doc('escalationAcknowledgments/ack-1').get())
      })

      it('should deny other family from reading acknowledgments', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc('escalationAcknowledgments/ack-1').set({
            familyId: testFamilyId,
            childId: testChildId,
            escalationEventId: 'esc-1',
            acknowledgedAt: new Date(),
          })
        })

        const otherGuardianContext = testEnv.authenticatedContext('other-guardian', {
          familyId: otherFamilyId,
        })
        const db = otherGuardianContext.firestore()

        await assertFails(db.doc('escalationAcknowledgments/ack-1').get())
      })
    })

    describe('create access', () => {
      it('should allow child to create their own acknowledgment', async () => {
        const childContext = testEnv.authenticatedContext(testChildId, {
          childId: testChildId,
        })
        const db = childContext.firestore()

        await assertSucceeds(
          db.doc('escalationAcknowledgments/ack-new').set({
            familyId: testFamilyId,
            childId: testChildId,
            escalationEventId: 'esc-1',
            acknowledgedAt: new Date(),
          })
        )
      })

      it('should deny child from creating acknowledgment for another child', async () => {
        const childContext = testEnv.authenticatedContext(testChildId, {
          childId: testChildId,
        })
        const db = childContext.firestore()

        await assertFails(
          db.doc('escalationAcknowledgments/ack-other').set({
            familyId: testFamilyId,
            childId: 'other-child-id',
            escalationEventId: 'esc-1',
            acknowledgedAt: new Date(),
          })
        )
      })

      it('should deny guardian from creating acknowledgments', async () => {
        const guardianContext = testEnv.authenticatedContext('guardian-1', {
          familyId: testFamilyId,
        })
        const db = guardianContext.firestore()

        await assertFails(
          db.doc('escalationAcknowledgments/ack-guardian').set({
            familyId: testFamilyId,
            childId: testChildId,
            escalationEventId: 'esc-1',
            acknowledgedAt: new Date(),
          })
        )
      })
    })

    describe('update/delete access (all denied)', () => {
      it('should deny updating acknowledgments', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc('escalationAcknowledgments/ack-1').set({
            familyId: testFamilyId,
            childId: testChildId,
            escalationEventId: 'esc-1',
            acknowledgedAt: new Date(),
          })
        })

        const childContext = testEnv.authenticatedContext(testChildId, {
          childId: testChildId,
        })
        const db = childContext.firestore()

        await assertFails(
          db.doc('escalationAcknowledgments/ack-1').update({
            viewedResources: true,
          })
        )
      })

      it('should deny deleting acknowledgments', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc('escalationAcknowledgments/ack-1').set({
            familyId: testFamilyId,
            childId: testChildId,
            escalationEventId: 'esc-1',
            acknowledgedAt: new Date(),
          })
        })

        const childContext = testEnv.authenticatedContext(testChildId, {
          childId: testChildId,
        })
        const db = childContext.firestore()

        await assertFails(db.doc('escalationAcknowledgments/ack-1').delete())
      })
    })
  })
})
