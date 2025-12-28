# Story 1.3: Session Persistence & Expiry

Status: done

## Story

As a **returning parent**,
I want **to stay logged in across browser sessions for up to 30 days**,
So that **I don't have to sign in repeatedly on trusted devices**.

## Acceptance Criteria

1. **AC1: Session Persistence Across Browser Sessions**
   - Given a parent has successfully signed in
   - When they close and reopen the browser within 30 days
   - Then they remain authenticated without re-signing in
   - And session persists across browser tabs

2. **AC2: LastLoginAt Update on Session Resume**
   - Given a returning user's session is restored
   - When authentication state is detected on app load
   - Then lastLoginAt is updated in Firestore
   - And user profile is refreshed from Firestore

3. **AC3: Session Expiry After 30 Days**
   - Given a user has been inactive for 30 days
   - When they attempt to access the app
   - Then their session is expired
   - And they are redirected to sign-in page
   - And a friendly message explains they need to sign in again

4. **AC4: Firebase Auth Configuration**
   - Given Firebase Auth is initialized
   - Then persistence is set to LOCAL (not SESSION or NONE)
   - And auth state changes are properly handled

## Tasks / Subtasks

- [x] Task 1: Verify Firebase Auth Persistence (AC: #1, #4)
  - [x] 1.1 Confirm persistence is set to LOCAL in AuthContext
  - [x] 1.2 Verify auth state persists across browser close/reopen
  - [x] 1.3 Verify session works across multiple tabs

- [x] Task 2: Verify LastLoginAt Update (AC: #2)
  - [x] 2.1 Confirm ensureUserProfile updates lastLoginAt on session resume
  - [x] 2.2 Verify this works for returning users (not just new users)

- [x] Task 3: Add Session Expiry Tracking (AC: #3)
  - [x] 3.1 Add lastActivityAt field to userSchema for 30-day tracking
  - [x] 3.2 Update lastActivityAt on each session resume
  - [x] 3.3 Check session age against 30-day limit on auth state change
  - [x] 3.4 Sign out user if session exceeds 30 days

- [x] Task 4: Add Friendly Session Expiry Message (AC: #3)
  - [x] 4.1 Add sessionExpired state to AuthContext
  - [x] 4.2 Display "Your session has ended. Please sign in again." message
  - [x] 4.3 Ensure message is at 6th-grade reading level

## Dev Notes

### Technical Requirements

- **Auth Provider:** Firebase Auth with LOCAL persistence
- **Expiry Logic:** Client-side check of lastActivityAt timestamp
- **UI Framework:** Next.js 14 App Router

### Architecture Compliance

From project_context.md:

- Firebase SDK Direct usage (Unbreakable Rule #2)
- Schema changes via Zod (Unbreakable Rule #1)

### What's Already Implemented

From Story 1.1 and 1.2:

- Firebase Auth initialized with LOCAL persistence (AuthContext.tsx)
- ensureUserProfile called on auth state change
- lastLoginAt updated for returning users
- User profile stored in Firestore with lastLoginAt

### Session Expiry Approach

Firebase Auth tokens automatically refresh, so sessions don't expire on their own. We need to:

1. Track last activity timestamp in Firestore
2. Check this on auth state change
3. Force sign-out if older than 30 days

```typescript
// Add to userSchema
export const userSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  displayName: z.string().nullable(),
  photoURL: z.string().url().nullable(),
  createdAt: z.date(),
  lastLoginAt: z.date(),
  lastActivityAt: z.date(), // NEW - for 30-day expiry tracking
})
```

### NFR References

- NFR11: Session expiry after 30 days of inactivity
- NFR65: Error messages at 6th-grade reading level

### Library/Framework Requirements

| Dependency | Version | Purpose                          |
| ---------- | ------- | -------------------------------- |
| firebase   | ^10.x   | Firebase SDK (already installed) |

### File Structure Requirements

```
packages/shared/src/contracts/
└── index.ts                    # UPDATE - Add lastActivityAt field

apps/web/src/
├── services/
│   └── userService.ts          # UPDATE - Update lastActivityAt
├── contexts/
│   └── AuthContext.tsx         # UPDATE - Check session expiry
└── app/
    └── login/
        └── page.tsx            # UPDATE - Show expiry message
```

### Testing Requirements

- Verify session persists across browser close/reopen
- Verify lastLoginAt updates on session resume
- Test 30-day expiry (mock timestamp)
- Verify friendly message displays on expiry

### Previous Story Intelligence (1.1, 1.2)

From Story 1.1 and 1.2:

- Firebase initialized with lazy loading pattern
- LOCAL persistence already configured
- AuthContext calls ensureUserProfile on auth state change
- ensureUserProfile updates lastLoginAt for returning users
- userSchema in @fledgely/shared/contracts

## Dev Agent Record

### Context Reference

- Epic: 1 (Parent Account Creation & Authentication)
- Sprint: 1 (Feature Development)
- Story Key: 1-3-session-persistence-expiry
- Depends On: Story 1.1 (completed), Story 1.2 (completed)

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

- Firebase Auth LOCAL persistence already configured in Story 1.1
- Added lastActivityAt field to userSchema for tracking session age
- SESSION_EXPIRY_DAYS constant (30 days) added to contracts
- isSessionExpired helper checks if lastActivityAt exceeds 30 days
- AuthContext automatically signs out expired sessions and sets sessionExpired flag
- Login page shows friendly "session has ended" message using info banner
- Session expiry check happens on auth state change (app load or tab focus)

### File List

- packages/shared/src/contracts/index.ts (MODIFIED - added lastActivityAt, SESSION_EXPIRY_DAYS)
- apps/web/src/services/userService.ts (MODIFIED - added isSessionExpired, updated timestamps)
- apps/web/src/contexts/AuthContext.tsx (MODIFIED - added sessionExpired state, expiry handling)
- apps/web/src/app/login/page.tsx (MODIFIED - added session expired message)

## Change Log

| Date       | Change                                                                 |
| ---------- | ---------------------------------------------------------------------- |
| 2025-12-28 | Story created with developer context                                   |
| 2025-12-28 | Implementation complete - session expiry tracking and friendly message |
