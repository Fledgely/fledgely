# Story 2.6: Remove Child from Family

Status: done

## Story

As a **parent**,
I want **to remove a child from my family with data deletion**,
So that **I can manage family membership when a child no longer needs monitoring**.

## Acceptance Criteria

1. **AC1: Remove Button Access**
   - Given a parent with guardian permissions for a child
   - When they view the child's profile section on dashboard
   - Then they see an option to remove the child

2. **AC2: Confirmation Dialog**
   - Given a parent clicks remove child
   - When the confirmation modal appears
   - Then it displays a clear warning about permanent deletion
   - And requires typing the child's name to confirm
   - And shows what data will be deleted

3. **AC3: Guardian Verification**
   - Given a user attempts to remove a child
   - When they are not a guardian of that child
   - Then removal is blocked
   - And an error message is shown

4. **AC4: Child Document Deletion**
   - Given removal is confirmed
   - When the delete operation executes
   - Then the child document is permanently deleted from Firestore
   - And updatedAt timestamp is recorded on family document

5. **AC5: Data Deletion Scope**
   - Given a child is removed
   - When deletion completes
   - Then all child data is deleted (child profile)
   - Note: Screenshots, activity logs, and agreements are future features - not applicable yet

6. **AC6: Accessibility**
   - Given the removal flow
   - When navigating with assistive technology
   - Then all elements are keyboard accessible (NFR43)
   - And confirmation dialog has proper focus management
   - And touch targets are 44px minimum (NFR49)

7. **AC7: Future Feature Stubs**
   - Given features not yet implemented:
     - Re-authentication (Epic 1 extended)
     - Device unenrollment (Epic 12+)
     - Child account conversion (Epic 3+)
     - Audit logging (Epic 27)
   - When removing a child now
   - Then basic deletion works without these features
   - And implementation notes document future requirements

## Tasks / Subtasks

- [x] Task 1: Create Delete Child Service Function (AC: #3, #4)
  - [x] 1.1 Add deleteChild function to childService.ts
  - [x] 1.2 Verify guardian authorization before delete
  - [x] 1.3 Use deleteDoc to remove child document
  - [x] 1.4 Handle Firestore errors appropriately

- [x] Task 2: Create Removal Confirmation Modal (AC: #2, #6)
  - [x] 2.1 Create RemoveChildModal component
  - [x] 2.2 Display warning about permanent deletion
  - [x] 2.3 Require typing child's name to confirm
  - [x] 2.4 Add cancel and confirm buttons
  - [x] 2.5 Implement focus trap for accessibility
  - [x] 2.6 Style consistently with existing pages

- [x] Task 3: Add Remove Button to Dashboard (AC: #1)
  - [x] 3.1 Add remove button to child cards
  - [x] 3.2 Wire up to open confirmation modal
  - [x] 3.3 Ensure 44px touch targets

- [x] Task 4: Handle Deletion and Refresh (AC: #4, #5)
  - [x] 4.1 Call deleteChild service on confirmation
  - [x] 4.2 Refresh children list after deletion
  - [x] 4.3 Show success feedback
  - [x] 4.4 Handle errors gracefully

- [x] Task 5: Update Firestore Security Rules
  - [x] 5.1 Update children collection delete rule to allow guardian deletion

## Dev Notes

### Technical Requirements

- **Database:** Firestore with typed access via childProfileSchema
- **Schema Source:** @fledgely/shared/contracts (Zod schemas only - Unbreakable Rule #1)
- **Firebase Access:** Direct SDK calls (no abstractions - Unbreakable Rule #2)

### Architecture Compliance

From project_context.md:

- "All types from Zod Only" - use existing childProfileSchema
- "Firebase SDK Direct" - use `deleteDoc()` directly

### Important Limitations

**This story is scoped to current capabilities. The following are NOT implemented:**

1. **Re-authentication** - Would require calling signInWithPopup again before destructive action. Deferred to security hardening story.

2. **Device Unenrollment** - Devices feature is Epic 12+. No devices exist yet.

3. **Child Account Conversion** - Child accounts are not implemented yet.

4. **Audit Logging** - Full audit trail is Epic 27. We only update family's updatedAt for now.

5. **Screenshot/Activity Deletion** - These features don't exist yet.

### Service Function Pattern

```typescript
// apps/web/src/services/childService.ts
export async function deleteChild(childId: string, guardianUid: string): Promise<void> {
  // 1. Verify child exists
  // 2. Verify user is guardian
  // 3. Delete child document
}
```

### Modal Component Pattern

```typescript
// apps/web/src/components/RemoveChildModal.tsx
interface RemoveChildModalProps {
  child: ChildProfile
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
│   └── RemoveChildModal.tsx    # NEW - Confirmation modal
└── services/
    └── childService.ts         # MODIFY - Add deleteChild function
```

### Testing Requirements

- Unit test deleteChild service function
- Test modal keyboard accessibility
- Test name confirmation validation
- Test guardian verification blocks unauthorized deletion

### Previous Story Intelligence (Story 2.5)

From Story 2.5 completion:

- updateChild function pattern with authorization check
- Edit button added to dashboard child cards
- Modal patterns not yet established (first modal in app)
- 44px touch targets consistent across all pages

### NFR References

- NFR43: All interactive elements keyboard accessible
- NFR45: Color contrast 4.5:1 minimum
- NFR46: Visible focus indicators
- NFR49: 44x44px minimum touch target

### References

- [Source: docs/epics/epic-list.md#Story-2.6]
- [Source: docs/project_context.md#The-5-Unbreakable-Rules]

## Dev Agent Record

### Context Reference

- Epic: 2 (Family Creation & Child Profiles)
- Sprint: 2 (Feature Development)
- Story Key: 2-6-remove-child-from-family
- Depends On: Story 2.5 (completed)

### Agent Model Used

Claude claude-opus-4-5-20251101 (Opus 4.5)

### Debug Log References

- Build succeeded with removal modal
- Code review identified security rules issue - fixed

### Completion Notes List

1. Added deleteChild function to childService.ts with:
   - Guardian authorization verification
   - Child existence check before deletion
   - Proper FirestoreError handling
   - TODO comments for future enhancements

2. Created RemoveChildModal component with:
   - Warning icon and clear deletion message
   - Name confirmation requirement (case-insensitive)
   - Focus trap for accessibility (Tab, Shift+Tab, Escape)
   - Body scroll lock when open
   - Proper ARIA attributes

3. Dashboard integration:
   - Added "Remove" button to child cards
   - Integrated modal with deletion flow
   - Refresh children list after deletion

4. Updated Firestore security rules:
   - Changed children delete rule from `if false` to `if isChildGuardian()`

5. Accessibility compliance:
   - 44px minimum touch targets (NFR49)
   - Keyboard accessible modal (NFR43)
   - Focus management on open/close
   - ARIA labels and roles

### File List

- apps/web/src/services/childService.ts (MODIFIED - added deleteChild)
- apps/web/src/components/RemoveChildModal.tsx (NEW)
- apps/web/src/app/dashboard/page.tsx (MODIFIED - modal integration)
- packages/firebase-rules/firestore.rules (MODIFIED - delete rule)

## Change Log

| Date       | Change                                             |
| ---------- | -------------------------------------------------- |
| 2025-12-28 | Story created with comprehensive developer context |
