# Story 2.3: Custody Arrangement Declaration

Status: done

## Story

As a **parent setting up a family**,
I want **to declare my custody arrangement**,
So that **the system can apply appropriate safeguards for shared custody situations**.

## Acceptance Criteria

1. **AC1: Custody Type Selection**
   - Given a parent is adding a child or editing child settings
   - When they access custody arrangement settings
   - Then they can select from: sole, shared, or complex custody types
   - And custody type is stored in child document

2. **AC2: Shared Custody Safeguards**
   - Given a parent selects "shared" custody
   - When the declaration is saved
   - Then shared custody triggers Epic 3A safeguards requirement
   - And both parents must approve monitoring setup

3. **AC3: Complex Custody Explanation**
   - Given a parent selects "complex" custody
   - When they complete the declaration
   - Then they can provide free-text explanation for blended families
   - And explanation is stored with custody record

4. **AC4: Visibility to All Guardians**
   - Given a custody arrangement is declared
   - When any guardian views the child profile
   - Then custody declaration is visible to all guardians of the child

5. **AC5: Monitoring Gate**
   - Given a child without custody declaration
   - When a parent attempts to start monitoring
   - Then monitoring is blocked until custody is declared
   - And a clear message explains the requirement

6. **AC6: Update with Verification**
   - Given an existing custody declaration
   - When a guardian attempts to update it
   - Then custody declaration can be updated
   - And update timestamp is recorded

7. **AC7: Accessibility**
   - Given the custody form
   - When navigating with assistive technology
   - Then all form elements are keyboard accessible
   - And labels are properly associated
   - And error messages are announced

## Tasks / Subtasks

- [x] Task 1: Create Custody Schema (AC: #1, #3)
  - [x] 1.1 Add custodyTypeSchema enum to packages/shared/src/contracts/index.ts
  - [x] 1.2 Add custodyArrangementSchema with type, explanation, declaredBy, declaredAt
  - [x] 1.3 Update childProfileSchema to include optional custody field
  - [x] 1.4 Export CustodyType and CustodyArrangement types

- [x] Task 2: Create Custody Service (AC: #1, #2, #3, #4, #6)
  - [x] 2.1 Create apps/web/src/services/custodyService.ts
  - [x] 2.2 Implement declareCustody function (sets custody on child doc)
  - [x] 2.3 Implement updateCustody function
  - [x] 2.4 Implement getCustody function
  - [x] 2.5 Implement hasCustodyDeclaration helper function
  - [x] 2.6 Use Firebase SDK directly (no abstractions)

- [x] Task 3: Update Firestore Security Rules (AC: #1, #6)
  - [x] 3.1 Ensure child update rules allow custody field modification
  - [x] 3.2 Validate custody updates are by existing guardians only

- [x] Task 4: Create Custody Declaration Page (AC: #1, #3, #7)
  - [x] 4.1 Create apps/web/src/app/family/children/[childId]/custody/page.tsx
  - [x] 4.2 Add custody type radio buttons (sole, shared, complex)
  - [x] 4.3 Add conditional explanation textarea for "complex" type
  - [x] 4.4 Add submit button with loading state
  - [x] 4.5 Redirect to dashboard after declaration
  - [x] 4.6 Style consistently with existing pages
  - [x] 4.7 Ensure 44px touch targets and keyboard accessibility

- [x] Task 5: Add Custody Display to Child Profile (AC: #4)
  - [x] 5.1 Create custody status badge component
  - [x] 5.2 Display custody type on dashboard child cards
  - [x] 5.3 Show "No custody declared" indicator when missing

- [x] Task 6: Add Monitoring Gate Check (AC: #5)
  - [x] 6.1 Create hasCustodyDeclared utility function
  - [x] 6.2 Add custody check to any future monitoring flows
  - [x] 6.3 Create CustodyRequiredBanner component for blocking message

- [x] Task 7: Integrate with Add Child Flow (AC: #1)
  - [x] 7.1 Add custody declaration step after child creation
  - [x] 7.2 Redirect to custody page after adding child
  - [x] 7.3 Update dashboard to show custody status

## Dev Notes

### Technical Requirements

- **Database:** Firestore with typed access via custodyArrangementSchema
- **Schema Source:** @fledgely/shared/contracts (Zod schemas only - Unbreakable Rule #1)
- **Firebase Access:** Direct SDK calls (no abstractions - Unbreakable Rule #2)
- **Child Integration:** Custody is stored as a field on child document

### Architecture Compliance

From project_context.md:

- "All types from Zod Only" - custodyArrangementSchema must be Zod-based
- "Firebase SDK Direct" - use `doc()`, `updateDoc()`, `getDoc()` directly
- "Functions Delegate to Services" - service layer for business logic

### Custody Schema Definition

```typescript
// packages/shared/src/contracts/index.ts
import { z } from 'zod'

export const custodyTypeSchema = z.enum(['sole', 'shared', 'complex'])
export type CustodyType = z.infer<typeof custodyTypeSchema>

export const custodyArrangementSchema = z.object({
  type: custodyTypeSchema,
  explanation: z.string().max(1000).nullable(), // Only for 'complex' type
  declaredBy: z.string(), // UID of guardian who declared
  declaredAt: z.date(),
  updatedAt: z.date().nullable(), // Set on updates
  updatedBy: z.string().nullable(), // UID of guardian who updated
})
export type CustodyArrangement = z.infer<typeof custodyArrangementSchema>

// Update childProfileSchema to include custody
export const childProfileSchema = z.object({
  id: z.string(),
  familyId: z.string(),
  name: z.string().min(1).max(100),
  birthdate: z.date(),
  photoURL: z.string().url().nullable(),
  guardians: z.array(childGuardianSchema).min(1),
  custody: custodyArrangementSchema.nullable(), // NEW - optional custody declaration
  createdAt: z.date(),
  updatedAt: z.date(),
})
```

### Firestore Document Structure

```
/children/{childId}
  - id: string (UUID)
  - familyId: string
  - name: string
  - birthdate: Timestamp
  - photoURL: string | null
  - guardians: array
  - custody: object | null        # NEW
    - type: 'sole' | 'shared' | 'complex'
    - explanation: string | null
    - declaredBy: string (uid)
    - declaredAt: Timestamp
    - updatedAt: Timestamp | null
    - updatedBy: string | null
  - createdAt: Timestamp
  - updatedAt: Timestamp
```

### Custody Service Pattern

```typescript
// apps/web/src/services/custodyService.ts
import { doc, updateDoc, serverTimestamp, FirestoreError } from 'firebase/firestore'
import { custodyArrangementSchema, CustodyType } from '@fledgely/shared/contracts'
import { getFirestoreDb } from '../lib/firebase'

export async function declareCustody(
  childId: string,
  guardianUid: string,
  type: CustodyType,
  explanation?: string | null
): Promise<void> {
  try {
    const db = getFirestoreDb()
    const childRef = doc(db, 'children', childId)

    await updateDoc(childRef, {
      custody: {
        type,
        explanation: type === 'complex' ? explanation : null,
        declaredBy: guardianUid,
        declaredAt: serverTimestamp(),
        updatedAt: null,
        updatedBy: null,
      },
      updatedAt: serverTimestamp(),
    })
  } catch (err) {
    if (err instanceof FirestoreError) {
      console.error(
        `Firestore error declaring custody for child ${childId}:`,
        err.code,
        err.message
      )
      throw new Error(`Failed to declare custody: ${err.message}`)
    }
    throw err
  }
}

export function hasCustodyDeclaration(child: ChildProfile): boolean {
  return child.custody !== null && child.custody !== undefined
}
```

### Flow Integration

After adding a child (Story 2.2):

1. Child is created without custody
2. User is redirected to custody declaration page
3. User selects custody type
4. If "complex" selected, explanation textarea appears
5. User submits → child document updated with custody
6. User redirected to dashboard

### Library/Framework Requirements

| Dependency | Version | Purpose                                 |
| ---------- | ------- | --------------------------------------- |
| firebase   | ^10.x   | Firebase SDK (already installed)        |
| zod        | ^3.x    | Schema validation (in @fledgely/shared) |

### File Structure Requirements

```
packages/shared/src/contracts/
└── index.ts                    # UPDATE - Add custodyArrangementSchema

apps/web/src/
├── services/
│   └── custodyService.ts       # NEW - Custody operations
├── components/
│   ├── CustodyStatusBadge.tsx  # NEW - Display custody status
│   └── CustodyRequiredBanner.tsx # NEW - Monitoring gate message
└── app/
    ├── family/
    │   └── children/
    │       ├── add/
    │       │   └── page.tsx    # UPDATE - Redirect to custody after add
    │       └── [childId]/
    │           └── custody/
    │               └── page.tsx # NEW - Custody declaration page
    └── dashboard/
        └── page.tsx            # UPDATE - Show custody status
```

### Testing Requirements

- Unit test custodyArrangementSchema validation
- Unit test hasCustodyDeclaration helper
- Integration test custody declaration flow
- Test custody update with timestamp recording
- Test UI shows "complex" explanation field conditionally
- Test accessibility with keyboard navigation

### Previous Story Intelligence (Story 2.2)

From Story 2.2 completion:

- Child schema and service patterns established
- FamilyContext provides family and children data
- Dashboard shows children with ages
- Firestore security rules pattern for child guardian access
- Inline styles consistent across all pages
- 44px touch targets for all interactive elements
- Age validation pattern (0-18 years)
- Error handling with FirestoreError type narrowing
- Firestore indexes for queries

### NFR References

- NFR43: All interactive elements keyboard accessible
- NFR45: Color contrast 4.5:1 minimum
- NFR46: Visible focus indicators
- NFR49: 44x44px minimum touch target

### References

- [Source: docs/epics/epic-list.md#Story-2.3]
- [Source: docs/project_context.md#The-5-Unbreakable-Rules]
- [Source: docs/project_context.md#Schema-Reference]

## Dev Agent Record

### Context Reference

- Epic: 2 (Family Creation & Child Profiles)
- Sprint: 2 (Feature Development)
- Story Key: 2-3-custody-arrangement-declaration
- Depends On: Story 2.2 (completed)

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

None - implementation completed without issues.

### Completion Notes List

1. custodyTypeSchema and custodyArrangementSchema added to @fledgely/shared/contracts
2. childProfileSchema updated to include optional custody field
3. custodyService.ts created with declareCustody, updateCustody, getCustody, hasCustodyDeclaration functions
4. childService.ts updated to include custody: null in new child documents and handle custody timestamp conversion
5. Custody declaration page at /family/children/[childId]/custody with accessible form, loading states, 44px touch targets
6. CustodyStatusBadge component created for displaying custody status
7. CustodyRequiredBanner component created for monitoring gate messaging
8. Dashboard updated to display custody status and "Declare Custody" button when missing
9. Add child page updated to redirect to custody declaration after child creation
10. Existing Firestore security rules already support custody field updates by guardians

### File List

- packages/shared/src/contracts/index.ts (MODIFIED - added custody schemas)
- apps/web/src/services/custodyService.ts (NEW - custody CRUD operations)
- apps/web/src/services/childService.ts (MODIFIED - custody timestamp handling)
- apps/web/src/app/family/children/[childId]/custody/page.tsx (NEW - custody declaration page)
- apps/web/src/components/CustodyStatusBadge.tsx (NEW - custody status display)
- apps/web/src/components/CustodyRequiredBanner.tsx (NEW - monitoring gate banner)
- apps/web/src/app/dashboard/page.tsx (MODIFIED - show custody status)
- apps/web/src/app/family/children/add/page.tsx (MODIFIED - redirect to custody)
- docs/sprint-artifacts/sprint-status.yaml (MODIFIED - updated story status)

## Change Log

| Date       | Change                                                                       |
| ---------- | ---------------------------------------------------------------------------- |
| 2025-12-28 | Story created with comprehensive developer context                           |
| 2025-12-28 | Implementation complete - all tasks done                                     |
| 2025-12-28 | Code review fixes: Zod validation at write, schema refinement, accessibility |
