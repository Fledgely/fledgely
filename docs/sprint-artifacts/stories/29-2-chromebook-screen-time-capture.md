# Story 29.2: Chromebook Screen Time Capture

Status: Done

## Story

As **the Chromebook extension**,
I want **to capture screen time data**,
So that **parents can see Chromebook usage**.

## Acceptance Criteria

1. **AC1: Active tab time tracking**
   - Given extension is installed and enrolled
   - When child uses Chromebook
   - Then active tab time tracked (not just open tabs)

2. **AC2: Idle detection**
   - Given user becomes inactive
   - When screen locked or inactive
   - Then no tracking during idle periods

3. **AC3: Category inference**
   - Given active tab is being tracked
   - When time is recorded
   - Then app/site category inferred from URL or tab title

4. **AC4: Batched sync**
   - Given screen time is being tracked
   - When data needs to sync
   - Then time data batched and synced every 15 minutes

5. **AC5: Offline tracking**
   - Given device is offline
   - When reconnected
   - Then offline tracking syncs when online

6. **AC6: Crisis URL exclusion**
   - Given crisis URL allowlist exists
   - When tracking active tab
   - Then crisis URLs excluded from time tracking (zero-data-path)

## Tasks / Subtasks

- [x] Task 1: Create screen time tracking module (AC: #1, #2)
  - [x] 1.1 Create `screen-time.ts` module with time tracking state
  - [x] 1.2 Track active tab time using `chrome.tabs.onActivated` and `chrome.tabs.onUpdated`
  - [x] 1.3 Integrate with existing idle detection (`chrome.idle.onStateChanged`)
  - [x] 1.4 Calculate time deltas on tab changes and idle transitions

- [x] Task 2: Implement category inference (AC: #3)
  - [x] 2.1 Extract domain from active tab URL
  - [x] 2.2 Create domain-to-category mapping utility
  - [x] 2.3 Fall back to 'other' category for unknown domains
  - [x] 2.4 Optionally use tab title for additional context

- [x] Task 3: Implement offline storage and batching (AC: #4, #5)
  - [x] 3.1 Store screen time entries in `chrome.storage.local`
  - [x] 3.2 Create screen time queue with max size limit
  - [x] 3.3 Set up 15-minute sync alarm
  - [x] 3.4 Aggregate entries by category before sync

- [x] Task 4: Crisis URL exclusion (AC: #6)
  - [x] 4.1 Check `isUrlProtected()` before recording time
  - [x] 4.2 Ensure no time data recorded for crisis URLs
  - [x] 4.3 Log `screen_time_excluded` event (no URL logged)

- [x] Task 5: Create sync endpoint (AC: #4, #5)
  - [x] 5.1 Create `syncScreenTime` Cloud Function
  - [x] 5.2 Validate incoming screen time data against schema
  - [x] 5.3 Store daily summaries in Firestore
  - [x] 5.4 Aggregate by device, category, and day

- [x] Task 6: Integration and testing (AC: #1-6)
  - [x] 6.1 Integrate screen time module with background.ts
  - [x] 6.2 Add unit tests for time calculation logic
  - [x] 6.3 Add unit tests for category inference
  - [x] 6.4 Test offline/online transitions

## Dev Notes

### Architecture Pattern

Follow existing extension patterns:

- Separate module file (`screen-time.ts`) like `health-metrics.ts`
- Use `chrome.storage.local` for persistence (survives service worker restarts)
- Use `chrome.alarms` for scheduled sync (15 minutes)
- Integrate with existing idle detection in `background.ts`

### Screen Time Tracking State

```typescript
interface ScreenTimeState {
  /** Currently active tab being tracked */
  activeTabId: number | null
  /** Domain of active tab */
  activeDomain: string | null
  /** Category of active tab */
  activeCategory: ScreenTimeCategory
  /** When current tracking session started (epoch ms) */
  sessionStartedAt: number | null
  /** Whether currently tracking (false when idle/locked) */
  isTracking: boolean
  /** Last known idle state */
  lastIdleState: 'active' | 'idle' | 'locked'
}
```

### Screen Time Queue Entry

```typescript
interface ScreenTimeQueueEntry {
  /** Date in YYYY-MM-DD format */
  date: string
  /** IANA timezone */
  timezone: string
  /** Domain being tracked */
  domain: string
  /** Inferred category */
  category: ScreenTimeCategory
  /** Minutes accumulated */
  minutes: number
  /** When this entry was recorded */
  recordedAt: number
}
```

### Category Inference Strategy

Use domain-based categorization:

```typescript
const DOMAIN_CATEGORIES: Record<string, ScreenTimeCategory> = {
  // Education
  'classroom.google.com': 'education',
  'khanacademy.org': 'education',
  'quizlet.com': 'education',
  'canvas.instructure.com': 'education',

  // Social Media
  'youtube.com': 'entertainment', // Note: could be education too
  'tiktok.com': 'social_media',
  'instagram.com': 'social_media',
  'snapchat.com': 'social_media',

  // Gaming
  'roblox.com': 'gaming',
  'minecraft.net': 'gaming',
  'steam.com': 'gaming',

  // ... more mappings
}
```

### Privacy Safeguards

1. **No URL logging**: Only domain and category stored
2. **Crisis URL zero-data**: Use existing `isUrlProtected()` before any tracking
3. **Aggregate before sync**: Only send category totals, not individual sites
4. **Same retention as screenshots**: Use family's retention policy

### Sync Endpoint Design

```typescript
// POST /syncScreenTime
interface SyncScreenTimeRequest {
  deviceId: string
  familyId: string
  childId: string
  entries: {
    date: string
    timezone: string
    categories: {
      category: ScreenTimeCategory
      minutes: number
    }[]
  }[]
}
```

### Firestore Document Update

Update existing daily summary document:

```
/families/{familyId}/children/{childId}/screenTime/{date}
```

### Integration Points

1. **background.ts**:
   - Call `initScreenTimeTracking()` on extension init
   - Update tracking on `chrome.tabs.onActivated`
   - Pause/resume on `chrome.idle.onStateChanged`

2. **health-metrics.ts**:
   - Optionally include screen time summary in health sync

3. **crisis-allowlist.ts**:
   - Use `isUrlProtected()` to exclude crisis sites

### Testing Approach

Unit tests in `screen-time.test.ts`:

- Time calculation across tab switches
- Idle state transitions
- Category inference from domains
- Queue aggregation before sync
- Crisis URL exclusion

### NFR Compliance

- **NFR7:** Time tracking updates display within 5 seconds
  - Extension syncs every 15 minutes; dashboard reads from Firestore
- **NFR42:** WCAG 2.1 AA - N/A for extension background service

### References

- [Source: docs/epics/epic-list.md#story-292] - Story requirements
- [Source: apps/extension/src/background.ts] - Service worker
- [Source: apps/extension/src/health-metrics.ts] - Health sync pattern
- [Source: apps/extension/src/crisis-allowlist.ts] - Crisis URL handling
- [Source: Story 29.1] - Screen time data model schemas

## Dev Agent Record

### Context Reference

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

- All 6 acceptance criteria implemented and tested
- Created screen-time.ts module with domain extraction, category inference, and time tracking
- Integrated with chrome.tabs.onActivated, chrome.tabs.onUpdated, and chrome.idle.onStateChanged
- Created syncScreenTime Cloud Function for batched data sync every 15 minutes
- Implemented offline-first queue with 500 entry max, local storage persistence
- Crisis URL exclusion via isUrlProtected() - zero-data-path maintained
- Category inference for 60+ domains across 9 categories (education, gaming, social_media, etc.)
- Multi-device aggregation support in Firestore daily summaries
- 41 new extension unit tests + 8 new function unit tests
- All 479 extension tests pass, all 1416 function tests pass
- Extension and functions build successfully

### File List

**New Files:**

- `apps/extension/src/screen-time.ts` - Screen time tracking module
- `apps/extension/src/screen-time.test.ts` - 41 unit tests for screen time module
- `apps/functions/src/http/sync/screen-time.ts` - syncScreenTime Cloud Function
- `apps/functions/src/http/sync/screen-time.test.ts` - 8 unit tests for sync endpoint

**Modified Files:**

- `apps/extension/src/background.ts` - Integrated screen time tracking
- `apps/functions/src/http/sync/index.ts` - Exported syncScreenTime function
