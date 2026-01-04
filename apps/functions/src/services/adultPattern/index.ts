/**
 * Adult Pattern Detection Service
 *
 * Story 8.10: Adult Pattern Detection
 *
 * Exports all adult pattern detection functionality.
 */

// Main analyzer functions
export {
  shouldTriggerAnalysis,
  analyzeChildUsagePattern,
  createAdultPatternFlag,
  markFlagAsExplained,
  markFlagAsConfirmedAdult,
  getPendingFlagsForFamily,
  getAdultPatternFlag,
  markNotificationSent,
  expireOldFlags,
} from './adultPatternAnalyzer'

// Pattern signal detection
export {
  detectWorkAppPatterns,
  detectFinancialSitePatterns,
  detectAdultSchedulePatterns,
  detectCommunicationPatterns,
  type ScreenshotMetadataForAnalysis,
} from './patternSignals'
