/**
 * Graduation Process Integration Tests - Story 38.3 Task 10
 *
 * Integration tests for the complete graduation process.
 * Tests the full flow from decision to celebration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  initiateGraduationDecision,
  recordGraduationConfirmation,
  executeGraduation,
  getGraduationDecision,
  clearAllGraduationData,
} from '@fledgely/shared'
import { transitionToAlumni, isAlumni, getAlumniRecord, clearAllAlumniData } from '@fledgely/shared'
import {
  queueDataForDeletion,
  getDeletionQueueStatus,
  clearAllDeletionData,
  DELETION_DATA_TYPES,
} from '@fledgely/shared'
import { generateCertificate, getCertificate, clearAllCertificateData } from '@fledgely/shared'
import { getGraduationCelebrationMessage, getAchievementSummary } from '@fledgely/shared'
import { GRADUATION_RETENTION_DAYS } from '@fledgely/shared'
import GraduationConfirmationFlow from './GraduationConfirmationFlow'
import GraduationCelebration from './GraduationCelebration'
import AlumniStatusBadge from './AlumniStatusBadge'

describe('Graduation Process Integration Tests - Story 38.3 Task 10', () => {
  beforeEach(() => {
    clearAllGraduationData()
    clearAllAlumniData()
    clearAllDeletionData()
    clearAllCertificateData()
  })

  // ============================================
  // Complete Flow Tests
  // ============================================

  describe('Complete Flow: Decision → Confirmation → Celebration', () => {
    it('should complete full graduation flow', () => {
      // Step 1: Initiate graduation decision
      const decision = initiateGraduationDecision({
        conversationId: 'conv-123',
        childId: 'child-456',
        familyId: 'family-789',
        requiredParentIds: ['parent-1', 'parent-2'],
      })
      expect(decision.status).toBe('pending')

      // Step 2: Child confirms
      const afterChildConfirm = recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'child-456',
        role: 'child',
        graduationType: 'immediate',
        scheduledDate: null,
      })
      expect(afterChildConfirm.childConfirmation).not.toBeNull()

      // Step 3: First parent confirms
      const afterParent1 = recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'parent-1',
        role: 'parent',
        graduationType: 'immediate',
        scheduledDate: null,
      })
      expect(afterParent1.parentConfirmations.length).toBe(1)

      // Step 4: Second parent confirms
      const afterParent2 = recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'parent-2',
        role: 'parent',
        graduationType: 'immediate',
        scheduledDate: null,
      })
      expect(afterParent2.parentConfirmations.length).toBe(2)
      expect(afterParent2.status).toBe('confirmed')

      // Step 5: Execute graduation
      const result = executeGraduation(decision.id)
      expect(result.success).toBe(true)

      // Verify final state
      const finalDecision = getGraduationDecision(decision.id)
      expect(finalDecision?.status).toBe('completed')
    })

    it('should transition child to alumni after graduation', () => {
      // Complete graduation process
      const decision = initiateGraduationDecision({
        conversationId: 'conv-123',
        childId: 'child-456',
        familyId: 'family-789',
        requiredParentIds: ['parent-1'],
      })
      recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'child-456',
        role: 'child',
        graduationType: 'immediate',
        scheduledDate: null,
      })
      recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'parent-1',
        role: 'parent',
        graduationType: 'immediate',
        scheduledDate: null,
      })
      executeGraduation(decision.id)

      // Note: executeGraduation doesn't automatically transition to alumni
      // That would be done by a higher-level orchestrator
      // For this test, manually transition to verify the flow works
      transitionToAlumni('child-456', 'family-789', {
        monitoringStartDate: new Date('2023-06-15'),
        totalMonitoringMonths: 24,
        finalTrustScore: 100,
        certificateId: 'cert-123',
        graduationDate: new Date(),
      })

      // Verify alumni status
      expect(isAlumni('child-456')).toBe(true)
      const record = getAlumniRecord('child-456')
      expect(record).not.toBeNull()
    })

    it('should queue data for deletion after graduation', () => {
      // Complete graduation process
      const decision = initiateGraduationDecision({
        conversationId: 'conv-123',
        childId: 'child-456',
        familyId: 'family-789',
        requiredParentIds: ['parent-1'],
      })
      recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'child-456',
        role: 'child',
        graduationType: 'immediate',
        scheduledDate: null,
      })
      recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'parent-1',
        role: 'parent',
        graduationType: 'immediate',
        scheduledDate: null,
      })
      executeGraduation(decision.id)

      // Note: executeGraduation doesn't automatically queue deletion
      // That would be done by a higher-level orchestrator
      // For this test, manually queue to verify the flow works
      queueDataForDeletion('child-456', 'family-789', GRADUATION_RETENTION_DAYS)

      // Verify deletion queue
      const deletionEntries = getDeletionQueueStatus('child-456')
      expect(deletionEntries.length).toBeGreaterThan(0)
      expect(deletionEntries.every((e) => e.status === 'queued')).toBe(true)
    })

    it('should generate certificate after graduation', () => {
      // Complete graduation process
      const decision = initiateGraduationDecision({
        conversationId: 'conv-123',
        childId: 'child-456',
        familyId: 'family-789',
        requiredParentIds: ['parent-1'],
      })
      recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'child-456',
        role: 'child',
        graduationType: 'immediate',
        scheduledDate: null,
      })
      recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'parent-1',
        role: 'parent',
        graduationType: 'immediate',
        scheduledDate: null,
      })
      executeGraduation(decision.id)

      // Note: executeGraduation doesn't automatically generate certificate
      // That would be done by a higher-level orchestrator
      // For this test, manually generate to verify the flow works
      const cert = generateCertificate('child-456', 'family-789', 'Alex', {
        graduationDate: new Date(),
        monthsAtPerfectTrust: 12,
        totalMonitoringDuration: 24,
      })

      // Verify certificate
      expect(cert.id).toBeDefined()
      expect(cert.childId).toBe('child-456')
      const retrieved = getCertificate(cert.id)
      expect(retrieved).not.toBeNull()
    })
  })

  // ============================================
  // Dual-Consent Tests (AC1)
  // ============================================

  describe('Dual-Consent Requirement', () => {
    it('should not confirm until all parties have confirmed', () => {
      const decision = initiateGraduationDecision({
        conversationId: 'conv-123',
        childId: 'child-456',
        familyId: 'family-789',
        requiredParentIds: ['parent-1', 'parent-2'],
      })

      // Only child confirms
      const afterChild = recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'child-456',
        role: 'child',
        graduationType: 'immediate',
        scheduledDate: null,
      })
      expect(afterChild.status).toBe('pending')

      // One parent confirms
      const afterParent1 = recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'parent-1',
        role: 'parent',
        graduationType: 'immediate',
        scheduledDate: null,
      })
      expect(afterParent1.status).toBe('pending')

      // Second parent confirms - now should be confirmed
      const afterParent2 = recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'parent-2',
        role: 'parent',
        graduationType: 'immediate',
        scheduledDate: null,
      })
      expect(afterParent2.status).toBe('confirmed')
    })

    it('should require child confirmation even if all parents confirmed', () => {
      const decision = initiateGraduationDecision({
        conversationId: 'conv-123',
        childId: 'child-456',
        familyId: 'family-789',
        requiredParentIds: ['parent-1'],
      })

      // Only parent confirms
      const afterParent = recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'parent-1',
        role: 'parent',
        graduationType: 'immediate',
        scheduledDate: null,
      })
      expect(afterParent.status).toBe('pending')

      // Now child confirms
      const afterChild = recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'child-456',
        role: 'child',
        graduationType: 'immediate',
        scheduledDate: null,
      })
      expect(afterChild.status).toBe('confirmed')
    })
  })

  // ============================================
  // Immediate vs Scheduled Tests (AC2)
  // ============================================

  describe('Immediate vs Scheduled Graduation', () => {
    it('should process immediate graduation instantly', () => {
      const decision = initiateGraduationDecision({
        conversationId: 'conv-123',
        childId: 'child-456',
        familyId: 'family-789',
        requiredParentIds: ['parent-1'],
      })
      recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'child-456',
        role: 'child',
        graduationType: 'immediate',
        scheduledDate: null,
      })
      recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'parent-1',
        role: 'parent',
        graduationType: 'immediate',
        scheduledDate: null,
      })

      const result = executeGraduation(decision.id)

      expect(result.success).toBe(true)
      // Note: executeGraduation doesn't automatically transition to alumni
      // The alumni transition is a separate step
    })

    it('should respect scheduled date preferences', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)

      const decision = initiateGraduationDecision({
        conversationId: 'conv-123',
        childId: 'child-456',
        familyId: 'family-789',
        requiredParentIds: ['parent-1'],
      })
      recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'child-456',
        role: 'child',
        graduationType: 'scheduled',
        scheduledDate: futureDate,
      })
      recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'parent-1',
        role: 'parent',
        graduationType: 'scheduled',
        scheduledDate: futureDate,
      })

      const confirmed = getGraduationDecision(decision.id)
      expect(confirmed?.graduationType).toBe('scheduled')
      expect(confirmed?.scheduledDate).not.toBeNull()
    })
  })

  // ============================================
  // Celebration Display Tests (AC3)
  // ============================================

  describe('Celebration Display', () => {
    it('should show correct celebration message for child', () => {
      const message = getGraduationCelebrationMessage('child', 'Alex')
      expect(message).toMatch(/graduated/i)
    })

    it('should show correct celebration message for parent', () => {
      const message = getGraduationCelebrationMessage('parent', 'Alex')
      expect(message).toMatch(/Alex/i)
    })

    it('should display achievement summary', () => {
      const summary = getAchievementSummary(12, 24)
      expect(summary).toMatch(/12/)
      expect(summary).toMatch(/24/)
    })
  })

  // ============================================
  // Data Deletion Queue Tests (AC5)
  // ============================================

  describe('Data Deletion Queue', () => {
    it('should queue all data types for deletion', () => {
      const entries = queueDataForDeletion('child-456', 'family-789', GRADUATION_RETENTION_DAYS)

      const queuedTypes = entries.map((e) => e.dataType)
      expect(queuedTypes).toContain('screenshots')
      expect(queuedTypes).toContain('flags')
      expect(queuedTypes).toContain('activity_logs')
      expect(queuedTypes).toContain('trust_history')
    })

    it('should set correct retention period', () => {
      const entries = queueDataForDeletion('child-456', 'family-789', 30)

      entries.forEach((entry) => {
        expect(entry.retentionDays).toBe(30)
        expect(entry.scheduledDeletionDate.getTime()).toBeGreaterThan(Date.now())
      })
    })
  })

  // ============================================
  // Alumni Status Tests (AC6)
  // ============================================

  describe('Alumni Status', () => {
    it('should transition child to alumni with correct data', () => {
      const alumniRecord = transitionToAlumni('child-456', 'family-789', {
        monitoringStartDate: new Date('2023-06-15'),
        totalMonitoringMonths: 24,
        finalTrustScore: 100,
        certificateId: 'cert-123',
        graduationDate: new Date('2025-06-15'),
      })

      expect(alumniRecord.childId).toBe('child-456')
      expect(alumniRecord.familyId).toBe('family-789')
      expect(alumniRecord.previousAccountData.totalMonitoringMonths).toBe(24)
    })

    it('should correctly identify alumni status', () => {
      expect(isAlumni('child-456')).toBe(false)

      transitionToAlumni('child-456', 'family-789', {
        monitoringStartDate: new Date('2023-06-15'),
        totalMonitoringMonths: 24,
        finalTrustScore: 100,
        certificateId: 'cert-123',
        graduationDate: new Date('2025-06-15'),
      })

      expect(isAlumni('child-456')).toBe(true)
    })
  })

  // ============================================
  // Certificate Tests (AC7)
  // ============================================

  describe('Certificate Generation', () => {
    it('should generate certificate with correct data', () => {
      const cert = generateCertificate('child-456', 'family-789', 'Alex', {
        graduationDate: new Date('2025-06-15'),
        monthsAtPerfectTrust: 12,
        totalMonitoringDuration: 24,
      })

      expect(cert.childName).toBe('Alex')
      expect(cert.monthsAtPerfectTrust).toBe(12)
      expect(cert.totalMonitoringDuration).toBe(24)
    })

    it('should retrieve certificate by child ID', () => {
      generateCertificate('child-456', 'family-789', 'Alex', {
        graduationDate: new Date('2025-06-15'),
        monthsAtPerfectTrust: 12,
        totalMonitoringDuration: 24,
      })

      const cert = getCertificateForChild('child-456')
      expect(cert).not.toBeNull()
      expect(cert?.childName).toBe('Alex')
    })
  })

  // ============================================
  // Component Integration Tests
  // ============================================

  describe('Component Integration', () => {
    it('should render confirmation flow with decision', () => {
      const decision = initiateGraduationDecision({
        conversationId: 'conv-123',
        childId: 'child-456',
        familyId: 'family-789',
        requiredParentIds: ['parent-1'],
      })

      render(
        <GraduationConfirmationFlow
          decision={decision}
          viewerType="child"
          childName="Alex"
          hasConfirmed={false}
          onConfirm={vi.fn()}
        />
      )

      expect(screen.getByRole('article')).toBeInTheDocument()
      expect(
        screen.getByRole('heading', { level: 1, name: /Confirm Your Graduation/i })
      ).toBeInTheDocument()
    })

    it('should render celebration with certificate', () => {
      const cert = generateCertificate('child-456', 'family-789', 'Alex', {
        graduationDate: new Date('2025-06-15'),
        monthsAtPerfectTrust: 12,
        totalMonitoringDuration: 24,
      })

      render(
        <GraduationCelebration
          childName="Alex"
          viewerType="child"
          certificate={cert}
          deletionInfo={{
            scheduledDate: new Date('2025-07-15'),
            dataTypes: DELETION_DATA_TYPES,
          }}
          onViewCertificate={vi.fn()}
        />
      )

      expect(screen.getByText(/Congratulations/i)).toBeInTheDocument()
      expect(screen.getByText(/Alex/i)).toBeInTheDocument()
    })

    it('should render alumni badge with record', () => {
      const record = transitionToAlumni('child-456', 'family-789', {
        monitoringStartDate: new Date('2023-06-15'),
        totalMonitoringMonths: 24,
        finalTrustScore: 100,
        certificateId: 'cert-123',
        graduationDate: new Date('2025-06-15'),
      })

      render(<AlumniStatusBadge alumniRecord={record} viewerType="child" showDetails={true} />)

      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.getByText(/Graduated Alumni/i)).toBeInTheDocument()
      expect(screen.getByText(/No Monitoring/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // Error Handling Tests
  // ============================================

  describe('Error Handling', () => {
    it('should not allow duplicate child confirmation', () => {
      const decision = initiateGraduationDecision({
        conversationId: 'conv-123',
        childId: 'child-456',
        familyId: 'family-789',
        requiredParentIds: ['parent-1'],
      })

      // First confirmation should succeed
      recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'child-456',
        role: 'child',
        graduationType: 'immediate',
        scheduledDate: null,
      })

      // Second confirmation should throw or be ignored
      expect(() => {
        recordGraduationConfirmation({
          decisionId: decision.id,
          userId: 'child-456',
          role: 'child',
          graduationType: 'scheduled',
          scheduledDate: null,
        })
      }).toThrow()
    })

    it('should not allow graduation of non-existent decision', () => {
      expect(() => {
        executeGraduation('non-existent-decision')
      }).toThrow()
    })

    it('should not allow duplicate alumni transition', () => {
      transitionToAlumni('child-456', 'family-789', {
        monitoringStartDate: new Date('2023-06-15'),
        totalMonitoringMonths: 24,
        finalTrustScore: 100,
        certificateId: 'cert-123',
        graduationDate: new Date('2025-06-15'),
      })

      expect(() => {
        transitionToAlumni('child-456', 'family-789', {
          monitoringStartDate: new Date('2023-06-15'),
          totalMonitoringMonths: 24,
          finalTrustScore: 100,
          certificateId: 'cert-456',
          graduationDate: new Date('2025-06-15'),
        })
      }).toThrow()
    })
  })
})
