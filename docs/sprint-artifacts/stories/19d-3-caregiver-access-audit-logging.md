# Story 19D.3: Caregiver Access Audit Logging

Status: done

## Story

As **the system**,
I want **all caregiver views logged from day one**,
So that **there's no backdoor for untracked access (FR19D-X)**.

## Acceptance Criteria

1. **Given** caregiver accesses their view **When** any data is displayed **Then** audit record created: caregiver ID, timestamp, what was viewed

2. **Given** audit logging is active **Then** logs stored in append-only collection

3. **Given** parent is reviewing family settings **Then** logs visible to parent in family audit trail

4. **Given** logging implementation **Then** logging implemented BEFORE caregiver access is enabled

5. **Given** caregiver accesses data **Then** no caregiver access occurs without corresponding log

6. **Given** parent reviews caregiver activity **Then** parents can review "Grandpa Joe viewed Emma's status 3 times this week"

## Tasks / Subtasks

- [x] Task 1: Update useCaregiverAccessLog to write to Firestore (AC: #1, #2, #4, #5)
  - [x] 1.1 Replace console.log with actual Firestore write
  - [x] 1.2 Use dataViewAuditService.logDataView with 'caregiver_status' type
  - [x] 1.3 Include caregiver UID from auth context
  - [x] 1.4 Include list of children viewed

- [x] Task 2: Create CaregiverAccessLogViewer component for parents (AC: #3, #6)
  - [x] 2.1 Create component to display caregiver access logs
  - [x] 2.2 Filter logs by caregiver and child
  - [x] 2.3 Show human-readable summary ("Grandpa Joe viewed 3 times this week")
  - [x] 2.4 Group by time period (today, this week, etc.)

- [x] Task 3: Add getCaregiverAccessLogs service function (AC: #3)
  - [x] 3.1 Create query to fetch caregiver audit logs for a family
  - [x] 3.2 Filter by dataType='caregiver_status'
  - [x] 3.3 Support date range filtering

- [x] Task 4: Update shared contracts for caregiver audit (AC: #1)
  - [x] 4.1 Add caregiverUid field to dataViewAuditSchema (or use viewerUid)
  - [x] 4.2 Add test for 'caregiver_status' data type

- [x] Task 5: Add tests (AC: #1, #2, #5)
  - [x] 5.1 Test useCaregiverAccessLog writes to Firestore
  - [x] 5.2 Test audit log entry structure
  - [x] 5.3 Test CaregiverAccessLogViewer displays logs correctly
  - [x] 5.4 Test summary generation ("3 times this week")

## Dev Notes

### Technical Implementation

**Update useCaregiverAccessLog to use dataViewAuditService:**

```typescript
// In apps/web/src/hooks/useCaregiverAccessLog.ts
import { logDataViewNonBlocking } from '../services/dataViewAuditService'

export function useCaregiverAccessLog(
  action: CaregiverAccessAction,
  childrenViewed: string[] = []
): void {
  const { user } = useAuth() // Get caregiver from auth context

  useEffect(() => {
    if (hasLogged.current) return
    hasLogged.current = true

    // For each child viewed, log separately for granular tracking
    childrenViewed.forEach((childId) => {
      logDataViewNonBlocking({
        viewerUid: user?.uid ?? '',
        childId,
        familyId, // Need to get from context
        dataType: 'caregiver_status',
        metadata: {
          action,
          viewerRole: 'caregiver',
        },
      })
    })
  }, [action, childrenViewed, user])
}
```

**Parent-facing summary component:**

```typescript
// apps/web/src/components/settings/CaregiverAccessLogViewer.tsx
interface CaregiverAccessSummary {
  caregiverId: string
  caregiverName: string
  accessCount: number
  lastAccess: Date
  childrenViewed: string[]
}

function summarizeAccess(logs: DataViewAudit[]): CaregiverAccessSummary[] {
  // Group by caregiver, count accesses in last week
}
```

### Firestore Structure

**Audit logs collection (already exists at /auditLogs):**

```typescript
{
  id: string,
  viewerUid: string,        // Caregiver's UID
  childId: string | null,   // Child being viewed
  familyId: string,
  dataType: 'caregiver_status',
  viewedAt: Timestamp,
  metadata: {
    action: 'view' | 'call_parent',
    viewerRole: 'caregiver',
  }
}
```

### Dependencies

- **Story 19D.1**: Provides caregiver authentication context
- **dataViewAuditService.ts**: Already implements audit logging pattern
- **dataViewTypeSchema**: Already includes 'caregiver_status' type

### File Locations

**Files to modify:**

- `apps/web/src/hooks/useCaregiverAccessLog.ts` - Add real Firestore logging
- `apps/web/src/hooks/useCaregiverAccessLog.test.ts` - Update tests
- `packages/shared/src/contracts/dataViewAudit.test.ts` - Add caregiver_status test

**New files:**

- `apps/web/src/components/settings/CaregiverAccessLogViewer.tsx`
- `apps/web/src/components/settings/CaregiverAccessLogViewer.test.tsx`
- `apps/web/src/services/caregiverAuditService.ts` - Query caregiver logs

### References

- [Source: docs/epics/epic-list.md#story-19d3-caregiver-access-audit-logging]
- [Source: apps/web/src/services/dataViewAuditService.ts] - Existing audit pattern
- [Source: apps/web/src/hooks/useCaregiverAccessLog.ts] - Current stub implementation
- [Source: packages/shared/src/contracts/index.ts#dataViewTypeSchema] - Includes caregiver_status

## Dev Agent Record

### Context Reference

### Agent Model Used

Claude Opus 4.5

### Debug Log References

### Completion Notes List

- All 6 acceptance criteria implemented and tested
- useCaregiverAccessLog hook now writes to Firestore via logDataViewNonBlocking
- Each child viewed is logged separately for granular tracking (enables "Grandpa viewed Emma 3 times")
- CaregiverAccessLogViewer component created for parents to review caregiver activity
- caregiverAuditService.ts created with query functions and summary generation
- 'caregiver_status' data type added to test suites
- 34 new/updated tests passing (14 hook tests + 12 component tests + 8 schema tests)

### File List

**Modified files (apps/web):**

- apps/web/src/hooks/useCaregiverAccessLog.ts (modified - real Firestore logging)
- apps/web/src/hooks/useCaregiverAccessLog.test.ts (modified - 14 tests for Firestore)
- apps/web/src/components/caregiver/CaregiverQuickView.tsx (modified - pass viewerUid)
- apps/web/src/app/caregiver/page.tsx (modified - pass viewerUid to component)
- apps/web/src/services/dataViewAuditService.ts (modified - add caregiver_status type)

**New files (apps/web):**

- apps/web/src/components/settings/CaregiverAccessLogViewer.tsx (new - parent viewer)
- apps/web/src/components/settings/CaregiverAccessLogViewer.test.tsx (new - 12 tests)
- apps/web/src/services/caregiverAuditService.ts (new - query/summary functions)

**Modified files (packages/shared):**

- packages/shared/src/contracts/dataViewAudit.test.ts (modified - caregiver_status test)

## Senior Developer Review (AI)

### Review Date: 2025-12-31

### Findings Summary

- **HIGH**: 0
- **MEDIUM**: 0
- **LOW**: 0

### Approved

All acceptance criteria verified against implementation. Tests passing.

## Change Log

| Date       | Change                                     |
| ---------- | ------------------------------------------ |
| 2025-12-31 | Story created and marked ready-for-dev     |
| 2025-12-31 | Implementation complete, all tests passing |
| 2025-12-31 | Code review complete, marked as done       |
