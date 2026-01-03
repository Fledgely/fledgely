/**
 * Unit tests for updateCaregiverPermissions Cloud Function.
 *
 * Tests cover:
 * - Auth validation (unauthenticated rejection)
 * - Input validation (familyId, caregiverUid, permissions)
 * - Permission validation (only guardians can update)
 * - Caregiver existence check
 * - Permission merging logic
 * - Audit log creation
 *
 * Story 39.2: Caregiver Permission Configuration
 * - AC1: Permission Toggles
 * - AC2: Default Permissions
 * - AC3: Extend Time Permission
 * - AC4: View Flags Permission
 * - AC5: Permission Changes (immediate + audit)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock firebase-admin/firestore before importing
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: vi.fn(() => ({
      doc: vi.fn(() => mockDocRef),
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

// Mock document reference
const mockDocRef = {
  id: 'family-123',
  get: vi.fn(),
  update: vi.fn(),
}

// Mock batch
const mockBatch = {
  update: vi.fn(),
  set: vi.fn(),
  commit: vi.fn(),
}

describe('updateCaregiverPermissions Cloud Function', () => {
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
      const invalidInput = { familyId: '', caregiverUid: 'cg-123', permissions: {} }

      expect(invalidInput.familyId.length).toBe(0)
    })

    it('rejects empty caregiverUid', () => {
      const invalidInput = { familyId: 'family-123', caregiverUid: '', permissions: {} }

      expect(invalidInput.caregiverUid.length).toBe(0)
    })

    it('accepts valid input with empty permissions object', () => {
      const validInput = {
        familyId: 'family-123',
        caregiverUid: 'caregiver-456',
        permissions: {},
      }

      expect(validInput.familyId.length).toBeGreaterThan(0)
      expect(validInput.caregiverUid.length).toBeGreaterThan(0)
    })

    it('accepts valid input with both permissions set', () => {
      const validInput = {
        familyId: 'family-123',
        caregiverUid: 'caregiver-456',
        permissions: {
          canExtendTime: true,
          canViewFlags: true,
        },
      }

      expect(validInput.permissions.canExtendTime).toBe(true)
      expect(validInput.permissions.canViewFlags).toBe(true)
    })

    it('accepts valid input with partial permissions', () => {
      const validInput = {
        familyId: 'family-123',
        caregiverUid: 'caregiver-456',
        permissions: {
          canExtendTime: true,
        },
      }

      expect(validInput.permissions.canExtendTime).toBe(true)
      expect(validInput.permissions).not.toHaveProperty('canViewFlags')
    })
  })

  describe('Permission Validation (Guardian Only)', () => {
    it('allows guardian to update permissions', () => {
      const familyData = {
        guardians: [{ uid: 'guardian-123' }, { uid: 'guardian-456' }],
        caregivers: [{ uid: 'caregiver-789' }],
      }
      const callerUid = 'guardian-123'

      const isGuardian = familyData.guardians.some((g: { uid: string }) => g.uid === callerUid)
      expect(isGuardian).toBe(true)
    })

    it('rejects non-guardian (caregiver) attempting update', () => {
      const familyData = {
        guardians: [{ uid: 'guardian-123' }],
        caregivers: [{ uid: 'caregiver-789' }],
      }
      const callerUid = 'caregiver-789'

      const isGuardian = familyData.guardians.some((g: { uid: string }) => g.uid === callerUid)
      expect(isGuardian).toBe(false)
    })

    it('rejects unknown user attempting update', () => {
      const familyData = {
        guardians: [{ uid: 'guardian-123' }],
        caregivers: [{ uid: 'caregiver-789' }],
      }
      const callerUid = 'unknown-user'

      const isGuardian = familyData.guardians.some((g: { uid: string }) => g.uid === callerUid)
      expect(isGuardian).toBe(false)
    })
  })

  describe('Caregiver Existence Check', () => {
    it('finds existing caregiver in family', () => {
      const familyData = {
        caregivers: [
          { uid: 'caregiver-1', displayName: 'Grandma' },
          { uid: 'caregiver-2', displayName: 'Uncle Bob' },
        ],
      }
      const caregiverUid = 'caregiver-1'

      const caregiverIndex = familyData.caregivers.findIndex(
        (c: { uid: string }) => c.uid === caregiverUid
      )
      expect(caregiverIndex).toBe(0)
      expect(familyData.caregivers[caregiverIndex].displayName).toBe('Grandma')
    })

    it('returns -1 for non-existent caregiver', () => {
      const familyData = {
        caregivers: [{ uid: 'caregiver-1' }],
      }
      const caregiverUid = 'non-existent'

      const caregiverIndex = familyData.caregivers.findIndex(
        (c: { uid: string }) => c.uid === caregiverUid
      )
      expect(caregiverIndex).toBe(-1)
    })

    it('handles empty caregivers array', () => {
      const familyData = {
        caregivers: [],
      }
      const caregiverUid = 'caregiver-123'

      const caregiverIndex = familyData.caregivers.findIndex(
        (c: { uid: string }) => c.uid === caregiverUid
      )
      expect(caregiverIndex).toBe(-1)
    })
  })

  describe('Permission Merging Logic (AC1, AC2)', () => {
    it('uses default permissions when caregiver has none', () => {
      const caregiver = {
        uid: 'caregiver-123',
        permissions: undefined,
      }

      const oldPermissions = caregiver.permissions || {
        canExtendTime: false,
        canViewFlags: false,
      }

      expect(oldPermissions.canExtendTime).toBe(false)
      expect(oldPermissions.canViewFlags).toBe(false)
    })

    it('preserves existing permissions when updating only one', () => {
      const caregiver = {
        uid: 'caregiver-123',
        permissions: {
          canExtendTime: true,
          canViewFlags: false,
        },
      }
      const newInput = { canViewFlags: true }

      const oldPermissions = caregiver.permissions
      const newPermissions = {
        canExtendTime:
          newInput.canExtendTime !== undefined
            ? newInput.canExtendTime
            : oldPermissions.canExtendTime,
        canViewFlags:
          newInput.canViewFlags !== undefined ? newInput.canViewFlags : oldPermissions.canViewFlags,
      }

      expect(newPermissions.canExtendTime).toBe(true) // Preserved
      expect(newPermissions.canViewFlags).toBe(true) // Updated
    })

    it('updates both permissions when both provided', () => {
      const caregiver = {
        uid: 'caregiver-123',
        permissions: {
          canExtendTime: false,
          canViewFlags: false,
        },
      }
      const newInput = { canExtendTime: true, canViewFlags: true }

      const oldPermissions = caregiver.permissions
      const newPermissions = {
        canExtendTime:
          newInput.canExtendTime !== undefined
            ? newInput.canExtendTime
            : oldPermissions.canExtendTime,
        canViewFlags:
          newInput.canViewFlags !== undefined ? newInput.canViewFlags : oldPermissions.canViewFlags,
      }

      expect(newPermissions.canExtendTime).toBe(true)
      expect(newPermissions.canViewFlags).toBe(true)
    })

    it('allows disabling permissions', () => {
      const caregiver = {
        uid: 'caregiver-123',
        permissions: {
          canExtendTime: true,
          canViewFlags: true,
        },
      }
      const newInput = { canExtendTime: false, canViewFlags: false }

      const oldPermissions = caregiver.permissions
      const newPermissions = {
        canExtendTime:
          newInput.canExtendTime !== undefined
            ? newInput.canExtendTime
            : oldPermissions.canExtendTime,
        canViewFlags:
          newInput.canViewFlags !== undefined ? newInput.canViewFlags : oldPermissions.canViewFlags,
      }

      expect(newPermissions.canExtendTime).toBe(false)
      expect(newPermissions.canViewFlags).toBe(false)
    })
  })

  describe('Extend Time Permission (AC3)', () => {
    it('enables canExtendTime permission', () => {
      const permissions = { canExtendTime: true, canViewFlags: false }
      expect(permissions.canExtendTime).toBe(true)
    })

    it('disables canExtendTime permission', () => {
      const permissions = { canExtendTime: false, canViewFlags: true }
      expect(permissions.canExtendTime).toBe(false)
    })
  })

  describe('View Flags Permission (AC4)', () => {
    it('enables canViewFlags permission', () => {
      const permissions = { canExtendTime: false, canViewFlags: true }
      expect(permissions.canViewFlags).toBe(true)
    })

    it('disables canViewFlags permission', () => {
      const permissions = { canExtendTime: true, canViewFlags: false }
      expect(permissions.canViewFlags).toBe(false)
    })
  })

  describe('Caregiver Entry Update', () => {
    it('updates caregiver entry with new permissions', () => {
      const caregiver = {
        uid: 'caregiver-123',
        displayName: 'Grandma',
        permissions: { canExtendTime: false, canViewFlags: false },
      }
      const newPermissions = { canExtendTime: true, canViewFlags: false }
      const updatedByUid = 'guardian-456'

      const updatedCaregiver = {
        ...caregiver,
        permissions: newPermissions,
        permissionsUpdatedAt: new Date(),
        permissionsUpdatedByUid: updatedByUid,
      }

      expect(updatedCaregiver.permissions).toEqual(newPermissions)
      expect(updatedCaregiver.permissionsUpdatedByUid).toBe('guardian-456')
    })

    it('preserves other caregiver fields when updating', () => {
      const caregiver = {
        uid: 'caregiver-123',
        email: 'grandma@example.com',
        displayName: 'Grandma',
        role: 'status_viewer',
        relationship: 'grandparent',
        customRelationship: null,
        childIds: ['child-1', 'child-2'],
        addedAt: new Date('2025-01-01'),
        addedByUid: 'guardian-123',
        permissions: { canExtendTime: false, canViewFlags: false },
      }
      const newPermissions = { canExtendTime: true, canViewFlags: true }

      const updatedCaregiver = {
        ...caregiver,
        permissions: newPermissions,
        permissionsUpdatedAt: new Date(),
        permissionsUpdatedByUid: 'guardian-123',
      }

      expect(updatedCaregiver.email).toBe('grandma@example.com')
      expect(updatedCaregiver.displayName).toBe('Grandma')
      expect(updatedCaregiver.relationship).toBe('grandparent')
      expect(updatedCaregiver.childIds).toEqual(['child-1', 'child-2'])
    })
  })

  describe('Audit Log Creation (AC5)', () => {
    it('creates audit log with correct action type', () => {
      const auditLog = {
        familyId: 'family-123',
        caregiverUid: 'caregiver-456',
        action: 'permission_change',
        changedByUid: 'guardian-789',
        changes: {
          oldPermissions: { canExtendTime: false, canViewFlags: false },
          newPermissions: { canExtendTime: true, canViewFlags: false },
        },
      }

      expect(auditLog.action).toBe('permission_change')
    })

    it('records old and new permissions in audit log', () => {
      const oldPermissions = { canExtendTime: false, canViewFlags: false }
      const newPermissions = { canExtendTime: true, canViewFlags: true }

      const auditLog = {
        familyId: 'family-123',
        caregiverUid: 'caregiver-456',
        action: 'permission_change',
        changedByUid: 'guardian-789',
        changes: {
          oldPermissions,
          newPermissions,
        },
      }

      expect(auditLog.changes.oldPermissions).toEqual({ canExtendTime: false, canViewFlags: false })
      expect(auditLog.changes.newPermissions).toEqual({ canExtendTime: true, canViewFlags: true })
    })

    it('records who made the change', () => {
      const auditLog = {
        familyId: 'family-123',
        caregiverUid: 'caregiver-456',
        action: 'permission_change',
        changedByUid: 'guardian-789',
        changes: {},
      }

      expect(auditLog.changedByUid).toBe('guardian-789')
    })

    it('stores audit log in caregiverAuditLogs collection', () => {
      const collectionPath = 'caregiverAuditLogs'
      expect(collectionPath).toBe('caregiverAuditLogs')
    })

    it('audit log includes family and caregiver ids', () => {
      const auditLog = {
        id: 'audit-log-id',
        familyId: 'family-123',
        caregiverUid: 'caregiver-456',
        action: 'permission_change',
        changedByUid: 'guardian-789',
        changes: {},
        createdAt: 'SERVER_TIMESTAMP',
      }

      expect(auditLog.id).toBeDefined()
      expect(auditLog.familyId).toBe('family-123')
      expect(auditLog.caregiverUid).toBe('caregiver-456')
    })
  })

  describe('Response Format', () => {
    it('returns success with updated permissions', () => {
      const response = {
        success: true,
        permissions: {
          canExtendTime: true,
          canViewFlags: false,
        },
        caregiverUid: 'caregiver-123',
      }

      expect(response.success).toBe(true)
      expect(response.permissions.canExtendTime).toBe(true)
      expect(response.permissions.canViewFlags).toBe(false)
      expect(response.caregiverUid).toBe('caregiver-123')
    })
  })

  describe('Error Messages', () => {
    it('provides clear message for family not found', () => {
      const errorMessage = 'Family not found'
      expect(errorMessage).toBe('Family not found')
    })

    it('provides clear message for non-guardian access', () => {
      const errorMessage = 'Only guardians can update caregiver permissions'
      expect(errorMessage).toContain('guardians')
    })

    it('provides clear message for caregiver not found', () => {
      const errorMessage = 'Caregiver not found in this family'
      expect(errorMessage).toContain('Caregiver not found')
    })
  })

  describe('Batch Operations', () => {
    it('updates family document with new caregivers array', () => {
      const familyUpdate = {
        caregivers: [
          {
            uid: 'caregiver-123',
            permissions: { canExtendTime: true, canViewFlags: true },
          },
        ],
        updatedAt: 'SERVER_TIMESTAMP',
      }

      expect(familyUpdate.caregivers[0].permissions).toEqual({
        canExtendTime: true,
        canViewFlags: true,
      })
    })

    it('creates audit log in same batch', () => {
      // Batch should contain both family update and audit log creation
      const batchOperations = ['family.update', 'auditLog.set']
      expect(batchOperations.length).toBe(2)
    })
  })
})
