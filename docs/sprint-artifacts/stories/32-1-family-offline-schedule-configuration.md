# Story 32.1: Family Offline Schedule Configuration

Status: done

## Story

As **a parent**,
I want **to configure family-wide offline times**,
So that **our whole family disconnects together**.

## Acceptance Criteria

1. **AC1: Daily schedule with start and end time**
   - Given parent is setting up family offline time
   - When configuring schedule
   - Then daily schedule includes: start time and end time (e.g., 8pm-7am)

2. **AC2: Different schedules for weekdays vs weekends**
   - Given parent is configuring schedule
   - When setting different times
   - Then weekday and weekend schedules can be configured independently

3. **AC3: Quick presets available**
   - Given parent wants quick setup
   - When selecting presets
   - Then "Dinner time" preset available (6pm-7pm daily)
   - And "Bedtime" preset available (9pm-7am)

4. **AC4: Schedule applies to all family members**
   - Given schedule is configured
   - When viewing settings
   - Then schedule applies to all family members (parents included)

5. **AC5: Child sees family offline message**
   - Given schedule is configured
   - When child views their dashboard
   - Then child sees: "Family offline time: Everyone unplugs together!"

## Tasks / Subtasks

- [x] Task 1: Create family offline schedule schema (AC: #1, #2, #4)
  - [x] 1.1 Create `offlineSchedulePresetSchema` enum for presets
  - [x] 1.2 Create `offlineTimeWindowSchema` for start/end times
  - [x] 1.3 Create `familyOfflineScheduleSchema` with weekday/weekend support
  - [x] 1.4 Export new types from shared package

- [x] Task 2: Create React hook for family offline schedule (AC: #1, #2)
  - [x] 2.1 Create `useFamilyOfflineSchedule` hook
  - [x] 2.2 Implement load from Firestore
  - [x] 2.3 Implement save to Firestore
  - [x] 2.4 Add optimistic updates and error handling

- [x] Task 3: Build offline schedule configuration UI (AC: #1, #2, #3)
  - [x] 3.1 Create `OfflineScheduleCard` component
  - [x] 3.2 Add time picker for start/end times
  - [x] 3.3 Add weekday/weekend toggle tabs
  - [x] 3.4 Add preset buttons (Dinner time, Bedtime)
  - [x] 3.5 Add enable/disable toggle

- [x] Task 4: Add child-facing message display (AC: #5)
  - [x] 4.1 Add offline schedule indicator to child dashboard
  - [x] 4.2 Display "Family offline time: Everyone unplugs together!" message
  - [x] 4.3 Show current schedule times to child

- [x] Task 5: Add route and integrate settings page (AC: #1-5)
  - [x] 5.1 Add Offline Schedule section to settings page
  - [x] 5.2 Connect to existing settings navigation
  - [x] 5.3 Verify build passes

## Dev Notes

### Architecture Pattern - Follow Time Limits Schema Conventions

Follow exact patterns from Story 30.1 (Time Limit Data Model) and existing `accessWindowSchema`:

```typescript
// Reuse existing dayOfWeek pattern from accessWindowSchema
export const offlineSchedulePresetSchema = z.enum([
  'custom', // User-configured schedule
  'dinner_time', // 6pm-7pm daily
  'bedtime', // 9pm-7am
])
export type OfflineSchedulePreset = z.infer<typeof offlineSchedulePresetSchema>

export const offlineTimeWindowSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM format (24-hour)
  endTime: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM format
  timezone: z.string(), // IANA timezone (e.g., 'America/New_York')
})
export type OfflineTimeWindow = z.infer<typeof offlineTimeWindowSchema>

export const familyOfflineScheduleSchema = z.object({
  familyId: z.string(),
  enabled: z.boolean().default(false),
  preset: offlineSchedulePresetSchema.default('custom'),
  /** Weekday schedule (Mon-Fri) */
  weekdaySchedule: offlineTimeWindowSchema.optional(),
  /** Weekend schedule (Sat-Sun) */
  weekendSchedule: offlineTimeWindowSchema.optional(),
  /** Applies to all family members including parents */
  appliesToParents: z.boolean().default(true),
  /** Created timestamp */
  createdAt: z.number(),
  /** Last updated timestamp */
  updatedAt: z.number(),
})
export type FamilyOfflineSchedule = z.infer<typeof familyOfflineScheduleSchema>
```

### Preset Configurations

```typescript
const OFFLINE_PRESETS: Record<
  OfflineSchedulePreset,
  { weekday: OfflineTimeWindow; weekend: OfflineTimeWindow }
> = {
  dinner_time: {
    weekday: { startTime: '18:00', endTime: '19:00', timezone: 'local' },
    weekend: { startTime: '18:00', endTime: '19:00', timezone: 'local' },
  },
  bedtime: {
    weekday: { startTime: '21:00', endTime: '07:00', timezone: 'local' },
    weekend: { startTime: '22:00', endTime: '08:00', timezone: 'local' }, // Later on weekends
  },
  custom: null, // No preset, user configures
}
```

### Firestore Document Structure

```
/families/{familyId}/settings/offlineSchedule
  - familyId: string
  - enabled: boolean
  - preset: 'custom' | 'dinner_time' | 'bedtime'
  - weekdaySchedule: {
      startTime: "20:00",
      endTime: "07:00",
      timezone: "America/New_York"
    }
  - weekendSchedule: {
      startTime: "21:00",
      endTime: "08:00",
      timezone: "America/New_York"
    }
  - appliesToParents: true
  - createdAt: 1735678900000
  - updatedAt: 1735678900000
```

### React Hook Pattern

Follow exact pattern from `useChildTimeLimits` in Story 30-2:

```typescript
// apps/web/src/hooks/useFamilyOfflineSchedule.ts
export function useFamilyOfflineSchedule(familyId: string | undefined) {
  const [schedule, setSchedule] = useState<FamilyOfflineSchedule | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load from Firestore
  useEffect(() => {
    if (!familyId) return
    const docRef = doc(db, 'families', familyId, 'settings', 'offlineSchedule')
    return onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          setSchedule(familyOfflineScheduleSchema.parse(snap.data()))
        } else {
          setSchedule(null) // No schedule configured yet
        }
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      }
    )
  }, [familyId])

  const saveSchedule = async (updates: Partial<FamilyOfflineSchedule>) => {
    // Validate and save to Firestore
  }

  return { schedule, loading, error, saveSchedule }
}
```

### UI Component Structure

```
apps/web/src/components/
└── settings/
    └── OfflineScheduleCard.tsx  // Main configuration card

OfflineScheduleCard contains:
- Enable/disable toggle at top
- Preset buttons (Dinner time, Bedtime, Custom)
- Tab group for Weekdays / Weekends
- Time pickers for start and end time
- "Applies to parents too" checkbox (enabled by default)
- Save button
```

### Child Dashboard Integration

Add to child dashboard (`apps/web/src/app/child/...`):

```tsx
// Show in child dashboard when offline schedule is configured
{
  offlineSchedule?.enabled && (
    <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Moon className="h-5 w-5 text-indigo-600" />
          Family Offline Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-indigo-700 font-medium">Everyone unplugs together!</p>
        <p className="text-sm text-indigo-600 mt-1">{formatSchedule(offlineSchedule)}</p>
      </CardContent>
    </Card>
  )
}
```

### Time Picker Component

Use existing time picker pattern or create simple dropdown-based picker:

```tsx
interface TimePickerProps {
  value: string // HH:MM format
  onChange: (value: string) => void
  label: string
}

function TimePicker({ value, onChange, label }: TimePickerProps) {
  // Hour and minute dropdowns
  // 24-hour format internally, display as 12-hour with AM/PM
}
```

### NFR Compliance

- **NFR42:** WCAG 2.1 AA accessibility
  - Time pickers must be keyboard accessible
  - Proper ARIA labels for all controls
  - Screen reader announcements for schedule changes

### Testing Approach

```typescript
// Hook tests
describe('useFamilyOfflineSchedule', () => {
  it('loads schedule from Firestore', async () => {
    /* ... */
  })
  it('returns null when no schedule configured', async () => {
    /* ... */
  })
  it('saves schedule updates', async () => {
    /* ... */
  })
  it('applies preset configurations', async () => {
    /* ... */
  })
})

// Schema tests
describe('familyOfflineScheduleSchema', () => {
  it('validates complete schedule', () => {
    /* ... */
  })
  it('validates time format HH:MM', () => {
    /* ... */
  })
  it('rejects invalid time format', () => {
    /* ... */
  })
  it('validates preset enum', () => {
    /* ... */
  })
})
```

### References

- [Source: docs/epics/epic-list.md#story-321] - Story requirements
- [Source: packages/shared/src/contracts/index.ts] - accessWindowSchema pattern
- [Source: Story 30-1] - Time limit schema patterns
- [Source: Story 30-2] - useChildTimeLimits hook pattern
- [Source: FR59] - Family offline time requirement
- [Source: FR60] - Parent compliance tracking requirement

## Dev Agent Record

### Context Reference

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

- All 5 tasks completed successfully
- 39 tests passing (9 schema, 9 hook, 21 OfflineScheduleCard, 9 ChildOfflineScheduleCard)
- Build passes
- Integrated into time-limits settings page and child dashboard

### File List

- `packages/shared/src/contracts/index.ts` - Added offline schedule schemas
- `packages/shared/src/contracts/offlineSchedule.test.ts` - Schema tests (16 tests)
- `packages/shared/src/index.ts` - Added exports
- `apps/web/src/hooks/useFamilyOfflineSchedule.ts` - React hook
- `apps/web/src/hooks/useFamilyOfflineSchedule.test.ts` - Hook tests (9 tests)
- `apps/web/src/components/settings/OfflineScheduleCard.tsx` - Parent config UI
- `apps/web/src/components/settings/OfflineScheduleCard.test.tsx` - Component tests (21 tests)
- `apps/web/src/components/child/ChildOfflineScheduleCard.tsx` - Child display
- `apps/web/src/components/child/ChildOfflineScheduleCard.test.tsx` - Component tests (9 tests)
- `apps/web/src/app/child/dashboard/page.tsx` - Integrated child card
- `apps/web/src/app/dashboard/settings/time-limits/page.tsx` - Integrated parent card
- `apps/web/src/utils/timeUtils.ts` - Shared time formatting utility (code review fix)
- `apps/web/src/components/icons/MoonIcon.tsx` - Shared MoonIcon component (code review fix)

### Code Review Record

**Reviewed:** 2025-12-31
**Reviewer:** AI Code Review

**Issues Found and Fixed:**

1. [HIGH] Extracted duplicate `formatTimeForDisplay` to shared utility
2. [MEDIUM] Extracted duplicate `MoonIcon` to shared component
3. [MEDIUM] Fixed hasChanges reference comparison issue in time-limits page
4. [LOW] Fixed dead CSS code (backgroundColor with gradient)
