/**
 * Pattern Analysis Services Index
 *
 * Story 27.4: Asymmetric Viewing Pattern Detection
 *
 * Exports pattern analysis services for detecting asymmetric
 * viewing patterns between guardians.
 */

export {
  isInSetupPeriod,
  analyzeViewingPatterns,
  storePatternAnalysis,
  getEligibleFamilies,
  canSendAlert,
  _resetDbForTesting as _resetPatternAnalysisDbForTesting,
} from './patternAnalysisService'

export {
  shouldGenerateAlert,
  createPatternAlert,
  getPendingAlertsForGuardian,
  markAlertAsRead,
  _resetDbForTesting as _resetPatternAlertDbForTesting,
} from './patternAlertService'
