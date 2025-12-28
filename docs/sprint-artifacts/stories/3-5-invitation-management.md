# Story 3.5: Invitation Management

Status: done

## Story

As a **parent**,
I want **to view, resend, or revoke pending invitations**,
So that **I can manage who joins my family**.

## Acceptance Criteria

1. **AC1: View Pending Invitation Status**
   - Given a parent has generated a co-parent invitation
   - When they access invitation management
   - Then they see pending invitation status (sent date, expires in X days)
   - And they see recipient email if one was provided
   - And invitation card is visible on dashboard or accessible from family settings

2. **AC2: Resend Invitation**
   - Given a parent views a pending invitation
   - When they click resend
   - Then a new email is sent to the recipient (if email provided)
   - And the same link/token remains valid
   - And "last sent" timestamp is updated
   - And user receives confirmation of resend

3. **AC3: Revoke Invitation**
   - Given a parent views a pending invitation
   - When they click revoke
   - Then they are prompted to confirm the action
   - And the invitation is marked as 'revoked' in Firestore
   - And the invitation link becomes invalid
   - And user can create a new invitation after revoking

4. **AC4: Revoked Link Message**
   - Given an invitation has been revoked
   - When the original recipient clicks the link
   - Then they see a friendly "invitation no longer valid" message
   - And they are NOT shown an error page
   - And they see instructions to contact the inviter

5. **AC5: Invitation History**
   - Given a family has had invitations
   - When parent views invitation history
   - Then they see past invitations (accepted, expired, revoked)
   - And each shows status, date, and recipient email (if provided)
   - And history is ordered by most recent first

6. **AC6: Accessibility**
   - Given the invitation management features
   - When navigating with assistive technology
   - Then all elements are keyboard accessible (NFR43)
   - And touch targets are 44px minimum (NFR49)
   - And focus indicators are visible (NFR46)
   - And status changes are announced to screen readers

## Tasks / Subtasks

- [x] Task 1: Create Invitation Status Card Component (AC: #1)
  - [x] 1.1 Create InvitationStatusCard component showing status, recipient, expiry
  - [x] 1.2 Calculate and display days until expiry
  - [x] 1.3 Add component to dashboard near "Invite Co-Parent" button
  - [x] 1.4 Write unit tests for InvitationStatusCard

- [x] Task 2: Implement Resend Functionality (AC: #2)
  - [x] 2.1 Add resend button to InvitationStatusCard
  - [x] 2.2 Resend uses existing sendInvitationEmail (no new Cloud Function needed)
  - [x] 2.3 Call existing sendInvitationEmail Cloud Function for email delivery
  - [x] 2.4 Update UI with resend confirmation
  - [x] 2.5 Write tests for resend functionality

- [x] Task 3: Implement Revoke Functionality (AC: #3)
  - [x] 3.1 Add revoke button to InvitationStatusCard
  - [x] 3.2 Create confirmation modal for revoke action
  - [x] 3.3 revokeInvitation already exists in invitationService
  - [x] 3.4 Security rules already allow inviter to revoke
  - [x] 3.5 Write tests for revoke functionality

- [x] Task 4: Update Accept Page for Revoked Invitations (AC: #4)
  - [x] 4.1 Accept page already handles 'revoked' status via getInvitationByToken
  - [x] 4.2 Display friendly message for revoked invitations (already implemented)
  - [x] 4.3 Include instructions to contact inviter (already implemented)
  - [x] 4.4 Tests for revoked invitation handling (covered by existing tests)

- [x] Task 5: Create Invitation History Section (AC: #5)
  - [x] 5.1 Query all invitations for family (getInvitationsByFamily)
  - [x] 5.2 Create InvitationHistoryList component
  - [x] 5.3 Display status badges (accepted, expired, revoked)
  - [x] 5.4 Order by most recent first
  - [x] 5.5 Write tests for history display

- [x] Task 6: Query Function for Family Invitations (AC: #1, #5)
  - [x] 6.1 Create getInvitationsByFamily service function
  - [x] 6.2 Add to invitationService.ts
  - [x] 6.3 Security rules already cover reading family invitations

## Dev Notes

### Technical Requirements

- **State Management:** Use existing FamilyContext, add invitation data
- **Schema Source:** @fledgely/contracts (Zod schemas - Unbreakable Rule #1)
- **Firebase Access:** Direct SDK calls (Unbreakable Rule #2)
- **Cloud Functions:** Thin functions delegating to services (Unbreakable Rule #5)

### Cloud Functions to Create

1. **resendInvitation** - Updates `emailSentAt`, triggers sendInvitationEmail
2. **revokeInvitation** - Sets status to 'revoked', updates `updatedAt`

### Schema Updates Required

```typescript
// No schema changes needed - invitationSchema already has:
// - status: 'pending' | 'accepted' | 'expired' | 'revoked'
// - emailSentAt, recipientEmail fields for resend tracking
```

### Security Rules Updates

```javascript
// Allow inviter to update their own invitations (for resend/revoke)
match /invitations/{invitationId} {
  // Existing: allow update: if isInviter()
  // This already covers resend and revoke operations
}
```

### UI Placement

The invitation status card should appear on the dashboard:

- When there's a pending invitation, show it below the "Invite Co-Parent" button
- Include resend/revoke actions within the card
- Invitation history can be in an expandable section or separate modal

### Resend Logic

```typescript
// Resend just updates emailSentAt and re-triggers email
// Does NOT generate a new token - same link remains valid
await updateDoc(invitationRef, {
  emailSentAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
})
await sendInvitationEmail(invitationId, recipientEmail)
```

### Revoke Logic

```typescript
// Revoke marks invitation as invalid
await updateDoc(invitationRef, {
  status: 'revoked',
  updatedAt: serverTimestamp(),
})
```

### Revoked Page Message

```tsx
// Friendly message for revoked invitations
<div>
  <h1>Invitation No Longer Valid</h1>
  <p>This invitation has been cancelled by the sender.</p>
  <p>If you believe this is a mistake, please contact the person who invited you.</p>
</div>
```

### NFR References

- NFR43: All interactive elements keyboard accessible
- NFR45: Color contrast 4.5:1 minimum
- NFR46: Visible focus indicators
- NFR49: 44x44px minimum touch target

### References

- [Source: docs/epics/epic-list.md#Story-3.5]
- [Source: docs/project_context.md#The-5-Unbreakable-Rules]
- [Source: docs/sprint-artifacts/stories/3-1-co-parent-invitation-generation.md]
- [Source: docs/sprint-artifacts/stories/3-2-invitation-delivery.md]

## Dev Agent Record

### Context Reference

- Epic: 3 (Co-Parent Invitation & Family Sharing)
- Sprint: 2 (Feature Development)
- Story Key: 3-5-invitation-management
- Depends On: Stories 3.1, 3.2, 3.3, 3.4 (all completed)

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

N/A

### Completion Notes List

- Created InvitationStatusCard component with resend/revoke functionality
- Created InvitationHistoryList component with expandable history display
- Added getInvitationsByFamily and resendInvitationEmail to invitationService.ts
- Integrated both components into dashboard page
- All existing functionality (revokeInvitation, accept page revoked handling) was already in place from Stories 3.1-3.4
- 94 web tests pass, 53 functions tests pass (147 total)
- Build passes successfully

### File List

- apps/web/src/components/InvitationStatusCard.tsx (new)
- apps/web/src/components/InvitationStatusCard.test.tsx (new)
- apps/web/src/components/InvitationHistoryList.tsx (new)
- apps/web/src/components/InvitationHistoryList.test.tsx (new)
- apps/web/src/services/invitationService.ts (modified - added getInvitationsByFamily, resendInvitationEmail)
- apps/web/src/app/dashboard/page.tsx (modified - integrated components)
- docs/sprint-artifacts/stories/3-5-invitation-management.md (updated)

## Change Log

| Date       | Change                                  |
| ---------- | --------------------------------------- |
| 2025-12-28 | Story created (ready-for-dev)           |
| 2025-12-28 | Implementation complete, all tasks done |
