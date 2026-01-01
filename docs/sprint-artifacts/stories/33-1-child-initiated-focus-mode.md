# Story 33.1: Child-Initiated Focus Mode

Status: done
Epic: 33 - Focus Mode & Work Mode
Priority: High

## Story

As **a child**,
I want **to enable focus mode when I need to concentrate**,
So that **I can do deep work without distractions**.

## Acceptance Criteria

1. **AC1: Focus Mode Button**
   - Given child wants to focus
   - When viewing their dashboard
   - Then one-tap "Focus Mode" button is available
   - And button is prominent and easily accessible

2. **AC2: App Blocking During Focus**
   - Given focus mode is active
   - When child uses apps
   - Then social media, games, entertainment are blocked
   - And education, productivity apps are allowed
   - And blocking enforced via Chrome extension

3. **AC3: Duration Options**
   - Given child is starting focus mode
   - When selecting duration
   - Then options include: 25min (pomodoro), 1h, 2h, "Until I turn off"
   - And countdown timer displays remaining time
   - And child can end session early (autonomy)

4. **AC4: Child Control (Autonomy)**
   - Given child has started focus mode
   - When they want to stop
   - Then they can end session at any time
   - And no parent approval required to start/stop
   - And respects child's growing independence

5. **AC5: Parent Transparency**
   - Given child enables focus mode
   - When parent views dashboard
   - Then parent sees: "Emma enabled focus mode"
   - And shows start time and duration
   - And parent cannot disable (transparency, not control)

## Technical Notes

- Focus mode state stored in Firestore per child
- Chrome extension receives focus mode updates via real-time sync
- Extension blocks/allows apps based on focus mode configuration
- Parent dashboard subscribes to child focus mode status
- Default allow/block lists from Story 33.2 configuration

## Dependencies

- Story 32-3: Offline time enforcement (Chrome extension blocking logic)
- Story 33-2: Focus mode app configuration (for allow/block lists)

## Tasks / Subtasks

- [x] Task 1: Create focus mode data model (AC: #1, #2)
  - [x] 1.1 Add FocusMode schema to @fledgely/shared
  - [x] 1.2 Add focus session tracking schema
  - [x] 1.3 Define default allow/block app categories

- [x] Task 2: Create focus mode hook (AC: #1, #3, #4)
  - [x] 2.1 Create `useFocusMode` hook
  - [x] 2.2 Implement start/stop focus mode
  - [x] 2.3 Add duration selection logic
  - [x] 2.4 Add countdown timer logic

- [x] Task 3: Create focus mode UI for child dashboard (AC: #1, #3)
  - [x] 3.1 Create `FocusModeButton` component
  - [x] 3.2 Create `FocusModeModal` for duration selection
  - [x] 3.3 Create `FocusModeActiveCard` showing countdown
  - [x] 3.4 Integrate into child dashboard

- [x] Task 4: Chrome extension integration (AC: #2)
  - [x] 4.1 Add focus mode sync to service worker
  - [x] 4.2 Implement app blocking during focus mode
  - [x] 4.3 Add focus mode indicator to extension UI

- [x] Task 5: Parent transparency view (AC: #5)
  - [x] 5.1 Create `useFocusModeStatus` hook for parent (uses useFocusMode)
  - [x] 5.2 Create `ChildFocusModeCard` for parent dashboard
  - [x] 5.3 Show real-time focus mode status

## Dev Agent Record

### File List

- `packages/shared/src/contracts/index.ts` - Focus mode schemas and constants
- `packages/shared/src/index.ts` - Focus mode exports
- `packages/shared/src/contracts/focusMode.test.ts` - 27 schema tests
- `apps/web/src/hooks/useFocusMode.ts` - Focus mode hook
- `apps/web/src/hooks/useFocusMode.test.ts` - 15 hook tests
- `apps/web/src/components/child/FocusModeButton.tsx` - Focus button component
- `apps/web/src/components/child/FocusModeButton.test.tsx` - 8 button tests
- `apps/web/src/components/child/FocusModeModal.tsx` - Duration selection modal
- `apps/web/src/components/child/FocusModeModal.test.tsx` - 12 modal tests
- `apps/web/src/components/child/FocusModeActiveCard.tsx` - Active session card
- `apps/web/src/components/child/FocusModeActiveCard.test.tsx` - 15 card tests
- `apps/web/src/components/parent/ChildFocusModeCard.tsx` - Parent transparency view
- `apps/web/src/components/parent/ChildFocusModeCard.test.tsx` - 12 parent view tests
- `apps/web/src/app/child/dashboard/page.tsx` - Dashboard integration
- `apps/extension/src/focus-mode.ts` - Extension focus mode module
- `apps/extension/src/content-scripts/focus-mode-block.ts` - Blocking content script
- `apps/functions/src/http/focus/index.ts` - getFocusModeState Cloud Function
- `apps/functions/src/index.ts` - Function export

### Change Log

- 2025-12-31: Implemented Story 33-1 with 89 passing tests (27 schema + 62 component/hook)
