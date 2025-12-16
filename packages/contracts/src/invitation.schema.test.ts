import { describe, it, expect } from 'vitest'
import {
  // Schemas
  invitationStatusSchema,
  invitationExpiryDaysSchema,
  invitationSchema,
  invitationFirestoreSchema,
  createInvitationInputSchema,
  // Story 3.2: Email schemas
  invitationWithEmailSchema,
  sendInvitationEmailInputSchema,
  // Helper functions
  getInvitationErrorMessage,
  isInvitationExpired,
  isInvitationPending,
  canRevokeInvitation,
  canAcceptInvitation,
  convertFirestoreToInvitation,
  validateCreateInvitationInput,
  safeParseInvitation,
  safeParseCreateInvitationInput,
  buildInvitationLink,
  calculateExpiryDate,
  getTimeUntilExpiry,
  // Story 3.2: Email helper functions
  getEmailErrorMessage,
  maskEmail,
  isEmailRateLimited,
  // Classes
  InvitationError,
  // Constants
  INVITATION_ERROR_MESSAGES,
  // Story 3.2: Email constants
  EMAIL_ERROR_MESSAGES,
  MAX_EMAILS_PER_HOUR,
  // Types
  type Invitation,
  type InvitationFirestore,
  type CreateInvitationInput,
  // Story 3.2: Email types
  type InvitationWithEmail,
  type SendInvitationEmailInput,
} from './invitation.schema'

/**
 * Invitation Schema Tests
 *
 * Story 3.1: Co-Parent Invitation Generation
 * Story 3.2: Invitation Delivery (Email tracking)
 *
 * Tests verify:
 * - Schema validation for invitation status and expiry options
 * - Schema validation for invitation documents
 * - Schema validation for create invitation input
 * - Error message helpers at 6th-grade reading level
 * - Firestore conversion functions
 * - Helper functions for invitation state checks
 * - Email masking and rate limiting (Story 3.2)
 */

describe('invitation.schema', () => {
  // ============================================================================
  // Invitation Status Schema Tests
  // ============================================================================

  describe('invitationStatusSchema', () => {
    it('should accept valid status values', () => {
      expect(invitationStatusSchema.parse('pending')).toBe('pending')
      expect(invitationStatusSchema.parse('accepted')).toBe('accepted')
      expect(invitationStatusSchema.parse('revoked')).toBe('revoked')
      expect(invitationStatusSchema.parse('expired')).toBe('expired')
    })

    it('should reject invalid status values', () => {
      expect(() => invitationStatusSchema.parse('invalid')).toThrow()
      expect(() => invitationStatusSchema.parse('')).toThrow()
      expect(() => invitationStatusSchema.parse(null)).toThrow()
      expect(() => invitationStatusSchema.parse(undefined)).toThrow()
    })
  })

  // ============================================================================
  // Invitation Expiry Days Schema Tests
  // ============================================================================

  describe('invitationExpiryDaysSchema', () => {
    it('should accept valid expiry day values', () => {
      expect(invitationExpiryDaysSchema.parse('1')).toBe('1')
      expect(invitationExpiryDaysSchema.parse('3')).toBe('3')
      expect(invitationExpiryDaysSchema.parse('7')).toBe('7')
      expect(invitationExpiryDaysSchema.parse('14')).toBe('14')
      expect(invitationExpiryDaysSchema.parse('30')).toBe('30')
    })

    it('should reject invalid expiry day values', () => {
      expect(() => invitationExpiryDaysSchema.parse('2')).toThrow()
      expect(() => invitationExpiryDaysSchema.parse('5')).toThrow()
      expect(() => invitationExpiryDaysSchema.parse('0')).toThrow()
      expect(() => invitationExpiryDaysSchema.parse('')).toThrow()
      expect(() => invitationExpiryDaysSchema.parse(7)).toThrow() // Number, not string
    })
  })

  // ============================================================================
  // Invitation Schema Tests
  // ============================================================================

  describe('invitationSchema', () => {
    const validInvitation: Invitation = {
      id: 'inv-123',
      familyId: 'family-456',
      familyName: 'Smith Family',
      invitedBy: 'user-789',
      invitedByName: 'Jane Smith',
      tokenHash: 'abc123hash',
      status: 'pending',
      createdAt: new Date('2024-01-15T10:00:00Z'),
      expiresAt: new Date('2024-01-22T10:00:00Z'),
      acceptedAt: null,
      acceptedBy: null,
    }

    it('should accept valid invitation', () => {
      const result = invitationSchema.parse(validInvitation)
      expect(result.id).toBe('inv-123')
      expect(result.familyId).toBe('family-456')
      expect(result.familyName).toBe('Smith Family')
      expect(result.invitedBy).toBe('user-789')
      expect(result.invitedByName).toBe('Jane Smith')
      expect(result.tokenHash).toBe('abc123hash')
      expect(result.status).toBe('pending')
      expect(result.createdAt).toEqual(new Date('2024-01-15T10:00:00Z'))
      expect(result.expiresAt).toEqual(new Date('2024-01-22T10:00:00Z'))
      expect(result.acceptedAt).toBeNull()
      expect(result.acceptedBy).toBeNull()
    })

    it('should accept invitation with accepted status and fields', () => {
      const acceptedInvitation = {
        ...validInvitation,
        status: 'accepted' as const,
        acceptedAt: new Date('2024-01-16T10:00:00Z'),
        acceptedBy: 'user-new',
      }

      const result = invitationSchema.parse(acceptedInvitation)
      expect(result.status).toBe('accepted')
      expect(result.acceptedAt).toEqual(new Date('2024-01-16T10:00:00Z'))
      expect(result.acceptedBy).toBe('user-new')
    })

    it('should reject invitation with missing required fields', () => {
      expect(() => invitationSchema.parse({ ...validInvitation, id: '' })).toThrow()
      expect(() => invitationSchema.parse({ ...validInvitation, familyId: '' })).toThrow()
      expect(() => invitationSchema.parse({ ...validInvitation, familyName: '' })).toThrow()
      expect(() => invitationSchema.parse({ ...validInvitation, invitedBy: '' })).toThrow()
      expect(() => invitationSchema.parse({ ...validInvitation, invitedByName: '' })).toThrow()
      expect(() => invitationSchema.parse({ ...validInvitation, tokenHash: '' })).toThrow()
    })

    it('should reject invitation with invalid status', () => {
      expect(() =>
        invitationSchema.parse({ ...validInvitation, status: 'invalid' })
      ).toThrow()
    })

    it('should reject invitation with invalid dates', () => {
      expect(() =>
        invitationSchema.parse({ ...validInvitation, createdAt: 'not-a-date' })
      ).toThrow()
      expect(() =>
        invitationSchema.parse({ ...validInvitation, expiresAt: 'not-a-date' })
      ).toThrow()
    })
  })

  // ============================================================================
  // Invitation Firestore Schema Tests
  // ============================================================================

  describe('invitationFirestoreSchema', () => {
    const mockTimestamp = (date: Date) => ({
      toDate: () => date,
    })

    it('should accept valid Firestore invitation data', () => {
      const firestoreData = {
        id: 'inv-123',
        familyId: 'family-456',
        familyName: 'Smith Family',
        invitedBy: 'user-789',
        invitedByName: 'Jane Smith',
        tokenHash: 'abc123hash',
        status: 'pending' as const,
        createdAt: mockTimestamp(new Date('2024-01-15T10:00:00Z')),
        expiresAt: mockTimestamp(new Date('2024-01-22T10:00:00Z')),
        acceptedAt: null,
        acceptedBy: null,
      }

      const result = invitationFirestoreSchema.parse(firestoreData)
      expect(result.id).toBe('inv-123')
      expect(result.status).toBe('pending')
    })

    it('should accept Firestore data with Timestamp acceptedAt', () => {
      const firestoreData = {
        id: 'inv-123',
        familyId: 'family-456',
        familyName: 'Smith Family',
        invitedBy: 'user-789',
        invitedByName: 'Jane Smith',
        tokenHash: 'abc123hash',
        status: 'accepted' as const,
        createdAt: mockTimestamp(new Date('2024-01-15T10:00:00Z')),
        expiresAt: mockTimestamp(new Date('2024-01-22T10:00:00Z')),
        acceptedAt: mockTimestamp(new Date('2024-01-16T10:00:00Z')),
        acceptedBy: 'user-new',
      }

      const result = invitationFirestoreSchema.parse(firestoreData)
      expect(result.acceptedBy).toBe('user-new')
    })
  })

  // ============================================================================
  // Create Invitation Input Schema Tests
  // ============================================================================

  describe('createInvitationInputSchema', () => {
    it('should accept valid input with familyId', () => {
      const input: CreateInvitationInput = {
        familyId: 'family-123',
        expiryDays: '7',
      }

      const result = createInvitationInputSchema.parse(input)
      expect(result.familyId).toBe('family-123')
      expect(result.expiryDays).toBe('7')
    })

    it('should use default expiry of 7 days when not specified', () => {
      const input = { familyId: 'family-123' }

      const result = createInvitationInputSchema.parse(input)
      expect(result.expiryDays).toBe('7')
    })

    it('should accept all valid expiry options', () => {
      const expiryOptions = ['1', '3', '7', '14', '30']

      expiryOptions.forEach((expiry) => {
        const result = createInvitationInputSchema.parse({
          familyId: 'family-123',
          expiryDays: expiry,
        })
        expect(result.expiryDays).toBe(expiry)
      })
    })

    it('should reject input with missing familyId', () => {
      expect(() => createInvitationInputSchema.parse({ expiryDays: '7' })).toThrow()
      expect(() =>
        createInvitationInputSchema.parse({ familyId: '', expiryDays: '7' })
      ).toThrow()
    })

    it('should reject input with invalid expiryDays', () => {
      expect(() =>
        createInvitationInputSchema.parse({ familyId: 'family-123', expiryDays: '5' })
      ).toThrow()
    })
  })

  // ============================================================================
  // Error Message Helper Tests
  // ============================================================================

  describe('getInvitationErrorMessage', () => {
    it('should return correct message for known error codes', () => {
      expect(getInvitationErrorMessage('family-not-found')).toBe(
        'We could not find your family.'
      )
      expect(getInvitationErrorMessage('no-children')).toBe(
        'Add a child first before inviting a co-parent.'
      )
      expect(getInvitationErrorMessage('pending-exists')).toBe(
        'You already have a pending invitation.'
      )
      expect(getInvitationErrorMessage('not-authorized')).toBe(
        "You don't have permission to invite co-parents."
      )
      expect(getInvitationErrorMessage('creation-failed')).toBe(
        'Could not create invitation. Please try again.'
      )
      expect(getInvitationErrorMessage('invalid-expiry')).toBe(
        'Please choose how long the invitation should last.'
      )
      expect(getInvitationErrorMessage('invitation-not-found')).toBe(
        'This invitation no longer exists.'
      )
      expect(getInvitationErrorMessage('invitation-expired')).toBe(
        'This invitation has expired.'
      )
      expect(getInvitationErrorMessage('invitation-already-used')).toBe(
        'This invitation has already been used.'
      )
      expect(getInvitationErrorMessage('invitation-revoked')).toBe(
        'This invitation was canceled.'
      )
      expect(getInvitationErrorMessage('token-invalid')).toBe(
        'This invitation link is not valid.'
      )
    })

    it('should return default message for unknown error codes', () => {
      expect(getInvitationErrorMessage('unknown-code')).toBe(
        'Something went wrong. Please try again.'
      )
      expect(getInvitationErrorMessage('')).toBe('Something went wrong. Please try again.')
    })

    it('error messages should be at 6th-grade reading level', () => {
      // Verify messages are simple and clear
      Object.values(INVITATION_ERROR_MESSAGES).forEach((message) => {
        // Messages should be short (less than 80 characters)
        expect(message.length).toBeLessThan(100)
        // Messages should not contain technical jargon
        expect(message).not.toMatch(/unauthorized|forbidden|exception|null|undefined/)
        // Messages should end with proper punctuation
        expect(message).toMatch(/[.!?]$/)
      })
    })
  })

  // ============================================================================
  // Invitation State Helper Tests
  // ============================================================================

  describe('isInvitationExpired', () => {
    it('should return true for expired status', () => {
      const invitation: Invitation = {
        id: 'inv-123',
        familyId: 'family-456',
        familyName: 'Smith Family',
        invitedBy: 'user-789',
        invitedByName: 'Jane Smith',
        tokenHash: 'hash',
        status: 'expired',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000), // Future date
        acceptedAt: null,
        acceptedBy: null,
      }

      expect(isInvitationExpired(invitation)).toBe(true)
    })

    it('should return true for past expiry date even with pending status', () => {
      const invitation: Invitation = {
        id: 'inv-123',
        familyId: 'family-456',
        familyName: 'Smith Family',
        invitedBy: 'user-789',
        invitedByName: 'Jane Smith',
        tokenHash: 'hash',
        status: 'pending',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() - 86400000), // Past date
        acceptedAt: null,
        acceptedBy: null,
      }

      expect(isInvitationExpired(invitation)).toBe(true)
    })

    it('should return false for pending invitation with future expiry', () => {
      const invitation: Invitation = {
        id: 'inv-123',
        familyId: 'family-456',
        familyName: 'Smith Family',
        invitedBy: 'user-789',
        invitedByName: 'Jane Smith',
        tokenHash: 'hash',
        status: 'pending',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000), // Future date
        acceptedAt: null,
        acceptedBy: null,
      }

      expect(isInvitationExpired(invitation)).toBe(false)
    })
  })

  describe('isInvitationPending', () => {
    it('should return true for valid pending invitation', () => {
      const invitation: Invitation = {
        id: 'inv-123',
        familyId: 'family-456',
        familyName: 'Smith Family',
        invitedBy: 'user-789',
        invitedByName: 'Jane Smith',
        tokenHash: 'hash',
        status: 'pending',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000), // Future
        acceptedAt: null,
        acceptedBy: null,
      }

      expect(isInvitationPending(invitation)).toBe(true)
    })

    it('should return false for accepted invitation', () => {
      const invitation: Invitation = {
        id: 'inv-123',
        familyId: 'family-456',
        familyName: 'Smith Family',
        invitedBy: 'user-789',
        invitedByName: 'Jane Smith',
        tokenHash: 'hash',
        status: 'accepted',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        acceptedAt: new Date(),
        acceptedBy: 'user-new',
      }

      expect(isInvitationPending(invitation)).toBe(false)
    })

    it('should return false for pending but expired invitation', () => {
      const invitation: Invitation = {
        id: 'inv-123',
        familyId: 'family-456',
        familyName: 'Smith Family',
        invitedBy: 'user-789',
        invitedByName: 'Jane Smith',
        tokenHash: 'hash',
        status: 'pending',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() - 86400000), // Past
        acceptedAt: null,
        acceptedBy: null,
      }

      expect(isInvitationPending(invitation)).toBe(false)
    })
  })

  describe('canRevokeInvitation', () => {
    it('should return true for pending invitation', () => {
      const invitation: Invitation = {
        id: 'inv-123',
        familyId: 'family-456',
        familyName: 'Smith Family',
        invitedBy: 'user-789',
        invitedByName: 'Jane Smith',
        tokenHash: 'hash',
        status: 'pending',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        acceptedAt: null,
        acceptedBy: null,
      }

      expect(canRevokeInvitation(invitation)).toBe(true)
    })

    it('should return false for non-pending invitations', () => {
      const statuses: Array<'accepted' | 'revoked' | 'expired'> = [
        'accepted',
        'revoked',
        'expired',
      ]

      statuses.forEach((status) => {
        const invitation: Invitation = {
          id: 'inv-123',
          familyId: 'family-456',
          familyName: 'Smith Family',
          invitedBy: 'user-789',
          invitedByName: 'Jane Smith',
          tokenHash: 'hash',
          status,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
          acceptedAt: null,
          acceptedBy: null,
        }

        expect(canRevokeInvitation(invitation)).toBe(false)
      })
    })
  })

  describe('canAcceptInvitation', () => {
    it('should return true for valid pending invitation', () => {
      const invitation: Invitation = {
        id: 'inv-123',
        familyId: 'family-456',
        familyName: 'Smith Family',
        invitedBy: 'user-789',
        invitedByName: 'Jane Smith',
        tokenHash: 'hash',
        status: 'pending',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        acceptedAt: null,
        acceptedBy: null,
      }

      expect(canAcceptInvitation(invitation)).toBe(true)
    })

    it('should return false for expired invitation', () => {
      const invitation: Invitation = {
        id: 'inv-123',
        familyId: 'family-456',
        familyName: 'Smith Family',
        invitedBy: 'user-789',
        invitedByName: 'Jane Smith',
        tokenHash: 'hash',
        status: 'pending',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() - 86400000), // Past
        acceptedAt: null,
        acceptedBy: null,
      }

      expect(canAcceptInvitation(invitation)).toBe(false)
    })
  })

  // ============================================================================
  // Firestore Conversion Tests
  // ============================================================================

  describe('convertFirestoreToInvitation', () => {
    it('should convert Firestore data to domain type', () => {
      const firestoreData: InvitationFirestore = {
        id: 'inv-123',
        familyId: 'family-456',
        familyName: 'Smith Family',
        invitedBy: 'user-789',
        invitedByName: 'Jane Smith',
        tokenHash: 'abc123hash',
        status: 'pending',
        createdAt: {
          toDate: () => new Date('2024-01-15T10:00:00Z'),
        } as unknown as { toDate: () => Date },
        expiresAt: {
          toDate: () => new Date('2024-01-22T10:00:00Z'),
        } as unknown as { toDate: () => Date },
        acceptedAt: null,
        acceptedBy: null,
      }

      const result = convertFirestoreToInvitation(firestoreData)
      expect(result.id).toBe('inv-123')
      expect(result.familyId).toBe('family-456')
      expect(result.createdAt).toEqual(new Date('2024-01-15T10:00:00Z'))
      expect(result.expiresAt).toEqual(new Date('2024-01-22T10:00:00Z'))
      expect(result.acceptedAt).toBeNull()
    })

    it('should convert Firestore data with acceptedAt timestamp', () => {
      const firestoreData: InvitationFirestore = {
        id: 'inv-123',
        familyId: 'family-456',
        familyName: 'Smith Family',
        invitedBy: 'user-789',
        invitedByName: 'Jane Smith',
        tokenHash: 'abc123hash',
        status: 'accepted',
        createdAt: {
          toDate: () => new Date('2024-01-15T10:00:00Z'),
        } as unknown as { toDate: () => Date },
        expiresAt: {
          toDate: () => new Date('2024-01-22T10:00:00Z'),
        } as unknown as { toDate: () => Date },
        acceptedAt: {
          toDate: () => new Date('2024-01-16T10:00:00Z'),
        } as unknown as { toDate: () => Date },
        acceptedBy: 'user-new',
      }

      const result = convertFirestoreToInvitation(firestoreData)
      expect(result.acceptedAt).toEqual(new Date('2024-01-16T10:00:00Z'))
      expect(result.acceptedBy).toBe('user-new')
    })
  })

  // ============================================================================
  // Validation Helper Tests
  // ============================================================================

  describe('validateCreateInvitationInput', () => {
    it('should return validated input for valid data', () => {
      const input = { familyId: 'family-123', expiryDays: '7' }

      const result = validateCreateInvitationInput(input)
      expect(result.familyId).toBe('family-123')
      expect(result.expiryDays).toBe('7')
    })

    it('should throw for invalid data', () => {
      expect(() => validateCreateInvitationInput({ familyId: '' })).toThrow()
    })
  })

  describe('safeParseInvitation', () => {
    it('should return parsed invitation for valid data', () => {
      const validInvitation = {
        id: 'inv-123',
        familyId: 'family-456',
        familyName: 'Smith Family',
        invitedBy: 'user-789',
        invitedByName: 'Jane Smith',
        tokenHash: 'hash',
        status: 'pending',
        createdAt: new Date(),
        expiresAt: new Date(),
        acceptedAt: null,
        acceptedBy: null,
      }

      const result = safeParseInvitation(validInvitation)
      expect(result).not.toBeNull()
      expect(result?.id).toBe('inv-123')
    })

    it('should return null for invalid data', () => {
      const result = safeParseInvitation({ invalid: 'data' })
      expect(result).toBeNull()
    })
  })

  describe('safeParseCreateInvitationInput', () => {
    it('should return parsed input for valid data', () => {
      const input = { familyId: 'family-123' }

      const result = safeParseCreateInvitationInput(input)
      expect(result).not.toBeNull()
      expect(result?.familyId).toBe('family-123')
    })

    it('should return null for invalid data', () => {
      const result = safeParseCreateInvitationInput({ familyId: '' })
      expect(result).toBeNull()
    })
  })

  // ============================================================================
  // Invitation Link Helper Tests
  // ============================================================================

  describe('buildInvitationLink', () => {
    it('should build correct invitation link URL', () => {
      const link = buildInvitationLink('https://fledgely.app', 'inv-123', 'token-abc')
      expect(link).toBe('https://fledgely.app/join/inv-123?token=token-abc')
    })

    it('should handle base URL without trailing slash', () => {
      const link = buildInvitationLink('https://fledgely.app', 'inv-456', 'token-xyz')
      expect(link).toBe('https://fledgely.app/join/inv-456?token=token-xyz')
    })
  })

  // ============================================================================
  // Expiry Date Calculation Tests
  // ============================================================================

  describe('calculateExpiryDate', () => {
    it('should calculate correct expiry date for 1 day', () => {
      const createdAt = new Date('2024-01-15T10:00:00Z')
      const expiresAt = calculateExpiryDate(createdAt, '1')
      expect(expiresAt).toEqual(new Date('2024-01-16T10:00:00Z'))
    })

    it('should calculate correct expiry date for 7 days', () => {
      const createdAt = new Date('2024-01-15T10:00:00Z')
      const expiresAt = calculateExpiryDate(createdAt, '7')
      expect(expiresAt).toEqual(new Date('2024-01-22T10:00:00Z'))
    })

    it('should calculate correct expiry date for 30 days', () => {
      const createdAt = new Date('2024-01-15T10:00:00Z')
      const expiresAt = calculateExpiryDate(createdAt, '30')
      expect(expiresAt).toEqual(new Date('2024-02-14T10:00:00Z'))
    })
  })

  // ============================================================================
  // Time Until Expiry Tests
  // ============================================================================

  describe('getTimeUntilExpiry', () => {
    it('should return "Expired" for past dates', () => {
      const pastDate = new Date(Date.now() - 86400000)
      expect(getTimeUntilExpiry(pastDate)).toBe('Expired')
    })

    it('should return days remaining for future dates', () => {
      const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 1000)
      expect(getTimeUntilExpiry(futureDate)).toBe('3 days')
    })

    it('should return singular "day" for 1 day', () => {
      const oneDayFuture = new Date(Date.now() + 24 * 60 * 60 * 1000 + 1000)
      expect(getTimeUntilExpiry(oneDayFuture)).toBe('1 day')
    })

    it('should return hours for less than 1 day', () => {
      const hoursFuture = new Date(Date.now() + 5 * 60 * 60 * 1000)
      expect(getTimeUntilExpiry(hoursFuture)).toBe('5 hours')
    })

    it('should return singular "hour" for 1 hour', () => {
      const oneHourFuture = new Date(Date.now() + 60 * 60 * 1000 + 1000)
      expect(getTimeUntilExpiry(oneHourFuture)).toBe('1 hour')
    })
  })

  // ============================================================================
  // InvitationError Class Tests
  // ============================================================================

  describe('InvitationError', () => {
    it('should create error with code and default message', () => {
      const error = new InvitationError('family-not-found')
      expect(error.code).toBe('family-not-found')
      expect(error.message).toBe('We could not find your family.')
      expect(error.name).toBe('InvitationError')
    })

    it('should create error with custom message', () => {
      const error = new InvitationError('family-not-found', 'Custom message')
      expect(error.code).toBe('family-not-found')
      expect(error.message).toBe('Custom message')
    })

    it('should be instanceof Error', () => {
      const error = new InvitationError('test')
      expect(error instanceof Error).toBe(true)
      expect(error instanceof InvitationError).toBe(true)
    })

    it('should use default message for unknown codes', () => {
      const error = new InvitationError('unknown-code')
      expect(error.message).toBe('Something went wrong. Please try again.')
    })
  })

  // ============================================================================
  // Story 3.2: Invitation With Email Schema Tests
  // ============================================================================

  describe('invitationWithEmailSchema', () => {
    const baseInvitation: Invitation = {
      id: 'inv-123',
      familyId: 'family-456',
      familyName: 'Smith Family',
      invitedBy: 'user-789',
      invitedByName: 'Jane Smith',
      tokenHash: 'abc123hash',
      status: 'pending',
      createdAt: new Date('2024-01-15T10:00:00Z'),
      expiresAt: new Date('2024-01-22T10:00:00Z'),
      acceptedAt: null,
      acceptedBy: null,
    }

    it('should accept invitation with email tracking fields', () => {
      const invitationWithEmail: InvitationWithEmail = {
        ...baseInvitation,
        emailSentTo: 'ja***@example.com',
        emailSentAt: new Date('2024-01-15T11:00:00Z'),
        emailSendCount: 1,
      }

      const result = invitationWithEmailSchema.parse(invitationWithEmail)
      expect(result.emailSentTo).toBe('ja***@example.com')
      expect(result.emailSentAt).toEqual(new Date('2024-01-15T11:00:00Z'))
      expect(result.emailSendCount).toBe(1)
    })

    it('should accept invitation without email fields (optional)', () => {
      const result = invitationWithEmailSchema.parse(baseInvitation)
      expect(result.emailSentTo).toBeUndefined()
      expect(result.emailSentAt).toBeUndefined()
      expect(result.emailSendCount).toBe(0) // default value
    })

    it('should accept null emailSentTo and emailSentAt', () => {
      const invitationWithEmail = {
        ...baseInvitation,
        emailSentTo: null,
        emailSentAt: null,
        emailSendCount: 0,
      }

      const result = invitationWithEmailSchema.parse(invitationWithEmail)
      expect(result.emailSentTo).toBeNull()
      expect(result.emailSentAt).toBeNull()
    })

    it('should reject negative emailSendCount', () => {
      const invalid = {
        ...baseInvitation,
        emailSendCount: -1,
      }

      expect(() => invitationWithEmailSchema.parse(invalid)).toThrow()
    })

    it('should reject non-integer emailSendCount', () => {
      const invalid = {
        ...baseInvitation,
        emailSendCount: 1.5,
      }

      expect(() => invitationWithEmailSchema.parse(invalid)).toThrow()
    })
  })

  // ============================================================================
  // Story 3.2: Send Invitation Email Input Schema Tests
  // ============================================================================

  describe('sendInvitationEmailInputSchema', () => {
    it('should accept valid email input', () => {
      const input: SendInvitationEmailInput = {
        invitationId: 'inv-123',
        email: 'jane@example.com',
      }

      const result = sendInvitationEmailInputSchema.parse(input)
      expect(result.invitationId).toBe('inv-123')
      expect(result.email).toBe('jane@example.com')
    })

    it('should reject empty invitationId', () => {
      expect(() =>
        sendInvitationEmailInputSchema.parse({ invitationId: '', email: 'jane@example.com' })
      ).toThrow()
    })

    it('should reject invalid email format', () => {
      expect(() =>
        sendInvitationEmailInputSchema.parse({ invitationId: 'inv-123', email: 'not-an-email' })
      ).toThrow()
      expect(() =>
        sendInvitationEmailInputSchema.parse({ invitationId: 'inv-123', email: '@example.com' })
      ).toThrow()
      expect(() =>
        sendInvitationEmailInputSchema.parse({ invitationId: 'inv-123', email: 'jane@' })
      ).toThrow()
    })

    it('should accept various valid email formats', () => {
      const validEmails = [
        'simple@example.com',
        'very.common@example.com',
        'user+tag@example.com',
        'user123@example.co.uk',
      ]

      validEmails.forEach((email) => {
        const result = sendInvitationEmailInputSchema.parse({ invitationId: 'inv-123', email })
        expect(result.email).toBe(email)
      })
    })
  })

  // ============================================================================
  // Story 3.2: Email Error Message Tests
  // ============================================================================

  describe('getEmailErrorMessage', () => {
    it('should return correct message for known email error codes', () => {
      expect(getEmailErrorMessage('invalid-email')).toBe('Please enter a valid email address.')
      expect(getEmailErrorMessage('email-send-failed')).toBe(
        'Could not send email. Please try again or copy the link.'
      )
      expect(getEmailErrorMessage('rate-limited')).toBe(
        'Please wait a moment before sending again.'
      )
      expect(getEmailErrorMessage('invitation-expired')).toBe(
        'This invitation has expired. Create a new one.'
      )
      expect(getEmailErrorMessage('invitation-not-found')).toBe('Could not find this invitation.')
      expect(getEmailErrorMessage('not-authorized')).toBe(
        'You can only send emails for your own invitations.'
      )
    })

    it('should return default message for unknown error codes', () => {
      expect(getEmailErrorMessage('unknown-code')).toBe('Something went wrong. Please try again.')
    })

    it('email error messages should be at 6th-grade reading level', () => {
      Object.values(EMAIL_ERROR_MESSAGES).forEach((message) => {
        // Messages should be short
        expect(message.length).toBeLessThan(100)
        // Messages should not contain technical jargon
        expect(message).not.toMatch(/unauthorized|forbidden|exception|null|undefined/)
        // Messages should end with proper punctuation
        expect(message).toMatch(/[.!?]$/)
      })
    })
  })

  // ============================================================================
  // Story 3.2: Email Masking Tests
  // ============================================================================

  describe('maskEmail', () => {
    it('should mask standard email addresses', () => {
      expect(maskEmail('jane@example.com')).toBe('ja***@example.com')
      expect(maskEmail('john.doe@company.org')).toBe('jo***@company.org')
    })

    it('should handle short local parts', () => {
      expect(maskEmail('a@example.com')).toBe('a***@example.com')
      expect(maskEmail('ab@example.com')).toBe('ab***@example.com')
    })

    it('should handle emails with subdomains', () => {
      expect(maskEmail('user@mail.example.co.uk')).toBe('us***@mail.example.co.uk')
    })

    it('should handle edge case with no @ symbol', () => {
      expect(maskEmail('noemail')).toBe('***@noemail')
    })

    it('should handle edge case with @ at start', () => {
      expect(maskEmail('@example.com')).toBe('***@@example.com')
    })

    it('should preserve domain completely', () => {
      const masked = maskEmail('testuser@verylongdomain.example.com')
      expect(masked).toBe('te***@verylongdomain.example.com')
    })
  })

  // ============================================================================
  // Story 3.2: Email Rate Limiting Tests
  // ============================================================================

  describe('isEmailRateLimited', () => {
    it('should return false when no emails have been sent', () => {
      expect(isEmailRateLimited(0, null)).toBe(false)
      expect(isEmailRateLimited(0, undefined)).toBe(false)
    })

    it('should return false when email was sent more than an hour ago', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
      expect(isEmailRateLimited(3, twoHoursAgo)).toBe(false)
    })

    it('should return false when under the limit within an hour', () => {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
      expect(isEmailRateLimited(0, thirtyMinutesAgo)).toBe(false)
      expect(isEmailRateLimited(1, thirtyMinutesAgo)).toBe(false)
      expect(isEmailRateLimited(2, thirtyMinutesAgo)).toBe(false)
    })

    it('should return true when at or over the limit within an hour', () => {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
      expect(isEmailRateLimited(3, thirtyMinutesAgo)).toBe(true)
      expect(isEmailRateLimited(5, thirtyMinutesAgo)).toBe(true)
    })

    it('should use MAX_EMAILS_PER_HOUR constant', () => {
      expect(MAX_EMAILS_PER_HOUR).toBe(3)
    })

    it('should reset rate limit after one hour', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
      const sixtyOneMinutesAgo = new Date(Date.now() - 61 * 60 * 1000)

      // Should be rate limited (within hour, at limit)
      expect(isEmailRateLimited(3, fiveMinutesAgo)).toBe(true)

      // Should NOT be rate limited (past hour, counter should reset)
      expect(isEmailRateLimited(3, sixtyOneMinutesAgo)).toBe(false)
    })
  })
})
