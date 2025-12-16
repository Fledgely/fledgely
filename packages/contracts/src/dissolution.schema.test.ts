import { describe, it, expect } from 'vitest'
import {
  // Schemas
  dataHandlingOptionSchema,
  dissolutionStatusSchema,
  dissolutionAcknowledgmentSchema,
  familyDissolutionSchema,
  initiateDissolutionInputSchema,
  acknowledgeDissolutionInputSchema,
  cancelDissolutionInputSchema,
  dissolutionAuditMetadataSchema,
  // Helper functions
  getDissolutionErrorMessage,
  getDataHandlingOptionLabel,
  getDataHandlingOptionDescription,
  getDissolutionStatusLabel,
  safeParseDissolution,
  validateInitiateDissolutionInput,
  safeParseInitiateDissolutionInput,
  calculateScheduledDeletionDate,
  calculateDaysRemaining,
  canCancelDissolution,
  needsAcknowledgment,
  getPendingAcknowledgments,
  allGuardiansAcknowledged,
  // Constants
  COOLING_PERIOD_DAYS,
  EXTENDED_RETENTION_DAYS,
  DISSOLUTION_ERROR_MESSAGES,
  DATA_HANDLING_OPTION_LABELS,
  DISSOLUTION_STATUS_LABELS,
  // Types
  type DataHandlingOption,
  type DissolutionStatus,
  type FamilyDissolution,
} from './dissolution.schema'

describe('dissolution.schema', () => {
  // ============================================================================
  // Data Handling Option Schema Tests
  // ============================================================================

  describe('dataHandlingOptionSchema', () => {
    it('should accept valid data handling options', () => {
      expect(dataHandlingOptionSchema.parse('delete_all')).toBe('delete_all')
      expect(dataHandlingOptionSchema.parse('export_first')).toBe('export_first')
      expect(dataHandlingOptionSchema.parse('retain_90_days')).toBe('retain_90_days')
    })

    it('should reject invalid data handling options', () => {
      expect(() => dataHandlingOptionSchema.parse('invalid')).toThrow()
      expect(() => dataHandlingOptionSchema.parse('')).toThrow()
      expect(() => dataHandlingOptionSchema.parse(null)).toThrow()
      expect(() => dataHandlingOptionSchema.parse(undefined)).toThrow()
    })

    it('should have labels for all options', () => {
      const options: DataHandlingOption[] = ['delete_all', 'export_first', 'retain_90_days']
      options.forEach((option) => {
        expect(DATA_HANDLING_OPTION_LABELS[option]).toBeDefined()
        expect(typeof DATA_HANDLING_OPTION_LABELS[option]).toBe('string')
      })
    })
  })

  // ============================================================================
  // Dissolution Status Schema Tests
  // ============================================================================

  describe('dissolutionStatusSchema', () => {
    it('should accept valid dissolution statuses', () => {
      expect(dissolutionStatusSchema.parse('pending_acknowledgment')).toBe(
        'pending_acknowledgment'
      )
      expect(dissolutionStatusSchema.parse('cooling_period')).toBe('cooling_period')
      expect(dissolutionStatusSchema.parse('cancelled')).toBe('cancelled')
      expect(dissolutionStatusSchema.parse('completed')).toBe('completed')
    })

    it('should reject invalid dissolution statuses', () => {
      expect(() => dissolutionStatusSchema.parse('invalid')).toThrow()
      expect(() => dissolutionStatusSchema.parse('pending')).toThrow()
      expect(() => dissolutionStatusSchema.parse('')).toThrow()
    })

    it('should have labels for all statuses', () => {
      const statuses: DissolutionStatus[] = [
        'pending_acknowledgment',
        'cooling_period',
        'cancelled',
        'completed',
      ]
      statuses.forEach((status) => {
        expect(DISSOLUTION_STATUS_LABELS[status]).toBeDefined()
        expect(typeof DISSOLUTION_STATUS_LABELS[status]).toBe('string')
      })
    })
  })

  // ============================================================================
  // Dissolution Acknowledgment Schema Tests
  // ============================================================================

  describe('dissolutionAcknowledgmentSchema', () => {
    it('should accept valid acknowledgment', () => {
      const result = dissolutionAcknowledgmentSchema.parse({
        guardianId: 'guardian-123',
        acknowledgedAt: new Date('2024-01-15T10:00:00Z'),
      })

      expect(result.guardianId).toBe('guardian-123')
      expect(result.acknowledgedAt).toBeInstanceOf(Date)
    })

    it('should reject empty guardianId', () => {
      expect(() =>
        dissolutionAcknowledgmentSchema.parse({
          guardianId: '',
          acknowledgedAt: new Date(),
        })
      ).toThrow()
    })

    it('should reject invalid date', () => {
      expect(() =>
        dissolutionAcknowledgmentSchema.parse({
          guardianId: 'guardian-123',
          acknowledgedAt: 'not-a-date',
        })
      ).toThrow()
    })

    it('should reject missing fields', () => {
      expect(() => dissolutionAcknowledgmentSchema.parse({})).toThrow()
      expect(() =>
        dissolutionAcknowledgmentSchema.parse({ guardianId: 'guardian-123' })
      ).toThrow()
    })
  })

  // ============================================================================
  // Family Dissolution Schema Tests
  // ============================================================================

  describe('familyDissolutionSchema', () => {
    const validDissolution = {
      status: 'cooling_period' as const,
      initiatedBy: 'user-123',
      initiatedAt: new Date('2024-01-01T10:00:00Z'),
      dataHandlingOption: 'delete_all' as const,
      acknowledgments: [],
      allAcknowledgedAt: new Date('2024-01-01T10:00:00Z'),
      scheduledDeletionAt: new Date('2024-01-31T10:00:00Z'),
      cancelledBy: null,
      cancelledAt: null,
    }

    it('should accept valid dissolution', () => {
      const result = familyDissolutionSchema.parse(validDissolution)

      expect(result.status).toBe('cooling_period')
      expect(result.initiatedBy).toBe('user-123')
      expect(result.dataHandlingOption).toBe('delete_all')
    })

    it('should accept dissolution with acknowledgments', () => {
      const dissolutionWithAcks = {
        ...validDissolution,
        status: 'pending_acknowledgment',
        acknowledgments: [
          { guardianId: 'guardian-1', acknowledgedAt: new Date() },
          { guardianId: 'guardian-2', acknowledgedAt: new Date() },
        ],
        allAcknowledgedAt: null,
        scheduledDeletionAt: null,
      }

      const result = familyDissolutionSchema.parse(dissolutionWithAcks)
      expect(result.acknowledgments).toHaveLength(2)
    })

    it('should accept cancelled dissolution', () => {
      const cancelled = {
        ...validDissolution,
        status: 'cancelled',
        cancelledBy: 'user-456',
        cancelledAt: new Date(),
      }

      const result = familyDissolutionSchema.parse(cancelled)
      expect(result.status).toBe('cancelled')
      expect(result.cancelledBy).toBe('user-456')
    })

    it('should reject invalid status', () => {
      expect(() =>
        familyDissolutionSchema.parse({
          ...validDissolution,
          status: 'invalid',
        })
      ).toThrow()
    })

    it('should reject empty initiatedBy', () => {
      expect(() =>
        familyDissolutionSchema.parse({
          ...validDissolution,
          initiatedBy: '',
        })
      ).toThrow()
    })
  })

  // ============================================================================
  // Initiate Dissolution Input Schema Tests
  // ============================================================================

  describe('initiateDissolutionInputSchema', () => {
    it('should accept valid input', () => {
      const result = initiateDissolutionInputSchema.parse({
        familyId: 'family-123',
        dataHandlingOption: 'delete_all',
        reauthToken: 'valid-token-123',
      })

      expect(result.familyId).toBe('family-123')
      expect(result.dataHandlingOption).toBe('delete_all')
      expect(result.reauthToken).toBe('valid-token-123')
    })

    it('should reject empty familyId', () => {
      expect(() =>
        initiateDissolutionInputSchema.parse({
          familyId: '',
          dataHandlingOption: 'delete_all',
          reauthToken: 'token',
        })
      ).toThrow()
    })

    it('should reject empty reauthToken', () => {
      expect(() =>
        initiateDissolutionInputSchema.parse({
          familyId: 'family-123',
          dataHandlingOption: 'delete_all',
          reauthToken: '',
        })
      ).toThrow()
    })

    it('should reject invalid dataHandlingOption', () => {
      expect(() =>
        initiateDissolutionInputSchema.parse({
          familyId: 'family-123',
          dataHandlingOption: 'invalid',
          reauthToken: 'token',
        })
      ).toThrow()
    })
  })

  // ============================================================================
  // Acknowledge Dissolution Input Schema Tests
  // ============================================================================

  describe('acknowledgeDissolutionInputSchema', () => {
    it('should accept valid input', () => {
      const result = acknowledgeDissolutionInputSchema.parse({
        familyId: 'family-123',
      })

      expect(result.familyId).toBe('family-123')
    })

    it('should reject empty familyId', () => {
      expect(() =>
        acknowledgeDissolutionInputSchema.parse({
          familyId: '',
        })
      ).toThrow()
    })
  })

  // ============================================================================
  // Cancel Dissolution Input Schema Tests
  // ============================================================================

  describe('cancelDissolutionInputSchema', () => {
    it('should accept valid input', () => {
      const result = cancelDissolutionInputSchema.parse({
        familyId: 'family-123',
      })

      expect(result.familyId).toBe('family-123')
    })

    it('should reject empty familyId', () => {
      expect(() =>
        cancelDissolutionInputSchema.parse({
          familyId: '',
        })
      ).toThrow()
    })
  })

  // ============================================================================
  // Dissolution Audit Metadata Schema Tests
  // ============================================================================

  describe('dissolutionAuditMetadataSchema', () => {
    it('should accept valid metadata', () => {
      const result = dissolutionAuditMetadataSchema.parse({
        dataHandlingOption: 'delete_all',
        isSharedCustody: true,
        guardianCount: 2,
        scheduledDeletionAt: '2024-01-31',
      })

      expect(result.dataHandlingOption).toBe('delete_all')
      expect(result.isSharedCustody).toBe(true)
      expect(result.guardianCount).toBe(2)
    })

    it('should accept empty metadata', () => {
      const result = dissolutionAuditMetadataSchema.parse({})
      expect(result).toEqual({})
    })

    it('should accept cancellation metadata', () => {
      const result = dissolutionAuditMetadataSchema.parse({
        cancelledBy: 'user-123',
        cancellationReason: 'Changed my mind',
      })

      expect(result.cancelledBy).toBe('user-123')
      expect(result.cancellationReason).toBe('Changed my mind')
    })
  })

  // ============================================================================
  // Error Message Helper Tests
  // ============================================================================

  describe('getDissolutionErrorMessage', () => {
    it('should return correct error messages', () => {
      expect(getDissolutionErrorMessage('family-not-found')).toBe(
        'We could not find this family.'
      )
      expect(getDissolutionErrorMessage('not-a-guardian')).toBe(
        'You are not a member of this family.'
      )
      expect(getDissolutionErrorMessage('reauth-required')).toBe(
        'Please sign in again to confirm this action.'
      )
    })

    it('should return default message for unknown codes', () => {
      expect(getDissolutionErrorMessage('unknown-error')).toBe(
        DISSOLUTION_ERROR_MESSAGES.default
      )
    })

    it('should have messages at 6th-grade reading level', () => {
      // Simple check: no sentence should have more than 15 words
      Object.values(DISSOLUTION_ERROR_MESSAGES).forEach((message) => {
        const wordCount = message.split(' ').length
        expect(wordCount).toBeLessThanOrEqual(15)
      })
    })
  })

  // ============================================================================
  // Label Helper Tests
  // ============================================================================

  describe('getDataHandlingOptionLabel', () => {
    it('should return correct labels', () => {
      expect(getDataHandlingOptionLabel('delete_all')).toBe('Delete everything')
      expect(getDataHandlingOptionLabel('export_first')).toBe(
        'Export my data first, then delete'
      )
      expect(getDataHandlingOptionLabel('retain_90_days')).toBe(
        'Keep my data for 90 more days'
      )
    })
  })

  describe('getDataHandlingOptionDescription', () => {
    it('should return correct descriptions', () => {
      expect(getDataHandlingOptionDescription('delete_all')).toContain('deleted')
      expect(getDataHandlingOptionDescription('export_first')).toContain('Download')
      expect(getDataHandlingOptionDescription('retain_90_days')).toContain('90 days')
    })
  })

  describe('getDissolutionStatusLabel', () => {
    it('should return correct labels', () => {
      expect(getDissolutionStatusLabel('pending_acknowledgment')).toBe(
        'Waiting for other family members'
      )
      expect(getDissolutionStatusLabel('cooling_period')).toBe('Waiting period active')
      expect(getDissolutionStatusLabel('cancelled')).toBe('Dissolution cancelled')
      expect(getDissolutionStatusLabel('completed')).toBe('Family dissolved')
    })
  })

  // ============================================================================
  // Safe Parse Helper Tests
  // ============================================================================

  describe('safeParseDissolution', () => {
    const validDissolution = {
      status: 'cooling_period',
      initiatedBy: 'user-123',
      initiatedAt: new Date(),
      dataHandlingOption: 'delete_all',
      acknowledgments: [],
      allAcknowledgedAt: new Date(),
      scheduledDeletionAt: new Date(),
      cancelledBy: null,
      cancelledAt: null,
    }

    it('should return parsed dissolution for valid input', () => {
      const result = safeParseDissolution(validDissolution)
      expect(result).not.toBeNull()
      expect(result?.status).toBe('cooling_period')
    })

    it('should return null for invalid input', () => {
      expect(safeParseDissolution(null)).toBeNull()
      expect(safeParseDissolution(undefined)).toBeNull()
      expect(safeParseDissolution({})).toBeNull()
      expect(safeParseDissolution({ status: 'invalid' })).toBeNull()
    })
  })

  // ============================================================================
  // Validate Input Helper Tests
  // ============================================================================

  describe('validateInitiateDissolutionInput', () => {
    it('should return validated input for valid data', () => {
      const input = {
        familyId: 'family-123',
        dataHandlingOption: 'delete_all',
        reauthToken: 'token',
      }

      const result = validateInitiateDissolutionInput(input)
      expect(result).toEqual(input)
    })

    it('should throw for invalid data', () => {
      expect(() => validateInitiateDissolutionInput({})).toThrow()
    })
  })

  describe('safeParseInitiateDissolutionInput', () => {
    it('should return parsed input for valid data', () => {
      const input = {
        familyId: 'family-123',
        dataHandlingOption: 'delete_all',
        reauthToken: 'token',
      }

      const result = safeParseInitiateDissolutionInput(input)
      expect(result).not.toBeNull()
      expect(result?.familyId).toBe('family-123')
    })

    it('should return null for invalid data', () => {
      expect(safeParseInitiateDissolutionInput({})).toBeNull()
      expect(safeParseInitiateDissolutionInput(null)).toBeNull()
    })
  })

  // ============================================================================
  // Date Calculation Helper Tests
  // ============================================================================

  describe('calculateScheduledDeletionDate', () => {
    it('should calculate 30 days for delete_all', () => {
      const fromDate = new Date('2024-01-01T00:00:00Z')
      const result = calculateScheduledDeletionDate('delete_all', fromDate)

      const expectedDate = new Date('2024-01-31T00:00:00Z')
      expect(result.getTime()).toBe(expectedDate.getTime())
    })

    it('should calculate 30 days for export_first', () => {
      const fromDate = new Date('2024-01-01T00:00:00Z')
      const result = calculateScheduledDeletionDate('export_first', fromDate)

      const expectedDate = new Date('2024-01-31T00:00:00Z')
      expect(result.getTime()).toBe(expectedDate.getTime())
    })

    it('should calculate 90 days for retain_90_days', () => {
      const fromDate = new Date('2024-01-01T00:00:00Z')
      const result = calculateScheduledDeletionDate('retain_90_days', fromDate)

      const expectedDate = new Date('2024-03-31T00:00:00Z')
      expect(result.getTime()).toBe(expectedDate.getTime())
    })

    it('should use current date if not provided', () => {
      const beforeCall = new Date()
      const result = calculateScheduledDeletionDate('delete_all')
      const afterCall = new Date()

      const expectedMin = beforeCall.getTime() + COOLING_PERIOD_DAYS * 24 * 60 * 60 * 1000
      const expectedMax = afterCall.getTime() + COOLING_PERIOD_DAYS * 24 * 60 * 60 * 1000

      expect(result.getTime()).toBeGreaterThanOrEqual(expectedMin - 1000) // Allow 1s tolerance
      expect(result.getTime()).toBeLessThanOrEqual(expectedMax + 1000)
    })
  })

  describe('calculateDaysRemaining', () => {
    it('should return correct days remaining', () => {
      const futureDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) // 15 days from now
      const result = calculateDaysRemaining(futureDate)

      expect(result).toBe(15)
    })

    it('should return 0 for past dates', () => {
      const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      const result = calculateDaysRemaining(pastDate)

      expect(result).toBe(0)
    })

    it('should return null for null input', () => {
      expect(calculateDaysRemaining(null)).toBeNull()
    })

    it('should ceil partial days', () => {
      // 14.5 days from now should return 15
      const futureDate = new Date(Date.now() + 14.5 * 24 * 60 * 60 * 1000)
      const result = calculateDaysRemaining(futureDate)

      expect(result).toBe(15)
    })
  })

  // ============================================================================
  // Status Check Helper Tests
  // ============================================================================

  describe('canCancelDissolution', () => {
    it('should return true for cancellable statuses', () => {
      expect(canCancelDissolution('pending_acknowledgment')).toBe(true)
      expect(canCancelDissolution('cooling_period')).toBe(true)
    })

    it('should return false for non-cancellable statuses', () => {
      expect(canCancelDissolution('cancelled')).toBe(false)
      expect(canCancelDissolution('completed')).toBe(false)
    })

    it('should return false for null status', () => {
      expect(canCancelDissolution(null)).toBe(false)
    })
  })

  // ============================================================================
  // Acknowledgment Helper Tests
  // ============================================================================

  describe('needsAcknowledgment', () => {
    const baseDissolution: FamilyDissolution = {
      status: 'pending_acknowledgment',
      initiatedBy: 'user-1',
      initiatedAt: new Date(),
      dataHandlingOption: 'delete_all',
      acknowledgments: [],
      allAcknowledgedAt: null,
      scheduledDeletionAt: null,
      cancelledBy: null,
      cancelledAt: null,
    }

    it('should return true for guardian who has not acknowledged', () => {
      expect(needsAcknowledgment(baseDissolution, 'user-2')).toBe(true)
    })

    it('should return false for initiator', () => {
      expect(needsAcknowledgment(baseDissolution, 'user-1')).toBe(false)
    })

    it('should return false for guardian who already acknowledged', () => {
      const dissolution = {
        ...baseDissolution,
        acknowledgments: [{ guardianId: 'user-2', acknowledgedAt: new Date() }],
      }

      expect(needsAcknowledgment(dissolution, 'user-2')).toBe(false)
    })

    it('should return false when not in pending status', () => {
      const dissolution = { ...baseDissolution, status: 'cooling_period' as const }
      expect(needsAcknowledgment(dissolution, 'user-2')).toBe(false)
    })

    it('should return false for null dissolution', () => {
      expect(needsAcknowledgment(null, 'user-2')).toBe(false)
    })
  })

  describe('getPendingAcknowledgments', () => {
    const baseDissolution: FamilyDissolution = {
      status: 'pending_acknowledgment',
      initiatedBy: 'user-1',
      initiatedAt: new Date(),
      dataHandlingOption: 'delete_all',
      acknowledgments: [],
      allAcknowledgedAt: null,
      scheduledDeletionAt: null,
      cancelledBy: null,
      cancelledAt: null,
    }

    it('should return guardians who have not acknowledged', () => {
      const guardianIds = ['user-1', 'user-2', 'user-3']
      const dissolution = {
        ...baseDissolution,
        acknowledgments: [{ guardianId: 'user-2', acknowledgedAt: new Date() }],
      }

      const pending = getPendingAcknowledgments(dissolution, guardianIds)

      expect(pending).toEqual(['user-3'])
    })

    it('should exclude initiator from pending list', () => {
      const guardianIds = ['user-1', 'user-2']
      const pending = getPendingAcknowledgments(baseDissolution, guardianIds)

      expect(pending).toEqual(['user-2'])
    })

    it('should return empty array when all acknowledged', () => {
      const guardianIds = ['user-1', 'user-2']
      const dissolution = {
        ...baseDissolution,
        acknowledgments: [{ guardianId: 'user-2', acknowledgedAt: new Date() }],
      }

      const pending = getPendingAcknowledgments(dissolution, guardianIds)

      expect(pending).toEqual([])
    })

    it('should return empty array for null dissolution', () => {
      expect(getPendingAcknowledgments(null, ['user-1'])).toEqual([])
    })

    it('should return empty array when not in pending status', () => {
      const dissolution = { ...baseDissolution, status: 'cooling_period' as const }
      expect(getPendingAcknowledgments(dissolution, ['user-1', 'user-2'])).toEqual([])
    })
  })

  describe('allGuardiansAcknowledged', () => {
    const baseDissolution: FamilyDissolution = {
      status: 'pending_acknowledgment',
      initiatedBy: 'user-1',
      initiatedAt: new Date(),
      dataHandlingOption: 'delete_all',
      acknowledgments: [],
      allAcknowledgedAt: null,
      scheduledDeletionAt: null,
      cancelledBy: null,
      cancelledAt: null,
    }

    it('should return true when all guardians have acknowledged', () => {
      const guardianIds = ['user-1', 'user-2']
      const dissolution = {
        ...baseDissolution,
        acknowledgments: [{ guardianId: 'user-2', acknowledgedAt: new Date() }],
      }

      expect(allGuardiansAcknowledged(dissolution, guardianIds)).toBe(true)
    })

    it('should return false when some guardians have not acknowledged', () => {
      const guardianIds = ['user-1', 'user-2', 'user-3']
      const dissolution = {
        ...baseDissolution,
        acknowledgments: [{ guardianId: 'user-2', acknowledgedAt: new Date() }],
      }

      expect(allGuardiansAcknowledged(dissolution, guardianIds)).toBe(false)
    })

    it('should return true for single guardian (initiator)', () => {
      const guardianIds = ['user-1']
      expect(allGuardiansAcknowledged(baseDissolution, guardianIds)).toBe(true)
    })
  })

  // ============================================================================
  // Constants Tests
  // ============================================================================

  describe('constants', () => {
    it('should have correct cooling period days', () => {
      expect(COOLING_PERIOD_DAYS).toBe(30)
    })

    it('should have correct extended retention days', () => {
      expect(EXTENDED_RETENTION_DAYS).toBe(90)
    })

    it('should have error messages for all expected codes', () => {
      const expectedCodes = [
        'family-not-found',
        'not-a-guardian',
        'reauth-required',
        'reauth-expired',
        'already-dissolving',
        'not-pending',
        'already-acknowledged',
        'cannot-acknowledge-own',
        'cannot-cancel',
        'dissolution-failed',
        'acknowledgment-failed',
        'cancellation-failed',
        'network-error',
        'default',
      ]

      expectedCodes.forEach((code) => {
        expect(DISSOLUTION_ERROR_MESSAGES[code]).toBeDefined()
      })
    })
  })
})
