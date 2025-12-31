/**
 * Health Services
 *
 * Story 27.5.1: Monthly Health Check-In Prompts
 * Story 27.5.3: Flag-Triggered Friction Markers
 *
 * Exports health-related services for family check-ins and friction tracking.
 */

export {
  getCheckInSettings,
  updateCheckInSettings,
  isFamilyEligibleForCheckIn,
  calculateNextCheckInDue,
  isCheckInDue,
  getCheckInPromptText,
  createCheckInsForFamily,
  getPendingCheckInsNeedingReminder,
  markReminderSent,
  submitCheckInResponse,
  skipCheckIn,
  getCheckIn,
  getPendingCheckInsForUser,
  getEligibleFamiliesForCheckIn,
  _resetDbForTesting,
} from './healthCheckInService'

export {
  getFrictionSummary,
  getFrictionPatternText,
  type CategoryFrictionSummary,
  type FrictionSummary,
} from './frictionAggregationService'
