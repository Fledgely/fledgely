/**
 * Services Index
 *
 * Central export point for all services.
 */

// Crisis Protection Services (Story 7.2)
export {
  shouldBlockMonitoring,
  crisisGuard,
  type CrisisProtectionGuard,
} from './crisisProtectionService'

export {
  screenshotGuard,
  activityGuard,
  timeTrackingGuard,
  notificationGuard,
  analyticsGuard,
  allMonitoringGuard,
  platformGuard,
  createPlatformGuard,
  type MonitoringGuard,
  type PlatformGuardInterface,
} from './crisisGuards'

export {
  saveToCache,
  getFromCache,
  getFromCacheOrBundled,
  isCacheValid,
  getCacheAge,
  clearCache,
  getAllowlistWithFallback,
  refreshCacheOnLaunch,
  getCachedVersion,
} from './allowlistCacheService'
