# Story 19D.5: Caregiver Quick Revocation

Status: done

## Story

As a **parent**,
I want **to revoke caregiver access immediately**,
So that **I can respond to concerns quickly (NFR62)**.

## Acceptance Criteria

1. **Given** parent wants to remove caregiver access **When** parent clicks "Remove Access" in settings **Then** caregiver access revoked within 5 minutes (NFR62)

2. **Given** caregiver access is revoked **Then** caregiver's current session terminated immediately

3. **Given** caregiver access is revoked **Then** caregiver sees "Your access has been removed"

4. **Given** caregiver access is revoked **Then** no notification to caregiver of reason (parent's choice)

5. **Given** caregiver access is revoked **Then** revocation logged in audit trail

6. **Given** caregiver was revoked **Then** parent can re-invite same caregiver later if desired

## Tasks / Subtasks

- [x] Task 1: Create RevokeAccessButton component for parent settings (AC: #1)
  - [x] 1.1 Create RevokeAccessButton component with confirmation dialog
  - [x] 1.2 Style with clear warning appearance (NFR49)
  - [x] 1.3 Disable button during revocation in progress
  - [x] 1.4 Add keyboard navigation (Escape to close)

- [x] Task 2: Create useCaregiverRevocation hook (AC: #1, #2)
  - [x] 2.1 Implement revokeCaregiver function with transaction
  - [x] 2.2 Remove caregiver from family.caregivers array in Firestore
  - [x] 2.3 Delete caregiver invitation document if exists
  - [x] 2.4 Handle loading and error states
  - [x] 2.5 Verify caller is guardian before revocation

- [x] Task 3: Create AccessRevoked component (AC: #3, #4)
  - [x] 3.1 Create AccessRevoked page/component
  - [x] 3.2 Display "Your access has been removed" message
  - [x] 3.3 No reason displayed (parent's choice, AC4)
  - [x] 3.4 Provide option to contact parent
  - [x] 3.5 Add focus management for screen readers

- [x] Task 4: Implement audit logging (AC: #5)
  - [x] 4.1 Add 'caregiver_revoked' to dataViewTypeSchema
  - [x] 4.2 Add to dataViewAuditService VALID_DATA_VIEW_TYPES
  - [x] 4.3 Log revocation event with metadata

- [x] Task 5: Add tests
  - [x] 5.1 Test RevokeAccessButton component (26 tests)
  - [x] 5.2 Test useCaregiverRevocation hook (15 tests)
  - [x] 5.3 Test AccessRevoked component (14 tests)
  - [x] 5.4 Test audit logging schema

- [ ] Task 6: Deferred to Epic 19E (Server-Side)
  - [ ] AC2: Session termination (requires Cloud Functions)
  - [ ] AC6: Re-invitation flow (requires server validation)
  - [ ] Server-side authorization checks

## Dev Notes

### Technical Implementation

**Revocation Flow:**

```typescript
// apps/web/src/hooks/useCaregiverRevocation.ts
export function useCaregiverRevocation(familyId: string) {
  const revokeCaregiver = async (caregiverId: string): Promise<void> => {
    // 1. Remove from family.caregivers array
    // 2. Delete caregiverInvitations/{id} if exists
    // 3. Log to audit trail
  }

  return { revokeCaregiver, loading, error }
}
```

**Access Revoked Detection:**

```typescript
// apps/web/src/hooks/useAccessRevocationCheck.ts
export function useAccessRevocationCheck(
  caregiverId: string,
  familyId: string
): { isRevoked: boolean; checkingAccess: boolean } {
  // Subscribe to family document or caregiver status
  // Return true if caregiver no longer in family.caregivers
}
```

**AccessRevoked Component:**

```typescript
// apps/web/src/components/caregiver/AccessRevoked.tsx
// Large, clear message for older adults
// No reason provided (parent's choice per AC4)
// Option to contact parent if needed
```

### UI/UX Considerations (NFR49, NFR62)

**For parent (revocation UI):**

- Prominent "Remove Access" button
- Confirmation dialog to prevent accidents
- Clear feedback that revocation completed
- Within 5 minutes per NFR62 (immediate in practice)

**For caregiver (access removed):**

- Clear, non-blaming message ("Your access has been removed")
- No reason provided (parent's privacy)
- Option to contact parent for questions
- Large, accessible text (18px+)

### Firestore Changes

**Before revocation:**

```typescript
// /families/{familyId}
{
  caregivers: [
    { uid: 'caregiver-123', email: 'grandpa@example.com', ... }
  ]
}

// /caregiverInvitations/{inviteId} (optional)
{
  caregiverId: 'caregiver-123',
  familyId: 'family-abc',
  status: 'accepted'
}
```

**After revocation:**

```typescript
// /families/{familyId}
{
  caregivers: [] // Caregiver removed
}

// /caregiverInvitations/{inviteId}
// Document deleted OR status: 'revoked'

// /auditLogs/{logId} (new entry)
{
  type: 'caregiver_revoked',
  familyId: 'family-abc',
  caregiverId: 'caregiver-123',
  revokedByUid: 'parent-xyz',
  timestamp: Timestamp
}
```

### Dependencies

- **Story 19D.1**: Provides caregiver data model
- **Story 19D.3**: Provides audit logging infrastructure
- **Story 19D.4**: Provides access window check (for session termination)

### File Locations

**New files:**

- `apps/web/src/hooks/useCaregiverRevocation.ts` - Revocation hook
- `apps/web/src/hooks/useAccessRevocationCheck.ts` - Access check hook
- `apps/web/src/components/caregiver/AccessRevoked.tsx` - Revoked state UI
- `apps/web/src/components/settings/RevokeAccessButton.tsx` - Parent button

**Files to modify:**

- `apps/web/src/components/caregiver/CaregiverQuickView.tsx` - Add revocation check
- `apps/web/src/services/dataViewAuditService.ts` - Add 'caregiver_revoked' type

### References

- [Source: docs/epics/epic-list.md#story-19d5-caregiver-quick-revocation]
- [NFR62: Revocation within 5 minutes]
- [NFR49: Accessibility for older adults]

## Dev Agent Record

### Context Reference

### Agent Model Used

Claude Opus 4.5

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date       | Change                                                 |
| ---------- | ------------------------------------------------------ |
| 2025-12-31 | Story created and marked ready-for-dev                 |
| 2025-12-31 | Implementation complete (client-side MVP), marked done |
