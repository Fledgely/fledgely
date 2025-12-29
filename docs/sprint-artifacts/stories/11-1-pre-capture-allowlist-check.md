# Story 11.1: Pre-Capture Allowlist Check

Status: Done

## Story

As **the extension**,
I want **to check the crisis allowlist BEFORE any capture occurs**,
So that **crisis resources are NEVER captured (INV-001 invariant)**.

## Acceptance Criteria

1. **AC1: Pre-Capture URL Check**
   - Given a screenshot capture is scheduled
   - When capture timer fires
   - Then current URL is checked against crisis allowlist FIRST

2. **AC2: Synchronous Blocking Check**
   - Given allowlist check is in progress
   - When check is executing
   - Then check is synchronous/blocking - capture waits for result

3. **AC3: Zero Data Path**
   - Given URL matches crisis allowlist
   - When capture would occur
   - Then capture is SKIPPED entirely
   - And no screenshot data is created, queued, or transmitted
   - And no URL or metadata about the skipped site is logged

4. **AC4: Performance Requirement**
   - Given allowlist check is performed
   - When checking URL
   - Then check completes in <10ms to not delay capture timing

5. **AC5: Non-Matching URLs**
   - Given URL does NOT match crisis allowlist
   - When check completes
   - Then normal screenshot capture proceeds

6. **AC6: Graceful Failure**
   - Given allowlist check fails (corrupted cache, etc.)
   - When failure occurs
   - Then capture is SKIPPED as fail-safe (privacy first)
   - And error is logged for debugging (no URL in log)

## Tasks / Subtasks

- [x] Task 1: Allowlist Checker Module (AC: #1, #2, #4)
  - [x] 1.1 Create crisis-allowlist.ts module
  - [x] 1.2 Define CrisisAllowlist interface
  - [x] 1.3 Implement isUrlProtected function with synchronous check
  - [x] 1.4 Ensure <10ms check time with benchmarking

- [x] Task 2: Integrate with Capture Flow (AC: #1, #3, #5)
  - [x] 2.1 Add allowlist check at start of handleScreenshotCapture
  - [x] 2.2 Skip capture entirely for protected URLs
  - [x] 2.3 Log 'capture_skipped_protected' event (no URL)

- [x] Task 3: Fail-Safe Behavior (AC: #6)
  - [x] 3.1 Handle allowlist check errors gracefully
  - [x] 3.2 Default to skip on any error (privacy-first)
  - [x] 3.3 Log 'allowlist_check_error' with safe error code

- [x] Task 4: Default Crisis Allowlist (AC: #3)
  - [x] 4.1 Create bundled default allowlist with common crisis resources
  - [x] 4.2 Include RAINN, National Suicide Prevention, Crisis Text Line, etc.
  - [x] 4.3 Store in extension assets for offline availability

## Dev Notes

### Implementation Strategy

The pre-capture allowlist check is the FIRST thing that happens when a capture is scheduled.
It must be synchronous and blocking to ensure the zero data path invariant (INV-001).

The check happens BEFORE:

- Tab URL is read
- Screenshot is captured
- Any metadata is created
- Any data is queued

### Key Requirements

- **INV-001:** Zero data path for crisis resources - NEVER capture crisis sites
- **NFR28:** Crisis protection performance
- **FR34:** Crisis allowlist enforcement
- **FR64:** Zero data collection on protected sites

### Technical Details

Allowlist check flow:

```
1. Capture alarm fires
2. CHECK ALLOWLIST FIRST (before anything else)
3. If URL matches allowlist → SKIP (log 'capture_skipped_protected', no URL)
4. If URL does NOT match → proceed with normal capture
5. If check fails → SKIP (fail-safe, log error code)
```

Default bundled allowlist (examples):

```typescript
const DEFAULT_CRISIS_SITES = [
  // Suicide prevention
  'suicidepreventionlifeline.org',
  '988lifeline.org',
  'crisistextline.org',

  // Sexual assault
  'rainn.org',

  // Domestic violence
  'thehotline.org',
  'ncadv.org',

  // Child abuse
  'childhelp.org',

  // Mental health crisis
  'samhsa.gov',
  'nami.org',

  // LGBTQ+ crisis
  'thetrevorproject.org',
  'translifeline.org',
]
```

Performance requirements:

- Use Set for O(1) domain lookup
- Pre-compute domain patterns on allowlist load
- Check must complete in <10ms

### References

- [Source: docs/epics/epic-list.md - Story 11.1]
- [Story 10.1: Screenshot Capture Mechanism]
- [Story 10.6: Capture Event Logging]
- [Epic 7: Crisis Allowlist Foundation]

## Dev Agent Record

### Context Reference

Epic 10 completed - screenshot capture with logging in place

### Agent Model Used

Claude Opus 4.5

### Debug Log References

### Completion Notes List

1. **crisis-allowlist.ts Module** - New module with crisis site protection
2. **CrisisAllowlist Interface** - Data structure for allowlist storage
3. **DEFAULT_CRISIS_SITES** - 25 bundled crisis resources (suicide, assault, DV, mental health, LGBTQ+)
4. **isUrlProtected()** - Synchronous URL check with O(1) Set lookup
5. **extractDomain()** - URL parsing with www normalization
6. **buildDomainSet()** - Converts domain list to Set for fast lookup
7. **initializeAllowlist()** - Called on install/startup
8. **updateAllowlist()** - For future network sync (Story 11.2)
9. **getAllowlistVersion()** - Safe version info for debugging
10. **Performance Check** - Warns if check takes >10ms
11. **Fail-Safe Behavior** - Any error skips capture (privacy first)
12. **ERROR_CODES Extended** - Added CRISIS_URL_PROTECTED, ALLOWLIST_CHECK_ERROR
13. **handleScreenshotCapture Updated** - Checks allowlist BEFORE captureScreenshot
14. **Zero Data Path** - Protected URLs never captured, queued, or transmitted

### File List

- `apps/extension/src/crisis-allowlist.ts` - New crisis protection module
- `apps/extension/src/background.ts` - Integrated allowlist check before capture
- `apps/extension/src/event-logger.ts` - Added crisis protection error codes

### Senior Developer Review

**Reviewed: 2025-12-29**

**Findings:**

1. ✅ Pre-capture allowlist check happens BEFORE any data creation
2. ✅ Zero data path enforced - protected URLs never captured
3. ✅ O(1) domain lookup using Set for <10ms performance
4. ✅ Fail-safe behavior - any error skips capture
5. ✅ Privacy protection - URLs never logged
6. ✅ 25 crisis resources bundled as defaults
7. ✅ Allowlist initialized on install and startup
8. ✅ Error codes added for debugging without PII

**Verdict:** APPROVED - Crisis protection with zero data path invariant (INV-001) implemented.
