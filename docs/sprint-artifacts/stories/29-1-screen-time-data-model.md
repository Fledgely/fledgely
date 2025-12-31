# Story 29.1: Screen Time Data Model

Status: Done

## Story

As **the system**,
I want **a data model to track screen time**,
So that **time usage can be stored and queried accurately**.

## Acceptance Criteria

1. **AC1: Schema includes required fields**
   - Given screen time needs to be tracked
   - When designing data model
   - Then schema includes: childId, deviceId, date, appCategory, minutes

2. **AC2: Per-day granularity**
   - Given screen time data structure
   - When storing time records
   - Then time tracked per-day granularity (not real-time streaming)

3. **AC3: Zod schema creation**
   - Given schema requirements
   - When implementing in code
   - Then Zod schema created: `screenTimeSchema` in @fledgely/shared/contracts

4. **AC4: Aggregation support**
   - Given screen time records
   - When querying data
   - Then supports aggregation by: day, week, device, category

5. **AC5: Timezone handling**
   - Given screen time records
   - When storing time data
   - Then timezone stored with record (child's local time)

6. **AC6: Retention policy**
   - Given screenshot retention policy exists
   - When managing screen time data
   - Then data retained per screenshot retention policy

## Tasks / Subtasks

- [x] Task 1: Create screenTime Zod schemas (AC: #1, #3)
  - [x] 1.1 Create `screenTimeEntrySchema` for individual time records
  - [x] 1.2 Create `screenTimeDailySummarySchema` for aggregated daily data
  - [x] 1.3 Create `appCategoryTimeSchema` for per-category breakdown
  - [x] 1.4 Export new types from shared package

- [x] Task 2: Define Firestore document structure (AC: #1, #2, #5)
  - [x] 2.1 Design `/families/{familyId}/children/{childId}/screenTime/{date}` document structure
  - [x] 2.2 Add device-level breakdown subdocument
  - [x] 2.3 Add category-level breakdown subdocument
  - [x] 2.4 Include timezone field in all records

- [x] Task 3: Add aggregation helper types (AC: #4)
  - [x] 3.1 Create `screenTimeWeeklySummarySchema` for weekly aggregation
  - [x] 3.2 Create helper types for device aggregation
  - [x] 3.3 Create helper types for category aggregation

- [x] Task 4: Implement retention policy integration (AC: #6)
  - [x] 4.1 Add `expiresAt` field based on retention policy
  - [x] 4.2 Document TTL strategy for Firestore cleanup

- [x] Task 5: Create schema tests (AC: #1-6)
  - [x] 5.1 Unit tests for all schema validations
  - [x] 5.2 Test timezone handling
  - [x] 5.3 Test aggregation type compatibility

## Dev Notes

### Architecture Pattern - Follow Existing Schema Conventions

Follow exact patterns from existing contracts in `packages/shared/src/contracts/index.ts`:

```typescript
// Example pattern from existing code (accessibilitySettingsSchema):
export const accessibilitySettingsSchema = z.object({
  alwaysShowDescriptions: z.boolean().default(false),
  // ...
})
export type AccessibilitySettings = z.infer<typeof accessibilitySettingsSchema>
```

### Proposed Screen Time Schema Design

```typescript
/**
 * Categories for screen time tracking.
 * Aligned with classification categories from Story 20.2.
 */
export const screenTimeCategorySchema = z.enum([
  'education',
  'social_media',
  'gaming',
  'entertainment',
  'productivity',
  'communication',
  'news',
  'shopping',
  'other',
])
export type ScreenTimeCategory = z.infer<typeof screenTimeCategorySchema>

/**
 * Per-category time entry within a daily summary.
 */
export const categoryTimeEntrySchema = z.object({
  category: screenTimeCategorySchema,
  minutes: z.number().int().min(0),
  /** Top apps in this category */
  topApps: z
    .array(
      z.object({
        appName: z.string(),
        minutes: z.number().int().min(0),
      })
    )
    .optional(),
})
export type CategoryTimeEntry = z.infer<typeof categoryTimeEntrySchema>

/**
 * Per-device time entry within a daily summary.
 */
export const deviceTimeEntrySchema = z.object({
  deviceId: z.string(),
  deviceName: z.string(),
  deviceType: z.enum(['chromebook', 'android', 'ios', 'windows', 'macos', 'fire_tv', 'switch']),
  minutes: z.number().int().min(0),
  /** Breakdown by category for this device */
  categories: z.array(categoryTimeEntrySchema).optional(),
})
export type DeviceTimeEntry = z.infer<typeof deviceTimeEntrySchema>

/**
 * Daily screen time summary for a child.
 * Stored at: /families/{familyId}/children/{childId}/screenTime/{date}
 *
 * Story 29.1: Screen Time Data Model
 */
export const screenTimeDailySummarySchema = z.object({
  /** Child this record belongs to */
  childId: z.string(),
  /** Date in YYYY-MM-DD format (child's local date) */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** IANA timezone for the child (e.g., 'America/New_York') */
  timezone: z.string(),
  /** Total minutes across all devices */
  totalMinutes: z.number().int().min(0),
  /** Breakdown by device */
  devices: z.array(deviceTimeEntrySchema),
  /** Breakdown by category (aggregated across devices) */
  categories: z.array(categoryTimeEntrySchema),
  /** When this record was last updated */
  updatedAt: z.number(),
  /** When this record expires (retention policy) */
  expiresAt: z.number().optional(),
})
export type ScreenTimeDailySummary = z.infer<typeof screenTimeDailySummarySchema>

/**
 * Weekly aggregation for dashboard display.
 */
export const screenTimeWeeklySummarySchema = z.object({
  childId: z.string(),
  /** Week start date (Sunday) in YYYY-MM-DD format */
  weekStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string(),
  /** Total minutes for the week */
  totalMinutes: z.number().int().min(0),
  /** Daily totals (array of 7) */
  dailyTotals: z.array(z.number().int().min(0)).length(7),
  /** Average daily minutes */
  averageDaily: z.number().min(0),
  /** Category breakdown for the week */
  categories: z.array(categoryTimeEntrySchema),
})
export type ScreenTimeWeeklySummary = z.infer<typeof screenTimeWeeklySummarySchema>
```

### Firestore Document Structure

```
/families/{familyId}/children/{childId}/screenTime/{date}
  - childId: string
  - date: "2025-12-31"
  - timezone: "America/New_York"
  - totalMinutes: 180
  - devices: [
      { deviceId: "...", deviceName: "School Chromebook", deviceType: "chromebook", minutes: 120, categories: [...] },
      { deviceId: "...", deviceName: "Android Phone", deviceType: "android", minutes: 60, categories: [...] }
    ]
  - categories: [
      { category: "education", minutes: 90, topApps: [{appName: "Khan Academy", minutes: 60}] },
      { category: "gaming", minutes: 45, topApps: [{appName: "Minecraft", minutes: 45}] },
      { category: "social_media", minutes: 45, topApps: [{appName: "YouTube", minutes: 30}] }
    ]
  - updatedAt: 1735678900000
  - expiresAt: 1738357300000
```

### Timezone Handling (AC5)

- Store timezone from child's profile (set during enrollment)
- Use IANA timezone format (e.g., 'America/New_York', 'Europe/London')
- Date field is the child's LOCAL date, not UTC
- All time aggregations respect child's timezone

### Retention Policy Integration (AC6)

Use existing retention policy from Story 18.3:

```typescript
import { getRetentionDays, calculateRetentionExpiry } from '@fledgely/shared'

// When creating/updating screen time record:
const retentionDays = getRetentionDays(family.retentionPolicy)
const expiresAt = calculateRetentionExpiry(Date.now(), retentionDays)
```

### TTL Strategy for Firestore Cleanup (Task 4.2)

Screen time records use Firestore TTL (Time-To-Live) for automatic cleanup:

1. **TTL Field**: The `expiresAt` field (optional, epoch milliseconds) enables automatic deletion
2. **Firestore TTL Policy**: Configure a TTL policy on the `expiresAt` field in Firestore:
   ```
   Collection: /families/{familyId}/children/{childId}/screenTime
   TTL Field: expiresAt
   ```
3. **Configuration Steps**:
   - In Firebase Console → Firestore → Time-to-live policies
   - Add policy for collection group `screenTime` on field `expiresAt`
   - Firestore automatically deletes documents when `expiresAt` timestamp passes
4. **Retention Values**: Based on family's retention policy (7, 30, 90, or 365 days)
5. **Optional Field**: Records without `expiresAt` are retained indefinitely (admin accounts)

Note: Firestore TTL deletion is not instant—documents are deleted within 24-72 hours of expiry.

### Category Alignment

Categories should align with classification taxonomy (Story 20.2):

```typescript
import { CATEGORY_VALUES } from '@fledgely/shared'
// Use existing category values where possible
```

### NFR Compliance

- **NFR7:** Time tracking updates display within 5 seconds of activity change
  - This story creates the data model; display latency handled in Story 29.4
- **NFR42:** WCAG 2.1 AA accessibility - N/A (data model only)

### Testing Approach

```typescript
// packages/shared/src/contracts/screenTime.test.ts

describe('screenTimeDailySummarySchema', () => {
  it('validates complete daily summary', () => {
    const summary = {
      childId: 'child-123',
      date: '2025-12-31',
      timezone: 'America/New_York',
      totalMinutes: 180,
      devices: [...],
      categories: [...],
      updatedAt: Date.now(),
    }
    expect(() => screenTimeDailySummarySchema.parse(summary)).not.toThrow()
  })

  it('rejects invalid date format', () => {
    const summary = { ...validSummary, date: '12/31/2025' }
    expect(() => screenTimeDailySummarySchema.parse(summary)).toThrow()
  })

  it('rejects negative minutes', () => {
    const summary = { ...validSummary, totalMinutes: -10 }
    expect(() => screenTimeDailySummarySchema.parse(summary)).toThrow()
  })
})
```

### References

- [Source: docs/epics/epic-list.md#story-291] - Story requirements
- [Source: packages/shared/src/contracts/index.ts] - Existing schema patterns
- [Source: docs/prd/non-functional-requirements.md#NFR7] - 5-second display update requirement
- [Source: FR50] - Aggregate screen time across all family devices
- [Source: FR55] - System tracks screen time across all monitored devices per child
- [Source: Story 18.3] - Retention policy for data expiry

## Dev Agent Record

### Context Reference

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

- All 6 acceptance criteria implemented and tested
- Created 8 new schemas: screenTimeDeviceTypeSchema, screenTimeCategorySchema, appTimeEntrySchema, categoryTimeEntrySchema, deviceTimeEntrySchema, screenTimeDailySummarySchema, screenTimeWeeklySummarySchema, screenTimeEntrySchema
- Created 2 constants: MAX_SCREEN_TIME_MINUTES_PER_DAY (1440), MAX_SCREEN_TIME_MINUTES_PER_WEEK (10080)
- 57 new unit tests covering all ACs + edge cases
- Full aggregation support: daily, weekly, by device, by category
- Timezone handling with IANA timezone format
- Retention policy integration via optional expiresAt field
- Document structure documented in Dev Notes for Firestore path: `/families/{familyId}/children/{childId}/screenTime/{date}`
- TTL strategy documented for Firestore cleanup
- Max minute validation added to prevent invalid data (1440 min/day, 10080 min/week)
- Edge case tests for: max minutes, empty arrays, boundary values
- All 658 tests pass (57 new + existing)

### File List

**New Files:**

- `packages/shared/src/contracts/screenTime.test.ts` - 36 unit tests for schema validations

**Modified Files:**

- `packages/shared/src/contracts/index.ts` - Added 8 screen time schemas and types
- `packages/shared/src/index.ts` - Exported screen time types for public API
