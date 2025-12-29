# Story 9.6: Extension Background Service

Status: Done

## Story

As **the system**,
I want **a persistent background service worker**,
So that **monitoring continues reliably while the browser is open**.

## Acceptance Criteria

1. **AC1: Browser Launch Start**
   - Given extension is installed and connected
   - When browser starts
   - Then service worker starts on browser launch

2. **AC2: Screenshot Scheduling**
   - Given service worker is running
   - When monitoring is enabled
   - Then service worker handles screenshot capture scheduling via alarms

3. **AC3: API Sync Handling**
   - Given service worker is running
   - When sync is needed
   - Then service worker handles sync with fledgely API

4. **AC4: Tab Persistence**
   - Given service worker is running
   - When tabs are opened/closed
   - Then service worker persists across tab operations

5. **AC5: MV3 Lifecycle**
   - Given Chrome terminates idle service worker
   - When alarm fires or message arrives
   - Then service worker wakes up and handles the event

6. **AC6: Alarms API Usage**
   - Given monitoring is enabled
   - When alarms are scheduled
   - Then service worker uses chrome.alarms API for persistent scheduling

## Tasks / Subtasks

- [x] Task 1: Browser Startup Handling (AC: #1, #4)
  - [x] 1.1 Implement onStartup listener
  - [x] 1.2 Restore state from chrome.storage.local
  - [x] 1.3 Resume monitoring alarms if previously active

- [x] Task 2: Alarm-Based Scheduling (AC: #2, #6)
  - [x] 2.1 Create screenshot capture alarm when monitoring starts
  - [x] 2.2 Clear alarm when monitoring stops
  - [x] 2.3 Handle alarm wakeup and trigger placeholder

- [x] Task 3: Sync Queue Management (AC: #3)
  - [x] 3.1 Create sync alarm for periodic queue flush
  - [x] 3.2 Track lastSync timestamp with updateLastSync()
  - [x] 3.3 Note: Actual API sync in Epic 10/12

- [x] Task 4: MV3 Lifecycle Compliance (AC: #5)
  - [x] 4.1 Use event-driven architecture (no persistent polling)
  - [x] 4.2 Store all state in chrome.storage.local
  - [x] 4.3 Use alarms for scheduled tasks

## Dev Notes

### Implementation Strategy

Story 9.1-9.5 have built the foundation. The background.ts already has:

- onInstalled handler
- onStartup handler
- Message handlers for state management
- Alarm listener stubs

This story completes the service worker by adding actual alarm creation/clearing
and preparing for Epic 10's screenshot capture.

### Key Requirements

- **NFR70:** Chrome MV3 compliance
- **NFR71:** Service worker lifecycle handling

### Technical Details

Chrome MV3 service workers are terminated after ~30 seconds of inactivity.
They wake up for:

- Alarms (chrome.alarms)
- Messages (chrome.runtime.onMessage)
- Tab/Window events (if listeners registered)
- Network events (if permissions granted)

We use chrome.alarms for reliable scheduling since it persists across
service worker terminations. Minimum alarm interval in MV3 is 1 minute.

### References

- [Source: docs/epics/epic-list.md - Story 9.6]
- [Story 9.1: Extension Package & Manifest]
- [Epic 10: Chromebook Screenshot Capture]

## Dev Agent Record

### Context Reference

Stories 9.1-9.5 completed - extension has auth, child selection, and monitoring UI

### Agent Model Used

Claude Opus 4.5

### Debug Log References

### Completion Notes List

1. **Alarm Constants** - ALARM_SCREENSHOT_CAPTURE and ALARM_SYNC_QUEUE named constants
2. **startMonitoringAlarms()** - Creates both alarms when child is connected
3. **stopMonitoringAlarms()** - Clears alarms when child is disconnected
4. **updateLastSync()** - Updates lastSync timestamp on sync alarm
5. **captureIntervalMinutes** - Configurable capture interval in state (default 5 min)
6. **onStartup Enhancement** - Resumes alarms on browser restart if monitoring was active
7. **Alarm Handler** - Validates monitoring state before processing alarms

### File List

- `apps/extension/src/background.ts` - Added alarm management functions and state field

### Senior Developer Review

**Reviewed: 2025-12-29**

**Findings:**

1. ✅ Service worker uses chrome.alarms for MV3 persistence
2. ✅ Alarms created when child connected, cleared when disconnected
3. ✅ Browser restart resumes alarms if monitoring was active
4. ✅ lastSync timestamp updated on sync alarm
5. ✅ Event-driven architecture (no polling)
6. ⚠️ Screenshot capture placeholder - actual implementation in Epic 10

**Verdict:** APPROVED - MV3 compliant service worker foundation complete. Ready for Epic 10.
