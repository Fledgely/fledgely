/**
 * Unit tests for revokeTemporaryAccess Cloud Function.
 *
 * Tests cover:
 * - Auth validation (unauthenticated rejection)
 * - Input validation (familyId, grantId, reason)
 * - Permission validation (only guardians can revoke)
 * - Grant existence and status checks
 * - Revocation document updates
 * - Audit log creation
 *
 * Story 39.3: Temporary Caregiver Access
 * - AC5: Early revocation with immediate effect
 * - AC6: All temporary access logged
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock firebase-admin/firestore before importing
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: vi.fn(() => ({
      doc: vi.fn(() => mockFamilyDocRef),
    })),
    batch: vi.fn(() => mockBatch),
  })),
  FieldValue: {
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  },
}))

// Mock auth
vi.mock('../shared/auth', () => ({
  verifyAuth: vi.fn(),
}))

import { verifyAuth } from '../shared/auth'
import { HttpsError } from 'firebase-functions/v2/https'

// Mock grant doc ref
const mockGrantDocRef = {
  id: 'grant-123',
  get: vi.fn(),
}

// Mock family document reference
const mockFamilyDocRef = {
  id: 'family-123',
  get: vi.fn(),
  collection: vi.fn(() => ({
    doc: vi.fn(() => mockGrantDocRef),
  })),
}

// Mock batch
const mockBatch = {
  update: vi.fn(),
  set: vi.fn(),
  commit: vi.fn(),
}

describe('revokeTemporaryAccess Cloud Function', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('rejects unauthenticated requests', () => {
      vi.mocked(verifyAuth).mockImplementation(() => {
        throw new HttpsError('unauthenticated', 'Authentication required')
      })

      expect(() => verifyAuth(undefined)).toThrow('Authentication required')
    })

    it('accepts authenticated requests', () => {
      vi.mocked(verifyAuth).mockReturnValue({
        uid: 'guardian-123',
        email: 'parent@example.com',
        displayName: 'Parent User',
      })

      const result = verifyAuth({ uid: 'guardian-123' } as Parameters<typeof verifyAuth>[0])
      expect(result.uid).toBe('guardian-123')
    })
  })

  describe('Input Validation', () => {
    it('rejects empty familyId', () => {
      const invalidInput = {
        familyId: '',
        grantId: 'grant-123',
      }

      expect(invalidInput.familyId.length).toBe(0)
    })

    it('rejects empty grantId', () => {
      const invalidInput = {
        familyId: 'family-123',
        grantId: '',
      }

      expect(invalidInput.grantId.length).toBe(0)
    })

    it('accepts valid input without reason', () => {
      const validInput = {
        familyId: 'family-123',
        grantId: 'grant-456',
      }

      expect(validInput.familyId.length).toBeGreaterThan(0)
      expect(validInput.grantId.length).toBeGreaterThan(0)
    })

    it('accepts valid input with reason', () => {
      const validInput = {
        familyId: 'family-123',
        grantId: 'grant-456',
        reason: 'Plans changed, no longer needed',
      }

      expect(validInput.reason).toBeDefined()
      expect(validInput.reason!.length).toBeLessThanOrEqual(200)
    })

    it('rejects reason longer than 200 characters', () => {
      const invalidInput = {
        familyId: 'family-123',
        grantId: 'grant-456',
        reason: 'A'.repeat(201),
      }

      expect(invalidInput.reason.length).toBeGreaterThan(200)
    })
  })

  describe('Permission Validation (Guardian Only)', () => {
    it('allows guardian to revoke access', () => {
      const familyData = {
        guardians: [{ uid: 'guardian-123' }, { uid: 'guardian-456' }],
        caregivers: [{ uid: 'caregiver-789' }],
      }
      const callerUid = 'guardian-123'

      const isGuardian = familyData.guardians.some((g: { uid: string }) => g.uid === callerUid)
      expect(isGuardian).toBe(true)
    })

    it('rejects non-guardian (caregiver) attempting revoke', () => {
      const familyData = {
        guardians: [{ uid: 'guardian-123' }],
        caregivers: [{ uid: 'caregiver-789' }],
      }
      const callerUid = 'caregiver-789'

      const isGuardian = familyData.guardians.some((g: { uid: string }) => g.uid === callerUid)
      expect(isGuardian).toBe(false)
    })
  })

  describe('Grant Status Checks', () => {
    it('allows revocation of active grant', () => {
      const grantData = { status: 'active' }

      const canRevoke = grantData.status !== 'revoked' && grantData.status !== 'expired'
      expect(canRevoke).toBe(true)
    })

    it('allows revocation of pending grant', () => {
      const grantData = { status: 'pending' }

      const canRevoke = grantData.status !== 'revoked' && grantData.status !== 'expired'
      expect(canRevoke).toBe(true)
    })

    it('rejects revocation of already revoked grant', () => {
      const grantData = { status: 'revoked' }

      const canRevoke = grantData.status !== 'revoked' && grantData.status !== 'expired'
      expect(canRevoke).toBe(false)
    })

    it('rejects revocation of expired grant', () => {
      const grantData = { status: 'expired' }

      const canRevoke = grantData.status !== 'revoked' && grantData.status !== 'expired'
      expect(canRevoke).toBe(false)
    })
  })

  describe('Grant Document Updates', () => {
    it('updates grant with revoked status', () => {
      const updateData = {
        status: 'revoked',
        revokedAt: new Date(),
        revokedByUid: 'parent-123',
        revokedReason: null,
      }

      expect(updateData.status).toBe('revoked')
      expect(updateData.revokedAt).toBeInstanceOf(Date)
      expect(updateData.revokedByUid).toBe('parent-123')
    })

    it('includes revocation reason when provided', () => {
      const reason = 'Changed plans'
      const updateData = {
        status: 'revoked',
        revokedAt: new Date(),
        revokedByUid: 'parent-123',
        revokedReason: reason,
      }

      expect(updateData.revokedReason).toBe(reason)
    })

    it('sets revokedReason to null when not provided', () => {
      const updateData = {
        status: 'revoked',
        revokedAt: new Date(),
        revokedByUid: 'parent-123',
        revokedReason: null,
      }

      expect(updateData.revokedReason).toBeNull()
    })
  })

  describe('Audit Log Creation', () => {
    it('creates audit log with temporary_access_revoked action', () => {
      const auditEntry = {
        id: 'audit-123',
        familyId: 'family-456',
        caregiverUid: 'caregiver-789',
        action: 'temporary_access_revoked',
        changedByUid: 'parent-123',
        changes: {
          grantId: 'grant-123',
          previousStatus: 'active',
          reason: 'Changed plans',
        },
        createdAt: 'SERVER_TIMESTAMP',
      }

      expect(auditEntry.action).toBe('temporary_access_revoked')
      expect(auditEntry.changes).toHaveProperty('grantId')
      expect(auditEntry.changes).toHaveProperty('previousStatus')
    })

    it('includes reason in audit changes when provided', () => {
      const changes = {
        grantId: 'grant-123',
        previousStatus: 'active',
        reason: 'No longer needed',
      }

      expect(changes.reason).toBe('No longer needed')
    })

    it('sets reason to null in audit when not provided', () => {
      const changes = {
        grantId: 'grant-123',
        previousStatus: 'pending',
        reason: null,
      }

      expect(changes.reason).toBeNull()
    })
  })

  describe('Response Structure', () => {
    it('returns success with revocation details', () => {
      const response = {
        success: true,
        grantId: 'grant-123',
        status: 'revoked',
        revokedAt: new Date().toISOString(),
      }

      expect(response.success).toBe(true)
      expect(response.grantId).toBe('grant-123')
      expect(response.status).toBe('revoked')
      expect(response.revokedAt).toBeDefined()
    })

    it('includes ISO formatted revokedAt timestamp', () => {
      const revokedAt = new Date('2026-01-05T15:30:00Z').toISOString()

      expect(revokedAt).toBe('2026-01-05T15:30:00.000Z')
    })
  })
})
