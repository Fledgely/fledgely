# Story 2.7: Family Dissolution Initiation

Status: done

## Story

As a **parent**,
I want **to initiate family dissolution**,
So that **I can properly end the family account when no longer needed**.

## Acceptance Criteria

1. **AC1: Dissolution Button Access**
   - Given a guardian of a family
   - When they view the family section on dashboard
   - Then they see an option to dissolve the family

2. **AC2: Dissolution Confirmation**
   - Given a guardian clicks dissolve family
   - When the confirmation modal appears
   - Then it explains that all family data will be deleted
   - And warns about permanent deletion of all children
   - And requires typing the family name to confirm

3. **AC3: Single Guardian Flow**
   - Given a family with only one guardian
   - When they confirm dissolution
   - Then all children are deleted
   - And the family document is deleted
   - And user is redirected to dashboard (showing "no family" state)

4. **AC4: Multi-Guardian Flow**
   - Given a family with multiple guardians
   - When dissolution is initiated
   - Then a message indicates that multi-guardian dissolution requires manual support
   - Note: Full multi-guardian flow (notifications, acknowledgment) deferred to Epic 3+

5. **AC5: Accessibility**
   - Given the dissolution flow
   - When navigating with assistive technology
   - Then all elements are keyboard accessible (NFR43)
   - And modal has proper focus management
   - And touch targets are 44px minimum (NFR49)

6. **AC6: Future Feature Stubs**
   - Given features not yet implemented:
     - Multi-guardian notification
     - 30-day cooling period
     - Data export options
     - Sealed audit logging
   - When dissolving a family now
   - Then single-guardian dissolution works immediately
   - And multi-guardian families show helpful message about contacting support

## Tasks / Subtasks

- [x] Task 1: Create Delete Family Service Function (AC: #3)
  - [x] 1.1 Add deleteFamily function to familyService.ts
  - [x] 1.2 Verify user is guardian before deletion
  - [x] 1.3 Delete all children in family first (using batch writes for atomicity)
  - [x] 1.4 Delete family document
  - [x] 1.5 Handle Firestore errors appropriately (user-friendly messages)

- [x] Task 2: Create Dissolution Confirmation Modal (AC: #2, #5)
  - [x] 2.1 Create DissolveFamilyModal component
  - [x] 2.2 Display warning about all data deletion
  - [x] 2.3 Require typing family name to confirm
  - [x] 2.4 Show multi-guardian warning if applicable (AC: #4)
  - [x] 2.5 Implement focus trap for accessibility
  - [x] 2.6 Style consistently with RemoveChildModal

- [x] Task 3: Add Dissolve Button to Dashboard (AC: #1)
  - [x] 3.1 Add dissolve family button to family card
  - [x] 3.2 Wire up to open confirmation modal
  - [x] 3.3 Ensure 44px touch targets

- [x] Task 4: Update Firestore Security Rules
  - [x] 4.1 Allow guardian to delete family document (single-guardian only)

- [x] Task 5: Handle Deletion and Redirect (AC: #3)
  - [x] 5.1 Delete all children in family (atomic batch write)
  - [x] 5.2 Delete family document
  - [x] 5.3 Clear family context (via refreshFamily)
  - [x] 5.4 Dashboard shows "no family" state after deletion

## Dev Notes

### Technical Requirements

- **Database:** Firestore with typed access
- **Schema Source:** @fledgely/shared/contracts (Zod schemas only - Unbreakable Rule #1)
- **Firebase Access:** Direct SDK calls (no abstractions - Unbreakable Rule #2)

### Architecture Compliance

From project_context.md:

- "All types from Zod Only" - use existing familySchema
- "Firebase SDK Direct" - use `deleteDoc()` directly

### Important Limitations - Scoped MVP

**This story is scoped to single-guardian families. The following are NOT implemented:**

1. **Multi-Guardian Notifications** - Would require notification system (Epic 41)

2. **30-Day Cooling Period** - Would require scheduled tasks and status tracking

3. **Data Export** - Would require export functionality (Epic 51)

4. **Sealed Audit Logging** - Would require audit trail system (Epic 27)

5. **Other Guardian Acknowledgment** - Would require multi-user approval workflow

**For multi-guardian families, we show a message directing them to support for now.**

### Service Function Pattern

```typescript
// apps/web/src/services/familyService.ts
export async function deleteFamily(familyId: string, guardianUid: string): Promise<void> {
  // 1. Verify family exists
  // 2. Verify user is guardian
  // 3. Check guardian count (block if multiple for now)
  // 4. Delete all children
  // 5. Delete family document
}
```

### Modal Component Pattern

```typescript
// apps/web/src/components/DissolveFamilyModal.tsx
interface DissolveFamilyModalProps {
  family: Family
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}
```

### Library/Framework Requirements

| Dependency | Version | Purpose                                 |
| ---------- | ------- | --------------------------------------- |
| firebase   | ^10.x   | Firebase SDK (already installed)        |
| zod        | ^3.x    | Schema validation (in @fledgely/shared) |

### File Structure Requirements

```
apps/web/src/
├── components/
│   └── DissolveFamilyModal.tsx    # NEW - Confirmation modal
└── services/
    └── familyService.ts            # MODIFY - Add deleteFamily function
```

### Testing Requirements

- Unit test deleteFamily service function
- Test modal keyboard accessibility
- Test name confirmation validation
- Test multi-guardian blocking

### Previous Story Intelligence (Story 2.6)

From Story 2.6 completion:

- RemoveChildModal component pattern established
- Focus trap implementation pattern
- Name confirmation pattern
- deleteChild function for cascading deletes

### NFR References

- NFR43: All interactive elements keyboard accessible
- NFR45: Color contrast 4.5:1 minimum
- NFR46: Visible focus indicators
- NFR49: 44x44px minimum touch target

### References

- [Source: docs/epics/epic-list.md#Story-2.7]
- [Source: docs/project_context.md#The-5-Unbreakable-Rules]

## Dev Agent Record

### Context Reference

- Epic: 2 (Family Creation & Child Profiles)
- Sprint: 2 (Feature Development)
- Story Key: 2-7-family-dissolution-initiation
- Depends On: Story 2.6 (completed)

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Code review found race condition in deletion - fixed with batch writes
- Code review found Firestore rules mismatch - fixed to enforce single-guardian only
- Unused import error after refactor to batch writes - removed deleteDoc import

### Completion Notes List

1. Created deleteFamily function in familyService.ts with:
   - Guardian authorization check
   - Multi-guardian family blocking with helpful error message
   - Atomic batch writes for all deletions (children, user familyId, family document)
   - User-friendly error message mapping for Firestore errors

2. Created DissolveFamilyModal component with:
   - Name confirmation requirement (case-insensitive)
   - Different UI for single vs multi-guardian families
   - Focus trap and escape key handling
   - Body scroll lock while modal is open
   - Full ARIA accessibility (labelledby, describedby, modal, busy states)

3. Integrated dissolve functionality into dashboard:
   - "Dissolve Family" button in family card actions row
   - Modal opens on button click
   - Calls deleteFamily service on confirmation
   - Refreshes family context after deletion

4. Updated Firestore security rules:
   - Allow delete only for guardians of single-guardian families
   - Rule aligns with application logic to prevent direct SDK bypass

### File List

- apps/web/src/services/familyService.ts (MODIFIED - added deleteFamily with batch writes)
- apps/web/src/components/DissolveFamilyModal.tsx (NEW - confirmation modal)
- apps/web/src/app/dashboard/page.tsx (MODIFIED - dissolve button and modal integration)
- packages/firebase-rules/firestore.rules (MODIFIED - family delete rule for single-guardian)

## Change Log

| Date       | Change                                          |
| ---------- | ----------------------------------------------- |
| 2025-12-28 | Story created with scoped MVP developer context |
| 2025-12-28 | Story completed - all tasks implemented         |
