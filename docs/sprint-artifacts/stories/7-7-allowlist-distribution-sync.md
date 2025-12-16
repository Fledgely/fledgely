# Story 7.7: Allowlist Distribution & Sync

Status: completed

## Story

As **the system**,
I want **all platforms to have synchronized allowlists**,
So that **protection is consistent regardless of device type**.

## Acceptance Criteria

1. **Given** fledgely operates on multiple platforms (web, Chrome, Android, iOS) **When** allowlist sync occurs **Then** each platform fetches from `GET /api/crisis-allowlist`
2. **Given** a platform syncs the allowlist **When** sync is triggered **Then** sync uses 24-hour TTL with forced refresh on app launch
3. **Given** sync is in progress **When** network fails **Then** cached version is used (never empty)
4. **Given** a client has a cached version **When** server version differs **Then** version mismatch triggers immediate re-sync
5. **Given** all network options fail **When** allowlist is needed **Then** platform-specific bundled copies serve as ultimate fallback
6. **Given** allowlist sync is monitored **When** any platform is >48h stale **Then** alerts are triggered

## Tasks / Subtasks

- [ ] Task 1: Create Allowlist Sync Status Schema (AC: 6)
  - [ ] 1.1: Create `packages/contracts/src/allowlistSync.schema.ts`
  - [ ] 1.2: Define `allowlistSyncStatusSchema` with fields: platform, version, lastSyncAt, isStale, cacheAge
  - [ ] 1.3: Define `allowlistPlatformSchema` enum: 'web', 'chrome-extension', 'android', 'ios'
  - [ ] 1.4: Define `allowlistSyncAlertSchema` for stale alerts
  - [ ] 1.5: Export from `@fledgely/contracts`
  - [ ] 1.6: Write schema validation tests

- [ ] Task 2: Create Platform-Agnostic Sync Service Interface (AC: 1, 2)
  - [ ] 2.1: Create `packages/shared/src/services/allowlistSyncService.ts`
  - [ ] 2.2: Define `AllowlistSyncConfig` interface with TTL, endpoint, platform
  - [ ] 2.3: Define `AllowlistSyncAdapter` interface for platform-specific storage
  - [ ] 2.4: Implement `createAllowlistSyncService(config, adapter)` factory
  - [ ] 2.5: Implement `sync()` method with TTL-based caching
  - [ ] 2.6: Implement `forceSync()` method for app launch
  - [ ] 2.7: Write unit tests for sync service

- [ ] Task 3: Implement Version Comparison Logic (AC: 4)
  - [ ] 3.1: Add `shouldResync(cachedVersion: string, serverVersion: string): boolean` to sync service
  - [ ] 3.2: Handle semantic version comparison (1.0.0 vs 1.0.1)
  - [ ] 3.3: Handle emergency version format (1.0.0-emergency-abc123)
  - [ ] 3.4: Emergency versions always trigger immediate re-sync
  - [ ] 3.5: Write version comparison tests

- [ ] Task 4: Implement Fail-Safe Fallback Chain (AC: 3, 5)
  - [ ] 4.1: Implement fallback chain: Network → Cache → Bundled
  - [ ] 4.2: Ensure bundled allowlist is always available as ultimate fallback
  - [ ] 4.3: Never return empty allowlist - always fall back to bundled
  - [ ] 4.4: Log fallback events for monitoring (NOT query data - just "used cache" or "used bundled")
  - [ ] 4.5: Write tests for each fallback scenario

- [ ] Task 5: Implement Web Platform Adapter (AC: 1-5)
  - [ ] 5.1: Refactor `apps/web/src/services/allowlistCacheService.ts` to use sync service
  - [ ] 5.2: Implement `WebAllowlistAdapter` with localStorage
  - [ ] 5.3: Ensure backward compatibility with existing cache
  - [ ] 5.4: Update `refreshCacheOnLaunch()` to use new sync service
  - [ ] 5.5: Write adapter tests

- [ ] Task 6: Create Chrome Extension Adapter Interface (AC: 1-5)
  - [ ] 6.1: Create `packages/shared/src/adapters/chromeExtensionAdapter.ts`
  - [ ] 6.2: Define adapter using `chrome.storage.local` (mock for now)
  - [ ] 6.3: Document integration for Epic 11 (Chromebook Extension)
  - [ ] 6.4: Write adapter interface tests

- [ ] Task 7: Generate Platform-Specific Bundled Allowlist Files (AC: 5)
  - [ ] 7.1: Create build script `scripts/generate-crisis-allowlist.ts`
  - [ ] 7.2: Generate `packages/shared/crisis-allowlist.json` from TypeScript data
  - [ ] 7.3: Document placement for Android (`assets/crisis-allowlist.json`)
  - [ ] 7.4: Document placement for iOS (`Resources/crisis-allowlist.json`)
  - [ ] 7.5: Add npm script `generate:allowlist` to build process
  - [ ] 7.6: Write script tests

- [ ] Task 8: Implement Sync Status Monitoring (AC: 6)
  - [ ] 8.1: Create `apps/functions/src/scheduled/allowlistSyncMonitor.ts`
  - [ ] 8.2: Implement scheduled function that runs every 12 hours
  - [ ] 8.3: Check Firestore for platform sync status documents
  - [ ] 8.4: Alert if any platform has lastSyncAt > 48 hours old
  - [ ] 8.5: Log monitoring results (no PII - just platform and staleness)
  - [ ] 8.6: Write function tests with emulators

- [ ] Task 9: Create Sync Status Reporting Endpoint (AC: 6)
  - [ ] 9.1: Create `apps/functions/src/http/allowlistSyncStatus.ts`
  - [ ] 9.2: POST endpoint for platforms to report sync status
  - [ ] 9.3: Store in Firestore `allowlist-sync-status/{platform}` collection
  - [ ] 9.4: GET endpoint for admin to view all platform sync statuses
  - [ ] 9.5: Rate limit to prevent spam (1 report per platform per hour)
  - [ ] 9.6: Write endpoint tests

- [ ] Task 10: Integration Testing (AC: 1-6)
  - [ ] 10.1: Create `packages/shared/src/services/__tests__/allowlistSyncService.integration.test.ts`
  - [ ] 10.2: Test sync with mock server (24h TTL behavior)
  - [ ] 10.3: Test version mismatch re-sync
  - [ ] 10.4: Test complete fallback chain
  - [ ] 10.5: Test web platform adapter end-to-end
  - [ ] 10.6: Verify zero-data-path (no URL logging during sync)

## Dev Notes

### Epic 7 Context: Crisis Allowlist Foundation

This story implements **ALLOWLIST DISTRIBUTION & SYNC** to ensure all platforms (web, Chrome extension, Android, iOS) have consistent crisis URL protection. The key design principle is **fail-safe to protection** - if anything fails, we ALWAYS fall back to a valid allowlist.

**Critical Requirements:**
1. Never return an empty allowlist - bundled copy is ultimate fallback
2. Sync status monitoring to detect stale platforms (>48h)
3. Emergency versions (from Story 7.4) trigger immediate re-sync
4. Platform-agnostic sync service with platform-specific adapters

### Previous Story Foundation (Stories 7.1-7.6)

Built upon existing infrastructure:
- `@fledgely/shared` package with crisis URL data (`packages/shared/src/constants/crisis-urls/`)
- `getCrisisAllowlist()` returns bundled allowlist
- `getAllowlistVersion()` returns version string
- `GET /api/crisis-allowlist` endpoint (`apps/functions/src/http/crisisAllowlist.ts`)
- `allowlistCacheService.ts` with localStorage caching
- Emergency version format: `1.0.0-emergency-{pushId}`

### Existing Infrastructure to Leverage

**API Endpoint (already exists):**
```typescript
// apps/functions/src/http/crisisAllowlist.ts
// GET /api/crisis-allowlist
// Returns: { version, lastUpdated, entries: CrisisUrlEntry[] }
// Headers: ETag, Cache-Control
```

**Web Cache Service (refactor to use sync service):**
```typescript
// apps/web/src/services/allowlistCacheService.ts
// - 24h TTL (normal) / 1h TTL (emergency)
// - ETag-based conditional fetch
// - Fallback chain: Network → Cache → Bundled
```

**Bundled Allowlist:**
```typescript
// packages/shared/src/constants/crisis-urls/data.ts
// - CRISIS_ALLOWLIST_ENTRIES array
// - getCrisisAllowlist() function
```

### Sync Service Architecture

```typescript
// packages/shared/src/services/allowlistSyncService.ts

interface AllowlistSyncConfig {
  platform: 'web' | 'chrome-extension' | 'android' | 'ios'
  endpoint: string
  ttlMs: number
  emergencyTtlMs: number
  networkTimeoutMs: number
}

interface AllowlistSyncAdapter {
  getFromCache(): Promise<CachedAllowlist | null>
  saveToCache(allowlist: CrisisAllowlist): Promise<void>
  getBundled(): CrisisAllowlist
  reportSyncStatus(status: AllowlistSyncStatus): Promise<void>
}

function createAllowlistSyncService(
  config: AllowlistSyncConfig,
  adapter: AllowlistSyncAdapter
): AllowlistSyncService
```

### Platform-Specific Adapters

| Platform | Storage | Cache Key | Notes |
|----------|---------|-----------|-------|
| Web | localStorage | `fledgely_crisis_allowlist` | Already exists |
| Chrome Extension | chrome.storage.local | `crisis_allowlist` | Future Epic 11 |
| Android | Room database | `CrisisAllowlistEntity` | Future Epic 14 |
| iOS | CoreData | `CrisisAllowlist` | Future Epic 43 |

### Version Comparison Logic

```typescript
function shouldResync(cached: string, server: string): boolean {
  // Emergency versions ALWAYS trigger re-sync
  if (isEmergencyVersion(server) && cached !== server) {
    return true
  }

  // Semantic version comparison
  const cachedParsed = parseAllowlistVersion(cached)
  const serverParsed = parseAllowlistVersion(server)

  return compareVersions(serverParsed, cachedParsed) > 0
}
```

### Sync Status Monitoring

```typescript
// Firestore: allowlist-sync-status/{platform}
interface AllowlistSyncStatus {
  platform: 'web' | 'chrome-extension' | 'android' | 'ios'
  version: string
  lastSyncAt: string // ISO timestamp
  cacheAge: number // milliseconds
  isStale: boolean // > 48h since last sync
}

// Scheduled function checks every 12 hours
// Alerts if any platform > 48h stale
```

### Project Context Alignment

Per `project_context.md`:
- **Rule 1:** Types from Zod - create schemas in `@fledgely/contracts`
- **Rule 2:** Firebase SDK direct - no abstractions for Firestore
- **Rule 3:** Crisis allowlist check FIRST - this story ensures allowlist availability
- **Rule 5:** Functions delegate to services

Per Crisis Allowlist Distribution section:
- TypeScript: `@fledgely/shared/constants/crisis-urls`
- Android: `assets/crisis-allowlist.json`
- iOS: `Resources/crisis-allowlist.json`
- Sync: `GET /api/crisis-allowlist` (24h TTL, fallback to cached)

### Testing Standards

Per `project_context.md`:
- Unit tests: `*.test.ts` (co-located)
- Integration tests: `*.integration.test.ts`
- Test emulators for Firestore operations
- NEVER mock security rules

**Critical Tests:**
1. Version comparison for semantic versions
2. Emergency version detection and re-sync
3. Fallback chain (Network → Cache → Bundled)
4. Stale detection (>48h alert)
5. Platform adapter storage/retrieval

### File Structure

```
packages/shared/src/
├── services/
│   ├── allowlistSyncService.ts      # Platform-agnostic sync service
│   └── __tests__/
│       └── allowlistSyncService.test.ts
├── adapters/
│   └── chromeExtensionAdapter.ts    # Chrome storage adapter interface
├── crisis-allowlist.json            # Generated JSON for native platforms

packages/contracts/src/
├── allowlistSync.schema.ts          # Sync status schemas
└── allowlistSync.schema.test.ts

apps/functions/src/
├── scheduled/
│   └── allowlistSyncMonitor.ts      # 12-hour monitoring function
└── http/
    └── allowlistSyncStatus.ts       # Sync status reporting endpoint

apps/web/src/services/
├── allowlistCacheService.ts         # Refactored to use sync service
└── webAllowlistAdapter.ts           # Web platform adapter

scripts/
└── generate-crisis-allowlist.ts     # JSON generation script
```

### Git Commit Pattern

```
feat(story-7.7): Allowlist Distribution & Sync - cross-platform consistency
```

### Dependencies

- **Requires:** Story 7.1 (Crisis Allowlist Data Structure) - DONE
- **Requires:** Story 7.2 (Crisis Visit Zero-Data-Path) - DONE
- **Requires:** Story 7.4 (Emergency Allowlist Push) - DONE
- **Enables:** Epic 11 (Chromebook Extension) - uses Chrome adapter
- **Enables:** Epic 14 (Android Agent) - uses generated JSON
- **Enables:** Epic 43 (iOS Integration) - uses generated JSON

### References

- [Source: docs/epics/epic-list.md#Story-7.7] - Original acceptance criteria
- [Source: docs/project_context.md] - Types from Zod, Firebase direct rules
- [Source: docs/project_context.md#Crisis-Allowlist-Distribution] - Platform bundling
- [Source: apps/functions/src/http/crisisAllowlist.ts] - Existing API endpoint
- [Source: apps/web/src/services/allowlistCacheService.ts] - Existing cache service
- [Source: packages/shared/src/constants/crisis-urls/] - Bundled allowlist data
- [Source: docs/sprint-artifacts/stories/7-6-crisis-search-redirection.md] - Previous story

## Dev Agent Record

### Context Reference

Story 7.7 - Continued from previous session

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- All tests pass: 333 tests in shared package, 988 tests in functions package
- Integration tests verify full sync workflow, TTL caching, fallback chain, and zero-data-path

### Completion Notes List

1. Task 1: Created comprehensive Zod schemas in `@fledgely/contracts` for sync status, alerts, and platform types
2. Task 2: Implemented platform-agnostic `createAllowlistSyncService()` factory function with adapter pattern
3. Task 3: Version comparison logic handles semantic versions and emergency versions
4. Task 4: Fail-safe fallback chain: Network → Cache → Bundled (never returns empty)
5. Task 5: Web platform adapter uses localStorage with TTL-based caching
6. Task 6: Chrome extension adapter interface ready for Epic 11 implementation
7. Task 7: Export script generates JSON for all platforms (web, android, ios, chrome-extension)
8. Task 8: Scheduled monitoring function checks all platforms every 12 hours
9. Task 9: HTTP endpoints for POST (report status) and GET (admin view) sync status
10. Task 10: Integration tests verify all acceptance criteria

### File List

**Created:**
- `packages/shared/src/services/allowlistSyncService.ts` - Platform-agnostic sync service
- `packages/shared/src/services/__tests__/allowlistSyncService.test.ts` - Unit tests (42 tests)
- `packages/shared/src/services/__tests__/allowlistSyncService.integration.test.ts` - Integration tests (18 tests)
- `packages/shared/src/adapters/chromeExtensionAdapter.ts` - Chrome extension adapter interface
- `packages/shared/src/adapters/__tests__/chromeExtensionAdapter.test.ts` - Chrome adapter tests (9 tests)
- `packages/shared/scripts/__tests__/export-allowlist.test.ts` - Export script tests (16 tests)
- `apps/web/src/services/webAllowlistAdapter.ts` - Web platform adapter
- `apps/web/src/services/__tests__/webAllowlistAdapter.test.ts` - Web adapter tests (20 tests)
- `apps/functions/src/scheduled/allowlistSyncMonitor.ts` - Scheduled monitoring function
- `apps/functions/src/scheduled/allowlistSyncMonitor.test.ts` - Monitoring tests (9 tests)
- `apps/functions/src/http/allowlistSyncStatus.ts` - HTTP sync status endpoint
- `apps/functions/src/http/allowlistSyncStatus.test.ts` - Endpoint tests (12 tests)

**Modified:**
- `packages/contracts/src/allowlistSync.schema.ts` - Added sync constants and helper functions
- `packages/contracts/src/index.ts` - Added sync schema exports
- `packages/shared/src/index.ts` - Added sync service and Chrome adapter exports
- `packages/shared/scripts/export-allowlist.ts` - Added web and chrome-extension platforms, updated documentation
- `packages/shared/package.json` - Added `generate:allowlist` script alias
- `apps/web/src/services/allowlistCacheService.ts` - Refactored to use sync service
- `apps/web/src/services/allowlistCacheService.test.ts` - Updated tests for new behavior
