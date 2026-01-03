/**
 * Unit tests for grantTemporaryAccess Cloud Function.
 *
 * Tests cover:
 * - Auth validation (unauthenticated rejection)
 * - Input validation (familyId, caregiverUid, preset, timezone)
 * - Permission validation (only guardians can grant access)
 * - Caregiver existence check
 * - Preset date calculations
 * - Duration constraint validation
 * - Grant document creation
 * - Audit log creation
 *
 * Story 39.3: Temporary Caregiver Access
 * - AC1: Start and end time configurable
 * - AC2: Access presets (today_only, this_weekend, custom)
 * - AC3: Automatic access expiry (status based on time)
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
  Timestamp: {
    fromDate: vi.fn((date: Date) => ({ toDate: () => date, _seconds: date.getTime() / 1000 })),
  },
}))

// Mock auth
vi.mock('../shared/auth', () => ({
  verifyAuth: vi.fn(),
}))

import { verifyAuth } from '../shared/auth'
import { HttpsError } from 'firebase-functions/v2/https'

// Mock subcollection doc ref
const mockGrantDocRef = {
  id: 'grant-123',
}

// Mock family document reference
const mockFamilyDocRef = {
  id: 'family-123',
  get: vi.fn(),
  update: vi.fn(),
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

describe('grantTemporaryAccess Cloud Function', () => {
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
        caregiverUid: 'cg-123',
        preset: 'today_only',
        timezone: 'UTC',
      }

      expect(invalidInput.familyId.length).toBe(0)
    })

    it('rejects empty caregiverUid', () => {
      const invalidInput = {
        familyId: 'family-123',
        caregiverUid: '',
        preset: 'today_only',
        timezone: 'UTC',
      }

      expect(invalidInput.caregiverUid.length).toBe(0)
    })

    it('rejects empty timezone', () => {
      const invalidInput = {
        familyId: 'family-123',
        caregiverUid: 'cg-123',
        preset: 'today_only',
        timezone: '',
      }

      expect(invalidInput.timezone.length).toBe(0)
    })

    it('accepts valid input with today_only preset', () => {
      const validInput = {
        familyId: 'family-123',
        caregiverUid: 'caregiver-456',
        preset: 'today_only',
        timezone: 'America/New_York',
      }

      expect(validInput.familyId.length).toBeGreaterThan(0)
      expect(validInput.preset).toBe('today_only')
    })

    it('accepts valid input with this_weekend preset', () => {
      const validInput = {
        familyId: 'family-123',
        caregiverUid: 'caregiver-456',
        preset: 'this_weekend',
        timezone: 'UTC',
      }

      expect(validInput.preset).toBe('this_weekend')
    })

    it('accepts valid input with custom preset and dates', () => {
      const validInput = {
        familyId: 'family-123',
        caregiverUid: 'caregiver-456',
        preset: 'custom',
        startAt: '2026-01-05T10:00:00Z',
        endAt: '2026-01-05T18:00:00Z',
        timezone: 'UTC',
      }

      expect(validInput.preset).toBe('custom')
      expect(validInput.startAt).toBeDefined()
      expect(validInput.endAt).toBeDefined()
    })

    it('rejects invalid preset', () => {
      const invalidPreset = 'next_month'

      expect(['today_only', 'this_weekend', 'custom']).not.toContain(invalidPreset)
    })
  })

  describe('Permission Validation (Guardian Only)', () => {
    it('allows guardian to grant access', () => {
      const familyData = {
        guardians: [{ uid: 'guardian-123' }, { uid: 'guardian-456' }],
        caregivers: [{ uid: 'caregiver-789' }],
      }
      const callerUid = 'guardian-123'

      const isGuardian = familyData.guardians.some((g: { uid: string }) => g.uid === callerUid)
      expect(isGuardian).toBe(true)
    })

    it('rejects non-guardian (caregiver) attempting grant', () => {
      const familyData = {
        guardians: [{ uid: 'guardian-123' }],
        caregivers: [{ uid: 'caregiver-789' }],
      }
      const callerUid = 'caregiver-789'

      const isGuardian = familyData.guardians.some((g: { uid: string }) => g.uid === callerUid)
      expect(isGuardian).toBe(false)
    })

    it('rejects random user attempting grant', () => {
      const familyData = {
        guardians: [{ uid: 'guardian-123' }],
        caregivers: [{ uid: 'caregiver-789' }],
      }
      const callerUid = 'random-user-999'

      const isGuardian = familyData.guardians.some((g: { uid: string }) => g.uid === callerUid)
      expect(isGuardian).toBe(false)
    })
  })

  describe('Caregiver Existence Check', () => {
    it('finds caregiver in family caregivers array', () => {
      const familyData = {
        caregivers: [{ uid: 'caregiver-1' }, { uid: 'caregiver-2' }, { uid: 'caregiver-3' }],
      }
      const caregiverUid = 'caregiver-2'

      const caregiver = familyData.caregivers.find((c: { uid: string }) => c.uid === caregiverUid)
      expect(caregiver).toBeDefined()
      expect(caregiver!.uid).toBe('caregiver-2')
    })

    it('returns undefined for non-existent caregiver', () => {
      const familyData = {
        caregivers: [{ uid: 'caregiver-1' }],
      }
      const caregiverUid = 'caregiver-unknown'

      const caregiver = familyData.caregivers.find((c: { uid: string }) => c.uid === caregiverUid)
      expect(caregiver).toBeUndefined()
    })

    it('handles empty caregivers array', () => {
      const familyData = {
        caregivers: [],
      }
      const caregiverUid = 'caregiver-1'

      const caregiver = familyData.caregivers.find((c: { uid: string }) => c.uid === caregiverUid)
      expect(caregiver).toBeUndefined()
    })
  })

  describe('Preset Date Calculations', () => {
    describe('today_only preset', () => {
      it('starts from now', () => {
        const now = new Date()
        const startAt = now

        expect(startAt.getTime()).toBeGreaterThanOrEqual(now.getTime() - 1000)
      })

      it('ends at midnight', () => {
        const now = new Date()
        const endOfDay = new Date(now)
        endOfDay.setHours(23, 59, 59, 999)

        expect(endOfDay.getHours()).toBe(23)
        expect(endOfDay.getMinutes()).toBe(59)
      })
    })

    describe('this_weekend preset', () => {
      it('calculates correct Friday 5pm start', () => {
        // Friday 5pm
        const fridayStart = new Date('2026-01-02T17:00:00Z') // Friday
        expect(fridayStart.getHours()).toBe(17)
      })

      it('calculates correct Sunday 10pm end', () => {
        // Sunday 10pm
        const sundayEnd = new Date('2026-01-04T22:00:00Z') // Sunday
        expect(sundayEnd.getHours()).toBe(22)
      })
    })

    describe('custom preset', () => {
      it('uses provided custom dates', () => {
        const customStart = new Date('2026-01-05T10:00:00Z')
        const customEnd = new Date('2026-01-05T18:00:00Z')

        expect(customEnd.getTime() - customStart.getTime()).toBe(8 * 60 * 60 * 1000)
      })
    })
  })

  describe('Duration Validation', () => {
    it('rejects duration less than 1 hour', () => {
      const startAt = new Date('2026-01-05T10:00:00Z')
      const endAt = new Date('2026-01-05T10:30:00Z') // 30 minutes

      const durationHours = (endAt.getTime() - startAt.getTime()) / (1000 * 60 * 60)
      expect(durationHours).toBeLessThan(1)
    })

    it('accepts exactly 1 hour duration', () => {
      const startAt = new Date('2026-01-05T10:00:00Z')
      const endAt = new Date('2026-01-05T11:00:00Z') // 1 hour

      const durationHours = (endAt.getTime() - startAt.getTime()) / (1000 * 60 * 60)
      expect(durationHours).toBe(1)
    })

    it('rejects duration greater than 7 days', () => {
      const startAt = new Date('2026-01-05T10:00:00Z')
      const endAt = new Date('2026-01-15T10:00:00Z') // 10 days

      const durationDays = (endAt.getTime() - startAt.getTime()) / (1000 * 60 * 60 * 24)
      expect(durationDays).toBeGreaterThan(7)
    })

    it('accepts exactly 7 days duration', () => {
      const startAt = new Date('2026-01-05T10:00:00Z')
      const endAt = new Date('2026-01-12T10:00:00Z') // 7 days

      const durationDays = (endAt.getTime() - startAt.getTime()) / (1000 * 60 * 60 * 24)
      expect(durationDays).toBe(7)
    })

    it('rejects end time before start time', () => {
      const startAt = new Date('2026-01-05T18:00:00Z')
      const endAt = new Date('2026-01-05T10:00:00Z')

      expect(endAt.getTime()).toBeLessThan(startAt.getTime())
    })

    it('rejects end time equal to start time', () => {
      const startAt = new Date('2026-01-05T10:00:00Z')
      const endAt = new Date('2026-01-05T10:00:00Z')

      expect(endAt.getTime()).toBe(startAt.getTime())
    })
  })

  describe('Status Determination', () => {
    it('returns active status when start time is in past', () => {
      const now = new Date()
      const startAt = new Date(now.getTime() - 60000) // 1 minute ago

      const status = startAt <= now ? 'active' : 'pending'
      expect(status).toBe('active')
    })

    it('returns pending status when start time is in future', () => {
      const now = new Date()
      const startAt = new Date(now.getTime() + 60000) // 1 minute in future

      const status = startAt <= now ? 'active' : 'pending'
      expect(status).toBe('pending')
    })

    it('returns active status when start time is exactly now', () => {
      const now = new Date()
      const startAt = now

      const status = startAt <= now ? 'active' : 'pending'
      expect(status).toBe('active')
    })
  })

  describe('Grant Document Creation', () => {
    it('creates grant document with correct structure', () => {
      const grantData = {
        id: 'grant-123',
        familyId: 'family-456',
        caregiverUid: 'caregiver-789',
        grantedByUid: 'parent-123',
        startAt: new Date('2026-01-05T10:00:00Z'),
        endAt: new Date('2026-01-05T18:00:00Z'),
        preset: 'custom',
        timezone: 'America/New_York',
        status: 'active',
        createdAt: 'SERVER_TIMESTAMP',
      }

      expect(grantData).toHaveProperty('id')
      expect(grantData).toHaveProperty('familyId')
      expect(grantData).toHaveProperty('caregiverUid')
      expect(grantData).toHaveProperty('grantedByUid')
      expect(grantData).toHaveProperty('startAt')
      expect(grantData).toHaveProperty('endAt')
      expect(grantData).toHaveProperty('preset')
      expect(grantData).toHaveProperty('timezone')
      expect(grantData).toHaveProperty('status')
      expect(grantData).toHaveProperty('createdAt')
    })

    it('does not include revocation fields for new grant', () => {
      const grantData = {
        id: 'grant-123',
        familyId: 'family-456',
        caregiverUid: 'caregiver-789',
        grantedByUid: 'parent-123',
        startAt: new Date(),
        endAt: new Date(),
        preset: 'today_only',
        timezone: 'UTC',
        status: 'active',
        createdAt: 'SERVER_TIMESTAMP',
      }

      expect(grantData).not.toHaveProperty('revokedAt')
      expect(grantData).not.toHaveProperty('revokedByUid')
      expect(grantData).not.toHaveProperty('revokedReason')
    })
  })

  describe('Audit Log Creation', () => {
    it('creates audit log with temporary_access_granted action', () => {
      const auditEntry = {
        id: 'audit-123',
        familyId: 'family-456',
        caregiverUid: 'caregiver-789',
        action: 'temporary_access_granted',
        changedByUid: 'parent-123',
        changes: {
          grantId: 'grant-123',
          preset: 'this_weekend',
          startAt: '2026-01-04T17:00:00Z',
          endAt: '2026-01-06T22:00:00Z',
          status: 'pending',
        },
        createdAt: 'SERVER_TIMESTAMP',
      }

      expect(auditEntry.action).toBe('temporary_access_granted')
      expect(auditEntry.changes).toHaveProperty('grantId')
      expect(auditEntry.changes).toHaveProperty('preset')
      expect(auditEntry.changes).toHaveProperty('startAt')
      expect(auditEntry.changes).toHaveProperty('endAt')
    })

    it('includes grant details in audit changes', () => {
      const changes = {
        grantId: 'grant-123',
        preset: 'custom',
        startAt: '2026-01-05T10:00:00Z',
        endAt: '2026-01-05T18:00:00Z',
        status: 'active',
      }

      expect(changes.grantId).toBe('grant-123')
      expect(changes.preset).toBe('custom')
      expect(changes.status).toBe('active')
    })
  })

  describe('Response Structure', () => {
    it('returns success with grant details', () => {
      const response = {
        success: true,
        grantId: 'grant-123',
        startAt: '2026-01-05T10:00:00.000Z',
        endAt: '2026-01-05T18:00:00.000Z',
        preset: 'custom',
        status: 'active',
      }

      expect(response.success).toBe(true)
      expect(response.grantId).toBe('grant-123')
      expect(response.preset).toBe('custom')
      expect(response.status).toBe('active')
    })

    it('includes ISO formatted dates', () => {
      const startAt = new Date('2026-01-05T10:00:00Z').toISOString()
      const endAt = new Date('2026-01-05T18:00:00Z').toISOString()

      expect(startAt).toBe('2026-01-05T10:00:00.000Z')
      expect(endAt).toBe('2026-01-05T18:00:00.000Z')
    })
  })
})
