# Story 1.5: Authentication Error Handling

**Status:** done

---

## Story

As a **parent attempting to sign in**,
I want **clear feedback when authentication fails**,
So that **I can understand and resolve the issue**.

---

## Acceptance Criteria

### AC1: User-Friendly Error Messages
**Given** a parent initiates Google Sign-In
**When** authentication fails (popup closed, network error, account disabled, etc.)
**Then** a user-friendly error message displays (not raw Firebase errors)

### AC2: Actionable Error Messages
**Given** an authentication error occurs
**When** the error message displays
**Then** error message suggests next steps (try again, check connection, contact support)

### AC3: Error Logging
**Given** an authentication error occurs
**When** the error is captured
**Then** error is logged to console for debugging (without PII - uid only if available)

### AC4: Retry Without Refresh
**Given** an authentication error occurred
**When** the user wants to retry
**Then** user can retry sign-in without page refresh

### AC5: Popup-Blocked Instructions
**Given** the browser blocks the sign-in popup
**When** the error is displayed
**Then** popup-blocked scenario shows instructions and falls back to redirect flow

### AC6: 6th-Grade Reading Level
**Given** any authentication error occurs
**When** the error message is displayed
**Then** error messages are at 6th-grade reading level (NFR65)

---

## Implementation Notes

### Already Implemented in Story 1.1

**IMPORTANT:** This story's functionality was implemented as part of Story 1.1 (Google Sign-In Button & Flow). This story file documents the verification of those implementations.

**Files implementing this story:**
- `apps/web/src/hooks/useAuth.ts` - Error handling logic (lines 60-80, 185-227)
- `apps/web/src/components/auth/GoogleSignInButton.tsx` - Error display integration

### Error Messages (6th-Grade Reading Level)

Located in `useAuth.ts` (lines 60-72):

```typescript
const errorMessages: Record<string, string> = {
  'auth/popup-blocked':
    'Pop-up was blocked. Please allow pop-ups and try again.',
  'auth/popup-closed-by-user':
    'Sign-in was cancelled. Please try again when ready.',
  'auth/network-request-failed':
    'Could not connect. Please check your internet and try again.',
  'auth/account-exists-with-different-credential':
    'This email is already used with a different sign-in method.',
  'auth/cancelled-popup-request': '', // Ignore - multiple popups
  'auth/user-disabled': 'This account has been disabled. Please contact support.',
  default: 'Something went wrong. Please try again.',
}
```

### Popup-Blocked Fallback

Located in `useAuth.ts` (lines 188-207):
- Detects popup-blocked error
- Automatically falls back to redirect-based sign-in
- Handles redirect result on page reload

### Retry Without Refresh

The `clearError` function in `useAuth.ts` (lines 246-248) allows clearing errors without page refresh:

```typescript
const clearError = useCallback(() => {
  safeSetState((prev) => ({ ...prev, error: null }))
}, [safeSetState])
```

---

## NFR Compliance Checklist

| NFR | Requirement | Implementation |
|-----|-------------|----------------|
| NFR65 | 6th-grade reading level | Simple, actionable error messages |
| NFR42 | WCAG 2.1 AA | Error messages announced to screen readers |

---

## Test Coverage

Existing tests in `apps/web/src/hooks/useAuth.test.ts`:
- `displays user-friendly error for popup-blocked`
- `displays user-friendly error for popup-closed-by-user`
- `displays user-friendly error for network error`
- `displays user-friendly error for account disabled`
- `clears error when clearError is called`
- `allows retry after error`

---

## References

- [Source: apps/web/src/hooks/useAuth.ts] - Main implementation
- [Source: docs/epics/epic-list.md#Story-1.5] - Original requirements
- [Story 1.1: Google Sign-In Button & Flow] - Original implementation story

---

## Dev Agent Record

### Context Reference
- Story context: docs/sprint-artifacts/stories/1-5-authentication-error-handling.md
- Epic context: Epic 1 - Parent Account Creation & Authentication
- Previous story: Story 1.4 - Logout Functionality (done)

### Completion Notes
- Functionality was implemented as part of Story 1.1
- This story documents verification of that implementation
- All acceptance criteria verified as met in existing code
- Tests already exist covering error handling scenarios
