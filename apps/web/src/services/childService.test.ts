import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import {
  addChildToFamily,
  getChild,
  getChildrenForFamily,
  isUserGuardianForChild,
  hasFullPermissionsForChild,
  updateChild,
  ChildServiceError,
} from './childService'
import type { CreateChildInput, UpdateChildInput } from '@fledgely/contracts'

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  serverTimestamp: vi.fn(() => ({ toDate: () => new Date() })),
  runTransaction: vi.fn(),
  arrayUnion: vi.fn((id) => id),
}))

vi.mock('@/lib/firebase', () => ({
  db: {},
}))

// Import mocked functions for test control
import {
  doc,
  getDoc,
  getDocs,
  collection,
  runTransaction,
} from 'firebase/firestore'

describe('childService', () => {
  const mockUserId = 'test-user-123'
  const mockFamilyId = 'test-family-456'
  const mockChildId = 'test-child-789'

  const mockCreateChildInput: CreateChildInput = {
    firstName: 'Emma',
    birthdate: new Date('2015-06-15'),
  }

  const mockChildData = {
    id: mockChildId,
    familyId: mockFamilyId,
    firstName: 'Emma',
    lastName: null,
    nickname: null,
    birthdate: { toDate: () => new Date('2015-06-15') },
    photoUrl: null,
    guardians: [
      {
        uid: mockUserId,
        permissions: 'full',
        grantedAt: { toDate: () => new Date() },
      },
    ],
    createdAt: { toDate: () => new Date() },
    createdBy: mockUserId,
  }

  const mockFamilyData = {
    id: mockFamilyId,
    guardians: [
      {
        uid: mockUserId,
        role: 'primary',
        permissions: 'full',
        joinedAt: { toDate: () => new Date() },
      },
    ],
    children: [],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset console.error to prevent test output noise
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('addChildToFamily', () => {
    it('creates a child document and updates family', async () => {
      // Setup
      const mockFamilyRef = { id: mockFamilyId }
      const mockChildRef = { id: mockChildId }

      ;(doc as Mock).mockReturnValueOnce(mockChildRef).mockReturnValueOnce(mockFamilyRef)
      ;(collection as Mock).mockReturnValue({})
      ;(runTransaction as Mock).mockImplementation(async (_db, callback) => {
        const transaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => mockFamilyData,
          }),
          set: vi.fn(),
          update: vi.fn(),
        }
        await callback(transaction)
      })

      // Execute
      const result = await addChildToFamily(mockFamilyId, mockCreateChildInput, mockUserId)

      // Assert
      expect(result).toBeDefined()
      expect(result.firstName).toBe('Emma')
      expect(result.familyId).toBe(mockFamilyId)
      expect(result.createdBy).toBe(mockUserId)
      expect(result.guardians).toHaveLength(1)
      expect(result.guardians[0].uid).toBe(mockUserId)
      expect(result.guardians[0].permissions).toBe('full')
    })

    it('includes lastName when provided', async () => {
      const inputWithLastName = {
        ...mockCreateChildInput,
        lastName: 'Smith',
      }

      ;(doc as Mock).mockReturnValue({ id: mockChildId })
      ;(collection as Mock).mockReturnValue({})
      ;(runTransaction as Mock).mockImplementation(async (_db, callback) => {
        const transaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => mockFamilyData,
          }),
          set: vi.fn(),
          update: vi.fn(),
        }
        await callback(transaction)
      })

      const result = await addChildToFamily(mockFamilyId, inputWithLastName, mockUserId)

      expect(result.lastName).toBe('Smith')
    })

    it('throws error when family not found', async () => {
      ;(doc as Mock).mockReturnValue({ id: mockChildId })
      ;(collection as Mock).mockReturnValue({})
      ;(runTransaction as Mock).mockImplementation(async (_db, callback) => {
        const transaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => false,
          }),
          set: vi.fn(),
          update: vi.fn(),
        }
        await callback(transaction)
      })

      await expect(addChildToFamily(mockFamilyId, mockCreateChildInput, mockUserId)).rejects.toThrow(
        'We could not find your family'
      )
    })

    it('throws error when user is not a guardian', async () => {
      const familyWithDifferentGuardian = {
        ...mockFamilyData,
        guardians: [
          {
            uid: 'different-user',
            role: 'primary',
            permissions: 'full',
            joinedAt: { toDate: () => new Date() },
          },
        ],
      }

      ;(doc as Mock).mockReturnValue({ id: mockChildId })
      ;(collection as Mock).mockReturnValue({})
      ;(runTransaction as Mock).mockImplementation(async (_db, callback) => {
        const transaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => familyWithDifferentGuardian,
          }),
          set: vi.fn(),
          update: vi.fn(),
        }
        await callback(transaction)
      })

      await expect(addChildToFamily(mockFamilyId, mockCreateChildInput, mockUserId)).rejects.toThrow(
        'Only parents can add children'
      )
    })

    it('throws error when guardian has readonly permissions', async () => {
      const familyWithReadonlyGuardian = {
        ...mockFamilyData,
        guardians: [
          {
            uid: mockUserId,
            role: 'co-parent',
            permissions: 'readonly',
            joinedAt: { toDate: () => new Date() },
          },
        ],
      }

      ;(doc as Mock).mockReturnValue({ id: mockChildId })
      ;(collection as Mock).mockReturnValue({})
      ;(runTransaction as Mock).mockImplementation(async (_db, callback) => {
        const transaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => familyWithReadonlyGuardian,
          }),
          set: vi.fn(),
          update: vi.fn(),
        }
        await callback(transaction)
      })

      await expect(addChildToFamily(mockFamilyId, mockCreateChildInput, mockUserId)).rejects.toThrow(
        'You cannot add children'
      )
    })

    it('validates input before creating', async () => {
      const invalidInput = {
        firstName: '', // Empty name is invalid
        birthdate: new Date('2015-06-15'),
      } as CreateChildInput

      await expect(addChildToFamily(mockFamilyId, invalidInput, mockUserId)).rejects.toThrow()
    })

    it('rejects children 18 or older', async () => {
      const adultBirthdate = new Date()
      adultBirthdate.setFullYear(adultBirthdate.getFullYear() - 18)
      adultBirthdate.setDate(adultBirthdate.getDate() - 1)

      const inputWithAdult = {
        firstName: 'Emma',
        birthdate: adultBirthdate,
      } as CreateChildInput

      await expect(addChildToFamily(mockFamilyId, inputWithAdult, mockUserId)).rejects.toThrow()
    })
  })

  describe('getChild', () => {
    it('returns child profile when found', async () => {
      ;(doc as Mock).mockReturnValue({ id: mockChildId })
      ;(getDoc as Mock).mockResolvedValue({
        exists: () => true,
        id: mockChildId,
        data: () => mockChildData,
      })

      const result = await getChild(mockChildId)

      expect(result).toBeDefined()
      expect(result?.id).toBe(mockChildId)
      expect(result?.firstName).toBe('Emma')
    })

    it('returns null when child not found', async () => {
      ;(doc as Mock).mockReturnValue({ id: mockChildId })
      ;(getDoc as Mock).mockResolvedValue({
        exists: () => false,
      })

      const result = await getChild(mockChildId)

      expect(result).toBeNull()
    })

    it('throws error on firebase failure', async () => {
      ;(doc as Mock).mockReturnValue({ id: mockChildId })
      ;(getDoc as Mock).mockRejectedValue(new Error('Network error'))

      await expect(getChild(mockChildId)).rejects.toThrow()
    })
  })

  describe('getChildrenForFamily', () => {
    it('returns all children for a family', async () => {
      const mockChild2Data = {
        ...mockChildData,
        id: 'child-2',
        firstName: 'Oliver',
      }

      ;(collection as Mock).mockReturnValue({})
      ;(getDocs as Mock).mockResolvedValue({
        docs: [
          {
            id: mockChildId,
            data: () => mockChildData,
          },
          {
            id: 'child-2',
            data: () => mockChild2Data,
          },
        ],
      })

      const result = await getChildrenForFamily(mockFamilyId)

      expect(result).toHaveLength(2)
      expect(result[0].firstName).toBe('Emma')
      expect(result[1].firstName).toBe('Oliver')
    })

    it('returns empty array when no children exist', async () => {
      ;(collection as Mock).mockReturnValue({})
      ;(getDocs as Mock).mockResolvedValue({
        docs: [],
      })

      const result = await getChildrenForFamily(mockFamilyId)

      expect(result).toHaveLength(0)
    })
  })

  describe('isUserGuardianForChild', () => {
    it('returns true when user is a guardian', async () => {
      ;(doc as Mock).mockReturnValue({ id: mockChildId })
      ;(getDoc as Mock).mockResolvedValue({
        exists: () => true,
        id: mockChildId,
        data: () => mockChildData,
      })

      const result = await isUserGuardianForChild(mockChildId, mockUserId)

      expect(result).toBe(true)
    })

    it('returns false when user is not a guardian', async () => {
      ;(doc as Mock).mockReturnValue({ id: mockChildId })
      ;(getDoc as Mock).mockResolvedValue({
        exists: () => true,
        id: mockChildId,
        data: () => mockChildData,
      })

      const result = await isUserGuardianForChild(mockChildId, 'stranger-user')

      expect(result).toBe(false)
    })

    it('returns false when child not found', async () => {
      ;(doc as Mock).mockReturnValue({ id: mockChildId })
      ;(getDoc as Mock).mockResolvedValue({
        exists: () => false,
      })

      const result = await isUserGuardianForChild(mockChildId, mockUserId)

      expect(result).toBe(false)
    })
  })

  describe('hasFullPermissionsForChild', () => {
    it('returns true when user has full permissions', async () => {
      ;(doc as Mock).mockReturnValue({ id: mockChildId })
      ;(getDoc as Mock).mockResolvedValue({
        exists: () => true,
        id: mockChildId,
        data: () => mockChildData,
      })

      const result = await hasFullPermissionsForChild(mockChildId, mockUserId)

      expect(result).toBe(true)
    })

    it('returns false when user has readonly permissions', async () => {
      const childWithReadonlyGuardian = {
        ...mockChildData,
        guardians: [
          {
            uid: mockUserId,
            permissions: 'readonly',
            grantedAt: { toDate: () => new Date() },
          },
        ],
      }

      ;(doc as Mock).mockReturnValue({ id: mockChildId })
      ;(getDoc as Mock).mockResolvedValue({
        exists: () => true,
        id: mockChildId,
        data: () => childWithReadonlyGuardian,
      })

      const result = await hasFullPermissionsForChild(mockChildId, mockUserId)

      expect(result).toBe(false)
    })

    it('returns false when user is not a guardian', async () => {
      ;(doc as Mock).mockReturnValue({ id: mockChildId })
      ;(getDoc as Mock).mockResolvedValue({
        exists: () => true,
        id: mockChildId,
        data: () => mockChildData,
      })

      const result = await hasFullPermissionsForChild(mockChildId, 'stranger-user')

      expect(result).toBe(false)
    })
  })

  describe('updateChild', () => {
    const mockUpdateInput: UpdateChildInput = {
      firstName: 'Emily',
    }

    it('updates child profile successfully', async () => {
      const mockChildRef = { id: mockChildId }

      ;(doc as Mock).mockReturnValue(mockChildRef)
      ;(collection as Mock).mockReturnValue({})
      ;(runTransaction as Mock).mockImplementation(async (_db, callback) => {
        const transaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => mockChildData,
          }),
          update: vi.fn(),
          set: vi.fn(),
        }
        await callback(transaction)
      })

      const result = await updateChild(mockChildId, mockUpdateInput, mockUserId)

      expect(result).toBeDefined()
      expect(result.firstName).toBe('Emily')
      expect(result.updatedBy).toBe(mockUserId)
    })

    it('throws error when child not found', async () => {
      ;(doc as Mock).mockReturnValue({ id: mockChildId })
      ;(collection as Mock).mockReturnValue({})
      ;(runTransaction as Mock).mockImplementation(async (_db, callback) => {
        const transaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => false,
          }),
          update: vi.fn(),
          set: vi.fn(),
        }
        await callback(transaction)
      })

      await expect(updateChild(mockChildId, mockUpdateInput, mockUserId)).rejects.toThrow(
        'We could not find this child profile'
      )
    })

    it('throws error when user is not a guardian', async () => {
      ;(doc as Mock).mockReturnValue({ id: mockChildId })
      ;(collection as Mock).mockReturnValue({})
      ;(runTransaction as Mock).mockImplementation(async (_db, callback) => {
        const transaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => mockChildData,
          }),
          update: vi.fn(),
          set: vi.fn(),
        }
        await callback(transaction)
      })

      await expect(updateChild(mockChildId, mockUpdateInput, 'stranger-user')).rejects.toThrow(
        'Only parents can add children'
      )
    })

    it('throws error when user has readonly permissions', async () => {
      const childWithReadonlyGuardian = {
        ...mockChildData,
        guardians: [
          {
            uid: mockUserId,
            permissions: 'readonly',
            grantedAt: { toDate: () => new Date() },
          },
        ],
      }

      ;(doc as Mock).mockReturnValue({ id: mockChildId })
      ;(collection as Mock).mockReturnValue({})
      ;(runTransaction as Mock).mockImplementation(async (_db, callback) => {
        const transaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => childWithReadonlyGuardian,
          }),
          update: vi.fn(),
          set: vi.fn(),
        }
        await callback(transaction)
      })

      await expect(updateChild(mockChildId, mockUpdateInput, mockUserId)).rejects.toThrow(
        'You do not have permission to edit this profile'
      )
    })

    it('returns unchanged child when no changes provided', async () => {
      const childWithAllFields = {
        ...mockChildData,
        updatedAt: null,
        updatedBy: null,
        custodyDeclaration: null,
        custodyHistory: [],
        requiresSharedCustodySafeguards: false,
      }

      ;(doc as Mock).mockReturnValue({ id: mockChildId })
      ;(collection as Mock).mockReturnValue({})
      ;(runTransaction as Mock).mockImplementation(async (_db, callback) => {
        const transaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => childWithAllFields,
          }),
          update: vi.fn(),
          set: vi.fn(),
        }
        await callback(transaction)
      })

      // Pass same firstName as existing child
      const result = await updateChild(mockChildId, { firstName: 'Emma' }, mockUserId)

      expect(result).toBeDefined()
      expect(result.firstName).toBe('Emma')
    })

    it('updates multiple fields at once', async () => {
      const multiFieldUpdate: UpdateChildInput = {
        firstName: 'Emily',
        lastName: 'Johnson',
        nickname: 'Emmy',
      }

      ;(doc as Mock).mockReturnValue({ id: mockChildId })
      ;(collection as Mock).mockReturnValue({})
      ;(runTransaction as Mock).mockImplementation(async (_db, callback) => {
        const transaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => mockChildData,
          }),
          update: vi.fn(),
          set: vi.fn(),
        }
        await callback(transaction)
      })

      const result = await updateChild(mockChildId, multiFieldUpdate, mockUserId)

      expect(result.firstName).toBe('Emily')
      expect(result.lastName).toBe('Johnson')
      expect(result.nickname).toBe('Emmy')
    })

    it('creates audit log entry on update', async () => {
      const mockSetFn = vi.fn()

      ;(doc as Mock).mockReturnValue({ id: mockChildId })
      ;(collection as Mock).mockReturnValue({})
      ;(runTransaction as Mock).mockImplementation(async (_db, callback) => {
        const transaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => mockChildData,
          }),
          update: vi.fn(),
          set: mockSetFn,
        }
        await callback(transaction)
      })

      await updateChild(mockChildId, mockUpdateInput, mockUserId)

      // Verify audit log was created (set was called)
      expect(mockSetFn).toHaveBeenCalled()
    })

    it('validates input before updating', async () => {
      const invalidInput = {
        firstName: '', // Empty name is invalid
      } as UpdateChildInput

      await expect(updateChild(mockChildId, invalidInput, mockUserId)).rejects.toThrow()
    })
  })

  describe('ChildServiceError', () => {
    it('creates error with code and message', () => {
      const error = new ChildServiceError('test-code', 'Test message')

      expect(error.code).toBe('test-code')
      expect(error.message).toBe('Test message')
      expect(error.name).toBe('ChildServiceError')
    })
  })

  describe('adversarial tests', () => {
    describe('cross-family child access prevention', () => {
      it('user from family A cannot add child to family B', async () => {
        const familyBData = {
          id: 'family-B',
          guardians: [
            {
              uid: 'user-family-B',
              role: 'primary',
              permissions: 'full',
              joinedAt: { toDate: () => new Date() },
            },
          ],
          children: [],
        }

        ;(doc as Mock).mockReturnValue({ id: mockChildId })
        ;(collection as Mock).mockReturnValue({})
        ;(runTransaction as Mock).mockImplementation(async (_db, callback) => {
          const transaction = {
            get: vi.fn().mockResolvedValue({
              exists: () => true,
              data: () => familyBData,
            }),
            set: vi.fn(),
            update: vi.fn(),
          }
          await callback(transaction)
        })

        // User A trying to add to family B
        await expect(
          addChildToFamily('family-B', mockCreateChildInput, 'user-family-A')
        ).rejects.toThrow('Only parents can add children')
      })
    })

    describe('input validation', () => {
      it('rejects child name with path injection characters', async () => {
        const maliciousInput = {
          firstName: 'child/../../../etc/passwd',
          birthdate: new Date('2015-06-15'),
        } as CreateChildInput

        await expect(
          addChildToFamily(mockFamilyId, maliciousInput, mockUserId)
        ).rejects.toThrow()
      })

      it('rejects child name with null bytes', async () => {
        const maliciousInput = {
          firstName: 'child\x00name',
          birthdate: new Date('2015-06-15'),
        } as CreateChildInput

        await expect(
          addChildToFamily(mockFamilyId, maliciousInput, mockUserId)
        ).rejects.toThrow()
      })

      it('rejects very long names (DoS prevention)', async () => {
        const maliciousInput = {
          firstName: 'A'.repeat(1000),
          birthdate: new Date('2015-06-15'),
        } as CreateChildInput

        await expect(
          addChildToFamily(mockFamilyId, maliciousInput, mockUserId)
        ).rejects.toThrow()
      })

      it('rejects future birthdate', async () => {
        const futureBirthdate = new Date()
        futureBirthdate.setFullYear(futureBirthdate.getFullYear() + 1)

        const maliciousInput = {
          firstName: 'Emma',
          birthdate: futureBirthdate,
        } as CreateChildInput

        await expect(
          addChildToFamily(mockFamilyId, maliciousInput, mockUserId)
        ).rejects.toThrow()
      })
    })

    describe('permission level enforcement', () => {
      it('readonly guardian cannot add children', async () => {
        const familyWithReadonlyGuardian = {
          ...mockFamilyData,
          guardians: [
            {
              uid: mockUserId,
              role: 'co-parent',
              permissions: 'readonly',
              joinedAt: { toDate: () => new Date() },
            },
          ],
        }

        ;(doc as Mock).mockReturnValue({ id: mockChildId })
        ;(collection as Mock).mockReturnValue({})
        ;(runTransaction as Mock).mockImplementation(async (_db, callback) => {
          const transaction = {
            get: vi.fn().mockResolvedValue({
              exists: () => true,
              data: () => familyWithReadonlyGuardian,
            }),
            set: vi.fn(),
            update: vi.fn(),
          }
          await callback(transaction)
        })

        await expect(
          addChildToFamily(mockFamilyId, mockCreateChildInput, mockUserId)
        ).rejects.toThrow('You cannot add children')
      })
    })
  })
})
