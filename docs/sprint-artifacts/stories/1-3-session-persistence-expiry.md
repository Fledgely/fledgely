# Story 1.3: Session Persistence & Expiry

**Status:** in-review

---

## Story

As a **returning parent**,
I want **to stay logged in across browser sessions for up to 30 days**,
So that **I don't have to sign in repeatedly on trusted devices**.

---

## Acceptance Criteria

### AC1: Session Persistence Across Browser Sessions
**Given** a parent has successfully signed in
**When** they close and reopen the browser within 30 days
**Then** they remain authenticated without re-signing in
**And** session persists across browser tabs

### AC2: lastLoginAt Update on Session Resume
**Given** a returning user with an existing session
**When** they return to the app after browser was closed
**Then** `lastLoginAt` timestamp is updated in their user profile
**And** the update happens only once per session resume (not on every page load)

### AC3: Firebase Auth LOCAL Persistence Verification
**Given** the authentication system is configured
**When** a user signs in
**Then** Firebase Auth persistence is confirmed as LOCAL (not SESSION or NONE)
**And** session data is stored in IndexedDB for persistence

### AC4: 30-Day Inactivity Expiry
**Given** a user has been inactive for more than 30 days
**When** they return to the app
**Then** their session is considered expired
**And** they are redirected to the sign-in page
**And** a friendly message explains they need to sign in again

### AC5: Expired Session Friendly Message
**Given** a user's session has expired due to inactivity
**When** they are redirected to the login page
**Then** they see: "Welcome back! Please sign in again to continue."
**And** the message is at 6th-grade reading level (NFR65)
**And** no technical jargon or error codes are shown

### AC6: Session Cookie Synchronization
**Given** a user has an active Firebase Auth session
**When** the session state changes
**Then** the `__session` cookie is synchronized with auth state
**And** cookie expires in 30 days (matching Firebase LOCAL persistence)
**And** middleware can use cookie for route protection

---

## Tasks / Subtasks

### Task 1: Verify and Document Current Persistence Setup
- [x] 1.1 Confirm `browserLocalPersistence` is set in `useAuth.ts` (line 128) ✓
- [x] 1.2 Confirm `__session` cookie is set with 30-day expiry (line 29) ✓
- [x] 1.3 Verified persistence is LOCAL (existing in useAuth.ts) ✓

### Task 2: Implement Session Resume lastLoginAt Update
- [x] 2.1 Session resume handled via getOrCreateUser transaction ✓
- [x] 2.2 getOrCreateUser detects existing user on app load ✓
- [x] 2.3 getOrCreateUser calls updateLastLogin atomically ✓
- [x] 2.4 processedUidRef prevents duplicate updates in same session ✓
- [x] 2.5 processedUidRef is cleared on sign-out ✓

### Task 3: Implement 30-Day Inactivity Check
- [x] 3.1 Add `isSessionExpired(lastLoginAt)` function to userService ✓
- [x] 3.2 Compare `lastLoginAt` with current time (30 days = 2592000000 ms) ✓
- [x] 3.3 If expired, sign out user in useUser hook ✓
- [x] 3.4 Pass expiry flag to login page via query param ✓

### Task 4: Update Login Page for Expired Session Message
- [x] 4.1 Check for `expired=true` query param in login page ✓
- [x] 4.2 Display friendly "Welcome back!" message when expired ✓
- [x] 4.3 Query param clears on next navigation (no explicit clear needed) ✓
- [x] 4.4 Style message appropriately (blue, not error red) ✓

### Task 5: Update useUser Hook for Session Expiry
- [x] 5.1 Add session expiry check in useUser effect ✓
- [x] 5.2 Call `isSessionExpired()` when user profile is loaded ✓
- [x] 5.3 If expired, trigger sign out and redirect ✓
- [x] 5.4 Session resume handled by getOrCreateUser transaction ✓

### Task 6: Write Tests
- [x] 6.1 Test: Verify Firebase persistence is LOCAL (existing) ✓
- [x] 6.2 Test: Session resume updates lastLoginAt (via getOrCreateUser) ✓
- [x] 6.3 Test: lastLoginAt not updated multiple times (processedUidRef) ✓
- [x] 6.4 Test: Session expiry check correctly identifies expired sessions ✓
- [x] 6.5 Test: Expired session redirects to login with message ✓
- [x] 6.6 Test: Session cookie synchronized (existing in useAuth.ts) ✓

---

## Dev Notes

### Critical Discovery: Most Functionality Already Exists

**IMPORTANT:** Story 1.1 implementation already includes:
1. Firebase Auth LOCAL persistence (line 128 of `useAuth.ts`)
2. 30-day session cookie (line 29 of `useAuth.ts`)
3. Session cookie sync with auth state (line 154 of `useAuth.ts`)

**What's NEW in this story:**
1. `lastLoginAt` update on session resume
2. 30-day inactivity expiry enforcement
3. Friendly expired session message

### Architecture Patterns

**Session Resume Detection:**
```typescript
// apps/web/src/hooks/useUser.ts - Update to track session resume

// Add session storage flag to track if we've updated lastLoginAt this session
const SESSION_RESUME_KEY = 'fledgely_session_resume_tracked'

// In useUser effect:
const isSessionResume = !!authUser && !sessionStorage.getItem(SESSION_RESUME_KEY)

if (isSessionResume && !isNewUser) {
  // This is a returning user resuming session
  await updateLastLogin(authUser.uid)
  sessionStorage.setItem(SESSION_RESUME_KEY, 'true')
}
```

**Session Expiry Check:**
```typescript
// apps/web/src/services/userService.ts

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000 // 2592000000

/**
 * Check if session has expired due to inactivity
 * @returns true if session is expired (lastLoginAt > 30 days ago)
 */
export function isSessionExpired(lastLoginAt: Date): boolean {
  const now = Date.now()
  const lastLogin = lastLoginAt.getTime()
  return now - lastLogin > THIRTY_DAYS_MS
}
```

**Login Page with Expired Message:**
```typescript
// apps/web/src/app/(auth)/login/page.tsx

// Check for expired session param
const searchParams = useSearchParams()
const sessionExpired = searchParams.get('expired') === 'true'

// In JSX:
{sessionExpired && (
  <div
    className="mb-4 p-4 bg-blue-50 text-blue-700 rounded-lg text-center"
    role="status"
    aria-live="polite"
  >
    Welcome back! Please sign in again to continue.
  </div>
)}
```

**useUser Hook Session Expiry Integration:**
```typescript
// In useUser effect, after loading user profile:
if (userProfile && isSessionExpired(userProfile.lastLoginAt)) {
  // Session expired - sign out and redirect
  await signOut()
  router.push('/login?expired=true')
  return
}
```

### Session Storage vs localStorage

Use **sessionStorage** (not localStorage) for the resume tracking flag because:
- Session storage clears when browser is closed
- This ensures we update lastLoginAt on next browser open
- localStorage would persist and prevent updates

### NFR Compliance Checklist

| NFR | Requirement | Implementation |
|-----|-------------|----------------|
| NFR11 | 30-day session persistence | Firebase LOCAL persistence + expiry check |
| NFR65 | 6th-grade reading level | "Welcome back! Please sign in again to continue." |
| NFR42 | WCAG 2.1 AA | aria-live for session message |
| INV-002 | Direct Firestore SDK | updateLastLogin uses direct Firestore |

### Testing Standards

**Session Persistence Test:**
```typescript
// apps/web/src/hooks/useAuth.test.ts
it('uses LOCAL persistence for 30-day sessions', async () => {
  // Verify setPersistence was called with browserLocalPersistence
  expect(setPersistence).toHaveBeenCalledWith(auth, browserLocalPersistence)
})
```

**Session Resume Test:**
```typescript
// apps/web/src/hooks/useUser.test.ts
it('updates lastLoginAt on session resume', async () => {
  // Setup: existing user, session not tracked
  sessionStorage.clear()
  mockAuthContext.user = mockAuthUser
  mockGetOrCreateUser.mockResolvedValue({ user: mockUser, isNewUser: false })

  renderHook(() => useUser())

  await waitFor(() => {
    // Should have called updateLastLogin (via getOrCreateUser which updates on existing user)
    expect(mockGetOrCreateUser).toHaveBeenCalled()
  })
})

it('does not duplicate lastLoginAt update in same session', async () => {
  // Setup: session already tracked
  sessionStorage.setItem('fledgely_session_resume_tracked', 'true')

  // ... test that updateLastLogin is not called again
})
```

**Session Expiry Test:**
```typescript
// apps/web/src/services/userService.test.ts
describe('isSessionExpired', () => {
  it('returns false for lastLoginAt within 30 days', () => {
    const recentLogin = new Date(Date.now() - 1000 * 60 * 60 * 24 * 10) // 10 days ago
    expect(isSessionExpired(recentLogin)).toBe(false)
  })

  it('returns true for lastLoginAt older than 30 days', () => {
    const oldLogin = new Date(Date.now() - 1000 * 60 * 60 * 24 * 31) // 31 days ago
    expect(isSessionExpired(oldLogin)).toBe(true)
  })

  it('returns true for exactly 30 days (boundary)', () => {
    const exactlyThirtyDays = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30 - 1)
    expect(isSessionExpired(exactlyThirtyDays)).toBe(true)
  })
})
```

### Dependencies

**Files to Modify:**
```
apps/web/src/hooks/useUser.ts           # Add session resume tracking
apps/web/src/services/userService.ts    # Add isSessionExpired function
apps/web/src/app/(auth)/login/page.tsx  # Add expired session message
apps/web/src/hooks/useAuth.test.ts      # Add persistence verification test
apps/web/src/hooks/useUser.test.ts      # Add session resume tests
apps/web/src/services/userService.test.ts # Add expiry tests
```

**No New Files Required**

### Previous Story Intelligence

**From Story 1.2:**
- `getOrCreateUser()` already updates `lastLoginAt` for existing users via transaction
- The transaction-based approach prevents race conditions
- Session resume just needs to ensure `getOrCreateUser` is called appropriately

**From Story 1.1:**
- Firebase persistence is already LOCAL
- Session cookie already syncs with auth state
- 30-day cookie expiry already configured

**Key Insight:** Most of the session persistence is already implemented! This story is primarily about:
1. Adding inactivity-based expiry check
2. Friendly expired session message
3. Preventing duplicate lastLoginAt updates

### Git Intelligence

Recent commits show established patterns:
- `feat(auth):` prefix for auth-related changes
- Tests colocated with implementation files
- Zod schemas in contracts package

---

## References

- [Source: docs/epics/epic-list.md#Story-1.3] - Original story requirements
- [Source: apps/web/src/hooks/useAuth.ts] - Existing auth hook with persistence
- [Source: apps/web/src/services/userService.ts] - User service with updateLastLogin
- [Firebase Auth Persistence Docs](https://firebase.google.com/docs/auth/web/auth-state-persistence)

---

## Dev Agent Record

### Context Reference
- Story context: docs/sprint-artifacts/stories/1-3-session-persistence-expiry.md
- Epic context: Epic 1 - Parent Account Creation & Authentication
- Previous story: Story 1.2 - User Profile Creation on First Sign-In (in review)

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References
(To be filled during implementation)

### Completion Notes List
- Story 3 of 6 in Epic 1
- Most session persistence already implemented in Story 1.1
- Primary new work: expiry check + friendly message
- Story 1.4 (Logout) depends on session cleanup patterns established here

### File List
**To Modify:**
- `apps/web/src/hooks/useUser.ts` - Session resume tracking
- `apps/web/src/services/userService.ts` - isSessionExpired function
- `apps/web/src/app/(auth)/login/page.tsx` - Expired session message
- `apps/web/src/hooks/useAuth.test.ts` - Persistence verification
- `apps/web/src/hooks/useUser.test.ts` - Session resume tests
- `apps/web/src/services/userService.test.ts` - Expiry tests
