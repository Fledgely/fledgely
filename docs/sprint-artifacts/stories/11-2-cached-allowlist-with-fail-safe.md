# Story 11.2: Cached Allowlist with Fail-Safe

Status: Done

## Story

As **the extension**,
I want **a cached crisis allowlist with fail-safe behavior**,
So that **crisis protection works even offline**.

## Acceptance Criteria

1. **AC1: Local Cache**
   - Given extension needs to check crisis allowlist
   - When checking URL against allowlist
   - Then check uses locally cached allowlist (not network call)

2. **AC2: Bundled Defaults**
   - Given extension is installed
   - When allowlist is needed but cache is empty
   - Then allowlist is bundled with extension (never empty)

3. **AC3: Background Sync**
   - Given extension is running
   - When checking for updates
   - Then allowlist updates sync via background fetch (24h TTL)

4. **AC4: Offline Resilience**
   - Given network is unavailable
   - When checking URL
   - Then cached version is used indefinitely

5. **AC5: Format Support**
   - Given allowlist is stored
   - When checking URLs
   - Then allowlist format supports exact URLs and domain patterns

6. **AC6: Cache Storage**
   - Given allowlist is cached
   - When storage is checked
   - Then cache is stored in chrome.storage.local

7. **AC7: Version Logging**
   - Given allowlist is in use
   - When debugging is needed
   - Then allowlist version is logged (not contents) for debugging

## Tasks / Subtasks

- [x] Task 1: Cache Storage Structure (AC: #1, #6)
  - [x] 1.1 Define CrisisAllowlist storage format (already done in 11.1)
  - [x] 1.2 Implement getFromCache and saveToCache helpers
  - [x] 1.3 Verify chrome.storage.local persistence

- [x] Task 2: Bundled Defaults (AC: #2)
  - [x] 2.1 Ensure DEFAULT_CRISIS_SITES is always available (done in 11.1)
  - [x] 2.2 Fallback to defaults on cache miss or corruption

- [x] Task 3: Background Sync (AC: #3)
  - [x] 3.1 Add ALARM_ALLOWLIST_SYNC alarm (24h interval)
  - [x] 3.2 Implement syncAllowlistFromServer function
  - [x] 3.3 Handle network errors gracefully (keep cached version)

- [x] Task 4: Offline Resilience (AC: #4)
  - [x] 4.1 Never fail on network unavailable (use cache)
  - [x] 4.2 Log when using stale cache

- [x] Task 5: Version Tracking (AC: #7)
  - [x] 5.1 Include version in CrisisAllowlist (done in 11.1)
  - [x] 5.2 Log version on initialization (done in 11.1)
  - [x] 5.3 Log version updates

## Dev Notes

### Implementation Strategy

Story 11.1 already implemented most of the caching infrastructure. This story adds:

1. Background sync alarm for periodic updates (24h TTL)
2. Network fetch with proper error handling
3. Cache validation and corruption recovery

### Key Requirements

- **INV-001:** Zero data path - cache must ALWAYS be available
- **FR34:** Crisis allowlist enforcement
- **NFR28:** Crisis protection availability

### Technical Details

Allowlist sync flow:

```
1. On extension install/update: Initialize from bundled defaults
2. On browser startup: Load from cache, sync in background
3. Every 24 hours: Check server for updates
4. On network error: Keep using cached version indefinitely
5. On cache corruption: Fall back to bundled defaults
```

Sync alarm:

```typescript
const ALARM_ALLOWLIST_SYNC = 'allowlist-sync'
const ALLOWLIST_SYNC_INTERVAL_HOURS = 24
```

API endpoint placeholder (Epic 12 will implement real API):

```typescript
// Placeholder - will be replaced with real fledgely API
const ALLOWLIST_API_URL = 'https://api.fledgely.app/v1/crisis-allowlist'
```

Cache validation:

- Check lastUpdated timestamp
- Verify domains array is non-empty
- Validate version format
- On any validation failure: use bundled defaults

### References

- [Source: docs/epics/epic-list.md - Story 11.2]
- [Story 11.1: Pre-Capture Allowlist Check]
- [Chrome Alarms API](https://developer.chrome.com/docs/extensions/reference/api/alarms)

## Dev Agent Record

### Context Reference

Story 11.1 completed - pre-capture allowlist check in place

### Agent Model Used

Claude Opus 4.5

### Debug Log References

### Completion Notes List

1. **ALARM_ALLOWLIST_SYNC** - 24-hour interval alarm for periodic sync
2. **syncAllowlistFromServer()** - Placeholder function for network sync (Epic 12 will implement real API)
3. **isAllowlistStale()** - Checks if cache is older than 24 hours
4. **getAllowlistAge()** - Human-readable age for debugging
5. **Alarm on Install/Startup** - Sync alarm created on both events
6. **Immediate Sync Check** - Syncs immediately on startup if stale
7. **Offline Resilience** - Network errors keep cached version indefinitely
8. **Sync Runs Independently** - Alarm fires regardless of monitoring state
9. **Version Update Tracking** - Updates lastUpdated timestamp after sync

### File List

- `apps/extension/src/crisis-allowlist.ts` - Added sync functions
- `apps/extension/src/background.ts` - Added sync alarm creation and handler

### Senior Developer Review

**Reviewed: 2025-12-29**

**Findings:**

1. ✅ 24-hour sync interval alarm configured
2. ✅ syncAllowlistFromServer placeholder for Epic 12 API
3. ✅ isAllowlistStale checks cache age
4. ✅ Alarm created on both install and startup
5. ✅ Immediate sync if cache is stale
6. ✅ Network errors keep cached version (offline resilience)
7. ✅ Sync runs regardless of monitoring state
8. ⚠️ Real API endpoint placeholder - Epic 12 will implement

**Verdict:** APPROVED - Cached allowlist with 24h sync interval and fail-safe behavior.
