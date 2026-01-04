# Story 52.4: Trusted Adult Designation

## Status: done

## Story

As **a parent**,
I want **to designate a trusted adult with view-only access**,
So that **my teen has another supportive adult they trust (FR108)**.

## Acceptance Criteria

1. **AC1: Designate Trusted Adult**
   - Given parent is viewing family settings
   - When selecting "Add Trusted Adult"
   - Then parent can designate trusted adult by email
   - And system sends invitation to the adult

2. **AC2: Invitation Authentication**
   - Given trusted adult receives invitation
   - When clicking invitation link
   - Then trusted adult authenticates via invitation link (FR123)
   - And account is created with view-only role

3. **AC3: Teen Approval Required**
   - Given parent has designated a trusted adult
   - When invitation is sent
   - Then teen (16+) must approve the trusted adult
   - And trusted adult cannot view data until teen approves

4. **AC4: View-Only Access**
   - Given trusted adult is approved
   - When viewing child's data
   - Then trusted adult has view-only access (no control) (FR108)
   - And cannot modify settings, time limits, or agreements

5. **AC5: Maximum Trusted Adults**
   - Given family settings
   - When adding trusted adults
   - Then maximum 2 trusted adults per child
   - And parent can see list of all trusted adults

6. **AC6: Audit Logging (NFR42)**
   - Given trusted adult designation
   - When any change occurs (add/approve/remove)
   - Then all actions logged for audit
   - And visible in family audit trail

## Tasks / Subtasks

### Task 1: Create Trusted Adult Data Types

**Files:**

- `packages/shared/src/contracts/trustedAdult.ts` (new)

**Implementation:**
1.1 Define TrustedAdultStatus enum: PENDING_PARENT, PENDING_TEEN, ACTIVE, REVOKED
1.2 Define TrustedAdult schema with Zod: id, email, name, status, childId, invitedBy, invitedAt, approvedByTeenAt
1.3 Define TrustedAdultInvitation schema for invitation flow
1.4 Define TrustedAdultChangeEvent for audit logging
1.5 Export all types from shared/index.ts

### Task 2: Create Trusted Adult Service

**Files:**

- `packages/shared/src/services/trustedAdultService.ts` (new)
- `packages/shared/src/services/trustedAdultService.test.ts` (new)

**Implementation:**
2.1 Implement canDesignateTrustedAdult(familyId, childId) - check max 2 per child
2.2 Implement createTrustedAdultInvitation(parentId, childId, email, name) - creates invitation
2.3 Implement requiresTeenApproval(childAge) - returns true if 16+
2.4 Implement approveTrustedAdult(childId, trustedAdultId) - teen approval
2.5 Implement getTrustedAdultsForChild(childId) - list trusted adults
2.6 Implement createTrustedAdultChangeEvent() - audit events
2.7 Write unit tests for all functions

### Task 3: Create Trusted Adult Callable Functions

**Files:**

- `apps/functions/src/callable/trustedAdult.ts` (new)
- `apps/functions/src/index.ts` (modify)

**Implementation:**
3.1 Implement inviteTrustedAdult - parent invites trusted adult
3.2 Implement acceptTrustedAdultInvitation - trusted adult accepts
3.3 Implement approveTrustedAdultByTeen - teen approves (16+ only)
3.4 Implement getTrustedAdults - list trusted adults for family
3.5 Implement revokeTrustedAdult - remove trusted adult access
3.6 Add validation and audit logging to all functions

### Task 4: Create Trusted Adult UI Components

**Files:**

- `apps/web/src/components/trusted-adult/TrustedAdultInviteForm.tsx` (new)
- `apps/web/src/components/trusted-adult/TrustedAdultList.tsx` (new)
- `apps/web/src/components/trusted-adult/TrustedAdultApprovalCard.tsx` (new)
- `apps/web/src/components/trusted-adult/index.ts` (new)

**Implementation:**
4.1 Create TrustedAdultInviteForm with email and name inputs
4.2 Create TrustedAdultList showing pending and active trusted adults
4.3 Create TrustedAdultApprovalCard for teen to approve/reject
4.4 Add status badges (Pending, Awaiting Teen Approval, Active)

### Task 5: Create Trusted Adult Settings Page

**Files:**

- `apps/web/src/app/dashboard/settings/trusted-adults/page.tsx` (new)
- `apps/web/src/hooks/useTrustedAdults.ts` (new)

**Implementation:**
5.1 Create settings page for managing trusted adults
5.2 Implement useTrustedAdults hook with React Query
5.3 Show invite form, list of trusted adults, pending approvals
5.4 Handle maximum 2 trusted adults validation

### Task 6: Create Teen Approval Flow

**Files:**

- `apps/web/src/app/child/settings/trusted-adults/page.tsx` (new)

**Implementation:**
6.1 Show pending trusted adult approvals for 16+ teens
6.2 Allow approve/reject with confirmation
6.3 Show explanation of what trusted adults can see
6.4 Hide from teens under 16 (parent approval only)

## Dev Notes

### Trusted Adult Role

Trusted adults are distinct from caregivers:

- View-only access (cannot modify settings)
- Requires teen approval for 16+
- Maximum 2 per child
- Cannot see content teen hasn't shared (respects reverse mode)

### Integration with Reverse Mode

When reverse mode is active:

- Trusted adults see same filtered data as parents
- Teen's sharing preferences apply to trusted adults too
- Trusted adults notified when teen activates/deactivates reverse mode

### Security Considerations

- Invitation links expire after 7 days
- Invitation tokens are single-use
- Email verification required for trusted adults
- All actions logged in audit trail

## Dev Agent Record

### Context Reference

Epic 52: Reverse Mode & Trusted Adults (Age 16 Transition)
Story 52-4 introduces trusted adult designation

- FR108: Parent can designate a "Trusted Adult" with view-only access (no control)
- FR123: Trusted adult authenticates via invitation link from parent

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
