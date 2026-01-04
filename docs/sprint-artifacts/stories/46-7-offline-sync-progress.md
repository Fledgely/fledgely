# Story 46.7: Offline Sync Progress

## Status: done

## Story

As **a parent**,
I want **to see sync progress when device reconnects**,
So that **I know when data will be available**.

## Acceptance Criteria

1. **AC1: Progress Display**
   - Given device comes back online with queued data
   - When sync is in progress
   - Then dashboard shows: "Syncing: 45 of 120 items"
   - And count updates in real-time

2. **AC2: Progress Bar on Device Card**
   - Given device is syncing queued items
   - When viewing device list
   - Then progress bar visible on device card
   - And progress bar shows percentage complete

3. **AC3: Estimated Time Remaining**
   - Given large queue (>10 items)
   - When sync in progress
   - Then estimated time remaining shown
   - And estimate based on current sync speed

4. **AC4: Sync Speed Display**
   - Given sync on slow connection
   - When viewing device status
   - Then can see sync speed (items/min)
   - And helps parent understand if connection is slow

5. **AC5: Non-Blocking Background Sync**
   - Given sync in progress
   - When parent interacts with dashboard
   - Then sync completes in background
   - And dashboard remains responsive

6. **AC6: Sync Complete Notification (Optional)**
   - Given device finishes syncing
   - When all items uploaded
   - Then notification available when sync complete
   - And notification is optional per parent preference

7. **AC7: Historical Sync Stats**
   - Given device has synced
   - When viewing device health details
   - Then historical sync stats available
   - And shows last sync time, items synced

## Tasks / Subtasks

### Task 1: Extend Health Metrics with Sync Progress (AC1, AC3, AC4) [x]

**Files:**

- `apps/extension/src/health-metrics.ts` (modify)
- `apps/web/src/hooks/useDevices.ts` (modify)

**Implementation:**
1.1 Add sync progress fields to DeviceHealthMetrics: - syncProgressTotal: number | null - syncProgressSynced: number | null - syncSpeedItemsPerMinute: number | null - syncEstimatedSecondsRemaining: number | null - syncLastCompletedAt: number | null - syncLastSyncedCount: number | null - syncLastDurationMs: number | null
1.2 Update web hook to parse new fields from Firestore
1.3 Add syncLastCompleted timestamp for AC7

### Task 2: Track Sync Progress in Extension (AC1, AC5) [x]

**Files:**

- `apps/extension/src/network-status.ts` (modify)
- `apps/extension/src/background.ts` (modify)

**Implementation:**
2.1 Create sync progress tracking state in network-status module: - startSyncProgress(total) - updateSyncProgress(synced) - completeSyncProgress() - getSyncProgress(): { total, synced, startedAt, speed, eta, ... }
2.2 Update processScreenshotQueue to report progress during sync
2.3 Report progress to health metrics on each item synced
2.4 Ensure sync runs in background without blocking

### Task 3: Add Progress Bar to Device Card (AC2) [x]

**Files:**

- `apps/web/src/components/devices/DevicesList.tsx` (modify)

**Implementation:**
3.1 Add progress bar component for syncing devices
3.2 Show "Syncing: X of Y items" text when syncing
3.3 Progress bar uses blue syncing theme color (#3b82f6)
3.4 Hide progress bar when not syncing

### Task 4: Add Estimated Time and Speed Display (AC3, AC4) [x]

**Files:**

- `apps/web/src/components/devices/DevicesList.tsx` (modify)
- `apps/web/src/hooks/useDevices.ts` (modify)

**Implementation:**
4.1 Calculate estimated time remaining based on sync speed
4.2 Show "~X min remaining" for large queues
4.3 Show sync speed on progress bar (items/min)
4.4 Add formatEstimatedTime helper function

### Task 5: Add Historical Sync Stats (AC7) [x]

**Files:**

- `apps/extension/src/network-status.ts` - Tracks lastCompletedAt, lastSyncedCount, lastSyncDurationMs
- `apps/extension/src/health-metrics.ts` - Reports stats to Firestore
- `apps/web/src/hooks/useDevices.ts` - Parses stats from Firestore

**Implementation:**
5.1 Track last sync stats in network-status module
5.2 Include stats in health metrics sync to Firestore
5.3 Parse stats in web hook for dashboard access

### Task 6: Add Tests (AC1-AC7) [x]

**Files:**

- `apps/extension/src/network-status.test.ts` (modify)

**Implementation:**
6.1 Add 13 tests for sync progress tracking in extension
6.2 Tests cover: startSyncProgress, updateSyncProgress, completeSyncProgress
6.3 Tests cover: speed calculation, ETA calculation, reset behavior
6.4 All 780 extension tests passing

## Dev Notes

### Architecture

Sync progress flows through:

1. **Extension** (processOfflineQueue) → tracks items synced
2. **Health Metrics** → includes sync progress in periodic health sync
3. **Firestore** → stores sync progress in device document
4. **Web Dashboard** → displays progress via real-time listener

### Progress Bar Design

```
[████████████░░░░░░░░░░] 45/120 items (~3 min remaining)
```

- Blue fill matching syncing theme (#3b82f6)
- Gray background (#e5e7eb)
- Rounded corners
- Animate width on progress updates

### Sync Speed Calculation

```typescript
// items per minute = synced / (now - startedAt) * 60000
const elapsed = Date.now() - syncStartedAt
const speed = (syncProgressSynced / elapsed) * 60000
const remaining = (syncProgressTotal - syncProgressSynced) / speed
```

### References

- [Source: apps/extension/src/health-metrics.ts] - Health metrics module
- [Source: apps/extension/src/network-status.ts] - Network status tracking
- [Source: apps/web/src/components/devices/DevicesList.tsx] - Device list UI
- [Source: docs/sprint-artifacts/stories/46-4-offline-timestamp-display.md] - Syncing state

## Dev Agent Record

### Context Reference

Epic 46: Offline Operation Foundation

- Story 46-3: Automatic Sync on Reconnect (provides sync infrastructure)
- Story 46-4: Offline Timestamp Display (provides syncing state)
- Story 46-5: Offline Mode Indication (provides UI patterns)

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

N/A

### Completion Notes List

- All 6 tasks completed successfully
- 780 extension tests passing (13 new sync progress tests)
- Added sync progress tracking to network-status.ts module
- Extended DeviceHealthMetrics with 7 sync progress fields
- Updated processScreenshotQueue to track progress per item
- Added progress bar UI to DevicesList.tsx with blue syncing theme
- Progress bar shows: X of Y items, estimated time, sync speed
- Historical sync stats tracked for future dashboard display

### File List

**Modified Files:**

- `apps/extension/src/network-status.ts` - Added sync progress tracking functions
- `apps/extension/src/network-status.test.ts` - Added 13 new tests for sync progress
- `apps/extension/src/health-metrics.ts` - Extended DeviceHealthMetrics interface
- `apps/extension/src/background.ts` - Updated processScreenshotQueue for progress tracking
- `apps/web/src/hooks/useDevices.ts` - Extended interface and parsing for sync fields
- `apps/web/src/components/devices/DevicesList.tsx` - Added sync progress bar component

## Change Log

| Date       | Change                              |
| ---------- | ----------------------------------- |
| 2026-01-04 | Story created                       |
| 2026-01-04 | Implementation completed, 780 tests |
