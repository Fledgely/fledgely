# Story 46.3: Automatic Sync on Reconnect

## Status: done

## Story

As **a device**,
I want **to automatically sync queued data when online**,
So that **no manual intervention needed (FR88)**.

## Acceptance Criteria

1. **AC1: Automatic Sync Start**
   - Given device regains network connectivity
   - When network detected
   - Then sync starts automatically within 30 seconds
   - And uploads queued items in chronological order

2. **AC2: Partial Sync Handling**
   - Given sync is interrupted
   - When connection resumes
   - Then sync resumes from where it left off
   - And no duplicate uploads occur

3. **AC3: Battery Protection**
   - Given device has low battery (<20%)
   - When large sync needed (>10 items)
   - Then sync is delayed until battery adequate or charger connected
   - And small syncs still proceed immediately

4. **AC4: Dashboard Updates**
   - Given items are being synced
   - When uploads complete
   - Then dashboard updated in real-time as items arrive
   - And screenshot list updates without refresh

5. **AC5: Sync Event Logging (NFR42)**
   - Given sync operations occur
   - When starting, completing, or failing sync
   - Then sync events logged for audit trail
   - And includes: sync_start, sync_complete, sync_failed

6. **AC6: Conflict Resolution**
   - Given potential timestamp conflicts
   - When server and device timestamps differ
   - Then server timestamp wins
   - And device queue maintains consistency

## Tasks / Subtasks

### Task 1: Add Battery-Aware Sync (AC3)

**Files:**

- `apps/extension/src/battery-status.ts` (new)
- `apps/extension/src/battery-status.test.ts` (new)
- `apps/extension/src/background.ts` (modify)

**Implementation:**
1.1 Create `battery-status.ts` module with Battery Status API
1.2 Implement `getBatteryLevel()` - returns percentage 0-100
1.3 Implement `isCharging()` - returns true if plugged in
1.4 Implement `shouldDelaySync(queueSize)` - returns true if battery <20% and queue >10
1.5 Modify `processScreenshotQueue()` to check battery before large syncs
1.6 Add console logging for battery-delayed syncs
1.7 Write unit tests with Battery API mocking

### Task 2: Add Sync Event Logging (AC5)

**Files:**

- `apps/extension/src/event-logger.ts` (modify)
- `apps/extension/src/background.ts` (modify)

**Implementation:**
2.1 Add sync event types: `sync_start`, `sync_complete`, `sync_failed`
2.2 Log sync_start when processScreenshotQueue begins
2.3 Log sync_complete with items synced count
2.4 Log sync_failed if sync interrupted or errored
2.5 Include offline duration in sync events

### Task 3: Verify Existing Implementation

**Files:**

- `apps/extension/src/background.ts` (verify)
- `apps/extension/src/network-status.ts` (verify)

**Implementation:**
3.1 Verify AC1: Auto-sync triggers within 30s (currently 2s delay)
3.2 Verify AC2: Items remain in queue until successfully uploaded
3.3 Verify AC4: Server updates Firestore, dashboard uses real-time listener
3.4 Verify AC6: Server-side timestamp handling in uploadScreenshot endpoint

## Dev Notes

### Already Implemented in Story 46-1

**AC1 - Auto-sync start (mostly complete):**

```typescript
// In background.ts - onNetworkStatusChange callback
onNetworkStatusChange(async (online) => {
  if (online) {
    const offlineDuration = getLastOfflineDuration()
    console.log(`[Fledgely] Back online after ${offlineDuration}s, processing queue...`)
    setTimeout(async () => {
      await processScreenshotQueue()
    }, 2000) // 2s delay - meets "within 30 seconds" requirement
  }
})
```

**AC2 - Partial sync handling (complete):**

- Items remain in IndexedDB queue until `removeFromQueue(id)` called after successful upload
- Failed items stay in queue with retry count updated
- Queue processing resumes on next alarm or network change

### Battery Status API Reference

```typescript
// Battery Status API (Chrome extension context)
async function getBatteryInfo(): Promise<{ level: number; charging: boolean }> {
  // navigator.getBattery() available in extension service worker
  const battery = await navigator.getBattery()
  return {
    level: battery.level * 100, // 0-100
    charging: battery.charging,
  }
}
```

### Sync Event Types to Add

```typescript
// In event-logger.ts
export type CaptureEventType =
  | 'capture_success'
  | 'capture_skipped'
  | 'capture_failed'
  | 'upload_success'
  | 'upload_failed'
  | 'idle_pause'
  | 'idle_resume'
  | 'queue_overflow'
  | 'retry_exhausted'
  | 'vpn_detected'
  | 'sync_start' // NEW: Queue sync started
  | 'sync_complete' // NEW: Queue sync completed
  | 'sync_delayed' // NEW: Sync delayed (low battery)
```

### Dashboard Real-time Updates (AC4)

Already implemented via Firestore real-time listeners in web dashboard:

- `apps/web/src/components/screenshots/ScreenshotGallery.tsx` uses `onSnapshot`
- Screenshots appear in real-time as they're uploaded
- No additional work needed for this AC

### Server-side Conflict Resolution (AC6)

Already implemented in Cloud Functions:

- Upload endpoint uses `serverTimestamp()` for `uploadedAt`
- Device `timestamp` preserved as original capture time
- Server timestamp used for ordering in queries

### Testing Considerations

- Mock Battery Status API for unit tests
- Test battery threshold behavior at 19%, 20%, 21%
- Test charging override (sync proceeds even if low battery when charging)
- Test queue size threshold (9, 10, 11 items)
- Verify event logging for all sync states

### Project Structure Notes

- Extension source: `apps/extension/src/`
- Extension builds to: `apps/extension/dist/`
- Build command: `cd apps/extension && npm run build`
- Test with: `cd apps/extension && npm test`

### References

- [Source: apps/extension/src/background.ts] - Current sync implementation
- [Source: apps/extension/src/network-status.ts] - Network detection
- [Source: apps/extension/src/event-logger.ts] - Event logging patterns
- [Source: docs/epics/epic-list.md#story-463] - Story requirements

## Dev Agent Record

### Context Reference

Epic 46: Offline Operation Foundation

- FR88: Automatic sync on reconnect
- NFR42: Audit logging
- NFR55: Queue operations <100ms

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

- All tasks completed successfully
- 748 tests passing (including 24 new battery status tests)
- Battery-aware sync implemented (AC3): delays large sync (>10 items) when battery <20%
- Sync event logging implemented (AC5): sync_start, sync_complete, sync_delayed events
- AC1, AC2, AC4, AC6 verified as already complete from Story 46-1
- Dashboard real-time updates verified via existing Firestore onSnapshot listeners
- Server-side conflict resolution already implemented (serverTimestamp)

### Code Review Findings

1. **H1 FIXED: Added sync_failed event type** - AC5 now complete with sync_start, sync_complete, sync_delayed, and sync_failed
2. **M1 FIXED: Added offline duration to sync events** - sync_start event now includes how long device was offline
3. **M2 FIXED: Added event-logger.test.ts** - 8 tests for sync event logging
4. **M3 NOTED: package.json change was from Story 46-1** - fake-indexeddb was added for IndexedDB testing

### File List

**New Files Created:**

- `apps/extension/src/battery-status.ts` - Battery Status API integration
- `apps/extension/src/battery-status.test.ts` - Battery status tests (24 tests)
- `apps/extension/src/event-logger.test.ts` - Event logger tests including sync events (8 tests)

**Modified Files:**

- `apps/extension/src/event-logger.ts` - Added sync event types: sync_start, sync_complete, sync_delayed, sync_failed + SYNC_NETWORK_LOST error code
- `apps/extension/src/background.ts` - Added battery check, sync event logging with offline duration, sync_failed on all-fail
