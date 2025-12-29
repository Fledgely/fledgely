# Story 10.1: Screenshot Capture Mechanism

Status: Done

## Story

As **the extension**,
I want **to capture the visible tab content as a screenshot**,
So that **monitoring data is collected per the family agreement**.

## Acceptance Criteria

1. **AC1: Tab Capture API**
   - Given monitoring is active and scheduled capture time arrives
   - When capture is triggered
   - Then chrome.tabs.captureVisibleTab API captures current tab

2. **AC2: Performance**
   - Given capture is triggered
   - When chrome.tabs.captureVisibleTab executes
   - Then capture completes within 500ms (NFR2)

3. **AC3: Image Format**
   - Given screenshot is captured
   - When image is created
   - Then captured image is JPEG format with configurable quality (default 80%)

4. **AC4: Metadata**
   - Given screenshot is captured
   - When capture completes
   - Then capture includes timestamp and tab URL metadata

5. **AC5: Graceful Failure**
   - Given capture is triggered
   - When tab is not capturable (chrome://, file://, etc.)
   - Then capture fails gracefully without crashing extension

6. **AC6: Error Logging**
   - Given capture fails
   - When error occurs
   - Then failed captures are logged but don't crash extension

## Tasks / Subtasks

- [x] Task 1: Implement Screenshot Capture Function (AC: #1, #2, #3)
  - [x] 1.1 Create captureScreenshot function using chrome.tabs.captureVisibleTab
  - [x] 1.2 Configure JPEG format with quality parameter
  - [x] 1.3 Add performance timing measurement

- [x] Task 2: Add Metadata Collection (AC: #4)
  - [x] 2.1 Get current tab URL and title
  - [x] 2.2 Add capture timestamp
  - [x] 2.3 Create ScreenshotCapture interface

- [x] Task 3: Handle Non-Capturable Tabs (AC: #5, #6)
  - [x] 3.1 Detect non-capturable URL schemes (chrome://, file://, etc.)
  - [x] 3.2 Gracefully skip capture for restricted pages
  - [x] 3.3 Log skipped captures without crashing

- [x] Task 4: Integrate with Alarm Handler (AC: #1)
  - [x] 4.1 Call captureScreenshot from screenshot-capture alarm
  - [x] 4.2 Store captured screenshot in local queue (prep for Story 10.3)

## Dev Notes

### Implementation Strategy

Build on the alarm handler from Story 9.6. When the screenshot-capture alarm fires,
call the new captureScreenshot function that uses chrome.tabs.captureVisibleTab.

### Key Requirements

- **NFR2:** Capture completes within 500ms
- **NFR70:** Chrome MV3 compliance
- **FR27:** Screenshot capture per agreement

### Technical Details

chrome.tabs.captureVisibleTab API:

- Requires 'tabs' permission (already in manifest)
- Captures the visible area of the active tab in focused window
- Returns base64-encoded data URL of the captured image
- Options: format (jpeg/png), quality (0-100 for jpeg)

Non-capturable pages:

- chrome:// - Chrome internal pages
- chrome-extension:// - Extension pages
- file:// - Local files
- devtools:// - Developer tools
- view-source:// - Source view

### References

- [Source: docs/epics/epic-list.md - Story 10.1]
- [Chrome captureVisibleTab API](https://developer.chrome.com/docs/extensions/reference/api/tabs#method-captureVisibleTab)
- [Story 9.6: Extension Background Service]

## Dev Agent Record

### Context Reference

Story 9.6 completed - extension has alarm-based scheduling

### Agent Model Used

Claude Opus 4.5

### Debug Log References

### Completion Notes List

1. **capture.ts Module** - New module with captureScreenshot function and ScreenshotCapture interface
2. **Non-capturable URL Detection** - Checks for chrome://, file://, devtools://, etc. before capture
3. **Performance Monitoring** - Measures capture time and warns if >500ms
4. **Metadata Collection** - Captures URL, title, timestamp with each screenshot
5. **Queue Integration** - Screenshots queued in chrome.storage.local with MAX_QUEUE_SIZE=500
6. **Error Handling** - Graceful failure with error logging, distinguishes skipped vs failed

### File List

- `apps/extension/src/capture.ts` - New screenshot capture module
- `apps/extension/src/background.ts` - Added handleScreenshotCapture, queueScreenshot

### Senior Developer Review

**Reviewed: 2025-12-29**

**Findings:**

1. ✅ captureVisibleTab API properly integrated
2. ✅ JPEG format with configurable quality (default 80%)
3. ✅ Performance timing with 500ms warning threshold
4. ✅ Complete metadata (URL, title, timestamp, captureTimeMs)
5. ✅ Non-capturable URLs gracefully skipped with 'skipped' flag
6. ✅ Queue integration with MAX_QUEUE_SIZE=500 per NFR87
7. ⚠️ Actual upload not yet implemented (Story 10.4)

**Verdict:** APPROVED - Screenshot capture mechanism complete and integrated with alarm handler.
