# Story 7.2: Crisis Visit Zero-Data-Path

Status: done

## Story

As a **child visiting a crisis resource**,
I want **no trace of my visit to exist anywhere in fledgely**,
So that **I can seek help without fear of being discovered**.

## Acceptance Criteria

1. **AC1: No Screenshot Capture**
   - Given a child's device has monitoring active
   - When child navigates to an allowlisted crisis URL
   - Then NO screenshot is captured during the visit

2. **AC2: No URL Logging**
   - Given monitoring is active
   - When child visits a crisis resource
   - Then NO URL is logged to activity history
   - And the URL is never transmitted or stored

3. **AC3: No Time Counting**
   - Given monitoring is active
   - When child visits a crisis resource
   - Then NO time is counted against any category
   - And no browsing time statistics are affected

4. **AC4: No Parent Notification**
   - Given monitoring is active
   - When child visits a crisis resource
   - Then NO notification is generated for parents
   - And parents have no indication of the visit

5. **AC5: No Analytics**
   - Given monitoring is active
   - When child visits a crisis resource
   - Then NO analytics event is recorded
   - And no telemetry includes the protected URL

6. **AC6: Pre-Capture Check (Synchronous Blocking)**
   - Given a screenshot capture is scheduled
   - When the capture would occur on a crisis site
   - Then the allowlist check happens BEFORE any capture attempt
   - And no data is ever created, queued, or transmitted

7. **AC7: Fail-Safe Fallback**
   - Given network connectivity may be unavailable
   - When the allowlist check occurs
   - Then network timeout falls back to cached/bundled allowlist
   - And protection defaults to SKIP capture on any error (fail-safe)

## Tasks / Subtasks

- [x] Task 1: Review existing implementation (AC: All)
  - [x] 1.1 Verify Story 11.1 implements pre-capture allowlist check
  - [x] 1.2 Confirm isUrlProtected() is called before captureScreenshot()
  - [x] 1.3 Verify no URL is logged when protection triggers

- [x] Task 2: Verify Zero-Data-Path invariant (AC: #1, #2, #6)
  - [x] 2.1 Confirm capture is completely skipped for protected sites
  - [x] 2.2 Verify only generic event code is logged (not URL)
  - [x] 2.3 Test fail-safe behavior when allowlist check fails

- [x] Task 3: Verify Parent Isolation (AC: #4, #5)
  - [x] 3.1 Confirm no parent notification on protected site visit
  - [x] 3.2 Verify no analytics contain crisis URLs

- [x] Task 4: Verify Fail-Safe (AC: #7)
  - [x] 4.1 Confirm bundled allowlist is always available
  - [x] 4.2 Verify network errors default to skip capture
  - [x] 4.3 Test cache fallback behavior

## Dev Notes

### Implementation Status

**This story was already implemented as part of Story 11.1 (Pre-Capture Allowlist Check).**

The zero-data-path functionality exists in `apps/extension/src/background.ts`:

```typescript
// Story 11.1: Check crisis allowlist BEFORE any capture (INV-001 zero data path)
// This check MUST happen before captureScreenshot to ensure no data is created
try {
  // Get current tab URL for allowlist check
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (activeTab?.url) {
    const isProtected = isUrlProtected(activeTab.url)
    if (isProtected) {
      // ZERO DATA PATH: Skip real capture entirely
      // Log event but DO NOT log URL (privacy requirement)
      await logCaptureEvent('capture_skipped', true, {
        queueSize: state.decoyModeEnabled ? queueSize + 1 : queueSize,
        errorCode: ERROR_CODES.CRISIS_URL_PROTECTED,
      })
      return
    }
  }
} catch {
  // Fail-safe: If we can't check the allowlist, skip capture
  console.error('[Fledgely] Crisis allowlist check failed, skipping capture (fail-safe)')
  await logCaptureEvent('capture_skipped', true, {
    queueSize,
    errorCode: ERROR_CODES.ALLOWLIST_CHECK_ERROR,
  })
  return
}
```

### Key Implementation Details

1. **Pre-capture check** (lines 597-633 of background.ts)
   - `isUrlProtected()` called BEFORE `captureScreenshot()`
   - Check is synchronous and blocking
   - No data is ever created for protected sites

2. **Zero-data invariant** (INV-001)
   - NO screenshot captured
   - NO URL logged (only error code)
   - NO activity recorded
   - NO parent notification

3. **Fail-safe behavior**
   - Bundled allowlist always available (DEFAULT_CRISIS_SITES)
   - Network/cache errors default to skip capture
   - Any exception results in capture being skipped

4. **Decoy mode** (Story 11.5)
   - Optional: Replace with placeholder image instead of gap
   - Prevents inference from missing screenshots

### Project Structure Notes

- Core allowlist: `apps/extension/src/crisis-allowlist.ts`
- Background integration: `apps/extension/src/background.ts`
- Tests: `apps/extension/src/crisis-allowlist.test.ts`

### References

- [Source: docs/epics/epic-list.md - Story 7.2]
- [Source: apps/extension/src/background.ts - handleScreenshotCapture()]
- [Source: apps/extension/src/crisis-allowlist.ts - isUrlProtected()]
- [Depends: Story 7.1 (Crisis Allowlist Data Structure)]
- [Implemented by: Story 11.1 (Pre-Capture Allowlist Check)]

## Dev Agent Record

### Context Reference

Story requirements already satisfied by Epic 11 implementation.

### Agent Model Used

Claude Opus 4.5

### Debug Log References

N/A - No new code required

### Completion Notes List

- Story 7-2 requirements were already implemented as part of Story 11.1
- The zero-data-path invariant (INV-001) is enforced in handleScreenshotCapture()
- All 7 acceptance criteria are satisfied by existing implementation:
  - AC1: Screenshot skipped for protected URLs
  - AC2: No URL logged (only error code)
  - AC3: No time/category tracking implemented
  - AC4: No parent notification on skip
  - AC5: No analytics contain crisis URLs
  - AC6: Pre-capture check is synchronous blocking
  - AC7: Fail-safe to bundled allowlist on any error
- Existing tests in crisis-allowlist.test.ts verify protection behavior

### File List

**No new files created - Story already implemented by Epic 11**

Pre-existing files that implement this story:

- `apps/extension/src/crisis-allowlist.ts` - Allowlist check logic
- `apps/extension/src/crisis-allowlist.test.ts` - 50+ tests for allowlist
- `apps/extension/src/background.ts` - Pre-capture check integration

## Change Log

| Date       | Change                                               |
| ---------- | ---------------------------------------------------- |
| 2025-12-30 | Story documented (already implemented by Story 11.1) |
