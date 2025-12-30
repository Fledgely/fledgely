/**
 * Build notification content for status changes
 *
 * Story 19A.4: Status Push Notifications (AC: #3)
 */

import { StatusTransition } from './statusTypes'

/**
 * Notification content
 */
export interface NotificationContent {
  title: string
  body: string
  data: Record<string, string>
}

/**
 * Notification templates for each transition type
 */
const NOTIFICATION_TEMPLATES: Record<StatusTransition, { title: string; bodyTemplate: string }> = {
  good_to_attention: {
    title: 'Advisory',
    bodyTemplate: "{childName}'s device hasn't synced in 2 hours",
  },
  good_to_action: {
    title: 'Action Needed',
    bodyTemplate: '{childName}: {issueDescription}',
  },
  attention_to_action: {
    title: 'Action Needed',
    bodyTemplate: '{childName}: {issueDescription}',
  },
  attention_to_good: {
    title: 'Resolved',
    bodyTemplate: "{childName}'s status is back to normal",
  },
  action_to_attention: {
    title: 'Improving',
    bodyTemplate: '{childName}: Some issues resolved, attention still needed',
  },
  action_to_good: {
    title: 'Resolved',
    bodyTemplate: '{childName} is back online',
  },
}

/**
 * Default issue descriptions by transition type
 */
const DEFAULT_ISSUE_DESCRIPTIONS: Record<StatusTransition, string> = {
  good_to_attention: 'Device sync delay',
  good_to_action: 'Monitoring stopped',
  attention_to_action: 'Device offline',
  attention_to_good: '',
  action_to_attention: '',
  action_to_good: '',
}

/**
 * Build notification content for a status transition
 *
 * @param transition - The status transition type
 * @param childName - Name of the affected child
 * @param deviceName - Name of the affected device (optional)
 * @param issueDescription - Specific issue description (optional)
 * @param familyId - Family ID for deep linking
 * @param childId - Child ID for deep linking
 * @returns Notification content with title, body, and data
 */
export function buildStatusNotification(
  transition: StatusTransition,
  childName: string,
  deviceName?: string,
  issueDescription?: string,
  familyId?: string,
  childId?: string
): NotificationContent {
  const template = NOTIFICATION_TEMPLATES[transition]

  // Build body by replacing placeholders
  let body = template.bodyTemplate
    .replace('{childName}', childName)
    .replace('{issueDescription}', issueDescription || DEFAULT_ISSUE_DESCRIPTIONS[transition])

  // Include device name for action notifications
  if (deviceName && (transition.endsWith('_to_action') || transition === 'good_to_attention')) {
    body = body.replace('Device', deviceName)
  }

  // Build deep link data for notification tap
  const data: Record<string, string> = {
    type: 'status_change',
    transition,
  }

  if (familyId) data.familyId = familyId
  if (childId) data.childId = childId
  if (deviceName) data.deviceName = deviceName

  return {
    title: template.title,
    body,
    data,
  }
}
