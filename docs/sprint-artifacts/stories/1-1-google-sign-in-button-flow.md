# Story 1.1: Google Sign-In Button & Flow

**Status:** done

---

## Story

As a **new parent**,
I want **to sign in with my Google account**,
So that **I can create my fledgely account securely without managing another password**.

---

## Acceptance Criteria

### AC1: Google Sign-In Button Display
**Given** a visitor lands on the fledgely home/login page
**When** the page loads
**Then** a "Sign in with Google" button is prominently displayed
**And** the button meets 44x44px minimum touch target (NFR49)
**And** button has visible focus indicator when focused (NFR46)

### AC2: Google Sign-In Popup/Redirect Flow
**Given** a visitor clicks the "Sign in with Google" button
**When** Firebase Auth Google popup initiates
**Then** user can select or enter their Google account
**And** popup displays Google's standard account selection UI
**And** loading indicator displays during authentication

### AC3: Successful Authentication Redirect
**Given** a user completes Google Sign-In successfully
**When** authentication succeeds
**Then** user is redirected to dashboard (if existing user) or onboarding (if new user)
**And** no error messages are displayed
**And** screen reader announces "Sign in successful"

### AC4: Button Operability Without JavaScript on Initial Load (NFR32)
**Given** a visitor lands on the login page
**When** the page initially renders
**Then** the sign-in button is visible and styled correctly
**And** clicking the button before hydration completes shows loading state or queues action

### AC5: Keyboard Accessibility (NFR43)
**Given** a user navigating with keyboard only
**When** they tab to the sign-in button
**Then** the button receives visible focus indicator
**And** pressing Enter or Space activates the button
**And** focus order follows logical sequence (button -> popup -> result)

### AC6: Screen Reader Accessibility
**Given** a user using assistive technology
**When** they interact with the sign-in flow
**Then** sign-in button has accessible name ("Sign in with Google")
**And** loading states are announced ("Signing in, please wait")
**And** success/failure outcomes are announced

---

## Tasks / Subtasks

### Task 1: Create User Auth Hook (apps/web/src/hooks/useAuth.ts)
- [x] 1.1 Create `useAuth` hook with Firebase Auth state subscription
- [x] 1.2 Expose `user`, `loading`, `error` state
- [x] 1.3 Implement `signInWithGoogle` function using `signInWithPopup`
- [x] 1.4 Implement `signOut` function
- [x] 1.5 Handle popup blocked scenario with fallback to redirect
- [x] 1.6 Set Firebase Auth persistence to LOCAL for 30-day sessions

### Task 2: Create Google Sign-In Button Component
- [x] 2.1 Create `GoogleSignInButton.tsx` in `apps/web/src/components/auth/`
- [x] 2.2 Style button with 44x44px minimum touch target
- [x] 2.3 Add Google logo SVG icon
- [x] 2.4 Implement loading state with spinner and "Signing in..." text
- [x] 2.5 Add `aria-label`, `aria-busy`, `aria-live="polite"` attributes
- [x] 2.6 Ensure 4.5:1 color contrast ratio (NFR45)
- [x] 2.7 Add visible focus indicator (NFR46)

### Task 3: Update Login Page
- [x] 3.1 Replace placeholder with `GoogleSignInButton` component
- [x] 3.2 Add redirect logic: new user -> onboarding, existing user -> dashboard
- [x] 3.3 Show loading skeleton during auth state check
- [x] 3.4 Preserve existing `SafetyResourcesLink` in footer

### Task 4: Create Auth Context Provider
- [x] 4.1 Create `AuthProvider` component wrapping the app
- [x] 4.2 Update `apps/web/src/app/layout.tsx` to include provider
- [x] 4.3 Ensure provider is client-side only ('use client')

### Task 5: Create Auth Middleware for Route Protection
- [x] 5.1 Create `middleware.ts` in `apps/web/src/`
- [x] 5.2 Define protected routes (dashboard, settings, etc.)
- [x] 5.3 Define public routes (login, privacy, terms)
- [x] 5.4 Redirect unauthenticated users from protected routes to login
- [x] 5.5 Redirect authenticated users from login to dashboard

### Task 6: Write Tests (All AC)
- [x] 6.1 Unit tests for `useAuth` hook
- [x] 6.2 Unit tests for `GoogleSignInButton` component
- [x] 6.3 Integration test: successful sign-in flow
- [x] 6.4 Integration test: popup blocked fallback
- [x] 6.5 Accessibility tests (keyboard navigation, screen reader)
- [x] 6.6 Test button meets 44x44px touch target
- [x] 6.7 Test loading states and announcements

---

## Dev Notes

### Critical Requirements
This story establishes the authentication foundation for the entire application. Key patterns:

1. **Firebase Auth with Google Provider** - Use `signInWithPopup` with `GoogleAuthProvider`
2. **LOCAL Persistence** - Sessions persist across browser restarts for 30 days
3. **Accessibility First** - WCAG 2.1 AA compliance from day one
4. **No Server-Side Session Management** - Firebase handles token refresh automatically

### Architecture Patterns

**Firebase Auth Configuration:**
```typescript
// Already configured in apps/web/src/lib/firebase.ts
import { getAuth } from 'firebase/auth'
export const auth = getAuth(app)
```

**useAuth Hook Pattern:**
```typescript
// apps/web/src/hooks/useAuth.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  browserLocalPersistence,
  setPersistence,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'

export interface AuthState {
  user: User | null
  loading: boolean
  error: Error | null
}

export interface UseAuthReturn extends AuthState {
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    // Set LOCAL persistence for 30-day sessions
    setPersistence(auth, browserLocalPersistence)

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setState({ user, loading: false, error: null })
      },
      (error) => {
        setState({ user: null, loading: false, error })
      }
    )

    return () => unsubscribe()
  }, [])

  const signInWithGoogle = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    const provider = new GoogleAuthProvider()

    try {
      await signInWithPopup(auth, provider)
    } catch (error: unknown) {
      // Handle popup blocked - fallback to redirect
      if (
        error instanceof Error &&
        error.message.includes('popup-blocked')
      ) {
        await signInWithRedirect(auth, provider)
        return
      }
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error : new Error('Sign in failed'),
      }))
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth)
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Sign out failed'),
      }))
    }
  }, [])

  return {
    ...state,
    signInWithGoogle,
    signOut,
  }
}
```

**GoogleSignInButton Component:**
```typescript
// apps/web/src/components/auth/GoogleSignInButton.tsx
'use client'

import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'

interface GoogleSignInButtonProps {
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function GoogleSignInButton({ onSuccess, onError }: GoogleSignInButtonProps) {
  const { signInWithGoogle, loading, error } = useAuth()

  const handleClick = async () => {
    try {
      await signInWithGoogle()
      onSuccess?.()
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Sign in failed'))
    }
  }

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      className="min-h-[44px] min-w-[200px] gap-3"
      aria-label={loading ? 'Signing in with Google...' : 'Sign in with Google'}
      aria-busy={loading}
      aria-live="polite"
    >
      {loading ? (
        <>
          <LoadingSpinner className="h-5 w-5 animate-spin" />
          <span>Signing in...</span>
        </>
      ) : (
        <>
          <GoogleIcon className="h-5 w-5" />
          <span>Sign in with Google</span>
        </>
      )}
    </Button>
  )
}
```

**Auth Provider Pattern:**
```typescript
// apps/web/src/components/providers/AuthProvider.tsx
'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useAuth, UseAuthReturn } from '@/hooks/useAuth'

const AuthContext = createContext<UseAuthReturn | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

export function useAuthContext(): UseAuthReturn {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }
  return context
}
```

**Middleware Pattern (using firebase-auth-edge):**
```typescript
// apps/web/src/middleware.ts
import { NextRequest, NextResponse } from 'next/server'

const protectedRoutes = ['/dashboard', '/settings', '/family']
const publicRoutes = ['/login', '/privacy', '/terms', '/safety']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check for Firebase auth session cookie
  const sessionCookie = request.cookies.get('__session')?.value

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  )
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  )

  // Redirect unauthenticated users from protected routes
  if (isProtectedRoute && !sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect authenticated users from login to dashboard
  if (pathname === '/login' && sessionCookie) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

### Naming Conventions
- Hook: `useAuth` (camelCase)
- Component: `GoogleSignInButton.tsx` (PascalCase)
- Provider: `AuthProvider.tsx` (PascalCase)
- Context: `AuthContext` (PascalCase)
- Test files: `*.test.ts` / `*.test.tsx` (co-located)

### Project Structure Notes

**Files to Create:**
```
apps/web/src/hooks/useAuth.ts
apps/web/src/hooks/useAuth.test.ts
apps/web/src/components/auth/GoogleSignInButton.tsx
apps/web/src/components/auth/GoogleSignInButton.test.tsx
apps/web/src/components/auth/GoogleIcon.tsx
apps/web/src/components/auth/LoadingSpinner.tsx
apps/web/src/components/auth/index.ts
apps/web/src/components/providers/AuthProvider.tsx
apps/web/src/middleware.ts
```

**Files to Modify:**
```
apps/web/src/app/layout.tsx              # Wrap with AuthProvider
apps/web/src/app/(auth)/login/page.tsx   # Add GoogleSignInButton
```

### NFR Compliance Checklist

| NFR | Requirement | Implementation |
|-----|-------------|----------------|
| NFR10 | Google Sign-In for parents | Firebase Auth GoogleAuthProvider |
| NFR11 | 30-day session persistence | browserLocalPersistence |
| NFR32 | Works without JS on initial load | Button renders server-side |
| NFR42 | WCAG 2.1 AA compliance | Full accessibility implementation |
| NFR43 | Keyboard navigable | Tab focus, Enter/Space activation |
| NFR45 | 4.5:1 color contrast | Tailwind color selection |
| NFR46 | Visible focus indicators | focus-visible:ring classes |
| NFR49 | 44x44px touch targets | min-h-[44px] min-w-[44px] |
| NFR65 | 6th-grade reading level | Simple, clear button text |

### Testing Standards

**Required Tests:**
1. `useAuth` hook - state management, sign-in/out functions
2. `GoogleSignInButton` - rendering, click handling, loading states
3. Popup blocked fallback to redirect
4. Keyboard accessibility (Tab, Enter, Space)
5. Screen reader announcements (aria-live)
6. Touch target size (44x44px minimum)
7. Color contrast ratio (4.5:1)

**Test Pattern:**
```typescript
// apps/web/src/hooks/useAuth.test.ts
import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuth } from './useAuth'

// Mock Firebase Auth
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  onAuthStateChanged: vi.fn((auth, callback) => {
    callback(null) // Initial state: no user
    return vi.fn() // Unsubscribe function
  }),
  signInWithPopup: vi.fn(),
  signInWithRedirect: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  browserLocalPersistence: {},
  setPersistence: vi.fn(),
}))

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initializes with loading state', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBe(null)
  })

  it('signs in with Google popup', async () => {
    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await result.current.signInWithGoogle()
    })

    expect(signInWithPopup).toHaveBeenCalled()
  })

  // ... more tests
})
```

### Error Handling

**Firebase Auth Error Codes to Handle:**
- `auth/popup-blocked` - Fallback to redirect
- `auth/popup-closed-by-user` - User cancelled, show message
- `auth/network-request-failed` - Network error, retry option
- `auth/account-exists-with-different-credential` - Account linking needed
- `auth/cancelled-popup-request` - Multiple popups, ignore

**Error Message Mapping (6th-grade reading level):**
```typescript
const errorMessages: Record<string, string> = {
  'auth/popup-blocked': 'Pop-up was blocked. Please allow pop-ups and try again.',
  'auth/popup-closed-by-user': 'Sign-in was cancelled. Please try again when ready.',
  'auth/network-request-failed': 'Could not connect. Please check your internet and try again.',
  'auth/account-exists-with-different-credential': 'This email is already used with a different sign-in method.',
  default: 'Something went wrong. Please try again.',
}
```

### Dependencies

**Already Installed:**
- `firebase` (in apps/web)
- `@/components/ui/button` (shadcn/ui)

**May Need to Install:**
- None - all dependencies are already available

### Previous Story Intelligence

This is the first story in Epic 1, building on Epic 0.5's foundation:
- `apps/web/src/lib/firebase.ts` - Firebase app already initialized
- `apps/web/src/lib/admin-auth.ts` - Pattern for custom claims (reference for future)
- shadcn/ui Button component available at `@/components/ui/button`

---

## References

- [Source: docs/epics/epic-list.md#Story-1.1] - Original story requirements
- [Source: docs/project_context.md] - Architecture patterns
- [Source: apps/web/src/lib/firebase.ts] - Firebase initialization
- [Firebase Auth Web Documentation](https://firebase.google.com/docs/auth/web/google-signin)
- [WCAG 2.1 AA Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

## Dev Agent Record

### Context Reference
- Story context: docs/sprint-artifacts/stories/1-1-google-sign-in-button-flow.md
- Epic context: Epic 1 - Parent Account Creation & Authentication

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References
(To be filled during implementation)

### Completion Notes List
- This is Story 1 of 6 in Epic 1
- Establishes authentication patterns for entire application
- Story 1.2 depends on this for user profile creation
- Story 1.3 depends on this for session persistence verification

### File List
**To Create:**
- `apps/web/src/hooks/useAuth.ts`
- `apps/web/src/hooks/useAuth.test.ts`
- `apps/web/src/components/auth/GoogleSignInButton.tsx`
- `apps/web/src/components/auth/GoogleSignInButton.test.tsx`
- `apps/web/src/components/auth/GoogleIcon.tsx`
- `apps/web/src/components/auth/LoadingSpinner.tsx`
- `apps/web/src/components/auth/index.ts`
- `apps/web/src/components/providers/AuthProvider.tsx`
- `apps/web/src/middleware.ts`

**To Modify:**
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/(auth)/login/page.tsx`
