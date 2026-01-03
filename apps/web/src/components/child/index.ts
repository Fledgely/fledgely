/**
 * Child Components - Story 39.7
 *
 * Components for child-facing views and notifications.
 */

// Story 39.7: Caregiver Removal - Child Notifications
export { CaregiverRemovedNotification } from './CaregiverRemovedNotification'
export type {
  CaregiverRemovedNotificationProps,
  CaregiverRemovedNotificationData,
} from './CaregiverRemovedNotification'
export { ChildNotificationList } from './ChildNotificationList'
export type { ChildNotificationListProps, ChildNotification } from './ChildNotificationList'

// Story 40.1: Location-Based Rule Opt-In - Child Notifications
export { LocationFeaturesNotification } from './LocationFeaturesNotification'
export type {
  LocationFeaturesNotificationProps,
  LocationNotificationType,
} from './LocationFeaturesNotification'

// Story 40.2: Location-Specific Rule Configuration - Child View
export { ChildLocationStatus } from './ChildLocationStatus'
export type { ChildLocationStatusProps } from './ChildLocationStatus'

// Story 40.5: Location Privacy Controls
export { LocationPrivacyExplanation } from './LocationPrivacyExplanation'
export type { LocationPrivacyExplanationProps } from './LocationPrivacyExplanation'
export { ChildLocationHistory } from './ChildLocationHistory'
export type { ChildLocationHistoryProps } from './ChildLocationHistory'
export { RequestLocationDisable } from './RequestLocationDisable'
export type { RequestLocationDisableProps } from './RequestLocationDisable'
