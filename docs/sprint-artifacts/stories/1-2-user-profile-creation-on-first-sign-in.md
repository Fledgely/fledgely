# Story 1.2: User Profile Creation on First Sign-In

**Status:** ready-for-dev

---

## Story

As a **newly authenticated parent**,
I want **my basic profile to be created automatically from my Google account**,
So that **I can start using fledgely immediately without re-entering information**.

---

## Acceptance Criteria

### AC1: Automatic User Document Creation
**Given** a user completes Google Sign-In for the first time
**When** authentication succeeds
**Then** a user document is created in Firestore `users/{uid}`
**And** the operation is idempotent (re-running doesn't create duplicates)
**And** document creation completes within 2 seconds

### AC2: Profile Data Population from Google
**Given** a new user document is being created
**When** Google auth data is available
**Then** profile includes: `uid` (Firebase Auth uid)
**And** profile includes: `email` from Google account
**And** profile includes: `displayName` from Google account
**And** profile includes: `photoURL` from Google account (if available)
**And** null/undefined Google fields are handled gracefully

### AC3: Timestamp Management
**Given** a new user document is created
**When** the document is saved to Firestore
**Then** `createdAt` timestamp is set to current server time
**And** `lastLoginAt` timestamp is set to current server time
**And** subsequent logins update only `lastLoginAt` (not `createdAt`)

### AC4: Schema Validation
**Given** user profile data is being saved
**When** the data is processed
**Then** profile validates against `userSchema` from `@fledgely/contracts`
**And** invalid data throws a validation error (not silently saved)
**And** validation errors are logged for debugging

### AC5: New User Redirect to Onboarding
**Given** a user has just signed in for the first time
**When** their profile is created successfully
**Then** user is redirected to `/onboarding` (family creation - Epic 2)
**And** no family data exists yet (user has account but no family)

### AC6: Existing User Redirect to Dashboard
**Given** a user signs in and already has a profile
**When** authentication succeeds
**Then** user is redirected to `/dashboard`
**And** `lastLoginAt` is updated
**And** no new documents are created

### AC7: Error Handling
**Given** profile creation fails for any reason
**When** an error occurs
**Then** user sees a friendly error message
**And** user is not left in broken state (can retry)
**And** error is logged with correlation ID for debugging
**And** Firebase Auth session is preserved (user doesn't need to re-authenticate)

---

## Tasks / Subtasks

### Task 1: Create User Schema (packages/contracts/src/user.schema.ts)
- [ ] 1.1 Create `userSchema` with Zod validation
- [ ] 1.2 Define required fields: `uid`, `email`, `createdAt`, `lastLoginAt`
- [ ] 1.3 Define optional fields: `displayName`, `photoURL`
- [ ] 1.4 Export types: `User`, `UserInput`, `CreateUserInput`
- [ ] 1.5 Add schema to `packages/contracts/src/index.ts` exports
- [ ] 1.6 Write unit tests for schema validation

### Task 2: Create User Service (apps/web/src/services/userService.ts)
- [ ] 2.1 Create `userService` with Firestore operations
- [ ] 2.2 Implement `createUser(authUser)` - creates new user document
- [ ] 2.3 Implement `getUser(uid)` - fetches user by uid
- [ ] 2.4 Implement `updateLastLogin(uid)` - updates lastLoginAt timestamp
- [ ] 2.5 Implement `userExists(uid)` - checks if user document exists
- [ ] 2.6 Use Firestore `serverTimestamp()` for timestamps
- [ ] 2.7 Validate against userSchema before writing

### Task 3: Create useUser Hook (apps/web/src/hooks/useUser.ts)
- [ ] 3.1 Create `useUser` hook for user profile management
- [ ] 3.2 Expose `userProfile`, `loading`, `error` state
- [ ] 3.3 Integrate with `useAuthContext` for auth user
- [ ] 3.4 Auto-fetch user profile when auth state changes
- [ ] 3.5 Handle loading states correctly during profile fetch

### Task 4: Integrate User Creation with Auth Flow
- [ ] 4.1 Update `useAuth` or `AuthProvider` to detect first-time users
- [ ] 4.2 Call `userService.createUser()` on first sign-in
- [ ] 4.3 Call `userService.updateLastLogin()` on subsequent sign-ins
- [ ] 4.4 Store `isNewUser` state for routing decisions

### Task 5: Update Login Page Routing
- [ ] 5.1 Update login page to check for existing user profile
- [ ] 5.2 Route new users to `/onboarding`
- [ ] 5.3 Route existing users to `/dashboard`
- [ ] 5.4 Handle race conditions between auth and Firestore reads

### Task 6: Create Onboarding Placeholder Page
- [ ] 6.1 Create `apps/web/src/app/(protected)/onboarding/page.tsx`
- [ ] 6.2 Add welcome message and basic layout
- [ ] 6.3 Display user's name from profile
- [ ] 6.4 Add placeholder for Epic 2 (Family Creation)

### Task 7: Write Tests
- [ ] 7.1 Unit tests for `userSchema` validation
- [ ] 7.2 Unit tests for `userService` operations (with mocked Firestore)
- [ ] 7.3 Unit tests for `useUser` hook
- [ ] 7.4 Integration test: first-time sign-in creates profile
- [ ] 7.5 Integration test: existing user updates lastLoginAt
- [ ] 7.6 Integration test: routing (new -> onboarding, existing -> dashboard)
- [ ] 7.7 Test error handling and recovery

---

## Dev Notes

### Critical Requirements

This story creates the user profile foundation. Key patterns:

1. **Zod-First Types** - `userSchema` defines the source of truth for User type
2. **Direct Firestore SDK** - No ORM abstractions per project guidelines
3. **Server Timestamps** - Use `serverTimestamp()` for reliable timestamps
4. **Idempotent Operations** - Profile creation should be safe to retry

### Architecture Patterns

**User Schema:**
```typescript
// packages/contracts/src/user.schema.ts
import { z } from 'zod'

export const userSchema = z.object({
  uid: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().nullable().optional(),
  photoURL: z.string().url().nullable().optional(),
  createdAt: z.date(),
  lastLoginAt: z.date(),
})

export type User = z.infer<typeof userSchema>

// For creating new users from Firebase Auth
export const createUserInputSchema = z.object({
  uid: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().nullable().optional(),
  photoURL: z.string().url().nullable().optional(),
})

export type CreateUserInput = z.infer<typeof createUserInputSchema>
```

**User Service Pattern:**
```typescript
// apps/web/src/services/userService.ts
'use client'

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { userSchema, createUserInputSchema, type User, type CreateUserInput } from '@fledgely/contracts'
import type { User as FirebaseUser } from 'firebase/auth'

// Collection reference
const USERS_COLLECTION = 'users'

/**
 * Create a new user document from Firebase Auth user
 */
export async function createUser(authUser: FirebaseUser): Promise<User> {
  const input: CreateUserInput = {
    uid: authUser.uid,
    email: authUser.email!,
    displayName: authUser.displayName,
    photoURL: authUser.photoURL,
  }

  // Validate input
  createUserInputSchema.parse(input)

  const userRef = doc(db, USERS_COLLECTION, authUser.uid)

  await setDoc(userRef, {
    ...input,
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  })

  // Fetch the created document to get actual timestamps
  const snapshot = await getDoc(userRef)
  return convertFirestoreUser(snapshot.data()!)
}

/**
 * Get user by uid
 */
export async function getUser(uid: string): Promise<User | null> {
  const userRef = doc(db, USERS_COLLECTION, uid)
  const snapshot = await getDoc(userRef)

  if (!snapshot.exists()) {
    return null
  }

  return convertFirestoreUser(snapshot.data())
}

/**
 * Check if user document exists
 */
export async function userExists(uid: string): Promise<boolean> {
  const userRef = doc(db, USERS_COLLECTION, uid)
  const snapshot = await getDoc(userRef)
  return snapshot.exists()
}

/**
 * Update lastLoginAt timestamp
 */
export async function updateLastLogin(uid: string): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, uid)
  await updateDoc(userRef, {
    lastLoginAt: serverTimestamp(),
  })
}

/**
 * Convert Firestore document data to User type
 */
function convertFirestoreUser(data: Record<string, unknown>): User {
  return userSchema.parse({
    ...data,
    createdAt: (data.createdAt as Timestamp)?.toDate(),
    lastLoginAt: (data.lastLoginAt as Timestamp)?.toDate(),
  })
}
```

**useUser Hook Pattern:**
```typescript
// apps/web/src/hooks/useUser.ts
'use client'

import { useState, useEffect } from 'react'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { getUser, createUser, updateLastLogin, userExists } from '@/services/userService'
import type { User } from '@fledgely/contracts'

export interface UseUserReturn {
  userProfile: User | null
  isNewUser: boolean
  loading: boolean
  error: Error | null
}

export function useUser(): UseUserReturn {
  const { user: authUser, loading: authLoading } = useAuthContext()
  const [userProfile, setUserProfile] = useState<User | null>(null)
  const [isNewUser, setIsNewUser] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (authLoading) return

    if (!authUser) {
      setUserProfile(null)
      setIsNewUser(false)
      setLoading(false)
      return
    }

    const fetchOrCreateUser = async () => {
      setLoading(true)
      setError(null)

      try {
        const exists = await userExists(authUser.uid)

        if (exists) {
          // Existing user - update last login and fetch profile
          await updateLastLogin(authUser.uid)
          const profile = await getUser(authUser.uid)
          setUserProfile(profile)
          setIsNewUser(false)
        } else {
          // New user - create profile
          const profile = await createUser(authUser)
          setUserProfile(profile)
          setIsNewUser(true)
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load user profile'))
      } finally {
        setLoading(false)
      }
    }

    fetchOrCreateUser()
  }, [authUser, authLoading])

  return { userProfile, isNewUser, loading, error }
}
```

**Login Page Integration:**
```typescript
// Update apps/web/src/app/(auth)/login/page.tsx
// Add isNewUser check for routing:

const { isNewUser, loading: userLoading } = useUser()

useEffect(() => {
  if (user && !loading && !userLoading) {
    if (isNewUser) {
      router.push('/onboarding')
    } else {
      router.push(redirectTo)
    }
  }
}, [user, loading, userLoading, isNewUser, router, redirectTo])
```

### Naming Conventions
- Schema: `userSchema` (camelCase)
- Service: `userService.ts` (camelCase file, exported functions)
- Hook: `useUser.ts` (camelCase with use prefix)
- Collection: `users` (lowercase plural)
- Document ID: Firebase Auth `uid`

### Project Structure Notes

**Files to Create:**
```
packages/contracts/src/user.schema.ts
packages/contracts/src/user.schema.test.ts
apps/web/src/services/userService.ts
apps/web/src/services/userService.test.ts
apps/web/src/hooks/useUser.ts
apps/web/src/hooks/useUser.test.ts
apps/web/src/app/(protected)/onboarding/page.tsx
```

**Files to Modify:**
```
packages/contracts/src/index.ts              # Export userSchema
apps/web/src/app/(auth)/login/page.tsx       # Add isNewUser routing
```

### Firestore Data Model

**Collection:** `users`

**Document ID:** Firebase Auth `uid`

**Document Structure:**
```typescript
{
  uid: string,           // Firebase Auth uid (matches document ID)
  email: string,         // User's email from Google
  displayName?: string,  // User's display name from Google
  photoURL?: string,     // User's profile photo URL from Google
  createdAt: Timestamp,  // When profile was created
  lastLoginAt: Timestamp // Last login timestamp
}
```

### NFR Compliance Checklist

| NFR | Requirement | Implementation |
|-----|-------------|----------------|
| INV-001 | Types from Zod only | userSchema with z.infer<> |
| INV-002 | Direct Firestore SDK | getDoc/setDoc/updateDoc directly |
| NFR42 | WCAG 2.1 AA | Accessible error messages |
| NFR65 | 6th-grade reading level | Simple error text |

### Error Handling

**Firestore Error Codes to Handle:**
- `permission-denied` - User lacks permissions (shouldn't happen for own doc)
- `unavailable` - Firestore temporarily unavailable (retry)
- `not-found` - Document doesn't exist (expected for new users)

**Error Message Mapping (6th-grade reading level):**
```typescript
const errorMessages: Record<string, string> = {
  'permission-denied': 'Unable to save your profile. Please try signing in again.',
  'unavailable': 'Connection problem. Please check your internet and try again.',
  'network-request-failed': 'Could not connect. Please check your internet.',
  default: 'Something went wrong creating your profile. Please try again.',
}
```

### Dependencies

**Already Installed:**
- `firebase` (in apps/web)
- `zod` (in packages/contracts)

**May Need to Install:**
- None - all dependencies available

### Previous Story Intelligence

This story builds on Story 1.1 (Google Sign-In):
- `apps/web/src/hooks/useAuth.ts` - Firebase Auth hook
- `apps/web/src/components/providers/AuthProvider.tsx` - Auth context
- `apps/web/src/lib/firebase.ts` - Firebase app initialized with `db` export
- `apps/web/src/middleware.ts` - Route protection (add `/onboarding` to protected routes)

### Testing Standards

**Required Tests:**
1. `userSchema` - validation of valid/invalid data
2. `userService` - CRUD operations with mocked Firestore
3. `useUser` hook - state management, new vs existing user detection
4. Integration: first sign-in creates document
5. Integration: existing user updates lastLoginAt only
6. Routing: new user → onboarding, existing → dashboard

**Test Pattern:**
```typescript
// packages/contracts/src/user.schema.test.ts
import { describe, it, expect } from 'vitest'
import { userSchema, createUserInputSchema } from './user.schema'

describe('userSchema', () => {
  it('validates a complete user object', () => {
    const user = {
      uid: 'firebase-uid-123',
      email: 'parent@example.com',
      displayName: 'Jane Parent',
      photoURL: 'https://example.com/photo.jpg',
      createdAt: new Date(),
      lastLoginAt: new Date(),
    }

    expect(() => userSchema.parse(user)).not.toThrow()
  })

  it('allows null displayName and photoURL', () => {
    const user = {
      uid: 'firebase-uid-123',
      email: 'parent@example.com',
      displayName: null,
      photoURL: null,
      createdAt: new Date(),
      lastLoginAt: new Date(),
    }

    expect(() => userSchema.parse(user)).not.toThrow()
  })

  it('rejects invalid email', () => {
    const user = {
      uid: 'firebase-uid-123',
      email: 'not-an-email',
      createdAt: new Date(),
      lastLoginAt: new Date(),
    }

    expect(() => userSchema.parse(user)).toThrow()
  })
})
```

---

## References

- [Source: docs/epics/epic-list.md#Story-1.2] - Original story requirements
- [Source: docs/project_context.md] - Architecture patterns
- [Source: apps/web/src/hooks/useAuth.ts] - Auth hook pattern from Story 1.1
- [Firebase Firestore Web Documentation](https://firebase.google.com/docs/firestore/manage-data/add-data)
- [Zod Documentation](https://zod.dev/)

---

## Dev Agent Record

### Context Reference
- Story context: docs/sprint-artifacts/stories/1-2-user-profile-creation-on-first-sign-in.md
- Epic context: Epic 1 - Parent Account Creation & Authentication
- Previous story: Story 1.1 - Google Sign-In Button & Flow (completed)

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References
(To be filled during implementation)

### Completion Notes List
- This is Story 2 of 6 in Epic 1
- Creates Firestore user profile foundation
- Story 1.3 depends on this for lastLoginAt verification
- Story 2.1 depends on this for family creation (user must exist first)

### File List
**To Create:**
- `packages/contracts/src/user.schema.ts`
- `packages/contracts/src/user.schema.test.ts`
- `apps/web/src/services/userService.ts`
- `apps/web/src/services/userService.test.ts`
- `apps/web/src/hooks/useUser.ts`
- `apps/web/src/hooks/useUser.test.ts`
- `apps/web/src/app/(protected)/onboarding/page.tsx`

**To Modify:**
- `packages/contracts/src/index.ts`
- `apps/web/src/app/(auth)/login/page.tsx`
- `apps/web/src/middleware.ts` (add `/onboarding` to protected routes)
