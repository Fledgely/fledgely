# Story 10.6: Capture Event Logging

Status: Done

## Story

As **the system**,
I want **all capture events logged locally**,
So that **debugging and audit are possible**.

## Acceptance Criteria

1. **AC1: Local Event Logging**
   - Given any capture-related event occurs
   - When event is processed
   - Then event is logged to local storage with timestamp

2. **AC2: Event Metadata**
   - Given an event is logged
   - When log entry is created
   - Then log includes: event type, success/failure, duration, queue size

3. **AC3: Privacy Protection**
   - Given event logging is active
   - When events are logged
   - Then logs do NOT include screenshot content or URLs (privacy)

4. **AC4: Log Rotation**
   - Given logs are being stored
   - When storage space is needed
   - Then logs rotate automatically (keep last 7 days)

5. **AC5: Debug Panel Access**
   - Given logs exist
   - When parent accesses extension debug panel
   - Then logs are accessible via extension debug panel (parent only)

6. **AC6: Error Badge Warning**
   - Given a critical error occurs
   - When error is logged
   - Then critical errors trigger extension icon badge warning

## Tasks / Subtasks

- [x] Task 1: Event Logger Module (AC: #1, #2, #3)
  - [x] 1.1 Create event-logger.ts module
  - [x] 1.2 Define CaptureEvent interface with eventType, success, duration, queueSize, timestamp
  - [x] 1.3 Implement logCaptureEvent function that stores to chrome.storage.local
  - [x] 1.4 Ensure NO URLs, screenshot data, or PII in logs

- [x] Task 2: Log Rotation (AC: #4)
  - [x] 2.1 Add LOG_RETENTION_DAYS=7 constant
  - [x] 2.2 Implement pruneOldLogs function
  - [x] 2.3 Call pruneOldLogs before adding new events

- [x] Task 3: Integrate with Capture Flow (AC: #1)
  - [x] 3.1 Log events in handleScreenshotCapture (success, skipped, failed)
  - [x] 3.2 Log events in processScreenshotQueue (upload success/fail)
  - [x] 3.3 Log idle state changes

- [x] Task 4: Error Badge (AC: #6)
  - [x] 4.1 Define CRITICAL_ERROR_TYPES (upload failures, capture errors)
  - [x] 4.2 Implement setErrorBadge function
  - [x] 4.3 Clear error badge after X successful operations or manual clear

- [x] Task 5: Debug Panel Access (AC: #5)
  - [x] 5.1 Add GET_CAPTURE_LOGS message handler
  - [x] 5.2 Return filtered/formatted logs to popup
  - [x] 5.3 Add CLEAR_CAPTURE_LOGS message handler

## Dev Notes

### Implementation Strategy

Create a dedicated event logging module that writes capture events to chrome.storage.local.
Events are logged as an array with automatic rotation to keep last 7 days of data.

### Key Requirements

- **NFR70:** Chrome MV3 compliance
- **FR27:** Screenshot capture audit trail

### Technical Details

CaptureEvent interface:

```typescript
interface CaptureEvent {
  id: string // Unique event ID
  timestamp: number // When event occurred
  eventType:
    | 'capture_success'
    | 'capture_skipped'
    | 'capture_failed'
    | 'upload_success'
    | 'upload_failed'
    | 'idle_pause'
    | 'idle_resume'
    | 'queue_overflow'
    | 'retry_exhausted'
  success: boolean // Overall success/failure
  duration?: number // How long operation took (ms)
  queueSize?: number // Queue size at time of event
  errorCode?: string // Error code if failed (NO error messages with URLs!)
}
```

Log storage structure:

```typescript
// Stored in chrome.storage.local under 'captureEventLog'
interface EventLog {
  events: CaptureEvent[]
  lastPruned: number // When logs were last cleaned
}
```

Log rotation:

- Prune events older than 7 days on each new event add
- Also prune on startup and when logs are requested
- Maximum 1000 events to prevent storage bloat

Error badge:

- Show red "!" badge on critical errors (consecutive upload failures, capture blocked)
- Clear badge after 5 consecutive successful operations
- Badge color: #ef4444 (red)

Privacy rules (CRITICAL):

- NEVER log URLs - not even sanitized
- NEVER log screenshot data
- NEVER log tab titles
- Only log: timestamps, event types, durations, queue sizes, error codes

### References

- [Source: docs/epics/epic-list.md - Story 10.6]
- [Story 10.1: Screenshot Capture Mechanism]
- [Story 10.4: Screenshot Upload to API]
- [Story 10.5: Capture Pause During Inactivity]

## Dev Agent Record

### Context Reference

Story 10.5 completed - idle detection logging in place

### Agent Model Used

Claude Opus 4.5

### Debug Log References

### Completion Notes List

1. **event-logger.ts Module** - New module with complete event logging infrastructure
2. **CaptureEvent Interface** - Full type definition with all required fields
3. **logCaptureEvent()** - Core logging function with automatic storage
4. **pruneOldEvents()** - Log rotation with 7-day retention (LOG_RETENTION_DAYS)
5. **MAX_LOG_EVENTS=1000** - Prevents storage bloat
6. **ERROR_CODES** - Safe error codes (no URLs/PII)
7. **getCaptureEvents()** - Returns events in reverse chronological order
8. **clearCaptureEvents()** - Clears all events
9. **getEventStats()** - Statistics for debug panel
10. **hasConsecutiveCriticalErrors()** - For error badge detection
11. **countConsecutiveSuccesses()** - For error badge clearing
12. **setErrorBadge()** - Shows red "!" badge on critical errors
13. **updateErrorBadge()** - Manages badge state based on events
14. **CONSECUTIVE_ERRORS_THRESHOLD=3** - Errors needed to show badge
15. **CONSECUTIVE_SUCCESSES_TO_CLEAR=5** - Successes to clear badge
16. **GET_CAPTURE_LOGS Handler** - Message handler for popup access
17. **CLEAR_CAPTURE_LOGS Handler** - Message handler to clear logs
18. **GET_CAPTURE_STATS Handler** - Message handler for statistics

### File List

- `apps/extension/src/event-logger.ts` - New event logging module
- `apps/extension/src/background.ts` - Integrated event logging throughout

### Senior Developer Review

**Reviewed: 2025-12-29**

**Issues Found:** 1 High, 3 Medium, 2 Low

**All Issues Fixed:**

1. **[HIGH] AC5 Parent-only access not enforced** - FIXED
   - Added isAuthenticated check to GET_CAPTURE_LOGS, CLEAR_CAPTURE_LOGS, GET_CAPTURE_STATS handlers
   - Returns error if not authenticated

2. **[MEDIUM] hasConsecutiveCriticalErrors() logic issue** - FIXED
   - Now only considers capture/upload success events for resetting counter
   - Ignores idle_pause, idle_resume, capture_skipped events

3. **[MEDIUM] Missing error handling in storage operations** - FIXED
   - Added try/catch to getEventLog() and saveEventLog()
   - Gracefully handles storage unavailable errors

4. **[LOW] Deprecated substr() usage** - FIXED
   - Changed to substring() in generateEventId()

5. **[LOW] Missing JSDoc for exported functions** - FIXED
   - Added @param and @returns documentation

**Verdict:** APPROVED - All code review findings addressed.
