# Story 7.7: Allowlist Distribution & Sync

Status: done

## Story

As **the system**,
I want **all platforms to have synchronized allowlists**,
So that **protection is consistent regardless of device type**.

## Acceptance Criteria

1. **AC1: API Integration**
   - Given any platform agent (extension, Android, iOS)
   - When allowlist sync occurs
   - Then each platform fetches from `GET /api/crisis-allowlist`
   - And receives version, lastUpdated, and resources array

2. **AC2: 24-Hour TTL with Forced Refresh**
   - Given extension has cached allowlist
   - When 24 hours have passed OR app launches
   - Then sync is triggered
   - And forced refresh occurs on extension startup

3. **AC3: Fail-Safe Caching**
   - Given sync network request fails
   - When extension needs allowlist
   - Then cached version is used (never empty)
   - And bundled defaults serve as ultimate fallback

4. **AC4: Version Mismatch Re-Sync**
   - Given device has cached allowlist version X
   - When API returns version Y (where Y != X)
   - Then device immediately re-syncs
   - And stale cache is replaced with new version

5. **AC5: Format Transformation**
   - Given API returns CrisisResource[] format
   - When extension processes response
   - Then resources are transformed to domain list for matching
   - And aliases and patterns are expanded

6. **AC6: Sync Status Monitoring (Deferred)**
   - Given monitoring infrastructure exists
   - When platform allowlist is >48h stale
   - Then alert is triggered
   - NOTE: Requires ops infrastructure - defer to future story

## Tasks / Subtasks

### Task 1: Update syncAllowlistFromServer() to Call Real API ✅

**Files:**

- `apps/extension/src/crisis-allowlist.ts`

**Implementation:**
1.1 Replace placeholder sync with fetch to `GET /getCrisisAllowlist` ✅
1.2 Use Firebase Functions URL (from environment or config) ✅
1.3 Handle CORS and authentication (public endpoint - no auth needed) ✅
1.4 Parse JSON response with version, lastUpdated, resources ✅

### Task 2: Transform CrisisResource[] to Domain List ✅

**Files:**

- `apps/extension/src/crisis-allowlist.ts`

**Implementation:**
2.1 Create transformResourcesToDomains() function ✅
2.2 Extract domain from each CrisisResource ✅
2.3 Expand aliases array into additional domains ✅
2.4 Pattern field N/A - subdomain/fuzzy matching handles wildcard use cases ✅
2.5 Return string[] for domain set building ✅

### Task 3: Implement Version Check and Immediate Re-Sync ✅

**Files:**

- `apps/extension/src/crisis-allowlist.ts`

**Implementation:**
3.1 Store current cached version ✅
3.2 Compare API version with cached version ✅
3.3 If version mismatch, trigger immediate cache update ✅
3.4 Log version transitions for debugging ✅

### Task 4: Add Forced Refresh on Extension Startup ✅

**Files:**

- `apps/extension/src/background.ts`

**Implementation:**
4.1 Force sync on extension startup (always sync, not just when stale) ✅
4.2 Ensure sync happens on browser startup (not just 24h timer) ✅
4.3 Non-blocking startup sync with fail-safe error handling ✅

### Task 5: Add Unit Tests ✅

**Files:**

- `apps/extension/src/crisis-allowlist.test.ts`

**Implementation:**
5.1 Test transformResourcesToDomains() function (8 tests) ✅
5.2 Test version comparison logic ✅
5.3 Test API fetch with mock responses ✅
5.4 Test error handling (network failures) ✅
5.5 Test cache update on successful sync ✅

## Dev Notes

### Architecture Compliance

- **No Auth Required**: API endpoint is public for fail-safe crisis protection
- **Chrome Extension APIs**: Use `fetch()` for HTTP, `chrome.storage.local` for cache
- **Direct Firebase SDK**: Not used in extension - uses HTTP endpoint
- **Error Handling**: ALWAYS fall back to cache/bundled on any error

### Critical Security Notes

- Public API endpoint - no authentication needed
- Never log the actual allowlist contents (privacy)
- Only log version numbers and sync status
- Fail-safe: any error = use cached version

### API Response Format

```typescript
// From Story 7-4: GetAllowlistResponse
interface GetAllowlistResponse {
  version: string // "1.0.5"
  lastUpdated: string // ISO timestamp
  resources: CrisisResource[]
}

// CrisisResource from @fledgely/shared
interface CrisisResource {
  id: string
  domain: string // Primary domain
  pattern: string | null // Optional URL pattern
  category: string // crisis_general, suicide_prevention, etc.
  name: string
  description: string
  phone: string | null
  text: string | null
  aliases: string[] // Additional domains/variations
  regional: boolean
}
```

### Domain Transformation Logic

```typescript
function transformResourcesToDomains(resources: CrisisResource[]): string[] {
  const domains: string[] = []
  for (const resource of resources) {
    // Add primary domain
    domains.push(resource.domain)
    // Add all aliases
    if (resource.aliases) {
      domains.push(...resource.aliases)
    }
  }
  return domains
}
```

### API URL Configuration

```typescript
// Firebase Functions URL (hardcoded for extension - single deployment target)
const FIREBASE_PROJECT_ID = 'fledgely-cns-me'
const FIREBASE_REGION = 'us-central1'
const CRISIS_ALLOWLIST_API = `https://${FIREBASE_REGION}-${FIREBASE_PROJECT_ID}.cloudfunctions.net/getCrisisAllowlist`
```

### Existing Code References

- **API Endpoint (Story 7-4)**: `apps/functions/src/http/crisis-allowlist/getCrisisAllowlist.ts`
- **Extension Caching (Story 11-2)**: `apps/extension/src/crisis-allowlist.ts`
- **Background Service**: `apps/extension/src/background.ts`
- **Crisis Resource Types**: `packages/shared/src/constants/crisis-urls.ts`

### Previous Story Intelligence (7-4)

- API returns `GetAllowlistResponse` with version, lastUpdated, resources[]
- Cache headers: `Cache-Control: public, max-age=3600, stale-while-revalidate=86400`
- ETag support for conditional requests
- 304 Not Modified response on version match

### Testing Requirements

- Unit tests for domain transformation
- Unit tests for version comparison
- Mock fetch for API response tests
- Test offline/error scenarios
- Minimum 10 tests

## Dev Agent Record

### Context Reference

Epic 7: Crisis Allowlist Foundation

- FR61: System maintains a public crisis allowlist
- NFR28: Crisis allowlist cached locally; functions without cloud connectivity
- Story 7-4 provides the API endpoint
- Story 11-2 provides caching infrastructure

### Agent Model Used

claude-opus-4-5-20251101

### Completion Notes List

- All 5 tasks completed successfully
- Replaced placeholder sync with real API call to getCrisisAllowlist endpoint
- Added transformResourcesToDomains() to extract domains from API response
- Implemented version checking with If-None-Match header support
- Added forced sync on extension startup (always syncs, not just when stale)
- Merges API domains with bundled defaults for fail-safe protection
- 19 new Story 7.7 tests added (142 total tests in file)
- TypeScript compilation clean
- Code review: Fixed unused import, updated documentation

### File List

- `apps/extension/src/crisis-allowlist.ts` - Updated sync function, added transform, API URL
- `apps/extension/src/crisis-allowlist.test.ts` - Added 19 Story 7.7 tests
- `apps/extension/src/background.ts` - Updated startup sync to always force refresh, removed unused import
- `docs/sprint-artifacts/sprint-status.yaml` - Updated story status

## Change Log

| Date       | Change                                             |
| ---------- | -------------------------------------------------- |
| 2026-01-04 | Story created with ready-for-dev status            |
| 2026-01-04 | Implementation complete, moved to review           |
| 2026-01-04 | Code review: Fixed 5 issues, all HIGH/MEDIUM fixed |
