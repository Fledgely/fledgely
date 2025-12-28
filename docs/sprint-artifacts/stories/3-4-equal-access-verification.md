# Story 3.4: Equal Access Verification

Status: done

## Story

As a **co-parent who just joined**,
I want **to verify I have equal access to family data**,
So that **I can trust I'm a true co-manager, not a limited user**.

## Acceptance Criteria

1. **AC1: View All Children**
   - Given a co-parent has accepted an invitation
   - When they access the family dashboard
   - Then they see all children in the family
   - And each child's profile shows all information (name, age, custody status)
   - And access is identical to the inviting parent

2. **AC2: View All Screenshots**
   - Given a co-parent has joined the family
   - When they access screenshots (future feature)
   - Then they see all screenshots across all devices
   - Note: This AC is deferred - screenshots feature not yet implemented

3. **AC3: View All Agreements**
   - Given a co-parent has joined the family
   - When they access agreements (future feature)
   - Then they can view all agreements
   - Note: This AC is deferred - agreements feature not yet implemented

4. **AC4: Propose Agreement Changes**
   - Given a co-parent is viewing an agreement
   - When they want to propose changes (future feature)
   - Then they can initiate a change proposal
   - Note: This AC is deferred - agreements feature not yet implemented

5. **AC5: Invite Caregivers**
   - Given a co-parent has joined the family
   - When they access invitation management
   - Then they can invite caregivers
   - Note: This AC is deferred - caregiver invitations are Epic 19D

6. **AC6: Cannot Remove Other Parent (Shared Custody Immutability)**
   - Given a co-parent family with two guardians
   - When either guardian views family settings
   - Then there is NO option to remove the other parent
   - And the "Dissolve Family" action is restricted (requires both guardians' approval)
   - And Firestore security rules prevent guardian removal

7. **AC7: Co-Managed Indicator**
   - Given a family with multiple guardians
   - When viewing the dashboard
   - Then "Co-managed by [other parent name]" indicator is shown
   - And all guardian names are displayed
   - And indicator is accessible (screen reader friendly)

8. **AC8: Accessibility**
   - Given the equal access verification features
   - When navigating with assistive technology
   - Then all elements are keyboard accessible (NFR43)
   - And touch targets are 44px minimum (NFR49)
   - And focus indicators are visible (NFR46)

## Tasks / Subtasks

- [x] Task 1: Enhance Co-Managed Indicator (AC: #7, #8)
  - [x] 1.1 Update dashboard to show other guardian's name instead of just "Co-managed"
  - [x] 1.2 Display "Co-managed with [Name]" format
  - [x] 1.3 Handle multiple guardians display (future-proofing)
  - [x] 1.4 Add ARIA label for screen readers

- [x] Task 2: Implement Parent Removal Prevention (AC: #6)
  - [x] 2.1 Update Dissolve Family flow - require both guardians for co-managed families
  - [x] 2.2 Add UI indicator that family dissolution requires co-parent agreement
  - [x] 2.3 Add Firestore security rules to prevent guardian array modification (remove)
  - [x] 2.4 Add tests for guardian removal prevention

- [x] Task 3: Equal Access Test Suite (AC: #1, #6)
  - [x] 3.1 Create test for co-parent seeing all children
  - [x] 3.2 Create test for co-parent cannot remove other guardian
  - [x] 3.3 Create test for equal data access between both parents
  - [x] 3.4 Document deferred ACs in story notes

- [x] Task 4: Guardian Display Component (AC: #7)
  - [x] 4.1 Create reusable GuardianBadge component
  - [x] 4.2 Show guardian avatars with names
  - [x] 4.3 Differentiate current user from other guardians visually

## Dev Notes

### Technical Requirements

- **State Management:** Use existing FamilyContext for guardian data
- **Schema Source:** @fledgely/contracts (Zod schemas - Unbreakable Rule #1)
- **Firebase Access:** Direct SDK calls (Unbreakable Rule #2)
- **Security Rules:** Must prevent guardian removal in co-managed families

### Deferred Acceptance Criteria

The following ACs are deferred because they depend on features not yet built:

- AC2 (Screenshots) - Epic 10/15 not started
- AC3, AC4 (Agreements) - Epic 5/6 not started
- AC5 (Caregivers) - Epic 19D not started

These will be verified when their respective epics are implemented.

### Architecture Compliance

From project_context.md:

- "All types from Zod Only" - use existing schemas
- "Firebase SDK Direct" - direct Firestore access for security rules
- UI patterns established in dashboard/page.tsx

### Guardian Name Display Pattern

```typescript
// Get other guardian's display name
const otherGuardian = family.guardians.find((g) => g.uid !== currentUser.uid)
const coManagedText = otherGuardian
  ? `Co-managed with ${otherGuardian.displayName || 'Co-parent'}`
  : 'Co-managed'
```

### Security Rules for Guardian Removal Prevention

```javascript
// Prevent guardian removal in co-managed families
match /families/{familyId} {
  // Update allowed only if:
  // 1. User is a guardian
  // 2. Guardians array is not being reduced (no removals)
  allow update: if request.auth != null
    && request.auth.uid in resource.data.guardians[*].uid
    && request.resource.data.guardians.size() >= resource.data.guardians.size();
}
```

### Dissolve Family Restriction

For co-managed families (2+ guardians):

- Show message: "This family is co-managed. Dissolution requires agreement from all guardians."
- Link to future family settings page where dissolution workflow will be implemented
- MVP: Disable dissolve button for co-managed families with note about future feature

### Library/Framework Requirements

| Dependency | Version | Purpose                          |
| ---------- | ------- | -------------------------------- |
| firebase   | ^10.x   | Firebase SDK (already installed) |
| zod        | ^3.x    | Schema validation                |

### File Structure Requirements

```
apps/web/src/
├── app/
│   └── dashboard/
│       └── page.tsx                 # UPDATE - Enhanced co-managed indicator
├── components/
│   └── GuardianBadge.tsx            # NEW - Guardian display component

packages/firebase-rules/
└── firestore.rules                  # UPDATE - Guardian removal prevention
```

### Testing Requirements

- Unit test other guardian name display
- Unit test dissolve family restriction for co-managed
- Test security rules prevent guardian removal
- Test equal data access (both parents see same children)

### Previous Story Intelligence (Story 3.3)

From Story 3.3 completion:

- Co-parent is added to family.guardians array with `role: 'guardian'`
- Co-parent is added to each child's guardians array
- "Co-managed" badge already shows for families with 2+ guardians
- Dashboard displays guardian count
- FamilyContext provides `family.guardians` data

### NFR References

- NFR43: All interactive elements keyboard accessible
- NFR45: Color contrast 4.5:1 minimum
- NFR46: Visible focus indicators
- NFR49: 44x44px minimum touch target

### References

- [Source: docs/epics/epic-list.md#Story-3.4]
- [Source: docs/epics/epic-list.md#Story-3.3]
- [Source: docs/project_context.md#The-5-Unbreakable-Rules]
- [Source: docs/sprint-artifacts/stories/3-3-co-parent-invitation-acceptance.md]

## Dev Agent Record

### Context Reference

- Epic: 3 (Co-Parent Invitation & Family Sharing)
- Sprint: 2 (Feature Development)
- Story Key: 3-4-equal-access-verification
- Depends On: Story 3.3 (completed)

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- Created GuardianBadge component that displays "Co-managed with [Name]" showing other guardian's display name
- Updated dashboard to use new GuardianBadge component with proper ARIA labels for accessibility
- Updated Firestore security rules to prevent guardian removal (guardians array can only grow, not shrink)
- DissolveFamilyModal already had multi-guardian handling - shows informational message for co-managed families
- Created comprehensive test suite for equal access verification logic
- 108 total tests pass (53 functions + 55 web)

**Code Review Fixes Applied:**

- Added input validation for GuardianBadge props (guardians array and currentUserUid)
- Added console.error suppression in error handling test
- Added tests for invalid props edge cases (empty array, empty string)

### File List

| File                                                  | Action   | Purpose                                                |
| ----------------------------------------------------- | -------- | ------------------------------------------------------ |
| apps/web/src/components/GuardianBadge.tsx             | Created  | Component to display co-managed indicator with names   |
| apps/web/src/components/GuardianBadge.test.tsx        | Created  | Tests for GuardianBadge component                      |
| apps/web/src/app/dashboard/page.tsx                   | Modified | Use GuardianBadge component instead of inline badge    |
| apps/web/src/services/equalAccessVerification.test.ts | Created  | Tests for equal access and guardian removal prevention |
| packages/firebase-rules/firestore.rules               | Modified | Prevent guardian removal in co-managed families        |

## Change Log

| Date       | Change                                       |
| ---------- | -------------------------------------------- |
| 2025-12-28 | Story created (ready-for-dev)                |
| 2025-12-28 | Story implementation completed               |
| 2025-12-28 | Code review fixes applied (2 HIGH, 1 MEDIUM) |
