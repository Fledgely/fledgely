# Story 52.6: Trusted Adult Removal

## Status: ready-for-dev

## Story

As **a teen**,
I want **to remove trusted adults**,
So that **I control who has access**.

## Acceptance Criteria

1. **AC1: Immediate Access Revocation**
   - Given teen wants to remove trusted adult
   - When removing access
   - Then access revoked immediately
   - And trusted adult can no longer view any data

2. **AC2: Trusted Adult Notification**
   - Given access is being revoked
   - When revocation is processed
   - Then trusted adult notified: "Access has been revoked"
   - And notification is respectful but clear

3. **AC3: No Explanation Required**
   - Given teen is removing trusted adult
   - When going through removal flow
   - Then no explanation required from teen
   - And removal is teen's autonomous decision

4. **AC4: Historical Data Handling**
   - Given trusted adult is removed
   - When revocation is complete
   - Then historical data remains (teen's property)
   - And access logs preserved for audit

5. **AC5: Re-invitation Capability**
   - Given trusted adult was previously removed
   - When teen wants to re-invite
   - Then can re-invite same adult later if desired
   - And previous relationship data not auto-restored

6. **AC6: Audit Logging**
   - Given removal is processed
   - When action is complete
   - Then removal logged for audit
   - And timestamp and actor recorded

7. **AC7: Parent Privacy**
   - Given teen removes trusted adult
   - When parents view audit logs
   - Then parents cannot see removal activity
   - And teen's autonomy is protected

## Tasks / Subtasks

### Task 1: Create Trusted Adult Removal UI

**Files:**

- `apps/web/src/components/trusted-adult/TrustedAdultCard.tsx` (modify)
- `apps/web/src/components/trusted-adult/RemoveTrustedAdultModal.tsx` (new)

**Implementation:**
1.1 Add "Remove" button to TrustedAdultCard
1.2 Create RemoveTrustedAdultModal with confirmation
1.3 No explanation field required (AC3)
1.4 Show clear confirmation message
1.5 Handle loading and error states

### Task 2: Create Removal Service Functions

**Files:**

- `packages/shared/src/services/trustedAdultService.ts` (modify)
- `packages/shared/src/services/trustedAdultService.test.ts` (modify)

**Implementation:**
2.1 Add revokeTrustedAdultAccess function
2.2 Implement immediate status change to REVOKED
2.3 Preserve historical data (don't delete relationship record)
2.4 Add canReinviteTrustedAdult validation
2.5 Write unit tests for revocation logic

### Task 3: Create Removal Callable Function

**Files:**

- `apps/functions/src/callable/trustedAdultRemoval.ts` (new)
- `apps/functions/src/index.ts` (modify)

**Implementation:**
3.1 Implement revokeTrustedAdultAccessCallable
3.2 Verify caller is the teen (child) who owns the relationship
3.3 Update trusted adult status to REVOKED
3.4 Trigger notification to trusted adult (AC2)
3.5 Create audit log entry (AC6)

### Task 4: Create Audit Logging for Removal

**Files:**

- `packages/shared/src/services/trustedAdultAccessService.ts` (modify)
- `packages/shared/src/services/trustedAdultAccessService.test.ts` (modify)

**Implementation:**
4.1 Add createRemovalAuditEvent function
4.2 Include TrustedAdultAccessType = 'access_revoked'
4.3 Implement parent privacy filtering (AC7)
4.4 Ensure removal events hidden from parent audit view
4.5 Write tests for audit privacy

### Task 5: Create Notification for Trusted Adult

**Files:**

- `apps/functions/src/callable/trustedAdultRemoval.ts` (modify)

**Implementation:**
5.1 Send email notification to revoked trusted adult
5.2 Message: "Your access to [Teen Name]'s shared data has been revoked."
5.3 No reason provided (respects AC3)
5.4 Include helpful, respectful closing

### Task 6: Update Teen Trusted Adults List

**Files:**

- `apps/web/src/app/child-dashboard/trusted-adults/page.tsx` (modify if exists)
- `apps/web/src/hooks/useTrustedAdults.ts` (modify if exists)

**Implementation:**
6.1 Show revoked trusted adults in a separate section (or hide)
6.2 Add "Re-invite" option for previously revoked adults (AC5)
6.3 Update list in real-time after removal
6.4 Show success message after removal

## Dev Notes

### Trusted Adult Removal Model

The removal process:

1. Teen clicks "Remove" on trusted adult card
2. Confirmation modal appears (no explanation needed)
3. Teen confirms removal
4. Status changed to REVOKED immediately
5. Trusted adult notified via email
6. Audit log entry created (hidden from parents)
7. Trusted adult sees "Access has been revoked" on their dashboard

### Data Preservation

When removing a trusted adult:

- Keep the TrustedAdult record with status = REVOKED
- Keep historical access logs (teen's data)
- Allow future re-invitation to same email
- On re-invitation, create NEW relationship (don't restore old)

### Privacy Model

```typescript
// Audit event types hidden from parents
const TEEN_PRIVATE_EVENTS = ['access_revoked', 'trusted_adult_removed']

function filterAuditEventsForParent(events: AuditEvent[]): AuditEvent[] {
  return events.filter((e) => !TEEN_PRIVATE_EVENTS.includes(e.type))
}
```

### Security Considerations

- Only the teen (child) can revoke access
- Parents cannot remove trusted adults
- Verify childId from auth token, not request
- Ensure revocation is immediate (no delay)

### Integration with Story 52-5

- TrustedAdultContext should handle revoked status
- Trusted adult sees "Access has been revoked" page
- No data accessible after revocation

## Dev Agent Record

### Context Reference

Epic 52: Reverse Mode & Trusted Adults (Age 16 Transition)
Story 52-6 implements trusted adult removal functionality

- Builds on Story 52-4 (Trusted Adult Designation)
- Integrates with Story 52-5 (Trusted Adult Access - revoked page)
- Follows TrustedAdultStatus enum from contracts

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
