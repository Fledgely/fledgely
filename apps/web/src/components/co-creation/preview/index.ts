/**
 * Agreement Preview Components
 *
 * Story 5.5: Agreement Preview & Summary
 *
 * Components for previewing and summarizing agreements
 * before signing.
 */

// Components
export { AgreementSummary, default as AgreementSummaryDefault } from './AgreementSummary'
export type { AgreementSummaryProps } from './AgreementSummary'

export { ContributionAttribution } from './ContributionAttribution'
export type { ContributionAttributionProps } from './ContributionAttribution'

export { ImpactSummary } from './ImpactSummary'
export type { ImpactSummaryProps } from './ImpactSummary'

export { ScrollProgress } from './ScrollProgress'
export type { ScrollProgressProps } from './ScrollProgress'

export { ExportButton } from './ExportButton'
export type { ExportButtonProps } from './ExportButton'

export { AgreementPreview, default as AgreementPreviewDefault } from './AgreementPreview'
export type { AgreementPreviewProps } from './AgreementPreview'

// Utilities
export {
  // Grouping
  groupTermsByCategory,
  getSortedCategoryGroups,
  CATEGORY_DISPLAY_ORDER,
  // Section headers
  getSectionDescription,
  getSectionHeaderInfo,
  SECTION_DESCRIPTIONS,
  // Commitments
  formatCommitmentsForDisplay,
  // Contributions
  getContributionForTerm,
  formatContributorName,
  // Reading level
  getSimpleCategoryName,
  SIMPLE_CATEGORY_NAMES,
  // Counts
  getTermCountsByStatus,
  getAcceptanceSummaryText,
} from './previewUtils'
