import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  // Schemas
  legalPetitionStatusSchema,
  claimedRelationshipSchema,
  petitionStatusHistoryEntrySchema,
  legalPetitionSchema,
  legalPetitionFirestoreSchema,
  submitLegalPetitionInputSchema,
  // Helper functions
  generatePetitionReferenceNumber,
  isPetitionExpired,
  canUpdatePetitionStatus,
  getPetitionStatusLabel,
  convertFirestoreToLegalPetition,
  validateSubmitLegalPetitionInput,
  safeParseLegalPetition,
  // Constants
  PETITION_ERROR_MESSAGES,
  PETITION_STATUS_LABELS,
  PETITION_REVIEW_DAYS,
  // Types
  type LegalPetitionStatus,
  type ClaimedRelationship,
  type LegalPetition,
} from './legal-petition.schema'

/**
 * Legal Petition Schema Tests
 *
 * Story 3.6: Legal Parent Petition for Access - Task 1
 *
 * Tests verify:
 * - Petition status enum validation
 * - Claimed relationship enum validation
 * - Legal petition schema validation
 * - Reference number generation
 * - Status transition validation
 * - Firestore conversion
 */

describe('legal-petition.schema', () => {
  // ============================================================================
  // Status Schema Tests
  // ============================================================================

  describe('legalPetitionStatusSchema', () => {
    it('accepts valid status values', () => {
      const validStatuses: LegalPetitionStatus[] = [
        'submitted',
        'reviewing',
        'pending-more-info',
        'verified',
        'denied',
      ]

      validStatuses.forEach((status) => {
        const result = legalPetitionStatusSchema.safeParse(status)
        expect(result.success).toBe(true)
      })
    })

    it('rejects invalid status values', () => {
      const result = legalPetitionStatusSchema.safeParse('invalid-status')
      expect(result.success).toBe(false)
    })
  })

  // ============================================================================
  // Claimed Relationship Schema Tests
  // ============================================================================

  describe('claimedRelationshipSchema', () => {
    it('accepts valid relationship values', () => {
      const validRelationships: ClaimedRelationship[] = ['parent', 'legal-guardian']

      validRelationships.forEach((relationship) => {
        const result = claimedRelationshipSchema.safeParse(relationship)
        expect(result.success).toBe(true)
      })
    })

    it('rejects invalid relationship values', () => {
      const result = claimedRelationshipSchema.safeParse('grandparent')
      expect(result.success).toBe(false)
    })
  })

  // ============================================================================
  // Submit Legal Petition Input Schema Tests
  // ============================================================================

  describe('submitLegalPetitionInputSchema', () => {
    const validInput = {
      petitionerName: 'Jane Doe',
      petitionerEmail: 'jane.doe@example.com',
      petitionerPhone: '+1-555-123-4567',
      childName: 'Tommy Doe',
      childDOB: new Date('2015-06-15'),
      claimedRelationship: 'parent',
      message:
        'I am the biological mother of Tommy. My ex-partner has set up monitoring without my knowledge.',
      documents: [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          fileName: 'custody-order.pdf',
          fileType: 'application/pdf',
          storagePath: '/safety-documents/user-123/doc-1.pdf',
          uploadedAt: new Date(),
          sizeBytes: 1024000,
        },
      ],
    }

    it('validates complete valid input', () => {
      const result = submitLegalPetitionInputSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('validates input without optional phone', () => {
      const inputWithoutPhone = { ...validInput }
      delete (inputWithoutPhone as Record<string, unknown>).petitionerPhone

      const result = submitLegalPetitionInputSchema.safeParse(inputWithoutPhone)
      expect(result.success).toBe(true)
    })

    it('validates input with empty documents array', () => {
      const inputWithNoDocuments = { ...validInput, documents: [] }
      const result = submitLegalPetitionInputSchema.safeParse(inputWithNoDocuments)
      expect(result.success).toBe(true)
    })

    it('rejects input with invalid email', () => {
      const invalidInput = { ...validInput, petitionerEmail: 'not-an-email' }
      const result = submitLegalPetitionInputSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('rejects input with empty petitioner name', () => {
      const invalidInput = { ...validInput, petitionerName: '' }
      const result = submitLegalPetitionInputSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('rejects input with empty child name', () => {
      const invalidInput = { ...validInput, childName: '' }
      const result = submitLegalPetitionInputSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('rejects input with future child DOB', () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)
      const invalidInput = { ...validInput, childDOB: futureDate }
      const result = submitLegalPetitionInputSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('rejects input with more than 5 documents', () => {
      // Generate 6 valid UUIDs for documents
      const uuids = [
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440002',
        '550e8400-e29b-41d4-a716-446655440003',
        '550e8400-e29b-41d4-a716-446655440004',
        '550e8400-e29b-41d4-a716-446655440005',
        '550e8400-e29b-41d4-a716-446655440006',
      ]
      const sixDocuments = uuids.map((uuid, i) => ({
        id: uuid,
        fileName: `document-${i}.pdf`,
        fileType: 'application/pdf',
        storagePath: `/safety-documents/user-123/doc-${i}.pdf`,
        uploadedAt: new Date(),
        sizeBytes: 1024,
      }))
      const invalidInput = { ...validInput, documents: sixDocuments }
      const result = submitLegalPetitionInputSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('rejects input with message exceeding 5000 characters', () => {
      const longMessage = 'x'.repeat(5001)
      const invalidInput = { ...validInput, message: longMessage }
      const result = submitLegalPetitionInputSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })
  })

  // ============================================================================
  // Legal Petition Schema Tests
  // ============================================================================

  describe('legalPetitionSchema', () => {
    const validPetition: LegalPetition = {
      id: 'petition-123',
      referenceNumber: 'LP-20251215-A1B2C',
      petitionerName: 'Jane Doe',
      petitionerEmail: 'jane.doe@example.com',
      petitionerPhone: '+1-555-123-4567',
      childName: 'Tommy Doe',
      childDOB: new Date('2015-06-15'),
      claimedRelationship: 'parent',
      message: 'I am requesting access to monitoring of my child.',
      documents: [],
      status: 'submitted',
      submittedAt: new Date(),
      updatedAt: new Date(),
      statusHistory: [
        {
          status: 'submitted',
          timestamp: new Date(),
          updatedBy: 'system',
        },
      ],
      internalNotes: [],
    }

    it('validates complete valid petition', () => {
      const result = legalPetitionSchema.safeParse(validPetition)
      expect(result.success).toBe(true)
    })

    it('validates petition with optional fields', () => {
      const petitionWithOptionals: LegalPetition = {
        ...validPetition,
        targetFamilyId: 'family-456',
        assignedTo: 'support-agent-789',
        petitionerUserId: 'user-abc',
      }
      const result = legalPetitionSchema.safeParse(petitionWithOptionals)
      expect(result.success).toBe(true)
    })

    it('validates petition without phone', () => {
      const petitionWithoutPhone = { ...validPetition }
      delete (petitionWithoutPhone as Record<string, unknown>).petitionerPhone
      const result = legalPetitionSchema.safeParse(petitionWithoutPhone)
      expect(result.success).toBe(true)
    })

    it('rejects petition with invalid reference number format', () => {
      const invalidPetition = { ...validPetition, referenceNumber: 'INVALID-REF' }
      const result = legalPetitionSchema.safeParse(invalidPetition)
      expect(result.success).toBe(false)
    })

    it('rejects petition with invalid status', () => {
      const invalidPetition = { ...validPetition, status: 'invalid-status' }
      const result = legalPetitionSchema.safeParse(invalidPetition)
      expect(result.success).toBe(false)
    })
  })

  // ============================================================================
  // Reference Number Generation Tests
  // ============================================================================

  describe('generatePetitionReferenceNumber', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-12-15T10:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('generates reference number in correct format', () => {
      const refNumber = generatePetitionReferenceNumber()
      expect(refNumber).toMatch(/^LP-\d{8}-[A-Z0-9]{5}$/)
    })

    it('includes current date in YYYYMMDD format', () => {
      const refNumber = generatePetitionReferenceNumber()
      expect(refNumber.startsWith('LP-20251215-')).toBe(true)
    })

    it('generates unique reference numbers', () => {
      const refs = new Set<string>()
      for (let i = 0; i < 100; i++) {
        refs.add(generatePetitionReferenceNumber())
      }
      expect(refs.size).toBe(100)
    })
  })

  // ============================================================================
  // Status Helper Functions Tests
  // ============================================================================

  describe('isPetitionExpired', () => {
    it('returns false for recently submitted petition', () => {
      const petition = {
        submittedAt: new Date(),
        status: 'submitted' as const,
      }
      expect(isPetitionExpired(petition)).toBe(false)
    })

    it('returns true for petition submitted over 90 days ago without resolution', () => {
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 91)
      const petition = {
        submittedAt: oldDate,
        status: 'reviewing' as const,
      }
      expect(isPetitionExpired(petition)).toBe(true)
    })

    it('returns false for verified petition regardless of age', () => {
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 120)
      const petition = {
        submittedAt: oldDate,
        status: 'verified' as const,
      }
      expect(isPetitionExpired(petition)).toBe(false)
    })

    it('returns false for denied petition regardless of age', () => {
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 120)
      const petition = {
        submittedAt: oldDate,
        status: 'denied' as const,
      }
      expect(isPetitionExpired(petition)).toBe(false)
    })
  })

  describe('canUpdatePetitionStatus', () => {
    it('allows submitted to reviewing transition', () => {
      expect(canUpdatePetitionStatus('submitted', 'reviewing')).toBe(true)
    })

    it('allows reviewing to pending-more-info transition', () => {
      expect(canUpdatePetitionStatus('reviewing', 'pending-more-info')).toBe(true)
    })

    it('allows reviewing to verified transition', () => {
      expect(canUpdatePetitionStatus('reviewing', 'verified')).toBe(true)
    })

    it('allows reviewing to denied transition', () => {
      expect(canUpdatePetitionStatus('reviewing', 'denied')).toBe(true)
    })

    it('allows pending-more-info to reviewing transition', () => {
      expect(canUpdatePetitionStatus('pending-more-info', 'reviewing')).toBe(true)
    })

    it('denies verified to any other status transition', () => {
      expect(canUpdatePetitionStatus('verified', 'reviewing')).toBe(false)
      expect(canUpdatePetitionStatus('verified', 'denied')).toBe(false)
      expect(canUpdatePetitionStatus('verified', 'submitted')).toBe(false)
    })

    it('denies denied to any other status transition', () => {
      expect(canUpdatePetitionStatus('denied', 'reviewing')).toBe(false)
      expect(canUpdatePetitionStatus('denied', 'verified')).toBe(false)
      expect(canUpdatePetitionStatus('denied', 'submitted')).toBe(false)
    })

    it('denies submitted to verified directly (must go through reviewing)', () => {
      expect(canUpdatePetitionStatus('submitted', 'verified')).toBe(false)
    })
  })

  describe('getPetitionStatusLabel', () => {
    it('returns correct label for each status', () => {
      expect(getPetitionStatusLabel('submitted')).toBe('Submitted')
      expect(getPetitionStatusLabel('reviewing')).toBe('Under Review')
      expect(getPetitionStatusLabel('pending-more-info')).toBe('More Information Needed')
      expect(getPetitionStatusLabel('verified')).toBe('Verified')
      expect(getPetitionStatusLabel('denied')).toBe('Denied')
    })
  })

  // ============================================================================
  // Firestore Conversion Tests
  // ============================================================================

  describe('convertFirestoreToLegalPetition', () => {
    it('converts Firestore document to LegalPetition', () => {
      const now = new Date()
      const childDOB = new Date('2015-06-15')

      const firestoreData = {
        id: 'petition-123',
        referenceNumber: 'LP-20251215-A1B2C',
        petitionerName: 'Jane Doe',
        petitionerEmail: 'jane.doe@example.com',
        childName: 'Tommy Doe',
        childDOB: { toDate: () => childDOB },
        claimedRelationship: 'parent',
        message: 'Test message',
        documents: [],
        status: 'submitted',
        submittedAt: { toDate: () => now },
        updatedAt: { toDate: () => now },
        statusHistory: [
          {
            status: 'submitted',
            timestamp: { toDate: () => now },
            updatedBy: 'system',
          },
        ],
        internalNotes: [],
      }

      const result = convertFirestoreToLegalPetition(firestoreData)

      expect(result.id).toBe('petition-123')
      expect(result.referenceNumber).toBe('LP-20251215-A1B2C')
      expect(result.submittedAt).toEqual(now)
      expect(result.childDOB).toEqual(childDOB)
      expect(result.status).toBe('submitted')
    })

    it('converts optional fields when present', () => {
      const now = new Date()
      const childDOB = new Date('2015-06-15')

      const firestoreData = {
        id: 'petition-123',
        referenceNumber: 'LP-20251215-A1B2C',
        petitionerName: 'Jane Doe',
        petitionerEmail: 'jane.doe@example.com',
        petitionerPhone: '+1-555-123-4567',
        childName: 'Tommy Doe',
        childDOB: { toDate: () => childDOB },
        claimedRelationship: 'parent',
        message: 'Test message',
        documents: [],
        status: 'reviewing',
        targetFamilyId: 'family-456',
        assignedTo: 'agent-789',
        petitionerUserId: 'user-abc',
        submittedAt: { toDate: () => now },
        updatedAt: { toDate: () => now },
        statusHistory: [],
        internalNotes: ['Internal note 1'],
      }

      const result = convertFirestoreToLegalPetition(firestoreData)

      expect(result.petitionerPhone).toBe('+1-555-123-4567')
      expect(result.targetFamilyId).toBe('family-456')
      expect(result.assignedTo).toBe('agent-789')
      expect(result.petitionerUserId).toBe('user-abc')
      expect(result.internalNotes).toEqual(['Internal note 1'])
    })
  })

  // ============================================================================
  // Validation Helper Tests
  // ============================================================================

  describe('validateSubmitLegalPetitionInput', () => {
    const validInput = {
      petitionerName: 'Jane Doe',
      petitionerEmail: 'jane.doe@example.com',
      childName: 'Tommy Doe',
      childDOB: new Date('2015-06-15'),
      claimedRelationship: 'parent',
      message: 'Test petition message',
      documents: [],
    }

    it('returns validated input for valid data', () => {
      const result = validateSubmitLegalPetitionInput(validInput)
      expect(result.petitionerName).toBe('Jane Doe')
      expect(result.petitionerEmail).toBe('jane.doe@example.com')
    })

    it('throws for invalid data', () => {
      const invalidInput = { ...validInput, petitionerEmail: 'invalid' }
      expect(() => validateSubmitLegalPetitionInput(invalidInput)).toThrow()
    })
  })

  describe('safeParseLegalPetition', () => {
    const validPetition = {
      id: 'petition-123',
      referenceNumber: 'LP-20251215-A1B2C',
      petitionerName: 'Jane Doe',
      petitionerEmail: 'jane.doe@example.com',
      childName: 'Tommy Doe',
      childDOB: new Date('2015-06-15'),
      claimedRelationship: 'parent',
      message: 'Test message',
      documents: [],
      status: 'submitted',
      submittedAt: new Date(),
      updatedAt: new Date(),
      statusHistory: [],
      internalNotes: [],
    }

    it('returns petition for valid data', () => {
      const result = safeParseLegalPetition(validPetition)
      expect(result).not.toBeNull()
      expect(result?.id).toBe('petition-123')
    })

    it('returns null for invalid data', () => {
      const invalidPetition = { ...validPetition, status: 'invalid' }
      const result = safeParseLegalPetition(invalidPetition)
      expect(result).toBeNull()
    })
  })

  // ============================================================================
  // Constants Tests
  // ============================================================================

  describe('constants', () => {
    it('PETITION_REVIEW_DAYS is 5', () => {
      expect(PETITION_REVIEW_DAYS).toBe(5)
    })

    it('PETITION_STATUS_LABELS has all statuses', () => {
      expect(PETITION_STATUS_LABELS.submitted).toBeDefined()
      expect(PETITION_STATUS_LABELS.reviewing).toBeDefined()
      expect(PETITION_STATUS_LABELS['pending-more-info']).toBeDefined()
      expect(PETITION_STATUS_LABELS.verified).toBeDefined()
      expect(PETITION_STATUS_LABELS.denied).toBeDefined()
    })

    it('PETITION_ERROR_MESSAGES has expected error codes', () => {
      expect(PETITION_ERROR_MESSAGES['petition-not-found']).toBeDefined()
      expect(PETITION_ERROR_MESSAGES['not-authorized']).toBeDefined()
      expect(PETITION_ERROR_MESSAGES['invalid-status-transition']).toBeDefined()
    })
  })

  // ============================================================================
  // Status History Entry Tests
  // ============================================================================

  describe('petitionStatusHistoryEntrySchema', () => {
    it('validates complete status history entry', () => {
      const entry = {
        status: 'reviewing',
        timestamp: new Date(),
        updatedBy: 'support-agent-123',
        note: 'Beginning review of documentation',
      }
      const result = petitionStatusHistoryEntrySchema.safeParse(entry)
      expect(result.success).toBe(true)
    })

    it('validates entry without optional note', () => {
      const entry = {
        status: 'submitted',
        timestamp: new Date(),
        updatedBy: 'system',
      }
      const result = petitionStatusHistoryEntrySchema.safeParse(entry)
      expect(result.success).toBe(true)
    })

    it('rejects entry with invalid status', () => {
      const entry = {
        status: 'invalid-status',
        timestamp: new Date(),
        updatedBy: 'system',
      }
      const result = petitionStatusHistoryEntrySchema.safeParse(entry)
      expect(result.success).toBe(false)
    })
  })
})
