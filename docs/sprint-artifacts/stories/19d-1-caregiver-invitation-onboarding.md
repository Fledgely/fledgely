# Story 19D.1: Caregiver Invitation & Onboarding

Status: done

## Story

As a **parent**,
I want **to invite a caregiver with limited status-only access**,
So that **grandparents can help without full dashboard access**.

## Acceptance Criteria

1. **Given** parent is in family settings **When** parent invites a caregiver **Then** invitation sent via email with simple setup link

2. **Given** caregiver is invited **Then** caregiver role is "Status Viewer" (not full caregiver)

3. **Given** caregiver receives invitation **When** they click the link **Then** caregiver completes Google Sign-In to accept

4. **Given** caregiver accepts invitation **Then** caregiver sees simple onboarding explaining their limited access

5. **Given** parent is inviting caregiver **Then** parent can set which children caregiver can see

6. **Given** invitation is sent **Then** invitation expires in 7 days if not accepted

## Tasks / Subtasks

- [x] Task 1: Add caregiver schemas to shared contracts
  - [x] 1.1 Create caregiverRoleSchema ('status_viewer')
  - [x] 1.2 Create caregiverSchema with uid, name, role, childIds, accessWindows
  - [x] 1.3 Create caregiverInvitationSchema extending invitation pattern
  - [x] 1.4 Add caregiverInvitationStatusSchema (pending, accepted, expired, revoked)
  - [x] 1.5 Export all new schemas and types

- [x] Task 2: Create caregiver invitation Cloud Function
  - [x] 2.1 Create sendCaregiverInvitation function
  - [x] 2.2 Validate parent has guardian role in family
  - [x] 2.3 Generate secure invitation token
  - [x] 2.4 Store invitation in /caregiverInvitations collection
  - [x] 2.5 Set expiration to 7 days (AC6)
  - [x] 2.6 Send email via existing email service pattern

- [x] Task 3: Create accept caregiver invitation Cloud Function
  - [x] 3.1 Create acceptCaregiverInvitation function
  - [x] 3.2 Validate token and check expiration
  - [x] 3.3 Add caregiver to family document
  - [x] 3.4 Update invitation status to 'accepted'
  - [x] 3.5 Return success with family info for onboarding

- [x] Task 4: Create CaregiverInviteForm component (AC: #1, #5)
  - [x] 4.1 Create form with email input
  - [x] 4.2 Add child selection checkboxes (AC5)
  - [x] 4.3 Show invitation preview with role explanation
  - [x] 4.4 Submit invokes sendCaregiverInvitation function
  - [x] 4.5 Use React.CSSProperties inline styles

- [x] Task 5: Create CaregiverAcceptInvitation page (AC: #3)
  - [x] 5.1 Create page that handles invitation token from URL
  - [x] 5.2 Show invitation details (family name, inviter name)
  - [x] 5.3 Require Google Sign-In before accepting
  - [x] 5.4 Call acceptCaregiverInvitation on sign-in
  - [x] 5.5 Handle expired/invalid invitation errors

- [x] Task 6: Create CaregiverOnboarding component (AC: #4)
  - [x] 6.1 Create simple onboarding flow after acceptance
  - [x] 6.2 Explain "Status Viewer" limited access
  - [x] 6.3 Show which children caregiver can view
  - [x] 6.4 Explain access windows (if set)
  - [x] 6.5 Use large, clear UI suitable for older adults (NFR49)

- [x] Task 7: Add tests
  - [x] 7.1 Test caregiver schemas
  - [x] 7.2 Test sendCaregiverInvitation function
  - [x] 7.3 Test acceptCaregiverInvitation function
  - [x] 7.4 Test CaregiverInviteForm component
  - [x] 7.5 Test CaregiverAcceptInvitation page
  - [x] 7.6 Test CaregiverOnboarding component

## Dev Notes

### Technical Implementation

**Extend existing invitation pattern from Epic 3:**

```typescript
// New caregiver role (simpler than guardian)
export const caregiverRoleSchema = z.enum(['status_viewer'])
export type CaregiverRole = z.infer<typeof caregiverRoleSchema>

// Caregiver entry in family document
export const familyCaregiverSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  displayName: z.string().nullable(),
  role: caregiverRoleSchema,
  childIds: z.array(z.string()), // Which children they can view
  accessWindows: z.array(accessWindowSchema).optional(), // For Story 19D.4
  addedAt: z.date(),
  addedByUid: z.string(), // Parent who invited
})
export type FamilyCaregiver = z.infer<typeof familyCaregiverSchema>

// Caregiver invitation (similar to co-parent invitation)
export const caregiverInvitationSchema = z.object({
  id: z.string(),
  familyId: z.string(),
  inviterUid: z.string(),
  inviterName: z.string(),
  familyName: z.string(),
  token: z.string(),
  status: z.enum(['pending', 'accepted', 'expired', 'revoked']),
  recipientEmail: z.string().email(),
  caregiverRole: caregiverRoleSchema,
  childIds: z.array(z.string()), // Which children caregiver will see
  emailSentAt: z.date().nullable(),
  acceptedAt: z.date().nullable(),
  acceptedByUid: z.string().nullable(),
  expiresAt: z.date(), // 7 days from creation
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type CaregiverInvitation = z.infer<typeof caregiverInvitationSchema>
```

**Firestore paths:**

- `/caregiverInvitations/{invitationId}` - Invitation documents
- `/families/{familyId}` - Add `caregivers` array field

**Reference existing patterns:**

- `apps/functions/src/invitations/` - Email invitation pattern
- `apps/web/src/components/settings/` - Settings forms
- `packages/shared/src/contracts/index.ts` - Schema definitions

### UI/UX Considerations

**For older adults (NFR49):**

- Large touch targets (48x48px minimum)
- Clear, high-contrast text
- Simple step-by-step flow
- Avoid jargon - use "family status" not "dashboard"
- Confirmation at each step

**Color scheme:**

- Use consistent app theme (not child-specific sky blue)
- High contrast for accessibility

### References

- [Source: packages/shared/src/contracts/index.ts#invitationSchema]
- [Source: apps/functions/src/invitations/sendInvitation.ts]
- [NFR49: Accessibility for older adults]

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Opus 4.5

### Debug Log References

### Completion Notes List

- All 6 acceptance criteria implemented and tested
- Caregiver schemas added to shared contracts with full type safety
- Cloud Functions follow the Auth -> Validate -> Permission -> Business pattern
- Email templates include XSS protection via escapeHtml
- UI components use React.CSSProperties inline styles per project pattern
- Large touch targets (48px+) and clear text for NFR49 accessibility
- 3-step onboarding flow explains Status Viewer role clearly

### File List

**Schemas (packages/shared):**

- packages/shared/src/contracts/index.ts (modified - added caregiver schemas)
- packages/shared/src/contracts/caregiver.test.ts (new - 21 tests)

**Cloud Functions (apps/functions):**

- apps/functions/src/callable/sendCaregiverInvitation.ts (new)
- apps/functions/src/callable/sendCaregiverInvitation.test.ts (new - 19 tests)
- apps/functions/src/callable/acceptCaregiverInvitation.ts (new)
- apps/functions/src/callable/acceptCaregiverInvitation.test.ts (new - 23 tests)
- apps/functions/src/services/caregiverEmailService.ts (new)
- apps/functions/src/templates/caregiverInvitationEmail.ts (new)
- apps/functions/src/index.ts (modified - exports new functions)

**Web Components (apps/web):**

- apps/web/src/components/caregiver/CaregiverInviteForm.tsx (new)
- apps/web/src/components/caregiver/CaregiverInviteForm.test.tsx (new - 24 tests)
- apps/web/src/components/caregiver/CaregiverAcceptInvitation.tsx (new)
- apps/web/src/components/caregiver/CaregiverAcceptInvitation.test.tsx (new - 15 tests)
- apps/web/src/components/caregiver/CaregiverOnboarding.tsx (new)
- apps/web/src/components/caregiver/CaregiverOnboarding.test.tsx (new - 25 tests)
- apps/web/src/components/caregiver/index.ts (modified - exports new components)
- apps/web/src/services/caregiverInvitationService.ts (new)

**Test Fixes:**

- apps/web/src/components/family/SelfRemovalModal.test.tsx (modified - fixed Family type)
- apps/web/src/components/InviteCoParentModal.test.tsx (modified - fixed types)

## Senior Developer Review (AI)

### Review Date: 2025-12-31

### Findings Summary

- **HIGH**: 0 remaining (story documentation fixed)
- **MEDIUM**: 1 fixed (CSS property mixing warning)
- **LOW**: 0 (acceptable)

### Fixed Issues

1. CSS property mixing warning in CaregiverInviteForm - changed `borderColor` to full `border` property
2. Story file documentation complete with File List and task checkboxes

### Approved

All acceptance criteria verified against implementation. Tests passing (1068 total).

## Change Log

| Date       | Change                                     |
| ---------- | ------------------------------------------ |
| 2025-12-31 | Story created and marked ready-for-dev     |
| 2025-12-31 | Implementation complete, all tests passing |
| 2025-12-31 | Code review complete, marked as done       |
