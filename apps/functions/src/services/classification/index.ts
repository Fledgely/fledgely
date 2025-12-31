/**
 * Classification Service
 *
 * Story 20.1: Classification Service Architecture
 *
 * Re-exports all classification-related modules for clean imports.
 */

export { GeminiClient, createGeminiClient, type GeminiClassificationResponse } from './geminiClient'
export {
  classifyScreenshot,
  needsClassification,
  buildClassificationJob,
  type ClassificationOperationResult,
} from './classifyScreenshot'
export { CLASSIFICATION_PROMPT, buildClassificationPrompt } from './classificationPrompt'
export { retryWithBackoff, sleep, type RetryOptions } from './retryWithBackoff'
export {
  getEffectiveThreshold,
  shouldCreateFlag,
  getFamilyThresholdLevel,
} from './confidenceThreshold'
export {
  createFlag,
  createFlagsFromConcerns,
  getFlagsForChild,
  getFlagById,
  updateFlagFeedback,
  generateFlagId,
  generateScreenshotRef,
  updateScreenshotFlagIds,
  type FlagQueryFilters,
  type FlagQueryPagination,
} from './flagStorage'
export {
  getFamilyBiasWeights,
  applyFamilyBiasToConfidence,
  applyFamilyBiasToConcerns,
  shouldFilterDueToFamilyBias,
  clearBiasWeightsCache,
  clearAllBiasWeightsCache,
} from './familyBias'
export {
  getChildAppApprovals,
  extractAppIdentifier,
  applyAppApprovalsToConcerns,
  clearAppApprovalsCache,
  setAppCategoryApproval,
  removeAppCategoryApproval,
} from './appApprovals'
