# Story 7.4: Emergency Allowlist Push

Status: done

## Story

As **the fledgely operations team**,
I want **to push allowlist updates within 1 hour for emergencies**,
So that **new crisis resources are protected immediately when identified**.

## Acceptance Criteria

1. **AC1: API Endpoint for Allowlist Distribution**
   - Given any platform agent (extension, Android, iOS)
   - When it requests `GET /api/crisis-allowlist`
   - Then it receives the current allowlist with version number
   - And response includes `lastUpdated` timestamp
   - And response is JSON format with resources array

2. **AC2: Emergency Push Trigger**
   - Given operations triggers emergency push
   - When new crisis resource is added
   - Then Firestore `crisisAllowlist` document is updated immediately
   - And version number is incremented
   - And reason for addition is logged (audit trail)

3. **AC3: Online Device Update (1 hour)**
   - Given a device is online
   - When allowlist version changes
   - Then device fetches new allowlist on next sync (within 24h TTL)
   - And forced refresh occurs on app launch

4. **AC4: Offline Device Update (Next Sync)**
   - Given a device is offline
   - When it comes back online
   - Then it syncs allowlist on reconnection
   - And cached version is used until sync completes

5. **AC5: Version Checking**
   - Given device has cached allowlist with version X
   - When API returns version Y (where Y > X)
   - Then device immediately re-syncs
   - And stale cache is replaced

6. **AC6: Audit Trail**
   - Given emergency push is triggered
   - When allowlist is updated
   - Then push includes reason for addition
   - And timestamp and operator ID are logged
   - And change is recorded in audit collection

7. **AC7: Dynamic Fetch (No App Update)**
   - Given allowlist structure changes
   - When devices fetch from API
   - Then new resources are immediately available
   - And no app/extension update is required

## Tasks / Subtasks

### Task 1: Create Crisis Allowlist API Endpoint ✅

**Files:**

- `apps/functions/src/http/crisis-allowlist/index.ts` - HTTP endpoint
- `apps/functions/src/http/crisis-allowlist/getCrisisAllowlist.ts` - GET handler
- `apps/functions/src/http/index.ts` - Export updates

**Implementation:**
1.1 Create `getCrisisAllowlist` HTTP endpoint (onRequest)
1.2 Return allowlist from Firestore or fall back to bundled defaults
1.3 Include version, lastUpdated, and resources array
1.4 Set appropriate CORS headers for cross-origin access
1.5 Add cache headers (1 hour max-age, stale-while-revalidate)

### Task 2: Create Emergency Push Callable ✅

**Files:**

- `apps/functions/src/callable/crisisAllowlist.ts` - Callable functions
- `apps/functions/src/services/crisisAllowlistService.ts` - Business logic

**Implementation:**
2.1 Create `pushEmergencyAllowlistUpdate` callable (admin-only)
2.2 Validate admin permissions (custom claim or role check)
2.3 Accept new resource and reason for addition
2.4 Increment version number
2.5 Update Firestore document
2.6 Log to audit trail

### Task 3: Create Firestore Schema ✅

**Files:**

- `packages/shared/src/contracts/crisisAllowlist.ts` - Zod schemas
- `packages/shared/src/contracts/index.ts` - Exports

**Implementation:**
3.1 Create `crisisAllowlistDocSchema` for Firestore document
3.2 Create `emergencyPushInputSchema` for callable input
3.3 Create `allowlistAuditEntrySchema` for audit trail
3.4 Export types and schemas

### Task 4: Create Allowlist Service ✅

**Files:**

- `apps/functions/src/services/crisisAllowlistService.ts`

**Implementation:**
4.1 `getCurrentAllowlist()` - Fetch from Firestore or return bundled
4.2 `pushEmergencyUpdate()` - Add resource and update version
4.3 `logAuditEntry()` - Record change in audit collection
4.4 `initializeAllowlist()` - Seed Firestore from bundled if empty

### Task 5: Export and Integration ✅

**Files:**

- `apps/functions/src/index.ts` - Main exports
- `apps/functions/src/http/index.ts` - HTTP exports

**Implementation:**
5.1 Export HTTP endpoint
5.2 Export callable function
5.3 Add to functions deployment

## Dev Notes

### Architecture Compliance

- **HTTP Endpoint**: Use `onRequest` for public API (no auth for fail-safe crisis access)
- **Callable Function**: Use `onCall` with auth check for admin operations
- **Service Layer**: All business logic in `crisisAllowlistService.ts`
- **Zod Schemas**: Define in `@fledgely/contracts` (shared package)
- **Direct Firebase SDK**: No abstractions per project rules

### Critical Security Notes

- The GET endpoint MUST be public (no auth) for fail-safe crisis protection
- Even if auth fails, devices must get allowlist
- Admin callable MUST verify admin role before allowing updates
- Never log which user/family requested the allowlist (privacy)

### Firestore Structure

```
/config/crisisAllowlist
  - version: string (semver)
  - lastUpdated: timestamp
  - resources: CrisisResource[]
  - updatedBy: string (admin uid, for audit)

/audit/crisisAllowlistChanges/{changeId}
  - timestamp: timestamp
  - version: string
  - operatorId: string
  - reason: string
  - resourcesAdded: string[]
  - resourcesRemoved: string[]
```

### Existing Code References

- Crisis URLs bundled: `packages/shared/src/constants/crisis-urls.ts`
- Extension allowlist check: `apps/extension/src/crisis-allowlist.ts`
- HTTP endpoint pattern: `apps/functions/src/http/offline/getOfflineSchedule.ts`

### Testing Requirements

- Unit test: Service functions with mocked Firestore
- Integration test: API endpoint with Firebase Emulators
- Adversarial test: Verify no auth required for GET (fail-safe)
- Adversarial test: Verify admin required for push

## Dev Agent Record

### Context Reference

Epic 7: Crisis Allowlist Foundation

- FR61: System maintains a public crisis allowlist
- NFR28: Crisis allowlist cached locally; functions without cloud connectivity

### Agent Model Used

claude-opus-4-5-20251101

### Completion Notes List

- All 5 tasks completed successfully
- HTTP endpoint created for public allowlist access (no auth for fail-safe)
- Admin callable functions with role verification
- Zod schemas in shared package for type safety
- Service layer with audit trail logging and transactional updates
- 16 unit tests passing (expanded after code review)
- TypeScript compilation clean
- Code review fixes: Added transactions for race condition prevention, expanded test coverage

### File List

- `packages/shared/src/contracts/crisisAllowlistAdmin.ts` - Zod schemas and types
- `packages/shared/src/contracts/index.ts` - Contract exports
- `packages/shared/src/index.ts` - Shared package exports
- `apps/functions/src/services/crisisAllowlistService.ts` - Business logic service
- `apps/functions/src/services/crisisAllowlistService.test.ts` - Unit tests (16 tests)
- `apps/functions/src/http/crisis-allowlist/getCrisisAllowlist.ts` - HTTP endpoint
- `apps/functions/src/http/crisis-allowlist/index.ts` - HTTP exports
- `apps/functions/src/http/index.ts` - HTTP index exports (added crisis-allowlist export)
- `apps/functions/src/callable/crisisAllowlist.ts` - Admin callable functions
- `apps/functions/src/index.ts` - Functions exports

## Change Log

| Date       | Change                                                       |
| ---------- | ------------------------------------------------------------ |
| 2026-01-04 | Story created with ready-for-dev status                      |
| 2026-01-04 | Implementation complete, moved to review                     |
| 2026-01-04 | Code review: Added transactions, expanded tests (8→16), done |
