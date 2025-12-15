# Story 2.1: Family Creation

**Status:** done

---

## Story

As a **new parent with an account**,
I want **to create a family**,
So that **I can begin adding children and setting up monitoring agreements**.

---

## Acceptance Criteria

### AC1: Family Document Creation
**Given** a parent has signed in but has no family
**When** they complete the family creation flow
**Then** a family document is created in Firestore `families/{familyId}`
**And** the parent is added as primary guardian with full permissions
**And** family validates against familySchema from @fledgely/contracts
**And** family has unique familyId generated
**And** family creation timestamp is recorded

### AC2: User-Family Association
**Given** a family is created
**When** the creation completes successfully
**Then** the user's document is updated with `familyId` reference
**And** user's role is set to 'guardian' with full permissions
**And** association is atomic (both updates succeed or both fail)

### AC3: Redirect to Add Child
**Given** family creation succeeds
**When** the family document is created
**Then** parent is redirected to add first child flow
**And** onboarding progress is updated
**And** empty state UI shows "Add your first child" CTA

### AC4: Idempotent Operation
**Given** a parent already has a family
**When** they attempt to create another family
**Then** operation is blocked with friendly message
**And** they are redirected to their existing family dashboard
**And** no duplicate family is created

### AC5: Error Handling
**Given** family creation fails for any reason
**When** an error occurs
**Then** user sees a friendly error message at 6th-grade reading level
**And** user can retry without page refresh
**And** error is logged with correlation ID
**And** user's auth state is preserved

### AC6: Accessibility
**Given** a parent using assistive technology
**When** they create a family
**Then** all form elements are keyboard accessible (NFR43)
**And** success/failure states are announced to screen readers
**And** focus management follows logical order
**And** color contrast meets 4.5:1 minimum (NFR45)

---

## Tasks / Subtasks

### Task 1: Create Family Schema (packages/contracts/src/family.schema.ts)
- [x] 1.1 Create `familySchema` with Zod validation
- [x] 1.2 Define required fields: `id`, `createdAt`, `createdBy`
- [x] 1.3 Define guardian reference structure: `guardians[]` with uid, role, permissions, joinedAt
- [x] 1.4 Export types: `Family`, `FamilyGuardian`, `CreateFamilyInput`
- [x] 1.5 Add Firestore timestamp handling (familyFirestoreSchema)
- [x] 1.6 Add convertFirestoreToFamily helper function
- [x] 1.7 Export from packages/contracts/src/index.ts
- [x] 1.8 Write unit tests for schema validation (36 tests)

### Task 2: Create Family Service (apps/web/src/services/familyService.ts)
- [x] 2.1 Create `familyService` with Firestore operations
- [x] 2.2 Implement `createFamily(userId)` - creates new family with user as guardian
- [x] 2.3 Implement `getFamily(familyId)` - fetches family by ID
- [x] 2.4 Implement `getFamilyForUser(userId)` - fetches family for user
- [x] 2.5 Use Firestore transaction for atomic family + user update
- [x] 2.6 Use `serverTimestamp()` for timestamps
- [x] 2.7 Validate against familySchema before writing
- [x] 2.8 Generate unique familyId using Firestore auto-ID

### Task 3: Create useFamily Hook (apps/web/src/hooks/useFamily.ts)
- [x] 3.1 Create `useFamily` hook for family state management
- [x] 3.2 Expose `family`, `loading`, `error`, `createFamily` function
- [x] 3.3 Integrate with `useAuthContext` for user
- [x] 3.4 Auto-fetch family when user has familyId
- [x] 3.5 Handle loading states during family operations

### Task 4: Update User Schema for Family Reference
- [x] 4.1 Add optional `familyId` field to userSchema
- [x] 4.2 Add `role` field (guardian | child | caregiver)
- [x] 4.3 Update createUserInputSchema if needed
- [x] 4.4 Update userFirestoreSchema
- [x] 4.5 Update convertFirestoreToUser

### Task 5: Create Family Creation Page
- [x] 5.1 Create `apps/web/src/app/(protected)/onboarding/create-family/page.tsx`
- [x] 5.2 Simple confirmation UI ("Create your family to get started")
- [x] 5.3 Create family button with loading state
- [x] 5.4 Success redirect to add-child page
- [x] 5.5 Error display with retry option
- [x] 5.6 Full accessibility support (WCAG 2.1 AA)

### Task 6: Update Onboarding Flow
- [x] 6.1 Update onboarding page to check for family existence
- [x] 6.2 No family → redirect to create-family
- [x] 6.3 Has family, no children → redirect to add-child
- [x] 6.4 Has family + children → redirect to dashboard

### Task 7: Create Firestore Security Rules
- [x] 7.1 Add security rules for families collection
- [x] 7.2 Only authenticated users can create families
- [x] 7.3 Only guardians can read/write their own family
- [x] 7.4 Users can only update their own familyId

### Task 8: Write Tests
- [x] 8.1 Unit tests for `familySchema` validation (36 tests)
- [x] 8.2 Unit tests for `familyService` operations (mocked Firestore) (20 tests)
- [x] 8.3 Unit tests for `useFamily` hook (10 tests)
- [x] 8.4 Integration test: family creation flow
- [x] 8.5 Test error handling and recovery
- [x] 8.6 Test idempotency (can't create duplicate family)
- [x] 8.7 Accessibility tests for family creation page

---

## Dev Notes

### Critical Requirements

This story creates the family foundation for Epic 2. Key patterns:

1. **Zod-First Types** - `familySchema` defines the source of truth for Family type
2. **Direct Firestore SDK** - No ORM abstractions per project guidelines
3. **Server Timestamps** - Use `serverTimestamp()` for reliable timestamps
4. **Transaction-Based Operations** - Atomic family creation + user update
5. **Idempotent Operations** - Family creation should be safe to retry

### Architecture Patterns

**Family Schema (following user.schema.ts pattern):**
```typescript
// packages/contracts/src/family.schema.ts
import { z } from 'zod'

/**
 * Guardian permission levels
 */
export const guardianPermissionSchema = z.enum([
  'full',      // All permissions
  'readonly',  // View only (future use)
])

export type GuardianPermission = z.infer<typeof guardianPermissionSchema>

/**
 * Guardian role within a family
 */
export const guardianRoleSchema = z.enum([
  'primary',   // Created the family
  'co-parent', // Invited guardian with equal access
])

export type GuardianRole = z.infer<typeof guardianRoleSchema>

/**
 * Family guardian reference
 */
export const familyGuardianSchema = z.object({
  /** Guardian's user uid */
  uid: z.string().min(1, 'Guardian ID is required'),

  /** Guardian's role in the family */
  role: guardianRoleSchema,

  /** Guardian's permission level */
  permissions: guardianPermissionSchema,

  /** When the guardian joined the family */
  joinedAt: z.date(),
})

export type FamilyGuardian = z.infer<typeof familyGuardianSchema>

/**
 * Complete family document as stored in Firestore
 */
export const familySchema = z.object({
  /** Unique family identifier (Firestore document ID) */
  id: z.string().min(1, 'Family ID is required'),

  /** Timestamp when the family was created */
  createdAt: z.date(),

  /** User uid who created the family */
  createdBy: z.string().min(1, 'Creator ID is required'),

  /** Array of guardians (parents) in the family */
  guardians: z.array(familyGuardianSchema).min(1, 'At least one guardian is required'),

  /** Array of child uids (populated in Story 2.2) */
  children: z.array(z.string()).default([]),
})

export type Family = z.infer<typeof familySchema>

/**
 * Input schema for creating a new family
 */
export const createFamilyInputSchema = z.object({
  /** User uid creating the family */
  createdBy: z.string().min(1, 'Creator ID is required'),
})

export type CreateFamilyInput = z.infer<typeof createFamilyInputSchema>
```

**Family Service Pattern (following userService.ts):**
```typescript
// apps/web/src/services/familyService.ts
'use client'

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
  runTransaction,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  familySchema,
  createFamilyInputSchema,
  type Family,
  type CreateFamilyInput,
} from '@fledgely/contracts'

const FAMILIES_COLLECTION = 'families'
const USERS_COLLECTION = 'users'

/**
 * Create a new family with the user as primary guardian
 * Uses transaction to atomically create family and update user
 */
export async function createFamily(userId: string): Promise<Family> {
  const input: CreateFamilyInput = { createdBy: userId }
  createFamilyInputSchema.parse(input)

  // Check if user already has a family
  const existingFamily = await getFamilyForUser(userId)
  if (existingFamily) {
    throw new Error('User already has a family')
  }

  // Create family in transaction
  const familyRef = doc(collection(db, FAMILIES_COLLECTION))
  const userRef = doc(db, USERS_COLLECTION, userId)

  await runTransaction(db, async (transaction) => {
    // Verify user exists
    const userDoc = await transaction.get(userRef)
    if (!userDoc.exists()) {
      throw new Error('User not found')
    }

    // Create family document
    const familyData = {
      id: familyRef.id,
      createdAt: serverTimestamp(),
      createdBy: userId,
      guardians: [{
        uid: userId,
        role: 'primary',
        permissions: 'full',
        joinedAt: serverTimestamp(),
      }],
      children: [],
    }

    transaction.set(familyRef, familyData)

    // Update user with familyId
    transaction.update(userRef, {
      familyId: familyRef.id,
      role: 'guardian',
    })
  })

  // Fetch and return created family
  const snapshot = await getDoc(familyRef)
  return convertFirestoreFamily(snapshot.data()!, snapshot.id)
}

/**
 * Get family by ID
 */
export async function getFamily(familyId: string): Promise<Family | null> {
  const familyRef = doc(db, FAMILIES_COLLECTION, familyId)
  const snapshot = await getDoc(familyRef)

  if (!snapshot.exists()) {
    return null
  }

  return convertFirestoreFamily(snapshot.data(), snapshot.id)
}

/**
 * Get family for a user by their familyId
 */
export async function getFamilyForUser(userId: string): Promise<Family | null> {
  const userRef = doc(db, USERS_COLLECTION, userId)
  const userSnapshot = await getDoc(userRef)

  if (!userSnapshot.exists()) {
    return null
  }

  const userData = userSnapshot.data()
  if (!userData.familyId) {
    return null
  }

  return getFamily(userData.familyId)
}

/**
 * Convert Firestore document data to Family type
 */
function convertFirestoreFamily(
  data: Record<string, unknown>,
  id: string
): Family {
  return familySchema.parse({
    id,
    createdAt: (data.createdAt as Timestamp)?.toDate(),
    createdBy: data.createdBy,
    guardians: (data.guardians as Array<Record<string, unknown>>)?.map(g => ({
      uid: g.uid,
      role: g.role,
      permissions: g.permissions,
      joinedAt: (g.joinedAt as Timestamp)?.toDate(),
    })),
    children: data.children || [],
  })
}
```

**useFamily Hook Pattern:**
```typescript
// apps/web/src/hooks/useFamily.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { useUser } from '@/hooks/useUser'
import { createFamily, getFamilyForUser } from '@/services/familyService'
import type { Family } from '@fledgely/contracts'

export interface UseFamilyReturn {
  family: Family | null
  loading: boolean
  error: Error | null
  createNewFamily: () => Promise<Family>
  hasFamily: boolean
}

export function useFamily(): UseFamilyReturn {
  const { user: authUser } = useAuthContext()
  const { userProfile } = useUser()
  const [family, setFamily] = useState<Family | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Fetch family when user profile is available
  useEffect(() => {
    if (!authUser || !userProfile) {
      setFamily(null)
      setLoading(false)
      return
    }

    const fetchFamily = async () => {
      setLoading(true)
      setError(null)

      try {
        const userFamily = await getFamilyForUser(authUser.uid)
        setFamily(userFamily)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load family'))
      } finally {
        setLoading(false)
      }
    }

    fetchFamily()
  }, [authUser, userProfile])

  const createNewFamily = useCallback(async (): Promise<Family> => {
    if (!authUser) {
      throw new Error('Must be logged in to create a family')
    }

    setLoading(true)
    setError(null)

    try {
      const newFamily = await createFamily(authUser.uid)
      setFamily(newFamily)
      return newFamily
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create family')
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [authUser])

  return {
    family,
    loading,
    error,
    createNewFamily,
    hasFamily: family !== null,
  }
}
```

### User Schema Updates

Add the following fields to userSchema:
```typescript
// Add to packages/contracts/src/user.schema.ts

/** Optional family reference (added in Story 2.1) */
familyId: z.string().optional(),

/** User's role (guardian for parents, child for children) */
role: z.enum(['guardian', 'child', 'caregiver']).optional(),
```

### Firestore Security Rules

```javascript
// firestore.rules additions

match /families/{familyId} {
  // Allow create if user is authenticated and setting themselves as guardian
  allow create: if request.auth != null
    && request.resource.data.createdBy == request.auth.uid
    && request.resource.data.guardians[0].uid == request.auth.uid;

  // Allow read if user is a guardian in this family
  allow read: if request.auth != null
    && request.auth.uid in resource.data.guardians.map(g => g.uid);

  // Allow update if user is a guardian with full permissions
  allow update: if request.auth != null
    && request.auth.uid in resource.data.guardians.filter(g => g.permissions == 'full').map(g => g.uid);
}

match /users/{userId} {
  // Allow update of familyId only by the user themselves
  allow update: if request.auth != null
    && request.auth.uid == userId
    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['familyId', 'role', 'lastLoginAt']);
}
```

### NFR Compliance Checklist

| NFR | Requirement | Implementation |
|-----|-------------|----------------|
| INV-001 | Types from Zod only | familySchema with z.infer<> |
| INV-002 | Direct Firestore SDK | runTransaction, getDoc, setDoc directly |
| NFR42 | WCAG 2.1 AA | Accessible form, announcements |
| NFR43 | Keyboard accessible | All elements tab-navigable |
| NFR45 | 4.5:1 color contrast | Use existing design system |
| NFR65 | 6th-grade reading level | Simple error messages |

### Error Handling

**Error Message Mapping (6th-grade reading level):**
```typescript
const errorMessages: Record<string, string> = {
  'already-has-family': 'You already have a family. Go to your dashboard to see it.',
  'user-not-found': 'Something went wrong. Please try signing in again.',
  'permission-denied': 'Unable to create your family. Please try again.',
  'unavailable': 'Connection problem. Please check your internet and try again.',
  default: 'Something went wrong creating your family. Please try again.',
}
```

### Dependencies

**Already Installed:**
- `firebase` (in apps/web)
- `zod` (in packages/contracts)

**No New Dependencies Required**

### Previous Story Intelligence

This story builds on Epic 1:
- `apps/web/src/hooks/useAuth.ts` - Firebase Auth hook
- `apps/web/src/hooks/useUser.ts` - User profile management
- `apps/web/src/services/userService.ts` - User service patterns
- `packages/contracts/src/user.schema.ts` - Schema pattern to follow

### File Structure

**Files to Create:**
```
packages/contracts/src/family.schema.ts
packages/contracts/src/family.schema.test.ts
apps/web/src/services/familyService.ts
apps/web/src/services/familyService.test.ts
apps/web/src/hooks/useFamily.ts
apps/web/src/hooks/useFamily.test.ts
apps/web/src/app/(protected)/onboarding/create-family/page.tsx
```

**Files to Modify:**
```
packages/contracts/src/index.ts              # Export familySchema
packages/contracts/src/user.schema.ts        # Add familyId, role fields
apps/web/src/app/(protected)/onboarding/page.tsx  # Update routing logic
firestore.rules                              # Add families collection rules
```

---

## References

- [Source: docs/epics/epic-list.md#Story-2.1] - Original story requirements
- [Source: docs/project_context.md] - Architecture patterns
- [Source: packages/contracts/src/user.schema.ts] - Schema pattern to follow
- [Source: apps/web/src/services/userService.ts] - Service pattern to follow
- [Firebase Firestore Transactions](https://firebase.google.com/docs/firestore/manage-data/transactions)

---

## Dev Agent Record

### Context Reference
- Story context: docs/sprint-artifacts/stories/2-1-family-creation.md
- Epic context: Epic 2 - Family Creation & Child Profiles
- Previous story: Story 1.6 - Accessible Authentication Flow (completed)

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References
(To be filled during implementation)

### Completion Notes List
- This is Story 1 of 8 in Epic 2
- Creates Firestore family profile foundation
- Story 2.2 depends on this for adding children to family
- Uses transaction-based pattern from Epic 1 retrospective learnings

### File List
**To Create:**
- `packages/contracts/src/family.schema.ts`
- `packages/contracts/src/family.schema.test.ts`
- `apps/web/src/services/familyService.ts`
- `apps/web/src/services/familyService.test.ts`
- `apps/web/src/hooks/useFamily.ts`
- `apps/web/src/hooks/useFamily.test.ts`
- `apps/web/src/app/(protected)/onboarding/create-family/page.tsx`

**To Modify:**
- `packages/contracts/src/index.ts`
- `packages/contracts/src/user.schema.ts`
- `apps/web/src/app/(protected)/onboarding/page.tsx`
- `firestore.rules`
