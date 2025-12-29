# Story 19.4: Monitoring Health Details

Status: blocked

## Story

As a **parent**,
I want **detailed monitoring health information**,
So that **I can troubleshoot issues**.

## Acceptance Criteria

1. **AC1: Health panel access**
   - Given parent views device in dashboard
   - When parent clicks on device for details
   - Then health panel opens

2. **AC2: Capture success rate**
   - Given health panel is open
   - When viewing device health
   - Then panel shows capture success rate (last 24h)

3. **AC3: Upload queue size**
   - Given health panel is open
   - When viewing device health
   - Then panel shows upload queue size (pending screenshots)

4. **AC4: Battery level**
   - Given health panel is open
   - When viewing device health
   - Then panel shows battery level (if available)
   - **BLOCKED: Requires extension changes to capture battery data**

5. **AC5: Network status**
   - Given health panel is open
   - When viewing device health
   - Then panel shows network status (online/offline)

6. **AC6: Permission status**
   - Given health panel is open
   - When viewing device health
   - Then panel shows permission status (all granted or issues)
   - **BLOCKED: Requires extension changes to capture permission data**

7. **AC7: App version**
   - Given health panel is open
   - When viewing device health
   - Then panel shows app version with update available indicator
   - **BLOCKED: Requires extension changes to capture version/update data**

## Blocking Issues

This story is BLOCKED pending extension infrastructure work:

1. **Battery monitoring not implemented** - Chrome extension needs to capture battery level using Chrome APIs (`system.display`, battery status)
2. **Permission monitoring not implemented** - Extension needs to periodically check permission status and sync to Firestore
3. **App version/update status not synced** - Extension needs to expose version from manifest and detect available updates

### What IS Available Now

The extension already captures (in local storage only):

- Event log with capture success/failure counts (via `event-logger.ts`)
- Upload queue size (via `getQueueSize()`)
- Network status can be inferred from upload failures

These need to be synced to Firestore for dashboard access.

### Required Extension Work (Separate Story/Epic)

1. Add `batteryLevel` and `batteryCharging` fields to device heartbeat
2. Add `permissionStatus` check and sync
3. Add `appVersion` and `updateAvailable` to device document
4. Create health metrics sync (every 5-15 min) to push:
   - Capture success rate (calculated from event-logger)
   - Upload queue size
   - Battery level
   - Network status
   - Permission status

### Recommendation

Create a new story "Extension Health Metrics Sync" to implement the extension-side infrastructure before attempting this story.

## Tasks / Subtasks

- [ ] Task 1: Add health metrics to Device interface and Firestore (AC: #2, #3, #5)
  - [ ] 1.1 Extend Device interface with healthMetrics field
  - [ ] 1.2 Update useDevices hook to fetch health metrics
  - [ ] 1.3 Create healthMetrics type definition

- [ ] Task 2: Create Health Panel Modal (AC: #1)
  - [ ] 2.1 Create DeviceHealthModal component
  - [ ] 2.2 Add modal trigger from StatusBadge click
  - [ ] 2.3 Style modal with consistent design

- [ ] Task 3: Display Available Metrics (AC: #2, #3, #5)
  - [ ] 3.1 Show capture success rate (if available)
  - [ ] 3.2 Show upload queue size (if available)
  - [ ] 3.3 Show network status (online/offline)
  - [ ] 3.4 Show "Data not available" placeholders for blocked metrics

- [ ] Task 4: Handle Missing Data Gracefully
  - [ ] 4.1 Show placeholder for battery (blocked)
  - [ ] 4.2 Show placeholder for permissions (blocked)
  - [ ] 4.3 Show placeholder for app version (blocked)
  - [ ] 4.4 Add "Health sync not yet available" message

- [ ] Task 5: Add Unit Tests
  - [ ] 5.1 Test health panel opens on click
  - [ ] 5.2 Test metrics display when available
  - [ ] 5.3 Test placeholder display when data missing
  - [ ] 5.4 Test modal close functionality

## Dev Notes

### Current Infrastructure Analysis

**Event Logger (extension)** - `event-logger.ts`:

- Captures last 7 days of events in chrome.storage.local
- `getEventStats(hours)` returns success/failure counts
- Available locally but NOT synced to Firestore

**Upload Queue** - `background.ts`:

- `getQueueSize()` returns pending screenshot count
- Available locally but NOT synced to Firestore

**Device Document** - Firestore `families/{familyId}/devices/{deviceId}`:

- Only basic fields: deviceId, name, type, status, lastSeen, lastScreenshotAt
- No health metrics currently stored

### Proposed Firestore Schema Addition

```typescript
interface DeviceHealthMetrics {
  captureSuccessRate24h: number | null // 0-100 percentage
  uploadQueueSize: number | null
  networkStatus: 'online' | 'offline' | null
  batteryLevel: number | null // BLOCKED: requires extension work
  batteryCharging: boolean | null // BLOCKED: requires extension work
  permissionStatus: PermissionStatus | null // BLOCKED: requires extension work
  appVersion: string | null // BLOCKED: requires extension work
  updateAvailable: boolean | null // BLOCKED: requires extension work
  lastHealthSync: Date | null
}

interface Device {
  // ... existing fields
  healthMetrics: DeviceHealthMetrics | null
}
```

### References

- [Source: docs/epics/epic-list.md#Story-19.4 - Monitoring Health Details]
- [Extension event-logger: apps/extension/src/event-logger.ts]
- [Previous: docs/sprint-artifacts/stories/19-3-last-sync-timestamp-display.md]

---

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

Story is BLOCKED pending extension infrastructure work. The extension does not currently sync health metrics to Firestore. Dashboard cannot display data that isn't available.

### File List
