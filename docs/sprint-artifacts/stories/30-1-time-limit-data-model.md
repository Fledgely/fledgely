# Story 30.1: Time Limit Data Model

Status: Done

## Story

As **the system**,
I want **a data model for time limits**,
So that **limits can be configured and enforced**.

## Acceptance Criteria

1. **AC1: Schema includes required fields**
   - Given time limits need to be stored
   - When designing data model
   - Then schema includes: childId, limitType, category, minutes, schedule

2. **AC2: Limit types supported**
   - Given limit type field
   - When configuring limits
   - Then limitType supports: "daily_total", "per_device", "per_category"

3. **AC3: Schedule support**
   - Given schedule requirements
   - When configuring limits
   - Then schedule supports: weekday vs weekend different limits

4. **AC4: Zod schema creation**
   - Given schema requirements
   - When implementing in code
   - Then Zod schema: `timeLimitSchema` in @fledgely/shared/contracts

5. **AC5: Agreement linkage**
   - Given limits are part of family agreements
   - When storing limits
   - Then limits linked to agreement (part of family agreement)

6. **AC6: Effective dates**
   - Given future-dated changes may be needed
   - When storing limits
   - Then effective dates support future-dated changes

## Tasks / Subtasks

- [x] Task 1: Create time limit Zod schemas (AC: #1, #2, #4)
  - [x] 1.1 Create `timeLimitTypeSchema` enum for limit types
  - [x] 1.2 Create `timeLimitScheduleSchema` for weekday/weekend schedules
  - [x] 1.3 Create `timeLimitSchema` for individual limit configuration
  - [x] 1.4 Create `childTimeLimitsSchema` for complete child limits
  - [x] 1.5 Export new types from shared package

- [x] Task 2: Define Firestore document structure (AC: #1, #3, #5)
  - [x] 2.1 Design `/families/{familyId}/children/{childId}/timeLimits` document structure
  - [x] 2.2 Add schedule configuration subdocument
  - [x] 2.3 Add agreement reference field

- [x] Task 3: Add effective dates support (AC: #6)
  - [x] 3.1 Add `effectiveFrom` field for future-dated changes
  - [x] 3.2 Add `effectiveUntil` field for temporary limits
  - [x] 3.3 Add helper types for limit validity checking

- [x] Task 4: Create schema tests (AC: #1-6)
  - [x] 4.1 Unit tests for all schema validations
  - [x] 4.2 Test schedule configuration
  - [x] 4.3 Test effective date handling
  - [x] 4.4 Test limit type validation

## Dev Notes

### Architecture Pattern - Follow Screen Time Schema Conventions

Follow exact patterns from Story 29.1 (Screen Time Data Model):

```typescript
// Example pattern from screenTimeCategorySchema:
export const timeLimitTypeSchema = z.enum(['daily_total', 'per_device', 'per_category'])
export type TimeLimitType = z.infer<typeof timeLimitTypeSchema>
```

### Proposed Time Limit Schema Design

```typescript
/**
 * Types of time limits that can be configured.
 * Story 30.1: Time Limit Data Model
 */
export const timeLimitTypeSchema = z.enum([
  'daily_total', // Total screen time per day
  'per_device', // Limit per specific device
  'per_category', // Limit per app category
])
export type TimeLimitType = z.infer<typeof timeLimitTypeSchema>

/**
 * Days of the week for schedule configuration.
 */
export const dayOfWeekSchema = z.enum([
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
])
export type DayOfWeek = z.infer<typeof dayOfWeekSchema>

/**
 * Schedule type for simplified configuration.
 */
export const scheduleTypeSchema = z.enum([
  'weekdays', // Monday-Friday
  'weekends', // Saturday-Sunday
  'school_days', // Custom school day configuration
  'all_days', // Same limit every day
  'custom', // Per-day configuration
])
export type ScheduleType = z.infer<typeof scheduleTypeSchema>

/**
 * Schedule configuration for time limits.
 */
export const timeLimitScheduleSchema = z.object({
  /** Type of schedule */
  scheduleType: scheduleTypeSchema,
  /** Minutes limit for weekdays (Mon-Fri) */
  weekdayMinutes: z.number().int().min(0).max(1440).optional(),
  /** Minutes limit for weekends (Sat-Sun) */
  weekendMinutes: z.number().int().min(0).max(1440).optional(),
  /** Per-day limits for custom schedules */
  customDays: z.record(dayOfWeekSchema, z.number().int().min(0).max(1440)).optional(),
  /** Whether this category has no limit (unlimited) */
  unlimited: z.boolean().optional(),
})
export type TimeLimitSchedule = z.infer<typeof timeLimitScheduleSchema>

/**
 * Individual time limit configuration.
 */
export const timeLimitSchema = z.object({
  /** Type of limit */
  limitType: timeLimitTypeSchema,
  /** Category for per_category limits */
  category: screenTimeCategorySchema.optional(),
  /** Device ID for per_device limits */
  deviceId: z.string().optional(),
  /** Schedule configuration */
  schedule: timeLimitScheduleSchema,
  /** When this limit becomes effective (epoch ms) */
  effectiveFrom: z.number().optional(),
  /** When this limit expires (epoch ms, for temporary limits) */
  effectiveUntil: z.number().optional(),
  /** Whether limit is currently active */
  isActive: z.boolean().default(true),
  /** Created timestamp */
  createdAt: z.number(),
  /** Last updated timestamp */
  updatedAt: z.number(),
})
export type TimeLimit = z.infer<typeof timeLimitSchema>

/**
 * Complete time limits configuration for a child.
 * Stored at: /families/{familyId}/children/{childId}/timeLimits/config
 */
export const childTimeLimitsSchema = z.object({
  /** Child this configuration belongs to */
  childId: z.string(),
  /** Family this belongs to */
  familyId: z.string(),
  /** Reference to the agreement that includes these limits */
  agreementId: z.string().optional(),
  /** Daily total limit */
  dailyTotal: timeLimitScheduleSchema.optional(),
  /** Per-category limits */
  categoryLimits: z
    .array(
      z.object({
        category: screenTimeCategorySchema,
        schedule: timeLimitScheduleSchema,
      })
    )
    .optional(),
  /** Per-device limits */
  deviceLimits: z
    .array(
      z.object({
        deviceId: z.string(),
        deviceName: z.string(),
        schedule: timeLimitScheduleSchema,
        /** Category overrides for this device */
        categoryOverrides: z
          .array(
            z.object({
              category: screenTimeCategorySchema,
              schedule: timeLimitScheduleSchema,
            })
          )
          .optional(),
      })
    )
    .optional(),
  /** When this configuration becomes effective */
  effectiveFrom: z.number().optional(),
  /** Last updated timestamp */
  updatedAt: z.number(),
  /** Version for optimistic locking */
  version: z.number().default(1),
})
export type ChildTimeLimits = z.infer<typeof childTimeLimitsSchema>
```

### Firestore Document Structure

```
/families/{familyId}/children/{childId}/timeLimits/config
  - childId: string
  - familyId: string
  - agreementId: string (optional)
  - dailyTotal: {
      scheduleType: "weekdays",
      weekdayMinutes: 120,
      weekendMinutes: 180
    }
  - categoryLimits: [
      { category: "gaming", schedule: { weekdayMinutes: 60, weekendMinutes: 90 } },
      { category: "education", schedule: { unlimited: true } }
    ]
  - deviceLimits: [
      {
        deviceId: "...",
        deviceName: "School Chromebook",
        schedule: { weekdayMinutes: 180 },
        categoryOverrides: [
          { category: "gaming", schedule: { weekdayMinutes: 0 } }
        ]
      }
    ]
  - effectiveFrom: 1735678900000
  - updatedAt: 1735678900000
  - version: 1
```

### Agreement Linkage (AC5)

Time limits are part of family agreements:

- `agreementId` links to the agreement document
- Agreement updates should reference limit changes
- Child acknowledgment required for limit changes

### Effective Dates (AC6)

Support for future-dated and temporary limits:

- `effectiveFrom`: When limit starts (null = immediate)
- `effectiveUntil`: When limit expires (null = permanent)
- Allows scheduling limit changes for future dates

### NFR Compliance

- **NFR42:** WCAG 2.1 AA accessibility - N/A (data model only)

### Testing Approach

```typescript
// packages/shared/src/contracts/timeLimits.test.ts

describe('timeLimitSchema', () => {
  it('validates daily total limit', () => {
    const limit = {
      limitType: 'daily_total',
      schedule: { scheduleType: 'weekdays', weekdayMinutes: 120, weekendMinutes: 180 },
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    expect(() => timeLimitSchema.parse(limit)).not.toThrow()
  })

  it('validates per-category limit', () => {
    const limit = {
      limitType: 'per_category',
      category: 'gaming',
      schedule: { scheduleType: 'all_days', weekdayMinutes: 60 },
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    expect(() => timeLimitSchema.parse(limit)).not.toThrow()
  })

  it('rejects minutes exceeding 24 hours', () => {
    const limit = {
      limitType: 'daily_total',
      schedule: { scheduleType: 'all_days', weekdayMinutes: 1500 }, // > 1440
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    expect(() => timeLimitSchema.parse(limit)).toThrow()
  })
})
```

### References

- [Source: docs/epics/epic-list.md#story-301] - Story requirements
- [Source: packages/shared/src/contracts/index.ts] - Existing schema patterns
- [Source: Story 29.1] - Screen time data model patterns
- [Source: FR56] - Time limits configuration requirement
- [Source: FR142] - Custom category creation requirement

## Dev Agent Record

### Context Reference

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

- All 6 acceptance criteria implemented and validated through tests
- Created 10 Zod schemas following Story 29.1 patterns:
  - `timeLimitTypeSchema` (daily_total, per_device, per_category)
  - `dayOfWeekSchema` (sunday through saturday)
  - `scheduleTypeSchema` (weekdays, weekends, school_days, all_days, custom)
  - `timeLimitScheduleSchema` (schedule configuration with weekday/weekend differentiation)
  - `categoryLimitSchema` (per-category limit configuration)
  - `deviceLimitSchema` (per-device limit with category overrides)
  - `timeLimitSchema` (individual limit with effective dates)
  - `childTimeLimitsSchema` (complete child limits config for Firestore)
- 76 tests covering all acceptance criteria:
  - AC1: Required fields (childId, limitType, category, minutes, schedule)
  - AC2: Limit types (daily_total, per_device, per_category)
  - AC3: Schedule support (weekday/weekend differentiation, custom per-day)
  - AC4: Zod schema exports
  - AC5: Agreement linkage (agreementId field)
  - AC6: Effective dates (effectiveFrom, effectiveUntil)
- Firestore document structure: `/families/{familyId}/children/{childId}/timeLimits/config`
- 734 total tests pass in shared package

### File List

**Modified Files:**

- `packages/shared/src/contracts/index.ts` - Added time limit schemas

**Created Files:**

- `packages/shared/src/contracts/timeLimits.test.ts` - 76 unit tests for time limit schemas
- `docs/sprint-artifacts/stories/30-1-time-limit-data-model.md` - This story file
