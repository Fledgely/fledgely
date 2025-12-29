/**
 * Alerts Library
 * Story 18.6: View Rate Limiting
 *
 * Provides alert utilities for family notifications.
 */

export {
  createRateLimitAlert,
  getActiveRateLimitAlert,
  getOtherGuardians,
  dismissAlert,
  ALERT_TYPE_SCREENSHOT_RATE,
  type ScreenshotRateAlert,
  type CreateRateAlertParams,
} from './screenshot-rate-alert'
