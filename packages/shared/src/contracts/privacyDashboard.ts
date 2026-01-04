/**
 * Privacy Dashboard Contracts - Story 51.7
 *
 * Data types and schemas for the privacy dashboard.
 * Provides transparency about data collection, storage, and usage.
 *
 * Features:
 * - Data collection categories
 * - Storage location info
 * - Retention period display
 * - Privacy preferences
 * - Session history
 */

import { z } from 'zod'

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Data categories collected by the app.
 */
export const DataCategory = {
  ACCOUNT: 'account',
  FAMILY: 'family',
  SCREENSHOTS: 'screenshots',
  LOCATION: 'location',
  USAGE: 'usage',
  DEVICE: 'device',
  AGREEMENTS: 'agreements',
  MESSAGES: 'messages',
} as const

export type DataCategoryValue = (typeof DataCategory)[keyof typeof DataCategory]

/**
 * Data category details for display.
 */
export const DataCategoryInfo: Record<
  DataCategoryValue,
  { label: string; description: string; examples: string[] }
> = {
  [DataCategory.ACCOUNT]: {
    label: 'Account Information',
    description: 'Basic information to identify you and manage your account.',
    examples: ['Email address', 'Name', 'Profile photo', 'Password (encrypted)'],
  },
  [DataCategory.FAMILY]: {
    label: 'Family Data',
    description: 'Information about your family structure and members.',
    examples: ["Children's profiles", 'Family member roles', 'Custody information'],
  },
  [DataCategory.SCREENSHOTS]: {
    label: 'Screen Captures',
    description: 'Screenshots captured from monitored devices with consent.',
    examples: ['Screen images', 'Capture timestamps', 'App in use'],
  },
  [DataCategory.LOCATION]: {
    label: 'Location Data',
    description: 'Device location information when location tracking is enabled.',
    examples: ['GPS coordinates', 'Location zones', 'Movement history'],
  },
  [DataCategory.USAGE]: {
    label: 'Usage Patterns',
    description: 'How the app is used to improve the experience.',
    examples: ['Feature usage', 'Session duration', 'Navigation patterns'],
  },
  [DataCategory.DEVICE]: {
    label: 'Device Information',
    description: 'Technical details about connected devices.',
    examples: ['Device model', 'Operating system', 'App version'],
  },
  [DataCategory.AGREEMENTS]: {
    label: 'Agreements & Contracts',
    description: 'Family agreements and parental contracts.',
    examples: ['Agreement terms', 'Signatures', 'Revision history'],
  },
  [DataCategory.MESSAGES]: {
    label: 'Communications',
    description: 'Messages between family members within the app.',
    examples: ['In-app messages', 'Notifications', 'Check-in responses'],
  },
}

/**
 * Data retention periods.
 */
export const RetentionPeriod = {
  /** Configurable by user */
  CONFIGURABLE: 'configurable',
  /** Fixed 90-day rolling window */
  ROLLING_90_DAYS: '90_days',
  /** Until account deletion */
  UNTIL_DELETION: 'until_deletion',
  /** Legal requirement (7 years) */
  LEGAL_7_YEARS: '7_years',
  /** 30 days after deletion request */
  GRACE_PERIOD: '30_days_grace',
} as const

export type RetentionPeriodValue = (typeof RetentionPeriod)[keyof typeof RetentionPeriod]

/**
 * Retention period descriptions.
 */
export const RetentionPeriodInfo: Record<RetentionPeriodValue, string> = {
  [RetentionPeriod.CONFIGURABLE]: 'You control how long this data is kept (7-365 days)',
  [RetentionPeriod.ROLLING_90_DAYS]: 'Automatically deleted after 90 days',
  [RetentionPeriod.UNTIL_DELETION]: 'Kept until you request account deletion',
  [RetentionPeriod.LEGAL_7_YEARS]: 'Retained for 7 years per legal requirements',
  [RetentionPeriod.GRACE_PERIOD]: 'Deleted 30 days after account deletion request',
}

/**
 * Data category retention mapping.
 */
export const DataRetentionPolicy: Record<DataCategoryValue, RetentionPeriodValue> = {
  [DataCategory.ACCOUNT]: RetentionPeriod.UNTIL_DELETION,
  [DataCategory.FAMILY]: RetentionPeriod.UNTIL_DELETION,
  [DataCategory.SCREENSHOTS]: RetentionPeriod.CONFIGURABLE,
  [DataCategory.LOCATION]: RetentionPeriod.CONFIGURABLE,
  [DataCategory.USAGE]: RetentionPeriod.ROLLING_90_DAYS,
  [DataCategory.DEVICE]: RetentionPeriod.UNTIL_DELETION,
  [DataCategory.AGREEMENTS]: RetentionPeriod.LEGAL_7_YEARS,
  [DataCategory.MESSAGES]: RetentionPeriod.UNTIL_DELETION,
}

/**
 * Storage regions.
 */
export const StorageRegion = {
  US_CENTRAL: 'us-central1',
  US_EAST: 'us-east1',
  EU_WEST: 'europe-west1',
} as const

export type StorageRegionValue = (typeof StorageRegion)[keyof typeof StorageRegion]

/**
 * Storage region descriptions.
 */
export const StorageRegionInfo: Record<StorageRegionValue, { name: string; location: string }> = {
  [StorageRegion.US_CENTRAL]: { name: 'US Central', location: 'Iowa, USA' },
  [StorageRegion.US_EAST]: { name: 'US East', location: 'South Carolina, USA' },
  [StorageRegion.EU_WEST]: { name: 'EU West', location: 'Belgium, EU' },
}

// ============================================================================
// SCHEMAS
// ============================================================================

/**
 * Privacy preferences schema.
 */
export const PrivacyPreferencesSchema = z.object({
  /** Whether to receive marketing emails */
  marketingEmails: z.boolean(),
  /** Whether to allow analytics collection */
  analyticsEnabled: z.boolean(),
  /** Whether to allow crash reporting */
  crashReportingEnabled: z.boolean(),
  /** Updated timestamp */
  updatedAt: z.number(),
})

export type PrivacyPreferences = z.infer<typeof PrivacyPreferencesSchema>

/**
 * Default privacy preferences.
 */
export const DEFAULT_PRIVACY_PREFERENCES: PrivacyPreferences = {
  marketingEmails: false,
  analyticsEnabled: true,
  crashReportingEnabled: true,
  updatedAt: 0,
}

/**
 * Session info schema.
 */
export const SessionInfoSchema = z.object({
  /** Session ID */
  sessionId: z.string(),
  /** Device type */
  deviceType: z.enum(['web', 'ios', 'android', 'extension']),
  /** Browser or app name */
  clientName: z.string(),
  /** IP address (masked for privacy) */
  ipAddress: z.string(),
  /** Approximate location from IP */
  location: z.string().nullable(),
  /** Login timestamp */
  loginAt: z.number(),
  /** Last activity timestamp */
  lastActiveAt: z.number(),
  /** Whether this is the current session */
  isCurrent: z.boolean(),
})

export type SessionInfo = z.infer<typeof SessionInfoSchema>

/**
 * Access level for family members.
 */
export const AccessLevel = {
  OWNER: 'owner',
  PARENT: 'parent',
  CHILD: 'child',
  SUPPORT: 'support',
} as const

export type AccessLevelValue = (typeof AccessLevel)[keyof typeof AccessLevel]

/**
 * Family member access info.
 */
export const FamilyAccessInfoSchema = z.object({
  /** Member UID */
  uid: z.string(),
  /** Member name */
  name: z.string(),
  /** Role/access level */
  accessLevel: z.enum([
    AccessLevel.OWNER,
    AccessLevel.PARENT,
    AccessLevel.CHILD,
    AccessLevel.SUPPORT,
  ]),
  /** What data they can access */
  dataAccess: z.array(z.string()),
})

export type FamilyAccessInfo = z.infer<typeof FamilyAccessInfoSchema>

// ============================================================================
// API TYPES
// ============================================================================

export interface GetPrivacyInfoResponse {
  /** Data categories collected */
  dataCategories: Array<{
    category: DataCategoryValue
    label: string
    description: string
    examples: string[]
    retentionPeriod: RetentionPeriodValue
    retentionDescription: string
  }>
  /** Storage region info */
  storageRegion: {
    region: StorageRegionValue
    name: string
    location: string
  }
  /** Family access summary */
  familyAccess: FamilyAccessInfo[]
  /** User's privacy preferences */
  preferences: PrivacyPreferences
  /** Last password change */
  lastPasswordChange: number | null
  /** Account created date */
  accountCreated: number
}

export interface GetSessionHistoryResponse {
  sessions: SessionInfo[]
  totalSessions: number
}

export interface UpdatePrivacyPreferencesInput {
  marketingEmails?: boolean
  analyticsEnabled?: boolean
  crashReportingEnabled?: boolean
}

export interface UpdatePrivacyPreferencesResponse {
  success: boolean
  preferences: PrivacyPreferences
}

// ============================================================================
// PRIVACY POLICY LINKS
// ============================================================================

export const PRIVACY_LINKS = {
  PRIVACY_POLICY: '/legal/privacy',
  TERMS_OF_SERVICE: '/legal/terms',
  COOKIE_POLICY: '/legal/cookies',
  DATA_PROCESSING: '/legal/dpa',
} as const
