/**
 * Safety Module Exports
 *
 * Story 41.8: Fleeing Mode Notification Suppression
 */

export {
  logFleeingModeSuppression,
  logFleeingModeExpiry,
  isFleeingModeSuppressedType,
  FLEEING_MODE_SUPPRESSED_TYPES,
  type FleeingModeSuppressedType,
  type FleeingModeSuppressionLogParams,
  type FleeingModeSuppressionLog,
} from './fleeingModeAudit'
