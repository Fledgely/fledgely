/**
 * Caregiver Components - Stories 19A.3, 19D.1, 19D.4
 *
 * Components for the simplified caregiver quick view and invitation flow.
 */

export { CaregiverQuickView } from './CaregiverQuickView'
export type { CaregiverQuickViewProps } from './CaregiverQuickView'

export { CaregiverChildCard } from './CaregiverChildCard'
export type { CaregiverChildCardProps } from './CaregiverChildCard'

export { CallParentButton } from './CallParentButton'
export type { CallParentButtonProps } from './CallParentButton'

// Story 19D.1: Caregiver Invitation & Onboarding
export { default as CaregiverInviteForm } from './CaregiverInviteForm'
export { default as CaregiverAcceptInvitation } from './CaregiverAcceptInvitation'
export { default as CaregiverOnboarding } from './CaregiverOnboarding'

// Story 19D.4: Access Window Enforcement
export { AccessDenied } from './AccessDenied'
export type { AccessDeniedProps } from './AccessDenied'

// Story 19D.5: Caregiver Quick Revocation
export { AccessRevoked } from './AccessRevoked'
export type { AccessRevokedProps } from './AccessRevoked'

// Story 39.5: Caregiver Flag Viewing
export { CaregiverFlagQueue } from './CaregiverFlagQueue'
export type { CaregiverFlagQueueProps } from './CaregiverFlagQueue'
export { CaregiverFlagDetailView } from './CaregiverFlagDetailView'
export type { CaregiverFlagDetailViewProps } from './CaregiverFlagDetailView'
export { CaregiverFlagAuditView } from './CaregiverFlagAuditView'
export type {
  CaregiverFlagAuditViewProps,
  CaregiverFlagViewLogEntry,
} from './CaregiverFlagAuditView'

// Story 39.6: Caregiver Action Logging
export { CaregiverActivityDashboard } from './CaregiverActivityDashboard'
export type { CaregiverActivityDashboardProps } from './CaregiverActivityDashboard'
export { CaregiverActivityRow } from './CaregiverActivityRow'
export type { CaregiverActivityRowProps } from './CaregiverActivityRow'
export { CaregiverSummaryCard } from './CaregiverSummaryCard'
export type { CaregiverSummaryCardProps } from './CaregiverSummaryCard'
export { ChildCaregiverActivityView } from './ChildCaregiverActivityView'
export type { ChildCaregiverActivityViewProps } from './ChildCaregiverActivityView'

// Story 39.7: Caregiver Removal
export { RemovalReasonInput } from './RemovalReasonInput'
export type { RemovalReasonInputProps } from './RemovalReasonInput'
