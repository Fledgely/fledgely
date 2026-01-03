# Story 39.1: Caregiver Account Creation

## Status: done

## Story

As a **parent**,
I want **to create caregiver accounts for extended family**,
So that **grandparents and babysitters can help supervise**.

## Acceptance Criteria

1. **AC1: Caregiver Invitation with Relationship**
   - Given parent wants to add a caregiver (FR73)
   - When creating caregiver account
   - Then parent enters: caregiver name, email, relationship
   - And relationship options include: grandparent, aunt/uncle, babysitter, other
   - And custom relationship text allowed for "other"

2. **AC2: Maximum Caregivers Limit**
   - Given a family with existing caregivers
   - When parent tries to add another caregiver
   - Then system enforces maximum 5 caregivers per family
   - And clear error message shown when limit reached
   - And pending invitations count toward limit

3. **AC3: Invitation Flow**
   - Given parent submits caregiver invitation
   - When invitation is created
   - Then invitation sent to caregiver email
   - And caregiver creates account via invitation link
   - And caregiver linked to family (not full guardian)

4. **AC4: Child Notification**
   - Given a caregiver successfully joins the family
   - When caregiver account is linked
   - Then child receives notification about new caregiver
   - And notification uses relationship: "Grandma has been added as a caregiver"
   - And notification visible in child's dashboard

5. **AC5: Caregiver List Display**
   - Given family has one or more caregivers
   - When parent views caregiver management
   - Then shows list of all caregivers with name, relationship, status
   - And shows pending invitations separately
   - And shows count: "3 of 5 caregivers"

## Tasks / Subtasks

### Task 1: Extend Caregiver Schema with Relationship (AC: #1) [x]

Update shared contracts to include relationship field.

**Files:**

- `packages/shared/src/contracts/index.ts` (modify)
- `packages/shared/src/contracts/index.test.ts` (modify)

**Implementation:**

- Add caregiverRelationshipSchema: z.enum(['grandparent', 'aunt_uncle', 'babysitter', 'other'])
- Add relationship field to familyCaregiverSchema
- Add customRelationship: z.string().optional() for "other" relationship
- Add relationship and customRelationship to caregiverInvitationSchema
- Add MAX_CAREGIVERS_PER_FAMILY = 5 constant

**Tests:** ~10 tests for schema validation

### Task 2: Update Cloud Functions for Relationship and Limit (AC: #1, #2, #3) [x]

Modify sendCaregiverInvitation to include relationship and enforce limit.

**Files:**

- `apps/functions/src/callable/sendCaregiverInvitation.ts` (modify)
- `apps/functions/src/callable/sendCaregiverInvitation.test.ts` (modify)

**Implementation:**

- Add relationship and customRelationship to input schema
- Before creating invitation, count existing caregivers + pending invitations
- If count >= 5, throw error with code 'caregiver-limit-reached'
- Include relationship in invitation document
- Update acceptCaregiverInvitation to copy relationship to familyCaregiver

**Tests:** ~15 tests including limit enforcement

### Task 3: Create CaregiverManagementPage Component (AC: #5) [x]

New page for parents to manage caregivers.

**Files:**

- `apps/web/src/app/(protected)/family/caregivers/page.tsx` (new)
- `apps/web/src/components/caregiver/CaregiverManagementPage.tsx` (new)
- `apps/web/src/components/caregiver/CaregiverManagementPage.test.tsx` (new)

**Implementation:**

- Display list of active caregivers with name, relationship, addedAt
- Display pending invitations separately
- Show count: "3 of 5 caregivers"
- "Add Caregiver" button (disabled if at limit)
- Each caregiver row has "Manage" button linking to permissions
- 44px minimum touch targets (NFR49)

**Tests:** ~20 tests for component states

### Task 4: Update CaregiverInviteForm with Relationship (AC: #1, #2) [x]

Extend existing invite form to include relationship selection.

**Files:**

- `apps/web/src/components/caregiver/CaregiverInviteForm.tsx` (modify)
- `apps/web/src/components/caregiver/CaregiverInviteForm.test.tsx` (modify)

**Implementation:**

- Add relationship dropdown: Grandparent, Aunt/Uncle, Babysitter, Other
- Show text input for custom relationship when "Other" selected
- Show remaining caregiver slots: "You can add 2 more caregivers"
- Disable submit if at limit
- Pass relationship to sendCaregiverInvitation

**Tests:** ~12 tests for form behavior

### Task 5: Create Child Caregiver Notification (AC: #4) [x]

Notify child when new caregiver joins.

**Files:**

- `apps/functions/src/callable/acceptCaregiverInvitation.ts` (modify)
- `apps/web/src/components/child/CaregiverAddedNotification.tsx` (new)
- `apps/web/src/components/child/CaregiverAddedNotification.test.tsx` (new)

**Implementation:**

- On successful invitation acceptance, create notification for each child
- Notification uses relationship name: "Grandma has been added as a caregiver"
- Notification stored in child's notifications subcollection
- Child dashboard displays notification with caregiver info
- Notification auto-dismisses after viewing

**Tests:** ~15 tests for notification flow

### Task 6: Create useCaregiverLimit Hook (AC: #2, #5) [x]

Hook for checking and displaying caregiver limits.

**Files:**

- `apps/web/src/hooks/useCaregiverLimit.ts` (new)
- `apps/web/src/hooks/useCaregiverLimit.test.ts` (new)

**Implementation:**

- useCaregiverLimit(familyId) returns:
  - currentCount: number (active + pending)
  - maxAllowed: 5
  - remaining: number
  - isAtLimit: boolean
  - activeCount: number
  - pendingCount: number
- Uses Firestore query to count family.caregivers + caregiverInvitations(status='pending')

**Tests:** ~10 tests for hook behavior

## Dev Notes

### Technical Requirements

- **Database:** Firestore with typed access via Zod schemas
- **Schema Source:** @fledgely/contracts (Zod schemas only - Unbreakable Rule #1)
- **Firebase Access:** Direct SDK calls (no abstractions - Unbreakable Rule #2)

### Architecture Compliance

From existing Epic 19D patterns:

- "All types from Zod Only" - extend existing caregiver schemas
- "Firebase SDK Direct" - use `doc()`, `getDoc()`, `collection()` directly
- "Functions Delegate to Services" - Cloud Functions for business logic

### Existing Infrastructure to Leverage

**From Epic 19D.1 (Caregiver Invitation & Onboarding):**

- `sendCaregiverInvitation.ts` - MODIFY to add relationship
- `acceptCaregiverInvitation.ts` - MODIFY to copy relationship and notify child
- `caregiverInvitationService.ts` - MODIFY to include relationship
- `CaregiverInviteForm.tsx` - MODIFY to add relationship dropdown

**From Epic 19D.5 (Quick Revocation):**

- `revokeCaregiverAccess.ts` - Reference for caregiver removal pattern

**Schemas already exist in packages/shared/src/contracts/index.ts:**

- familyCaregiverSchema (lines 68-80) - ADD relationship field
- caregiverInvitationSchema (lines 82-100) - ADD relationship field
- caregiverRoleSchema - NO CHANGE (role system is separate story)

### Relationship Display Logic

```typescript
function formatCaregiverRelationship(
  relationship: string,
  customRelationship?: string,
  name?: string
): string {
  if (relationship === 'other' && customRelationship) {
    return customRelationship
  }
  const labels: Record<string, string> = {
    grandparent: name ? `${name}` : 'Grandparent',
    aunt_uncle: name ? `${name}` : 'Aunt/Uncle',
    babysitter: name ? `${name}` : 'Babysitter',
    other: customRelationship || 'Caregiver',
  }
  return labels[relationship] || 'Caregiver'
}
```

### Caregiver Limit Enforcement

The limit must be enforced:

1. **Client-side:** useCaregiverLimit hook prevents form submission at limit
2. **Server-side:** sendCaregiverInvitation Cloud Function validates limit
3. **Database:** Query both family.caregivers.length + pending invitations count

```typescript
// Server-side validation in sendCaregiverInvitation
const MAX_CAREGIVERS = 5
const activeCount = family.caregivers?.length || 0
const pendingInvitations = await db
  .collection('caregiverInvitations')
  .where('familyId', '==', familyId)
  .where('status', '==', 'pending')
  .count()
  .get()
const pendingCount = pendingInvitations.data().count

if (activeCount + pendingCount >= MAX_CAREGIVERS) {
  throw new HttpsError('failed-precondition', 'Maximum 5 caregivers per family')
}
```

### Child Notification Schema

```typescript
// Add to child notifications subcollection
const notification = {
  type: 'caregiver_added',
  caregiverName: caregiver.displayName,
  caregiverRelationship: caregiver.relationship,
  message: `${formatRelationship(caregiver)} has been added as a caregiver`,
  createdAt: serverTimestamp(),
  read: false,
}
```

### File Structure

```
packages/shared/src/contracts/
└── index.ts                                    # UPDATE: add relationship fields

apps/functions/src/callable/
├── sendCaregiverInvitation.ts                  # UPDATE: relationship + limit
└── acceptCaregiverInvitation.ts                # UPDATE: notify child

apps/web/src/
├── app/(protected)/family/caregivers/
│   └── page.tsx                                # NEW: route page
├── components/caregiver/
│   ├── CaregiverManagementPage.tsx             # NEW
│   ├── CaregiverManagementPage.test.tsx        # NEW
│   ├── CaregiverInviteForm.tsx                 # UPDATE: add relationship
│   └── CaregiverInviteForm.test.tsx            # UPDATE
├── components/child/
│   ├── CaregiverAddedNotification.tsx          # NEW
│   └── CaregiverAddedNotification.test.tsx     # NEW
├── hooks/
│   ├── useCaregiverLimit.ts                    # NEW
│   └── useCaregiverLimit.test.ts               # NEW
└── services/
    └── caregiverInvitationService.ts           # UPDATE: relationship field
```

### Testing Requirements

- Unit test schema validation for relationship field
- Unit test limit enforcement at 5 caregivers
- Unit test pending invitations count toward limit
- Unit test relationship display formatting
- Component tests for CaregiverManagementPage states
- Component tests for relationship dropdown in invite form
- Integration test: full invitation flow with relationship
- Integration test: child notification on caregiver join

### NFR References

- NFR43: All interactive elements keyboard accessible
- NFR45: Color contrast 4.5:1 minimum
- NFR49: 44x44px minimum touch target
- NFR62: Caregiver access audit logging

### References

- [Source: docs/epics/epic-list.md#Story-39.1]
- [Source: docs/epics/epic-list.md#Epic-39]
- [Source: apps/functions/src/callable/sendCaregiverInvitation.ts]
- [Source: apps/functions/src/callable/acceptCaregiverInvitation.ts]
- [Source: apps/web/src/components/caregiver/CaregiverInviteForm.tsx]
- [Source: packages/shared/src/contracts/index.ts#familyCaregiverSchema]

## Dev Agent Record

### Context Reference

- Epic: 39 (Caregiver Full Features)
- Story Key: 39-1-caregiver-account-creation
- Dependencies: Epic 19D (Basic Caregiver Status View) - COMPLETE

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date       | Change                        |
| ---------- | ----------------------------- |
| 2026-01-02 | Story created (ready-for-dev) |
