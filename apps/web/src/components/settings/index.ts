/**
 * Settings Components - Stories 19D.3, 19D.4, 19D.5
 *
 * Components for family settings and caregiver management.
 */

// Story 19D.3: Caregiver Access Logging
export { CaregiverAccessLogViewer } from './CaregiverAccessLogViewer'
export type { CaregiverAccessLogViewerProps } from './CaregiverAccessLogViewer'

// Story 19D.4: Access Window Editor
export { AccessWindowEditor } from './AccessWindowEditor'
export type { AccessWindowEditorProps } from './AccessWindowEditor'

// Story 19D.4: Grant Extension Button
export { GrantExtensionButton } from './GrantExtensionButton'
export type { GrantExtensionButtonProps, OneTimeExtension } from './GrantExtensionButton'

// Story 19D.5: Caregiver Quick Revocation
export { RevokeAccessButton } from './RevokeAccessButton'
export type { RevokeAccessButtonProps } from './RevokeAccessButton'

// Story 32.5: Offline Time Exceptions
export { OfflineExceptionCard } from './OfflineExceptionCard'
export { ExceptionHistoryCard } from './ExceptionHistoryCard'

// Story 40.1: Location-Based Rule Opt-In
export { LocationOptInCard } from './LocationOptInCard'
export type { LocationOptInCardProps, LocationStatus } from './LocationOptInCard'
export { LocationPrivacyModal } from './LocationPrivacyModal'
export type { LocationPrivacyModalProps } from './LocationPrivacyModal'

// Story 40.2: Location-Specific Rule Configuration
export { LocationZoneEditor } from './LocationZoneEditor'
export type { LocationZoneEditorProps } from './LocationZoneEditor'
export { LocationRuleEditor } from './LocationRuleEditor'
export type { LocationRuleEditorProps } from './LocationRuleEditor'
