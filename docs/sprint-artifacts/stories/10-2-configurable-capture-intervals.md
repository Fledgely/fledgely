# Story 10.2: Configurable Capture Intervals

Status: Done

## Story

As a **family**,
I want **screenshot capture to follow our agreed interval**,
So that **monitoring matches what we consented to**.

## Acceptance Criteria

1. **AC1: Interval from Agreement**
   - Given family agreement specifies capture interval
   - When extension syncs agreement settings
   - Then capture interval is set per agreement (e.g., every 5 minutes)

2. **AC2: Interval Range**
   - Given capture interval is configured
   - When setting interval value
   - Then interval can range from 1 minute to 30 minutes

3. **AC3: Dynamic Updates**
   - Given capture interval is changed
   - When interval changes take effect
   - Then changes take effect within 60 seconds of agreement update

4. **AC4: Consistent Timing**
   - Given capture interval is configured
   - When browser is in use
   - Then interval is consistent regardless of browsing activity

5. **AC5: Alarm API Usage**
   - Given capture needs scheduling
   - When scheduling captures
   - Then interval uses chrome.alarms API for reliable scheduling

6. **AC6: No Retroactive Capture**
   - Given browser was closed
   - When browser restarts
   - Then missed captures (browser closed) are not retroactively captured

## Tasks / Subtasks

- [x] Task 1: Interval Configuration (AC: #1, #2)
  - [x] 1.1 Add captureIntervalMinutes to ExtensionState (already done in 9.6)
  - [x] 1.2 Validate interval range (1-30 minutes)
  - [x] 1.3 Apply MIN_CAPTURE_INTERVAL and MAX_CAPTURE_INTERVAL constants

- [x] Task 2: Dynamic Interval Updates (AC: #3, #5)
  - [x] 2.1 Add UPDATE_CAPTURE_INTERVAL message handler
  - [x] 2.2 Clear and recreate alarm with new interval
  - [x] 2.3 Ensure change takes effect within 60 seconds

- [x] Task 3: Verify Consistent Timing (AC: #4, #6)
  - [x] 3.1 Confirm alarm fires regardless of browsing activity
  - [x] 3.2 Document that missed captures are not retroactive (MV3 behavior)

## Dev Notes

### Implementation Strategy

The foundation for configurable intervals is already in place from Story 9.6:

- captureIntervalMinutes is in ExtensionState
- startMonitoringAlarms accepts interval parameter
- Alarm is created with periodInMinutes

This story adds:

1. Interval validation (1-30 minutes)
2. Dynamic interval update handling
3. Message handler for interval changes

### Key Requirements

- **NFR70:** Chrome MV3 compliance
- **FR27:** Screenshot capture per agreement terms

### Technical Details

chrome.alarms API constraints:

- Minimum interval is 1 minute for repeating alarms in MV3
- Alarms persist across service worker terminations
- Alarms do NOT fire when browser is closed (no retroactive captures)

Interval update flow:

1. Popup/settings sends UPDATE_CAPTURE_INTERVAL message
2. Background validates interval (1-30 minutes)
3. Background clears existing alarm
4. Background creates new alarm with updated interval
5. State is persisted to chrome.storage.local

### References

- [Source: docs/epics/epic-list.md - Story 10.2]
- [Chrome Alarms API](https://developer.chrome.com/docs/extensions/reference/api/alarms)
- [Story 9.6: Extension Background Service]

## Dev Agent Record

### Context Reference

Story 10.1 completed - extension captures screenshots on alarm

### Agent Model Used

Claude Opus 4.5

### Debug Log References

### Completion Notes List

1. **Interval Constants** - MIN_CAPTURE_INTERVAL_MINUTES=1, MAX_CAPTURE_INTERVAL_MINUTES=30
2. **validateCaptureInterval()** - Clamps interval to valid range
3. **UPDATE_CAPTURE_INTERVAL Handler** - Message handler for dynamic interval updates
4. **Alarm Recreation** - Clears and recreates alarm with new interval when updated
5. **No Retroactive Captures** - MV3 alarms don't fire when browser is closed (by design)

### File List

- `apps/extension/src/background.ts` - Added interval validation and UPDATE_CAPTURE_INTERVAL handler

### Senior Developer Review

**Reviewed: 2025-12-29**

**Findings:**

1. ✅ Interval range enforced (1-30 minutes)
2. ✅ validateCaptureInterval clamps out-of-range values
3. ✅ UPDATE_CAPTURE_INTERVAL handler restarts alarm with new interval
4. ✅ Changes take effect immediately (alarm cleared and recreated)
5. ✅ chrome.alarms API provides consistent timing regardless of browsing
6. ✅ No retroactive capture by design (MV3 alarms don't fire when browser closed)

**Verdict:** APPROVED - Configurable capture intervals fully implemented.
