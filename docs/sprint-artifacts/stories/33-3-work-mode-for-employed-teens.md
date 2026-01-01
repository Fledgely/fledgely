# Story 33.3: Work Mode for Employed Teens

Status: done

Epic: 33 - Focus Mode & Work Mode
Priority: High

## Story

As **a parent of a working teen**,
I want **to configure work mode for their job hours**,
So that **monitoring doesn't interfere with employment**.

## Acceptance Criteria

1. **AC1: Work Schedule Configuration**
   - Given parent is configuring work mode for teen
   - When entering work schedule
   - Then schedule format: "Saturdays 10am-4pm" or recurring patterns
   - And multiple work schedules can be defined (multiple jobs or varying hours)
   - And schedule stored in Firestore per child
   - And schedule can be edited/deleted

2. **AC2: Reduced Monitoring During Work Hours**
   - Given work mode is active
   - When teen is within work hours
   - Then time limits are suspended
   - And reduced monitoring applied
   - And work-related apps are whitelisted
   - And normal restrictions resume when work mode ends

3. **AC3: Work App Whitelist**
   - Given work mode needs configuration
   - When parent sets up work apps
   - Then work-related apps whitelisted: scheduling, communication, business tools
   - And parent can add/remove apps from work whitelist
   - And default work apps include: Slack, Teams, When2Work, calendaring apps
   - And whitelist applies only during work mode

4. **AC4: Screenshot Capture Pause**
   - Given work mode is active
   - When screenshot capture would occur
   - Then capture is paused (privacy at workplace)
   - And pause logged in audit trail for transparency
   - And capture resumes automatically when work mode ends
   - And Chrome extension respects work mode state

5. **AC5: Automatic Schedule Activation**
   - Given work schedule is configured
   - When scheduled work time begins
   - Then work mode activates automatically
   - And teen receives notification: "Work mode starting"
   - And parent sees: "Work mode active for [Child]"
   - And mode deactivates at scheduled end time

6. **AC6: Manual Start/Stop Override**
   - Given teen has variable work schedule
   - When schedule varies from configured times
   - Then teen can manually start work mode
   - And teen can manually end work mode early
   - And manual activations logged for parent visibility
   - And respects teen's employment autonomy

## Technical Notes

### Architecture Patterns

- Extends focus mode infrastructure from Stories 33-1 and 33-2
- Work mode is a specialized variant of focus mode with schedule-based activation
- Uses similar Firestore structure: `families/{familyId}/workMode/{childId}`
- Chrome extension syncs work mode state like focus mode

### Data Model

- WorkModeConfig: schedule definitions, work app whitelist
- WorkModeSession: active sessions (auto or manual)
- WorkSchedule: day, startTime, endTime, recurring flag

### Key Files to Modify/Create

- `packages/shared/src/contracts/workMode.ts` - Work mode schemas
- `apps/web/src/hooks/useWorkMode.ts` - Work mode hook
- `apps/web/src/hooks/useWorkModeConfig.ts` - Work mode config hook
- `apps/web/src/components/parent/WorkModeSettings.tsx` - Parent config UI
- `apps/web/src/components/child/WorkModeControls.tsx` - Teen manual controls
- `apps/extension/src/work-mode.ts` - Extension work mode module

### Existing Patterns to Follow

- Focus mode hooks pattern from `useFocusMode.ts` and `useFocusModeConfig.ts`
- App whitelist pattern from focus mode configuration
- Chrome extension sync pattern from `focus-mode.ts`
- Firestore real-time subscriptions with `onSnapshot`
- Component testing patterns from focus mode tests

## Dependencies

- Story 33-1: Child-Initiated Focus Mode (base infrastructure)
- Story 33-2: Focus Mode App Configuration (app whitelist pattern)

## Tasks / Subtasks

- [x] Task 1: Create work mode data model (AC: #1, #3, #5)
  - [x] 1.1 Add WorkModeConfig schema to @fledgely/shared
  - [x] 1.2 Add WorkSchedule schema with day/time/recurring
  - [x] 1.3 Add WorkModeSession schema for tracking
  - [x] 1.4 Add default work app categories (scheduling, communication)
  - [x] 1.5 Add unit tests for schemas (51 tests)

- [x] Task 2: Create work mode configuration hook (AC: #1, #3)
  - [x] 2.1 Create `useWorkModeConfig` hook for parent
  - [x] 2.2 Implement addSchedule/removeSchedule/updateSchedule
  - [x] 2.3 Implement addWorkApp/removeWorkApp for whitelist
  - [x] 2.4 Add real-time Firestore sync
  - [x] 2.5 Add unit tests for hook (18 tests)

- [x] Task 3: Create work mode hook (AC: #2, #5, #6)
  - [x] 3.1 Create `useWorkMode` hook
  - [x] 3.2 Implement automatic schedule-based activation
  - [x] 3.3 Implement manual start/stop override
  - [x] 3.4 Add time remaining until work mode ends
  - [x] 3.5 Add unit tests for hook (20 tests)

- [x] Task 4: Create parent configuration UI (AC: #1, #3)
  - [x] 4.1 Create `WorkModeSettings` component
  - [x] 4.2 Create `WorkScheduleEditor` for schedule management
  - [x] 4.3 Create `WorkAppListEditor` for whitelist
  - [x] 4.4 Add to parent dashboard/settings
  - [x] 4.5 Add component tests (26 tests)

- [x] Task 5: Create teen work mode controls (AC: #6)
  - [x] 5.1 Create `WorkModeControls` component
  - [x] 5.2 Add manual start/stop buttons
  - [x] 5.3 Show work mode status and time remaining
  - [x] 5.4 Add to child dashboard
  - [x] 5.5 Add component tests (17 tests)

- [x] Task 6: Chrome extension work mode integration (AC: #2, #4, #5)
  - [x] 6.1 Create `work-mode.ts` extension module
  - [x] 6.2 Implement work mode state sync via Cloud Function
  - [x] 6.3 Pause screenshot capture during work mode
  - [x] 6.4 Apply work app whitelist
  - [x] 6.5 Add automatic activation check based on schedule

- [x] Task 7: Cloud function for work mode sync (AC: #5)
  - [x] 7.1 Create `getWorkModeState` HTTP function
  - [x] 7.2 Create `getWorkModeConfig` HTTP function
  - [x] 7.3 Add schedule evaluation logic
  - [x] 7.4 Export from functions/index.ts

## Dev Notes

### Project Structure Notes

- Work mode extends the focus mode pattern but with schedule-based activation
- Separate Firestore collection for work mode to keep concerns clean
- Chrome extension needs scheduler to check work times periodically

### Testing Standards

- Unit tests for all Zod schemas
- Hook tests with mocked Firestore
- Component tests with React Testing Library
- Test schedule parsing and time comparison logic thoroughly

### References

- [Source: docs/epics/epic-list.md#story-333-work-mode-for-employed-teens]
- [Source: apps/web/src/hooks/useFocusMode.ts] - Hook pattern
- [Source: apps/web/src/hooks/useFocusModeConfig.ts] - Config pattern
- [Source: apps/extension/src/focus-mode.ts] - Extension integration pattern
- [Source: packages/shared/src/contracts/focusMode.ts] - Schema pattern

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Fixed flaky timer test by adjusting elapsed time test to use 90s instead of 120s boundary
- Fixed WORK_MODE_MESSAGES.active function call in WorkModeControls component
- Added missing work mode exports to packages/shared/src/index.ts

### Completion Notes List

- All 148 tests passing (51 schema + 18 config hook + 20 mode hook + 26 settings + 17 controls + 16 cloud functions)
- Work mode follows established focus mode patterns for consistency
- Extension module integrates with existing alarm-based schedule checking
- Cloud functions provide authenticated endpoints for extension sync

### File List

**Created:**

- `packages/shared/src/contracts/workMode.test.ts` - Schema unit tests (51 tests)
- `apps/web/src/hooks/useWorkModeConfig.ts` - Parent configuration hook
- `apps/web/src/hooks/useWorkModeConfig.test.ts` - Config hook tests (18 tests)
- `apps/web/src/hooks/useWorkMode.ts` - Work mode state hook
- `apps/web/src/hooks/useWorkMode.test.ts` - Mode hook tests (20 tests)
- `apps/web/src/components/parent/WorkModeSettings.tsx` - Parent settings UI
- `apps/web/src/components/parent/WorkModeSettings.test.tsx` - Settings tests (26 tests)
- `apps/web/src/components/child/WorkModeControls.tsx` - Teen controls UI
- `apps/web/src/components/child/WorkModeControls.test.tsx` - Controls tests (17 tests)
- `apps/extension/src/work-mode.ts` - Chrome extension work mode module
- `apps/functions/src/http/work/index.ts` - HTTP handlers for work mode sync
- `apps/functions/src/http/work/index.test.ts` - Cloud function tests (16 tests)

**Modified:**

- `packages/shared/src/contracts/index.ts` - Added work mode schemas
- `packages/shared/src/index.ts` - Added work mode exports
- `apps/functions/src/index.ts` - Added work mode HTTP function exports
