# Story 1.4: Logout Functionality

**Status:** ready-for-dev

---

## Story

As a **logged-in parent**,
I want **to securely log out of my account**,
So that **I can protect my account on shared or public devices**.

---

## Acceptance Criteria

### AC1: Logout Button Accessibility
**Given** a parent is logged in
**When** they access the user interface
**Then** a logout option is visible and accessible from the user menu/profile area
**And** the logout button is keyboard navigable

### AC2: Firebase Auth Session Termination
**Given** a parent clicks the logout button
**When** the logout action is triggered
**Then** Firebase Auth session is terminated via `signOut()`
**And** the auth state observer receives `null` for the user

### AC3: Local Session Data Clearing
**Given** the logout is triggered
**When** Firebase signOut completes (or fails)
**Then** local session storage/cookies are cleared (`__session` cookie)
**And** any cached user data in hooks is reset to null
**And** `processedUidRef` in useUser is reset to allow fresh auth

### AC4: Redirect to Login Page
**Given** the logout completes
**When** session data is cleared
**Then** user is redirected to the home/login page (`/login`)
**And** protected routes become inaccessible

### AC5: Offline Logout Behavior
**Given** network is temporarily unavailable
**When** the user attempts to logout
**Then** local session data is still cleared (fail-safe)
**And** the `__session` cookie is removed
**And** the user is redirected to login
**And** next online attempt will sync with Firebase

### AC6: Screen Reader Announcement
**Given** a parent using assistive technology logs out
**When** the logout completes
**Then** screen reader announces "You have been logged out" (or similar)
**And** focus moves to main content or login button

---

## Tasks / Subtasks

### Task 1: Verify Existing signOut Implementation
- [ ] 1.1 Review `useAuth.ts` signOut function (already implemented lines 230-244)
- [ ] 1.2 Verify `setSessionCookie(false)` is called via onAuthStateChanged
- [ ] 1.3 Confirm error handling exists for signOut failures

### Task 2: Create Logout Button Component
- [ ] 2.1 Create `LogoutButton` component in `apps/web/src/components/auth/`
- [ ] 2.2 Import `useAuthContext` to access `signOut` function
- [ ] 2.3 Add loading state while logout is in progress
- [ ] 2.4 Add aria-label and role attributes for accessibility
- [ ] 2.5 Style consistently with other auth components

### Task 3: Add Redirect After Logout
- [ ] 3.1 Add `useRouter` from next/navigation in logout handler
- [ ] 3.2 Redirect to `/login` after successful signOut
- [ ] 3.3 Ensure redirect happens even if signOut errors (fail-safe)

### Task 4: Implement Screen Reader Announcement
- [ ] 4.1 Add `aria-live="polite"` region for logout status
- [ ] 4.2 Announce "You have been logged out" on success
- [ ] 4.3 Move focus appropriately after logout

### Task 5: Add Logout to User Menu/Header
- [ ] 5.1 Determine where logout button should be placed (header/profile dropdown)
- [ ] 5.2 Add LogoutButton to appropriate layout component
- [ ] 5.3 Ensure it's only visible when user is authenticated

### Task 6: Write Tests
- [ ] 6.1 Test: LogoutButton renders when authenticated
- [ ] 6.2 Test: Clicking logout calls signOut
- [ ] 6.3 Test: Successful logout clears user state
- [ ] 6.4 Test: Logout redirects to /login
- [ ] 6.5 Test: LogoutButton has proper accessibility attributes
- [ ] 6.6 Test: Logout works even when signOut throws (fail-safe)

---

## Dev Notes

### Critical Discovery: signOut Already Implemented

**IMPORTANT:** Story 1.1 implementation already includes:
1. `signOut` function in `useAuth.ts` (lines 230-244)
2. Session cookie clearing via `setSessionCookie(false)` in onAuthStateChanged
3. Error handling with user-friendly messages

**What's NEW in this story:**
1. Create a LogoutButton component
2. Add redirect to login page after logout
3. Add screen reader announcement
4. Place logout in user menu/navigation

### Architecture Patterns

**LogoutButton Component:**
```typescript
// apps/web/src/components/auth/LogoutButton.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/components/providers/AuthProvider'

export function LogoutButton() {
  const router = useRouter()
  const { signOut, loading } = useAuthContext()
  const [status, setStatus] = useState<'idle' | 'logging-out' | 'logged-out'>('idle')
  const statusRef = useRef<HTMLDivElement>(null)

  const handleLogout = async () => {
    setStatus('logging-out')
    try {
      await signOut()
    } catch (error) {
      // Log error but continue with redirect (fail-safe)
      console.error('[LogoutButton] signOut error:', error)
    } finally {
      setStatus('logged-out')
      // Always redirect, even if signOut errored
      router.push('/login')
    }
  }

  return (
    <>
      <button
        onClick={handleLogout}
        disabled={loading || status === 'logging-out'}
        aria-label="Log out of your account"
        className="..."
      >
        {status === 'logging-out' ? 'Logging out...' : 'Log out'}
      </button>
      {/* Screen reader announcement */}
      <div
        ref={statusRef}
        role="status"
        aria-live="polite"
        className="sr-only"
      >
        {status === 'logged-out' && 'You have been logged out'}
      </div>
    </>
  )
}
```

**Existing signOut in useAuth.ts:**
```typescript
// Already implemented - no changes needed
const signOut = useCallback(async () => {
  safeSetState((prev) => ({ ...prev, loading: true }))
  try {
    await firebaseSignOut(auth)
    // Success - onAuthStateChanged will update the state
    // setSessionCookie(false) is called automatically
  } catch (error) {
    const authError = error as AuthError
    const message = getErrorMessage(authError)
    safeSetState((prev) => ({
      ...prev,
      loading: false,
      error: new Error(message),
    }))
  }
}, [safeSetState])
```

### NFR Compliance Checklist

| NFR | Requirement | Implementation |
|-----|-------------|----------------|
| NFR42 | WCAG 2.1 AA | aria-live announcement, focus management |
| NFR65 | 6th-grade reading level | "Log out" / "Logging out..." / "You have been logged out" |
| NFR11 | Session management | Cookie cleared, auth state reset |

### Testing Standards

**Component Tests:**
```typescript
// apps/web/src/components/auth/LogoutButton.test.tsx
describe('LogoutButton', () => {
  it('renders logout button', () => {
    render(<LogoutButton />)
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument()
  })

  it('calls signOut on click', async () => {
    render(<LogoutButton />)
    await userEvent.click(screen.getByRole('button', { name: /log out/i }))
    expect(mockSignOut).toHaveBeenCalled()
  })

  it('redirects to /login after logout', async () => {
    render(<LogoutButton />)
    await userEvent.click(screen.getByRole('button', { name: /log out/i }))
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  it('has accessible attributes', () => {
    render(<LogoutButton />)
    const button = screen.getByRole('button', { name: /log out/i })
    expect(button).toHaveAttribute('aria-label')
  })

  it('announces logout to screen readers', async () => {
    render(<LogoutButton />)
    await userEvent.click(screen.getByRole('button', { name: /log out/i }))
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('You have been logged out')
    })
  })
})
```

### Dependencies

**Files to Create:**
```
apps/web/src/components/auth/LogoutButton.tsx       # New logout button component
apps/web/src/components/auth/LogoutButton.test.tsx  # Tests for logout button
```

**Files to Modify:**
```
apps/web/src/components/auth/index.ts               # Export LogoutButton
(TBD: Header/Nav component where logout will be placed)
```

### Previous Story Intelligence

**From Story 1.3:**
- Session expiry handling established pattern for signOut + redirect
- `useUser` hook's `processedUidRef` is reset on signOut (already handled)
- Router mock needs stable reference in tests (`mockRouter = { push: mockPush }`)

**From Story 1.1:**
- `signOut` function already implemented in `useAuth.ts`
- Session cookie (`__session`) automatically cleared via `setSessionCookie(false)`
- Error handling already in place with user-friendly messages

**Key Insight:** Most of the logout functionality is already implemented! This story is primarily about:
1. Creating a visible LogoutButton component
2. Adding redirect after logout
3. Adding screen reader announcement
4. Integrating into navigation

### Git Intelligence

Recent commits show established patterns:
- `feat(auth):` prefix for auth-related changes
- Tests colocated with implementation files
- Components in `apps/web/src/components/auth/`

---

## References

- [Source: docs/epics/epic-list.md#Story-1.4] - Original story requirements
- [Source: apps/web/src/hooks/useAuth.ts] - Existing signOut implementation (lines 230-244)
- [Source: apps/web/src/hooks/useUser.ts] - processedUidRef reset pattern
- [Firebase Auth signOut docs](https://firebase.google.com/docs/auth/web/google-signin#sign_out)

---

## Dev Agent Record

### Context Reference
- Story context: docs/sprint-artifacts/stories/1-4-logout-functionality.md
- Epic context: Epic 1 - Parent Account Creation & Authentication
- Previous story: Story 1.3 - Session Persistence & Expiry (in review)

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References
(To be filled during implementation)

### Completion Notes List
- Story 4 of 6 in Epic 1
- Most logout functionality already implemented in Story 1.1
- Primary new work: LogoutButton component + accessibility + redirect
- Story 1.5 (Protected Routes) will use auth state from this work

### File List
**To Create:**
- `apps/web/src/components/auth/LogoutButton.tsx` - Logout button component
- `apps/web/src/components/auth/LogoutButton.test.tsx` - Tests

**To Modify:**
- `apps/web/src/components/auth/index.ts` - Add export for LogoutButton
