# Story 1.5: Authentication Error Handling

Status: done

## Story

As a **parent attempting to sign in**,
I want **clear feedback when authentication fails**,
So that **I can understand and resolve the issue**.

## Acceptance Criteria

1. **AC1: User-Friendly Error Messages**
   - Given a parent initiates Google Sign-In
   - When authentication fails (popup closed, network error, account disabled, etc.)
   - Then a user-friendly error message displays (not raw Firebase errors)
   - And error message suggests next steps (try again, check connection, contact support)

2. **AC2: Error Logging**
   - Given an authentication error occurs
   - When the error is handled
   - Then error is logged to console (no PII - code only)
   - And error type is categorized for future monitoring integration

3. **AC3: Retry Capability**
   - Given an error message is displayed
   - When the user clicks "Sign in with Google" again
   - Then the sign-in flow initiates fresh
   - And the previous error message is cleared

4. **AC4: Popup-Blocked Instructions**
   - Given a popup was blocked by the browser
   - When the error is displayed
   - Then clear instructions show how to allow popups

5. **AC5: Reading Level Compliance**
   - Given any error message is displayed
   - Then the message is at 6th-grade reading level (NFR65)
   - And uses simple, clear language

## Tasks / Subtasks

- [x] Task 1: Review Existing Error Handling (AC: #1, #5)
  - [x] 1.1 Audit current error messages in handleSignInError
  - [x] 1.2 Verify messages are at 6th-grade reading level
  - [x] 1.3 Add any missing error codes (account-disabled, etc.)

- [x] Task 2: Add Error Logging (AC: #2)
  - [x] 2.1 Create error categorization for auth errors
  - [x] 2.2 Log errors to console without PII
  - [x] 2.3 Structure logs for future monitoring integration

- [x] Task 3: Verify Retry Behavior (AC: #3)
  - [x] 3.1 Confirm error clears on new sign-in attempt
  - [x] 3.2 Test sign-in works after previous error

- [x] Task 4: Verify Popup-Blocked Instructions (AC: #4)
  - [x] 4.1 Confirm popup-blocked error message has clear instructions
  - [x] 4.2 Verify message is actionable

## Dev Notes

### Technical Requirements

- **Auth Provider:** Firebase Auth
- **UI Framework:** Next.js 14 App Router
- **Styling:** Inline styles (consistent with existing pages)

### Architecture Compliance

From project_context.md:

- Use Firebase SDK directly (Unbreakable Rule #2)
- No PII in logs (privacy requirement)

### What's Already Implemented

From Story 1.1:

- handleSignInError function in login/page.tsx
- User-friendly messages for: popup-closed, popup-blocked, network-error, too-many-requests
- Error state clears implicitly on successful sign-in
- Popup-blocked message already includes instructions

### Implementation Focus

This story mainly requires:

1. Audit and improve existing error messages for reading level
2. Add error logging for monitoring
3. Add any missing error codes
4. Verify retry behavior works correctly

### NFR References

- NFR65: Error messages at 6th-grade reading level

### Additional Firebase Auth Error Codes

Consider handling these additional error codes:

- auth/user-disabled: Account has been disabled
- auth/operation-not-allowed: Sign-in method not enabled
- auth/internal-error: Firebase internal error
- auth/cancelled-popup-request: Multiple popups opened

### Library/Framework Requirements

| Dependency | Version | Purpose                          |
| ---------- | ------- | -------------------------------- |
| firebase   | ^10.x   | Firebase SDK (already installed) |

### File Structure Requirements

```
apps/web/src/
├── app/
│   └── login/
│       └── page.tsx          # UPDATE - Enhance error handling
└── utils/
    └── errorLogging.ts       # NEW - Error logging utility (optional)
```

### Testing Requirements

- Verify all error messages are user-friendly
- Test retry behavior after errors
- Verify error logging captures necessary data without PII

### Previous Story Intelligence (1.1, 1.4)

From completed stories:

- Login page has handleSignInError with switch statement
- Error state displays in red banner with role="alert"
- Error is cleared on successful sign-in (via redirect)
- GoogleSignInButton component handles errors via onError callback

## Dev Agent Record

### Context Reference

- Epic: 1 (Parent Account Creation & Authentication)
- Sprint: 1 (Feature Development)
- Story Key: 1-5-authentication-error-handling
- Depends On: Story 1.1 (completed)

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

- Enhanced handleSignInError with additional error codes (user-disabled, operation-not-allowed, internal-error, cancelled-popup-request)
- Added categorizeAuthError function to classify errors without PII (popup, network, account, rate-limit, server, other)
- Added console.error logging with structured data: code and category type
- Improved error messages to 6th-grade reading level with clearer language
- Added onStart callback to GoogleSignInButton to clear errors on retry
- Login page now clears previous error when new sign-in attempt starts

### File List

- apps/web/src/app/login/page.tsx (MODIFIED - enhanced error handling and logging)
- apps/web/src/components/auth/GoogleSignInButton.tsx (MODIFIED - added onStart callback)

## Change Log

| Date       | Change                                                        |
| ---------- | ------------------------------------------------------------- |
| 2025-12-28 | Story created with developer context                          |
| 2025-12-28 | Implementation complete - enhanced error messages and logging |
