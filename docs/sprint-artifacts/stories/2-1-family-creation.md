# Story 2.1: Family Creation

Status: done

## Story

As a **new parent with an account**,
I want **to create a family**,
So that **I can begin adding children and setting up monitoring agreements**.

## Acceptance Criteria

1. **AC1: Family Creation Flow**
   - Given a parent has signed in but has no family
   - When they complete the family creation flow
   - Then a family document is created in Firestore `families/{familyId}`
   - And the parent is added as primary guardian with full permissions
   - And family validates against familySchema from @fledgely/contracts

2. **AC2: Family Document Structure**
   - Given a family is created
   - When the document is stored
   - Then family has unique familyId generated (UUID)
   - And family has createdAt timestamp
   - And family has name field (optional, default: "[Parent Name]'s Family")
   - And family has guardians array with creating parent

3. **AC3: User Profile Update**
   - Given a family is created
   - When the parent becomes a guardian
   - Then user profile is updated with familyId reference
   - And user role is set to 'primary_guardian'

4. **AC4: Redirect After Creation**
   - Given a family is successfully created
   - When the user completes the flow
   - Then parent is redirected to add first child page (or dashboard with prompt)

5. **AC5: Accessibility**
   - Given the family creation form
   - When navigating with assistive technology
   - Then all form elements are keyboard accessible
   - And labels are properly associated
   - And error messages are announced

## Tasks / Subtasks

- [x] Task 1: Create Family Schema (AC: #1, #2)
  - [x] 1.1 Add familySchema to packages/shared/src/contracts/index.ts
  - [x] 1.2 Add guardianRoleSchema (primary_guardian, guardian)
  - [x] 1.3 Export Family and GuardianRole types
  - [x] 1.4 Update userSchema to include optional familyId

- [x] Task 2: Create Family Service (AC: #1, #2, #3)
  - [x] 2.1 Create apps/web/src/services/familyService.ts
  - [x] 2.2 Implement createFamily function (creates family doc + updates user)
  - [x] 2.3 Implement getFamily function
  - [x] 2.4 Implement getUserFamily function (get family for current user)
  - [x] 2.5 Use Firebase SDK directly (no abstractions)

- [x] Task 3: Add Firestore Security Rules (AC: #1)
  - [x] 3.1 Add security rules for families collection
  - [x] 3.2 Guardians can read/write their own family
  - [x] 3.3 Only authenticated users can create families

- [x] Task 4: Create Family Creation Page (AC: #1, #4, #5)
  - [x] 4.1 Create apps/web/src/app/family/create/page.tsx
  - [x] 4.2 Add optional family name input field
  - [x] 4.3 Add create family button with loading state
  - [x] 4.4 Redirect to dashboard after creation
  - [x] 4.5 Style consistently with existing pages

- [x] Task 5: Update Onboarding Flow (AC: #4)
  - [x] 5.1 Update onboarding page to redirect to family creation
  - [x] 5.2 Or add family creation directly to onboarding
  - [x] 5.3 Handle users who already have a family (redirect to dashboard)

- [x] Task 6: Add Family Context (AC: #3)
  - [x] 6.1 Create apps/web/src/contexts/FamilyContext.tsx
  - [x] 6.2 Provide current user's family to all components
  - [x] 6.3 Add to layout.tsx provider hierarchy

## Dev Notes

### Technical Requirements

- **Database:** Firestore with typed access via familySchema
- **Schema Source:** @fledgely/shared/contracts (Zod schemas only - Unbreakable Rule #1)
- **Firebase Access:** Direct SDK calls (no abstractions - Unbreakable Rule #2)
- **Auth Integration:** Extend existing AuthContext from Epic 1

### Architecture Compliance

From project_context.md:

- "All types from Zod Only" - familySchema must be Zod-based
- "Firebase SDK Direct" - use `doc()`, `setDoc()`, `getDoc()` directly
- "Functions Delegate to Services" - service layer for business logic

### Family Schema Definition

```typescript
// packages/shared/src/contracts/index.ts
import { z } from 'zod'

export const guardianRoleSchema = z.enum(['primary_guardian', 'guardian'])
export type GuardianRole = z.infer<typeof guardianRoleSchema>

export const familyGuardianSchema = z.object({
  uid: z.string(),
  role: guardianRoleSchema,
  addedAt: z.date(),
})
export type FamilyGuardian = z.infer<typeof familyGuardianSchema>

export const familySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  guardians: z.array(familyGuardianSchema).min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type Family = z.infer<typeof familySchema>

// Update userSchema to include familyId
export const userSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  displayName: z.string().nullable(),
  photoURL: z.string().url().nullable(),
  familyId: z.string().uuid().nullable(), // NEW - reference to family
  createdAt: z.date(),
  lastLoginAt: z.date(),
  lastActivityAt: z.date(),
})
```

### Firestore Document Structure

```
/families/{familyId}
  - id: string (UUID)
  - name: string
  - guardians: array
    - uid: string
    - role: 'primary_guardian' | 'guardian'
    - addedAt: Timestamp
  - createdAt: Timestamp
  - updatedAt: Timestamp

/users/{uid}
  - ... existing fields ...
  - familyId: string | null  # NEW - reference to family
```

### Security Rules Pattern

```javascript
// packages/firebase-rules/firestore.rules
match /families/{familyId} {
  // Only guardians can read family
  allow read: if request.auth != null &&
    request.auth.uid in resource.data.guardians[*].uid;

  // Only authenticated users can create families
  allow create: if request.auth != null &&
    request.auth.uid in request.resource.data.guardians[*].uid;

  // Only guardians can update family
  allow update: if request.auth != null &&
    request.auth.uid in resource.data.guardians[*].uid;
}
```

### Library/Framework Requirements

| Dependency | Version | Purpose                                 |
| ---------- | ------- | --------------------------------------- |
| firebase   | ^10.x   | Firebase SDK (already installed)        |
| zod        | ^3.x    | Schema validation (in @fledgely/shared) |
| uuid       | ^9.x    | Generate UUIDs for familyId             |

### File Structure Requirements

```
packages/shared/src/contracts/
└── index.ts                    # UPDATE - Add familySchema, guardianRoleSchema

apps/web/src/
├── lib/
│   └── firebase.ts            # No changes needed
├── services/
│   ├── userService.ts         # UPDATE - Update user's familyId
│   └── familyService.ts       # NEW - Family operations
├── contexts/
│   ├── AuthContext.tsx        # UPDATE - Expose user's family status
│   └── FamilyContext.tsx      # NEW - Family state provider
└── app/
    ├── onboarding/
    │   └── page.tsx           # UPDATE - Redirect to family creation
    ├── family/
    │   └── create/
    │       └── page.tsx       # NEW - Family creation page
    └── dashboard/
        └── page.tsx           # UPDATE - Show family info or creation prompt

packages/firebase-rules/
└── firestore.rules            # UPDATE - Add families collection rules
```

### Testing Requirements

- Unit test familySchema validation
- Integration test with Firestore emulator
- Test family creation creates both family doc and updates user
- Test security rules deny cross-family access
- Test redirect after family creation

### Previous Story Intelligence (Epic 1)

From Epic 1 completion:

- Firebase initialized with lazy loading pattern
- getFirebaseAuth(), getFirestoreDb() for lazy initialization
- AuthContext provides firebaseUser, userProfile
- userService pattern: service functions call Firebase directly
- Inline styles consistent across all pages
- 44px touch targets for all interactive elements
- Focus indicators and aria attributes for accessibility

**Key Pattern to Follow:**

```typescript
// From userService.ts - use same pattern for familyService
export async function createFamily(user: FirebaseUser, familyName?: string): Promise<Family> {
  const db = getFirestoreDb()
  const familyId = crypto.randomUUID()

  const family: Omit<Family, 'createdAt' | 'updatedAt'> = {
    id: familyId,
    name: familyName || `${user.displayName?.split(' ')[0] || 'My'}'s Family`,
    guardians: [
      {
        uid: user.uid,
        role: 'primary_guardian',
        addedAt: new Date(),
      },
    ],
  }

  // Validate with schema
  const validated = familySchema.parse({
    ...family,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  // Create family document
  const familyRef = doc(db, 'families', familyId)
  await setDoc(familyRef, {
    ...validated,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  // Update user with familyId
  const userRef = doc(db, 'users', user.uid)
  await updateDoc(userRef, { familyId })

  return validated
}
```

### NFR References

- NFR43: All interactive elements keyboard accessible
- NFR45: Color contrast 4.5:1 minimum
- NFR46: Visible focus indicators
- NFR49: 44x44px minimum touch target

### References

- [Source: docs/epics/epic-list.md#Story-2.1]
- [Source: docs/project_context.md#The-5-Unbreakable-Rules]
- [Source: docs/project_context.md#Schema-Reference]

## Dev Agent Record

### Context Reference

- Epic: 2 (Family Creation & Child Profiles)
- Sprint: 2 (Feature Development)
- Story Key: 2-1-family-creation
- Depends On: Epic 1 (completed)

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

None - implementation completed without issues.

### Completion Notes List

1. familySchema, guardianRoleSchema, familyGuardianSchema added to @fledgely/shared/contracts
2. userSchema updated with familyId field
3. familyService.ts created with createFamily, getFamily, getUserFamily functions
4. Firestore security rules added for families collection with guardian-based access control
5. Family creation page at /family/create with accessible form and loading states
6. Onboarding page updated to redirect to family creation for users without a family
7. FamilyContext added to provide family data throughout the app
8. Dashboard updated to show family info or prompt to create family

### File List

- packages/shared/src/contracts/index.ts (MODIFIED - added family schemas)
- apps/web/src/services/userService.ts (MODIFIED - added familyId to createUserProfile)
- apps/web/src/services/familyService.ts (NEW - family CRUD operations)
- packages/firebase-rules/firestore.rules (MODIFIED - added families collection rules)
- apps/web/src/app/family/create/page.tsx (NEW - family creation page)
- apps/web/src/app/onboarding/page.tsx (MODIFIED - redirect to family creation)
- apps/web/src/contexts/FamilyContext.tsx (NEW - family state provider)
- apps/web/src/app/layout.tsx (MODIFIED - added FamilyProvider)
- apps/web/src/app/dashboard/page.tsx (MODIFIED - show family info)

## Change Log

| Date       | Change                                             |
| ---------- | -------------------------------------------------- |
| 2025-12-28 | Story created with comprehensive developer context |
| 2025-12-28 | Implementation complete - all tasks done           |
