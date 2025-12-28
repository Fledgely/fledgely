# Story 1.2: User Profile Creation on First Sign-In

Status: done

## Story

As a **newly authenticated parent**,
I want **my basic profile to be created automatically from my Google account**,
So that **I can start using fledgely immediately without re-entering information**.

## Acceptance Criteria

1. **AC1: Automatic Profile Creation**
   - Given a user completes Google Sign-In for the first time
   - When authentication succeeds
   - Then a user document is created in Firestore `users/{uid}`
   - And profile includes: uid, email, displayName, photoURL from Google
   - And profile includes: createdAt timestamp, lastLoginAt timestamp

2. **AC2: Schema Validation**
   - Given user profile data is being stored
   - When the document is created
   - Then profile validates against userSchema from @fledgely/contracts
   - And invalid data is rejected with appropriate error handling

3. **AC3: New User Onboarding Flow**
   - Given a new user's profile is created
   - When they are redirected after sign-in
   - Then they see family creation onboarding (Epic 2 placeholder)
   - And no family data exists yet (user has account but no family)

4. **AC4: Returning User Detection**
   - Given an existing user signs in
   - When authentication succeeds
   - Then their existing profile is loaded (not recreated)
   - And lastLoginAt is updated
   - And they are redirected to dashboard (not onboarding)

## Tasks / Subtasks

- [x] Task 1: Create User Schema (AC: #2)
  - [x] 1.1 Add userSchema to packages/shared/src/contracts/index.ts
  - [x] 1.2 Include fields: uid, email, displayName, photoURL, createdAt, lastLoginAt
  - [x] 1.3 Export User type from schema

- [x] Task 2: Add Firestore Dependency (AC: #1)
  - [x] 2.1 Add firebase/firestore to apps/web dependencies (already in firebase package)
  - [x] 2.2 Update apps/web/src/lib/firebase.ts to export getFirestoreDb function
  - [x] 2.3 Configure Firestore emulator connection for development

- [x] Task 3: Create User Profile Service (AC: #1, #2, #4)
  - [x] 3.1 Create apps/web/src/services/userService.ts
  - [x] 3.2 Implement createUserProfile function (validates with userSchema)
  - [x] 3.3 Implement getUserProfile function
  - [x] 3.4 Implement updateLastLogin function
  - [x] 3.5 Use Firebase SDK directly (no abstractions per Unbreakable Rule #2)

- [x] Task 4: Update Auth Context for Profile Management (AC: #1, #4)
  - [x] 4.1 Update AuthContext to check if user profile exists on sign-in
  - [x] 4.2 Create profile if new user, update lastLoginAt if existing
  - [x] 4.3 Add isNewUser flag to auth state
  - [x] 4.4 Handle profile creation errors gracefully

- [x] Task 5: Create Onboarding Placeholder (AC: #3)
  - [x] 5.1 Create apps/web/src/app/onboarding/page.tsx (placeholder for Epic 2)
  - [x] 5.2 Display "Welcome! Family setup coming soon" message
  - [x] 5.3 Add link to return to dashboard

- [x] Task 6: Update Dashboard for New vs Returning Users (AC: #3, #4)
  - [x] 6.1 Update dashboard to redirect new users to onboarding
  - [x] 6.2 Show appropriate welcome message based on isNewUser
  - [x] 6.3 Display user profile info from Firestore (not just Firebase Auth)

- [x] Task 7: Write Firestore Security Rules (AC: #1)
  - [x] 7.1 Add security rules for users collection
  - [x] 7.2 Users can only read/write their own document (request.auth.uid == resource.id)
  - [x] 7.3 Add to packages/firebase-rules/firestore.rules

## Dev Notes

### Technical Requirements

- **Database:** Firestore with typed access via userSchema
- **Schema Source:** @fledgely/contracts (Zod schemas only - Unbreakable Rule #1)
- **Firebase Access:** Direct SDK calls (no abstractions - Unbreakable Rule #2)
- **Auth Integration:** Extend existing AuthContext from Story 1.1

### Architecture Compliance

From project_context.md:

- "All types from Zod Only" - userSchema must be Zod-based
- "Firebase SDK Direct" - use `doc()`, `setDoc()`, `getDoc()` directly
- "Functions Delegate to Services" - service layer for business logic

### User Schema Definition

```typescript
// packages/shared/src/contracts/index.ts
import { z } from 'zod'

export const userSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  displayName: z.string().nullable(),
  photoURL: z.string().url().nullable(),
  createdAt: z.date(),
  lastLoginAt: z.date(),
})

export type User = z.infer<typeof userSchema>
```

### Firestore Document Structure

```
/users/{uid}
  - uid: string
  - email: string
  - displayName: string | null
  - photoURL: string | null
  - createdAt: Timestamp
  - lastLoginAt: Timestamp
```

### Security Rules Pattern

```javascript
// packages/firebase-rules/firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
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
└── index.ts                    # UPDATE - Add userSchema

apps/web/src/
├── lib/
│   └── firebase.ts            # UPDATE - Add getFirestore
├── services/
│   └── userService.ts         # NEW - User profile operations
├── contexts/
│   └── AuthContext.tsx        # UPDATE - Profile management
└── app/
    ├── onboarding/
    │   └── page.tsx           # NEW - Onboarding placeholder
    └── dashboard/
        └── page.tsx           # UPDATE - New user handling

packages/firebase-rules/
└── firestore.rules            # UPDATE - Add users collection rules
```

### Testing Requirements

- Unit test userSchema validation
- Integration test with Firestore emulator
- Test profile creation for new users
- Test profile update for returning users
- Test security rules deny cross-user access

### Previous Story Intelligence (1.1)

From Story 1.1 completion:

- Firebase is initialized with lazy loading in `apps/web/src/lib/firebase.ts`
- Use `getFirebaseAuth()` pattern for lazy initialization
- AuthContext wraps entire app via layout.tsx
- Dashboard at `apps/web/src/app/dashboard/page.tsx` shows user info
- Login flow already handles redirect on success

**Key Pattern to Follow:**

```typescript
// From firebase.ts - use same lazy initialization pattern
export function getFirestoreDb(): Firestore {
  if (firestoreDb) return firestoreDb
  firestoreDb = getFirestore(getFirebaseApp())
  // Connect emulator if development
  if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_EMULATORS === 'true') {
    connectFirestoreEmulator(firestoreDb, 'localhost', 8080)
  }
  return firestoreDb
}
```

### Timestamp Handling

Firebase Firestore stores timestamps as `Timestamp` objects, but Zod expects `Date`. Handle conversion:

```typescript
// When reading from Firestore
const userData = docSnap.data()
const user = userSchema.parse({
  ...userData,
  createdAt: userData.createdAt.toDate(),
  lastLoginAt: userData.lastLoginAt.toDate(),
})

// When writing to Firestore
import { serverTimestamp } from 'firebase/firestore'
await setDoc(userRef, {
  ...validatedData,
  createdAt: serverTimestamp(),
  lastLoginAt: serverTimestamp(),
})
```

### Error Handling

- Profile creation failure should show user-friendly error
- Allow retry of profile creation
- Don't sign user out on profile creation failure
- Log errors with uid only (no PII per project_context.md)

### References

- [Source: docs/epics/epic-list.md#Story-1.2]
- [Source: docs/project_context.md#The-5-Unbreakable-Rules]
- [Source: docs/project_context.md#Schema-Reference]

## Dev Agent Record

### Context Reference

- Epic: 1 (Parent Account Creation & Authentication)
- Sprint: 1 (Feature Development)
- Story Key: 1-2-user-profile-creation-on-first-sign-in
- Depends On: Story 1.1 (completed)

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

- userSchema added to @fledgely/shared/contracts with proper Zod validation
- Firestore integration uses lazy initialization pattern consistent with Auth
- User profile service follows Firebase SDK direct pattern (no abstractions)
- AuthContext extended with userProfile, isNewUser flag, and clearNewUserFlag function
- Onboarding page clears isNewUser flag on mount to prevent re-redirect loops
- Dashboard shows profile info from Firestore with fallback to Firebase Auth
- Firestore security rules restrict users to read/write only their own document

### File List

- packages/shared/src/contracts/index.ts (MODIFIED - added userSchema)
- apps/web/src/lib/firebase.ts (MODIFIED - added getFirestoreDb)
- apps/web/src/services/userService.ts (NEW - user profile CRUD operations)
- apps/web/src/contexts/AuthContext.tsx (MODIFIED - profile management, isNewUser flag)
- apps/web/src/app/onboarding/page.tsx (NEW - onboarding placeholder)
- apps/web/src/app/dashboard/page.tsx (MODIFIED - profile display, new user redirect)
- apps/web/src/app/login/page.tsx (MODIFIED - isNewUser redirect handling)
- packages/firebase-rules/firestore.rules (MODIFIED - users collection rules)

## Change Log

| Date       | Change                                                              |
| ---------- | ------------------------------------------------------------------- |
| 2025-12-28 | Story created with comprehensive developer context                  |
| 2025-12-28 | Implementation complete - all tasks done, code review fixes applied |
