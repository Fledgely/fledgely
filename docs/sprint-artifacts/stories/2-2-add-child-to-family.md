# Story 2.2: Add Child to Family

Status: done

## Story

As a **parent**,
I want **to add a child to my family with their basic profile**,
So that **I can begin creating an agreement and potentially monitoring their devices**.

## Acceptance Criteria

1. **AC1: Child Document Creation**
   - Given a parent has an existing family
   - When they add a child with name, birthdate, and optional photo
   - Then a child document is created in Firestore `children/{childId}`
   - And child is linked to family via `familyId`

2. **AC2: Guardian Assignment**
   - Given a child is being added
   - When the child document is created
   - Then parent is added as guardian in child's `guardians` array with full permissions
   - And guardian has role 'primary_guardian' for first guardian

3. **AC3: Schema Validation**
   - Given child data is being stored
   - When the document is created
   - Then child profile validates against childProfileSchema
   - And age is calculated from birthdate

4. **AC4: No Account Required**
   - Given a parent is adding a child
   - When they complete the flow
   - Then child can be added without creating an account for them yet
   - And child document exists independently of any user account

5. **AC5: Accessibility**
   - Given the add child form
   - When navigating with assistive technology
   - Then all form elements are keyboard accessible
   - And labels are properly associated
   - And error messages are announced

## Tasks / Subtasks

- [x] Task 1: Create Child Schema (AC: #1, #3)
  - [x] 1.1 Add childProfileSchema to packages/shared/src/contracts/index.ts
  - [x] 1.2 Add childGuardianSchema with uid, role, addedAt
  - [x] 1.3 Include fields: id, familyId, name, birthdate, photoURL, guardians, createdAt
  - [x] 1.4 Export ChildProfile and ChildGuardian types

- [x] Task 2: Create Child Service (AC: #1, #2, #3, #4)
  - [x] 2.1 Create apps/web/src/services/childService.ts
  - [x] 2.2 Implement addChild function (creates child doc)
  - [x] 2.3 Implement getChild function
  - [x] 2.4 Implement getChildrenByFamily function
  - [x] 2.5 Add calculateAge helper function
  - [x] 2.6 Use Firebase SDK directly (no abstractions)

- [x] Task 3: Add Firestore Security Rules (AC: #1, #2)
  - [x] 3.1 Add security rules for children collection
  - [x] 3.2 Guardians can read/write children in their family
  - [x] 3.3 Child guardians array must include authenticated user

- [x] Task 4: Create Add Child Page (AC: #1, #5)
  - [x] 4.1 Create apps/web/src/app/family/children/add/page.tsx
  - [x] 4.2 Add name input field (required)
  - [x] 4.3 Add birthdate input field (required, date picker)
  - [x] 4.4 Add optional photo URL field
  - [x] 4.5 Add submit button with loading state
  - [x] 4.6 Redirect to dashboard after adding child
  - [x] 4.7 Style consistently with existing pages

- [x] Task 5: Update Dashboard to Show Children (AC: #1)
  - [x] 5.1 Add children list to FamilyContext
  - [x] 5.2 Display children in dashboard family card
  - [x] 5.3 Add "Add Child" button in dashboard

- [x] Task 6: Add Children to FamilyContext (AC: #1)
  - [x] 6.1 Update FamilyContext to load children for current family
  - [x] 6.2 Provide children array to all components
  - [x] 6.3 Add refreshChildren function

## Dev Notes

### Technical Requirements

- **Database:** Firestore with typed access via childProfileSchema
- **Schema Source:** @fledgely/shared/contracts (Zod schemas only - Unbreakable Rule #1)
- **Firebase Access:** Direct SDK calls (no abstractions - Unbreakable Rule #2)
- **Family Integration:** Children are linked to families via familyId

### Architecture Compliance

From project_context.md:

- "All types from Zod Only" - childProfileSchema must be Zod-based
- "Firebase SDK Direct" - use `doc()`, `setDoc()`, `getDoc()` directly
- "Functions Delegate to Services" - service layer for business logic

### Child Profile Schema Definition

```typescript
// packages/shared/src/contracts/index.ts
import { z } from 'zod'

export const childGuardianSchema = z.object({
  uid: z.string(),
  role: guardianRoleSchema,
  addedAt: z.date(),
})
export type ChildGuardian = z.infer<typeof childGuardianSchema>

export const childProfileSchema = z.object({
  id: z.string(),
  familyId: z.string(),
  name: z.string().min(1).max(100),
  birthdate: z.date(),
  photoURL: z.string().url().nullable(),
  guardians: z.array(childGuardianSchema).min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type ChildProfile = z.infer<typeof childProfileSchema>
```

### Firestore Document Structure

```
/children/{childId}
  - id: string (UUID)
  - familyId: string (reference to family)
  - name: string
  - birthdate: Timestamp
  - photoURL: string | null
  - guardians: array
    - uid: string
    - role: 'primary_guardian' | 'guardian'
    - addedAt: Timestamp
  - createdAt: Timestamp
  - updatedAt: Timestamp
```

### Security Rules Pattern

```javascript
// packages/firebase-rules/firestore.rules
match /children/{childId} {
  // Helper function to check if user is a guardian of this child
  function isChildGuardian() {
    return request.auth != null &&
      request.auth.uid in resource.data.guardians[].uid;
  }

  // Helper function to check if user is creating themselves as guardian
  function isCreatingAsGuardian() {
    return request.auth != null &&
      request.auth.uid in request.resource.data.guardians[].uid;
  }

  // Helper function to verify user is guardian of the family
  function isFamilyGuardian() {
    let family = get(/databases/$(database)/documents/families/$(request.resource.data.familyId));
    return request.auth.uid in family.data.guardians[].uid;
  }

  // Read: only child guardians can read
  allow read: if isChildGuardian();

  // Create: authenticated user who is guardian of the family
  allow create: if request.auth != null &&
    isCreatingAsGuardian() && isFamilyGuardian();

  // Update: only existing guardians can update
  allow update: if isChildGuardian();

  // Delete: not allowed (handled by remove child story)
  allow delete: if false;
}
```

### Age Calculation Helper

```typescript
export function calculateAge(birthdate: Date): number {
  const today = new Date()
  let age = today.getFullYear() - birthdate.getFullYear()
  const monthDiff = today.getMonth() - birthdate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
    age--
  }
  return age
}
```

### Library/Framework Requirements

| Dependency | Version | Purpose                                 |
| ---------- | ------- | --------------------------------------- |
| firebase   | ^10.x   | Firebase SDK (already installed)        |
| zod        | ^3.x    | Schema validation (in @fledgely/shared) |

### File Structure Requirements

```
packages/shared/src/contracts/
└── index.ts                    # UPDATE - Add childProfileSchema

apps/web/src/
├── services/
│   └── childService.ts         # NEW - Child operations
├── contexts/
│   └── FamilyContext.tsx       # UPDATE - Add children loading
└── app/
    ├── family/
    │   └── children/
    │       └── add/
    │           └── page.tsx    # NEW - Add child page
    └── dashboard/
        └── page.tsx            # UPDATE - Show children

packages/firebase-rules/
└── firestore.rules            # UPDATE - Add children collection rules
```

### Testing Requirements

- Unit test childProfileSchema validation
- Unit test calculateAge function
- Integration test with Firestore emulator
- Test child creation with family validation
- Test security rules deny cross-family access

### Previous Story Intelligence (Story 2.1)

From Story 2.1 completion:

- Family schema and service patterns established
- FamilyContext provides family data
- Dashboard shows family info
- Firestore security rules pattern for guardian-based access
- Inline styles consistent across all pages
- 44px touch targets for all interactive elements

### NFR References

- NFR43: All interactive elements keyboard accessible
- NFR45: Color contrast 4.5:1 minimum
- NFR46: Visible focus indicators
- NFR49: 44x44px minimum touch target

### References

- [Source: docs/epics/epic-list.md#Story-2.2]
- [Source: docs/project_context.md#The-5-Unbreakable-Rules]
- [Source: docs/project_context.md#Schema-Reference]

## Dev Agent Record

### Context Reference

- Epic: 2 (Family Creation & Child Profiles)
- Sprint: 2 (Feature Development)
- Story Key: 2-2-add-child-to-family
- Depends On: Story 2.1 (completed)

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

None - implementation completed without issues.

### Completion Notes List

1. childGuardianSchema and childProfileSchema added to @fledgely/shared/contracts
2. childService.ts created with addChild, getChild, getChildrenByFamily, calculateAge functions
3. Firestore security rules added for children collection with guardian-based access control
4. Add child page at /family/children/add with accessible form, loading states, 44px touch targets
5. FamilyContext updated to load and provide children array
6. Dashboard updated to display children list with age calculation and "Add Child" button

### File List

- packages/shared/src/contracts/index.ts (MODIFIED - added child schemas)
- apps/web/src/services/childService.ts (NEW - child CRUD operations)
- packages/firebase-rules/firestore.rules (MODIFIED - added children collection rules)
- apps/web/src/app/family/children/add/page.tsx (NEW - add child page)
- apps/web/src/contexts/FamilyContext.tsx (MODIFIED - added children loading)
- apps/web/src/app/dashboard/page.tsx (MODIFIED - show children list)
- firestore.indexes.json (MODIFIED - added children collection index)
- docs/sprint-artifacts/sprint-status.yaml (MODIFIED - updated story status)

## Change Log

| Date       | Change                                                                             |
| ---------- | ---------------------------------------------------------------------------------- |
| 2025-12-28 | Story created with comprehensive developer context                                 |
| 2025-12-28 | Implementation complete - all tasks done                                           |
| 2025-12-28 | Code review fixes: age validation, Firestore index, error handling, URL validation |
