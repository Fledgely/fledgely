/**
 * Enrollment State Validation Tests - Story 12.6
 */

import { describe, it, expect } from 'vitest'
import {
  validateEnrollmentState,
  isEnrolled,
  getValidationErrorMessage,
  type EnrollmentValidationResult,
} from './enrollment-state'

describe('Story 12.6: Enrollment State Validation', () => {
  describe('validateEnrollmentState', () => {
    describe('Task 1.1-1.3: Basic validation', () => {
      it('should return valid not_enrolled for null state', () => {
        const result = validateEnrollmentState(null)
        expect(result.valid).toBe(true)
        expect(result.enrollmentState).toBe('not_enrolled')
        expect(result.familyId).toBeNull()
        expect(result.deviceId).toBeNull()
        expect(result.childId).toBeNull()
      })

      it('should return valid not_enrolled for undefined state', () => {
        const result = validateEnrollmentState(undefined)
        expect(result.valid).toBe(true)
        expect(result.enrollmentState).toBe('not_enrolled')
      })

      it('should return invalid for non-object state', () => {
        const result = validateEnrollmentState('invalid')
        expect(result.valid).toBe(false)
        expect(result.error).toBe('invalid_structure')
      })

      it('should return invalid for array state', () => {
        const result = validateEnrollmentState([1, 2, 3])
        expect(result.valid).toBe(false)
        expect(result.error).toBe('invalid_enrollment_state')
      })
    })

    describe('Task 1.2: Required fields validation', () => {
      it('should validate enrolled state with all required fields', () => {
        const state = {
          enrollmentState: 'enrolled',
          familyId: 'family-123',
          deviceId: 'device-456',
          childId: 'child-789',
        }
        const result = validateEnrollmentState(state)
        expect(result.valid).toBe(true)
        expect(result.enrollmentState).toBe('enrolled')
        expect(result.familyId).toBe('family-123')
        expect(result.deviceId).toBe('device-456')
        expect(result.childId).toBe('child-789')
      })

      it('should validate enrolled state without childId (unassigned device)', () => {
        const state = {
          enrollmentState: 'enrolled',
          familyId: 'family-123',
          deviceId: 'device-456',
          childId: null,
        }
        const result = validateEnrollmentState(state)
        expect(result.valid).toBe(true)
        expect(result.enrollmentState).toBe('enrolled')
        expect(result.childId).toBeNull()
      })

      it('should return invalid for enrolled state missing familyId', () => {
        const state = {
          enrollmentState: 'enrolled',
          familyId: null,
          deviceId: 'device-456',
          childId: null,
        }
        const result = validateEnrollmentState(state)
        expect(result.valid).toBe(false)
        expect(result.error).toBe('missing_family_id')
      })

      it('should return invalid for enrolled state missing deviceId', () => {
        const state = {
          enrollmentState: 'enrolled',
          familyId: 'family-123',
          deviceId: null,
          childId: null,
        }
        const result = validateEnrollmentState(state)
        expect(result.valid).toBe(false)
        expect(result.error).toBe('missing_device_id')
      })
    })

    describe('Task 1.3: Field type validation', () => {
      it('should return invalid for number familyId', () => {
        const state = {
          enrollmentState: 'enrolled',
          familyId: 123,
          deviceId: 'device-456',
          childId: null,
        }
        const result = validateEnrollmentState(state)
        expect(result.valid).toBe(false)
        expect(result.error).toBe('invalid_family_id_type')
      })

      it('should return invalid for number deviceId', () => {
        const state = {
          enrollmentState: 'enrolled',
          familyId: 'family-123',
          deviceId: 456,
          childId: null,
        }
        const result = validateEnrollmentState(state)
        expect(result.valid).toBe(false)
        expect(result.error).toBe('invalid_device_id_type')
      })

      it('should return invalid for number childId', () => {
        const state = {
          enrollmentState: 'enrolled',
          familyId: 'family-123',
          deviceId: 'device-456',
          childId: 789,
        }
        const result = validateEnrollmentState(state)
        expect(result.valid).toBe(false)
        expect(result.error).toBe('invalid_child_id_type')
      })

      it('should return invalid for invalid enrollmentState value', () => {
        const state = {
          enrollmentState: 'invalid_state',
          familyId: 'family-123',
          deviceId: 'device-456',
          childId: null,
        }
        const result = validateEnrollmentState(state)
        expect(result.valid).toBe(false)
        expect(result.error).toBe('invalid_enrollment_state')
      })
    })

    describe('Task 1.4: Valid enrollment states', () => {
      it('should validate not_enrolled state', () => {
        const state = {
          enrollmentState: 'not_enrolled',
          familyId: null,
          deviceId: null,
          childId: null,
        }
        const result = validateEnrollmentState(state)
        expect(result.valid).toBe(true)
        expect(result.enrollmentState).toBe('not_enrolled')
      })

      it('should validate pending state', () => {
        const state = {
          enrollmentState: 'pending',
          familyId: 'family-123', // Can have familyId during pending
          deviceId: null,
          childId: null,
        }
        const result = validateEnrollmentState(state)
        expect(result.valid).toBe(true)
        expect(result.enrollmentState).toBe('pending')
      })

      it('should validate enrolled state', () => {
        const state = {
          enrollmentState: 'enrolled',
          familyId: 'family-123',
          deviceId: 'device-456',
          childId: 'child-789',
        }
        const result = validateEnrollmentState(state)
        expect(result.valid).toBe(true)
        expect(result.enrollmentState).toBe('enrolled')
      })
    })

    describe('Task 1.5: Graceful failure handling', () => {
      it('should reset to not_enrolled on validation failure', () => {
        const state = {
          enrollmentState: 'enrolled',
          familyId: 123, // Invalid type
          deviceId: 'device-456',
          childId: null,
        }
        const result = validateEnrollmentState(state)
        expect(result.valid).toBe(false)
        expect(result.enrollmentState).toBe('not_enrolled')
        expect(result.familyId).toBeNull()
        expect(result.deviceId).toBeNull()
      })

      it('should handle extra fields gracefully', () => {
        const state = {
          enrollmentState: 'enrolled',
          familyId: 'family-123',
          deviceId: 'device-456',
          childId: null,
          extraField: 'should be ignored',
          anotherField: 12345,
        }
        const result = validateEnrollmentState(state)
        expect(result.valid).toBe(true)
        expect(result.enrollmentState).toBe('enrolled')
      })
    })
  })

  describe('isEnrolled', () => {
    it('should return true for valid enrolled state', () => {
      const result: EnrollmentValidationResult = {
        valid: true,
        enrollmentState: 'enrolled',
        familyId: 'family-123',
        deviceId: 'device-456',
        childId: null,
      }
      expect(isEnrolled(result)).toBe(true)
    })

    it('should return false for not_enrolled state', () => {
      const result: EnrollmentValidationResult = {
        valid: true,
        enrollmentState: 'not_enrolled',
        familyId: null,
        deviceId: null,
        childId: null,
      }
      expect(isEnrolled(result)).toBe(false)
    })

    it('should return false for pending state', () => {
      const result: EnrollmentValidationResult = {
        valid: true,
        enrollmentState: 'pending',
        familyId: 'family-123',
        deviceId: null,
        childId: null,
      }
      expect(isEnrolled(result)).toBe(false)
    })

    it('should return false for invalid state', () => {
      const result: EnrollmentValidationResult = {
        valid: false,
        enrollmentState: 'enrolled',
        familyId: 'family-123',
        deviceId: 'device-456',
        childId: null,
        error: 'some_error',
      }
      expect(isEnrolled(result)).toBe(false)
    })
  })

  describe('getValidationErrorMessage', () => {
    it('should return correct message for invalid_structure', () => {
      expect(getValidationErrorMessage('invalid_structure')).toBe('Enrollment state is corrupted')
    })

    it('should return correct message for missing_family_id', () => {
      expect(getValidationErrorMessage('missing_family_id')).toBe(
        'Missing family ID for enrolled device'
      )
    })

    it('should return correct message for missing_device_id', () => {
      expect(getValidationErrorMessage('missing_device_id')).toBe(
        'Missing device ID for enrolled device'
      )
    })
  })
})
