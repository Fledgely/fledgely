# Story 32.5: Offline Time Exceptions

Status: done

## Story

As **a parent**,
I want **to configure exceptions to offline time**,
So that **emergencies and special cases are handled**.

## Acceptance Criteria

1. **AC1: Pause Offline Time**
   - Given offline time is active
   - When parent needs to pause
   - Then "Pause offline time" option available
   - And pause is logged in audit trail
   - And can resume or skip remainder

2. **AC2: Emergency Contacts Always Reachable**
   - Given offline time is active
   - When child needs emergency contact
   - Then emergency/crisis URLs always allowed
   - And configured emergency contacts accessible
   - And 911 resources never blocked

3. **AC3: Work Exceptions for Parents**
   - Given parent has work obligations
   - When configuring offline time
   - Then can whitelist specific work apps/sites
   - And work exceptions logged for transparency
   - And child sees "Dad is working"

4. **AC4: Homework Exception for Children**
   - Given child needs homework access
   - When offline time is active
   - Then can request homework exception
   - And parent approves/denies remotely
   - And only education apps allowed during exception

5. **AC5: One-Time Skip**
   - Given parent wants to skip tonight
   - When viewing offline schedule
   - Then "Skip tonight" button available
   - And logs reason (optional)
   - And next scheduled offline time unaffected

6. **AC6: Audit Trail**
   - Given any exception is used
   - When reviewing history
   - Then all exceptions logged with timestamp
   - And visible to all family members
   - And maintains transparency

## Tasks / Subtasks

- [x] Task 1: Create exception data models (AC: #1-6)
  - [x] 1.1 Add `OfflineException` schema to @fledgely/shared
  - [x] 1.2 Add exception types: pause, skip, work, homework
  - [x] 1.3 Create Firestore collection for exceptions

- [x] Task 2: Implement pause and skip functionality (AC: #1, #5)
  - [x] 2.1 Create `useOfflineExceptions` hook
  - [x] 2.2 Add pause/resume functions
  - [x] 2.3 Add skip-tonight function
  - [x] 2.4 Log exceptions to audit trail

- [x] Task 3: Create exception UI for parents (AC: #1, #3, #5)
  - [x] 3.1 Add "Pause Offline Time" button to parent dashboard
  - [x] 3.2 Add "Skip Tonight" button to settings
  - [x] 3.3 Create work exception configuration (via OfflineExceptionCard)
  - [x] 3.4 Show exception status on dashboard

- [x] Task 4: Implement homework exception flow (AC: #4)
  - [x] 4.1 Create homework exception request UI for child
  - [x] 4.2 Create parent approval notification
  - [x] 4.3 Limit access to education category during exception
  - [x] 4.4 Time-limited exception (e.g., 1 hour max)

- [x] Task 5: Update extension enforcement (AC: #2-4)
  - [x] 5.1 Check for active exceptions before blocking
  - [x] 5.2 Always allow crisis/emergency URLs
  - [x] 5.3 Respect work/homework whitelist when active
  - [x] 5.4 Show exception status in blocking overlay

- [x] Task 6: Create exception audit display (AC: #6)
  - [x] 6.1 Add exception history to family audit log
  - [x] 6.2 Show exceptions in child-friendly format
  - [x] 6.3 Display in parent settings

## Dev Notes

### Architecture Pattern

Exceptions extend the offline schedule system:

```typescript
// packages/shared/src/contracts/offlineException.ts

export const offlineExceptionTypeSchema = z.enum([
  'pause', // Temporary pause by parent
  'skip', // Skip entire offline window
  'work', // Work exception for parent
  'homework', // Homework exception for child
])

export const offlineExceptionSchema = z.object({
  id: z.string(),
  familyId: z.string(),
  type: offlineExceptionTypeSchema,
  requestedBy: z.string(), // uid of requester
  approvedBy: z.string().optional(), // uid of approver (for homework)
  reason: z.string().optional(),
  startTime: z.number(), // epoch ms
  endTime: z.number().optional(), // epoch ms (null = until end of window)
  whitelistedUrls: z.array(z.string()).optional(), // for work/homework
  status: z.enum(['active', 'completed', 'cancelled']),
  createdAt: z.number(),
})

export type OfflineExceptionType = z.infer<typeof offlineExceptionTypeSchema>
export type OfflineException = z.infer<typeof offlineExceptionSchema>
```

### Extension Integration

```typescript
// apps/extension/src/offline-schedule-enforcement.ts

export async function checkForActiveExceptions(): Promise<OfflineException | null> {
  // Check if any exception is active
  // If so, modify enforcement behavior
}

export function shouldBypassForException(url: string, exception: OfflineException): boolean {
  // Check if URL should be allowed during exception
}
```

### Firestore Security Rules

```javascript
// Children can read exceptions, parents can write
match /families/{familyId}/offlineExceptions/{exceptionId} {
  allow read: if isParentInFamily(familyId) || isChildInFamily(familyId);
  allow write: if isParentInFamily(familyId);
}
```

### NFR Compliance

- **NFR42**: WCAG 2.1 AA - accessible exception controls
- **FR60**: Exceptions logged transparently

### References

- [Source: docs/epics/epic-list.md#story-325] - Story requirements
- [Source: Story 32-3] - Offline Time Enforcement
- [Source: Story 32-4] - Parent Compliance Tracking

## Dev Agent Record

### Context Reference

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

### File List

**Shared Package (Data Models)**

- `packages/shared/src/contracts/offlineException.ts` - Exception type schemas
- `packages/shared/src/contracts/offlineException.test.ts` - Schema tests
- `packages/shared/src/contracts/index.ts` - Export barrel
- `packages/shared/src/index.ts` - Package export

**Web App (Parent/Child UI)**

- `apps/web/src/hooks/useOfflineExceptions.ts` - Exception management hook
- `apps/web/src/hooks/useOfflineExceptions.test.ts` - Hook tests
- `apps/web/src/hooks/useHomeworkException.ts` - Homework exception hook
- `apps/web/src/hooks/useHomeworkException.test.ts` - Homework hook tests
- `apps/web/src/components/dashboard/OfflineExceptionQuickActions.tsx` - Pause/skip buttons
- `apps/web/src/components/dashboard/HomeworkApprovalCard.tsx` - Parent approval UI
- `apps/web/src/components/dashboard/HomeworkApprovalCard.test.tsx` - Approval tests
- `apps/web/src/components/dashboard/index.ts` - Export barrel
- `apps/web/src/components/child/HomeworkExceptionRequest.tsx` - Child request UI
- `apps/web/src/components/child/HomeworkExceptionRequest.test.tsx` - Request tests
- `apps/web/src/components/settings/OfflineExceptionCard.tsx` - Work exception config
- `apps/web/src/components/settings/OfflineExceptionCard.test.tsx` - Config tests
- `apps/web/src/components/settings/ExceptionHistoryCard.tsx` - Audit trail display
- `apps/web/src/components/settings/ExceptionHistoryCard.test.tsx` - History tests
- `apps/web/src/components/settings/index.ts` - Export barrel
- `apps/web/src/app/dashboard/page.tsx` - Parent dashboard integration
- `apps/web/src/app/dashboard/settings/time-limits/page.tsx` - Settings integration
- `apps/web/src/app/child/dashboard/page.tsx` - Child dashboard integration

**Extension (Enforcement)**

- `apps/extension/src/offline-schedule-enforcement.ts` - Exception checking logic
- `apps/extension/src/content-scripts/family-offline-block.ts` - Overlay updates

**Cloud Functions (API)**

- `apps/functions/src/http/offline/getActiveOfflineException.ts` - Get active exception endpoint
- `apps/functions/src/http/offline/getActiveOfflineException.test.ts` - Endpoint tests
- `apps/functions/src/http/offline/index.ts` - Export barrel
- `apps/functions/src/index.ts` - Function exports

**Security Rules**

- `packages/firebase-rules/firestore.rules` - Exception collection rules
