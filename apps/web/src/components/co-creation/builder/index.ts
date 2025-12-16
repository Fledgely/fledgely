/**
 * Visual Agreement Builder Components
 *
 * Story 5.2: Visual Agreement Builder
 *
 * Provides components for building agreements visually with drag-and-drop
 * term cards, category color coding, and child-friendly explanations.
 */

// Main builder component
export { VisualAgreementBuilder } from './VisualAgreementBuilder'
export type { VisualAgreementBuilderProps } from './VisualAgreementBuilder'

// Term card components
export { AgreementTermCard, AgreementTermCardSkeleton } from './AgreementTermCard'
export type { AgreementTermCardProps } from './AgreementTermCard'

// Drag-and-drop components
export { DraggableTermCard } from './DraggableTermCard'
export type { DraggableTermCardProps } from './DraggableTermCard'

export { TermDropZone } from './TermDropZone'
export type { TermDropZoneProps } from './TermDropZone'

// Tooltip component
export { TermExplanationTooltip, TermTooltipTrigger } from './TermExplanationTooltip'
export type { TermExplanationTooltipProps, TooltipPosition } from './TermExplanationTooltip'

// Add/Edit term modal
export { AddTermModal } from './AddTermModal'
export type { AddTermModalProps } from './AddTermModal'

// Term count indicator
export {
  TermCountIndicator,
  TermCountBadge,
  useCanAddTerm,
  getRemainingCapacity,
  getCountStatus,
  MAX_TERMS,
  WARNING_THRESHOLD,
} from './TermCountIndicator'
export type { TermCountIndicatorProps, CountStatus } from './TermCountIndicator'

// Utility functions
export {
  // Category colors
  TERM_CATEGORY_COLORS,
  getTermCategoryColors,
  getTermCardClasses,
  // Category icons
  TERM_CATEGORY_ICONS,
  getTermCategoryIcon,
  // Type labels
  TERM_TYPE_LABELS,
  getTermTypeLabel,
  // Explanations (child-friendly)
  TERM_EXPLANATIONS,
  getTermExplanation,
  // Status styles
  TERM_STATUS_STYLES,
  getTermStatusStyle,
  // Contributor styles
  CONTRIBUTOR_STYLES,
  getContributorStyle,
  // Content formatting
  formatTermContentPreview,
} from './termUtils'
export type { TermCategoryColors, TermStatusStyle, ContributorStyle } from './termUtils'
