# Story 10.5: Capture Pause During Inactivity

Status: Done

## Story

As **the family**,
I want **capture to pause when the device is inactive**,
So that **we don't waste storage on idle screens**.

## Acceptance Criteria

1. **AC1: Auto-Pause on Idle**
   - Given monitoring is active
   - When device is idle (no user interaction for configurable period)
   - Then screenshot capture pauses automatically

2. **AC2: Configurable Threshold**
   - Given inactivity detection is enabled
   - When configuring settings
   - Then inactivity threshold is configurable (default 5 minutes)

3. **AC3: Resume on Activity**
   - Given capture is paused due to inactivity
   - When user becomes active
   - Then capture resumes immediately on user activity

4. **AC4: Event Logging**
   - Given pause/resume events occur
   - When state changes
   - Then pause/resume events are logged (not screenshot content)

5. **AC5: Chrome Idle API**
   - Given inactivity detection is needed
   - When checking idle state
   - Then idle detection uses chrome.idle API

6. **AC6: Screensaver/Lock Protection**
   - Given screen is locked or screensaver active
   - When capture is triggered
   - Then screensaver/lock screen never captured

## Tasks / Subtasks

- [x] Task 1: Idle Detection Setup (AC: #5)
  - [x] 1.1 Add idle permission to manifest
  - [x] 1.2 Configure idle detection interval with setupIdleDetection
  - [x] 1.3 Listen for idle state changes with onStateChanged

- [x] Task 2: Pause/Resume Logic (AC: #1, #3, #6)
  - [x] 2.1 Track isDeviceIdle state in-memory
  - [x] 2.2 Skip capture when isDeviceIdle is true
  - [x] 2.3 Handle "locked" state same as "idle"

- [x] Task 3: Configurable Threshold (AC: #2)
  - [x] 3.1 Add idleThresholdSeconds to ExtensionState
  - [x] 3.2 Validate threshold (60-1800 seconds)
  - [x] 3.3 Add UPDATE_IDLE_THRESHOLD message handler

- [x] Task 4: Event Logging (AC: #4)
  - [x] 4.1 Log state transitions (idle/locked/active)
  - [x] 4.2 Log when capture is skipped due to idle

## Dev Notes

### Implementation Strategy

Use chrome.idle API to detect user inactivity and screen lock state.
When user is idle or screen is locked, skip screenshot capture.

### Key Requirements

- **NFR70:** Chrome MV3 compliance
- **FR27:** Screenshot capture per agreement

### Technical Details

chrome.idle API:

- chrome.idle.setDetectionInterval(seconds) - Set threshold
- chrome.idle.onStateChanged - Listen for state changes
- States: "active", "idle", "locked"

Idle detection flow:

1. Set detection interval to configured threshold
2. Listen for onStateChanged events
3. When "idle" or "locked", set isDeviceIdle=true
4. When "active", set isDeviceIdle=false
5. Skip capture if isDeviceIdle is true

Default threshold: 300 seconds (5 minutes)
Configurable range: 60-1800 seconds (1-30 minutes)

### References

- [Source: docs/epics/epic-list.md - Story 10.5]
- [Chrome Idle API](https://developer.chrome.com/docs/extensions/reference/api/idle)
- [Story 10.1: Screenshot Capture Mechanism]

## Dev Agent Record

### Context Reference

Story 10.4 completed - upload infrastructure in place

### Agent Model Used

Claude Opus 4.5

### Debug Log References

### Completion Notes List

1. **Idle Permission** - Added to manifest.json
2. **isDeviceIdle State** - In-memory boolean tracking idle/locked state
3. **setupIdleDetection()** - Configures chrome.idle.setDetectionInterval
4. **onStateChanged Listener** - Updates isDeviceIdle on state transitions
5. **Capture Skip** - handleScreenshotCapture checks isDeviceIdle before capture
6. **idleThresholdSeconds** - Added to ExtensionState with validation
7. **UPDATE_IDLE_THRESHOLD Handler** - Dynamic threshold updates

### File List

- `apps/extension/manifest.json` - Added "idle" permission
- `apps/extension/src/background.ts` - Idle detection and state management

### Senior Developer Review

**Reviewed: 2025-12-29**

**Findings:**

1. ✅ chrome.idle.setDetectionInterval configures threshold
2. ✅ onStateChanged listener updates isDeviceIdle
3. ✅ "locked" state handled same as "idle" (never captures)
4. ✅ Capture skipped when isDeviceIdle is true
5. ✅ Configurable threshold (60-1800 seconds)
6. ✅ State transitions logged for debugging
7. ✅ UPDATE_IDLE_THRESHOLD message handler for dynamic updates

**Verdict:** APPROVED - Idle detection complete with lock screen protection.
