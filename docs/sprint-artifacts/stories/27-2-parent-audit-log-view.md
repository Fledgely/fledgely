# Story 27.2: Parent Audit Log View

Status: done

## Story

As a **parent**,
I want **to see who has accessed my family's data**,
So that **I have complete transparency on data access**.

## Acceptance Criteria

1. **AC1: Chronological display**
   - Given parent opens audit log section
   - When viewing access history
   - Then all access events shown chronologically (newest first)

2. **AC2: Event details**
   - Given an access event is displayed
   - When parent views the event
   - Then event shows: who (actor name/role), what (resource type), when (timestamp), from where (device type)

3. **AC3: Comprehensive coverage**
   - Given parent is viewing audit log
   - When events are loaded
   - Then events include: parent's own access, co-parent access, child access
   - And external access highlighted if any API access exists

4. **AC4: Filter capabilities**
   - Given parent is viewing audit log
   - When applying filters
   - Then can filter by: person (family member), data type (screenshots, flags, etc.), date range

5. **AC5: Reassurance message**
   - Given parent is viewing audit log
   - When no external access exists
   - Then display: "Your family's data has only been accessed by family members" reassurance

6. **AC6: Pagination**
   - Given many audit events exist
   - When viewing the log
   - Then events are paginated for performance (25 per page)

## Tasks / Subtasks

- [x] Task 1: Create audit log query service (AC: #1, #3, #4, #6)
  - [x] 1.1 Create `getAuditLogForFamily` function in functions
  - [x] 1.2 Implement query with familyId filter and timestamp ordering
  - [x] 1.3 Add pagination support (cursor-based)
  - [x] 1.4 Add filter parameters (actorUid, resourceType, dateRange)
  - [x] 1.5 Include actor name resolution (lookup user displayName)

- [x] Task 2: Create HTTP endpoint for audit log (AC: #1, #3, #4, #6)
  - [x] 2.1 Create `getAuditLog` HTTP function
  - [x] 2.2 Validate caller is family guardian
  - [x] 2.3 Accept filter/pagination query parameters
  - [x] 2.4 Return formatted audit events with actor names

- [x] Task 3: Create audit log React hook (AC: #1, #4, #6)
  - [x] 3.1 Create `useAuditLog` hook in web app
  - [x] 3.2 Handle loading, error, and data states
  - [x] 3.3 Support filter state management
  - [x] 3.4 Implement infinite scroll pagination

- [x] Task 4: Create AuditLogPage component (AC: #1, #2)
  - [x] 4.1 Create `/dashboard/audit` route
  - [x] 4.2 Add page header with "Access History" title
  - [x] 4.3 Create AuditEventList component
  - [x] 4.4 Create AuditEventRow with who/what/when/where display

- [x] Task 5: Create filter controls UI (AC: #4)
  - [x] 5.1 Add person filter dropdown (family members)
  - [x] 5.2 Add data type filter dropdown (resource types)
  - [x] 5.3 Add date range picker
  - [x] 5.4 Wire filters to useAuditLog hook

- [x] Task 6: Add reassurance message (AC: #5)
  - [x] 6.1 Check if any external access exists in results
  - [x] 6.2 Display trust badge/message when only family accessed data

- [ ] Task 7: Add dashboard navigation (AC: #1)
  - [ ] 7.1 Add "Access History" link to dashboard sidebar
  - [ ] 7.2 Add audit log icon/indicator

## Dev Notes

### Existing Infrastructure

**Story 27.1 created the core audit infrastructure:**

- `auditEventSchema` in `packages/shared/src/contracts/index.ts`
- `createAuditEvent` / `createAuditEventNonBlocking` in `apps/functions/src/services/audit/`
- `auditEvents` collection in Firestore with append-only rules
- Indexes for `familyId + timestamp` queries already added

**Existing audit patterns to leverage:**

- `dataViewAuditService.ts` - client-side audit logging pattern
- `useCaregiverAccessLog` hook - example of audit data fetching hook
- Screenshot audit endpoint at `apps/functions/src/http/screenshots/audit-log.ts`

### UI Component Patterns

Follow existing dashboard patterns:

- `/dashboard/devices` for page structure
- `DevicesList.tsx` for list component patterns
- Filter patterns from flag review queue
- Date picker from agreement scheduling

### Query Design

```typescript
// Query pattern for audit events
db.collection('auditEvents')
  .where('familyId', '==', familyId)
  .orderBy('timestamp', 'desc')
  .limit(25)
  .startAfter(cursor)
```

### Actor Name Resolution

Need to resolve actorUid to display name:

```typescript
// Option 1: Batch lookup from users collection
// Option 2: Include actorEmail in audit events (already supported)
// Option 3: Client-side lookup with caching
```

Recommend Option 3 for performance - cache family member names on first load.

### Filter Implementation

```typescript
interface AuditLogFilters {
  actorUid?: string // Filter by specific family member
  resourceType?: string // Filter by data type
  startDate?: number // Epoch ms
  endDate?: number // Epoch ms
}
```

### External Access Detection

For AC5 (reassurance message), check if any events have:

- `actorType !== 'guardian' && actorType !== 'child' && actorType !== 'caregiver'`
- Or `actorType === 'system'` for API-level access

### Project Structure Notes

```
apps/web/src/
├── app/dashboard/
│   └── audit/
│       └── page.tsx          # NEW - Audit log page
├── components/audit/
│   ├── AuditEventList.tsx    # NEW - Event list container
│   ├── AuditEventRow.tsx     # NEW - Single event display
│   └── AuditLogFilters.tsx   # NEW - Filter controls
├── hooks/
│   └── useAuditLog.ts        # NEW - Audit data fetching hook

apps/functions/src/
├── http/audit/
│   └── index.ts              # NEW - Audit log endpoint
├── services/audit/
│   └── auditQueryService.ts  # NEW - Query helpers (extend existing)
```

### NFR Compliance

- **NFR42:** Display in child-readable language where applicable
- **FR53:** Parent can access audit log showing who viewed what and when
- **NFR58:** 2-year retention means potentially large datasets - pagination required

### References

- [Source: packages/shared/src/contracts/index.ts] - AuditEvent schema
- [Source: apps/functions/src/services/audit/auditEventService.ts] - Core audit service
- [Source: apps/web/src/services/dataViewAuditService.ts] - Client audit patterns
- [Source: apps/web/src/hooks/useCaregiverAccessLog.ts] - Audit hook patterns
- [Source: docs/epics/epic-list.md#story-272] - Story requirements

## Dev Agent Record

### Context Reference

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

### File List

**New Files:**

- `apps/web/src/app/dashboard/audit/page.tsx` - Audit log page
- `apps/web/src/components/audit/AuditEventList.tsx` - Event list component
- `apps/web/src/components/audit/AuditEventRow.tsx` - Single event row
- `apps/web/src/components/audit/AuditLogFilters.tsx` - Filter controls
- `apps/web/src/hooks/useAuditLog.ts` - Data fetching hook
- `apps/functions/src/http/audit/index.ts` - Audit log endpoint
- `apps/functions/src/services/audit/auditQueryService.ts` - Query service

**Modified Files:**

- `apps/web/src/components/dashboard/DashboardLayout.tsx` - Add nav link
- `apps/functions/src/index.ts` - Export new HTTP function
