/**
 * Accessibility Services
 *
 * Story 28.1: AI Description Generation
 *
 * Services for accessibility features including screenshot descriptions
 * for blind or visually impaired users.
 */

export {
  generateScreenshotDescription,
  generateScreenshotDescriptionAsync,
  needsDescriptionGeneration,
  getScreenshotDescription,
  _resetDbForTesting,
  type DescriptionGenerationJob,
  type DescriptionGenerationResult,
} from './screenshotDescriptionService'
