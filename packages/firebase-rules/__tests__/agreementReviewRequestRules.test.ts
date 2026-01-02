/**
 * Agreement Review Request Security Rules Tests - Story 34.5.3 Task 8
 *
 * Adversarial security tests for agreement review request collections.
 * AC6: Request history visible to both parties (transparency)
 *
 * CRITICAL DESIGN PRINCIPLE: Invitation, not demand
 * - Children can create requests for themselves only
 * - Parents can acknowledge/update requests
 * - History is preserved for audit trail (no deletion)
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
import { Timestamp } from 'firebase/firestore'

describe('agreementReviewRequestRules - Story 34.5.3', () => {
  let testEnv: RulesTestEnvironment
  const testFamilyId = 'family-123'
  const testChildId = 'child-456'
  const testAgreementId = 'agreement-789'
  const otherFamilyId = 'family-other'
  const otherChildId = 'child-other'

  beforeAll(async () => {
    const rulesPath = join(__dirname, '..', 'firestore.rules')
    const rules = readFileSync(rulesPath, 'utf8')

    testEnv = await initializeTestEnvironment({
      projectId: 'agreement-review-request-rules-test',
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
  // agreementReviewRequests Collection
  // AC6: Request history visible to both parties
  // ============================================

  describe('agreementReviewRequests collection', () => {
    // ----------------------------------------
    // READ ACCESS TESTS (AC6: Transparency)
    // ----------------------------------------
    describe('read access', () => {
      it('should allow guardian to read their family review requests', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc(`agreementReviewRequests/request-1`).set({
            familyId: testFamilyId,
            childId: testChildId,
            agreementId: testAgreementId,
            status: 'pending',
            requestedAt: Timestamp.now(),
          })
        })

        const guardianContext = testEnv.authenticatedContext('guardian-1', {
          familyId: testFamilyId,
        })
        const db = guardianContext.firestore()

        await assertSucceeds(db.doc(`agreementReviewRequests/request-1`).get())
      })

      it('should allow child to read their own review requests', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc(`agreementReviewRequests/request-2`).set({
            familyId: testFamilyId,
            childId: testChildId,
            agreementId: testAgreementId,
            status: 'pending',
            requestedAt: Timestamp.now(),
          })
        })

        const childContext = testEnv.authenticatedContext(testChildId, {
          childId: testChildId,
        })
        const db = childContext.firestore()

        await assertSucceeds(db.doc(`agreementReviewRequests/request-2`).get())
      })

      it('should deny guardian from other family reading requests', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc(`agreementReviewRequests/request-3`).set({
            familyId: testFamilyId,
            childId: testChildId,
            agreementId: testAgreementId,
            status: 'pending',
            requestedAt: Timestamp.now(),
          })
        })

        const otherGuardianContext = testEnv.authenticatedContext('other-guardian', {
          familyId: otherFamilyId,
        })
        const db = otherGuardianContext.firestore()

        await assertFails(db.doc(`agreementReviewRequests/request-3`).get())
      })

      it('should deny other child from reading requests (privacy)', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc(`agreementReviewRequests/request-4`).set({
            familyId: testFamilyId,
            childId: testChildId,
            agreementId: testAgreementId,
            status: 'pending',
            requestedAt: Timestamp.now(),
          })
        })

        const otherChildContext = testEnv.authenticatedContext(otherChildId, {
          childId: otherChildId,
        })
        const db = otherChildContext.firestore()

        await assertFails(db.doc(`agreementReviewRequests/request-4`).get())
      })

      it('should deny unauthenticated users from reading requests', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc(`agreementReviewRequests/request-5`).set({
            familyId: testFamilyId,
            childId: testChildId,
            agreementId: testAgreementId,
            status: 'pending',
            requestedAt: Timestamp.now(),
          })
        })

        const unauthContext = testEnv.unauthenticatedContext()
        const db = unauthContext.firestore()

        await assertFails(db.doc(`agreementReviewRequests/request-5`).get())
      })
    })

    // ----------------------------------------
    // CREATE ACCESS TESTS (AC1: Child initiates)
    // ----------------------------------------
    describe('create access', () => {
      it('should allow child to create review request for themselves', async () => {
        const childContext = testEnv.authenticatedContext(testChildId, {
          childId: testChildId,
        })
        const db = childContext.firestore()

        await assertSucceeds(
          db.doc('agreementReviewRequests/request-new-1').set({
            familyId: testFamilyId,
            childId: testChildId,
            agreementId: testAgreementId,
            requestedAt: Timestamp.now(),
            status: 'pending',
          })
        )
      })

      it('should deny child from creating request for another child', async () => {
        const childContext = testEnv.authenticatedContext(testChildId, {
          childId: testChildId,
        })
        const db = childContext.firestore()

        await assertFails(
          db.doc('agreementReviewRequests/request-impersonate').set({
            familyId: testFamilyId,
            childId: otherChildId, // Trying to impersonate another child
            agreementId: testAgreementId,
            requestedAt: Timestamp.now(),
            status: 'pending',
          })
        )
      })

      it('should deny child from creating request with non-pending status', async () => {
        const childContext = testEnv.authenticatedContext(testChildId, {
          childId: testChildId,
        })
        const db = childContext.firestore()

        await assertFails(
          db.doc('agreementReviewRequests/request-status-bypass').set({
            familyId: testFamilyId,
            childId: testChildId,
            agreementId: testAgreementId,
            requestedAt: Timestamp.now(),
            status: 'acknowledged', // Trying to bypass pending status
          })
        )
      })

      it('should deny guardian from creating review requests', async () => {
        const guardianContext = testEnv.authenticatedContext('guardian-1', {
          familyId: testFamilyId,
          role: 'parent',
        })
        const db = guardianContext.firestore()

        await assertFails(
          db.doc('agreementReviewRequests/request-guardian-create').set({
            familyId: testFamilyId,
            childId: testChildId,
            agreementId: testAgreementId,
            requestedAt: Timestamp.now(),
            status: 'pending',
          })
        )
      })

      it('should deny unauthenticated users from creating requests', async () => {
        const unauthContext = testEnv.unauthenticatedContext()
        const db = unauthContext.firestore()

        await assertFails(
          db.doc('agreementReviewRequests/request-unauth').set({
            familyId: testFamilyId,
            childId: testChildId,
            agreementId: testAgreementId,
            requestedAt: Timestamp.now(),
            status: 'pending',
          })
        )
      })

      it('should require familyId to be a string', async () => {
        const childContext = testEnv.authenticatedContext(testChildId, {
          childId: testChildId,
        })
        const db = childContext.firestore()

        await assertFails(
          db.doc('agreementReviewRequests/request-invalid-family').set({
            familyId: 123, // Not a string
            childId: testChildId,
            agreementId: testAgreementId,
            requestedAt: Timestamp.now(),
            status: 'pending',
          })
        )
      })

      it('should require agreementId to be a string', async () => {
        const childContext = testEnv.authenticatedContext(testChildId, {
          childId: testChildId,
        })
        const db = childContext.firestore()

        await assertFails(
          db.doc('agreementReviewRequests/request-invalid-agreement').set({
            familyId: testFamilyId,
            childId: testChildId,
            agreementId: null, // Not a string
            requestedAt: Timestamp.now(),
            status: 'pending',
          })
        )
      })

      it('should require requestedAt to be a timestamp', async () => {
        const childContext = testEnv.authenticatedContext(testChildId, {
          childId: testChildId,
        })
        const db = childContext.firestore()

        await assertFails(
          db.doc('agreementReviewRequests/request-invalid-date').set({
            familyId: testFamilyId,
            childId: testChildId,
            agreementId: testAgreementId,
            requestedAt: '2024-01-15', // String, not timestamp
            status: 'pending',
          })
        )
      })
    })

    // ----------------------------------------
    // UPDATE ACCESS TESTS (AC2: Parent acknowledges)
    // ----------------------------------------
    describe('update access', () => {
      it('should allow parent to update review request status', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc('agreementReviewRequests/request-update-1').set({
            familyId: testFamilyId,
            childId: testChildId,
            agreementId: testAgreementId,
            status: 'pending',
            requestedAt: Timestamp.now(),
          })
        })

        const parentContext = testEnv.authenticatedContext('parent-1', {
          familyId: testFamilyId,
          role: 'parent',
        })
        const db = parentContext.firestore()

        await assertSucceeds(
          db.doc('agreementReviewRequests/request-update-1').update({
            status: 'acknowledged',
            acknowledgedAt: Timestamp.now(),
          })
        )
      })

      it('should deny child from updating request status', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc('agreementReviewRequests/request-child-update').set({
            familyId: testFamilyId,
            childId: testChildId,
            agreementId: testAgreementId,
            status: 'pending',
            requestedAt: Timestamp.now(),
          })
        })

        const childContext = testEnv.authenticatedContext(testChildId, {
          childId: testChildId,
        })
        const db = childContext.firestore()

        await assertFails(
          db.doc('agreementReviewRequests/request-child-update').update({
            status: 'acknowledged',
          })
        )
      })

      it('should deny parent from other family updating requests', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc('agreementReviewRequests/request-other-family').set({
            familyId: testFamilyId,
            childId: testChildId,
            agreementId: testAgreementId,
            status: 'pending',
            requestedAt: Timestamp.now(),
          })
        })

        const otherParentContext = testEnv.authenticatedContext('other-parent', {
          familyId: otherFamilyId,
          role: 'parent',
        })
        const db = otherParentContext.firestore()

        await assertFails(
          db.doc('agreementReviewRequests/request-other-family').update({
            status: 'acknowledged',
          })
        )
      })

      it('should deny user without parent role from updating', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc('agreementReviewRequests/request-no-role').set({
            familyId: testFamilyId,
            childId: testChildId,
            agreementId: testAgreementId,
            status: 'pending',
            requestedAt: Timestamp.now(),
          })
        })

        const guardianNoRole = testEnv.authenticatedContext('guardian-no-role', {
          familyId: testFamilyId,
          // Note: No 'role' claim
        })
        const db = guardianNoRole.firestore()

        await assertFails(
          db.doc('agreementReviewRequests/request-no-role').update({
            status: 'acknowledged',
          })
        )
      })
    })

    // ----------------------------------------
    // DELETE ACCESS TESTS (Always denied for audit)
    // ----------------------------------------
    describe('delete access (all denied for audit trail)', () => {
      it('should deny child from deleting their request', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc('agreementReviewRequests/request-delete-1').set({
            familyId: testFamilyId,
            childId: testChildId,
            agreementId: testAgreementId,
            status: 'pending',
            requestedAt: Timestamp.now(),
          })
        })

        const childContext = testEnv.authenticatedContext(testChildId, {
          childId: testChildId,
        })
        const db = childContext.firestore()

        await assertFails(db.doc('agreementReviewRequests/request-delete-1').delete())
      })

      it('should deny parent from deleting requests', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc('agreementReviewRequests/request-delete-2').set({
            familyId: testFamilyId,
            childId: testChildId,
            agreementId: testAgreementId,
            status: 'acknowledged',
            requestedAt: Timestamp.now(),
          })
        })

        const parentContext = testEnv.authenticatedContext('parent-1', {
          familyId: testFamilyId,
          role: 'parent',
        })
        const db = parentContext.firestore()

        await assertFails(db.doc('agreementReviewRequests/request-delete-2').delete())
      })
    })
  })

  // ============================================
  // reviewRequestNotifications Collection
  // AC2: Non-confrontational notification to parent
  // ============================================

  describe('reviewRequestNotifications collection', () => {
    describe('read access', () => {
      it('should allow guardian to read their family notifications', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc('reviewRequestNotifications/notif-1').set({
            familyId: testFamilyId,
            childId: testChildId,
            requestId: 'request-123',
            message: 'Alex is inviting you to discuss the agreement',
          })
        })

        const guardianContext = testEnv.authenticatedContext('guardian-1', {
          familyId: testFamilyId,
        })
        const db = guardianContext.firestore()

        await assertSucceeds(db.doc('reviewRequestNotifications/notif-1').get())
      })

      it('should deny guardian from other family reading notifications', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc('reviewRequestNotifications/notif-2').set({
            familyId: testFamilyId,
            childId: testChildId,
            requestId: 'request-123',
            message: 'Alex is inviting you to discuss the agreement',
          })
        })

        const otherGuardianContext = testEnv.authenticatedContext('other-guardian', {
          familyId: otherFamilyId,
        })
        const db = otherGuardianContext.firestore()

        await assertFails(db.doc('reviewRequestNotifications/notif-2').get())
      })

      it('should deny unauthenticated users from reading notifications', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc('reviewRequestNotifications/notif-3').set({
            familyId: testFamilyId,
            childId: testChildId,
            requestId: 'request-123',
            message: 'Test notification',
          })
        })

        const unauthContext = testEnv.unauthenticatedContext()
        const db = unauthContext.firestore()

        await assertFails(db.doc('reviewRequestNotifications/notif-3').get())
      })
    })

    describe('write access (all denied - Cloud Functions only)', () => {
      it('should deny child from creating notifications', async () => {
        const childContext = testEnv.authenticatedContext(testChildId, {
          childId: testChildId,
        })
        const db = childContext.firestore()

        await assertFails(
          db.doc('reviewRequestNotifications/notif-child-create').set({
            familyId: testFamilyId,
            childId: testChildId,
            requestId: 'request-123',
            message: 'Fake notification',
          })
        )
      })

      it('should deny guardian from creating notifications', async () => {
        const guardianContext = testEnv.authenticatedContext('guardian-1', {
          familyId: testFamilyId,
        })
        const db = guardianContext.firestore()

        await assertFails(
          db.doc('reviewRequestNotifications/notif-guardian-create').set({
            familyId: testFamilyId,
            childId: testChildId,
            requestId: 'request-123',
            message: 'Fake notification from guardian',
          })
        )
      })

      it('should deny updating notifications', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc('reviewRequestNotifications/notif-update').set({
            familyId: testFamilyId,
            childId: testChildId,
            requestId: 'request-123',
            message: 'Original message',
          })
        })

        const guardianContext = testEnv.authenticatedContext('guardian-1', {
          familyId: testFamilyId,
        })
        const db = guardianContext.firestore()

        await assertFails(
          db.doc('reviewRequestNotifications/notif-update').update({
            message: 'Tampered message',
          })
        )
      })

      it('should deny deleting notifications', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc('reviewRequestNotifications/notif-delete').set({
            familyId: testFamilyId,
            childId: testChildId,
            requestId: 'request-123',
            message: 'Test notification',
          })
        })

        const guardianContext = testEnv.authenticatedContext('guardian-1', {
          familyId: testFamilyId,
        })
        const db = guardianContext.firestore()

        await assertFails(db.doc('reviewRequestNotifications/notif-delete').delete())
      })
    })
  })

  // ============================================
  // Cross-Collection Adversarial Tests
  // ============================================

  describe('adversarial cross-family attacks', () => {
    it('should prevent ID guessing attack on review requests', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().doc('agreementReviewRequests/secret-request-xyz').set({
          familyId: testFamilyId,
          childId: testChildId,
          agreementId: testAgreementId,
          status: 'pending',
          requestedAt: Timestamp.now(),
        })
      })

      // Attacker tries random IDs from another family
      const attackerContext = testEnv.authenticatedContext('attacker', {
        familyId: otherFamilyId,
      })
      const db = attackerContext.firestore()

      // All ID guesses should fail
      await assertFails(db.doc('agreementReviewRequests/secret-request-xyz').get())
      await assertFails(db.doc('agreementReviewRequests/request-1').get())
      await assertFails(db.doc('agreementReviewRequests/request-abc').get())
    })

    it('should prevent token claim spoofing attack', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().doc('agreementReviewRequests/target-request').set({
          familyId: testFamilyId,
          childId: testChildId,
          agreementId: testAgreementId,
          status: 'pending',
          requestedAt: Timestamp.now(),
        })
      })

      // Attacker claims to have familyId but with different uid
      // Firebase rules verify claims from trusted token
      const spoofedContext = testEnv.authenticatedContext('attacker-uid', {
        familyId: otherFamilyId, // Can't actually spoof this to testFamilyId
      })
      const db = spoofedContext.firestore()

      await assertFails(db.doc('agreementReviewRequests/target-request').get())
    })
  })
})
