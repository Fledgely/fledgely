/**
 * Parent Components - Barrel Export
 *
 * Re-exports all parent-facing components for clean imports.
 */

// Agreement & Proposal Components
export { AgreementProposalWizard } from './AgreementProposalWizard'
export { AgreementSectionSelector } from './AgreementSectionSelector'
export { ProposalStatusCard } from './ProposalStatusCard'
export { CoParentProposalApprovalCard } from './CoParentProposalApprovalCard'

// Focus Mode & Work Mode Components
export { ChildFocusModeCard } from './ChildFocusModeCard'
export { FocusModeSettings } from './FocusModeSettings'
export { WorkModeSettings } from './WorkModeSettings'
export { WorkModeAnalyticsCard } from './WorkModeAnalyticsCard'
export { WorkModeCheckIn } from './WorkModeCheckIn'

// App & Calendar Components
export { AppSuggestionReview } from './AppSuggestionReview'
export { CalendarIntegrationSettings } from './CalendarIntegrationSettings'

// Notification Components
export { ReviewRequestNotification } from './ReviewRequestNotification'

// Guardian Management Components (Story 3A.6)
export { GuardianRemovalBlockedModal } from './GuardianRemovalBlockedModal'

// Viewing Rate Alert Components (Story 3A.5)
export { default as ViewingRateAlertBanner } from './ViewingRateAlertBanner'

// Location Abuse Prevention Components (Story 40.6)
export { LocationAbuseAlert } from './LocationAbuseAlert'
export type { LocationAbuseAlertProps, LocationAbuseAlertData } from './LocationAbuseAlert'
export { LocationAbuseResources } from './LocationAbuseResources'
export type { LocationAbuseResourcesProps } from './LocationAbuseResources'
