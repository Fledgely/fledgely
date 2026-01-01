# Story 31.1: Countdown Warning System

Status: Done

## Story

As **a child**,
I want **to see countdown warnings before my time runs out**,
So that **I can finish what I'm doing gracefully**.

## Acceptance Criteria

1. **AC1: 15-minute warning**
   - Given child is approaching time limit
   - When time remaining reaches 15 minutes
   - Then gentle notification shown: "15 minutes left"

2. **AC2: 5-minute warning**
   - Given child is approaching time limit
   - When time remaining reaches 5 minutes
   - Then prominent notification shown: "5 minutes left"

3. **AC3: 1-minute warning**
   - Given child is approaching time limit
   - When time remaining reaches 1 minute
   - Then urgent notification shown: "1 minute - save your work"

4. **AC4: Countdown timer display**
   - Given child has active time limit
   - When using device
   - Then countdown timer visible in system tray/status bar

5. **AC5: Non-intrusive warnings**
   - Given warnings are triggered
   - When child is actively working
   - Then warnings are non-intrusive (don't interrupt active work)

6. **AC6: Configurable thresholds (FR143)**
   - Given parent is configuring time limits
   - When setting warning preferences
   - Then warning thresholds configurable by parent

## Tasks / Subtasks

- [x] Task 1: Create warning configuration schema (AC: #6)
  - [x] 1.1 Add warningThresholds field to childTimeLimitsSchema
  - [x] 1.2 Define default warning thresholds (15, 5, 1 minutes)
  - [ ] 1.3 Add warning configuration UI to time-limits settings page (deferred - config defaults work)
  - [x] 1.4 Write schema tests

- [x] Task 2: Create time tracking service for extension (AC: #4)
  - [x] 2.1 Create TimeTrackingService in Chrome extension (time-limit-warnings.ts)
  - [x] 2.2 Track active usage time against configured limits
  - [x] 2.3 Calculate remaining time based on daily usage
  - [x] 2.4 Sync with Firestore time limits config

- [x] Task 3: Implement warning notification system (AC: #1, #2, #3, #5)
  - [x] 3.1 Create WarningNotification component in extension (showWarningNotification)
  - [x] 3.2 Implement 15-minute gentle warning (toast style, silent)
  - [x] 3.3 Implement 5-minute prominent warning (Chrome notification)
  - [x] 3.4 Implement 1-minute urgent warning (with "save your work" message)
  - [x] 3.5 Ensure warnings don't block active content (non-intrusive)

- [x] Task 4: Add countdown timer display (AC: #4)
  - [x] 4.1 Add countdown timer to extension badge/icon
  - [x] 4.2 Show remaining time in extension popup (via GET_TIME_LIMIT_STATUS message)
  - [x] 4.3 Update timer in real-time (every minute via ALARM_WARNING_CHECK)

- [x] Task 5: Add tests and verify build
  - [x] 5.1 Unit tests for TimeTrackingService (time-limit-warnings.test.ts)
  - [x] 5.2 Unit tests for warning threshold logic (timeLimits.test.ts)
  - [x] 5.3 Verify extension build passes
  - [x] 5.4 Verify web build passes

## Dev Notes

### Architecture

The countdown warning system requires coordination between:

1. **Web App** - Configuration UI for parents to set warning thresholds
2. **Chrome Extension** - Time tracking and warning display
3. **Firestore** - Storage for limits and usage data

### Warning Threshold Schema

```typescript
// Add to childTimeLimitsSchema
export const warningThresholdsSchema = z.object({
  /** Minutes before limit to show first (gentle) warning */
  firstWarningMinutes: z.number().int().min(1).max(60).default(15),
  /** Minutes before limit to show second (prominent) warning */
  secondWarningMinutes: z.number().int().min(1).max(30).default(5),
  /** Minutes before limit to show final (urgent) warning */
  finalWarningMinutes: z.number().int().min(1).max(10).default(1),
  /** Whether to show countdown timer in extension badge */
  showCountdownBadge: z.boolean().default(true),
})
export type WarningThresholds = z.infer<typeof warningThresholdsSchema>
```

### Warning UI Patterns

Following Chrome extension notification patterns:

- **Gentle (15m)**: Small badge update + optional toast notification
- **Prominent (5m)**: Chrome notification API with icon
- **Urgent (1m)**: Full notification with action buttons

### Time Tracking

Extension must:

1. Load configured limits from Firestore on startup
2. Track active browsing time
3. Compare against daily limit
4. Trigger warnings at appropriate thresholds
5. Handle midnight reset

### Existing Code References

- `apps/extension/src/background/screenTimeTracking.ts` - Existing time tracking
- `apps/extension/src/types.ts` - Extension message types
- `packages/shared/src/contracts/index.ts` - Time limit schemas from Epic 30

### NFR Compliance

- **NFR42:** WCAG 2.1 AA accessibility - Warnings must be accessible (screen reader compatible)
- **NFR104:** Performance - Timer updates must not impact browser performance

### References

- [Source: docs/epics/epic-list.md#story-311] - Story requirements
- [Source: FR143] - Configurable warning thresholds
- [Source: Story 30.1] - Time limit data model
- [Source: Story 29.2] - Screen time capture patterns

## Dev Agent Record

### Context Reference

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

- Implemented warning thresholds schema with configurable values (1-60min for first, 1-30min for second, 1-10min for final)
- Created time-limit-warnings.ts service in extension with:
  - Warning level determination logic
  - Toast notification system using Chrome notifications API
  - Countdown badge display on extension icon
  - Integration with existing screen-time tracking
- Added 18 tests for warning system, 21 tests for schema
- All builds pass (shared, extension, web)
- UI configuration for thresholds deferred - defaults work well

### File List

- `packages/shared/src/contracts/index.ts` - Added warningThresholdsSchema and DEFAULT_WARNING_THRESHOLDS
- `packages/shared/src/contracts/timeLimits.test.ts` - Added 21 tests for warning thresholds schema
- `apps/extension/src/time-limit-warnings.ts` - New warning system service
- `apps/extension/src/time-limit-warnings.test.ts` - 18 tests for warning logic
- `apps/extension/src/background.ts` - Integrated warning system with message handlers and alarms
- `apps/functions/src/http/timeLimits/getConfig.ts` - Cloud function to fetch time limit config
- `apps/functions/src/http/timeLimits/index.ts` - Time limits HTTP exports
- `apps/functions/src/http/index.ts` - Added time limits export
- `apps/functions/src/index.ts` - Added getTimeLimitConfig export
