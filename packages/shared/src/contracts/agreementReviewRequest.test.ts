/**
 * AgreementReviewRequest Contract Tests - Story 34.5.3 Task 1
 *
 * Tests for agreement review request schemas.
 * AC4: Rate Limiting (60-Day Cooldown)
 * AC6: Review Request Tracking
 */

import { describe, it, expect } from 'vitest'
import {
  REVIEW_REQUEST_COOLDOWN_DAYS,
  reviewRequestStatusSchema,
  agreementReviewRequestSchema,
  cooldownStatusSchema,
  createAgreementReviewRequestSchema,
  calculateCooldownStatus,
  type AgreementReviewRequest,
  type CooldownStatus,
  type CreateAgreementReviewRequest,
} from './agreementReviewRequest'

describe('agreementReviewRequest contract - Story 34.5.3', () => {
  // ============================================
  // Constants Tests
  // ============================================

  describe('REVIEW_REQUEST_COOLDOWN_DAYS', () => {
    it('should be 60 days', () => {
      expect(REVIEW_REQUEST_COOLDOWN_DAYS).toBe(60)
    })
  })

  // ============================================
  // reviewRequestStatusSchema Tests
  // ============================================

  describe('reviewRequestStatusSchema', () => {
    it('should accept pending status', () => {
      const result = reviewRequestStatusSchema.safeParse('pending')
      expect(result.success).toBe(true)
      expect(result.data).toBe('pending')
    })

    it('should accept acknowledged status', () => {
      const result = reviewRequestStatusSchema.safeParse('acknowledged')
      expect(result.success).toBe(true)
      expect(result.data).toBe('acknowledged')
    })

    it('should accept reviewed status', () => {
      const result = reviewRequestStatusSchema.safeParse('reviewed')
      expect(result.success).toBe(true)
      expect(result.data).toBe('reviewed')
    })

    it('should accept expired status', () => {
      const result = reviewRequestStatusSchema.safeParse('expired')
      expect(result.success).toBe(true)
      expect(result.data).toBe('expired')
    })

    it('should reject invalid status', () => {
      const result = reviewRequestStatusSchema.safeParse('invalid')
      expect(result.success).toBe(false)
    })

    it('should reject empty string', () => {
      const result = reviewRequestStatusSchema.safeParse('')
      expect(result.success).toBe(false)
    })
  })

  // ============================================
  // agreementReviewRequestSchema Tests
  // ============================================

  describe('agreementReviewRequestSchema', () => {
    const validRequest: AgreementReviewRequest = {
      id: 'request-123',
      familyId: 'family-456',
      childId: 'child-789',
      childName: 'Alex',
      agreementId: 'agreement-012',
      requestedAt: new Date('2024-01-15T10:00:00Z'),
      status: 'pending',
      acknowledgedAt: null,
      reviewedAt: null,
      suggestedAreas: ['Screen time limits', 'Weekend rules'],
      parentNotificationSent: true,
      expiresAt: new Date('2024-02-14T10:00:00Z'),
    }

    it('should accept valid review request', () => {
      const result = agreementReviewRequestSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
    })

    it('should require id', () => {
      const { id: _id, ...withoutId } = validRequest
      const result = agreementReviewRequestSchema.safeParse(withoutId)
      expect(result.success).toBe(false)
    })

    it('should require familyId', () => {
      const { familyId: _familyId, ...withoutFamilyId } = validRequest
      const result = agreementReviewRequestSchema.safeParse(withoutFamilyId)
      expect(result.success).toBe(false)
    })

    it('should require childId', () => {
      const { childId: _childId, ...withoutChildId } = validRequest
      const result = agreementReviewRequestSchema.safeParse(withoutChildId)
      expect(result.success).toBe(false)
    })

    it('should require childName', () => {
      const { childName: _childName, ...withoutChildName } = validRequest
      const result = agreementReviewRequestSchema.safeParse(withoutChildName)
      expect(result.success).toBe(false)
    })

    it('should require agreementId', () => {
      const { agreementId: _agreementId, ...withoutAgreementId } = validRequest
      const result = agreementReviewRequestSchema.safeParse(withoutAgreementId)
      expect(result.success).toBe(false)
    })

    it('should require requestedAt date', () => {
      const { requestedAt: _requestedAt, ...withoutRequestedAt } = validRequest
      const result = agreementReviewRequestSchema.safeParse(withoutRequestedAt)
      expect(result.success).toBe(false)
    })

    it('should require status', () => {
      const { status: _status, ...withoutStatus } = validRequest
      const result = agreementReviewRequestSchema.safeParse(withoutStatus)
      expect(result.success).toBe(false)
    })

    it('should allow null acknowledgedAt', () => {
      const result = agreementReviewRequestSchema.safeParse({
        ...validRequest,
        acknowledgedAt: null,
      })
      expect(result.success).toBe(true)
    })

    it('should accept date for acknowledgedAt', () => {
      const result = agreementReviewRequestSchema.safeParse({
        ...validRequest,
        acknowledgedAt: new Date('2024-01-16T10:00:00Z'),
      })
      expect(result.success).toBe(true)
    })

    it('should allow null reviewedAt', () => {
      const result = agreementReviewRequestSchema.safeParse({
        ...validRequest,
        reviewedAt: null,
      })
      expect(result.success).toBe(true)
    })

    it('should accept date for reviewedAt', () => {
      const result = agreementReviewRequestSchema.safeParse({
        ...validRequest,
        reviewedAt: new Date('2024-01-20T10:00:00Z'),
      })
      expect(result.success).toBe(true)
    })

    it('should require suggestedAreas as array', () => {
      const result = agreementReviewRequestSchema.safeParse({
        ...validRequest,
        suggestedAreas: 'not an array',
      })
      expect(result.success).toBe(false)
    })

    it('should accept empty suggestedAreas array', () => {
      const result = agreementReviewRequestSchema.safeParse({
        ...validRequest,
        suggestedAreas: [],
      })
      expect(result.success).toBe(true)
    })

    it('should require parentNotificationSent boolean', () => {
      const result = agreementReviewRequestSchema.safeParse({
        ...validRequest,
        parentNotificationSent: 'true',
      })
      expect(result.success).toBe(false)
    })

    it('should require expiresAt date', () => {
      const { expiresAt: _expiresAt, ...withoutExpiresAt } = validRequest
      const result = agreementReviewRequestSchema.safeParse(withoutExpiresAt)
      expect(result.success).toBe(false)
    })
  })

  // ============================================
  // cooldownStatusSchema Tests
  // ============================================

  describe('cooldownStatusSchema', () => {
    it('should accept valid cooldown status with no previous request', () => {
      const status: CooldownStatus = {
        canRequest: true,
        lastRequestAt: null,
        nextAvailableAt: null,
        daysRemaining: 0,
      }
      const result = cooldownStatusSchema.safeParse(status)
      expect(result.success).toBe(true)
    })

    it('should accept valid cooldown status with active cooldown', () => {
      const status: CooldownStatus = {
        canRequest: false,
        lastRequestAt: new Date('2024-01-15T10:00:00Z'),
        nextAvailableAt: new Date('2024-03-15T10:00:00Z'),
        daysRemaining: 45,
      }
      const result = cooldownStatusSchema.safeParse(status)
      expect(result.success).toBe(true)
    })

    it('should require canRequest boolean', () => {
      const result = cooldownStatusSchema.safeParse({
        canRequest: 'true',
        lastRequestAt: null,
        nextAvailableAt: null,
        daysRemaining: 0,
      })
      expect(result.success).toBe(false)
    })

    it('should require daysRemaining to be non-negative', () => {
      const result = cooldownStatusSchema.safeParse({
        canRequest: false,
        lastRequestAt: new Date(),
        nextAvailableAt: new Date(),
        daysRemaining: -5,
      })
      expect(result.success).toBe(false)
    })

    it('should require daysRemaining to be an integer', () => {
      const result = cooldownStatusSchema.safeParse({
        canRequest: false,
        lastRequestAt: new Date(),
        nextAvailableAt: new Date(),
        daysRemaining: 45.5,
      })
      expect(result.success).toBe(false)
    })
  })

  // ============================================
  // createAgreementReviewRequestSchema Tests
  // ============================================

  describe('createAgreementReviewRequestSchema', () => {
    const validCreate: CreateAgreementReviewRequest = {
      familyId: 'family-456',
      childId: 'child-789',
      childName: 'Alex',
      agreementId: 'agreement-012',
    }

    it('should accept valid create request', () => {
      const result = createAgreementReviewRequestSchema.safeParse(validCreate)
      expect(result.success).toBe(true)
    })

    it('should require familyId', () => {
      const { familyId: _familyId, ...withoutFamilyId } = validCreate
      const result = createAgreementReviewRequestSchema.safeParse(withoutFamilyId)
      expect(result.success).toBe(false)
    })

    it('should require childId', () => {
      const { childId: _childId, ...withoutChildId } = validCreate
      const result = createAgreementReviewRequestSchema.safeParse(withoutChildId)
      expect(result.success).toBe(false)
    })

    it('should require childName', () => {
      const { childName: _childName, ...withoutChildName } = validCreate
      const result = createAgreementReviewRequestSchema.safeParse(withoutChildName)
      expect(result.success).toBe(false)
    })

    it('should require agreementId', () => {
      const { agreementId: _agreementId, ...withoutAgreementId } = validCreate
      const result = createAgreementReviewRequestSchema.safeParse(withoutAgreementId)
      expect(result.success).toBe(false)
    })

    it('should reject empty familyId', () => {
      const result = createAgreementReviewRequestSchema.safeParse({
        ...validCreate,
        familyId: '',
      })
      expect(result.success).toBe(false)
    })

    it('should reject empty childId', () => {
      const result = createAgreementReviewRequestSchema.safeParse({
        ...validCreate,
        childId: '',
      })
      expect(result.success).toBe(false)
    })

    it('should reject empty childName', () => {
      const result = createAgreementReviewRequestSchema.safeParse({
        ...validCreate,
        childName: '',
      })
      expect(result.success).toBe(false)
    })

    it('should reject empty agreementId', () => {
      const result = createAgreementReviewRequestSchema.safeParse({
        ...validCreate,
        agreementId: '',
      })
      expect(result.success).toBe(false)
    })
  })

  // ============================================
  // calculateCooldownStatus Tests
  // ============================================

  describe('calculateCooldownStatus', () => {
    it('should return canRequest true when no previous request', () => {
      const status = calculateCooldownStatus(null)
      expect(status.canRequest).toBe(true)
      expect(status.lastRequestAt).toBeNull()
      expect(status.nextAvailableAt).toBeNull()
      expect(status.daysRemaining).toBe(0)
    })

    it('should return canRequest false when within 60-day cooldown', () => {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const status = calculateCooldownStatus(thirtyDaysAgo)
      expect(status.canRequest).toBe(false)
      expect(status.lastRequestAt).toEqual(thirtyDaysAgo)
      expect(status.daysRemaining).toBe(30)
    })

    it('should return canRequest true when cooldown has passed', () => {
      const seventyDaysAgo = new Date()
      seventyDaysAgo.setDate(seventyDaysAgo.getDate() - 70)

      const status = calculateCooldownStatus(seventyDaysAgo)
      expect(status.canRequest).toBe(true)
      expect(status.daysRemaining).toBe(0)
    })

    it('should return canRequest true on exactly 60 days', () => {
      const exactlySixtyDaysAgo = new Date()
      exactlySixtyDaysAgo.setDate(exactlySixtyDaysAgo.getDate() - 60)

      const status = calculateCooldownStatus(exactlySixtyDaysAgo)
      expect(status.canRequest).toBe(true)
      expect(status.daysRemaining).toBe(0)
    })

    it('should calculate correct days remaining at 1 day ago', () => {
      const oneDayAgo = new Date()
      oneDayAgo.setDate(oneDayAgo.getDate() - 1)

      const status = calculateCooldownStatus(oneDayAgo)
      expect(status.canRequest).toBe(false)
      expect(status.daysRemaining).toBe(59)
    })

    it('should calculate correct days remaining at 59 days ago', () => {
      const fiftyNineDaysAgo = new Date()
      fiftyNineDaysAgo.setDate(fiftyNineDaysAgo.getDate() - 59)

      const status = calculateCooldownStatus(fiftyNineDaysAgo)
      expect(status.canRequest).toBe(false)
      expect(status.daysRemaining).toBe(1)
    })

    it('should calculate nextAvailableAt correctly', () => {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const status = calculateCooldownStatus(thirtyDaysAgo)
      expect(status.nextAvailableAt).not.toBeNull()

      // nextAvailableAt should be 60 days after lastRequestAt
      const expectedNextAvailable = new Date(thirtyDaysAgo)
      expectedNextAvailable.setDate(expectedNextAvailable.getDate() + 60)

      // Compare dates (within 1 minute tolerance)
      const diff = Math.abs(status.nextAvailableAt!.getTime() - expectedNextAvailable.getTime())
      expect(diff).toBeLessThan(60000)
    })

    it('should set nextAvailableAt to null when cooldown passed', () => {
      const seventyDaysAgo = new Date()
      seventyDaysAgo.setDate(seventyDaysAgo.getDate() - 70)

      const status = calculateCooldownStatus(seventyDaysAgo)
      expect(status.nextAvailableAt).toBeNull()
    })

    it('should handle request made today', () => {
      const today = new Date()

      const status = calculateCooldownStatus(today)
      expect(status.canRequest).toBe(false)
      expect(status.daysRemaining).toBe(60)
    })
  })
})
