# Story 46.1: Chromebook Extension Offline Queue

## Status: done

## Story

As **a Chromebook extension**,
I want **to queue captures when offline**,
So that **monitoring continues during network outages (FR87)**.

## Acceptance Criteria

1. **AC1: Offline Detection**
   - Given Chromebook loses network connectivity
   - When the extension detects offline status
   - Then captures continue on normal schedule
   - And queue mode is activated automatically

2. **AC2: IndexedDB Queue Storage**
   - Given screenshots are captured while offline
   - When storing in queue
   - Then stored in IndexedDB queue (up to 500 items)
   - And oldest items dropped if queue full (FIFO)
   - And queue includes: screenshot data, metadata, timestamp

3. **AC3: Queue Data Integrity**
   - Given captures are queued offline
   - When device stays offline
   - Then no data loss for typical offline periods (<24h)
   - And queue survives service worker restart
   - And queue survives browser restart

4. **AC4: Encryption at Rest**
   - Given screenshots are stored in queue
   - When persisted to IndexedDB
   - Then queue encrypted at rest using Web Crypto API
   - And encryption key derived from device credentials

5. **AC5: Performance (NFR55)**
   - Given queue operations occur
   - When adding/reading/removing items
   - Then NFR55: queue operations complete in <100ms
   - And no UI blocking during queue operations

6. **AC6: Continuous Capture**
   - Given device is offline
   - When capture interval elapses
   - Then extension continues capturing per normal schedule
   - And crisis URL protection still works (cached allowlist)
   - And decoy mode still works (if configured)

## Tasks / Subtasks

### Task 1: Create IndexedDB Queue Service

**Files:**

- `apps/extension/src/offline-queue.ts` (new)
- `apps/extension/src/offline-queue.test.ts` (new)

**Implementation:**
1.1 Create IndexedDB database schema: `fledgely_offline_queue`
1.2 Define object store: `screenshots` with index on `queuedAt`
1.3 Implement `initOfflineQueue()` - database initialization
1.4 Implement `addToQueue(screenshot: QueuedScreenshot)` - add with FIFO eviction
1.5 Implement `getQueuedItems(limit?: number)` - retrieve items in FIFO order
1.6 Implement `removeFromQueue(id: string)` - remove uploaded item
1.7 Implement `getQueueSize()` - current queue count
1.8 Implement `clearQueue()` - full queue clear (for testing)
1.9 Write unit tests for all operations with performance assertions

### Task 2: Implement Queue Encryption

**Files:**

- `apps/extension/src/queue-encryption.ts` (new)

**Implementation:**
2.1 Create `generateQueueKey()` - derive AES-GCM key from deviceId + salt
2.2 Implement `encryptScreenshot(data: string)` - encrypt base64 data
2.3 Implement `decryptScreenshot(encrypted: ArrayBuffer)` - decrypt for upload
2.4 Store derived key in memory only (not persisted)
2.5 Handle key regeneration on extension restart

### Task 3: Add Network Status Detection

**Files:**

- `apps/extension/src/network-status.ts` (new)
- `apps/extension/src/background.ts` (modify)

**Implementation:**
3.1 Create `NetworkStatus` module with `isOnline()` function
3.2 Listen to `navigator.onLine` and network change events
3.3 Add periodic connectivity check (fetch to known endpoint)
3.4 Export `onNetworkStatusChange(callback)` for subscribers
3.5 Integrate with background.ts alarm handler

### Task 4: Migrate Screenshot Storage to IndexedDB

**Files:**

- `apps/extension/src/background.ts` (modify)
- `apps/extension/src/upload.ts` (modify)

**Implementation:**
4.1 Replace `chrome.storage.local` queue with IndexedDB queue
4.2 Update `processQueuedScreenshot()` to use new queue service
4.3 Update `addToQueue()` calls to use IndexedDB
4.4 Add migration logic for existing queue items (one-time)
4.5 Update queue overflow handling with FIFO eviction

### Task 5: Implement Offline Capture Logic

**Files:**

- `apps/extension/src/background.ts` (modify)

**Implementation:**
5.1 Modify capture handler to check network status
5.2 If offline: queue immediately without upload attempt
5.3 If online: attempt upload, queue on failure
5.4 Maintain capture schedule regardless of network status
5.5 Log offline captures to event logger

### Task 6: Add Queue Status to Popup

**Files:**

- `apps/extension/src/popup.ts` (modify)
- `apps/extension/public/popup.html` (modify)

**Implementation:**
6.1 Add queue size display: "X items waiting to sync"
6.2 Add offline status indicator
6.3 Update status on queue changes
6.4 Style offline state appropriately

### Task 7: Update Health Metrics

**Files:**

- `apps/extension/src/health-metrics.ts` (modify)

**Implementation:**
7.1 Add `offlineQueueSize` metric
7.2 Add `lastOfflineAt` timestamp
7.3 Add `offlineDurationSeconds` for current offline period
7.4 Include in health sync payload

## Dev Notes

### Existing Patterns to Follow

**Current Queue Implementation (background.ts lines 470-520):**

```typescript
// Current structure to migrate FROM
interface QueuedScreenshot {
  id: string
  capture: ScreenshotCapture
  childId: string
  queuedAt: number
  retryCount: number
  lastRetryAt: number | null
  isDecoy: boolean
}

// Currently stored in chrome.storage.local under 'screenshotQueue' key
// Max 500 items already defined
```

**IndexedDB Pattern to Use:**

```typescript
// New IndexedDB-based queue
const DB_NAME = 'fledgely_offline_queue'
const DB_VERSION = 1
const STORE_NAME = 'screenshots'

interface EncryptedQueueItem {
  id: string
  encryptedData: ArrayBuffer // Encrypted screenshot + metadata
  iv: Uint8Array // Initialization vector for AES-GCM
  queuedAt: number
  childId: string
  isDecoy: boolean
}
```

**Encryption Pattern (Web Crypto API):**

```typescript
// Derive key from deviceId
async function deriveKey(deviceId: string): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(deviceId),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('fledgely-queue-salt'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}
```

### Technical Requirements

- **IndexedDB:** Use native IndexedDB API (no wrapper library needed)
- **Encryption:** AES-256-GCM via Web Crypto API
- **Performance:** All operations must complete <100ms (NFR55)
- **Queue Size:** Maximum 500 items (FR87)
- **FIFO:** Oldest items dropped when full
- **Persistence:** Queue survives browser/extension restarts

### Testing Considerations

- Test offline detection with `navigator.onLine` mock
- Test queue FIFO eviction at 500 items
- Test encryption/decryption round-trip
- Test performance with 500-item queue (<100ms)
- Test queue survival after service worker restart
- Test migration from chrome.storage.local to IndexedDB

### Project Structure Notes

- Extension source: `apps/extension/src/`
- Extension builds to: `apps/extension/dist/`
- Build command: `cd apps/extension && npm run build`
- Test with: `cd apps/extension && npm test`

### Crisis URL Protection During Offline

The allowlist is already cached locally (see `crisis-allowlist.ts`):

- `initializeAllowlist()` loads bundled allowlist
- `isAllowlistStale()` checks for staleness (7 days OK per Story 46.6)
- Crisis protection works offline with cached list

### References

- [Source: apps/extension/src/background.ts] - Current queue implementation
- [Source: apps/extension/src/upload.ts] - Upload and retry logic
- [Source: apps/extension/src/event-logger.ts] - Event logging patterns
- [Source: apps/extension/src/crisis-allowlist.ts] - Offline allowlist caching
- [Source: docs/epics/epic-list.md#Epic-46] - Epic requirements

## Dev Agent Record

### Context Reference

Epic 46: Offline Operation Foundation

- FR87: Devices queue captures when offline
- FR88: Automatic sync on reconnect (Story 46.3)
- NFR55: Queue operations <100ms
- NFR42: Audit logging

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

- All 7 tasks completed successfully
- 724 tests passing (including 72+ new tests for offline queue, encryption, and network status)
- IndexedDB queue with FIFO eviction at 500 items implemented
- AES-256-GCM encryption using Web Crypto API implemented (AC4)
- Network status detection with automatic queue sync on reconnect
- Queue status and offline indicator added to popup UI with periodic refresh
- Health metrics updated to use IndexedDB queue and network status module
- Migration logic from chrome.storage.local to IndexedDB with validation included

### Code Review Findings (Fixed)

1. **AC4 Encryption Implemented** - Queue data now encrypted at rest using Web Crypto API
2. **Service Worker Compatibility** - Network status monitoring works in service worker context
3. **FIFO Eviction Fixed** - Race condition resolved using separate transactions
4. **Offline Duration Logging** - Added `getLastOfflineDuration()` for accurate callback logging
5. **Popup Refresh** - Queue status refreshes every 5 seconds while popup is open
6. **Quota Error Handling** - IndexedDB quota exceeded errors are caught and reported
7. **Migration Validation** - Validates data and only marks complete if all items migrate

### File List

**New Files Created:**

- `apps/extension/src/offline-queue.ts` - IndexedDB queue service
- `apps/extension/src/offline-queue.test.ts` - Queue tests (22 tests)
- `apps/extension/src/queue-encryption.ts` - AES-256-GCM encryption
- `apps/extension/src/queue-encryption.test.ts` - Encryption tests (23 tests)
- `apps/extension/src/network-status.ts` - Network connectivity detection
- `apps/extension/src/network-status.test.ts` - Network status tests (23 tests)

**Modified Files:**

- `apps/extension/src/background.ts` - Migrated queue to IndexedDB, added network status integration
- `apps/extension/src/popup.ts` - Added queue status display
- `apps/extension/popup.html` - Added queue/offline status UI elements
- `apps/extension/src/health-metrics.ts` - Updated to use IndexedDB queue and network status
