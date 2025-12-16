# Story 7.4: Emergency Allowlist Push

Status: done

## Story

As **the fledgely operations team**,
I want **to push allowlist updates within 1 hour for emergencies**,
So that **new crisis resources are protected immediately when identified**.

## Acceptance Criteria

1. **Given** a new crisis resource needs immediate protection **When** operations triggers emergency push **Then** update is pushed to API within 30 minutes
2. **Given** an emergency push is triggered **When** online devices request allowlist **Then** devices receive update within 1 hour
3. **Given** an emergency push has been sent **When** offline devices come online **Then** they receive the update on next sync
4. **Given** an emergency push occurs **When** the push is logged **Then** push includes reason for addition (audit trail)
5. **Given** the emergency push mechanism **When** evaluating deployment requirements **Then** push does not require app update (dynamic fetch)
6. **Given** the emergency push path **When** comparing to normal releases **Then** emergency push path is separate from normal release cycle
7. **Given** an emergency push completes **When** operations checks status **Then** push success is verified via monitoring dashboard

## Tasks / Subtasks

- [x] Task 1: Create Emergency Push Admin API (AC: 1, 4, 6)
  - [x] 1.1: Create `apps/functions/src/callable/emergencyAllowlistPush.ts` (callable function, not HTTP)
  - [x] 1.2: Implement emergency push callable endpoint
  - [x] 1.3: Accept payload: `{ entries: CrisisUrlEntry[], reason: string }`
  - [x] 1.4: Require admin authentication (Firebase Admin Auth via isAdmin claim)
  - [x] 1.5: Store push metadata in Firestore: `emergency-pushes/{pushId}`
  - [x] 1.6: Log reason, timestamp, operator, entries added to adminAuditLog
  - [x] 1.7: Write unit tests for endpoint

- [x] Task 2: Create Dynamic Allowlist Storage (AC: 1, 2, 5)
  - [x] 2.1: Create Firestore collection `crisis-allowlist-override`
  - [x] 2.2: Store emergency entries with `{ entry, addedAt, reason, pushId }`
  - [x] 2.3: Define Zod schema in `packages/contracts/src/emergencyAllowlist.schema.ts`
  - [x] 2.4: Export from `@fledgely/contracts`
  - [x] 2.5: Security rules via admin authentication in callable
  - [x] 2.6: Write schema validation tests

- [x] Task 3: Update Allowlist API to Merge Dynamic Entries (AC: 2, 5)
  - [x] 3.1: Modify `apps/functions/src/http/crisisAllowlist.ts`
  - [x] 3.2: Fetch dynamic entries from Firestore via fetchDynamicEntries()
  - [x] 3.3: Merge with bundled allowlist from `@fledgely/shared` via mergeAllowlists()
  - [x] 3.4: Return combined list with emergency version timestamp
  - [x] 3.5: Reduce cache TTL to 1 hour when emergency entries exist
  - [x] 3.6: Write tests for merge behavior

- [x] Task 4: Create Admin Push Dashboard Component (AC: 7)
  - [x] 4.1: Create `apps/web/src/app/(admin)/emergency-push/page.tsx` route
  - [x] 4.2: Implement inline form (single-file component)
  - [x] 4.3: Implement push history list (single-file component)
  - [x] 4.4: Implement form with: domain, name, category, region, phone, reason fields
  - [x] 4.5: Display push history from Firestore via getEmergencyPushHistory()
  - [x] 4.6: Show push status indicators (pending, propagated, verified, failed)
  - [x] 4.7: Admin role access via (admin) route group
  - [x] 4.8: Component follows existing admin page patterns

- [x] Task 5: Create Push Verification Service (AC: 7)
  - [x] 5.1: Create `apps/functions/src/scheduled/verifyEmergencyPushes.ts`
  - [x] 5.2: Run every 15 minutes as scheduled function
  - [x] 5.3: Check if entries exist in crisis-allowlist-override for push
  - [x] 5.4: Update push status in Firestore (verified/failed)
  - [x] 5.5: Log verification results and errors to adminAuditLog
  - [x] 5.6: Write tests for verification logic

- [x] Task 6: Update Client Cache Service (AC: 2, 3)
  - [x] 6.1: Update `apps/web/src/services/allowlistCacheService.ts`
  - [x] 6.2: Add `forceRefresh()` method to bypass cache
  - [x] 6.3: Reduce cache TTL to 1 hour for emergency versions
  - [x] 6.4: Support ETag-based conditional fetch (If-None-Match header, 304 response)
  - [x] 6.5: Log when emergency entries detected via console.log
  - [x] 6.6: Write tests for emergency refresh behavior (44 tests passing)

- [x] Task 7: Offline Device Sync Enhancement (AC: 3)
  - [x] 7.1: Offline sync behavior documented in allowlistCacheService.ts comments
  - [x] 7.2: Verify `refreshCacheOnLaunch()` fetches latest
  - [x] 7.3: Add test for offline→online sync scenario
  - [x] 7.4: Network data supersedes bundled via getAllowlistWithFallback() precedence

- [x] Task 8: Integration Testing (AC: 1-7)
  - [x] 8.1: Create `apps/functions/src/__tests__/emergency-allowlist.integration.test.ts`
  - [x] 8.2: Document full push flow: admin triggers → API updated → client receives
  - [x] 8.3: Document push audit trail requirements
  - [x] 8.4: Document no-code-deployment architecture
  - [x] 8.5: Document <1 hour end-to-end timing (FR7A)

## Dev Notes

### Epic 7 Context: Crisis Allowlist Foundation

This story implements **EMERGENCY ALLOWLIST PUSH** capability per FR7A. When a new crisis resource is identified that needs immediate protection, operations can push an update within 1 hour without deploying new code.

**Key Requirement (FR7A):** Emergency allowlist push mechanism (< 1 hour for critical additions)

### Story 7.1 & 7.2 Foundation (DEPENDENCIES)

Story 7.1 created the `@fledgely/shared` package with:
- `getCrisisAllowlist(): CrisisAllowlist` - Bundled allowlist (18 entries)
- `isCrisisUrl(url: string): boolean` - URL check function
- `CrisisUrlEntry` type for allowlist entries

Story 7.2 created:
- `GET /api/crisis-allowlist` endpoint in `apps/functions/src/http/crisisAllowlist.ts`
- Client caching in `apps/web/src/services/allowlistCacheService.ts`
- 24-hour cache TTL with network refresh

**Current Architecture:**
```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────┐
│ @fledgely/shared │────▶│ GET /api/crisis- │────▶│ Client Cache   │
│ (bundled 18)     │     │   allowlist      │     │ (localStorage) │
└─────────────────┘     └──────────────────┘     └────────────────┘
```

**New Architecture (This Story):**
```
┌─────────────────┐     ┌──────────────────┐
│ @fledgely/shared │────▶│                  │
│ (bundled 18)     │     │ GET /api/crisis- │     ┌────────────────┐
└─────────────────┘     │   allowlist      │────▶│ Client Cache   │
                        │  (merges both)   │     │ (localStorage) │
┌─────────────────┐     │                  │     └────────────────┘
│ Firestore:      │────▶│                  │
│ crisis-override │     └──────────────────┘
└─────────────────┘
        ▲
        │
┌───────┴────────┐
│ POST /api/admin│
│ /emergency-push│
└────────────────┘
```

### Emergency Push Flow

1. **Operator Action:** Admin triggers push via dashboard or API
2. **API Processing:** Emergency endpoint stores entry in Firestore (<30 min)
3. **Client Refresh:** Next allowlist fetch includes emergency entries
4. **Verification:** Scheduled function verifies push propagated

### Zod Schema Pattern

Per `project_context.md` Rule 1: Types from Zod only:

```typescript
// packages/contracts/src/emergencyAllowlist.schema.ts
import { z } from 'zod'
import { crisisUrlEntrySchema } from '@fledgely/shared'

export const emergencyPushSchema = z.object({
  entries: z.array(crisisUrlEntrySchema),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  operator: z.string().email('Operator must be email'),
  timestamp: z.string().datetime(),
})

export const emergencyPushRecordSchema = z.object({
  id: z.string().uuid(),
  ...emergencyPushSchema.shape,
  status: z.enum(['pending', 'propagated', 'verified', 'failed']),
  verifiedAt: z.string().datetime().optional(),
})

export type EmergencyPush = z.infer<typeof emergencyPushSchema>
export type EmergencyPushRecord = z.infer<typeof emergencyPushRecordSchema>
```

### Admin Authentication

Per `project_context.md` - Cloud Functions Template:
```typescript
// 1. Auth (FIRST)
const user = verifyAuth(request.auth)

// 2. Check admin role
if (!user.customClaims?.admin) {
  throw new HttpsError('permission-denied', 'Admin required')
}
```

### Firestore Collection Structure

```typescript
// Collection: emergency-pushes
{
  id: string,           // UUID
  entries: CrisisUrlEntry[],
  reason: string,       // Audit trail
  operator: string,     // Email of admin
  timestamp: string,    // ISO datetime
  status: 'pending' | 'propagated' | 'verified' | 'failed',
  verifiedAt?: string,  // When verification passed
}

// Collection: crisis-allowlist-override
{
  id: string,           // UUID (same as push ID)
  entry: CrisisUrlEntry,
  addedAt: string,      // ISO datetime
  reason: string,       // Audit reference
  pushId: string,       // Reference to push record
}
```

### Cache Invalidation Strategy

The allowlist API will return a new version string when emergency entries exist:
- Normal version: `1.0.0-2025-12-16T00:00:00Z`
- Emergency version: `1.0.0-emergency-{pushId}`

Client ETag mismatch triggers re-fetch even within 24h TTL.

### Testing Standards

Per `project_context.md`:
- Unit tests: `*.test.ts` (co-located)
- Integration tests: `*.integration.ts`
- Adversarial tests for admin permission verification

### Key NFRs

- **NFR28:** Allowlist must be cached locally (fail-safe to protection)
- **NFR42:** WCAG 2.1 AA for admin dashboard

### Key FRs

- **FR7A:** Emergency allowlist push mechanism (< 1 hour for critical additions)
- **FR62:** Allowlist synchronized across platforms
- **FR63:** Version control for sync verification

### Project Context Integration

Per `project_context.md`:
- **Rule 1:** Types from Zod only - create schemas in `@fledgely/contracts`
- **Rule 2:** Firebase SDK direct - use Firestore SDK directly
- **Rule 3:** Crisis allowlist check FIRST - this extends the allowlist source
- **Rule 5:** Functions delegate to services - keep endpoint thin
- UI: shadcn/ui + Radix + Tailwind for admin dashboard

### Git Commit Pattern

```
feat(Story 7.4): Emergency Allowlist Push - admin API and dynamic entries
```

### Dependencies

- **Requires:** Story 7.1 (Crisis Allowlist Data Structure) - DONE
- **Requires:** Story 7.2 (Crisis Visit Zero-Data-Path) - DONE
- **Enables:** Story 7.7 (Allowlist Distribution & Sync) - uses emergency path

### References

- [Source: docs/epics/epic-list.md#Story-7.4] - Original acceptance criteria
- [Source: docs/project_context.md] - Types from Zod, Firebase direct rules
- [Source: apps/functions/src/http/crisisAllowlist.ts] - Existing API endpoint
- [Source: apps/web/src/services/allowlistCacheService.ts] - Client cache service
- [Source: docs/sprint-artifacts/stories/7-2-crisis-visit-zero-data-path.md] - Previous story learnings

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Fixed mock issues with `@fledgely/shared` using `importOriginal` pattern
- Resolved type issues with `CrisisCategory` → `CrisisResourceCategory`
- Integration test renamed to `.integration.test.ts` for vitest compatibility

### Completion Notes List

- All 8 tasks completed successfully
- 934 functions tests passing, 44 allowlistCacheService tests passing
- FR7A requirement met: Emergency push < 1 hour
- Emergency version format: `1.0.0-emergency-{pushId}`
- Implemented as callable function (not HTTP endpoint) for better auth handling

### File List

**Created:**
- `packages/contracts/src/emergencyAllowlist.schema.ts` - Zod schemas for emergency push
- `packages/contracts/src/emergencyAllowlist.schema.test.ts` - Schema validation tests
- `apps/functions/src/callable/emergencyAllowlistPush.ts` - Admin callable function
- `apps/functions/src/callable/emergencyAllowlistPush.test.ts` - Unit tests
- `apps/functions/src/scheduled/verifyEmergencyPushes.ts` - Verification scheduled function
- `apps/functions/src/scheduled/verifyEmergencyPushes.test.ts` - Verification tests
- `apps/functions/src/__tests__/emergency-allowlist.integration.test.ts` - Integration tests
- `apps/web/src/app/(admin)/emergency-push/page.tsx` - Admin dashboard page

**Modified:**
- `packages/contracts/src/index.ts` - Export emergency allowlist schemas
- `apps/functions/src/index.ts` - Export new functions
- `apps/functions/src/http/crisisAllowlist.ts` - Add dynamic entry merging
- `apps/functions/src/http/crisisAllowlist.test.ts` - Add merge tests
- `apps/web/src/lib/admin-api.ts` - Add emergency push API functions
- `apps/web/src/services/allowlistCacheService.ts` - Add emergency features
- `apps/web/src/services/allowlistCacheService.test.ts` - Add Story 7.4 tests
