/**
 * FamilyMeetingReminder Firestore Security Rules Tests - Story 34.5.4 Task 6
 *
 * Adversarial security rule tests for familyMeetingReminders collection.
 * AC4: Meeting Reminder (Optional)
 *
 * Tests verify:
 * - Read: Family members only (via familyId claim)
 * - Create: Family members can create for their family
 * - Update: Creator or family guardian can update
 * - Delete: Not allowed (keep audit trail)
 */

import { describe, it, beforeAll, afterAll } from 'vitest'
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing'
import * as fs from 'fs'
import * as path from 'path'

let testEnv: RulesTestEnvironment

describe('FamilyMeetingReminder Security Rules - Story 34.5.4', () => {
  beforeAll(async () => {
    const rulesPath = path.resolve(__dirname, '../firestore.rules')
    const rules = fs.readFileSync(rulesPath, 'utf8')

    testEnv = await initializeTestEnvironment({
      projectId: 'test-family-meeting-reminders',
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
  // Read Tests
  // ============================================

  describe('Read Access', () => {
    it('should allow family guardian to read reminders for their family', async () => {
      const familyId = 'family-123'

      // Set up test data
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('familyMeetingReminders').doc('reminder-1').set({
          familyId,
          scheduledAt: new Date(),
          createdAt: new Date(),
          createdBy: 'child-456',
          templateId: 'template-001',
          ageTier: 'tween-12-14',
          status: 'pending',
        })
      })

      // Test with guardian context
      const guardianContext = testEnv.authenticatedContext('guardian-123', {
        familyId,
        role: 'parent',
      })

      await assertSucceeds(
        guardianContext.firestore().collection('familyMeetingReminders').doc('reminder-1').get()
      )
    })

    it('should allow child to read reminders for their family', async () => {
      const familyId = 'family-456'
      const childId = 'child-789'

      // Set up test data
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('familyMeetingReminders').doc('reminder-2').set({
          familyId,
          scheduledAt: new Date(),
          createdAt: new Date(),
          createdBy: childId,
          templateId: 'template-001',
          ageTier: 'tween-12-14',
          status: 'pending',
        })
      })

      // Test with child context
      const childContext = testEnv.authenticatedContext(childId, {
        familyId,
        childId,
      })

      await assertSucceeds(
        childContext.firestore().collection('familyMeetingReminders').doc('reminder-2').get()
      )
    })

    it('should deny read to user from different family', async () => {
      const familyId = 'family-123'

      // Set up test data
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('familyMeetingReminders').doc('reminder-3').set({
          familyId,
          scheduledAt: new Date(),
          createdAt: new Date(),
          createdBy: 'child-456',
          templateId: 'template-001',
          ageTier: 'tween-12-14',
          status: 'pending',
        })
      })

      // Test with user from different family
      const otherFamilyContext = testEnv.authenticatedContext('other-user', {
        familyId: 'other-family',
      })

      await assertFails(
        otherFamilyContext.firestore().collection('familyMeetingReminders').doc('reminder-3').get()
      )
    })

    it('should deny read to unauthenticated users', async () => {
      // Set up test data
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('familyMeetingReminders').doc('reminder-4').set({
          familyId: 'family-123',
          scheduledAt: new Date(),
          createdAt: new Date(),
          createdBy: 'child-456',
          templateId: 'template-001',
          ageTier: 'tween-12-14',
          status: 'pending',
        })
      })

      // Test without authentication
      const unauthContext = testEnv.unauthenticatedContext()

      await assertFails(
        unauthContext.firestore().collection('familyMeetingReminders').doc('reminder-4').get()
      )
    })
  })

  // ============================================
  // Create Tests
  // ============================================

  describe('Create Access', () => {
    it('should allow family member to create reminder for their family', async () => {
      const familyId = 'family-create-1'
      const childId = 'child-create-1'

      const childContext = testEnv.authenticatedContext(childId, {
        familyId,
        childId,
      })

      await assertSucceeds(
        childContext
          .firestore()
          .collection('familyMeetingReminders')
          .add({
            familyId,
            scheduledAt: new Date('2024-01-15T18:00:00Z'),
            createdAt: new Date(),
            createdBy: childId,
            templateId: 'template-001',
            ageTier: 'tween-12-14',
            status: 'pending',
            notificationSentAt: null,
          })
      )
    })

    it('should deny creating reminder for different family', async () => {
      const childContext = testEnv.authenticatedContext('child-123', {
        familyId: 'family-A',
        childId: 'child-123',
      })

      await assertFails(
        childContext.firestore().collection('familyMeetingReminders').add({
          familyId: 'family-B', // Different family!
          scheduledAt: new Date(),
          createdAt: new Date(),
          createdBy: 'child-123',
          templateId: 'template-001',
          ageTier: 'tween-12-14',
          status: 'pending',
        })
      )
    })

    it('should deny unauthenticated user from creating reminder', async () => {
      const unauthContext = testEnv.unauthenticatedContext()

      await assertFails(
        unauthContext.firestore().collection('familyMeetingReminders').add({
          familyId: 'family-123',
          scheduledAt: new Date(),
          createdAt: new Date(),
          createdBy: 'child-456',
          templateId: 'template-001',
          ageTier: 'tween-12-14',
          status: 'pending',
        })
      )
    })
  })

  // ============================================
  // Update Tests
  // ============================================

  describe('Update Access', () => {
    it('should allow creator to update their reminder', async () => {
      const familyId = 'family-update-1'
      const childId = 'child-update-1'

      // Set up test data
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection('familyMeetingReminders')
          .doc('reminder-update-1')
          .set({
            familyId,
            scheduledAt: new Date(),
            createdAt: new Date(),
            createdBy: childId,
            templateId: 'template-001',
            ageTier: 'tween-12-14',
            status: 'pending',
          })
      })

      const creatorContext = testEnv.authenticatedContext(childId, {
        familyId,
        childId,
      })

      await assertSucceeds(
        creatorContext
          .firestore()
          .collection('familyMeetingReminders')
          .doc('reminder-update-1')
          .update({ status: 'cancelled' })
      )
    })

    it('should allow family guardian to update any reminder in their family', async () => {
      const familyId = 'family-update-2'

      // Set up test data (created by child)
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection('familyMeetingReminders')
          .doc('reminder-update-2')
          .set({
            familyId,
            scheduledAt: new Date(),
            createdAt: new Date(),
            createdBy: 'child-xyz',
            templateId: 'template-001',
            ageTier: 'tween-12-14',
            status: 'pending',
          })
      })

      // Guardian can update
      const guardianContext = testEnv.authenticatedContext('guardian-xyz', {
        familyId,
        role: 'parent',
      })

      await assertSucceeds(
        guardianContext
          .firestore()
          .collection('familyMeetingReminders')
          .doc('reminder-update-2')
          .update({ status: 'acknowledged' })
      )
    })

    it('should deny user from different family from updating', async () => {
      const familyId = 'family-update-3'

      // Set up test data
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection('familyMeetingReminders')
          .doc('reminder-update-3')
          .set({
            familyId,
            scheduledAt: new Date(),
            createdAt: new Date(),
            createdBy: 'child-abc',
            templateId: 'template-001',
            ageTier: 'tween-12-14',
            status: 'pending',
          })
      })

      // User from different family should be denied
      const otherContext = testEnv.authenticatedContext('attacker', {
        familyId: 'other-family',
      })

      await assertFails(
        otherContext
          .firestore()
          .collection('familyMeetingReminders')
          .doc('reminder-update-3')
          .update({ status: 'cancelled' })
      )
    })
  })

  // ============================================
  // Delete Tests
  // ============================================

  describe('Delete Access', () => {
    it('should deny deletion to preserve audit trail', async () => {
      const familyId = 'family-delete-1'
      const childId = 'child-delete-1'

      // Set up test data
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection('familyMeetingReminders')
          .doc('reminder-delete-1')
          .set({
            familyId,
            scheduledAt: new Date(),
            createdAt: new Date(),
            createdBy: childId,
            templateId: 'template-001',
            ageTier: 'tween-12-14',
            status: 'pending',
          })
      })

      // Even creator cannot delete
      const creatorContext = testEnv.authenticatedContext(childId, {
        familyId,
        childId,
      })

      await assertFails(
        creatorContext
          .firestore()
          .collection('familyMeetingReminders')
          .doc('reminder-delete-1')
          .delete()
      )
    })

    it('should deny deletion even by guardian', async () => {
      const familyId = 'family-delete-2'

      // Set up test data
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection('familyMeetingReminders')
          .doc('reminder-delete-2')
          .set({
            familyId,
            scheduledAt: new Date(),
            createdAt: new Date(),
            createdBy: 'child-xyz',
            templateId: 'template-001',
            ageTier: 'tween-12-14',
            status: 'pending',
          })
      })

      // Guardian cannot delete
      const guardianContext = testEnv.authenticatedContext('guardian-xyz', {
        familyId,
        role: 'parent',
      })

      await assertFails(
        guardianContext
          .firestore()
          .collection('familyMeetingReminders')
          .doc('reminder-delete-2')
          .delete()
      )
    })
  })

  // ============================================
  // Adversarial Tests
  // ============================================

  describe('Adversarial Tests', () => {
    it('should prevent ID guessing to access other families', async () => {
      // Set up reminder in a specific family
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('familyMeetingReminders').doc('secret-reminder').set({
          familyId: 'secret-family',
          scheduledAt: new Date(),
          createdAt: new Date(),
          createdBy: 'secret-child',
          templateId: 'template-001',
          ageTier: 'tween-12-14',
          status: 'pending',
        })
      })

      // Attacker tries to guess document ID
      const attackerContext = testEnv.authenticatedContext('attacker', {
        familyId: 'attacker-family',
      })

      await assertFails(
        attackerContext
          .firestore()
          .collection('familyMeetingReminders')
          .doc('secret-reminder')
          .get()
      )
    })

    it('should prevent spoofing createdBy field', async () => {
      const childContext = testEnv.authenticatedContext('child-real', {
        familyId: 'family-123',
        childId: 'child-real',
      })

      // Try to create reminder claiming to be created by someone else
      await assertFails(
        childContext.firestore().collection('familyMeetingReminders').add({
          familyId: 'family-123',
          scheduledAt: new Date(),
          createdAt: new Date(),
          createdBy: 'admin-impersonated', // Trying to impersonate!
          templateId: 'template-001',
          ageTier: 'tween-12-14',
          status: 'pending',
        })
      )
    })

    it('should prevent modifying familyId after creation', async () => {
      const familyId = 'family-immutable'
      const childId = 'child-immutable'

      // Set up test data
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection('familyMeetingReminders')
          .doc('reminder-immutable')
          .set({
            familyId,
            scheduledAt: new Date(),
            createdAt: new Date(),
            createdBy: childId,
            templateId: 'template-001',
            ageTier: 'tween-12-14',
            status: 'pending',
          })
      })

      const creatorContext = testEnv.authenticatedContext(childId, {
        familyId,
        childId,
      })

      // Try to change familyId (should fail)
      await assertFails(
        creatorContext
          .firestore()
          .collection('familyMeetingReminders')
          .doc('reminder-immutable')
          .update({ familyId: 'hijacked-family' })
      )
    })
  })
})
