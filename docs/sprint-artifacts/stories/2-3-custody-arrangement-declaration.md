# Story 2.3: Custody Arrangement Declaration

**Status:** done

---

## Story

As a **parent setting up a family**,
I want **to declare my custody arrangement**,
So that **the system can apply appropriate safeguards for shared custody situations**.

---

## Acceptance Criteria

### AC1: Custody Type Selection
**Given** a parent is adding a child or editing a child's profile
**When** they reach the custody declaration step
**Then** they can select from: "sole" (I'm the only guardian), "shared" (custody is shared), or "complex" (blended family/other arrangement)
**And** a clear description explains each option in plain language (6th-grade reading level)
**And** selection is required before child profile can be completed
**And** UI meets 44x44px touch targets (NFR49)

### AC2: Custody Stored in Child Document
**Given** a parent declares a custody arrangement
**When** they save the declaration
**Then** `custodyType` field is stored in child document (`children/{childId}`)
**And** `custodyDeclaration` object contains type, declaredBy, declaredAt, and optional notes
**And** schema validates against `custodyDeclarationSchema`
**And** declaration uses `serverTimestamp()` for `declaredAt`

### AC3: Complex Custody Explanation
**Given** a parent selects "complex" custody type
**When** they make this selection
**Then** a text field appears for free-text explanation (max 500 characters)
**And** text input has clear placeholder text: "Tell us about your family situation..."
**And** explanation is optional but encouraged for complex arrangements
**And** XSS protection prevents dangerous characters in input

### AC4: Shared Custody Safeguards Trigger
**Given** a parent declares "shared" custody
**When** the declaration is saved
**Then** child document is flagged with `requiresSharedCustodySafeguards: true`
**And** Epic 3A safeguards will apply when co-parent is added
**And** UI shows informational message: "Shared custody families have extra safeguards to ensure both parents have equal access."

### AC5: Custody Declaration Updateable
**Given** a child has an existing custody declaration
**When** a guardian with full permissions edits it
**Then** they can change custody type and notes
**And** previous declaration is preserved in `custodyHistory` array
**And** `updatedAt` and `updatedBy` are recorded
**And** changes are atomic (transaction-based)

### AC6: Declaration Visibility to All Guardians
**Given** a child has multiple guardians
**When** any guardian views the child profile
**Then** they can see the current custody declaration
**And** they can see who declared it and when
**And** visibility is equal for all guardians (no asymmetric access)

### AC7: No Monitoring Until Declared
**Given** a child profile exists without custody declaration
**When** a parent tries to start device monitoring
**Then** system blocks monitoring setup
**And** shows message: "Please declare your custody arrangement before setting up monitoring."
**And** provides link to custody declaration form
**And** this check happens client-side and in security rules

### AC8: Accessibility
**Given** a parent using assistive technology
**When** they declare custody arrangement
**Then** all options are keyboard accessible (NFR43)
**And** radio buttons have proper labels and ARIA attributes
**And** error states are announced via aria-live
**And** color contrast meets 4.5:1 minimum (NFR45)
**And** focus management is logical and clear

---

## Tasks / Subtasks

### Task 1: Create Custody Declaration Schema (packages/contracts/src/custody.schema.ts)
- [x] 1.1 Create `custodyTypeSchema` enum: 'sole' | 'shared' | 'complex'
- [x] 1.2 Create `custodyDeclarationSchema` with: type, notes (optional), declaredBy, declaredAt
- [x] 1.3 Create `custodyDeclarationFirestoreSchema` for Timestamp handling
- [x] 1.4 Create `custodyHistoryEntrySchema` for tracking changes
- [x] 1.5 Create `createCustodyDeclarationInputSchema` for form validation
- [x] 1.6 Create `updateCustodyDeclarationInputSchema` for edits
- [x] 1.7 Add XSS protection to notes field (same pattern as child.schema.ts)
- [x] 1.8 Export types: `CustodyType`, `CustodyDeclaration`, `CustodyHistoryEntry`
- [x] 1.9 Export from packages/contracts/src/index.ts
- [x] 1.10 Write unit tests for schema validation (30+ tests)

### Task 2: Update Child Schema (packages/contracts/src/child.schema.ts)
- [x] 2.1 Add `custodyDeclaration` optional field to `childProfileSchema`
- [x] 2.2 Add `custodyHistory` array field for tracking changes
- [x] 2.3 Add `requiresSharedCustodySafeguards` boolean field
- [x] 2.4 Add `hasCustodyDeclaration()` helper function
- [x] 2.5 Add `canStartMonitoring()` helper function (checks custody declared)
- [x] 2.6 Update `childProfileFirestoreSchema` for new fields
- [x] 2.7 Update existing unit tests to include custody fields
- [x] 2.8 Add adversarial tests for custody validation

### Task 3: Create Custody Service (apps/web/src/services/custodyService.ts)
- [x] 3.1 Implement `declareCustody(childId, input, userId)` - creates initial declaration
- [x] 3.2 Implement `updateCustody(childId, input, userId)` - updates with history
- [x] 3.3 Implement `getCustodyDeclaration(childId)` - fetches current declaration
- [x] 3.4 Use Firestore transaction for atomic updates with history preservation
- [x] 3.5 Validate user is guardian with full permissions before allowing changes
- [x] 3.6 Set `requiresSharedCustodySafeguards: true` when type is 'shared'
- [x] 3.7 Add error messages at 6th-grade reading level
- [x] 3.8 Handle case where custody is declared during child creation vs. after

### Task 4: Create useCustody Hook (apps/web/src/hooks/useCustody.ts)
- [x] 4.1 Create `useCustody(childId)` hook for custody state management
- [x] 4.2 Expose `custody`, `loading`, `error`, `declareCustody`, `updateCustody`
- [x] 4.3 Integrate with `useChild` hook for child context
- [x] 4.4 Handle loading states during custody operations
- [x] 4.5 Optimistic update for custody declaration

### Task 5: Create Custody Declaration Form Components
- [x] 5.1 Create `apps/web/src/components/custody/CustodyDeclarationForm.tsx`
- [x] 5.2 Use react-hook-form with Zod resolver (createCustodyDeclarationInputSchema)
- [x] 5.3 Radio button group for custody type selection with clear labels
- [x] 5.4 Conditional text area for "complex" type explanation
- [x] 5.5 Form-level error display with aria-live announcements
- [x] 5.6 Submit button with loading state and disabled during submission
- [x] 5.7 44x44px minimum touch targets (NFR49)
- [x] 5.8 Show informational message for "shared" selection

### Task 6: Create Custody Declaration Step in Add Child Flow
- [x] 6.1 Update add-child page to include custody step after basic info
- [x] 6.2 Create step indicator showing progress: "Child Info → Custody → Complete"
- [x] 6.3 Block completion until custody is declared
- [x] 6.4 Handle both new child creation and editing existing child
- [x] 6.5 Display SafetyResourcesLink in footer (consistent with other pages)

### Task 7: Create Custody Display Component
- [x] 7.1 Create `apps/web/src/components/custody/CustodyDisplay.tsx`
- [x] 7.2 Show current custody type with human-readable label
- [x] 7.3 Show who declared and when
- [x] 7.4 For "complex" type, show explanation text
- [x] 7.5 Include "Edit" button for guardians with full permissions

### Task 8: Update Firestore Security Rules
- [x] 8.1 Update children collection rules to allow custody fields
- [x] 8.2 Ensure only guardians with full permissions can update custody
- [x] 8.3 Validate custody declaration matches schema requirements
- [x] 8.4 Ensure custodyHistory can only be appended (not modified/deleted)
- [x] 8.5 Use explicit index checking pattern (same as existing rules)

### Task 9: Add Monitoring Gate Check
- [x] 9.1 Create helper function `canStartMonitoring(child)` in child.schema.ts
- [x] 9.2 Add client-side check in device enrollment flow (future Epic 9/12)
- [x] 9.3 Document rule for security rules: monitoring requires custody declaration
- [x] 9.4 Prepare placeholder for device enrollment gate (actual enforcement in Epic 9)

### Task 10: Write Tests
- [x] 10.1 Unit tests for `custodyDeclarationSchema` validation (30+ tests)
- [x] 10.2 Unit tests for child schema custody fields
- [x] 10.3 Unit tests for `custodyService` operations (mocked Firestore)
- [x] 10.4 Unit tests for `useCustody` hook
- [x] 10.5 Unit tests for CustodyDeclarationForm component
- [x] 10.6 Integration test: declare custody flow end-to-end
- [x] 10.7 Test custody update preserves history
- [x] 10.8 Test shared custody triggers safeguards flag
- [x] 10.9 Adversarial tests: XSS in notes field
- [x] 10.10 Accessibility tests for custody declaration form

---

## Dev Notes

### Critical Requirements

This story adds custody arrangement tracking to child profiles. Key patterns from Story 2.2:

1. **Zod-First Types** - `custodyDeclarationSchema` is the source of truth for CustodyDeclaration type
2. **Direct Firestore SDK** - No ORM abstractions per project guidelines
3. **Server Timestamps** - Use `serverTimestamp()` for reliable timestamps
4. **Transaction-Based Operations** - Atomic custody update + history append
5. **Optimistic Returns** - Return data immediately after transaction (don't re-read)
6. **Explicit Index Checking** - Firestore rules must use index checking, not `.map()`
7. **XSS Protection** - Validate notes field against dangerous characters

### Architecture Patterns

**Custody Declaration Schema:**
```typescript
// packages/contracts/src/custody.schema.ts
import { z } from 'zod'

/**
 * Custody arrangement types
 * - sole: Single parent/guardian has custody
 * - shared: Custody is shared between parents (triggers Epic 3A safeguards)
 * - complex: Blended families, step-parents, or other arrangements
 */
export const custodyTypeSchema = z.enum(['sole', 'shared', 'complex'])

export type CustodyType = z.infer<typeof custodyTypeSchema>

/**
 * Dangerous characters that could enable XSS or HTML injection
 */
const XSS_DANGEROUS_CHARS = /[<>"'`&]/

/**
 * Custody declaration stored in child document
 */
export const custodyDeclarationSchema = z.object({
  /** Type of custody arrangement */
  type: custodyTypeSchema,

  /** Optional explanation for complex arrangements (max 500 chars) */
  notes: z.string()
    .max(500, 'Explanation cannot be more than 500 characters')
    .trim()
    .refine(
      (val) => !XSS_DANGEROUS_CHARS.test(val),
      'Notes cannot contain special characters like < > " \' & `'
    )
    .optional()
    .nullable(),

  /** User who declared the custody arrangement */
  declaredBy: z.string().min(1, 'Declarer ID is required'),

  /** When the declaration was made */
  declaredAt: z.date(),
})

export type CustodyDeclaration = z.infer<typeof custodyDeclarationSchema>

/**
 * History entry for custody changes
 */
export const custodyHistoryEntrySchema = z.object({
  /** Previous custody declaration */
  previousDeclaration: custodyDeclarationSchema,

  /** When the change was made */
  changedAt: z.date(),

  /** User who made the change */
  changedBy: z.string().min(1),
})

export type CustodyHistoryEntry = z.infer<typeof custodyHistoryEntrySchema>

/**
 * Input schema for declaring custody
 */
export const createCustodyDeclarationInputSchema = z.object({
  type: custodyTypeSchema,
  notes: z.string()
    .max(500, 'Explanation cannot be more than 500 characters')
    .trim()
    .refine(
      (val) => !XSS_DANGEROUS_CHARS.test(val),
      'Notes cannot contain special characters like < > " \' & `'
    )
    .optional()
    .nullable()
    .transform((val) => (val === '' ? null : val)),
})

export type CreateCustodyDeclarationInput = z.infer<typeof createCustodyDeclarationInputSchema>
```

**Updated Child Profile Schema (additions):**
```typescript
// Add to childProfileSchema
{
  // ... existing fields ...

  /** Custody declaration - required before monitoring can begin */
  custodyDeclaration: custodyDeclarationSchema.optional().nullable(),

  /** History of custody declaration changes */
  custodyHistory: z.array(custodyHistoryEntrySchema).default([]),

  /** Whether this child requires shared custody safeguards (Epic 3A) */
  requiresSharedCustodySafeguards: z.boolean().default(false),
}
```

**Custody Service Pattern:**
```typescript
// apps/web/src/services/custodyService.ts
'use client'

import {
  doc,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  createCustodyDeclarationInputSchema,
  type CustodyDeclaration,
  type CreateCustodyDeclarationInput,
} from '@fledgely/contracts'

const CHILDREN_COLLECTION = 'children'

/**
 * Declare custody arrangement for a child
 * Only allowed by guardians with full permissions
 */
export async function declareCustody(
  childId: string,
  input: CreateCustodyDeclarationInput,
  userId: string
): Promise<CustodyDeclaration> {
  // Validate input
  createCustodyDeclarationInputSchema.parse(input)

  const childRef = doc(db, CHILDREN_COLLECTION, childId)
  const now = new Date()

  await runTransaction(db, async (transaction) => {
    const childDoc = await transaction.get(childRef)
    if (!childDoc.exists()) {
      throw new Error('Child not found')
    }

    const childData = childDoc.data()

    // Verify user is guardian with full permissions
    const guardians = childData.guardians as Array<{uid: string, permissions: string}>
    const userGuardian = guardians.find(g => g.uid === userId)

    if (!userGuardian || userGuardian.permissions !== 'full') {
      throw new Error('You do not have permission to declare custody')
    }

    // Create custody declaration
    const declaration = {
      type: input.type,
      notes: input.notes || null,
      declaredBy: userId,
      declaredAt: serverTimestamp(),
    }

    // Set shared custody safeguards flag
    const requiresSafeguards = input.type === 'shared'

    transaction.update(childRef, {
      custodyDeclaration: declaration,
      requiresSharedCustodySafeguards: requiresSafeguards,
    })
  })

  // Return optimistic data
  return {
    type: input.type,
    notes: input.notes || null,
    declaredBy: userId,
    declaredAt: now,
  }
}

/**
 * Update custody arrangement (preserves history)
 */
export async function updateCustody(
  childId: string,
  input: CreateCustodyDeclarationInput,
  userId: string
): Promise<CustodyDeclaration> {
  createCustodyDeclarationInputSchema.parse(input)

  const childRef = doc(db, CHILDREN_COLLECTION, childId)
  const now = new Date()

  await runTransaction(db, async (transaction) => {
    const childDoc = await transaction.get(childRef)
    if (!childDoc.exists()) {
      throw new Error('Child not found')
    }

    const childData = childDoc.data()

    // Verify permissions
    const guardians = childData.guardians as Array<{uid: string, permissions: string}>
    const userGuardian = guardians.find(g => g.uid === userId)

    if (!userGuardian || userGuardian.permissions !== 'full') {
      throw new Error('You do not have permission to update custody')
    }

    // Preserve previous declaration in history
    const previousDeclaration = childData.custodyDeclaration
    const history = childData.custodyHistory || []

    if (previousDeclaration) {
      history.push({
        previousDeclaration,
        changedAt: serverTimestamp(),
        changedBy: userId,
      })
    }

    // Create new declaration
    const declaration = {
      type: input.type,
      notes: input.notes || null,
      declaredBy: userId,
      declaredAt: serverTimestamp(),
    }

    const requiresSafeguards = input.type === 'shared'

    transaction.update(childRef, {
      custodyDeclaration: declaration,
      custodyHistory: history,
      requiresSharedCustodySafeguards: requiresSafeguards,
    })
  })

  return {
    type: input.type,
    notes: input.notes || null,
    declaredBy: userId,
    declaredAt: now,
  }
}
```

### Firestore Security Rules Updates

```javascript
// Add to existing children collection rules

match /children/{childId} {
  // ... existing rules ...

  // Additional validation for custody fields
  allow update: if hasFullChildPermissions() &&
    // Prevent changing immutable fields
    request.resource.data.createdBy == resource.data.createdBy &&
    request.resource.data.createdAt == resource.data.createdAt &&
    request.resource.data.familyId == resource.data.familyId &&
    // Custody history can only grow, not shrink
    (request.resource.data.custodyHistory.size() >= resource.data.custodyHistory.size() ||
     resource.data.custodyHistory == null);
}
```

### NFR Compliance Checklist

| NFR | Requirement | Implementation |
|-----|-------------|----------------|
| INV-001 | Types from Zod only | custodyDeclarationSchema with z.infer<> |
| INV-002 | Direct Firestore SDK | runTransaction, getDoc directly |
| INV-003 | Cross-family isolation | Security rules verify guardian permissions |
| NFR42 | WCAG 2.1 AA | Accessible form, aria-live |
| NFR43 | Keyboard accessible | All elements tab-navigable |
| NFR45 | 4.5:1 color contrast | Use existing design system |
| NFR49 | 44x44px touch targets | Radio buttons and buttons sized appropriately |
| NFR65 | 6th-grade reading level | Simple labels and error messages |

### Error Handling

**Error Message Mapping (6th-grade reading level):**
```typescript
const ERROR_MESSAGES: Record<string, string> = {
  'child-not-found': 'We could not find this child. Please try again.',
  'permission-denied': 'You do not have permission to change custody settings.',
  'custody-required': 'Please tell us about your custody arrangement first.',
  'notes-too-long': 'The explanation is too long. Please use 500 characters or less.',
  'invalid-type': 'Please select a custody type.',
  'unavailable': 'Connection problem. Please check your internet and try again.',
  default: 'Something went wrong. Please try again.',
}
```

### Human-Readable Custody Labels

```typescript
const CUSTODY_TYPE_LABELS: Record<CustodyType, { title: string; description: string }> = {
  sole: {
    title: 'Sole Custody',
    description: "I'm the only parent or guardian managing this child's account.",
  },
  shared: {
    title: 'Shared Custody',
    description: 'Another parent or guardian shares custody. They may be added to the family later.',
  },
  complex: {
    title: 'Complex Arrangement',
    description: 'Our family has a unique situation like step-parents, blended families, or other arrangements.',
  },
}
```

### Previous Story Intelligence

**Story 2.2 Learnings:**
1. Transaction-based operations work well for atomic updates
2. Optimistic returns avoid serverTimestamp race conditions
3. Explicit index checking in Firestore rules (not `.map()`) is required for security
4. Error messages at 6th-grade reading level improve UX
5. Screen reader announcements via aria-live for loading/success states
6. Adversarial tests catch input validation edge cases
7. XSS protection via dangerous character regex is essential for user inputs
8. Idempotency guards prevent duplicate submissions from double-clicks

**Files from Story 2.2 to Reference:**
- `packages/contracts/src/child.schema.ts` - Schema pattern with XSS protection
- `apps/web/src/services/childService.ts` - Service pattern with transactions
- `apps/web/src/hooks/useChild.ts` - Hook pattern with idempotency guard
- `packages/firebase-rules/firestore.rules` - Security rules with explicit index checking

### Git Intelligence

**Recent Commits:**
- `84b2ed6 feat(child): implement Story 2.2 - Add Child to Family` - Current patterns
- Story 2.2 established XSS protection pattern and idempotency guards

### Dependencies

**Already Installed:**
- `firebase` (in apps/web)
- `zod` (in packages/contracts)
- `react-hook-form` (in apps/web)
- `@hookform/resolvers` (in apps/web)
- shadcn/ui components (in apps/web)

**No New Dependencies Required**

### File Structure

**Files to Create:**
```
packages/contracts/src/custody.schema.ts
packages/contracts/src/custody.schema.test.ts
apps/web/src/services/custodyService.ts
apps/web/src/services/custodyService.test.ts
apps/web/src/hooks/useCustody.ts
apps/web/src/hooks/useCustody.test.ts
apps/web/src/components/custody/CustodyDeclarationForm.tsx
apps/web/src/components/custody/CustodyDeclarationForm.test.tsx
apps/web/src/components/custody/CustodyDisplay.tsx
apps/web/src/components/custody/CustodyDisplay.test.tsx
```

**Files to Modify:**
```
packages/contracts/src/child.schema.ts          # Add custody fields
packages/contracts/src/child.schema.test.ts     # Add custody field tests
packages/contracts/src/index.ts                 # Export custody schemas
packages/firebase-rules/firestore.rules         # Update children rules for custody
apps/web/src/app/(protected)/onboarding/add-child/page.tsx  # Add custody step
```

---

## References

- [Source: docs/epics/epic-list.md#Story-2.3] - Original story requirements
- [Source: docs/project_context.md] - Architecture patterns
- [Source: packages/contracts/src/child.schema.ts] - Schema pattern with XSS protection
- [Source: apps/web/src/services/childService.ts] - Service pattern to follow
- [Source: docs/sprint-artifacts/stories/2-2-add-child-to-family.md] - Previous story learnings
- [Firebase Firestore Transactions](https://firebase.google.com/docs/firestore/manage-data/transactions)

---

## Dev Agent Record

### Context Reference
- Story context: docs/sprint-artifacts/stories/2-3-custody-arrangement-declaration.md
- Epic context: Epic 2 - Family Creation & Child Profiles
- Previous story: Story 2.2 - Add Child to Family (completed)

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References
(To be filled during implementation)

### Completion Notes List
- This is Story 3 of 8 in Epic 2
- Builds on Story 2.2 child profiles
- Custody declaration gates monitoring (future Epic 9/12)
- "shared" custody triggers Epic 3A safeguards when co-parent added
- Uses same transaction pattern as Story 2.2
- XSS protection pattern from Story 2.2 applies to notes field
- Follows accessibility patterns established in Epic 1

### File List
**Created:**
- `packages/contracts/src/custody.schema.ts` ✅
- `packages/contracts/src/custody.schema.test.ts` ✅
- `apps/web/src/services/custodyService.ts` ✅
- `apps/web/src/services/custodyService.test.ts` ✅
- `apps/web/src/hooks/useCustody.ts` ✅
- `apps/web/src/hooks/useCustody.test.ts` ✅
- `apps/web/src/components/custody/CustodyDeclarationForm.tsx` ✅
- `apps/web/src/components/custody/CustodyDeclarationForm.test.tsx` ✅
- `apps/web/src/components/custody/CustodyDisplay.tsx` ✅
- `apps/web/src/components/ui/radio-group.tsx` ✅ (shadcn/ui component)
- `apps/web/src/test/setup.ts` ✅ (ResizeObserver mock for Radix UI)

**Modified:**
- `packages/contracts/src/child.schema.ts` ✅
- `packages/contracts/src/child.schema.test.ts` ✅
- `packages/contracts/src/index.ts` ✅
- `packages/firebase-rules/firestore.rules` ✅
- `apps/web/src/app/(protected)/onboarding/add-child/page.tsx` ✅
- `apps/web/src/app/(protected)/onboarding/add-child/page.test.tsx` ✅
