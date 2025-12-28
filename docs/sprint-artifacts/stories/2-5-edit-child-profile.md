# Story 2.5: Edit Child Profile

Status: done

## Story

As a **parent**,
I want **to edit my child's profile information**,
So that **I can keep their information accurate as they grow**.

## Acceptance Criteria

1. **AC1: Edit Form Access**
   - Given a parent with guardian permissions for a child
   - When they navigate to the child edit page
   - Then they see a form pre-populated with current child data
   - And form is accessible via keyboard and assistive technology

2. **AC2: Name Editing**
   - Given the parent is editing child profile
   - When they modify the child's name
   - Then name is validated (non-empty, trimmed)
   - And name change is saved to Firestore

3. **AC3: Birthdate Editing**
   - Given the parent is editing child profile
   - When they modify the child's birthdate
   - Then birthdate is validated (not in future, reasonable age)
   - And age is recalculated and displayed
   - And birthdate change is saved to Firestore

4. **AC4: Photo Upload/Change**
   - Given the parent is editing child profile
   - When they upload or change the profile photo
   - Then photo is validated (size, format)
   - And photo is uploaded to Firebase Storage
   - And photoURL is updated in child document
   - Note: Photo upload is a future enhancement - placeholder for now

5. **AC5: Validation Feedback**
   - Given the parent submits changes
   - When validation fails
   - Then clear error messages are shown
   - And focus moves to first error field
   - And errors are announced to screen readers

6. **AC6: Audit Trail**
   - Given a successful edit
   - When changes are saved
   - Then updatedAt timestamp is recorded
   - Note: Full audit trail logging will be added in Epic 27

7. **AC7: Guardian Verification**
   - Given a user attempts to edit a child
   - When they are not a guardian of that child
   - Then access is denied
   - And they are redirected to dashboard

8. **AC8: Accessibility**
   - Given the edit form
   - When navigating with assistive technology
   - Then all form elements are keyboard accessible (NFR43)
   - And labels are properly associated
   - And touch targets are 44px minimum (NFR49)
   - And error messages are announced

## Tasks / Subtasks

- [x] Task 1: Create Edit Child Service Function (AC: #2, #3, #6)
  - [x] 1.1 Add updateChild function to childService.ts
  - [x] 1.2 Validate data against childProfileSchema before write
  - [x] 1.3 Use updateDoc with serverTimestamp for updatedAt
  - [x] 1.4 Return updated child profile

- [x] Task 2: Create Edit Child Page (AC: #1, #7, #8)
  - [x] 2.1 Create apps/web/src/app/family/children/[childId]/edit/page.tsx
  - [x] 2.2 Load existing child data from FamilyContext
  - [x] 2.3 Verify user is guardian of child, redirect if not
  - [x] 2.4 Pre-populate form with current values
  - [x] 2.5 Style consistently with existing pages
  - [x] 2.6 Ensure 44px touch targets and keyboard accessibility

- [x] Task 3: Implement Edit Form (AC: #2, #3, #5)
  - [x] 3.1 Add name input field with validation
  - [x] 3.2 Add birthdate input with date picker
  - [x] 3.3 Show calculated age based on birthdate
  - [x] 3.4 Add form submission with loading state
  - [x] 3.5 Display validation errors with aria-live
  - [x] 3.6 Focus management on error

- [x] Task 4: Photo Placeholder (AC: #4)
  - [x] 4.1 Add photo display with current image or initial
  - [x] 4.2 Add "Change Photo" button (disabled/coming soon)
  - [x] 4.3 Note: Actual upload will be implemented later

- [x] Task 5: Add Edit Button to Dashboard (AC: #1)
  - [x] 5.1 Add edit button/link to child cards on dashboard
  - [x] 5.2 Link to /family/children/{childId}/edit

## Dev Notes

### Technical Requirements

- **Database:** Firestore with typed access via childProfileSchema
- **Schema Source:** @fledgely/shared/contracts (Zod schemas only - Unbreakable Rule #1)
- **Firebase Access:** Direct SDK calls (no abstractions - Unbreakable Rule #2)
- **Validation:** Zod schema validation before all Firestore writes

### Architecture Compliance

From project_context.md:

- "All types from Zod Only" - use existing childProfileSchema
- "Firebase SDK Direct" - use `updateDoc()` directly

### Page Structure

```typescript
// apps/web/src/app/family/children/[childId]/edit/page.tsx
export default function EditChildPage({ params }: { params: { childId: string } }) {
  // 1. Get child from FamilyContext
  // 2. Verify user is guardian
  // 3. Show edit form pre-populated with current values
  // 4. On submit: validate and call updateChild service
  // 5. Redirect to dashboard on success
}
```

### Service Function Pattern

```typescript
// apps/web/src/services/childService.ts
export async function updateChild(
  childId: string,
  name: string,
  birthdate: Date,
  photoURL?: string | null
): Promise<ChildProfile> {
  // 1. Validate input data
  // 2. Use updateDoc to update child document
  // 3. Read back and validate with schema
  // 4. Return updated profile
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
├── app/
│   └── family/
│       └── children/
│           └── [childId]/
│               └── edit/
│                   └── page.tsx    # NEW - Edit child page
└── services/
    └── childService.ts             # MODIFY - Add updateChild function
```

### Testing Requirements

- Unit test updateChild service function
- Test form validation (empty name, future birthdate)
- Test accessibility with keyboard navigation
- Test guardian verification redirects non-guardians

### Previous Story Intelligence (Story 2.4)

From Story 2.4 completion:

- Child profile page created at /child/profile
- FamilyContext provides children array
- calculateAge function in childService.ts
- Inline styles consistent across all pages
- 44px touch targets for all interactive elements
- Accessibility patterns established

### NFR References

- NFR43: All interactive elements keyboard accessible
- NFR45: Color contrast 4.5:1 minimum
- NFR46: Visible focus indicators
- NFR49: 44x44px minimum touch target

### References

- [Source: docs/epics/epic-list.md#Story-2.5]
- [Source: docs/project_context.md#The-5-Unbreakable-Rules]

## Dev Agent Record

### Context Reference

- Epic: 2 (Family Creation & Child Profiles)
- Sprint: 2 (Feature Development)
- Story Key: 2-5-edit-child-profile
- Depends On: Story 2.4 (completed)

### Agent Model Used

Claude claude-opus-4-5-20251101 (Opus 4.5)

### Debug Log References

- Build succeeded with edit child page
- All validation working correctly

### Completion Notes List

1. Added updateChild function to childService.ts with:
   - Name validation (non-empty, trimmed)
   - Birthdate validation (not future, age 0-25)
   - Uses updateDoc with serverTimestamp
   - Validates returned data against schema

2. Created edit child page at /family/children/[childId]/edit with:
   - Pre-populated form with current values
   - Guardian verification (redirects non-guardians)
   - Real-time age calculation from birthdate
   - Photo placeholder with "Coming Soon" badge

3. Form features:
   - Name and birthdate inputs with validation
   - Error messages with aria-live for screen readers
   - Focus management on validation errors
   - Loading state during submission

4. Dashboard enhancements:
   - Added "Edit" button to each child card
   - 44px touch targets maintained
   - Keyboard accessible with focus indicators

5. Accessibility compliance:
   - 44px minimum touch targets (NFR49)
   - Keyboard accessible forms (NFR43)
   - Visible focus indicators (NFR46)
   - ARIA labels and live regions

### File List

- apps/web/src/services/childService.ts (MODIFIED - added updateChild)
- apps/web/src/app/family/children/[childId]/edit/page.tsx (NEW)
- apps/web/src/app/dashboard/page.tsx (MODIFIED - added edit button)

## Change Log

| Date       | Change                                             |
| ---------- | -------------------------------------------------- |
| 2025-12-28 | Story created with comprehensive developer context |
