# Story 7.2: Crisis Visit Zero-Data-Path

Status: complete

## Story

As a **child visiting a crisis resource**,
I want **no trace of my visit to exist anywhere in fledgely**,
So that **I can seek help without fear of being discovered**.

## Acceptance Criteria

1. **Given** a child's device has monitoring active **When** child navigates to an allowlisted crisis URL **Then** NO screenshot is captured during the visit
2. **Given** a crisis URL visit **When** checking activity history **Then** NO URL is logged to activity history
3. **Given** a crisis URL visit **When** checking time tracking **Then** NO time is counted against any category
4. **Given** a crisis URL visit **When** checking notifications **Then** NO notification is generated for parents
5. **Given** a crisis URL visit **When** checking analytics **Then** NO analytics event is recorded
6. **Given** crisis URL detection **When** evaluating timing **Then** check happens BEFORE any capture attempt (synchronous blocking)
7. **Given** network timeout during allowlist check **When** fallback is needed **Then** falls back to cached allowlist (fail-safe to protection)

## Tasks / Subtasks

- [x] Task 1: Create Zero-Data-Path Service (AC: 1-5)
  - [x] 1.1: Create `apps/web/src/services/crisisProtectionService.ts`
  - [x] 1.2: Implement `shouldBlockMonitoring(url: string): boolean` function
  - [x] 1.3: Integrate `isCrisisUrl()` from `@fledgely/shared`
  - [x] 1.4: Create interface for blocking screenshot capture
  - [x] 1.5: Create interface for blocking URL logging
  - [x] 1.6: Create interface for blocking time tracking
  - [x] 1.7: Create interface for blocking notifications
  - [x] 1.8: Create interface for blocking analytics
  - [x] 1.9: Write unit tests for service

- [x] Task 2: Implement Synchronous Blocking Check (AC: 6)
  - [x] 2.1: Create `apps/web/src/hooks/useCrisisProtection.ts` hook
  - [x] 2.2: Implement synchronous URL check before any monitoring action
  - [x] 2.3: Ensure check is called BEFORE capture attempt (not async)
  - [x] 2.4: Add performance monitoring for check duration (<10ms target)
  - [x] 2.5: Write tests verifying synchronous blocking behavior

- [x] Task 3: Implement Cached Allowlist Fallback (AC: 7)
  - [x] 3.1: Create local storage caching in `apps/web/src/services/allowlistCacheService.ts`
  - [x] 3.2: Implement cache with 24h TTL
  - [x] 3.3: Implement network timeout handling (default to cached)
  - [x] 3.4: Ensure fail-safe behavior (network failure = use cached)
  - [x] 3.5: Add cache refresh on app launch
  - [x] 3.6: Write tests for fallback behavior

- [x] Task 4: Create Data Blocking Interfaces (AC: 1-5)
  - [x] 4.1: Create `CrisisProtectionGuard` type for monitoring hooks
  - [x] 4.2: Implement guard in screenshot capture flow (placeholder - actual capture in Epic 10)
  - [x] 4.3: Implement guard in activity logging flow
  - [x] 4.4: Implement guard in time tracking flow
  - [x] 4.5: Implement guard in notification flow
  - [x] 4.6: Implement guard in analytics flow
  - [x] 4.7: Export guard interface for native platforms to follow

- [x] Task 5: Create Crisis Allowlist API Endpoint (AC: 7)
  - [x] 5.1: Create `apps/functions/src/http/crisisAllowlist.ts`
  - [x] 5.2: Implement `GET /api/crisis-allowlist` endpoint
  - [x] 5.3: Return allowlist from `@fledgely/shared`
  - [x] 5.4: Add proper CORS headers for client fetching
  - [x] 5.5: Add rate limiting (1 req/min per client)
  - [x] 5.6: Write endpoint tests

- [x] Task 6: Integration Testing (AC: 1-7)
  - [x] 6.1: Create adversarial test file `apps/web/e2e/adversarial/crisis-protection.adversarial.ts`
  - [x] 6.2: Test that crisis URL visit produces ZERO logged data
  - [x] 6.3: Test synchronous blocking timing
  - [x] 6.4: Test fallback to cached allowlist on network failure
  - [x] 6.5: Test all crisis URLs from allowlist are protected
  - [x] 6.6: Verify INV-001 (Crisis URLs NEVER captured)

- [x] Task 7: Documentation and Types (AC: 1-7)
  - [x] 7.1: Add JSDoc to all public functions
  - [x] 7.2: Create types in `packages/contracts/src/crisis.schema.ts`
  - [x] 7.3: Export from `@fledgely/contracts`
  - [x] 7.4: Update project_context.md if needed

## Dev Notes

### Epic 7 Context: Crisis Allowlist Foundation

This story implements the **ZERO-DATA-PATH** - the most critical safety feature. When a child visits a crisis resource, the system must behave as if monitoring doesn't exist. This is not just "don't save" - it's "never even try to capture."

**Key Architectural Invariant (INV-001):** Crisis URLs NEVER captured - enforced by adversarial tests.

### Story 7.1 Foundation (DEPENDENCY)

Story 7.1 created the `@fledgely/shared` package with:
- `isCrisisUrl(url: string): boolean` - The primary check function
- `getCrisisAllowlist(): CrisisAllowlist` - Get all protected resources
- `getCrisisResourceByDomain(domain: string)` - Lookup by domain
- Wildcard pattern support (`*.988lifeline.org`)
- 18 crisis resources covering US, UK, Canada, Australia

**Import from:**
```typescript
import { isCrisisUrl, getCrisisAllowlist } from '@fledgely/shared'
```

### Zero-Data-Path Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MONITORING REQUEST                        │
│                    (Any capture/log action)                  │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              CRISIS PROTECTION GUARD                         │
│              shouldBlockMonitoring(url)                      │
│                                                              │
│  1. Check isCrisisUrl(url) - SYNCHRONOUS                    │
│  2. If true → BLOCK ALL (return immediately)                │
│  3. If false → allow monitoring to proceed                  │
└─────────────────────────┬───────────────────────────────────┘
                          │
              ┌───────────┴───────────┐
              │ Crisis URL?           │
              └───────────┬───────────┘
                    │           │
           ┌────────┘           └────────┐
           ▼ YES                    NO   ▼
┌─────────────────────┐    ┌─────────────────────┐
│ ZERO-DATA-PATH      │    │ NORMAL MONITORING   │
│ - No screenshot     │    │ - Screenshot OK     │
│ - No URL log        │    │ - Log activity      │
│ - No time tracking  │    │ - Track time        │
│ - No notification   │    │ - Send notifications│
│ - No analytics      │    │ - Record analytics  │
└─────────────────────┘    └─────────────────────┘
```

### Implementation Pattern

```typescript
// apps/web/src/services/crisisProtectionService.ts

import { isCrisisUrl } from '@fledgely/shared'

/**
 * Crisis Protection Service
 *
 * CRITICAL: This is a BLOCKING check. Must complete BEFORE any capture.
 * Never async. Never delayed. Never skipped.
 */

/**
 * Check if monitoring should be blocked for this URL
 * @param url - The URL being visited
 * @returns true if this is a crisis URL and ALL monitoring must be blocked
 */
export function shouldBlockMonitoring(url: string): boolean {
  // SYNCHRONOUS - no await, no promises
  return isCrisisUrl(url)
}

/**
 * Guard type for use in monitoring hooks
 */
export interface CrisisProtectionGuard {
  shouldBlock: (url: string) => boolean
}

/**
 * Default guard implementation
 */
export const crisisGuard: CrisisProtectionGuard = {
  shouldBlock: shouldBlockMonitoring
}
```

### Fallback Caching Pattern

```typescript
// apps/web/src/services/allowlistCacheService.ts

const CACHE_KEY = 'fledgely_crisis_allowlist'
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

interface CachedAllowlist {
  data: CrisisAllowlist
  cachedAt: number
}

/**
 * Get allowlist with fallback to cache
 *
 * FAIL-SAFE: If network fails, ALWAYS use cached version.
 * A missing/stale allowlist must NEVER result in capturing crisis visits.
 */
export async function getAllowlistWithFallback(): Promise<CrisisAllowlist> {
  try {
    const response = await fetch('/api/crisis-allowlist', {
      signal: AbortSignal.timeout(5000) // 5s timeout
    })
    if (response.ok) {
      const data = await response.json()
      saveToCache(data)
      return data
    }
  } catch {
    // Network error - use cached
  }

  return getFromCacheOrBundled()
}
```

### API Endpoint Pattern

```typescript
// apps/functions/src/http/crisisAllowlist.ts

import { onRequest } from 'firebase-functions/v2/https'
import { getCrisisAllowlist, getAllowlistVersion } from '@fledgely/shared'

export const crisisAllowlistEndpoint = onRequest(
  { cors: true, memory: '128MiB' },
  async (req, res) => {
    // Rate limiting via Firebase App Check or custom

    if (req.method !== 'GET') {
      res.status(405).send('Method not allowed')
      return
    }

    const allowlist = getCrisisAllowlist()

    // Cache headers for client caching
    res.set('Cache-Control', 'public, max-age=86400') // 24h
    res.set('ETag', getAllowlistVersion())

    res.json(allowlist)
  }
)
```

### Adversarial Test Pattern (Required)

```typescript
// apps/web/e2e/adversarial/crisis-protection.adversarial.ts

import { test, expect } from '@playwright/test'
import { getCrisisAllowlist } from '@fledgely/shared'

test.describe('INV-001: Crisis URLs NEVER captured', () => {
  test('visiting 988lifeline.org produces zero activity records', async ({ page }) => {
    // Setup: Login as child with active monitoring
    await loginAsChild(page, testChild)

    // Visit crisis resource
    await page.goto('https://988lifeline.org')
    await page.waitForTimeout(5000) // Wait for any capture attempts

    // Verify: NO activity logged
    const activities = await getChildActivities(testChild.id)
    expect(activities.filter(a => a.url?.includes('988lifeline'))).toHaveLength(0)

    // Verify: NO screenshots captured
    const screenshots = await getChildScreenshots(testChild.id)
    const crisisScreenshots = screenshots.filter(s =>
      s.timestamp > testStartTime && s.url?.includes('988lifeline')
    )
    expect(crisisScreenshots).toHaveLength(0)
  })

  test('all allowlisted URLs trigger zero-data-path', async ({ page }) => {
    const allowlist = getCrisisAllowlist()

    for (const entry of allowlist.entries) {
      // Visit each crisis resource
      await page.goto(`https://${entry.domain}`)

      // Verify zero capture
      // ...
    }
  })
})
```

### Key NFRs

- **NFR28:** Allowlist must be cached locally (fail-safe to protection)
- **NFR42:** WCAG 2.1 AA accessibility (not applicable - no UI in this story)

### Key FRs

- **FR61:** Crisis resources protected from monitoring
- **FR62:** Allowlist synchronized across platforms
- **FR63:** Version control for sync verification

### Project Context Integration

Per `project_context.md`:
- **Rule 3:** Crisis Allowlist Check FIRST - synchronous blocking check BEFORE any capture
- **INV-001:** Crisis URLs NEVER captured - enforced by adversarial test
- Crisis allowlist sync: `GET /api/crisis-allowlist` (24h TTL, fallback to cached)

### Testing Standards

**Unit tests for:**
- `shouldBlockMonitoring()` function
- Cache service read/write
- Fallback behavior on network failure

**Adversarial tests for:**
- INV-001: Zero-data-path verification
- All allowlisted URLs protected
- Timing verification (sync before capture)

### Git Commit Pattern

```
feat(Story 7.2): Crisis Visit Zero-Data-Path - implement synchronous blocking
```

### Dependencies

- **Requires:** Story 7.1 (Crisis Allowlist Data Structure) - DONE
- **Enables:** Story 7.3 (Child Allowlist Visibility)
- **Enables:** Story 7.9 (Cross-Platform Allowlist Testing)

### References

- [Source: docs/epics/epic-list.md#Story-7.2] - Original acceptance criteria
- [Source: docs/project_context.md] - Crisis allowlist check rules and INV-001
- [Source: docs/sprint-artifacts/stories/7-1-crisis-allowlist-data-structure.md] - Foundation implementation

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

<!-- Debug log references will be added during implementation -->

### Completion Notes List

1. All 7 tasks completed with 93+ tests across all files
2. Task 1: Created crisisProtectionService with shouldBlockMonitoring and crisisGuard
3. Task 2: Created useCrisisProtection hook with synchronous blocking and measureCheckDuration
4. Task 3: Created allowlistCacheService with 24h TTL, network fallback, bundled fallback, and retry logic
5. Task 4: Created crisisGuards module with individual guards for each monitoring type and platform interface
6. Task 5: Created crisisAllowlistEndpoint HTTP endpoint with rate limiting and ETag support
7. Task 6: Created adversarial tests verifying INV-001 (Crisis URLs NEVER captured)
8. Task 7: Created crisis.schema.ts in contracts and exported all types

### Implementation Notes

**Serverless Rate Limiting:**
The crisisAllowlist.ts endpoint uses in-memory rate limiting via a Map. In serverless environments like Firebase Functions, each invocation is isolated, so the rate limit store is ephemeral. This provides basic rate limiting during sustained traffic but resets on cold starts. For production scalability, consider using Firebase Realtime Database or Redis. The cleanup function runs at the start of each request rather than using setInterval (which doesn't work in serverless).

**Network Retry Logic:**
The allowlistCacheService implements retry logic with exponential backoff (up to 2 retries with increasing delays). Non-retryable status codes (404, 401) fail immediately, while 5xx errors and network failures trigger retries. The fail-safe always falls back to cached or bundled allowlist.

### File List

**Created:**
- `apps/web/src/services/crisisProtectionService.ts` - Main zero-data-path service
- `apps/web/src/services/crisisProtectionService.test.ts` - 24 unit tests
- `apps/web/src/hooks/useCrisisProtection.ts` - React hook for crisis protection
- `apps/web/src/hooks/useCrisisProtection.test.ts` - 15 unit tests
- `apps/web/src/services/allowlistCacheService.ts` - Cache service with fallback and retry logic
- `apps/web/src/services/allowlistCacheService.test.ts` - 31 unit tests
- `apps/web/src/services/crisisGuards.ts` - Individual guards for monitoring flows
- `apps/web/src/services/crisisGuards.test.ts` - 16 unit tests
- `apps/web/src/services/index.ts` - Services barrel export
- `apps/functions/src/http/crisisAllowlist.ts` - HTTP endpoint
- `apps/functions/src/http/crisisAllowlist.test.ts` - 12 unit tests
- `apps/web/e2e/adversarial/crisis-protection.adversarial.ts` - Adversarial tests
- `packages/contracts/src/crisis.schema.ts` - Type definitions
- `packages/contracts/src/crisis.schema.test.ts` - 28 unit tests

**Modified:**
- `apps/functions/src/index.ts` - Added crisisAllowlistEndpoint export
- `packages/contracts/src/index.ts` - Added crisis schema exports
