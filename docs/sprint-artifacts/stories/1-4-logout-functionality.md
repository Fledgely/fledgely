# Story 1.4: Logout Functionality

Status: done

## Story

As a **logged-in parent**,
I want **to securely log out of my account**,
So that **I can protect my account on shared or public devices**.

## Acceptance Criteria

1. **AC1: Logout Button Display**
   - Given a parent is logged in
   - When they view the dashboard or any authenticated page
   - Then a logout button is accessible from the user menu/header
   - And the button meets 44x44px minimum touch target (NFR49)
   - And button is accessible via keyboard navigation

2. **AC2: Logout Execution**
   - Given a parent clicks the logout button
   - When the button is clicked
   - Then Firebase Auth session is terminated
   - And local session storage/cookies are cleared
   - And user is redirected to the home/login page

3. **AC3: Post-Logout Protection**
   - Given a user has logged out
   - When they attempt to access protected routes (e.g., /dashboard)
   - Then they are redirected to the login page
   - And no user data is displayed or accessible

4. **AC4: Offline Logout Support**
   - Given a parent clicks logout while temporarily offline
   - When the network is unavailable
   - Then local auth state is still cleared
   - And user is redirected to login
   - And Firebase syncs the sign-out when back online

5. **AC5: Accessibility**
   - Given the logout button exists
   - When tested with screen readers
   - Then the button has proper aria-label
   - And after logout, screen reader announces "You have been logged out"
   - And focus is moved to appropriate element on login page

## Tasks / Subtasks

- [x] Task 1: Enhance Logout Button in Dashboard (AC: #1, #2)
  - [x] 1.1 Verify existing logout button meets 44x44px touch target
  - [x] 1.2 Add proper aria-label to logout button
  - [x] 1.3 Ensure keyboard accessibility (focusable, Enter/Space triggers)
  - [x] 1.4 Add loading state during sign-out

- [x] Task 2: Add Logout Confirmation Message (AC: #2, #5)
  - [x] 2.1 Add state to track if user just logged out
  - [x] 2.2 Show "You have been logged out" message on login page
  - [x] 2.3 Add aria-live region for screen reader announcement
  - [x] 2.4 Auto-clear message after navigation or new sign-in

- [x] Task 3: Verify Protected Route Behavior (AC: #3)
  - [x] 3.1 Confirm dashboard redirects to login when not authenticated
  - [x] 3.2 Verify onboarding page redirects to login when not authenticated
  - [x] 3.3 Test that user data is not accessible after logout

- [x] Task 4: Test Offline Logout (AC: #4)
  - [x] 4.1 Verify signOut clears local state even if Firebase call fails
  - [x] 4.2 Confirm redirect to login works offline
  - [x] 4.3 Verify Firebase syncs when back online

## Dev Notes

### Technical Requirements

- **Auth Provider:** Firebase Auth with signOut
- **UI Framework:** Next.js 14 App Router
- **Styling:** Inline styles (consistent with existing pages)

### Architecture Compliance

From project_context.md:

- Use Firebase SDK directly (Unbreakable Rule #2)
- No abstractions over Firebase Auth

### What's Already Implemented

From Stories 1.1-1.3:

- signOut function in AuthContext (already calls firebaseSignOut)
- Logout button on dashboard page
- Login page with redirect logic
- Session state management with loading states

### Implementation Focus

This story mainly requires:

1. Accessibility enhancements to existing logout button
2. Adding "logged out" confirmation message on login page
3. Verification that existing protected route logic works correctly

### NFR References

- NFR49: 44x44px minimum touch target for logout button
- NFR65: Messages at 6th-grade reading level

### Library/Framework Requirements

| Dependency | Version | Purpose                          |
| ---------- | ------- | -------------------------------- |
| firebase   | ^10.x   | Firebase SDK (already installed) |

### File Structure Requirements

```
apps/web/src/
├── app/
│   ├── dashboard/
│   │   └── page.tsx          # UPDATE - Enhance logout button accessibility
│   └── login/
│       └── page.tsx          # UPDATE - Add logged out message
├── contexts/
│   └── AuthContext.tsx       # UPDATE - Add loggedOut state tracking
```

### Testing Requirements

- Verify logout button meets accessibility requirements
- Test logout flow clears auth state
- Verify protected routes redirect after logout
- Test "logged out" message displays and clears appropriately

### Previous Story Intelligence (1.1, 1.2, 1.3)

From completed stories:

- AuthContext has signOut method that calls firebaseSignOut
- Dashboard has logout button that calls signOut
- Login page handles sessionExpired message (similar pattern for loggedOut)
- Dashboard uses loading state and redirect for unauthenticated users

## Dev Agent Record

### Context Reference

- Epic: 1 (Parent Account Creation & Authentication)
- Sprint: 1 (Feature Development)
- Story Key: 1-4-logout-functionality
- Depends On: Story 1.1 (completed), Story 1.3 (completed)

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

- Logout button already had 44px min-height/width from Story 1.1
- Added justLoggedOut state to AuthContext for tracking logout action
- Login page shows "You have been logged out" message with aria-live="polite"
- signOut function now handles offline gracefully by clearing local state even if Firebase call fails
- Dashboard redirects to /login (not /) on logout so message displays
- Added focus styles and aria-busy to logout button for accessibility
- Protected routes (dashboard, onboarding) already redirect to login when not authenticated

### File List

- apps/web/src/contexts/AuthContext.tsx (MODIFIED - added justLoggedOut state)
- apps/web/src/app/login/page.tsx (MODIFIED - show logged out message)
- apps/web/src/app/dashboard/page.tsx (MODIFIED - enhanced logout button accessibility)

## Change Log

| Date       | Change                                                                |
| ---------- | --------------------------------------------------------------------- |
| 2025-12-28 | Story created with developer context                                  |
| 2025-12-28 | Implementation complete - logout flow with accessibility enhancements |
