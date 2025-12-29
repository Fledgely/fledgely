/**
 * Enrollment State Validation - Story 12.6
 *
 * Validates enrollment state loaded from chrome.storage.local to ensure
 * data integrity across browser restarts and extension updates.
 *
 * Requirements:
 * - AC3: Enrolled state contains familyId, deviceId, childId
 * - AC4: State is validated on startup
 * - AC5: Invalid/corrupted state triggers re-enrollment
 */

/**
 * Enrollment state values
 */
export type EnrollmentStateValue = 'not_enrolled' | 'pending' | 'enrolled'

/**
 * Minimal enrollment state required for validation
 * Story 12.6 AC3: State includes familyId, deviceId, childId
 */
export interface EnrollmentStateData {
  enrollmentState: EnrollmentStateValue
  familyId: string | null
  deviceId: string | null
  childId: string | null
}

/**
 * Result of enrollment state validation
 */
export interface EnrollmentValidationResult {
  valid: boolean
  enrollmentState: EnrollmentStateValue
  familyId: string | null
  deviceId: string | null
  childId: string | null
  error?: string
}

/**
 * Validation error types
 */
export type ValidationErrorType =
  | 'invalid_structure'
  | 'invalid_enrollment_state'
  | 'missing_family_id'
  | 'missing_device_id'
  | 'invalid_family_id_type'
  | 'invalid_device_id_type'
  | 'invalid_child_id_type'

/**
 * Validates that a value is a valid enrollment state
 */
function isValidEnrollmentState(value: unknown): value is EnrollmentStateValue {
  return value === 'not_enrolled' || value === 'pending' || value === 'enrolled'
}

/**
 * Validates that a value is a string or null
 */
function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

/**
 * Validates enrollment state loaded from storage
 *
 * Story 12.6:
 * - AC3: Validates state includes required fields
 * - AC4: Called on startup to validate state integrity
 * - AC5: Returns validation result for invalid state handling
 *
 * @param state - The state object loaded from chrome.storage.local
 * @returns Validation result with normalized state
 */
export function validateEnrollmentState(state: unknown): EnrollmentValidationResult {
  // Handle null/undefined state
  if (state === null || state === undefined) {
    return {
      valid: true, // Not enrolled is valid
      enrollmentState: 'not_enrolled',
      familyId: null,
      deviceId: null,
      childId: null,
    }
  }

  // Check if state is an object
  if (typeof state !== 'object') {
    return {
      valid: false,
      enrollmentState: 'not_enrolled',
      familyId: null,
      deviceId: null,
      childId: null,
      error: 'invalid_structure',
    }
  }

  const stateObj = state as Record<string, unknown>

  // Validate enrollmentState field
  if (!isValidEnrollmentState(stateObj.enrollmentState)) {
    return {
      valid: false,
      enrollmentState: 'not_enrolled',
      familyId: null,
      deviceId: null,
      childId: null,
      error: 'invalid_enrollment_state',
    }
  }

  // Validate field types
  if (!isStringOrNull(stateObj.familyId)) {
    return {
      valid: false,
      enrollmentState: 'not_enrolled',
      familyId: null,
      deviceId: null,
      childId: null,
      error: 'invalid_family_id_type',
    }
  }

  if (!isStringOrNull(stateObj.deviceId)) {
    return {
      valid: false,
      enrollmentState: 'not_enrolled',
      familyId: null,
      deviceId: null,
      childId: null,
      error: 'invalid_device_id_type',
    }
  }

  if (!isStringOrNull(stateObj.childId)) {
    return {
      valid: false,
      enrollmentState: 'not_enrolled',
      familyId: null,
      deviceId: null,
      childId: null,
      error: 'invalid_child_id_type',
    }
  }

  const enrollmentState = stateObj.enrollmentState
  const familyId = stateObj.familyId as string | null
  const deviceId = stateObj.deviceId as string | null
  const childId = stateObj.childId as string | null

  // For enrolled state, familyId and deviceId are required
  if (enrollmentState === 'enrolled') {
    if (!familyId) {
      return {
        valid: false,
        enrollmentState: 'not_enrolled',
        familyId: null,
        deviceId: null,
        childId: null,
        error: 'missing_family_id',
      }
    }

    if (!deviceId) {
      return {
        valid: false,
        enrollmentState: 'not_enrolled',
        familyId: null,
        deviceId: null,
        childId: null,
        error: 'missing_device_id',
      }
    }
  }

  // Valid state
  return {
    valid: true,
    enrollmentState,
    familyId,
    deviceId,
    childId,
  }
}

/**
 * Checks if the enrollment state represents an enrolled device
 *
 * @param result - Validation result from validateEnrollmentState
 * @returns true if device is enrolled with valid credentials
 */
export function isEnrolled(result: EnrollmentValidationResult): boolean {
  return (
    result.valid && result.enrollmentState === 'enrolled' && !!result.familyId && !!result.deviceId
  )
}

/**
 * Returns a human-readable error message for validation errors
 *
 * @param error - The validation error type
 * @returns Human-readable error message
 */
export function getValidationErrorMessage(error: ValidationErrorType): string {
  const messages: Record<ValidationErrorType, string> = {
    invalid_structure: 'Enrollment state is corrupted',
    invalid_enrollment_state: 'Invalid enrollment status',
    missing_family_id: 'Missing family ID for enrolled device',
    missing_device_id: 'Missing device ID for enrolled device',
    invalid_family_id_type: 'Invalid family ID format',
    invalid_device_id_type: 'Invalid device ID format',
    invalid_child_id_type: 'Invalid child ID format',
  }
  return messages[error] || 'Unknown validation error'
}
