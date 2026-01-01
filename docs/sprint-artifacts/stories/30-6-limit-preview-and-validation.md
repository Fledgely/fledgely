# Story 30.6: Limit Preview and Validation

Status: Done

## Story

As **a parent**,
I want **to preview how limits will work**,
So that **I understand the rules before activating**.

## Acceptance Criteria

1. **AC1: Summary display**
   - Given parent has configured limits
   - When reviewing before save
   - Then summary shown: "Emma's limits: 2h total, 1h gaming, unlimited education"

2. **AC2: Conflict detection**
   - Given parent has configured limits
   - When category limit exceeds daily total
   - Then warning shown: "Warning: Gaming limit exceeds daily total"

3. **AC3: Scenario preview**
   - Given limits are configured
   - When viewing preview
   - Then scenario shown: "If Emma uses 1h gaming, she has 1h left for other apps"

4. **AC4: Child preview**
   - Given limits are configured
   - When reviewing settings
   - Then shown: "This is what Emma will see"

5. **AC5: Validation**
   - Given configuration being saved
   - When validation runs
   - Then prevents impossible configurations

6. **AC6: Save and notify**
   - Given valid configuration
   - When saving
   - Then "Save and notify child" button to activate

## Tasks / Subtasks

- [x] Task 1: Add conflict detection (AC: #2, #5)
  - [x] 1.1 Detect when category limits exceed daily total
  - [x] 1.2 Display warning messages for conflicts
  - [x] 1.3 Detect when device limits exceed daily total

- [x] Task 2: Enhance summary preview (AC: #1, #3)
  - [x] 2.1 Create combined limits summary section
  - [x] 2.2 Add scenario-based preview showing remaining time

- [x] Task 3: Update save button (AC: #6)
  - [x] 3.1 Change button text to "Save and Notify Child"

- [x] Task 4: Build and test
  - [x] 4.1 Verify build passes
  - [x] 4.2 Run existing tests

## Dev Notes

### MVP Scope

For MVP, focus on:

- Conflict detection for category vs daily total
- Warning display for detected conflicts
- Scenario-based preview
- Updated button text

Child preview (AC4) is deferred as it requires separate child-facing UI.

### Conflict Types

1. Category limit > daily total (warning)
2. Sum of all category limits > daily total (info)
3. Device limit > daily total (warning)

### References

- [Source: docs/epics/epic-list.md] - Story requirements
- [Source: Story 30.2] - Preview box patterns

## Dev Agent Record

### Context Reference

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

### File List

- `apps/web/src/app/dashboard/settings/time-limits/page.tsx` - Added conflict detection, combined summary section, scenario preview, and updated save button text
