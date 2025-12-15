import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import {
  declareCustody,
  updateCustody,
  declareOrUpdateCustody,
  getCustodyDeclaration,
  CustodyServiceError,
} from './custodyService'
import type { CreateCustodyDeclarationInput } from '@fledgely/contracts'

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  serverTimestamp: vi.fn(() => ({ toDate: () => new Date() })),
  runTransaction: vi.fn(),
}))

vi.mock('@/lib/firebase', () => ({
  db: {},
}))

// Import mocked functions for test control
import { doc, getDoc, runTransaction } from 'firebase/firestore'

describe('custodyService', () => {
  const mockUserId = 'test-user-123'
  const mockChildId = 'test-child-789'
  const mockFamilyId = 'test-family-456'

  const mockSoleCustodyInput: CreateCustodyDeclarationInput = {
    type: 'sole',
  }

  const mockSharedCustodyInput: CreateCustodyDeclarationInput = {
    type: 'shared',
  }

  const mockComplexCustodyInput: CreateCustodyDeclarationInput = {
    type: 'complex',
    notes: 'Blended family with step-children',
  }

  // Factory functions to ensure fresh data for each test (prevents mutation issues)
  const createMockChildData = () => ({
    id: mockChildId,
    familyId: mockFamilyId,
    firstName: 'Emma',
    lastName: null,
    birthdate: { toDate: () => new Date('2015-06-15') },
    guardians: [
      {
        uid: mockUserId,
        permissions: 'full',
        grantedAt: { toDate: () => new Date() },
      },
    ],
    createdAt: { toDate: () => new Date() },
    createdBy: mockUserId,
    custodyDeclaration: null,
    custodyHistory: [], // Fresh array for each test
    requiresSharedCustodySafeguards: false,
  })

  const createMockChildDataWithCustody = () => ({
    ...createMockChildData(),
    custodyDeclaration: {
      type: 'sole',
      notes: null,
      declaredBy: mockUserId,
      declaredAt: { toDate: () => new Date() },
    },
  })

  // Legacy references for simpler tests (be careful with mutation!)
  const mockChildData = createMockChildData()
  const mockChildDataWithCustody = createMockChildDataWithCustody()

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset console.error to prevent test output noise
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  // ============================================
  // DECLARE CUSTODY TESTS
  // ============================================
  describe('declareCustody', () => {
    it('declares sole custody successfully', async () => {
      const mockChildRef = { id: mockChildId }

      ;(doc as Mock).mockReturnValue(mockChildRef)
      ;(runTransaction as Mock).mockImplementation(async (_db, callback) => {
        const transaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => mockChildData,
          }),
          update: vi.fn(),
        }
        await callback(transaction)
      })

      const result = await declareCustody(mockChildId, mockSoleCustodyInput, mockUserId)

      expect(result).toBeDefined()
      expect(result.type).toBe('sole')
      expect(result.declaredBy).toBe(mockUserId)
      expect(result.notes).toBeNull()
    })

    it('declares shared custody and sets safeguards flag', async () => {
      const mockChildRef = { id: mockChildId }
      let updateCallArgs: unknown

      ;(doc as Mock).mockReturnValue(mockChildRef)
      ;(runTransaction as Mock).mockImplementation(async (_db, callback) => {
        const transaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => mockChildData,
          }),
          update: vi.fn((ref, data) => {
            updateCallArgs = data
          }),
        }
        await callback(transaction)
      })

      const result = await declareCustody(mockChildId, mockSharedCustodyInput, mockUserId)

      expect(result.type).toBe('shared')
      expect((updateCallArgs as Record<string, unknown>).requiresSharedCustodySafeguards).toBe(true)
    })

    it('declares complex custody with notes', async () => {
      const mockChildRef = { id: mockChildId }

      ;(doc as Mock).mockReturnValue(mockChildRef)
      ;(runTransaction as Mock).mockImplementation(async (_db, callback) => {
        const transaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => mockChildData,
          }),
          update: vi.fn(),
        }
        await callback(transaction)
      })

      const result = await declareCustody(mockChildId, mockComplexCustodyInput, mockUserId)

      expect(result.type).toBe('complex')
      expect(result.notes).toBe('Blended family with step-children')
    })

    it('throws error when child not found', async () => {
      ;(doc as Mock).mockReturnValue({ id: mockChildId })
      ;(runTransaction as Mock).mockImplementation(async (_db, callback) => {
        const transaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => false,
          }),
          update: vi.fn(),
        }
        await callback(transaction)
      })

      await expect(declareCustody(mockChildId, mockSoleCustodyInput, mockUserId)).rejects.toThrow(
        'We could not find this child'
      )
    })

    it('throws error when user is not a guardian', async () => {
      const childWithDifferentGuardian = {
        ...mockChildData,
        guardians: [
          {
            uid: 'different-user',
            permissions: 'full',
            grantedAt: { toDate: () => new Date() },
          },
        ],
      }

      ;(doc as Mock).mockReturnValue({ id: mockChildId })
      ;(runTransaction as Mock).mockImplementation(async (_db, callback) => {
        const transaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => childWithDifferentGuardian,
          }),
          update: vi.fn(),
        }
        await callback(transaction)
      })

      await expect(declareCustody(mockChildId, mockSoleCustodyInput, mockUserId)).rejects.toThrow(
        'Only guardians can declare custody'
      )
    })

    it('throws error when guardian has readonly permissions', async () => {
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
      ;(runTransaction as Mock).mockImplementation(async (_db, callback) => {
        const transaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => childWithReadonlyGuardian,
          }),
          update: vi.fn(),
        }
        await callback(transaction)
      })

      await expect(declareCustody(mockChildId, mockSoleCustodyInput, mockUserId)).rejects.toThrow(
        'You do not have permission'
      )
    })

    it('throws error when custody already declared', async () => {
      ;(doc as Mock).mockReturnValue({ id: mockChildId })
      ;(runTransaction as Mock).mockImplementation(async (_db, callback) => {
        const transaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => mockChildDataWithCustody,
          }),
          update: vi.fn(),
        }
        await callback(transaction)
      })

      await expect(declareCustody(mockChildId, mockSoleCustodyInput, mockUserId)).rejects.toThrow(
        'Custody has already been declared'
      )
    })

    it('validates input before declaring', async () => {
      const invalidInput = {
        type: 'invalid' as 'sole',
      }

      await expect(declareCustody(mockChildId, invalidInput, mockUserId)).rejects.toThrow()
    })
  })

  // ============================================
  // UPDATE CUSTODY TESTS
  // ============================================
  describe('updateCustody', () => {
    it('updates custody successfully and preserves history', async () => {
      let updateCallArgs: unknown

      ;(doc as Mock).mockReturnValue({ id: mockChildId })
      ;(runTransaction as Mock).mockImplementation(async (_db, callback) => {
        const transaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => mockChildDataWithCustody,
          }),
          update: vi.fn((ref, data) => {
            updateCallArgs = data
          }),
        }
        await callback(transaction)
      })

      const result = await updateCustody(mockChildId, mockSharedCustodyInput, mockUserId)

      expect(result.type).toBe('shared')
      // Verify history was preserved
      const history = (updateCallArgs as Record<string, unknown>).custodyHistory as Array<unknown>
      expect(history.length).toBe(1)
    })

    it('sets safeguards flag when changing to shared custody', async () => {
      let updateCallArgs: unknown

      ;(doc as Mock).mockReturnValue({ id: mockChildId })
      ;(runTransaction as Mock).mockImplementation(async (_db, callback) => {
        const transaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => mockChildDataWithCustody,
          }),
          update: vi.fn((ref, data) => {
            updateCallArgs = data
          }),
        }
        await callback(transaction)
      })

      await updateCustody(mockChildId, mockSharedCustodyInput, mockUserId)

      expect((updateCallArgs as Record<string, unknown>).requiresSharedCustodySafeguards).toBe(true)
    })

    it('throws error when no custody exists to update', async () => {
      ;(doc as Mock).mockReturnValue({ id: mockChildId })
      ;(runTransaction as Mock).mockImplementation(async (_db, callback) => {
        const transaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => mockChildData, // No custody declared
          }),
          update: vi.fn(),
        }
        await callback(transaction)
      })

      await expect(updateCustody(mockChildId, mockSharedCustodyInput, mockUserId)).rejects.toThrow(
        'No custody declaration exists'
      )
    })

    it('throws error when user lacks permission', async () => {
      const childWithReadonlyGuardian = {
        ...mockChildDataWithCustody,
        guardians: [
          {
            uid: mockUserId,
            permissions: 'readonly',
            grantedAt: { toDate: () => new Date() },
          },
        ],
      }

      ;(doc as Mock).mockReturnValue({ id: mockChildId })
      ;(runTransaction as Mock).mockImplementation(async (_db, callback) => {
        const transaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => childWithReadonlyGuardian,
          }),
          update: vi.fn(),
        }
        await callback(transaction)
      })

      await expect(updateCustody(mockChildId, mockSharedCustodyInput, mockUserId)).rejects.toThrow(
        'You do not have permission'
      )
    })
  })

  // ============================================
  // DECLARE OR UPDATE CUSTODY TESTS
  // ============================================
  describe('declareOrUpdateCustody', () => {
    it('declares custody when none exists', async () => {
      ;(doc as Mock).mockReturnValue({ id: mockChildId })
      ;(runTransaction as Mock).mockImplementation(async (_db, callback) => {
        const transaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => mockChildData,
          }),
          update: vi.fn(),
        }
        await callback(transaction)
      })

      const result = await declareOrUpdateCustody(mockChildId, mockSoleCustodyInput, mockUserId)

      expect(result.type).toBe('sole')
    })

    it('updates custody when one exists and preserves history', async () => {
      let updateCallArgs: unknown
      // Use factory to get fresh data for this test
      const freshChildDataWithCustody = createMockChildDataWithCustody()

      ;(doc as Mock).mockReturnValue({ id: mockChildId })
      ;(runTransaction as Mock).mockImplementation(async (_db, callback) => {
        const transaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => freshChildDataWithCustody,
          }),
          update: vi.fn((ref, data) => {
            updateCallArgs = data
          }),
        }
        await callback(transaction)
      })

      const result = await declareOrUpdateCustody(mockChildId, mockSharedCustodyInput, mockUserId)

      expect(result.type).toBe('shared')
      // Verify history was preserved - previous declaration added to history
      const history = (updateCallArgs as Record<string, unknown>).custodyHistory as Array<unknown>
      expect(history.length).toBe(1)
    })

    it('throws error when child not found', async () => {
      ;(doc as Mock).mockReturnValue({ id: mockChildId })
      ;(runTransaction as Mock).mockImplementation(async (_db, callback) => {
        const transaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => false,
          }),
          update: vi.fn(),
        }
        await callback(transaction)
      })

      await expect(
        declareOrUpdateCustody(mockChildId, mockSoleCustodyInput, mockUserId)
      ).rejects.toThrow('We could not find this child')
    })
  })

  // ============================================
  // GET CUSTODY DECLARATION TESTS
  // ============================================
  describe('getCustodyDeclaration', () => {
    it('returns custody declaration when exists', async () => {
      ;(doc as Mock).mockReturnValue({ id: mockChildId })
      ;(getDoc as Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockChildDataWithCustody,
      })

      const result = await getCustodyDeclaration(mockChildId)

      expect(result).not.toBeNull()
      expect(result?.type).toBe('sole')
      expect(result?.declaredBy).toBe(mockUserId)
    })

    it('returns null when no custody declared', async () => {
      ;(doc as Mock).mockReturnValue({ id: mockChildId })
      ;(getDoc as Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockChildData,
      })

      const result = await getCustodyDeclaration(mockChildId)

      expect(result).toBeNull()
    })

    it('throws error when child not found', async () => {
      ;(doc as Mock).mockReturnValue({ id: mockChildId })
      ;(getDoc as Mock).mockResolvedValue({
        exists: () => false,
      })

      await expect(getCustodyDeclaration(mockChildId)).rejects.toThrow('We could not find this child')
    })
  })

  // ============================================
  // CUSTODY SERVICE ERROR TESTS
  // ============================================
  describe('CustodyServiceError', () => {
    it('creates error with code and message', () => {
      const error = new CustodyServiceError('test-code', 'Test message')

      expect(error.code).toBe('test-code')
      expect(error.message).toBe('Test message')
      expect(error.name).toBe('CustodyServiceError')
    })
  })

  // ============================================
  // ADVERSARIAL TESTS
  // ============================================
  describe('adversarial tests', () => {
    describe('cross-family custody declaration prevention', () => {
      it('user from family A cannot declare custody for child in family B', async () => {
        const childInFamilyB = {
          ...mockChildData,
          familyId: 'family-B',
          guardians: [
            {
              uid: 'user-family-B',
              permissions: 'full',
              grantedAt: { toDate: () => new Date() },
            },
          ],
        }

        ;(doc as Mock).mockReturnValue({ id: mockChildId })
        ;(runTransaction as Mock).mockImplementation(async (_db, callback) => {
          const transaction = {
            get: vi.fn().mockResolvedValue({
              exists: () => true,
              data: () => childInFamilyB,
            }),
            update: vi.fn(),
          }
          await callback(transaction)
        })

        // User from family A trying to declare custody for child in family B
        await expect(
          declareCustody(mockChildId, mockSoleCustodyInput, 'user-family-A')
        ).rejects.toThrow('Only guardians can declare custody')
      })
    })

    describe('permission level enforcement', () => {
      it('readonly guardian cannot declare custody', async () => {
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
        ;(runTransaction as Mock).mockImplementation(async (_db, callback) => {
          const transaction = {
            get: vi.fn().mockResolvedValue({
              exists: () => true,
              data: () => childWithReadonlyGuardian,
            }),
            update: vi.fn(),
          }
          await callback(transaction)
        })

        await expect(declareCustody(mockChildId, mockSoleCustodyInput, mockUserId)).rejects.toThrow(
          'You do not have permission'
        )
      })

      it('readonly guardian cannot update custody', async () => {
        const childWithReadonlyGuardian = {
          ...mockChildDataWithCustody,
          guardians: [
            {
              uid: mockUserId,
              permissions: 'readonly',
              grantedAt: { toDate: () => new Date() },
            },
          ],
        }

        ;(doc as Mock).mockReturnValue({ id: mockChildId })
        ;(runTransaction as Mock).mockImplementation(async (_db, callback) => {
          const transaction = {
            get: vi.fn().mockResolvedValue({
              exists: () => true,
              data: () => childWithReadonlyGuardian,
            }),
            update: vi.fn(),
          }
          await callback(transaction)
        })

        await expect(updateCustody(mockChildId, mockSharedCustodyInput, mockUserId)).rejects.toThrow(
          'You do not have permission'
        )
      })
    })

    describe('input validation', () => {
      it('rejects custody notes with XSS characters', async () => {
        const maliciousInput = {
          type: 'complex' as const,
          notes: '<script>alert("xss")</script>',
        }

        await expect(declareCustody(mockChildId, maliciousInput, mockUserId)).rejects.toThrow()
      })

      it('rejects custody notes exceeding 500 characters', async () => {
        const maliciousInput = {
          type: 'complex' as const,
          notes: 'a'.repeat(501),
        }

        await expect(declareCustody(mockChildId, maliciousInput, mockUserId)).rejects.toThrow()
      })

      it('rejects invalid custody type', async () => {
        const maliciousInput = {
          type: 'invalid' as 'sole',
        }

        await expect(declareCustody(mockChildId, maliciousInput, mockUserId)).rejects.toThrow()
      })
    })

    describe('shared custody safeguards', () => {
      it('sets safeguards flag for shared custody', async () => {
        let updateCallArgs: unknown

        ;(doc as Mock).mockReturnValue({ id: mockChildId })
        ;(runTransaction as Mock).mockImplementation(async (_db, callback) => {
          const transaction = {
            get: vi.fn().mockResolvedValue({
              exists: () => true,
              data: () => mockChildData,
            }),
            update: vi.fn((ref, data) => {
              updateCallArgs = data
            }),
          }
          await callback(transaction)
        })

        await declareCustody(mockChildId, mockSharedCustodyInput, mockUserId)

        expect((updateCallArgs as Record<string, unknown>).requiresSharedCustodySafeguards).toBe(
          true
        )
      })

      it('does not set safeguards flag for sole custody', async () => {
        let updateCallArgs: unknown

        ;(doc as Mock).mockReturnValue({ id: mockChildId })
        ;(runTransaction as Mock).mockImplementation(async (_db, callback) => {
          const transaction = {
            get: vi.fn().mockResolvedValue({
              exists: () => true,
              data: () => mockChildData,
            }),
            update: vi.fn((ref, data) => {
              updateCallArgs = data
            }),
          }
          await callback(transaction)
        })

        await declareCustody(mockChildId, mockSoleCustodyInput, mockUserId)

        expect((updateCallArgs as Record<string, unknown>).requiresSharedCustodySafeguards).toBe(
          false
        )
      })

      it('does not set safeguards flag for complex custody', async () => {
        let updateCallArgs: unknown

        ;(doc as Mock).mockReturnValue({ id: mockChildId })
        ;(runTransaction as Mock).mockImplementation(async (_db, callback) => {
          const transaction = {
            get: vi.fn().mockResolvedValue({
              exists: () => true,
              data: () => mockChildData,
            }),
            update: vi.fn((ref, data) => {
              updateCallArgs = data
            }),
          }
          await callback(transaction)
        })

        await declareCustody(mockChildId, mockComplexCustodyInput, mockUserId)

        expect((updateCallArgs as Record<string, unknown>).requiresSharedCustodySafeguards).toBe(
          false
        )
      })
    })

    describe('custody history preservation', () => {
      it('preserves history when updating custody', async () => {
        let updateCallArgs: unknown
        const childWithHistory = {
          ...mockChildDataWithCustody,
          custodyHistory: [
            {
              previousDeclaration: {
                type: 'sole',
                notes: null,
                declaredBy: 'old-user',
                declaredAt: { toDate: () => new Date('2023-01-01') },
              },
              changedAt: { toDate: () => new Date('2023-06-01') },
              changedBy: mockUserId,
            },
          ],
        }

        ;(doc as Mock).mockReturnValue({ id: mockChildId })
        ;(runTransaction as Mock).mockImplementation(async (_db, callback) => {
          const transaction = {
            get: vi.fn().mockResolvedValue({
              exists: () => true,
              data: () => childWithHistory,
            }),
            update: vi.fn((ref, data) => {
              updateCallArgs = data
            }),
          }
          await callback(transaction)
        })

        await updateCustody(mockChildId, mockSharedCustodyInput, mockUserId)

        // History should now have 2 entries (existing + new)
        const history = (updateCallArgs as Record<string, unknown>).custodyHistory as Array<unknown>
        expect(history.length).toBe(2)
      })
    })
  })
})
